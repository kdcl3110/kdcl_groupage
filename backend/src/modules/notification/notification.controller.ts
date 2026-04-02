import { Response, NextFunction } from 'express';
import { NotificationService } from './notification.service';
import { addClient, removeClient } from './notification.sse';
import type { AuthRequest } from '../../middlewares/authenticate';

const service = new NotificationService();

export async function streamNotifications(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.user_id;

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // prevent nginx from buffering the stream
  res.flushHeaders();

  // Send the full notification list as the first event so the client
  // hydrates its store without a separate HTTP request
  const notifs = await service.getAll(userId);
  res.write(`event: init\ndata: ${JSON.stringify(notifs)}\n\n`);

  // Register this connection
  addClient(userId, res);

  // Heartbeat every 20 s to prevent proxy / load-balancer timeouts
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch { clearInterval(heartbeat); }
  }, 20_000);

  // Cleanup when the client disconnects
  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(userId, res);
  });
}

export async function getNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const notifs = await service.getAll(req.user!.user_id);
    res.json(notifs);
  } catch (err) { next(err); }
}

export async function markRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await service.markRead(Number(req.params.id), req.user!.user_id);
    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
}

export async function markAllRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await service.markAllRead(req.user!.user_id);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) { next(err); }
}
