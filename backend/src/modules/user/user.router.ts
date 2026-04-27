import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { requireRole } from '../../middlewares/requireRole';
import { UserRole } from '../../models/User.model';
import { uploadAvatar as uploadAvatarMiddleware } from '../../middlewares/upload';
import * as UserController from './user.controller';
import * as PayoutAccountController from './payoutAccount.controller';

const router = Router();

/**
 * @openapi
 * /users/verify-email:
 *   get:
 *     tags: [Utilisateurs]
 *     summary: Vérifier l'email via le lien reçu par email
 *     security: []
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Email vérifié
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       400:
 *         description: Token invalide ou expiré
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/verify-email', UserController.confirmEmailVerification);

/**
 * @openapi
 * /users/{id}/profile:
 *   get:
 *     tags: [Utilisateurs]
 *     summary: Profil public d'un groupeur (inclut le nombre de voyages)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Profil public
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/User'
 *                     - type: object
 *                       properties:
 *                         travel_count: { type: integer }
 *       404:
 *         description: Utilisateur introuvable
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/:id/profile', authenticate, UserController.getPublicProfile);

/**
 * @openapi
 * /users/me/avatar:
 *   post:
 *     tags: [Utilisateurs]
 *     summary: Uploader ou remplacer sa photo de profil
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [avatar]
 *             properties:
 *               avatar: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Photo mise à jour
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *   delete:
 *     tags: [Utilisateurs]
 *     summary: Supprimer sa photo de profil
 *     responses:
 *       200:
 *         description: Photo supprimée
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 */
router.post('/me/avatar',   authenticate, uploadAvatarMiddleware, UserController.uploadAvatar);
router.delete('/me/avatar', authenticate, UserController.deleteAvatar);

/**
 * @openapi
 * /users/me/verify-email/send:
 *   post:
 *     tags: [Utilisateurs]
 *     summary: Envoyer un email de vérification à l'utilisateur connecté
 *     responses:
 *       200:
 *         description: Email envoyé
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 */
router.post('/me/verify-email/send', authenticate, UserController.sendEmailVerification);

/**
 * @openapi
 * /users/me/payout-accounts:
 *   get:
 *     tags: [Comptes de paiement]
 *     summary: Lister ses comptes de paiement (groupeur / admin)
 *     responses:
 *       200:
 *         description: Liste des comptes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:   { type: array, items: { $ref: '#/components/schemas/PayoutAccount' } }
 *   post:
 *     tags: [Comptes de paiement]
 *     summary: Ajouter un compte de paiement
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, account_holder_name, country_code]
 *             properties:
 *               type:                { type: string, enum: [iban, mobile_money] }
 *               account_holder_name: { type: string }
 *               iban:                { type: string, description: 'Requis si type=iban' }
 *               mobile_number:       { type: string, description: 'Requis si type=mobile_money' }
 *               mobile_operator:     { type: string, enum: [mtn, orange] }
 *               country_code:        { type: string, example: BE }
 *               is_default:          { type: boolean }
 *     responses:
 *       201:
 *         description: Compte créé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:   { $ref: '#/components/schemas/PayoutAccount' }
 */
router.get('/me/payout-accounts',  authenticate, requireRole(UserRole.FREIGHT_FORWARDER, UserRole.ADMIN), PayoutAccountController.getAll);
router.post('/me/payout-accounts', authenticate, requireRole(UserRole.FREIGHT_FORWARDER, UserRole.ADMIN), PayoutAccountController.create);

/**
 * @openapi
 * /users/me/payout-accounts/{id}:
 *   put:
 *     tags: [Comptes de paiement]
 *     summary: Modifier un compte de paiement
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               account_holder_name: { type: string }
 *               iban:                { type: string }
 *               mobile_number:       { type: string }
 *               mobile_operator:     { type: string, enum: [mtn, orange] }
 *               is_default:          { type: boolean }
 *     responses:
 *       200:
 *         description: Compte modifié
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *   delete:
 *     tags: [Comptes de paiement]
 *     summary: Supprimer un compte de paiement
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Compte supprimé
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 */
router.put('/me/payout-accounts/:id',    authenticate, requireRole(UserRole.FREIGHT_FORWARDER, UserRole.ADMIN), PayoutAccountController.update);
router.delete('/me/payout-accounts/:id', authenticate, requireRole(UserRole.FREIGHT_FORWARDER, UserRole.ADMIN), PayoutAccountController.remove);

/**
 * @openapi
 * /users/me/payout-accounts/{id}/default:
 *   patch:
 *     tags: [Comptes de paiement]
 *     summary: Définir un compte comme compte par défaut
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Compte défini par défaut
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 */
router.patch('/me/payout-accounts/:id/default', authenticate, requireRole(UserRole.FREIGHT_FORWARDER, UserRole.ADMIN), PayoutAccountController.setDefault);

export default router;
