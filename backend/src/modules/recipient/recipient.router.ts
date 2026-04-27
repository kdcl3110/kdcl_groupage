import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import * as RecipientController from './recipient.controller';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /recipients:
 *   post:
 *     tags: [Destinataires]
 *     summary: Créer un destinataire
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [first_name, last_name, phone, address, city, country]
 *             properties:
 *               first_name: { type: string }
 *               last_name:  { type: string }
 *               phone:      { type: string }
 *               address:    { type: string }
 *               city:       { type: string }
 *               country:    { type: string }
 *               email:      { type: string, format: email }
 *     responses:
 *       201:
 *         description: Destinataire créé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:   { $ref: '#/components/schemas/Recipient' }
 *   get:
 *     tags: [Destinataires]
 *     summary: Liste des destinataires de l'utilisateur connecté
 *     responses:
 *       200:
 *         description: Liste des destinataires
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:   { type: array, items: { $ref: '#/components/schemas/Recipient' } }
 */
router.post('/', RecipientController.createRecipient);
router.get('/',  RecipientController.getMyRecipients);

/**
 * @openapi
 * /recipients/{id}:
 *   get:
 *     tags: [Destinataires]
 *     summary: Détail d'un destinataire
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Destinataire
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:   { $ref: '#/components/schemas/Recipient' }
 *   put:
 *     tags: [Destinataires]
 *     summary: Modifier un destinataire
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
 *               first_name: { type: string }
 *               last_name:  { type: string }
 *               phone:      { type: string }
 *               address:    { type: string }
 *               city:       { type: string }
 *               country:    { type: string }
 *               email:      { type: string, format: email }
 *     responses:
 *       200:
 *         description: Destinataire modifié
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *   delete:
 *     tags: [Destinataires]
 *     summary: Supprimer un destinataire
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Destinataire supprimé
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 */
router.get('/:id',    RecipientController.getRecipientById);
router.put('/:id',    RecipientController.updateRecipient);
router.delete('/:id', RecipientController.deleteRecipient);

export default router;
