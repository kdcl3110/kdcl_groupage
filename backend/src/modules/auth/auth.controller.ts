import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import type { AuthRequest } from '../../middlewares/authenticate';

const service = new AuthService();

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.login(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await service.forgotPassword(req.body.email);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { token, new_password } = req.body;
    const result = await service.resetPassword(token, new_password);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await service.updateProfile(req.user!.user_id, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function changePassword(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await service.changePassword(req.user!.user_id, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
