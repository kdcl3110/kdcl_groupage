import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../configs/env.config';
import { AppError } from './errorHandler';
import { User, UserStatus } from '../models/User.model';

interface JwtPayload {
  user_id: number;
}

// Extend Express Request to carry the authenticated user
export interface AuthRequest extends Request {
  user?: User;
}

export async function authenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  // EventSource (SSE) cannot send custom headers — accept token via query param as fallback
  const queryToken = req.query.token as string | undefined;

  let token: string | undefined;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (queryToken) {
    token = queryToken;
  } else {
    return next(new AppError(401, 'Authentication required'));
  }

  try {
    const payload = jwt.verify(token, env.jwt.secret) as JwtPayload;

    const user = await User.findByPk(payload.user_id);
    if (!user) return next(new AppError(401, 'User not found'));

    if (user.status !== UserStatus.ACTIVE) {
      return next(new AppError(403, 'Account is suspended or inactive'));
    }

    req.user = user;
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
}
