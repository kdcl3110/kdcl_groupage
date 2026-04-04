import { ReportTargetType, ReportReason } from '../../models/Report.model';

export interface CreateReportDto {
  target_type:  ReportTargetType;
  target_id:    number;
  reason:       ReportReason;
  description?: string;
}
