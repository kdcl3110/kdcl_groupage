import { Router } from 'express';
import express from 'express';
import { paymentController } from './payment.controller';
import { authenticate } from '../../middlewares/authenticate';
import { requireRole } from '../../middlewares/requireRole';
import { UserRole } from '../../models/User.model';

const router = Router();

/**
 * @openapi
 * /payments/webhooks/stripe:
 *   post:
 *     tags: [Paiements]
 *     summary: Webhook Stripe (usage interne)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object }
 *     responses:
 *       200:
 *         description: Événement traité
 */
router.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  (req, _res, next) => { (req as any).rawBody = req.body; next(); },
  paymentController.stripeWebhook.bind(paymentController),
);

/**
 * @openapi
 * /payments/webhooks/notchpay:
 *   post:
 *     tags: [Paiements]
 *     summary: Webhook Notchpay (usage interne)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object }
 *     responses:
 *       200:
 *         description: Événement traité
 */
router.post(
  '/webhooks/notchpay',
  express.text({ type: 'application/json' }),
  (req, _res, next) => { (req as any).rawBody = req.body; next(); },
  paymentController.notchpayWebhook.bind(paymentController),
);

/**
 * @openapi
 * /payments/initiate:
 *   post:
 *     tags: [Paiements]
 *     summary: Initier le paiement d'un colis accepté (client uniquement)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [package_id, provider, currency]
 *             properties:
 *               package_id: { type: integer }
 *               provider:   { $ref: '#/components/schemas/PaymentProvider' }
 *               currency:   { type: string, example: EUR, description: 'Code ISO 4217 (EUR, XAF, USD)' }
 *     responses:
 *       200:
 *         description: Paiement initié — retourne l'URL de paiement ou le client_secret Stripe
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:         { type: string }
 *                 payment_url:    { type: string, description: 'URL Notchpay' }
 *                 client_secret:  { type: string, description: 'Secret Stripe' }
 *                 payment:        { $ref: '#/components/schemas/Payment' }
 *       400:
 *         description: Colis non éligible au paiement
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/initiate', authenticate, requireRole(UserRole.CLIENT), paymentController.initiate.bind(paymentController));

/**
 * @openapi
 * /payments/package/{packageId}:
 *   get:
 *     tags: [Paiements]
 *     summary: Récupérer le paiement d'un colis
 *     parameters:
 *       - in: path
 *         name: packageId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Enregistrement de paiement
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:   { $ref: '#/components/schemas/Payment' }
 *       404:
 *         description: Paiement introuvable
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/package/:packageId', authenticate, requireRole(UserRole.CLIENT, UserRole.FREIGHT_FORWARDER, UserRole.ADMIN), paymentController.getForPackage.bind(paymentController));

/**
 * @openapi
 * /payments/reference/{reference}:
 *   get:
 *     tags: [Paiements]
 *     summary: Récupérer un paiement par référence Notchpay (public)
 *     security: []
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paiement correspondant
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:   { $ref: '#/components/schemas/Payment' }
 */
router.get('/reference/:reference', paymentController.getByReference.bind(paymentController));

export default router;
