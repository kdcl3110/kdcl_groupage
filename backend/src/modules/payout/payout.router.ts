import { Router } from 'express';
import { payoutController } from './payout.controller';
import { authenticate } from '../../middlewares/authenticate';
import { requireRole } from '../../middlewares/requireRole';
import { UserRole } from '../../models/User.model';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /payouts:
 *   get:
 *     tags: [Versements]
 *     summary: Liste des versements (groupeur ou admin)
 *     responses:
 *       200:
 *         description: Liste des versements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:   { type: array, items: { $ref: '#/components/schemas/Payout' } }
 */
router.get('/', requireRole(UserRole.FREIGHT_FORWARDER, UserRole.ADMIN), payoutController.getAll.bind(payoutController));

/**
 * @openapi
 * /payouts/{id}:
 *   get:
 *     tags: [Versements]
 *     summary: Détail d'un versement
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Détail du versement
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:   { $ref: '#/components/schemas/Payout' }
 */
router.get('/:id', requireRole(UserRole.FREIGHT_FORWARDER, UserRole.ADMIN), payoutController.getById.bind(payoutController));

/**
 * @openapi
 * /payouts/{id}/retry:
 *   post:
 *     tags: [Versements]
 *     summary: Relancer un versement échoué (admin uniquement)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Versement relancé
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       400:
 *         description: Le versement n'est pas en état d'échec
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/:id/retry', requireRole(UserRole.ADMIN), payoutController.retry.bind(payoutController));

export default router;
