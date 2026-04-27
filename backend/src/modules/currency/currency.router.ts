import { Router, Request, Response, NextFunction } from 'express';
import { currencyService } from '../../services/currency.service';

const router = Router();

/**
 * @openapi
 * /currencies:
 *   get:
 *     tags: [Devises]
 *     summary: Liste de toutes les devises supportées avec leur taux USD (public)
 *     security: []
 *     responses:
 *       200:
 *         description: Liste des devises
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:   { type: array, items: { $ref: '#/components/schemas/Currency' } }
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const currencies = await currencyService.getAll();
    res.json({ status: 'ok', data: currencies });
  } catch (err) {
    next(err);
  }
});

export default router;
