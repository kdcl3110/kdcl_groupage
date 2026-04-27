import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { requireRole } from '../../middlewares/requireRole';
import { UserRole } from '../../models/User.model';
import * as CountryController from './country.controller';

const router = Router();

const adminOnly = requireRole(UserRole.ADMIN);

/**
 * @openapi
 * /countries:
 *   get:
 *     tags: [Pays]
 *     summary: Liste de tous les pays actifs
 *     responses:
 *       200:
 *         description: Liste des pays
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:   { type: array, items: { $ref: '#/components/schemas/Country' } }
 *   post:
 *     tags: [Pays]
 *     summary: Créer un pays (admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: Cameroun }
 *     responses:
 *       201:
 *         description: Pays créé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:   { $ref: '#/components/schemas/Country' }
 */
router.get('/',  authenticate, CountryController.getAllCountries);
router.post('/', authenticate, adminOnly, CountryController.createCountry);

/**
 * @openapi
 * /countries/{id}:
 *   put:
 *     tags: [Pays]
 *     summary: Modifier un pays (admin)
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
 *               name:      { type: string }
 *               is_active: { type: boolean }
 *     responses:
 *       200:
 *         description: Pays mis à jour
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *   delete:
 *     tags: [Pays]
 *     summary: Supprimer un pays (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Pays supprimé
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 */
router.put('/:id',    authenticate, adminOnly, CountryController.updateCountry);
router.delete('/:id', authenticate, adminOnly, CountryController.deleteCountry);

export default router;
