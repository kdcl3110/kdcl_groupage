import { Report, ReportTargetType, ReportReason } from '../../models/Report.model';
import { AppError } from '../../middlewares/errorHandler';
import type { CreateReportDto } from './report.dto';

export class ReportService {
  async create(reporterId: number, data: CreateReportDto): Promise<Report> {
    if (!Object.values(ReportTargetType).includes(data.target_type)) {
      throw new AppError(400, 'Invalid target_type');
    }
    if (!Object.values(ReportReason).includes(data.reason)) {
      throw new AppError(400, 'Invalid reason');
    }
    if (!data.target_id) {
      throw new AppError(400, 'target_id is required');
    }

    const existing = await Report.findOne({
      where: {
        reporter_id: reporterId,
        target_type: data.target_type,
        target_id:   data.target_id,
      },
    });
    if (existing) throw new AppError(409, 'Vous avez déjà signalé cet élément');

    const report = await Report.create({
      reporter_id: reporterId,
      target_type: data.target_type,
      target_id:   data.target_id,
      reason:      data.reason,
      description: data.description ?? null,
    });

    return report;
  }
}
