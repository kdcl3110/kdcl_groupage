import { Router } from 'express';
import express from 'express';
import { paymentController } from './payment.controller';
import { authenticate } from '../../middlewares/authenticate';
import { requireRole } from '../../middlewares/requireRole';
import { UserRole } from '../../models/User.model';

const router = Router();

// Webhook routes (no auth — raw body capture, registered first)

/**
 * Stripe sends the webhook body as raw JSON.
 * We capture it as a Buffer (needed for signature verification)
 * and also attach it to req.rawBody.
 */
router.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  (req, _res, next) => {
    (req as any).rawBody = req.body; // req.body is a Buffer here (from express.raw)
    next();
  },
  paymentController.stripeWebhook.bind(paymentController),
);

/**
 * Notchpay sends JSON — we capture the raw string for signature verification.
 */
router.post(
  '/webhooks/notchpay',
  express.text({ type: 'application/json' }),
  (req, _res, next) => {
    (req as any).rawBody = req.body; // req.body is a string here (from express.text)
    next();
  },
  paymentController.notchpayWebhook.bind(paymentController),
);

// Authenticated routes

/** Client: initiate payment for an accepted package */
router.post(
  '/initiate',
  authenticate,
  requireRole(UserRole.CLIENT),
  paymentController.initiate.bind(paymentController),
);

/** Client: get payment record for a specific package */
router.get(
  '/package/:packageId',
  authenticate,
  requireRole(UserRole.CLIENT, UserRole.FREIGHT_FORWARDER, UserRole.ADMIN),
  paymentController.getForPackage.bind(paymentController),
);

/** Public: lookup payment by Notchpay reference (used by redirect callback page) */
router.get(
  '/reference/:reference',
  paymentController.getByReference.bind(paymentController),
);

export default router;
