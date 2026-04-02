import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import * as NotificationController from './notification.controller';

const router = Router();

// SSE stream — must come before /:id routes
router.get('/stream',    authenticate, NotificationController.streamNotifications);

router.get('/',          authenticate, NotificationController.getNotifications);
// /read-all MUST be before /:id/read to avoid Express matching "read-all" as :id
router.patch('/read-all', authenticate, NotificationController.markAllRead);
router.patch('/:id/read', authenticate, NotificationController.markRead);

export default router;
