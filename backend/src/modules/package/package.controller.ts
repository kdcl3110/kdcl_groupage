import { Response, NextFunction } from 'express';
import { PackageService } from './package.service';
import type { AuthRequest } from '../../middlewares/authenticate';

const service = new PackageService();

function extractFilePath(files: { [f: string]: Express.Multer.File[] } | undefined, field: string): string | undefined {
  const f = files?.[field]?.[0];
  return f ? `/uploads/packages/${f.filename}` : undefined;
}

export async function createPackage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const body = {
      recipient_id: Number(req.body.recipient_id),
      description: req.body.description,
      weight: parseFloat(req.body.weight),
      volume: parseFloat(req.body.volume),
      declared_value: parseFloat(req.body.declared_value),
      special_instructions: req.body.special_instructions || undefined,
      travel_id: req.body.travel_id ? Number(req.body.travel_id) : undefined,
      image1: extractFilePath(files, 'image1')!,
      image2: extractFilePath(files, 'image2'),
      image3: extractFilePath(files, 'image3'),
      image4: extractFilePath(files, 'image4'),
    };
    const result = await service.create(req.user!.user_id, body);
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
