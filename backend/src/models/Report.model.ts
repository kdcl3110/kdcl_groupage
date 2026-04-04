import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export enum ReportTargetType {
  USER   = 'user',
  TRAVEL = 'travel',
}

export enum ReportReason {
  FALSE_INFO    = 'false_info',
  FRAUD         = 'fraud',
  INAPPROPRIATE = 'inappropriate',
  SPAM          = 'spam',
  OTHER         = 'other',
}

export enum ReportStatus {
  PENDING   = 'pending',
  REVIEWED  = 'reviewed',
  DISMISSED = 'dismissed',
}

export interface ReportAttributes {
  report_id:     number;
  reporter_id:   number;
  target_type:   ReportTargetType;
  target_id:     number;
  reason:        ReportReason;
  description:   string | null;
  status:        ReportStatus;
  creation_date: Date;
}

export interface ReportCreationAttributes
  extends Optional<ReportAttributes, 'report_id' | 'description' | 'status' | 'creation_date'> {}

export class Report extends Model<ReportAttributes, ReportCreationAttributes> {
  declare report_id:     number;
  declare reporter_id:   number;
  declare target_type:   ReportTargetType;
  declare target_id:     number;
  declare reason:        ReportReason;
  declare description:   string | null;
  declare status:        ReportStatus;
  declare creation_date: Date;

  static initModel(sequelize: Sequelize): typeof Report {
    Report.init(
      {
        report_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        reporter_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: 'user', key: 'user_id' },
        },
        target_type: {
          type: DataTypes.ENUM(...Object.values(ReportTargetType)),
          allowNull: false,
        },
        target_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
        },
        reason: {
          type: DataTypes.ENUM(...Object.values(ReportReason)),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM(...Object.values(ReportStatus)),
          allowNull: false,
          defaultValue: ReportStatus.PENDING,
        },
        creation_date: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: 'report',
        indexes: [
          { unique: true, fields: ['reporter_id', 'target_type', 'target_id'] },
        ],
      },
    );
    return Report;
  }
}
