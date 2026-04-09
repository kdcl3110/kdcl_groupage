import cron from 'node-cron';
import { Op } from 'sequelize';
import { currencyService } from './currency.service';
import { Payment, PaymentStatus } from '../models/Payment.model';
import { Package, PackageStatus } from '../models/Package.model';
import { Travel, TravelStatus } from '../models/Travel.model';
import { createAndPush } from '../modules/notification/notification.helpers';

export function startCronJobs(): void {
  // Weekly: update exchange rates (every Monday at 02:00)
  cron.schedule('0 2 * * 1', async () => {
    console.log('[Cron] Running weekly exchange rate update...');
    await currencyService.updateExchangeRates();
  });

  // Hourly: expire overdue payments (every hour at :05)
  cron.schedule('5 * * * *', async () => {
    console.log('[Cron] Checking for expired payments...');
    await expireOverduePayments();
  });

  console.log('[Cron] Jobs scheduled: exchange rates (weekly Mon 02:00) | payment expiry (hourly)');
}

/**
 * Find payments past their 48h deadline that are still pending.
 * Mark them as expired, revert the package to `submitted` so the
 * groupeur can see it again and decide to reject it.
 */
async function expireOverduePayments(): Promise<void> {
  const overduePayments = await Payment.findAll({
    where: {
      status:      PaymentStatus.PENDING,
      deadline_at: { [Op.lt]: new Date() },
    },
  });

  if (overduePayments.length === 0) return;

  console.log(`[Cron] Expiring ${overduePayments.length} overdue payment(s)...`);

  for (const payment of overduePayments) {
    try {
      await payment.update({ status: PaymentStatus.EXPIRED });

      const pkg = await Package.findByPk(payment.package_id);
      if (!pkg || pkg.status !== PackageStatus.AWAITING_PAYMENT) continue;

      // Revert to submitted — groupeur sees it again and can reject
      await pkg.update({ status: PackageStatus.SUBMITTED });

      // Notify client
      await createAndPush(
        payment.client_id,
        'Délai de paiement expiré',
        `Le délai de 48h pour payer le colis ${pkg.tracking_number} a expiré. Contactez le groupeur ou soumettez à un autre voyage.`,
      );

      // Notify groupeur
      await createAndPush(
        payment.groupeur_id,
        'Paiement non reçu',
        `Le client n'a pas payé le colis ${pkg.tracking_number} dans le délai imparti. Vous pouvez le rejeter ou lui accorder un délai supplémentaire.`,
      );

      // Free up capacity on the travel so it can accept more packages
      if (pkg.travel_id) {
        await reopenTravelIfUnderCapacity(pkg.travel_id, pkg.weight, pkg.volume);
      }

      console.log(`[Cron] Payment #${payment.payment_id} expired — package #${pkg.package_id} reverted to submitted`);
    } catch (err) {
      console.error(`[Cron] Error expiring payment #${payment.payment_id}:`, err);
    }
  }
}

async function reopenTravelIfUnderCapacity(travelId: number, freedWeight: number, freedVolume: number): Promise<void> {
  try {
    const travel = await Travel.findByPk(travelId);
    if (!travel || travel.status !== TravelStatus.FULL) return;

    const committedPackages = await Package.findAll({
      where: {
        travel_id: travelId,
        status: { [Op.in]: [PackageStatus.AWAITING_PAYMENT, PackageStatus.PAID, PackageStatus.IN_TRAVEL, PackageStatus.IN_TRANSIT] },
      },
      attributes: ['weight', 'volume'],
    });

    const totalWeight = committedPackages.reduce((s, p) => s + Number(p.weight), 0);
    const totalVolume = committedPackages.reduce((s, p) => s + Number(p.volume), 0);
    const maxPct      = travel.max_load_percentage;
    const weightPct   = Number(travel.max_weight) > 0 ? Math.round((totalWeight / Number(travel.max_weight)) * 100) : 0;
    const volumePct   = Number(travel.max_volume) > 0 ? Math.round((totalVolume / Number(travel.max_volume)) * 100) : 0;

    const fillPct = travel.transport_type === 'plane' ? weightPct : volumePct;
    if (fillPct < maxPct) {
      await travel.update({ status: TravelStatus.OPEN });
    }
  } catch (err) {
    console.error(`[Cron] Failed to reopen travel #${travelId}:`, err);
  }
}
