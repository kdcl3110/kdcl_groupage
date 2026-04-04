import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface MessageReadAttributes {
  message_id: number;
  user_id: number;
  read_at: Date;
}

export interface MessageReadCreationAttributes
  extends Optional<MessageReadAttributes, 'read_at'> {}

export class MessageRead extends Model<MessageReadAttributes, MessageReadCreationAttributes> {
  declare message_id: number;
  declare user_id: number;
  declare read_at: Date;

  static initModel(sequelize: Sequelize): typeof MessageRead {
    MessageRead.init(
      {
        message_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          primaryKey: true,
          references: { model: 'forum_message', key: 'message_id' },
        },
        user_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          primaryKey: true,
          references: { model: 'user', key: 'user_id' },
        },
        read_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: 'message_read',
        timestamps: false,
      },
    );
    return MessageRead;
  }
}
