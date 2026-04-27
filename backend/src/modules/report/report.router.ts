import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { createReport } from './report.controller';

const router = Router();

/**
 * @openapi
 * /reports:
 *   post:
 *     tags: [Signalements]
 *     summary: Signaler un utilisateur ou un voyage
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [target_type, target_id, reason]
 *             properties:
 *               target_type:  { $ref: '#/components/schemas/ReportTargetType' }
 *               target_id:    { type: integer }
 *               reason:       { $ref: '#/components/schemas/ReportReason' }
 *               description:  { type: string }
 *     responses:
 *       201:
 *         description: Signalement créé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:   { $ref: '#/components/schemas/Report' }
 *       409:
 *         description: Vous avez déjà signalé cette cible
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/', authenticate, createReport);

export default router;
