import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { requireRole } from '../../middlewares/requireRole';
import { UserRole } from '../../models/User.model';
import { uploadPackageImages } from '../../middlewares/upload';
import * as PackageController from './package.controller';

const router = Router();

const adminOrFF = requireRole(UserRole.ADMIN, UserRole.FREIGHT_FORWARDER);

// Routes client
router.post('/',               authenticate, uploadPackageImages, PackageController.createPackage);
router.get('/',                authenticate, PackageController.getMyPackages);
router.get('/:id',             authenticate, PackageController.getPackageById);
router.put('/:id',             authenticate, uploadPackageImages, PackageController.updatePackage);
router.delete('/:id',          authenticate, PackageController.deletePackage);
router.patch('/:id/cancel',    authenticate, PackageController.cancelPackage);
router.patch('/:id/submit',    authenticate, PackageController.submitToTravel);

// Routes admin/freight_forwarder
router.get('/:id/manager-detail', authenticate, adminOrFF, PackageController.getPackageForManager);
router.patch('/:id/validate',     authenticate, adminOrFF, PackageController.validatePackage);
router.patch('/:id/reject',       authenticate, adminOrFF, PackageController.rejectPackage);
router.patch('/:id/reassign',     authenticate, adminOrFF, PackageController.adminReassign);
router.patch('/:id/status',       authenticate, adminOrFF, PackageController.updatePackageStatus);

export default router;
