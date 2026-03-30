import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { requireRole } from '../../middlewares/requireRole';
import { UserRole } from '../../models/User.model';
import * as TravelController from './travel.controller';
import * as ForumController from '../forum/forum.controller';

const router = Router();

const adminOrFF = requireRole(UserRole.ADMIN, UserRole.FREIGHT_FORWARDER);

// Lecture : tout utilisateur connecté
router.get('/',    authenticate, TravelController.getAllTravels);
router.get('/:id', authenticate, TravelController.getTravelById);

// Écriture : admin ou freight_forwarder uniquement
router.post('/',          authenticate, adminOrFF, TravelController.createTravel);
router.put('/:id',        authenticate, adminOrFF, TravelController.updateTravel);
router.put('/:id/status', authenticate, adminOrFF, TravelController.updateTravelStatus);

// Forum du voyage
router.get('/:id/forum',  authenticate, ForumController.getForumMessages);
router.post('/:id/forum', authenticate, adminOrFF, ForumController.postForumMessage);

export default router;
