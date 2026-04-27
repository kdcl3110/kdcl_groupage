import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { requireRole } from '../../middlewares/requireRole';
import { UserRole } from '../../models/User.model';
import * as TravelController from './travel.controller';
import * as ForumController from '../forum/forum.controller';

const router = Router();

const adminOrFF = requireRole(UserRole.ADMIN, UserRole.FREIGHT_FORWARDER);

/**
 * @openapi
 * /travels:
 *   get:
 *     tags: [Voyages]
 *     summary: Liste des voyages avec filtres et pagination
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { $ref: '#/components/schemas/TravelStatus' }
 *       - in: query
 *         name: transport_type
 *         schema: { $ref: '#/components/schemas/TransportType' }
 *       - in: query
 *         name: origin_country_id
 *         schema: { type: integer }
 *       - in: query
 *         name: destination_country_id
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Liste des voyages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:   { type: integer }
 *                     travels:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Travel' }
 */
router.get('/', authenticate, TravelController.getAllTravels);

/**
 * @openapi
 * /travels/{id}:
 *   get:
 *     tags: [Voyages]
 *     summary: Détail d'un voyage
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Détail du voyage avec charge actuelle
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:   { $ref: '#/components/schemas/Travel' }
 *       404:
 *         description: Voyage introuvable
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/:id', authenticate, TravelController.getTravelById);

/**
 * @openapi
 * /travels:
 *   post:
 *     tags: [Voyages]
 *     summary: Créer un voyage (admin ou groupeur)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [transport_type, origin_country_id, destination_country_id, max_weight, max_volume, min_load_percentage, max_load_percentage]
 *             properties:
 *               transport_type:         { $ref: '#/components/schemas/TransportType' }
 *               origin_country_id:      { type: integer }
 *               destination_country_id: { type: integer }
 *               itinerary:              { type: string, example: 'Bruxelles → Douala' }
 *               max_weight:             { type: number, example: 1000 }
 *               max_volume:             { type: number, example: 20 }
 *               min_load_percentage:    { type: integer, example: 50 }
 *               max_load_percentage:    { type: integer, example: 100 }
 *               price_per_unit:         { type: number, example: 3.5 }
 *               container:              { type: string }
 *               departure_date:         { type: string, format: date }
 *               estimated_arrival_date: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Voyage créé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:   { $ref: '#/components/schemas/Travel' }
 */
router.post('/', authenticate, adminOrFF, TravelController.createTravel);

/**
 * @openapi
 * /travels/{id}:
 *   put:
 *     tags: [Voyages]
 *     summary: Modifier un voyage (admin ou groupeur)
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
 *               transport_type:         { $ref: '#/components/schemas/TransportType' }
 *               origin_country_id:      { type: integer }
 *               destination_country_id: { type: integer }
 *               itinerary:              { type: string }
 *               container:              { type: string }
 *               max_weight:             { type: number }
 *               max_volume:             { type: number }
 *               price_per_unit:         { type: number }
 *               departure_date:         { type: string, format: date }
 *               estimated_arrival_date: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Voyage mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:   { $ref: '#/components/schemas/Travel' }
 */
router.put('/:id', authenticate, adminOrFF, TravelController.updateTravel);

/**
 * @openapi
 * /travels/{id}/status:
 *   put:
 *     tags: [Voyages]
 *     summary: Changer le statut d'un voyage
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
 *             required: [status]
 *             properties:
 *               status:          { $ref: '#/components/schemas/TravelStatus' }
 *               target_travel_id: { type: integer, description: 'Requis si annulation avec des colis en voyage' }
 *     responses:
 *       200:
 *         description: Statut mis à jour
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       400:
 *         description: Transition de statut invalide
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.put('/:id/status', authenticate, adminOrFF, TravelController.updateTravelStatus);

/**
 * @openapi
 * /travels/{id}/forum/unread:
 *   get:
 *     tags: [Forum]
 *     summary: Nombre de messages non lus dans le forum du voyage
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Compteur de messages non lus
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string }
 *                 unread_count: { type: integer }
 */
router.get('/:id/forum/unread', authenticate, ForumController.getForumUnreadCount);

/**
 * @openapi
 * /travels/{id}/forum:
 *   get:
 *     tags: [Forum]
 *     summary: Messages du forum d'un voyage
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Liste des messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:   { type: string }
 *                 messages: { type: array, items: { type: object } }
 *   post:
 *     tags: [Forum]
 *     summary: Poster un message dans le forum du voyage (admin ou groupeur)
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
 *             required: [content]
 *             properties:
 *               content:           { type: string }
 *               parent_message_id: { type: integer }
 *     responses:
 *       201:
 *         description: Message posté
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 */
router.get('/:id/forum',  authenticate, ForumController.getForumMessages);
router.post('/:id/forum', authenticate, adminOrFF, ForumController.postForumMessage);

export default router;
