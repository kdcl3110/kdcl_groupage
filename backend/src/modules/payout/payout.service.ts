import { Op } from 'sequelize';
import { Payout, PayoutStatus, PayoutProvider } from '../../models/Payout.model';
import { Payment, PaymentStatus } from '../../models/Payment.model';
import { PayoutAccount, PayoutAccountType } from '../../models/PayoutAccount.model';
import { Currency } from '../../models/Currency.model';
import { Travel } from '../../models/Travel.model';
import { User, UserRole } from '../../models/User.model';
import { AppError } from '../../middlewares/errorHandler';
import { PaymentFactory } from '../../services/payment/PaymentFactory';
import { createAndPush } from '../notification/notification.helpers';

export class PayoutService {

  /**
   * Called automatically when a travel reaches `delivered` status.
   * Sums all paid net amounts for the travel and initiates a payout
   * to the groupeur's default account.
   * Idempotent: skips if a payout already exists for this travel.
   */
  async createPayoutForTravel(travelId: number): Promise<Payout> {
    const travel = await Travel.findByPk(travelId);
    if (!travel) throw new AppError(404, 'Travel not found');

    // Idempotency: don't create a second payout for the same travel
    const existing = await Payout.findOne({ where: { travel_id: travelId } });
    if (existing) return existing;

    // Sum net_to_groupeur_usd from all paid payments on this travel
    const payments = await Payment.findAll({
      where: { travel_id: travelId, status: PaymentStatus.PAID },
    });

    const grossAmountUsd = round2(
      payments.reduce((sum, p) => sum + Number(p.net_to_groupeur_usd), 0),
    );

    // Get groupeur's default payout account
    const account = await PayoutAccount.findOne({
      where: { user_id: travel.created_by, is_default: true },
    });

    if (grossAmountUsd === 0) {
      // Nothing to pay out (e.g. no paid packages)
      const payout = await Payout.create({
        travel_id:        travelId,
        groupeur_id:      travel.created_by,
        payout_account_id: account?.account_id ?? null,
        gross_amount_usd:  0,
        provider_fee_usd:  0,
        net_amount_usd:    0,
        status:            PayoutStatus.COMPLETED,
      });
      return payout;
    }

    // Create pending payout record first
    const payout = await Payout.create({
      travel_id:         travelId,
      groupeur_id:       travel.created_by,
      payout_account_id: account?.account_id ?? null,
      gross_amount_usd:  grossAmountUsd,
      provider_fee_usd:  0,
      net_amount_usd:    grossAmountUsd,
      status:            PayoutStatus.PENDING,
    });

    if (!account) {
      await createAndPush(
        travel.created_by,
        'Reversement en attente — compte requis',
        `Le voyage #${travelId} est livré. Configurez votre compte de reversement dans votre profil pour recevoir $${grossAmountUsd.toFixed(2)}.`,
      );
      return payout;
    }

    // Execute the payout
    await this.executePayout(payout, account, grossAmountUsd);
    return payout.reload();
  }

  /** List payouts — groupeur sees their own, admin sees all */
  async getAll(
    caller: { userId: number; role: UserRole },
    pagination: { limit: number; offset: number },
  ): Promise<{ data: Payout[]; hasMore: boolean }> {
    const { limit, offset } = pagination;
    const where: Record<string, unknown> =
      caller.role === UserRole.FREIGHT_FORWARDER
        ? { groupeur_id: caller.userId }
        : {};

    const rows = await Payout.findAll({
      where,
      include: [
        { association: 'payout_account', attributes: ['type', 'account_holder_name', 'mobile_operator', 'country_code'] },
        { association: 'travel', attributes: ['travel_id', 'transport_type', 'origin_country_id', 'destination_country_id'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: limit + 1,
      offset,
    });

    const hasMore = rows.length > limit;
    return { data: hasMore ? rows.slice(0, limit) : rows, hasMore };
  }

  /** Get a single payout by ID */
  async getById(
    payoutId: number,
    caller: { userId: number; role: UserRole },
  ): Promise<Payout> {
    const payout = await Payout.findByPk(payoutId, {
      include: [
        { association: 'payout_account' },
        { association: 'travel', attributes: ['travel_id', 'transport_type', 'status'] },
        { association: 'groupeur', attributes: ['user_id', 'first_name', 'last_name', 'email'] },
      ],
    });
    if (!payout) throw new AppError(404, 'Payout not found');

    if (caller.role === UserRole.FREIGHT_FORWARDER && payout.groupeur_id !== caller.userId) {
      throw new AppError(403, 'Access denied');
    }

    return payout;
  }

  /** Admin: manually retry a failed or pending payout */
  async retryPayout(payoutId: number): Promise<Payout> {
    const payout = await Payout.findByPk(payoutId);
    if (!payout) throw new AppError(404, 'Payout not found');

    if (![PayoutStatus.PENDING, PayoutStatus.FAILED].includes(payout.status)) {
      throw new AppError(400, `Cannot retry a payout with status "${payout.status}"`);
    }

    const account = payout.payout_account_id
      ? await PayoutAccount.findByPk(payout.payout_account_id)
      : null;

    if (!account) {
      throw new AppError(400, 'No payout account configured for this groupeur');
    }

    await this.executePayout(payout, account, Number(payout.gross_amount_usd));
    return payout.reload();
  }

  // Private
  private async executePayout(
    payout: Payout,
    account: PayoutAccount,
    grossAmountUsd: number,
  ): Promise<void> {
    await payout.update({ status: PayoutStatus.PROCESSING });

    try {
      // Determine payout currency from the account's country
      const payoutCurrency = account.type === PayoutAccountType.MOBILE_MONEY ? 'XAF' : 'EUR';

      // Get exchange rate for the target currency
      const currencyRecord = await Currency.findOne({ where: { code: payoutCurrency } });
      const rateToUsd      = currencyRecord ? Number(currencyRecord.rate_to_usd) : 1;
      const amountInCurrency = Math.round(grossAmountUsd * rateToUsd * 100) / 100;

      // Get the right provider
      const provider = PaymentFactory.getProvider(payoutCurrency);

      const result = await provider.createPayout({
        amountUsd:        grossAmountUsd,
        currency:         payoutCurrency,
        amountInCurrency,
        description:      `KDCL Groupage — Reversement voyage #${payout.travel_id}`,
        account: {
          type:              account.type,
          accountHolderName: account.account_holder_name,
          iban:              account.iban ?? undefined,
          mobileNumber:      account.mobile_number ?? undefined,
          mobileOperator:    account.mobile_operator ?? undefined,
          countryCode:       account.country_code,
        },
      });

      const netUsd = round2(grossAmountUsd - result.providerFeeUsd);

      await payout.update({
        provider:           provider.getProviderName() as PayoutProvider,
        provider_reference: result.reference,
        provider_fee_usd:   result.providerFeeUsd,
        net_amount_usd:     netUsd,
        status:             result.status === 'completed' ? PayoutStatus.COMPLETED : PayoutStatus.PROCESSING,
        completed_at:       result.status === 'completed' ? new Date() : null,
      });

      const groupeur = await User.findByPk(payout.groupeur_id, { attributes: ['user_id'] });
      if (groupeur) {
        await createAndPush(
          payout.groupeur_id,
          'Reversement initié',
          result.note ??
            `Votre reversement de $${netUsd.toFixed(2)} (net) pour le voyage #${payout.travel_id} est en cours de traitement.`,
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[PayoutService] Payout #${payout.payout_id} failed:`, message);
      await payout.update({ status: PayoutStatus.FAILED });
      await createAndPush(
        payout.groupeur_id,
        'Échec du reversement',
        `Le reversement pour le voyage #${payout.travel_id} a échoué. Notre équipe a été notifiée. Ref: #${payout.payout_id}`,
      );
    }
  }
}

export const payoutService = new PayoutService();

function round2(n: number): number { return Math.round(n * 100) / 100; }
