import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface RecipientAttributes {
  recipient_id: number;
  client_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  email: string | null;
}

export interface RecipientCreationAttributes
  extends Optional<RecipientAttributes, 'recipient_id' | 'email'> {}

export class Recipient extends Model<RecipientAttributes, RecipientCreationAttributes> {
  declare recipient_id: number;
  declare client_id: number;
  declare first_name: string;
  declare last_name: string;
  declare phone: string;
  declare address: string;
  declare city: string;
  declare country: string;
  declare email: string | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof Recipient {
    Recipient.init(
      {
        recipient_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        client_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: 'user', key: 'user_id' },
        },
        first_name: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        last_name: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        phone: {
          type: DataTypes.STRING(20),
          allowNull: false,
        },
        address: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        city: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        country: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        email: {
          type: DataTypes.STRING(150),
          allowNull: true,
          validate: { isEmail: true },
        },
      },
      {
        sequelize,
        tableName: 'recipient',
      },
    );
    return Recipient;
  }
}
