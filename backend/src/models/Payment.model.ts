import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export enum PaymentStatus {
  PENDING  = 'pending',
  PAID     = 'paid',
  FAILED   = 'failed',
  REFUNDED = 'refunded',
  EXPIRED  = 'expired',
}

export enum PaymentProvider {
  STRIPE   = 'stripe',
  NOTCHPAY = 'notchpay',
}

export interface PaymentAttributes {
  payment_id: number;
  package_id: number;
  client_id: number;
  groupeur_id: number;
  travel_id: number;

  // All monetary values stored in USD
  amount_usd: number;               // gross amount the client pays
  platform_commission_rate: number; // e.g. 0.05 (snapshot at time of payment creation)
  platform_commission_usd: number;
  provider_fee_usd: number;         // set when provider is chosen / webhook received
  net_to_groupeur_usd: number;      // amount_usd - commission - provider_fee

  provider: PaymentProvider | null;
  provider_intent_id: string | null;
  receipt_url: string | null;

  status: PaymentStatus;
  deadline_at: Date;    // accepted_at + 48h — after this the payment is expired
  paid_at: Date | null;
}

export interface PaymentCreationAttributes
  extends Optional<
    PaymentAttributes,
    | 'payment_id'
    | 'provider'
    | 'provider_intent_id'
    | 'receipt_url'
    | 'provider_fee_usd'
    | 'paid_at'
  > {}

export class Payment extends Model<PaymentAttributes, PaymentCreationAttributes> {
  declare payment_id: number;
  declare package_id: number;
  declare client_id: number;
  declare groupeur_id: number;
  declare travel_id: number;

  declare amount_usd: number;
  declare platform_commission_rate: number;
  declare platform_commission_usd: number;
  declare provider_fee_usd: number;
  declare net_to_groupeur_usd: number;

  declare provider: PaymentProvider | null;
  declare provider_intent_id: string | null;
  declare receipt_url: string | null;

  declare status: PaymentStatus;
  declare deadline_at: Date;
  declare paid_at: Date | null;

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
        package_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: 'package', key: 'package_id' },
        },
        client_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: 'user', key: 'user_id' },
        },
        groupeur_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: 'user', key: 'user_id' },
        },
        travel_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: 'travel', key: 'travel_id' },
        },
        amount_usd: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
          comment: 'Gross amount charged to the client, in USD',
        },
        platform_commission_rate: {
          type: DataTypes.DECIMAL(5, 4),
          allowNull: false,
          comment: 'Commission rate snapshot (e.g. 0.0500 = 5%)',
        },
        platform_commission_usd: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
        },
        provider_fee_usd: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
          comment: 'Fee charged by the payment provider (Stripe / Notchpay)',
        },
        net_to_groupeur_usd: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
          comment: 'amount_usd - platform_commission_usd - provider_fee_usd',
        },
        provider: {
          type: DataTypes.ENUM(...Object.values(PaymentProvider)),
          allowNull: true,
        },
        provider_intent_id: {
          type: DataTypes.STRING(200),
          allowNull: true,
        },
        receipt_url: {
          type: DataTypes.STRING(512),
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM(...Object.values(PaymentStatus)),
          allowNull: false,
          defaultValue: PaymentStatus.PENDING,
        },
        deadline_at: {
          type: DataTypes.DATE,
          allowNull: false,
          comment: 'Client must pay before this timestamp (accepted_at + 48h)',
        },
        paid_at: {
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
