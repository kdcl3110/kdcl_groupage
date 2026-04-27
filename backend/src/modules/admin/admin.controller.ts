import { Response, NextFunction } from 'express';
import type { AuthRequest } from '../../middlewares/authenticate';
import { adminService } from './admin.service';
import { UserRole, UserStatus } from '../../models/User.model';
import { PackageStatus } from '../../models/Package.model';

function parsePagination(limit?: string, offset?: string) {
  return {
    limit:  Math.min(parseInt(limit  ?? '20', 10), 100),
    offset: parseInt(offset ?? '0', 10),
  };
}

export async function getStats(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.getStats();
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function listUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { search, role, status, limit, offset } = req.query as Record<string, string>;
    const data = await adminService.listUsers({
      search,
      role:   role   as UserRole   | undefined,
      status: status as UserStatus | undefined,
      ...parsePagination(limit, offset),
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getUserById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.getUserById(parseInt(req.params['id'] as string, 10));
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function updateUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.updateUser(parseInt(req.params['id'] as string, 10), req.body);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function listPackages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, travel_id, client_id, search, limit, offset } = req.query as Record<string, string>;
    const data = await adminService.listPackages({
      status:    status    as PackageStatus | undefined,
      travel_id: travel_id ? parseInt(travel_id, 10) : undefined,
      client_id: client_id ? parseInt(client_id, 10) : undefined,
      search,
      ...parsePagination(limit, offset),
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}
