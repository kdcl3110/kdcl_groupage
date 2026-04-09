import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export enum PayoutAccountType {
  IBAN         = 'iban',
  MOBILE_MONEY = 'mobile_money',
}

export enum MobileOperator {
  MTN    = 'mtn',
  ORANGE = 'orange',
}

export interface PayoutAccountAttributes {
  account_id: number;
  user_id: number;
  type: PayoutAccountType;
  account_holder_name: string;
  iban: string | null;
  mobile_number: string | null;
  mobile_operator: MobileOperator | null;
  country_code: string;   // ISO 3166-1 alpha-2: 'BE', 'CM'
  is_default: boolean;
  is_verified: boolean;
}

export interface PayoutAccountCreationAttributes
  extends Optional<
    PayoutAccountAttributes,
    | 'account_id'
    | 'iban'
    | 'mobile_number'
    | 'mobile_operator'
    | 'is_default'
    | 'is_verified'
  > {}

export class PayoutAccount extends Model<PayoutAccountAttributes, PayoutAccountCreationAttributes> {
  declare account_id: number;
  declare user_id: number;
  declare type: PayoutAccountType;
  declare account_holder_name: string;
  declare iban: string | null;
  declare mobile_number: string | null;
  declare mobile_operator: MobileOperator | null;
  declare country_code: string;
  declare is_default: boolean;
  declare is_verified: boolean;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof PayoutAccount {
    PayoutAccount.init(
      {
        account_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        user_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: 'user', key: 'user_id' },
        },
        type: {
          type: DataTypes.ENUM(...Object.values(PayoutAccountType)),
          allowNull: false,
        },
        account_holder_name: {
          type: DataTypes.STRING(200),
          allowNull: false,
        },
        iban: {
          type: DataTypes.STRING(34),
          allowNull: true,
        },
        mobile_number: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        mobile_operator: {
          type: DataTypes.ENUM(...Object.values(MobileOperator)),
          allowNull: true,
        },
        country_code: {
          type: DataTypes.STRING(2),
          allowNull: false,
        },
        is_default: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        is_verified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      {
        sequelize,
        tableName: 'payout_account',
      },
    );
    return PayoutAccount;
  }
}
