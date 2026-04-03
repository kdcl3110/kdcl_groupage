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
      fragility: req.body.fragility || undefined,
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
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const b = req.body;

    const dto: import('./package.dto').UpdatePackageDto = {};
    if (b.description     !== undefined) dto.description     = b.description;
    if (b.weight          !== undefined) dto.weight          = parseFloat(b.weight);
    if (b.volume          !== undefined) dto.volume          = parseFloat(b.volume);
    if (b.declared_value  !== undefined) dto.declared_value  = parseFloat(b.declared_value);
    if (b.fragility       !== undefined) dto.fragility       = b.fragility;
    if (b.recipient_id    !== undefined) dto.recipient_id    = Number(b.recipient_id);
    if ('special_instructions' in b)     dto.special_instructions = b.special_instructions || null;

    const img1 = extractFilePath(files, 'image1');
    const img2 = extractFilePath(files, 'image2');
    const img3 = extractFilePath(files, 'image3');
    const img4 = extractFilePath(files, 'image4');

    if (img1)                               dto.image1 = img1;
    if (img2)                               dto.image2 = img2;
    else if (b.remove_image2 === 'true')    dto.image2 = null;
    if (img3)                               dto.image3 = img3;
    else if (b.remove_image3 === 'true')    dto.image3 = null;
    if (img4)                               dto.image4 = img4;
    else if (b.remove_image4 === 'true')    dto.image4 = null;

    const pkg = await service.update(Number(req.params.id), req.user!.user_id, dto);
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
    const caller     = { userId: req.user!.user_id, role: req.user!.role };
    const filters    = { travel_id: req.query.travel_id ? Number(req.query.travel_id) : undefined };
    const limit      = req.query.limit  ? Math.min(Number(req.query.limit),  200) : 10;
    const offset     = req.query.offset ? Number(req.query.offset) : 0;
    const result     = await service.getPackages(caller, filters, { limit, offset });
    res.status(200).json(result);
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

export async function getPackageForManager(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const caller = { userId: req.user!.user_id, role: req.user!.role };
    const pkg = await service.getByIdForManager(Number(req.params.id), caller);
    res.status(200).json(pkg);
  } catch (error) {
    next(error);
  }
}

export async function validatePackage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.validatePackage(Number(req.params.id));
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function rejectPackage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const caller = { userId: req.user!.user_id, role: req.user!.role };
    const pkg = await service.rejectPackage(Number(req.params.id), caller);
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
