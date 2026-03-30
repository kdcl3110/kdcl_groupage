import { Response, NextFunction } from 'express';
import { TravelService } from './travel.service';
import type { AuthRequest } from '../../middlewares/authenticate';

const service = new TravelService();

export async function createTravel(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const travel = await service.create(req.user!.user_id, req.body);
    res.status(201).json(travel);
  } catch (error) {
    next(error);
  }
}

export async function getAllTravels(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, transport_type, origin_country, destination_country } = req.query as Record<string, string>;
    const caller = { userId: req.user!.user_id, role: req.user!.role };
    const travels = await service.getAll(caller, { status, transport_type, origin_country, destination_country });
    res.status(200).json(travels);
  } catch (error) {
    next(error);
  }
}

export async function getTravelById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const caller = { userId: req.user!.user_id, role: req.user!.role };
    const travel = await service.getById(Number(req.params.id), caller);
    res.status(200).json(travel);
  } catch (error) {
    next(error);
  }
}

export async function updateTravel(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const caller = { userId: req.user!.user_id, role: req.user!.role };
    const travel = await service.update(Number(req.params.id), caller, req.body);
    res.status(200).json(travel);
  } catch (error) {
    next(error);
  }
}

export async function updateTravelStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const caller = { userId: req.user!.user_id, role: req.user!.role };
    const travel = await service.updateStatus(Number(req.params.id), caller, req.body);
    res.status(200).json(travel);
  } catch (error) {
    next(error);
  }
}
