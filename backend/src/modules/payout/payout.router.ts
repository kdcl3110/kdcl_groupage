import { Router } from 'express';
import { payoutController } from './payout.controller';
import { authenticate } from '../../middlewares/authenticate';
import { requireRole } from '../../middlewares/requireRole';
import { UserRole } from '../../models/User.model';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requireRole(UserRole.FREIGHT_FORWARDER, UserRole.ADMIN),
  payoutController.getAll.bind(payoutController),
);

router.get(
  '/:id',
  requireRole(UserRole.FREIGHT_FORWARDER, UserRole.ADMIN),
  payoutController.getById.bind(payoutController),
);

router.post(
  '/:id/retry',
  requireRole(UserRole.ADMIN),
  payoutController.retry.bind(payoutController),
);

export default router;
