import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { requireRole } from '../../middlewares/requireRole';
import { UserRole } from '../../models/User.model';
import { uploadAvatar as uploadAvatarMiddleware } from '../../middlewares/upload';
import * as UserController from './user.controller';
import * as PayoutAccountController from './payoutAccount.controller';

const router = Router();

// Profil public d'un transitaire (authentifié)
router.get('/:id/profile', authenticate, UserController.getPublicProfile);

// Vérification email (lien cliqué — public, juste token dans query)
router.get('/verify-email', UserController.confirmEmailVerification);

// Routes protégées (utilisateur connecté)
router.post('/me/avatar',             authenticate, uploadAvatarMiddleware, UserController.uploadAvatar);
router.delete('/me/avatar',           authenticate, UserController.deleteAvatar);
router.post('/me/verify-email/send',  authenticate, UserController.sendEmailVerification);

// Payout accounts (groupeur only)
router.get('/me/payout-accounts',              authenticate, requireRole(UserRole.FREIGHT_FORWARDER, UserRole.ADMIN), PayoutAccountController.getAll);
router.post('/me/payout-accounts',             authenticate, requireRole(UserRole.FREIGHT_FORWARDER, UserRole.ADMIN), PayoutAccountController.create);
router.put('/me/payout-accounts/:id',          authenticate, requireRole(UserRole.FREIGHT_FORWARDER, UserRole.ADMIN), PayoutAccountController.update);
router.delete('/me/payout-accounts/:id',       authenticate, requireRole(UserRole.FREIGHT_FORWARDER, UserRole.ADMIN), PayoutAccountController.remove);
router.patch('/me/payout-accounts/:id/default', authenticate, requireRole(UserRole.FREIGHT_FORWARDER, UserRole.ADMIN), PayoutAccountController.setDefault);

export default router;
