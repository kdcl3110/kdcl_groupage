import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import * as NotificationController from './notification.controller';

const router = Router();

/**
 * @openapi
 * /notifications/stream:
 *   get:
 *     tags: [Notifications]
 *     summary: Flux SSE de notifications en temps réel
 *     description: >
 *       Connexion Server-Sent Events (SSE). Le token JWT peut être passé en query param
 *       `?token=xxx` car EventSource ne supporte pas les headers personnalisés.
 *     parameters:
 *       - in: query
 *         name: token
 *         schema: { type: string }
 *         description: JWT (alternative au header Authorization pour SSE)
 *     responses:
 *       200:
 *         description: Flux d'événements SSE
 *         content:
 *           text/event-stream:
 *             schema: { type: string }
 */
router.get('/stream', authenticate, NotificationController.streamNotifications);

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Liste des notifications de l'utilisateur connecté
 *     responses:
 *       200:
 *         description: Liste des notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:   { type: array, items: { $ref: '#/components/schemas/Notification' } }
 */
router.get('/', authenticate, NotificationController.getNotifications);

/**
 * @openapi
 * /notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Marquer toutes les notifications comme lues
 *     responses:
 *       200:
 *         description: Toutes les notifications marquées comme lues
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 */
router.patch('/read-all', authenticate, NotificationController.markAllRead);

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Marquer une notification comme lue
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Notification marquée comme lue
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 */
router.patch('/:id/read', authenticate, NotificationController.markRead);

export default router;
