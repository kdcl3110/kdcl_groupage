import { Request, Response, NextFunction } from 'express';
import { payoutService } from './payout.service';
import { AppError } from '../../middlewares/errorHandler';
import { UserRole } from '../../models/User.model';

export class PayoutController {

  /** GET /payouts — list payouts */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const caller = (req as any).user as { userId: number; role: UserRole };
      const limit  = Math.min(parseInt(req.query.limit  as string ?? '20', 10), 100);
      const offset = parseInt(req.query.offset as string ?? '0', 10);

      const result = await payoutService.getAll(caller, { limit, offset });
      res.json({ status: 'ok', ...result });
    } catch (err) {
      next(err);
    }
  }

  /** GET /payouts/:id — payout detail */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const caller   = (req as any).user as { userId: number; role: UserRole };
      const payoutId = parseInt(req.params['id'] as string, 10);
      const payout   = await payoutService.getById(payoutId, caller);
      res.json({ status: 'ok', data: payout });
    } catch (err) {
      next(err);
    }
  }

  /** POST /payouts/:id/retry — admin retries a failed payout */
  async retry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const caller = (req as any).user as { userId: number; role: UserRole };
      if (caller.role !== UserRole.ADMIN) throw new AppError(403, 'Admin only');

      const payoutId = parseInt(req.params['id'] as string, 10);
      const payout   = await payoutService.retryPayout(payoutId);
      res.json({ status: 'ok', data: payout });
    } catch (err) {
      next(err);
    }
  }
}

export const payoutController = new PayoutController();
