import { Op, fn, col } from 'sequelize';
import { Travel, TravelStatus, TransportType, TravelAttributes } from '../../models/Travel.model';
import { Country } from '../../models/Country.model';
import { Package, PackageStatus } from '../../models/Package.model';
import { Payment, PaymentStatus } from '../../models/Payment.model';
import { UserRole } from '../../models/User.model';
import { ForumMessage, ForumMessageType } from '../../models/ForumMessage.model';
import { createAndPush } from '../notification/notification.helpers';
import { AppError } from '../../middlewares/errorHandler';
import type { CreateTravelDto, UpdateTravelDto, UpdateTravelStatusDto } from './travel.dto';
// Lazy import to avoid circular dependency
let _payoutService: import('../payout/payout.service').PayoutService | null = null;
async function getPayoutService() {
  if (!_payoutService) {
    const mod = await import('../payout/payout.service');
    _payoutService = mod.payoutService;
  }
  return _payoutService;
}

const STATUS_MESSAGES: Record<TravelStatus, string> = {
  [TravelStatus.OPEN]:         'Le voyage est de nouveau ouvert à la soumission de colis.',
  [TravelStatus.FULL]:         'Le voyage est complet. Aucun colis supplémentaire ne peut être ajouté.',
  [TravelStatus.IN_TRANSIT]:   'Le voyage est en transit. Vos colis sont en route vers la destination.',
  [TravelStatus.AT_WAREHOUSE]: 'Les colis sont arrivés à l\'entrepôt de destination. La livraison va bientôt commencer.',
  [TravelStatus.DELIVERED]:    'Le voyage a été livré. Vos colis sont arrivés à destination.',
  [TravelStatus.CANCELLED]:    'Le voyage a été annulé. Veuillez contacter votre groupeur pour plus d\'informations.',
};

const STATUS_TRANSITIONS: Record<TravelStatus, TravelStatus[]> = {
  [TravelStatus.OPEN]:         [TravelStatus.FULL, TravelStatus.IN_TRANSIT, TravelStatus.CANCELLED],
  [TravelStatus.FULL]:         [TravelStatus.OPEN, TravelStatus.IN_TRANSIT, TravelStatus.CANCELLED],
  [TravelStatus.IN_TRANSIT]:   [TravelStatus.AT_WAREHOUSE],
  [TravelStatus.AT_WAREHOUSE]: [TravelStatus.DELIVERED],
  [TravelStatus.DELIVERED]:    [],
  [TravelStatus.CANCELLED]:    [],
};

const PACKAGE_ATTRS = [
  'package_id', 'tracking_number', 'description',
  'weight', 'volume', 'declared_value', 'status', 'creation_date',
];

const CREATOR_ATTRS = ['user_id', 'first_name', 'last_name', 'phone', 'city', 'country'];

const COUNTRY_ATTRS = ['country_id', 'name'];
const COUNTRY_INCLUDE = [
  { association: 'origin',      attributes: COUNTRY_ATTRS },
  { association: 'destination', attributes: COUNTRY_ATTRS },
];

// Réponse aplatie : infos du voyage + capacité actuelle fusionnées
export type TravelWithLoad = TravelAttributes & {
  packages_count: number;
  current_weight: number;
  current_volume: number;
  weight_fill_pct: number;
  volume_fill_pct: number;
  remaining_weight: number;
  remaining_volume: number;
  last_message_at: string | null;
};

// Détail : même chose + liste des colis
export type TravelDetail = TravelWithLoad & {
  packages: object[];
  creator: object | null;
};

export class TravelService {

  async create(createdBy: number, data: CreateTravelDto): Promise<Travel> {
    await this.validateCreate(data);
    const travel = await Travel.create({
      created_by: createdBy,
      transport_type: data.transport_type,
      origin_country_id: data.origin_country_id,
      destination_country_id: data.destination_country_id,
      itinerary: data.itinerary ?? null,
      max_weight: data.max_weight,
      max_volume: data.max_volume,
      min_load_percentage: data.min_load_percentage,
      max_load_percentage: data.max_load_percentage,
      price_per_unit: data.price_per_unit ?? null,
      container: data.container ?? null,
      departure_date: data.departure_date ? new Date(data.departure_date) : null,
      estimated_arrival_date: data.estimated_arrival_date ? new Date(data.estimated_arrival_date) : null,
    });
    return travel.reload({ include: COUNTRY_INCLUDE });
  }

  // Liste (admin = tous, groupeur = les siens)

  async getAll(
    caller: { userId: number; role: UserRole },
    filters: { status?: string; transport_type?: string; origin_country_id?: string; destination_country_id?: string },
    pagination: { limit: number; offset: number },
  ): Promise<{ data: TravelWithLoad[]; hasMore: boolean }> {
    const { limit, offset } = pagination;
    const where: Record<string, unknown> = {};

    // Un groupeur ne voit que ses propres voyages
    if (caller.role === UserRole.FREIGHT_FORWARDER) {
      where.created_by = caller.userId;
    }

    if (caller.role === UserRole.CLIENT) {
      // Les clients ne voient jamais les voyages annulés
      where.status = { [Op.ne]: TravelStatus.CANCELLED };
    } else if (filters.status) {
      if (!Object.values(TravelStatus).includes(filters.status as TravelStatus)) {
        throw new AppError(400, `Invalid status filter: ${filters.status}`);
      }
      where.status = filters.status;
    }

    if (filters.transport_type) {
      if (!Object.values(TransportType).includes(filters.transport_type as TransportType)) {
        throw new AppError(400, `Invalid transport_type filter: ${filters.transport_type}`);
      }
      where.transport_type = filters.transport_type;
    }

    if (filters.origin_country_id)      where.origin_country_id      = Number(filters.origin_country_id);
    if (filters.destination_country_id) where.destination_country_id = Number(filters.destination_country_id);

    const rows = await Travel.findAll({
      where,
      include: COUNTRY_INCLUDE,
      order: [['updatedAt', 'DESC']],
      limit: limit + 1, // fetch one extra to detect hasMore
      offset,
    });

    const hasMore = rows.length > limit;
    const travels = hasMore ? rows.slice(0, limit) : rows;

    const travelIds = travels.map((t) => t.travel_id);
    const [loadMap, lastMsgMap] = await Promise.all([
      this.bulkComputeLoad(travelIds),
      this.bulkFetchLastMessageAt(travelIds),
    ]);

    return {
      data: travels.map((travel) => ({
        ...this.mergeLoad(travel, loadMap.get(travel.travel_id) ?? this.emptyLoadValues(travel)),
        last_message_at: lastMsgMap.get(travel.travel_id) ?? null,
      })),
      hasMore,
    };
  }

  async getById(
    travelId: number,
    caller: { userId: number; role: UserRole },
  ): Promise<TravelDetail> {
    const travel = await Travel.findByPk(travelId, {
      include: [
        { association: 'packages', attributes: PACKAGE_ATTRS },
        { association: 'creator', attributes: CREATOR_ATTRS },
        ...COUNTRY_INCLUDE,
      ],
    });
    if (!travel) throw new AppError(404, 'Travel not found');

    this.assertAccess(travel, caller);

    const packages = (travel as any).packages as Package[];
    const creator  = (travel as any).creator ?? null;
    const loadValues = this.computeLoadValues(packages, travel);

    return {
      ...this.mergeLoad(travel, loadValues),
      last_message_at: null,
      creator,
      packages: packages.map((p) => p.toJSON()),
    };
  }

  async update(
    travelId: number,
    caller: { userId: number; role: UserRole },
    data: UpdateTravelDto,
  ): Promise<Travel> {
    const travel = await Travel.findByPk(travelId);
    if (!travel) throw new AppError(404, 'Travel not found');
    this.assertAccess(travel, caller);

    if ([TravelStatus.DELIVERED, TravelStatus.CANCELLED].includes(travel.status)) {
      throw new AppError(400, `Cannot edit a travel with status "${travel.status}"`);
    }

    if (data.min_load_percentage !== undefined || data.max_load_percentage !== undefined) {
      const min = data.min_load_percentage ?? travel.min_load_percentage;
      const max = data.max_load_percentage ?? travel.max_load_percentage;
      if (min > max) throw new AppError(400, 'min_load_percentage cannot exceed max_load_percentage');
    }

    const patch: Record<string, unknown> = {};
    if (data.transport_type !== undefined)        patch.transport_type        = data.transport_type;
    if (data.origin_country_id !== undefined)     patch.origin_country_id     = data.origin_country_id;
    if (data.destination_country_id !== undefined) patch.destination_country_id = data.destination_country_id;
    if ('itinerary' in data)                    patch.itinerary = data.itinerary ?? null;
    if (data.container !== undefined)           patch.container = data.container;
    if (data.max_weight !== undefined)          patch.max_weight = data.max_weight;
    if (data.max_volume !== undefined)          patch.max_volume = data.max_volume;
    if (data.min_load_percentage !== undefined) patch.min_load_percentage = data.min_load_percentage;
    if (data.max_load_percentage !== undefined) patch.max_load_percentage = data.max_load_percentage;
    if ('price_per_unit' in data)               patch.price_per_unit = data.price_per_unit ?? null;
    if ('departure_date' in data)
      patch.departure_date = data.departure_date ? new Date(data.departure_date) : null;
    if ('estimated_arrival_date' in data)
      patch.estimated_arrival_date = data.estimated_arrival_date ? new Date(data.estimated_arrival_date) : null;

    await travel.update(patch);
    return travel;
  }


  async updateStatus(
    travelId: number,
    caller: { userId: number; role: UserRole },
    dto: UpdateTravelStatusDto,
  ): Promise<Travel> {
    const travel = await Travel.findByPk(travelId);
    if (!travel) throw new AppError(404, 'Travel not found');
    this.assertAccess(travel, caller);

    const next = dto.status as TravelStatus;
    if (!Object.values(TravelStatus).includes(next)) {
      throw new AppError(400, `Unknown status: ${dto.status}`);
    }

    const allowed = STATUS_TRANSITIONS[travel.status];
    if (!allowed.includes(next)) {
      throw new AppError(
        400,
        `Cannot transition from "${travel.status}" to "${next}". Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }

    if (next === TravelStatus.IN_TRANSIT) {
      if (!travel.departure_date) throw new AppError(400, 'Set a departure_date before moving to in_transit');
      if (!travel.container)      throw new AppError(400, 'Assign a container before moving to in_transit');

      // Block if any packages are still awaiting payment
      const unpaidCount = await Package.count({
        where: { travel_id: travelId, status: PackageStatus.AWAITING_PAYMENT },
      });
      if (unpaidCount > 0) {
        throw new AppError(
          400,
          `Ce voyage contient ${unpaidCount} colis en attente de paiement. ` +
          `Retirez ces colis du voyage ou attendez que les paiements soient effectués avant de démarrer le transit.`,
        );
      }
    }

    if (next === TravelStatus.CANCELLED) {
      await this.handleCancellation(travelId, dto.target_travel_id);
    }

    await travel.update({ status: next });

    // Cascade sur les statuts des colis
    if (next === TravelStatus.IN_TRANSIT) {
      // paid packages → auto-advance to in_travel then in_transit
      await Package.update(
        { status: PackageStatus.IN_TRAVEL },
        { where: { travel_id: travelId, status: PackageStatus.PAID } },
      );
      await Package.update(
        { status: PackageStatus.IN_TRANSIT },
        { where: { travel_id: travelId, status: PackageStatus.IN_TRAVEL } },
      );
    } else if (next === TravelStatus.AT_WAREHOUSE) {
      // in_transit packages → at_warehouse
      await Package.update(
        { status: PackageStatus.AT_WAREHOUSE },
        { where: { travel_id: travelId, status: PackageStatus.IN_TRANSIT } },
      );
    } else if (next === TravelStatus.DELIVERED) {
      await Package.update(
        { status: PackageStatus.DELIVERED },
        { where: { travel_id: travelId, status: PackageStatus.AT_WAREHOUSE } },
      );
      // Trigger payout asynchronously (non-blocking — errors are caught and logged inside)
      getPayoutService()
        .then((svc) => svc.createPayoutForTravel(travelId))
        .catch((err) => console.error(`[TravelService] Payout creation failed for travel #${travelId}:`, err));
    }

    // Message système dans le forum du voyage
    await ForumMessage.create({
      travel_id: travelId,
      author_id: null,
      message_type: ForumMessageType.SYSTEM,
      parent_message_id: null,
      content: STATUS_MESSAGES[next],
    });

    // Notifications aux clients dont un colis est IN_TRAVEL dans ce voyage
    await this.notifyTravelClients(travelId, STATUS_MESSAGES[next]);

    return travel;
  }

  private async handleCancellation(travelId: number, targetTravelId?: number): Promise<void> {
    // 0. Expire pending payments for awaiting_payment packages, cancel paid packages (need refund)
    const awaitingPayment = await Package.findAll({
      where: { travel_id: travelId, status: PackageStatus.AWAITING_PAYMENT },
      attributes: ['package_id', 'client_id', 'tracking_number'],
    });
    if (awaitingPayment.length > 0) {
      await Payment.update(
        { status: PaymentStatus.EXPIRED },
        { where: { package_id: awaitingPayment.map((p) => p.package_id), status: PaymentStatus.PENDING } },
      );
      await Package.update(
        { travel_id: null, status: PackageStatus.PENDING },
        { where: { travel_id: travelId, status: PackageStatus.AWAITING_PAYMENT } },
      );
      await Promise.all(
        awaitingPayment.map((pkg) =>
          createAndPush(
            pkg.client_id,
            'Voyage annulé — colis en attente',
            `Le voyage #${travelId} a été annulé. Votre colis ${pkg.tracking_number} repasse en attente — le paiement a été annulé.`,
          ),
        ),
      );
    }

    const paidPackages = await Package.findAll({
      where: { travel_id: travelId, status: PackageStatus.PAID },
      attributes: ['package_id', 'client_id', 'tracking_number'],
    });
    if (paidPackages.length > 0) {
      await Package.update(
        { travel_id: null, status: PackageStatus.CANCELLED },
        { where: { travel_id: travelId, status: PackageStatus.PAID } },
      );
      await Promise.all(
        paidPackages.map((pkg) =>
          createAndPush(
            pkg.client_id,
            'Voyage annulé — remboursement requis',
            `Le voyage #${travelId} a été annulé. Votre colis ${pkg.tracking_number} avait déjà été payé. Notre équipe vous contactera pour le remboursement.`,
          ),
        ),
      );
    }

    // 1. Vérifier les colis engagés (in_travel)
    const inTravel = await Package.findAll({
      where: { travel_id: travelId, status: PackageStatus.IN_TRAVEL },
      attributes: ['package_id', 'client_id', 'tracking_number'],
    });

    if (inTravel.length > 0) {
      if (!targetTravelId) {
        throw new AppError(
          409,
          `Ce voyage contient ${inTravel.length} colis engagé${inTravel.length > 1 ? 's' : ''}. ` +
          `Choisissez un autre voyage pour les déplacer avant d'annuler.`,
        );
      }
      const target = await Travel.findByPk(targetTravelId);
      if (!target) throw new AppError(404, `Voyage cible #${targetTravelId} introuvable`);
      if (target.status !== TravelStatus.OPEN && target.status !== TravelStatus.FULL) {
        throw new AppError(400, 'Le voyage cible doit être ouvert');
      }

      await Package.update(
        { travel_id: targetTravelId },
        { where: { travel_id: travelId, status: PackageStatus.IN_TRAVEL } },
      );

      await Promise.all(
        inTravel.map((pkg) =>
          createAndPush(
            pkg.client_id,
            'Voyage annulé — colis déplacé',
            `Le voyage #${travelId} a été annulé. Votre colis ${pkg.tracking_number} ` +
            `a été transféré vers le voyage #${targetTravelId}.`,
          ),
        ),
      );
    }

    // 2. Remettre les colis soumis (submitted) en attente
    const submitted = await Package.findAll({
      where: { travel_id: travelId, status: PackageStatus.SUBMITTED },
      attributes: ['package_id', 'client_id', 'tracking_number'],
    });

    if (submitted.length > 0) {
      await Package.update(
        { travel_id: null, status: PackageStatus.PENDING },
        { where: { travel_id: travelId, status: PackageStatus.SUBMITTED } },
      );

      await Promise.all(
        submitted.map((pkg) =>
          createAndPush(
            pkg.client_id,
            'Voyage annulé',
            `Le voyage #${travelId} a été annulé. Votre colis ${pkg.tracking_number} ` +
            `repasse en attente — vous pouvez le soumettre à un autre voyage.`,
          ),
        ),
      );
    }
  }

  private async notifyTravelClients(travelId: number, content: string): Promise<void> {
    const packages = await Package.findAll({
      where: { travel_id: travelId, status: PackageStatus.IN_TRAVEL },
      attributes: ['client_id'],
    });

    const clientIds = [...new Set(packages.map((p) => p.client_id))];
    if (clientIds.length === 0) return;

    await Promise.all(
      clientIds.map((userId) =>
        createAndPush(userId, 'Mise à jour de votre voyage', content),
      ),
    );
  }

  /** Vérifie qu'un groupeur ne touche qu'à ses propres voyages */
  private assertAccess(travel: Travel, caller: { userId: number; role: UserRole }): void {
    if (caller.role === UserRole.FREIGHT_FORWARDER && travel.created_by !== caller.userId) {
      throw new AppError(403, 'Access denied: this travel does not belong to you');
    }
  }

  private mergeLoad(travel: Travel, load: ReturnType<typeof this.emptyLoadValues>) {
    return { ...(travel.toJSON() as TravelAttributes), ...load };
  }

  private async bulkFetchLastMessageAt(travelIds: number[]): Promise<Map<number, string | null>> {
    if (travelIds.length === 0) return new Map();
    const rows = (await ForumMessage.findAll({
      where: { travel_id: { [Op.in]: travelIds } },
      attributes: [
        'travel_id',
        [fn('MAX', col('creation_date')), 'last_message_at'],
      ],
      group: ['travel_id'],
      raw: true,
    })) as unknown as Array<{ travel_id: number; last_message_at: string }>;
    const map = new Map<number, string | null>();
    for (const row of rows) {
      map.set(Number(row.travel_id), row.last_message_at ?? null);
    }
    return map;
  }

  private async bulkComputeLoad(travelIds: number[]): Promise<Map<number, ReturnType<typeof this.emptyLoadValues>>> {
    if (travelIds.length === 0) return new Map();

    const travels = await Travel.findAll({
      where: { travel_id: { [Op.in]: travelIds } },
      attributes: ['travel_id', 'max_weight', 'max_volume'],
    });
    const travelMap = new Map(travels.map((t) => [t.travel_id, t]));

    const rows = (await Package.findAll({
      where: {
        travel_id: { [Op.in]: travelIds },
        status: { [Op.ne]: PackageStatus.CANCELLED },
      },
      attributes: [
        'travel_id',
        [fn('COUNT', col('package_id')), 'packages_count'],
        [fn('SUM', col('weight')), 'total_weight'],
        [fn('SUM', col('volume')), 'total_volume'],
      ],
      group: ['travel_id'],
      raw: true,
    })) as unknown as Array<{ travel_id: number; packages_count: string; total_weight: string; total_volume: string }>;

    const result = new Map<number, ReturnType<typeof this.emptyLoadValues>>();
    for (const row of rows) {
      const t = travelMap.get(Number(row.travel_id));
      if (!t) continue;
      const mw = Number(t.max_weight);
      const mv = Number(t.max_volume);
      const cw = r2(Number(row.total_weight) || 0);
      const cv = r3(Number(row.total_volume) || 0);
      result.set(Number(row.travel_id), {
        packages_count:   Number(row.packages_count),
        current_weight:   cw,
        current_volume:   cv,
        weight_fill_pct:  mw > 0 ? Math.round((cw / mw) * 100) : 0,
        volume_fill_pct:  mv > 0 ? Math.round((cv / mv) * 100) : 0,
        remaining_weight: r2(Math.max(0, mw - cw)),
        remaining_volume: r3(Math.max(0, mv - cv)),
      });
    }
    return result;
  }

  private computeLoadValues(packages: Package[], travel: Travel) {
    const active = packages.filter((p) => p.status !== PackageStatus.CANCELLED);
    const cw = r2(active.reduce((s, p) => s + Number(p.weight), 0));
    const cv = r3(active.reduce((s, p) => s + Number(p.volume), 0));
    const mw = Number(travel.max_weight);
    const mv = Number(travel.max_volume);
    return {
      packages_count:   active.length,
      current_weight:   cw,
      current_volume:   cv,
      weight_fill_pct:  mw > 0 ? Math.round((cw / mw) * 100) : 0,
      volume_fill_pct:  mv > 0 ? Math.round((cv / mv) * 100) : 0,
      remaining_weight: r2(Math.max(0, mw - cw)),
      remaining_volume: r3(Math.max(0, mv - cv)),
    };
  }

  private emptyLoadValues(travel: Travel) {
    return {
      packages_count:   0,
      current_weight:   0,
      current_volume:   0,
      weight_fill_pct:  0,
      volume_fill_pct:  0,
      remaining_weight: r2(Number(travel.max_weight)),
      remaining_volume: r3(Number(travel.max_volume)),
    };
  }

  private async validateCreate(data: CreateTravelDto): Promise<void> {
    if (!Object.values(TransportType).includes(data.transport_type)) {
      throw new AppError(400, `transport_type must be one of: ${Object.values(TransportType).join(', ')}`);
    }
    if (!data.origin_country_id)      throw new AppError(400, 'origin_country_id is required');
    if (!data.destination_country_id) throw new AppError(400, 'destination_country_id is required');
    const [origin, destination] = await Promise.all([
      Country.findByPk(data.origin_country_id),
      Country.findByPk(data.destination_country_id),
    ]);
    if (!origin)      throw new AppError(404, `Country #${data.origin_country_id} not found`);
    if (!destination) throw new AppError(404, `Country #${data.destination_country_id} not found`);
    if (data.origin_country_id === data.destination_country_id) {
      throw new AppError(400, 'Origin and destination countries must be different');
    }
    if (!data.max_weight || data.max_weight <= 0) throw new AppError(400, 'max_weight must be > 0');
    if (!data.max_volume || data.max_volume <= 0) throw new AppError(400, 'max_volume must be > 0');

    const min = data.min_load_percentage;
    const max = data.max_load_percentage;
    if (min == null || min < 0 || min > 100) throw new AppError(400, 'min_load_percentage must be between 0 and 100');
    if (max == null || max < 0 || max > 100) throw new AppError(400, 'max_load_percentage must be between 0 and 100');
    if (min > max) throw new AppError(400, 'min_load_percentage cannot exceed max_load_percentage');

    if (data.departure_date && isNaN(Date.parse(data.departure_date))) {
      throw new AppError(400, 'Invalid departure_date format');
    }
    if (data.departure_date) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const dep   = new Date(data.departure_date); dep.setHours(0, 0, 0, 0);
      if (dep < today) throw new AppError(400, 'departure_date cannot be in the past');
    }
    if (data.estimated_arrival_date && isNaN(Date.parse(data.estimated_arrival_date))) {
      throw new AppError(400, 'Invalid estimated_arrival_date format');
    }
    if (
      data.departure_date &&
      data.estimated_arrival_date &&
      new Date(data.departure_date) >= new Date(data.estimated_arrival_date)
    ) {
      throw new AppError(400, 'estimated_arrival_date must be after departure_date');
    }
  }
}

function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
