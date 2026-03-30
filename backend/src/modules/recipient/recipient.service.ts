import { Op } from 'sequelize';
import { Recipient } from '../../models/Recipient.model';
import { Package, PackageStatus } from '../../models/Package.model';
import { AppError } from '../../middlewares/errorHandler';
import type { CreateRecipientDto, UpdateRecipientDto } from './recipient.dto';

// Statuts qui bloquent la suppression d'un destinataire
const ACTIVE_STATUSES = [
  PackageStatus.PENDING,
  PackageStatus.IN_TRAVEL,
  PackageStatus.IN_TRANSIT,
];

export class RecipientService {

  async create(clientId: number, data: CreateRecipientDto): Promise<Recipient> {
    this.validateFields(data);
    return Recipient.create({ client_id: clientId, ...data });
  }

  async getAll(clientId: number): Promise<Recipient[]> {
    return Recipient.findAll({
      where: { client_id: clientId },
      order: [['last_name', 'ASC'], ['first_name', 'ASC']],
    });
  }

  async getById(recipientId: number, clientId: number): Promise<Recipient> {
    const recipient = await this.findOwned(recipientId, clientId);
    return recipient;
  }

  async update(recipientId: number, clientId: number, data: UpdateRecipientDto): Promise<Recipient> {
    const recipient = await this.findOwned(recipientId, clientId);

    const patch: Record<string, unknown> = {};
    if (data.first_name !== undefined) patch.first_name = data.first_name;
    if (data.last_name !== undefined)  patch.last_name  = data.last_name;
    if (data.phone !== undefined)      patch.phone      = data.phone;
    if (data.address !== undefined)    patch.address    = data.address;
    if (data.city !== undefined)       patch.city       = data.city;
    if (data.country !== undefined)    patch.country    = data.country;
    if ('email' in data)               patch.email      = data.email ?? null;

    await recipient.update(patch);
    return recipient;
  }

  async remove(recipientId: number, clientId: number): Promise<{ message: string }> {
    const recipient = await this.findOwned(recipientId, clientId);

    // Bloquer la suppression si des colis actifs sont liés à ce destinataire
    const activePackageCount = await Package.count({
      where: {
        recipient_id: recipientId,
        status: { [Op.in]: ACTIVE_STATUSES },
      },
    });

    if (activePackageCount > 0) {
      throw new AppError(
        409,
        `Cannot delete recipient: ${activePackageCount} active package(s) are linked to them`,
      );
    }

    await recipient.destroy();
    return { message: 'Recipient deleted successfully' };
  }

  private async findOwned(recipientId: number, clientId: number): Promise<Recipient> {
    const recipient = await Recipient.findOne({
      where: { recipient_id: recipientId, client_id: clientId },
    });
    if (!recipient) throw new AppError(404, 'Recipient not found');
    return recipient;
  }

  private validateFields(data: CreateRecipientDto): void {
    const required: (keyof CreateRecipientDto)[] = [
      'first_name', 'last_name', 'phone', 'address', 'city', 'country',
    ];
    for (const field of required) {
      if (!data[field]?.toString().trim()) {
        throw new AppError(400, `Field "${field}" is required`);
      }
    }
  }
}
