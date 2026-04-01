import { Op } from 'sequelize';
import { Travel } from '../../models/Travel.model';
import { ForumMessage, ForumMessageType } from '../../models/ForumMessage.model';
import { User, UserRole } from '../../models/User.model';
import { Package, PackageStatus } from '../../models/Package.model';
import { AppError } from '../../middlewares/errorHandler';

const AUTHOR_ATTRS = ['user_id', 'first_name', 'last_name'];

const PARTICIPANT_STATUSES = [PackageStatus.SUBMITTED, PackageStatus.IN_TRAVEL, PackageStatus.IN_TRANSIT, PackageStatus.DELIVERED];

export class ForumService {

  async getMessages(
    travelId: number,
    caller: { userId: number; role: UserRole },
  ): Promise<object[]> {
    const travel = await Travel.findByPk(travelId);
    if (!travel) throw new AppError(404, 'Travel not found');

    if (caller.role === UserRole.FREIGHT_FORWARDER && travel.created_by !== caller.userId) {
      throw new AppError(403, 'Access denied: this travel does not belong to you');
    }

    if (caller.role === UserRole.CLIENT) {
      await this.assertClientIsParticipant(travelId, caller.userId);
    }

    const messages = await ForumMessage.findAll({
      where: { travel_id: travelId },
      include: [{ association: 'author', attributes: AUTHOR_ATTRS }],
      order: [['creation_date', 'ASC']],
    });

    return messages.map((m) => m.toJSON());
  }

  async postMessage(
    travelId: number,
    caller: { userId: number; role: UserRole },
    content: string,
    parentMessageId?: number,
  ): Promise<object> {
    const travel = await Travel.findByPk(travelId);
    if (!travel) throw new AppError(404, 'Travel not found');

    if (caller.role === UserRole.FREIGHT_FORWARDER && travel.created_by !== caller.userId) {
      throw new AppError(403, 'Access denied: this travel does not belong to you');
    }

    if (caller.role === UserRole.CLIENT) {
      await this.assertClientIsParticipant(travelId, caller.userId);
    }

    if (!content?.trim()) throw new AppError(400, 'content is required');

    if (parentMessageId !== undefined) {
      const parent = await ForumMessage.findByPk(parentMessageId);
      if (!parent || parent.travel_id !== travelId) {
        throw new AppError(400, 'Invalid parent_message_id');
      }
    }

    const message = await ForumMessage.create({
      travel_id: travelId,
      author_id: caller.userId,
      message_type: ForumMessageType.USER,
      parent_message_id: parentMessageId ?? null,
      content: content.trim(),
    });

    const full = await ForumMessage.findByPk(message.message_id, {
      include: [{ association: 'author', attributes: AUTHOR_ATTRS }],
    });

    return full!.toJSON();
  }

  private async assertClientIsParticipant(travelId: number, clientId: number): Promise<void> {
    const pkg = await Package.findOne({
      where: {
        travel_id: travelId,
        client_id: clientId,
        status: { [Op.in]: PARTICIPANT_STATUSES },
      },
      attributes: ['package_id'],
    });
    if (!pkg) throw new AppError(403, 'Access denied: you are not a participant of this travel');
  }
}
