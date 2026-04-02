import { Notification } from '../../models/Notification.model';
import { pushToUser } from './notification.sse';

/**
 * Creates a notification in the database AND immediately pushes it
 * to any open SSE connection for that user.
 * Use this everywhere instead of calling Notification.create directly.
 */
export async function createAndPush(
  userId: number,
  title: string,
  content: string,
): Promise<void> {
  const notif = await Notification.create({ user_id: userId, title, content });
  pushToUser(userId, 'new', notif.toJSON());
}
