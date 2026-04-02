import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { requireRole } from '../../middlewares/requireRole';
import { UserRole } from '../../models/User.model';
import * as CountryController from './country.controller';

const router = Router();

const adminOnly = requireRole(UserRole.ADMIN);

// Lecture : tout utilisateur connecté
router.get('/', authenticate, CountryController.getAllCountries);

// Écriture : admin uniquement
router.post('/',    authenticate, adminOnly, CountryController.createCountry);
router.put('/:id',  authenticate, adminOnly, CountryController.updateCountry);
router.delete('/:id', authenticate, adminOnly, CountryController.deleteCountry);

export default router;
