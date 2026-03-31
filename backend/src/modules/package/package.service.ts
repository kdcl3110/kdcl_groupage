import { Op } from 'sequelize';
import { Package, PackageStatus } from '../../models/Package.model';
import { Travel, TravelStatus, TransportType } from '../../models/Travel.model';
import { Recipient } from '../../models/Recipient.model';
import { Notification } from '../../models/Notification.model';
import { AppError } from '../../middlewares/errorHandler';
import type {
  CreatePackageDto,
  UpdatePackageDto,
  SubmitToTravelDto,
  AdminReassignDto,
} from './package.dto';

const RECIPIENT_ATTRS = [
  'recipient_id', 'first_name', 'last_name', 'phone', 'address', 'city', 'country', 'email',
];
const TRAVEL_ATTRS = [
  'travel_id', 'status', 'transport_type', 'origin_country', 'destination_country',
  'itinerary', 'departure_date', 'estimated_arrival_date',
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
    let travel_load: TravelLoad | null = null;

    if (data.travel_id) {
      const { travel, load } = await this.checkCapacity(data.travel_id, data.weight, data.volume);
      travelId = data.travel_id;
      status = PackageStatus.IN_TRAVEL;
      travel_load = load;
      await this.updateTravelStatusAfterAdd(travel, load, data.weight, data.volume);
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
      special_instructions: data.special_instructions ?? null,
      image1: data.image1,
      image2: data.image2 ?? null,
      image3: data.image3 ?? null,
      image4: data.image4 ?? null,
    });

    await pkg.reload({
      include: [
        { association: 'recipient', attributes: RECIPIENT_ATTRS },
        { association: 'travel', attributes: TRAVEL_ATTRS },
      ],
    });

    return { package: pkg, travel_load };
  }

  async submitToTravel(
    packageId: number,
    clientId: number,
    dto: SubmitToTravelDto,
  ): Promise<{ package: Package; travel_load: TravelLoad }> {
    const pkg = await this.findOwnedPackage(packageId, clientId);

    if (pkg.status !== PackageStatus.PENDING) {
      throw new AppError(400, `Only pending packages can be submitted (current status: "${pkg.status}")`);
    }

    const { travel, load } = await this.checkCapacity(dto.travel_id, Number(pkg.weight), Number(pkg.volume));

    await pkg.update({ travel_id: dto.travel_id, status: PackageStatus.IN_TRAVEL });
    await this.updateTravelStatusAfterAdd(travel, load, Number(pkg.weight), Number(pkg.volume));

    await pkg.reload({
      include: [
        { association: 'recipient', attributes: RECIPIENT_ATTRS },
        { association: 'travel', attributes: TRAVEL_ATTRS },
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
    if ('special_instructions' in data)    patch.special_instructions = data.special_instructions ?? null;
    if (data.recipient_id !== undefined)   patch.recipient_id = data.recipient_id;

    await pkg.update(patch);

    return pkg.reload({
      include: [
        { association: 'recipient', attributes: RECIPIENT_ATTRS },
        { association: 'travel', attributes: TRAVEL_ATTRS },
      ],
    });
  }

  async cancel(packageId: number, clientId: number): Promise<{ message: string }> {
    const pkg = await this.findOwnedPackage(packageId, clientId);
    if (pkg.status !== PackageStatus.PENDING) {
      throw new AppError(400, `Only pending packages can be cancelled (current status: "${pkg.status}")`);
    }
    await pkg.update({ status: PackageStatus.CANCELLED });
    return { message: 'Package cancelled successfully' };
  }

  async remove(packageId: number, clientId: number): Promise<{ message: string }> {
    const pkg = await this.findOwnedPackage(packageId, clientId);
    if (pkg.status !== PackageStatus.PENDING) {
      throw new AppError(400, `Only pending packages can be deleted (current status: "${pkg.status}")`);
    }
    await pkg.destroy();
    return { message: 'Package deleted successfully' };
  }

  async getMyPackages(clientId: number): Promise<Package[]> {
    return Package.findAll({
      where: { client_id: clientId },
      include: [
        { association: 'recipient', attributes: RECIPIENT_ATTRS },
        { association: 'travel', attributes: TRAVEL_ATTRS },
      ],
      order: [['creation_date', 'DESC']],
    });
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

  async adminReassign(packageId: number, dto: AdminReassignDto): Promise<Package> {
    const pkg = await Package.findByPk(packageId);
    if (!pkg) throw new AppError(404, 'Package not found');

    if (dto.travel_id === null) {
      if (pkg.status !== PackageStatus.IN_TRAVEL) {
        throw new AppError(400, 'Package is not currently assigned to a travel');
      }
      const oldTravelId = pkg.travel_id!;
      await pkg.update({ travel_id: null, status: PackageStatus.PENDING });
      await this.reopenTravelIfNeeded(oldTravelId);
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
    const packages = await Package.findAll({
      where: { travel_id: travelId, status: { [Op.notIn]: [PackageStatus.CANCELLED] } },
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

  private async findOwnedPackage(packageId: number, clientId: number): Promise<Package> {
    const pkg = await Package.findOne({ where: { package_id: packageId, client_id: clientId } });
    if (!pkg) throw new AppError(404, 'Package not found');
    return pkg;
  }

  private async notify(userId: number, title: string, content: string): Promise<void> {
    await Notification.create({ user_id: userId, title, content });
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
