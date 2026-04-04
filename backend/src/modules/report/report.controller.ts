import { Response, NextFunction } from 'express';
import { ReportService } from './report.service';
import type { AuthRequest } from '../../middlewares/authenticate';
import type { CreateReportDto } from './report.dto';

const service = new ReportService();

export async function createReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const report = await service.create(req.user!.user_id, req.body as CreateReportDto);
    res.status(201).json(report);
  } catch (error) {
    next(error);
  }
}
