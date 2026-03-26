import { Request, Response, NextFunction } from 'express';
import { env } from '../configs/env.config';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ status: 'error', message: err.message });
    return;
  }

  console.error('[Unhandled error]', err);

  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    ...(env.isDev() && { stack: err.stack }),
  });
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ status: 'error', message: 'Route not found' });
}
