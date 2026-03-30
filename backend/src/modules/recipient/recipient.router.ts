import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import * as RecipientController from './recipient.controller';

const router = Router();

router.use(authenticate);

router.post('/',     RecipientController.createRecipient);
router.get('/',      RecipientController.getMyRecipients);
router.get('/:id',   RecipientController.getRecipientById);
router.put('/:id',   RecipientController.updateRecipient);
router.delete('/:id', RecipientController.deleteRecipient);

export default router;
