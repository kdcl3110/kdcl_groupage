import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export enum PayoutStatus {
  PENDING    = 'pending',
  PROCESSING = 'processing',
  COMPLETED  = 'completed',
  FAILED     = 'failed',
}

export enum PayoutProvider {
  STRIPE   = 'stripe',
  NOTCHPAY = 'notchpay',
}

export interface PayoutAttributes {
  payout_id: number;
  travel_id: number;
  groupeur_id: number;
  payout_account_id: number | null;
  gross_amount_usd: number;  // sum of net_to_groupeur_usd from all packages in travel
  provider_fee_usd: number;
  net_amount_usd: number;    // gross - provider_fee
  provider: PayoutProvider | null;
  provider_reference: string | null;
  status: PayoutStatus;
  completed_at: Date | null;
}

export interface PayoutCreationAttributes
  extends Optional<
    PayoutAttributes,
    | 'payout_id'
    | 'payout_account_id'
    | 'provider'
    | 'provider_reference'
    | 'completed_at'
  > {}

export class Payout extends Model<PayoutAttributes, PayoutCreationAttributes> {
  declare payout_id: number;
  declare travel_id: number;
  declare groupeur_id: number;
  declare payout_account_id: number | null;
  declare gross_amount_usd: number;
  declare provider_fee_usd: number;
  declare net_amount_usd: number;
  declare provider: PayoutProvider | null;
  declare provider_reference: string | null;
  declare status: PayoutStatus;
  declare completed_at: Date | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof Payout {
    Payout.init(
      {
        payout_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        travel_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: 'travel', key: 'travel_id' },
        },
        groupeur_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: 'user', key: 'user_id' },
        },
        payout_account_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: true,
          references: { model: 'payout_account', key: 'account_id' },
        },
        gross_amount_usd: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
          comment: 'Sum of net_to_groupeur_usd from all paid packages on this travel',
        },
        provider_fee_usd: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        net_amount_usd: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
          comment: 'gross_amount_usd - provider_fee_usd',
        },
        provider: {
          type: DataTypes.ENUM(...Object.values(PayoutProvider)),
          allowNull: true,
        },
        provider_reference: {
          type: DataTypes.STRING(200),
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM(...Object.values(PayoutStatus)),
          allowNull: false,
          defaultValue: PayoutStatus.PENDING,
        },
        completed_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'payout',
      },
    );
    return Payout;
  }
}
