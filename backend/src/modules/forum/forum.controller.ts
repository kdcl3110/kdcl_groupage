import { Response, NextFunction } from 'express';
import { ForumService } from './forum.service';
import type { AuthRequest } from '../../middlewares/authenticate';

const service = new ForumService();

export async function getForumMessages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const caller = { userId: req.user!.user_id, role: req.user!.role };
    const messages = await service.getMessages(Number(req.params.id), caller);
    res.status(200).json(messages);
  } catch (error) {
    next(error);
  }
}

export async function postForumMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { content, parent_message_id } = req.body as { content: string; parent_message_id?: number };
    const message = await service.postMessage(
      Number(req.params.id),
      req.user!.user_id,
      content,
      parent_message_id,
    );
    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
}
