import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface NotificationAttributes {
  notification_id: number;
  user_id: number;
  title: string;
  content: string;
  is_read: boolean;
  creation_date: Date;
  scheduled_date: Date | null;
  future_content: string | null;
  pdf_file: string | null;
}

export interface NotificationCreationAttributes
  extends Optional<
    NotificationAttributes,
    'notification_id' | 'is_read' | 'creation_date' | 'scheduled_date' | 'future_content' | 'pdf_file'
  > {}

export class Notification extends Model<NotificationAttributes, NotificationCreationAttributes> {
  declare notification_id: number;
  declare user_id: number;
  declare title: string;
  declare content: string;
  declare is_read: boolean;
  declare creation_date: Date;
  declare scheduled_date: Date | null;
  declare future_content: string | null;
  declare pdf_file: string | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof Notification {
    Notification.init(
      {
        notification_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        user_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: 'user', key: 'user_id' },
        },
        title: {
          type: DataTypes.STRING(200),
          allowNull: false,
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        is_read: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        creation_date: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        scheduled_date: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        future_content: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        pdf_file: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'notification',
      },
    );
    return Notification;
  }
}
