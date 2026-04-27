import { Op } from 'sequelize';
import { Travel } from '../../models/Travel.model';
import { ForumMessage, ForumMessageType } from '../../models/ForumMessage.model';
import { MessageRead } from '../../models/MessageRead.model';
import { User, UserRole } from '../../models/User.model';
import { Package, PackageStatus } from '../../models/Package.model';
import { AppError } from '../../middlewares/errorHandler';
import { createAndPush } from '../notification/notification.helpers';

const AUTHOR_ATTRS = ['user_id', 'first_name', 'last_name'];
const READER_ATTRS = ['user_id', 'first_name', 'last_name'];

const PARTICIPANT_STATUSES = [
  PackageStatus.SUBMITTED,
  PackageStatus.IN_TRAVEL,
  PackageStatus.IN_TRANSIT,
  PackageStatus.DELIVERED,
];

export class ForumService {

  async getMessages(
    travelId: number,
    caller: { userId: number; role: UserRole },
  ): Promise<{ messages: object[]; participants?: object[] }> {
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

    const isManager = caller.role !== UserRole.CLIENT;

    if (messages.length === 0) {
      const participants = isManager ? await this.fetchParticipants(travelId) : undefined;
      return { messages: [], participants };
    }

    const messageIds = messages.map((m) => m.message_id);

    // Charger tous les accusés de lecture pour ces messages
    const reads = await MessageRead.findAll({
      where: { message_id: { [Op.in]: messageIds } },
      include: [{ association: 'reader', attributes: READER_ATTRS }],
    });

    // Index: message_id -> readers[]
    type Reader = { user_id: number; first_name: string; last_name: string };
    const readersMap = new Map<number, Reader[]>();
    for (const read of reads) {
      const reader = (read as any).reader as Reader | null;
      if (!reader) continue;
      const list = readersMap.get(read.message_id) ?? [];
      list.push(reader);
      readersMap.set(read.message_id, list);
    }

    // Pour le groupeur : récupérer la liste des participants pour calculer les non-lus
    const participants = isManager ? await this.fetchParticipants(travelId) : undefined;

    // Construire la réponse avec is_read et readers
    const result = messages.map((m) => {
      const readers = readersMap.get(m.message_id) ?? [];
      const isRead = m.message_type === ForumMessageType.SYSTEM
        || readers.some((r) => r.user_id === caller.userId);

      // Pour le groupeur : readers = tous ceux qui ont lu (hors auteur du message)
      const readersForFF = isManager
        ? readers.filter((r) => r.user_id !== m.author_id)
        : undefined;

      return {
        ...m.toJSON(),
        is_read: isRead,
        readers: readersForFF,
      };
    });

    // Marquer comme lus tous les messages user non encore lus par cet utilisateur
    const unreadIds = messages
      .filter((m) => m.message_type === ForumMessageType.USER)
      .filter((m) => !(readersMap.get(m.message_id) ?? []).some((r) => r.user_id === caller.userId))
      .map((m) => m.message_id);

    if (unreadIds.length > 0) {
      await MessageRead.bulkCreate(
        unreadIds.map((id) => ({ message_id: id, user_id: caller.userId })),
        { ignoreDuplicates: true },
      );
    }

    return { messages: result, participants };
  }

  async getUnreadCount(
    travelId: number,
    caller: { userId: number; role: UserRole },
  ): Promise<number> {
    const travel = await Travel.findByPk(travelId, { attributes: ['travel_id', 'created_by'] });
    if (!travel) throw new AppError(404, 'Travel not found');

    if (caller.role === UserRole.FREIGHT_FORWARDER && travel.created_by !== caller.userId) {
      throw new AppError(403, 'Access denied');
    }
    if (caller.role === UserRole.CLIENT) {
      await this.assertClientIsParticipant(travelId, caller.userId);
    }

    const messages = await ForumMessage.findAll({
      where: { travel_id: travelId, message_type: ForumMessageType.USER },
      attributes: ['message_id'],
    });

    if (messages.length === 0) return 0;

    const readCount = await MessageRead.count({
      where: {
        message_id: { [Op.in]: messages.map((m) => m.message_id) },
        user_id: caller.userId,
      },
    });

    return messages.length - readCount;
  }

  async postMessage(
    travelId: number,
    caller: { userId: number; role: UserRole },
    content: string,
    parentMessageId?: number,
  ): Promise<object> {
    const travel = await Travel.findByPk(travelId, {
      include: [
        { association: 'origin',      attributes: ['name'] },
        { association: 'destination', attributes: ['name'] },
      ],
    });
    if (!travel) throw new AppError(404, 'Travel not found');

    if (caller.role === UserRole.FREIGHT_FORWARDER && travel.created_by !== caller.userId) {
      throw new AppError(403, 'Access denied: this travel does not belong to you');
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

    // L'auteur a automatiquement "lu" son propre message
    await MessageRead.create({ message_id: message.message_id, user_id: caller.userId });

    const full = await ForumMessage.findByPk(message.message_id, {
      include: [{ association: 'author', attributes: AUTHOR_ATTRS }],
    });

    // Notifier tous les clients participants (hors auteur)
    await this.notifyParticipants(travelId, caller.userId, travel);

    return {
      ...full!.toJSON(),
      is_read: true,
      readers: [],
    };
  }

  // Helpers privés
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

  private async fetchParticipants(travelId: number): Promise<{ user_id: number; first_name: string; last_name: string }[]> {
    const pkgs = await Package.findAll({
      where: { travel_id: travelId, status: { [Op.in]: PARTICIPANT_STATUSES } },
      attributes: ['client_id'],
      include: [{ association: 'client', attributes: ['user_id', 'first_name', 'last_name'] }],
    });
    const seen = new Set<number>();
    const result: { user_id: number; first_name: string; last_name: string }[] = [];
    for (const pkg of pkgs) {
      const client = (pkg as any).client as { user_id: number; first_name: string; last_name: string } | null;
      if (client && !seen.has(client.user_id)) {
        seen.add(client.user_id);
        result.push(client);
      }
    }
    return result;
  }

  private async notifyParticipants(travelId: number, authorId: number, travel: any): Promise<void> {
    const packages = await Package.findAll({
      where: {
        travel_id: travelId,
        status: { [Op.in]: PARTICIPANT_STATUSES },
      },
      attributes: ['client_id'],
    });

    const clientIds = [...new Set(packages.map((p) => p.client_id))].filter((id) => id !== authorId);
    if (clientIds.length === 0) return;

    const originName = (travel as any).origin?.name ?? '';
    const destName   = (travel as any).destination?.name ?? '';
    const label      = originName && destName ? `${originName} → ${destName}` : `#${travelId}`;

    await Promise.all(
      clientIds.map((userId) =>
        createAndPush(
          userId,
          'Nouveau message dans le forum',
          `Le transitaire a posté un message dans le forum du voyage ${label}.`,
        ),
      ),
    );
  }
}
