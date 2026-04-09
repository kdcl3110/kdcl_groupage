import { Router, Request, Response, NextFunction } from 'express';
import { currencyService } from '../../services/currency.service';

const router = Router();

/** GET /currencies — list all supported currencies (public) */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const currencies = await currencyService.getAll();
    res.json({ status: 'ok', data: currencies });
  } catch (err) {
    next(err);
  }
});

export default router;
