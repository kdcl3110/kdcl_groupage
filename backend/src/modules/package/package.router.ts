import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { requireRole } from '../../middlewares/requireRole';
import { UserRole } from '../../models/User.model';
import * as PackageController from './package.controller';

const router = Router();

const adminOrFF = requireRole(UserRole.ADMIN, UserRole.FREIGHT_FORWARDER);

// Routes client
router.post('/',               authenticate, PackageController.createPackage);
router.get('/',                authenticate, PackageController.getMyPackages);
router.get('/:id',             authenticate, PackageController.getPackageById);
router.put('/:id',             authenticate, PackageController.updatePackage);
router.delete('/:id',          authenticate, PackageController.deletePackage);
router.patch('/:id/cancel',    authenticate, PackageController.cancelPackage);
router.patch('/:id/submit',    authenticate, PackageController.submitToTravel);

// Routes admin
router.patch('/:id/reassign',  authenticate, adminOrFF, PackageController.adminReassign);

export default router;
