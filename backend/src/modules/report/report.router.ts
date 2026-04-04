import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { createReport } from './report.controller';

const router = Router();

router.post('/', authenticate, createReport);

export default router;
