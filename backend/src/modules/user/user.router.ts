import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { uploadAvatar as uploadAvatarMiddleware } from '../../middlewares/upload';
import * as UserController from './user.controller';

const router = Router();

// Profil public d'un transitaire (authentifié)
router.get('/:id/profile', authenticate, UserController.getPublicProfile);

// Vérification email (lien cliqué — public, juste token dans query)
router.get('/verify-email', UserController.confirmEmailVerification);

// Routes protégées (utilisateur connecté)
router.post('/me/avatar',             authenticate, uploadAvatarMiddleware, UserController.uploadAvatar);
router.delete('/me/avatar',           authenticate, UserController.deleteAvatar);
router.post('/me/verify-email/send',  authenticate, UserController.sendEmailVerification);

export default router;
