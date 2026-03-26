import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  CARD = 'card',
  MOBILE_MONEY = 'mobile_money',
}

export interface PaymentAttributes {
  payment_id: number;
  client_id: number;
  package_id: number;
  amount: number;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  transfer_reference: string | null;
  payment_date: Date | null;
}

export interface PaymentCreationAttributes
  extends Optional<PaymentAttributes, 'payment_id' | 'transfer_reference' | 'payment_date'> {}

export class Payment extends Model<PaymentAttributes, PaymentCreationAttributes> {
  declare payment_id: number;
  declare client_id: number;
  declare package_id: number;
  declare amount: number;
  declare status: PaymentStatus;
  declare payment_method: PaymentMethod;
  declare transfer_reference: string | null;
  declare payment_date: Date | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof Payment {
    Payment.init(
      {
        payment_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        client_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: 'user', key: 'user_id' },
        },
        package_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: 'package', key: 'package_id' },
        },
        amount: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM(...Object.values(PaymentStatus)),
          allowNull: false,
          defaultValue: PaymentStatus.PENDING,
        },
        payment_method: {
          type: DataTypes.ENUM(...Object.values(PaymentMethod)),
          allowNull: false,
        },
        transfer_reference: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        payment_date: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'payment',
      },
    );
    return Payment;
  }
}
