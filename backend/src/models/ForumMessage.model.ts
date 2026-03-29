import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export enum ForumMessageType {
  SYSTEM = 'system', // généré automatiquement par l'application
  USER = 'user',     // rédigé par un humain (groupeur / admin)
}

export interface ForumMessageAttributes {
  message_id: number;
  travel_id: number;
  author_id: number | null;  // null pour les messages système
  message_type: ForumMessageType;
  parent_message_id: number | null;
  content: string;
  creation_date: Date;
}

export interface ForumMessageCreationAttributes
  extends Optional<
    ForumMessageAttributes,
    'message_id' | 'author_id' | 'parent_message_id' | 'creation_date'
  > {}

export class ForumMessage extends Model<ForumMessageAttributes, ForumMessageCreationAttributes> {
  declare message_id: number;
  declare travel_id: number;
  declare author_id: number | null;
  declare message_type: ForumMessageType;
  declare parent_message_id: number | null;
  declare content: string;
  declare creation_date: Date;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof ForumMessage {
    ForumMessage.init(
      {
        message_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        travel_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: 'travel', key: 'travel_id' },
        },
        author_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: true,
          references: { model: 'user', key: 'user_id' },
        },
        message_type: {
          type: DataTypes.ENUM(...Object.values(ForumMessageType)),
          allowNull: false,
          defaultValue: ForumMessageType.USER,
        },
        parent_message_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: true,
          references: { model: 'forum_message', key: 'message_id' },
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        creation_date: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: 'forum_message',
      },
    );
    return ForumMessage;
  }
}

// Table de jonction conservée pour d'éventuelles lectures/réactions futures
export interface UserForumMessageAttributes {
  user_id: number;
  message_id: number;
  content: string;
  date: Date;
}

export interface UserForumMessageCreationAttributes
  extends Optional<UserForumMessageAttributes, 'date'> {}

export class UserForumMessage extends Model<UserForumMessageAttributes, UserForumMessageCreationAttributes> {
  declare user_id: number;
  declare message_id: number;
  declare content: string;
  declare date: Date;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof UserForumMessage {
    UserForumMessage.init(
      {
        user_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          primaryKey: true,
          references: { model: 'user', key: 'user_id' },
        },
        message_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          primaryKey: true,
          references: { model: 'forum_message', key: 'message_id' },
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        date: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: 'user_forum_message',
      },
    );
    return UserForumMessage;
  }
}
