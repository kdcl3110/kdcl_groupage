import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { requireRole } from '../../middlewares/requireRole';
import { UserRole } from '../../models/User.model';
import { uploadPackageImages } from '../../middlewares/upload';
import * as PackageController from './package.controller';

const router = Router();

const adminOrFF = requireRole(UserRole.ADMIN, UserRole.FREIGHT_FORWARDER);

/**
 * @openapi
 * /packages:
 *   post:
 *     tags: [Colis]
 *     summary: Créer un colis (avec upload d'images)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [recipient_id, description, weight, volume, declared_value, image1]
 *             properties:
 *               recipient_id:         { type: integer }
 *               description:          { type: string }
 *               weight:               { type: number }
 *               volume:               { type: number }
 *               declared_value:       { type: number }
 *               fragility:            { $ref: '#/components/schemas/FragilityLevel' }
 *               special_instructions: { type: string }
 *               travel_id:            { type: integer, description: 'Soumettre directement à un voyage' }
 *               image1:               { type: string, format: binary }
 *               image2:               { type: string, format: binary }
 *               image3:               { type: string, format: binary }
 *               image4:               { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Colis créé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:   { $ref: '#/components/schemas/Package' }
 */
router.post('/', authenticate, uploadPackageImages, PackageController.createPackage);

/**
 * @openapi
 * /packages:
 *   get:
 *     tags: [Colis]
 *     summary: Liste des colis de l'utilisateur connecté
 *     parameters:
 *       - in: query
 *         name: travel_id
 *         schema: { type: integer }
 *         description: Filtrer par voyage
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Liste des colis
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
router.get('/', authenticate, PackageController.getMyPackages);

/**
 * @openapi
 * /packages/{id}:
 *   get:
 *     tags: [Colis]
 *     summary: Détail d'un colis
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Détail du colis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:   { $ref: '#/components/schemas/Package' }
 *       404:
 *         description: Colis introuvable
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *   put:
 *     tags: [Colis]
 *     summary: Modifier un colis
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               description:          { type: string }
 *               weight:               { type: number }
 *               volume:               { type: number }
 *               declared_value:       { type: number }
 *               fragility:            { $ref: '#/components/schemas/FragilityLevel' }
 *               special_instructions: { type: string }
 *               recipient_id:         { type: integer }
 *               image1:               { type: string, format: binary }
 *               image2:               { type: string, format: binary }
 *               image3:               { type: string, format: binary }
 *               image4:               { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Colis modifié
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:   { $ref: '#/components/schemas/Package' }
 *   delete:
 *     tags: [Colis]
 *     summary: Supprimer un colis
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Colis supprimé
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 */
router.get('/:id',    authenticate, PackageController.getPackageById);
router.put('/:id',    authenticate, uploadPackageImages, PackageController.updatePackage);
router.delete('/:id', authenticate, PackageController.deletePackage);

/**
 * @openapi
 * /packages/{id}/cancel:
 *   patch:
 *     tags: [Colis]
 *     summary: Annuler un colis
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Colis annulé
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 */
router.patch('/:id/cancel', authenticate, PackageController.cancelPackage);

/**
 * @openapi
 * /packages/{id}/submit:
 *   patch:
 *     tags: [Colis]
 *     summary: Soumettre un colis à un voyage (passe en awaiting_payment)
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
 *             required: [travel_id]
 *             properties:
 *               travel_id: { type: integer }
 *     responses:
 *       200:
 *         description: Colis soumis au voyage
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 */
router.patch('/:id/submit', authenticate, PackageController.submitToTravel);

/**
 * @openapi
 * /packages/{id}/manager-detail:
 *   get:
 *     tags: [Colis — Admin]
 *     summary: Détail complet d'un colis pour le gestionnaire
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Détail enrichi avec client, destinataire et paiement
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:   { $ref: '#/components/schemas/Package' }
 */
router.get('/:id/manager-detail', authenticate, adminOrFF, PackageController.getPackageForManager);

/**
 * @openapi
 * /packages/{id}/validate:
 *   patch:
 *     tags: [Colis — Admin]
 *     summary: Valider un colis soumis (passe en awaiting_payment)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Colis validé, notification envoyée au client
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 */
router.patch('/:id/validate', authenticate, adminOrFF, PackageController.validatePackage);

/**
 * @openapi
 * /packages/{id}/reject:
 *   patch:
 *     tags: [Colis — Admin]
 *     summary: Rejeter un colis
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string, description: 'Motif du rejet (optionnel)' }
 *     responses:
 *       200:
 *         description: Colis rejeté
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 */
router.patch('/:id/reject', authenticate, adminOrFF, PackageController.rejectPackage);

/**
 * @openapi
 * /packages/{id}/reassign:
 *   patch:
 *     tags: [Colis — Admin]
 *     summary: Réaffecter un colis vers un autre voyage
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
 *             required: [travel_id]
 *             properties:
 *               travel_id: { type: integer, nullable: true, description: 'null = retirer du voyage (repasse en pending)' }
 *     responses:
 *       200:
 *         description: Colis réaffecté
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 */
router.patch('/:id/reassign', authenticate, adminOrFF, PackageController.adminReassign);

/**
 * @openapi
 * /packages/{id}/status:
 *   patch:
 *     tags: [Colis — Admin]
 *     summary: Mettre à jour le statut d'un colis (admin / groupeur)
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
 *               status: { $ref: '#/components/schemas/PackageStatus' }
 *     responses:
 *       200:
 *         description: Statut mis à jour
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 */
router.patch('/:id/status', authenticate, adminOrFF, PackageController.updatePackageStatus);

export default router;
