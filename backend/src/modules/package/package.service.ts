import fs from 'fs';
import path from 'path';
import { Op } from 'sequelize';
import { Package, PackageStatus, FragilityLevel, FRAGILITY_MULTIPLIER } from '../../models/Package.model';
import { Travel, TravelStatus, TransportType } from '../../models/Travel.model';
import { Recipient } from '../../models/Recipient.model';
import { User, UserRole } from '../../models/User.model';
import { Payment, PaymentStatus } from '../../models/Payment.model';
import { PlatformConfig } from '../../models/PlatformConfig.model';
import { AppError } from '../../middlewares/errorHandler';
import { createAndPush } from '../notification/notification.helpers';
import type {
  CreatePackageDto,
  UpdatePackageDto,
  SubmitToTravelDto,
  AdminReassignDto,
  UpdatePackageStatusDto,
} from './package.dto';

const RECIPIENT_ATTRS = [
  'recipient_id', 'first_name', 'last_name', 'phone', 'address', 'city', 'country', 'email',
];
const TRAVEL_ATTRS = [
  'travel_id', 'status', 'transport_type', 'origin_country_id', 'destination_country_id',
  'itinerary', 'departure_date', 'estimated_arrival_date', 'price_per_unit',
];
const CLIENT_ATTRS = [
  'user_id', 'first_name', 'last_name', 'email', 'phone', 'city', 'country',
];

export interface TravelLoad {
  packages_count: number;
  current_weight: number;
  current_volume: number;
  max_weight: number;
  max_volume: number;
  weight_fill_pct: number;
  volume_fill_pct: number;
}

export class PackageService {

  async create(
    clientId: number,
    data: CreatePackageDto,
  ): Promise<{ package: Package; travel_load: TravelLoad | null }> {
    this.validatePackageFields(data);

    const recipient = await Recipient.findByPk(data.recipient_id, { attributes: ['recipient_id'] });
    if (!recipient) throw new AppError(404, 'Recipient not found');

    let travelId: number | null = null;
    let status = PackageStatus.PENDING;
    let groupeurToNotify: { userId: number; travelId: number } | null = null;

    if (data.travel_id) {
      const travel = await Travel.findByPk(data.travel_id);
      if (!travel) throw new AppError(404, `Travel #${data.travel_id} not found`);
      if (travel.status !== TravelStatus.OPEN && travel.status !== TravelStatus.FULL) {
        throw new AppError(400, `Travel #${data.travel_id} is not accepting submissions (status: "${travel.status}")`);
      }
      travelId = data.travel_id;
      status = PackageStatus.SUBMITTED;
      groupeurToNotify = { userId: travel.created_by, travelId: data.travel_id };
    }

    const pkg = await Package.create({
      client_id: clientId,
      recipient_id: data.recipient_id,
      travel_id: travelId,
      status,
      description: data.description,
      weight: data.weight,
      volume: data.volume,
      tracking_number: `PKG-${clientId}-${Date.now()}`,
      declared_value: data.declared_value,
      fragility: (data.fragility as FragilityLevel) ?? FragilityLevel.NORMAL,
      special_instructions: data.special_instructions ?? null,
      image1: data.image1,
      image2: data.image2 ?? null,
      image3: data.image3 ?? null,
      image4: data.image4 ?? null,
    });

    if (groupeurToNotify) {
      await this.notify(
        groupeurToNotify.userId,
        'Nouveau colis en attente',
        `Un client a soumis le colis ${pkg.tracking_number} au voyage #${groupeurToNotify.travelId}. Validez-le pour l'intégrer.`,
      );
    }

    await pkg.reload({
      include: [
        { association: 'recipient', attributes: RECIPIENT_ATTRS },
        { association: 'travel', attributes: TRAVEL_ATTRS },
      ],
    });

    return { package: pkg, travel_load: null };
  }

  async submitToTravel(
    packageId: number,
    clientId: number,
    dto: SubmitToTravelDto,
  ): Promise<Package> {
    const pkg = await this.findOwnedPackage(packageId, clientId);

    if (pkg.status !== PackageStatus.PENDING) {
      throw new AppError(400, `Only pending packages can be submitted (current status: "${pkg.status}")`);
    }

    const travel = await Travel.findByPk(dto.travel_id);
    if (!travel) throw new AppError(404, `Travel #${dto.travel_id} not found`);
    if (travel.status !== TravelStatus.OPEN && travel.status !== TravelStatus.FULL) {
      throw new AppError(400, `Travel #${dto.travel_id} is not accepting submissions (status: "${travel.status}")`);
    }

    await pkg.update({ travel_id: dto.travel_id, status: PackageStatus.SUBMITTED });

    // Notify the freight forwarder
    await this.notify(
      travel.created_by,
      'Nouveau colis en attente',
      `Un client a soumis le colis ${pkg.tracking_number} au voyage #${dto.travel_id}. Validez-le pour l'intégrer.`,
    );

    await pkg.reload({
      include: [
        { association: 'recipient', attributes: RECIPIENT_ATTRS },
        { association: 'travel', attributes: TRAVEL_ATTRS },
      ],
    });

    return pkg;
  }

  async validatePackage(packageId: number): Promise<{ package: Package; travel_load: TravelLoad }> {
    const pkg = await Package.findByPk(packageId);
    if (!pkg) throw new AppError(404, 'Package not found');

    if (pkg.status !== PackageStatus.SUBMITTED) {
      throw new AppError(400, `Only submitted packages can be validated (current status: "${pkg.status}")`);
    }

    const { travel, load } = await this.checkCapacity(pkg.travel_id!, Number(pkg.weight), Number(pkg.volume));

    // Compute price in USD
    const priceUsd = this.computePrice(travel, pkg);

    // Get platform commission rate (default 5%)
    const commissionRate = await PlatformConfig.getCommissionRate();
    const amountUsd      = priceUsd ?? 0;
    const commissionUsd  = round2(amountUsd * commissionRate);
    const netUsd         = round2(amountUsd - commissionUsd);

    // Get payment deadline from config (default 48h)
    const deadlineCfg    = await PlatformConfig.findByPk('payment_deadline_hours');
    const deadlineHours  = deadlineCfg ? parseInt(deadlineCfg.value, 10) : 48;
    const deadline       = new Date(Date.now() + deadlineHours * 60 * 60 * 1000);

    // Move package to awaiting_payment and save computed price
    await pkg.update({ status: PackageStatus.AWAITING_PAYMENT, price: amountUsd });

    // Reserve capacity on the travel
    await this.updateTravelStatusAfterAdd(travel, load, Number(pkg.weight), Number(pkg.volume));

    // Create the pending payment record
    await Payment.create({
      package_id:               pkg.package_id,
      client_id:                pkg.client_id,
      groupeur_id:              travel.created_by,
      travel_id:                travel.travel_id,
      amount_usd:               amountUsd,
      platform_commission_rate: commissionRate,
      platform_commission_usd:  commissionUsd,
      provider_fee_usd:         0, // determined when client chooses payment method
      net_to_groupeur_usd:      netUsd,
      status:                   PaymentStatus.PENDING,
      deadline_at:              deadline,
    });

    await this.notify(
      pkg.client_id,
      'Colis accepté — Paiement requis',
      `Votre colis ${pkg.tracking_number} a été accepté. Vous avez ${deadlineHours}h pour effectuer le paiement de $${amountUsd.toFixed(2)}.`,
    );

    await pkg.reload({
      include: [
        { association: 'recipient', attributes: RECIPIENT_ATTRS },
        { association: 'travel',    attributes: TRAVEL_ATTRS },
        { association: 'payment' },
      ],
    });

    return { package: pkg, travel_load: load };
  }

  async update(packageId: number, clientId: number, data: UpdatePackageDto): Promise<Package> {
    const pkg = await this.findOwnedPackage(packageId, clientId);

    if (pkg.status !== PackageStatus.PENDING) {
      throw new AppError(400, `Only pending packages can be edited (current status: "${pkg.status}")`);
    }

    if (data.recipient_id !== undefined) {
      const exists = await Recipient.findByPk(data.recipient_id, { attributes: ['recipient_id'] });
      if (!exists) throw new AppError(404, 'Recipient not found');
    }

    if (data.weight !== undefined && data.weight <= 0) throw new AppError(400, 'Weight must be a positive number (kg)');
    if (data.volume !== undefined && data.volume <= 0)  throw new AppError(400, 'Volume must be a positive number (m³)');
    if (data.declared_value !== undefined && data.declared_value < 0) {
      throw new AppError(400, 'Declared value must be a non-negative number');
    }

    const patch: Record<string, unknown> = {};
    if (data.description !== undefined)    patch.description = data.description;
    if (data.weight !== undefined)         patch.weight = data.weight;
    if (data.volume !== undefined)         patch.volume = data.volume;
    if (data.declared_value !== undefined) patch.declared_value = data.declared_value;
    if (data.fragility !== undefined)      patch.fragility = data.fragility;
    if ('special_instructions' in data)    patch.special_instructions = data.special_instructions ?? null;
    if (data.recipient_id !== undefined)   patch.recipient_id = data.recipient_id;

    // Images — collect old paths to delete after update
    const toDelete: string[] = [];
    if (data.image1 !== undefined) {
      if (pkg.image1) toDelete.push(pkg.image1);
      patch.image1 = data.image1;
    }
    if ('image2' in data) {
      if (pkg.image2) toDelete.push(pkg.image2);
      patch.image2 = data.image2 ?? null;
    }
    if ('image3' in data) {
      if (pkg.image3) toDelete.push(pkg.image3);
      patch.image3 = data.image3 ?? null;
    }
    if ('image4' in data) {
      if (pkg.image4) toDelete.push(pkg.image4);
      patch.image4 = data.image4 ?? null;
    }

    await pkg.update(patch);

    // Asynchronously clean up replaced/removed files (don't block response)
    this.deleteOldFiles(toDelete);

    return pkg.reload({
      include: [
        { association: 'recipient', attributes: RECIPIENT_ATTRS },
        { association: 'travel', attributes: TRAVEL_ATTRS },
      ],
    });
  }

  async cancel(packageId: number, clientId: number): Promise<{ message: string; newStatus: string }> {
    const pkg = await this.findOwnedPackage(packageId, clientId);

    if (pkg.status === PackageStatus.SUBMITTED) {
      // Le client retire sa soumission → repasse en pending
      const travelId = pkg.travel_id!;
      const travel = await Travel.findByPk(travelId, { attributes: ['travel_id', 'created_by'] });
      await pkg.update({ status: PackageStatus.PENDING, travel_id: null });
      if (travel) {
        await this.notify(
          travel.created_by,
          'Soumission retirée',
          `Le client a retiré le colis ${pkg.tracking_number} du voyage #${travelId} avant validation.`,
        );
      }
      return { message: 'Submission withdrawn successfully', newStatus: PackageStatus.PENDING };
    }

    if (pkg.status !== PackageStatus.PENDING) {
      throw new AppError(400, `Only pending or submitted packages can be cancelled (current status: "${pkg.status}")`);
    }

    await pkg.update({ status: PackageStatus.CANCELLED });
    return { message: 'Package cancelled successfully', newStatus: PackageStatus.CANCELLED };
  }

  async remove(packageId: number, clientId: number): Promise<{ message: string }> {
    const pkg = await this.findOwnedPackage(packageId, clientId);
    if (pkg.status !== PackageStatus.PENDING) {
      throw new AppError(400, `Only pending packages can be deleted (current status: "${pkg.status}")`);
    }
    await pkg.destroy();
    return { message: 'Package deleted successfully' };
  }

  async getPackages(
    caller: { userId: number; role: UserRole },
    filters: { travel_id?: number },
    pagination: { limit: number; offset: number },
  ): Promise<{ data: Package[]; hasMore: boolean }> {
    const { limit, offset } = pagination;
    const fetchLimit = limit + 1; // fetch one extra to detect hasMore

    const include = [
      { association: 'recipient', attributes: RECIPIENT_ATTRS },
      { association: 'travel',    attributes: TRAVEL_ATTRS },
    ];

    let rows: Package[];

    // Client: only their own packages
    if (caller.role === UserRole.CLIENT) {
      const where: Record<string, unknown> = { client_id: caller.userId };
      if (filters.travel_id) where.travel_id = filters.travel_id;
      rows = await Package.findAll({ where, include, order: [['updatedAt', 'DESC']], limit: fetchLimit, offset });
    } else if (caller.role === UserRole.ADMIN) {
      // Admin: all packages, with optional travel_id filter
      const where: Record<string, unknown> = {};
      if (filters.travel_id) where.travel_id = filters.travel_id;
      rows = await Package.findAll({ where, include, order: [['updatedAt', 'DESC']], limit: fetchLimit, offset });
    } else {
      // Freight forwarder: must provide travel_id, and the travel must belong to them
      if (!filters.travel_id) return { data: [], hasMore: false };
      const travel = await Travel.findByPk(filters.travel_id, { attributes: ['created_by'] });
      if (!travel || travel.created_by !== caller.userId) return { data: [], hasMore: false };
      rows = await Package.findAll({
        where: { travel_id: filters.travel_id },
        include,
        order: [['updatedAt', 'DESC']],
        limit: fetchLimit,
        offset,
      });
    }

    const hasMore = rows.length > limit;
    return { data: hasMore ? rows.slice(0, limit) : rows, hasMore };
  }

  async getById(packageId: number, clientId: number): Promise<Package> {
    const pkg = await Package.findOne({
      where: { package_id: packageId, client_id: clientId },
      include: [
        { association: 'recipient', attributes: RECIPIENT_ATTRS },
        { association: 'travel', attributes: TRAVEL_ATTRS },
        { association: 'payment' },
      ],
    });
    if (!pkg) throw new AppError(404, 'Package not found');
    return pkg;
  }

  async getByIdForManager(
    packageId: number,
    caller: { userId: number; role: UserRole },
  ): Promise<Package> {
    const pkg = await Package.findByPk(packageId, {
      include: [
        { association: 'recipient', attributes: RECIPIENT_ATTRS },
        { association: 'travel',    attributes: TRAVEL_ATTRS },
        { association: 'client',    attributes: CLIENT_ATTRS },
      ],
    });
    if (!pkg) throw new AppError(404, 'Package not found');

    // Un groupeur ne peut voir que les colis liés à ses propres voyages
    if (caller.role === UserRole.FREIGHT_FORWARDER && pkg.travel_id) {
      const travel = await Travel.findByPk(pkg.travel_id, { attributes: ['created_by'] });
      if (!travel || travel.created_by !== caller.userId) {
        throw new AppError(403, 'Access denied: this package does not belong to your travel');
      }
    }

    return pkg;
  }

  async rejectPackage(
    packageId: number,
    caller: { userId: number; role: UserRole },
  ): Promise<Package> {
    const pkg = await Package.findByPk(packageId);
    if (!pkg) throw new AppError(404, 'Package not found');

    const rejectableStatuses = [PackageStatus.SUBMITTED, PackageStatus.AWAITING_PAYMENT];
    if (!rejectableStatuses.includes(pkg.status as PackageStatus)) {
      throw new AppError(400, `Only submitted or awaiting-payment packages can be rejected (current status: "${pkg.status}")`);
    }

    if (caller.role === UserRole.FREIGHT_FORWARDER && pkg.travel_id) {
      const travel = await Travel.findByPk(pkg.travel_id, { attributes: ['created_by'] });
      if (!travel || travel.created_by !== caller.userId) {
        throw new AppError(403, 'Access denied: this package does not belong to your travel');
      }
    }

    const oldTravelId = pkg.travel_id;
    const wasCommitted = pkg.status === PackageStatus.AWAITING_PAYMENT;

    await pkg.update({ status: PackageStatus.PENDING, travel_id: null });

    // Cancel the pending payment if it exists
    if (wasCommitted) {
      await Payment.update(
        { status: PaymentStatus.EXPIRED },
        { where: { package_id: pkg.package_id, status: PaymentStatus.PENDING } },
      );
      // Free up capacity on the travel
      if (oldTravelId) await this.reopenTravelIfNeeded(oldTravelId);
    }

    await this.notify(
      pkg.client_id,
      'Colis rejeté',
      `Votre colis ${pkg.tracking_number} a été refusé par le groupeur et repassé en attente. Vous pouvez le soumettre à un autre voyage.`,
    );

    return pkg.reload({
      include: [
        { association: 'recipient', attributes: RECIPIENT_ATTRS },
        { association: 'travel',    attributes: TRAVEL_ATTRS },
      ],
    });
  }

  async updateStatusByManager(
    packageId: number,
    caller: { userId: number; role: UserRole },
    dto: UpdatePackageStatusDto,
  ): Promise<Package> {
    const pkg = await Package.findByPk(packageId);
    if (!pkg) throw new AppError(404, 'Package not found');

    // Un groupeur ne peut agir que sur les colis de ses propres voyages
    if (caller.role === UserRole.FREIGHT_FORWARDER && pkg.travel_id) {
      const travel = await Travel.findByPk(pkg.travel_id, { attributes: ['created_by'] });
      if (!travel || travel.created_by !== caller.userId) {
        throw new AppError(403, 'Access denied: this package does not belong to your travel');
      }
    }

    const ALLOWED_TRANSITIONS: Record<string, PackageStatus[]> = {
      [PackageStatus.PAID]:       [PackageStatus.IN_TRAVEL],
      [PackageStatus.IN_TRAVEL]:  [PackageStatus.IN_TRANSIT],
      [PackageStatus.IN_TRANSIT]: [PackageStatus.DELIVERED, PackageStatus.RETURNED],
    };

    const allowed = ALLOWED_TRANSITIONS[pkg.status] ?? [];
    const next = dto.status as PackageStatus;

    if (!allowed.includes(next)) {
      throw new AppError(
        400,
        `Cannot transition package from "${pkg.status}" to "${next}". Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }

    await pkg.update({ status: next });

    const statusMessages: Record<string, string> = {
      [PackageStatus.IN_TRANSIT]: `Votre colis ${pkg.tracking_number} est en transit vers sa destination.`,
      [PackageStatus.DELIVERED]:  `Votre colis ${pkg.tracking_number} a été livré avec succès.`,
      [PackageStatus.RETURNED]:   `Votre colis ${pkg.tracking_number} est en cours de retour.`,
    };

    await this.notify(pkg.client_id, 'Mise à jour de votre colis', statusMessages[next]);

    return pkg.reload({
      include: [
        { association: 'recipient', attributes: RECIPIENT_ATTRS },
        { association: 'travel',    attributes: TRAVEL_ATTRS },
      ],
    });
  }

  async adminReassign(packageId: number, dto: AdminReassignDto): Promise<Package> {
    const pkg = await Package.findByPk(packageId);
    if (!pkg) throw new AppError(404, 'Package not found');

    if (dto.travel_id === null) {
      if (pkg.status !== PackageStatus.IN_TRAVEL && pkg.status !== PackageStatus.SUBMITTED) {
        throw new AppError(400, 'Package is not currently assigned to a travel');
      }
      const wasInTravel = pkg.status === PackageStatus.IN_TRAVEL;
      const oldTravelId = pkg.travel_id!;
      await pkg.update({ travel_id: null, status: PackageStatus.PENDING });
      if (wasInTravel) await this.reopenTravelIfNeeded(oldTravelId);
      await this.notify(
        pkg.client_id,
        'Colis retiré du voyage',
        `Votre colis ${pkg.tracking_number} a été retiré de son voyage par l'équipe. Il repasse en attente.`,
      );
    } else {
      const { travel, load } = await this.checkCapacity(dto.travel_id, Number(pkg.weight), Number(pkg.volume));
      const oldTravelId = pkg.travel_id;
      await pkg.update({ travel_id: dto.travel_id, status: PackageStatus.IN_TRAVEL });
      await this.updateTravelStatusAfterAdd(travel, load, Number(pkg.weight), Number(pkg.volume));
      if (oldTravelId && oldTravelId !== dto.travel_id) {
        await this.reopenTravelIfNeeded(oldTravelId);
      }
      await this.notify(
        pkg.client_id,
        'Voyage modifié',
        `Votre colis ${pkg.tracking_number} a été déplacé${oldTravelId ? ` du voyage #${oldTravelId}` : ''} vers le voyage #${dto.travel_id} par l'équipe.`,
      );
    }

    return pkg.reload({
      include: [
        { association: 'recipient', attributes: RECIPIENT_ATTRS },
        { association: 'travel', attributes: TRAVEL_ATTRS },
      ],
    });
  }

  // ─── Helpers privés ──────────────────────────────────────────────────────

  private async checkCapacity(
    travelId: number,
    newWeight: number,
    newVolume: number,
  ): Promise<{ travel: Travel; load: TravelLoad }> {
    const travel = await Travel.findByPk(travelId);
    if (!travel) throw new AppError(404, `Travel #${travelId} not found`);
    if (travel.status !== TravelStatus.OPEN) {
      throw new AppError(400, `Travel #${travelId} is not open (status: "${travel.status}")`);
    }

    const load = await this.computeLoad(travelId, travel);

    if (travel.transport_type === TransportType.PLANE) {
      const totalWeight = load.current_weight + newWeight;
      if (totalWeight > Number(travel.max_weight)) {
        throw new AppError(
          400,
          `Weight capacity exceeded for this flight: ${round2(totalWeight)} kg requested, ` +
          `${round2(Number(travel.max_weight) - load.current_weight)} kg remaining`,
        );
      }
    }

    if (travel.transport_type === TransportType.SHIP) {
      const totalVolume = load.current_volume + newVolume;
      if (totalVolume > Number(travel.max_volume)) {
        throw new AppError(
          400,
          `Volume capacity exceeded for this shipment: ${round3(totalVolume)} m³ requested, ` +
          `${round3(Number(travel.max_volume) - load.current_volume)} m³ remaining`,
        );
      }
    }

    return { travel, load };
  }

  private async computeLoad(travelId: number, travel: Travel): Promise<TravelLoad> {
    // Count only packages that have committed capacity (accepted or beyond)
    const COMMITTED_STATUSES = [
      PackageStatus.AWAITING_PAYMENT,
      PackageStatus.PAID,
      PackageStatus.IN_TRAVEL,
      PackageStatus.IN_TRANSIT,
    ];
    const packages = await Package.findAll({
      where: { travel_id: travelId, status: { [Op.in]: COMMITTED_STATUSES } },
      attributes: ['weight', 'volume'],
    });
    const current_weight = packages.reduce((s, p) => s + Number(p.weight), 0);
    const current_volume = packages.reduce((s, p) => s + Number(p.volume), 0);
    const max_weight     = Number(travel.max_weight);
    const max_volume     = Number(travel.max_volume);
    return {
      packages_count:  packages.length,
      current_weight:  round2(current_weight),
      current_volume:  round3(current_volume),
      max_weight,
      max_volume,
      weight_fill_pct: max_weight > 0 ? Math.round((current_weight / max_weight) * 100) : 0,
      volume_fill_pct: max_volume > 0 ? Math.round((current_volume / max_volume) * 100) : 0,
    };
  }

  private async updateTravelStatusAfterAdd(travel: Travel, load: TravelLoad, addedWeight: number, addedVolume: number): Promise<void> {
    const maxPct = travel.max_load_percentage;
    const isFull =
      travel.transport_type === TransportType.PLANE
        ? Math.round(((load.current_weight + addedWeight) / load.max_weight) * 100) >= maxPct
        : Math.round(((load.current_volume + addedVolume) / load.max_volume) * 100) >= maxPct;
    if (isFull) await travel.update({ status: TravelStatus.FULL });
  }

  private async reopenTravelIfNeeded(travelId: number): Promise<void> {
    const travel = await Travel.findByPk(travelId);
    if (!travel || travel.status !== TravelStatus.FULL) return;
    const load = await this.computeLoad(travelId, travel);
    const fillPct = travel.transport_type === TransportType.PLANE ? load.weight_fill_pct : load.volume_fill_pct;
    if (fillPct < travel.max_load_percentage) {
      await travel.update({ status: TravelStatus.OPEN });
    }
  }

  private computePrice(travel: Travel, pkg: Package): number | null {
    if (!travel.price_per_unit) return null;
    const base = travel.transport_type === TransportType.PLANE
      ? Number(travel.price_per_unit) * Number(pkg.weight)
      : Number(travel.price_per_unit) * Number(pkg.volume);
    const multiplier = FRAGILITY_MULTIPLIER[pkg.fragility] ?? 1;
    return Math.round(base * multiplier * 100) / 100;
  }

  private async findOwnedPackage(packageId: number, clientId: number): Promise<Package> {
    const pkg = await Package.findOne({ where: { package_id: packageId, client_id: clientId } });
    if (!pkg) throw new AppError(404, 'Package not found');
    return pkg;
  }

  private deleteOldFiles(paths: string[]): void {
    for (const p of paths) {
      const fullPath = path.join(process.cwd(), p);
      fs.unlink(fullPath, () => {}); // ignore errors (file may have already been removed)
    }
  }

  private async notify(userId: number, title: string, content: string): Promise<void> {
    await createAndPush(userId, title, content);
  }

  private validatePackageFields(data: CreatePackageDto): void {
    if (!data.recipient_id)                             throw new AppError(400, 'recipient_id is required');
    if (!data.description?.trim())                      throw new AppError(400, 'Description is required');
    if (!data.weight || data.weight <= 0)               throw new AppError(400, 'Weight must be a positive number (kg)');
    if (!data.volume || data.volume <= 0)               throw new AppError(400, 'Volume must be a positive number (m³)');
    if (data.declared_value == null || data.declared_value < 0) {
      throw new AppError(400, 'Declared value must be a non-negative number');
    }
    if (!data.image1)                                   throw new AppError(400, 'At least one image (image1) is required');
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round3(n: number): number { return Math.round(n * 1000) / 1000; }
