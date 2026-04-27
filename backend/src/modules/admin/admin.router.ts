import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { requireRole } from '../../middlewares/requireRole';
import { UserRole } from '../../models/User.model';
import * as AdminController from './admin.controller';

const router = Router();

router.use(authenticate, requireRole(UserRole.ADMIN));

/**
 * @openapi
 * /admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Statistiques globales de la plateforme
 *     responses:
 *       200:
 *         description: KPIs et répartitions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:   { $ref: '#/components/schemas/AdminStats' }
 */
router.get('/stats', AdminController.getStats);

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Liste de tous les utilisateurs avec filtres
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Recherche par nom ou email
 *       - in: query
 *         name: role
 *         schema: { $ref: '#/components/schemas/UserRole' }
 *       - in: query
 *         name: status
 *         schema: { $ref: '#/components/schemas/UserStatus' }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Liste paginée des utilisateurs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     users: { type: array, items: { $ref: '#/components/schemas/User' } }
 */
router.get('/users', AdminController.listUsers);

/**
 * @openapi
 * /admin/users/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Détail d'un utilisateur (sans données sensibles)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:   { $ref: '#/components/schemas/User' }
 *       404:
 *         description: Utilisateur introuvable
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *   patch:
 *     tags: [Admin]
 *     summary: Modifier le statut ou le rôle d'un utilisateur
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
 *               status: { $ref: '#/components/schemas/UserStatus' }
 *               role:   { $ref: '#/components/schemas/UserRole' }
 *     responses:
 *       200:
 *         description: Utilisateur mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:   { $ref: '#/components/schemas/User' }
 */
router.get('/users/:id',  AdminController.getUserById);
router.patch('/users/:id',  AdminController.updateUser);

/**
 * @openapi
 * /admin/packages:
 *   get:
 *     tags: [Admin]
 *     summary: Liste de tous les colis avec filtres (vue admin)
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Recherche par numéro de suivi ou description
 *       - in: query
 *         name: status
 *         schema: { $ref: '#/components/schemas/PackageStatus' }
 *       - in: query
 *         name: travel_id
 *         schema: { type: integer }
 *       - in: query
 *         name: client_id
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Liste paginée des colis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:    { type: integer }
 *                     packages: { type: array, items: { $ref: '#/components/schemas/Package' } }
 */
router.get('/packages', AdminController.listPackages);

export default router;
