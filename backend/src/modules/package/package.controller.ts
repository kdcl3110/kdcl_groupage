import { Response, NextFunction } from 'express';
import { PackageService } from './package.service';
import type { AuthRequest } from '../../middlewares/authenticate';

const service = new PackageService();

export async function createPackage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.create(req.user!.user_id, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function submitToTravel(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.submitToTravel(Number(req.params.id), req.user!.user_id, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updatePackage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const pkg = await service.update(Number(req.params.id), req.user!.user_id, req.body);
    res.status(200).json(pkg);
  } catch (error) {
    next(error);
  }
}

export async function cancelPackage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.cancel(Number(req.params.id), req.user!.user_id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function deletePackage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.remove(Number(req.params.id), req.user!.user_id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getMyPackages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const packages = await service.getMyPackages(req.user!.user_id);
    res.status(200).json(packages);
  } catch (error) {
    next(error);
  }
}

export async function getPackageById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const pkg = await service.getById(Number(req.params.id), req.user!.user_id);
    res.status(200).json(pkg);
  } catch (error) {
    next(error);
  }
}

export async function adminReassign(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const pkg = await service.adminReassign(Number(req.params.id), req.body);
    res.status(200).json(pkg);
  } catch (error) {
    next(error);
  }
}
