import { Request, Response, NextFunction } from 'express';
import { paymentService } from './payment.service';
import { AppError } from '../../middlewares/errorHandler';

export class PaymentController {

  /** POST /payments/initiate — client initiates payment */
  async initiate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientId   = (req as any).user.userId as number;
      const packageId  = parseInt(req.body.package_id, 10);
      const currency   = (req.body.currency as string)?.toUpperCase();

      if (!packageId || isNaN(packageId)) {
        throw new AppError(400, 'package_id is required');
      }
      if (!currency) {
        throw new AppError(400, 'currency is required (e.g. EUR, XAF)');
      }

      const result = await paymentService.initiatePayment(clientId, packageId, currency);
      res.json({ status: 'ok', data: result });
    } catch (err) {
      next(err);
    }
  }

  /** GET /payments/package/:packageId — get payment info for a package */
  async getForPackage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientId  = (req as any).user.userId as number;
      const packageId = parseInt(req.params['packageId'] as string, 10);
      const payment   = await paymentService.getPaymentForPackage(clientId, packageId);
      res.json({ status: 'ok', data: payment });
    } catch (err) {
      next(err);
    }
  }

  /** GET /payments/reference/:reference — lookup by Notchpay reference (public) */
  async getByReference(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reference = req.params['reference'] as string;
      const payment   = await paymentService.getByReference(reference);
      res.json({ status: 'ok', data: payment });
    } catch (err) {
      next(err);
    }
  }

  /** POST /payments/webhooks/stripe — Stripe webhook (no auth) */
  async stripeWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sigHeader = req.headers['stripe-signature'];
      const signature = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader;
      if (!signature) {
        throw new AppError(400, 'Missing Stripe-Signature header');
      }
      // rawBody is attached by the express.raw() middleware on this route
      const rawBody = (req as any).rawBody as Buffer | undefined;
      if (!rawBody) {
        throw new AppError(400, 'Raw body unavailable — check middleware configuration');
      }
      await paymentService.handleStripeWebhook(rawBody, signature);
      res.json({ received: true });
    } catch (err) {
      next(err);
    }
  }

  /** POST /payments/webhooks/notchpay — Notchpay webhook (no auth) */
  async notchpayWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['x-notch-signature'] as string | undefined;
      if (!signature) {
        throw new AppError(400, 'Missing X-Notch-Signature header');
      }
      const rawBody = (req as any).rawBody as string | undefined;
      if (!rawBody) {
        throw new AppError(400, 'Raw body unavailable — check middleware configuration');
      }
      await paymentService.handleNotchpayWebhook(rawBody, signature);
      res.json({ received: true });
    } catch (err) {
      next(err);
    }
  }
}

export const paymentController = new PaymentController();
