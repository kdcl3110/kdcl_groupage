import { Response, NextFunction } from 'express';
import { RecipientService } from './recipient.service';
import type { AuthRequest } from '../../middlewares/authenticate';

const service = new RecipientService();

export async function createRecipient(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const recipient = await service.create(req.user!.user_id, req.body);
    res.status(201).json(recipient);
  } catch (error) {
    next(error);
  }
}

export async function getMyRecipients(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const recipients = await service.getAll(req.user!.user_id);
    res.status(200).json(recipients);
  } catch (error) {
    next(error);
  }
}

export async function getRecipientById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const recipient = await service.getById(Number(req.params.id), req.user!.user_id);
    res.status(200).json(recipient);
  } catch (error) {
    next(error);
  }
}

export async function updateRecipient(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const recipient = await service.update(Number(req.params.id), req.user!.user_id, req.body);
    res.status(200).json(recipient);
  } catch (error) {
    next(error);
  }
}

export async function deleteRecipient(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.remove(Number(req.params.id), req.user!.user_id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
