import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import * as AuthController from './auth.controller';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Inscription d'un nouvel utilisateur
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [first_name, last_name, email, password, phone, street, city, country]
 *             properties:
 *               first_name:  { type: string, example: Jean }
 *               last_name:   { type: string, example: Dupont }
 *               email:       { type: string, format: email }
 *               password:    { type: string, minLength: 8 }
 *               phone:       { type: string, example: '+32470000000' }
 *               street:      { type: string }
 *               city:        { type: string, example: Bruxelles }
 *               country:     { type: string, example: Belgique }
 *               postal_code: { type: string }
 *               role:        { $ref: '#/components/schemas/UserRole' }
 *     responses:
 *       201:
 *         description: Compte créé — retourne le token JWT et l'utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 token:  { type: string }
 *                 user:   { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/register', AuthController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Connexion
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 token:  { type: string }
 *                 user:   { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Identifiants incorrects
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/login', AuthController.login);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Demande de réinitialisation de mot de passe
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Email de réinitialisation envoyé (toujours 200 pour ne pas divulguer l'existence du compte)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 */
router.post('/forgot-password', AuthController.forgotPassword);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Réinitialisation du mot de passe avec le token reçu par email
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, new_password]
 *             properties:
 *               token:        { type: string }
 *               new_password: { type: string, minLength: 8 }
 *     responses:
 *       200:
 *         description: Mot de passe réinitialisé
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       400:
 *         description: Token invalide ou expiré
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/reset-password', AuthController.resetPassword);

/**
 * @openapi
 * /auth/profile:
 *   put:
 *     tags: [Auth]
 *     summary: Mise à jour du profil de l'utilisateur connecté
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:  { type: string }
 *               last_name:   { type: string }
 *               email:       { type: string, format: email }
 *               phone:       { type: string }
 *               street:      { type: string }
 *               city:        { type: string }
 *               country:     { type: string }
 *               postal_code: { type: string }
 *     responses:
 *       200:
 *         description: Profil mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 user:   { $ref: '#/components/schemas/User' }
 */
router.put('/profile', authenticate, AuthController.updateProfile);

/**
 * @openapi
 * /auth/change-password:
 *   put:
 *     tags: [Auth]
 *     summary: Changement de mot de passe (utilisateur connecté)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [current_password, new_password]
 *             properties:
 *               current_password: { type: string }
 *               new_password:     { type: string, minLength: 8 }
 *     responses:
 *       200:
 *         description: Mot de passe changé
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       400:
 *         description: Mot de passe actuel incorrect
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.put('/change-password', authenticate, AuthController.changePassword);

export default router;
