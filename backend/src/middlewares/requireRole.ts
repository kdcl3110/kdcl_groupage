import { Response, NextFunction } from 'express';
import { UserRole } from '../models/User.model';
import { AppError } from './errorHandler';
import type { AuthRequest } from './authenticate';

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, 'Insufficient permissions'));
    }
    next();
  };
}
