import { Notification } from '../../models/Notification.model';
import { AppError } from '../../middlewares/errorHandler';

export class NotificationService {
  async getAll(userId: number): Promise<Notification[]> {
    return Notification.findAll({
      where: { user_id: userId },
      order: [['creation_date', 'DESC']],
      limit: 60,
    });
  }

  async markRead(notificationId: number, userId: number): Promise<void> {
    const notif = await Notification.findOne({
      where: { notification_id: notificationId, user_id: userId },
    });
    if (!notif) throw new AppError(404, 'Notification not found');
    await notif.update({ is_read: true });
  }

  async markAllRead(userId: number): Promise<void> {
    await Notification.update(
      { is_read: true },
      { where: { user_id: userId, is_read: false } },
    );
  }
}
