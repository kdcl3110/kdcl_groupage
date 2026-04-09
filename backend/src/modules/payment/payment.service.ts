import { Package, PackageStatus } from '../../models/Package.model';
import { Payment, PaymentStatus, PaymentProvider } from '../../models/Payment.model';
import { Currency } from '../../models/Currency.model';
import { User } from '../../models/User.model';
import { Travel } from '../../models/Travel.model';
import { AppError } from '../../middlewares/errorHandler';
import { PaymentFactory } from '../../services/payment/PaymentFactory';
import { StripeAdapter } from '../../services/payment/StripeAdapter';
import { NotchpayAdapter } from '../../services/payment/NotchpayAdapter';
import type { WebhookEvent } from '../../services/payment/IPaymentProvider';
import { createAndPush } from '../notification/notification.helpers';
import { env } from '../../configs/env.config';

const TRAVEL_ATTRS = ['travel_id', 'transport_type', 'origin_country_id', 'destination_country_id'];

export interface InitiatePaymentResult {
  paymentId:      number;
  intentId:       string;
  clientSecret?:  string;  // Stripe
  redirectUrl?:   string;  // Notchpay
  amountDisplay:  number;  // amount in the chosen currency
  currency:       string;
  amountUsd:      number;
  deadlineAt:     Date;
}

export class PaymentService {

  /** Client initiates payment for a package that is awaiting payment */
  async initiatePayment(
    clientId: number,
    packageId: number,
    currency: string,
  ): Promise<InitiatePaymentResult> {
    // Validate package
    const pkg = await Package.findOne({
      where: { package_id: packageId, client_id: clientId },
      include: [{ association: 'travel', attributes: TRAVEL_ATTRS }],
    });
    if (!pkg) throw new AppError(404, 'Package not found');
    if (pkg.status !== PackageStatus.AWAITING_PAYMENT) {
      throw new AppError(400, `Payment can only be initiated for packages awaiting payment (current status: "${pkg.status}")`);
    }

    // Find the pending payment record
    const payment = await Payment.findOne({
      where: { package_id: packageId, status: PaymentStatus.PENDING },
    });
    if (!payment) throw new AppError(404, 'No pending payment record found for this package');

    if (new Date() > payment.deadline_at) {
      throw new AppError(400, 'Payment deadline has expired. Contact the freight forwarder.');
    }

    // Validate currency
    const currencyRecord = await Currency.findOne({ where: { code: currency.toUpperCase() } });
    if (!currencyRecord) {
      throw new AppError(400, `Currency "${currency}" is not supported`);
    }

    // Get client info
    const client = await User.findByPk(clientId, {
      attributes: ['email', 'first_name', 'last_name'],
    });
    if (!client) throw new AppError(404, 'Client not found');

    // Convert amount to chosen currency
    const rateToUsd = Number(currencyRecord.rate_to_usd);
    const amountInCurrency = Math.round(Number(payment.amount_usd) * rateToUsd * 100) / 100;

    // Get the right provider adapter and create intent
    const provider = PaymentFactory.getProvider(currency);
    const callbackUrl = `${env.app.frontendUrl}/paiement/confirmation`;

    const result = await provider.createPaymentIntent({
      amountUsd:        Number(payment.amount_usd),
      currency:         currency.toUpperCase(),
      amountInCurrency,
      packageId:        pkg.package_id,
      paymentId:        payment.payment_id,
      clientEmail:      client.email,
      description:      `KDCL Groupage — Colis ${pkg.tracking_number}`,
      callbackUrl,
    });

    // Update payment record with provider info
    const netToGroupeur = round2(
      Number(payment.amount_usd)
      - Number(payment.platform_commission_usd)
      - result.estimatedProviderFeeUsd,
    );

    await payment.update({
      provider:            provider.getProviderName() as PaymentProvider,
      provider_intent_id:  result.intentId,
      provider_fee_usd:    result.estimatedProviderFeeUsd,
      net_to_groupeur_usd: netToGroupeur,
    });

    return {
      paymentId:     payment.payment_id,
      intentId:      result.intentId,
      clientSecret:  result.clientSecret,
      redirectUrl:   result.redirectUrl,
      amountDisplay: amountInCurrency,
      currency:      currency.toUpperCase(),
      amountUsd:     Number(payment.amount_usd),
      deadlineAt:    payment.deadline_at,
    };
  }

  /** Get payment info for a package (client view) */
  async getPaymentForPackage(clientId: number, packageId: number): Promise<Payment> {
    const pkg = await Package.findOne({ where: { package_id: packageId, client_id: clientId } });
    if (!pkg) throw new AppError(404, 'Package not found');

    const payment = await Payment.findOne({ where: { package_id: packageId } });
    if (!payment) throw new AppError(404, 'No payment record found for this package');

    return payment;
  }

  /** Get payment by provider reference (used by Notchpay redirect callback) */
  async getByReference(reference: string): Promise<Payment & { package_id: number }> {
    const payment = await Payment.findOne({ where: { provider_intent_id: reference } });
    if (!payment) throw new AppError(404, 'Payment not found');
    return payment as Payment & { package_id: number };
  }

  /** Handle Stripe webhook (raw body required for signature verification) */
  async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const adapter = new StripeAdapter();
    const event = await adapter.parseWebhookEvent(rawBody, signature);
    await this.processWebhookEvent(event);
  }

  /** Handle Notchpay webhook */
  async handleNotchpayWebhook(rawBody: string, signature: string): Promise<void> {
    const adapter = new NotchpayAdapter();
    const event = await adapter.parseWebhookEvent(rawBody, signature);
    await this.processWebhookEvent(event);
  }

  //  Private 

  private async processWebhookEvent(event: WebhookEvent): Promise<void> {
    if (event.type === 'unknown' || !event.intentId) return;

    const payment = await Payment.findOne({
      where: { provider_intent_id: event.intentId },
    });
    if (!payment) {
      console.warn(`[PaymentService] Webhook: no payment found for intentId "${event.intentId}"`);
      return;
    }

    if (event.type === 'payment.success') {
      if (payment.status === PaymentStatus.PAID) return; // idempotent

      await payment.update({
        status:      PaymentStatus.PAID,
        paid_at:     new Date(),
        receipt_url: event.receiptUrl ?? null,
      });

      const pkg = await Package.findByPk(payment.package_id, {
        include: [{ association: 'travel', attributes: ['travel_id', 'transport_type'] }],
      });
      if (pkg && pkg.status === PackageStatus.AWAITING_PAYMENT) {
        await pkg.update({ status: PackageStatus.PAID });
      }

      await createAndPush(
        payment.client_id,
        'Paiement confirmé',
        `Votre paiement de $${Number(payment.amount_usd).toFixed(2)} pour le colis ${pkg?.tracking_number ?? `#${payment.package_id}`} a été confirmé. Merci !`,
      );
      await createAndPush(
        payment.groupeur_id,
        'Paiement reçu',
        `Le client a payé $${Number(payment.net_to_groupeur_usd).toFixed(2)} (net) pour le colis ${pkg?.tracking_number ?? `#${payment.package_id}`}.`,
      );

      console.log(`[PaymentService] Payment #${payment.payment_id} confirmed — package #${payment.package_id} → paid`);
    }

    if (event.type === 'payment.failed') {
      if (payment.status !== PaymentStatus.PENDING) return;

      await payment.update({ status: PaymentStatus.FAILED });

      await createAndPush(
        payment.client_id,
        'Échec du paiement',
        `Votre paiement pour le colis #${payment.package_id} a échoué. Veuillez réessayer avant l'expiration du délai.`,
      );

      console.log(`[PaymentService] Payment #${payment.payment_id} failed`);
    }
  }
}

export const paymentService = new PaymentService();

function round2(n: number): number { return Math.round(n * 100) / 100; }
