import { Response } from 'express';

/**
 * In-memory SSE client registry.
 * Maps userId → Set of open Response streams.
 *
 * NOTE: this works for a single-server deployment.
 * For horizontal scaling (multiple Node.js instances), replace with
 * Redis pub/sub so that a notification created on server A is pushed
 * to a client connected to server B.
 */
const clients = new Map<number, Set<Response>>();

export function addClient(userId: number, res: Response): void {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(res);
}

export function removeClient(userId: number, res: Response): void {
  clients.get(userId)?.delete(res);
  if (clients.get(userId)?.size === 0) clients.delete(userId);
}

/** Push a named SSE event to all connections belonging to a user. */
export function pushToUser(userId: number, event: string, data: object): void {
  const userClients = clients.get(userId);
  if (!userClients || userClients.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of userClients) {
    try {
      res.write(payload);
    } catch {
      // stream already closed — clean up
      userClients.delete(res);
    }
  }
  if (userClients.size === 0) clients.delete(userId);
}
