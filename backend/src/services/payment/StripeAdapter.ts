// Stripe v22 uses `export =` — must use require-style import to match the declaration.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import Stripe = require('stripe');
import { env } from '../../configs/env.config';
import type {
  IPaymentProvider,
  CreatePaymentIntentParams, PaymentIntentResult,
  WebhookEvent,
  CreatePayoutParams, PayoutResult,
} from './IPaymentProvider';

// Stripe fee estimate: 1.5% + €0.25 for EU cards (~$0.27)
const STRIPE_PCT_FEE       = 0.015;
const STRIPE_FIXED_FEE_USD = 0.27;

export class StripeAdapter implements IPaymentProvider {
  // Stripe.Stripe is the instance type exposed via the namespace declaration.
  private stripe: Stripe.Stripe;

  constructor() {
    if (!env.stripe.secretKey) {
      throw new Error('Stripe secret key is not configured (STRIPE_SECRET_KEY)');
    }
    
    this.stripe = new (Stripe as any)(env.stripe.secretKey) as Stripe.Stripe;
  }

  getProviderName(): string {
    return 'stripe';
  }

  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    const intent = await this.stripe.paymentIntents.create({
      amount:        Math.round(params.amountInCurrency * 100), // cents
      currency:      params.currency.toLowerCase(),
      metadata: {
        package_id: String(params.packageId),
        payment_id: String(params.paymentId),
      },
      description:   params.description,
      receipt_email: params.clientEmail,
    });

    return {
      intentId:               intent.id,
      clientSecret:           intent.client_secret ?? undefined,
      estimatedProviderFeeUsd: round2(params.amountUsd * STRIPE_PCT_FEE + STRIPE_FIXED_FEE_USD),
    };
  }

  async parseWebhookEvent(rawBody: Buffer | string, signature: string): Promise<WebhookEvent> {
    if (!env.stripe.webhookSecret) {
      throw new Error('Stripe webhook secret is not configured (STRIPE_WEBHOOK_SECRET)');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let event: any;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, env.stripe.webhookSecret);
    } catch {
      throw new Error('Stripe webhook signature verification failed');
    }

    const eventType = event.type as string;
    const intentId  = (event.data?.object?.id as string | undefined) ?? '';

    switch (eventType) {
      case 'payment_intent.succeeded':
        return { type: 'payment.success', intentId };
      case 'payment_intent.payment_failed':
        return { type: 'payment.failed', intentId };
      default:
        return { type: 'unknown', intentId: '' };
    }
  }

  /**
   * Stripe payouts to external IBANs require Stripe Connect.
   * Until Connect is set up per groupeur, we mark the payout as pending
   * so the operator can process it manually via the Stripe dashboard.
   */
  async createPayout(_params: CreatePayoutParams): Promise<PayoutResult> {
    return {
      reference:      `stripe-manual-${Date.now()}`,
      status:         'pending',
      providerFeeUsd: 0,
      note: 'Stripe Connect not yet configured — to be processed manually via Stripe dashboard.',
    };
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
