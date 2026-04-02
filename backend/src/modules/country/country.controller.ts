import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../../middlewares/authenticate';
import { CountryService } from './country.service';

const service = new CountryService();

export async function getAllCountries(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const countries = await service.getAll();
    // Country list changes rarely — allow clients to cache for 5 minutes
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.json(countries);
  } catch (err) {
    next(err);
  }
}

export async function createCountry(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const country = await service.create(req.body);
    res.status(201).json(country);
  } catch (err) {
    next(err);
  }
}

export async function updateCountry(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const country = await service.update(Number(req.params.id), req.body);
    res.json(country);
  } catch (err) {
    next(err);
  }
}

export async function deleteCountry(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await service.remove(Number(req.params.id));
    res.json(result);
  } catch (err) {
    next(err);
  }
}
