import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface CurrencyAttributes {
  currency_id: number;
  code: string;       // ISO 4217: 'USD', 'EUR', 'XAF'
  name: string;       // 'US Dollar', 'Euro', 'Franc CFA'
  symbol: string;     // '$', '€', 'FCFA'
  rate_to_usd: number; // how many units of this currency = 1 USD
  last_updated: Date;
}

export interface CurrencyCreationAttributes
  extends Optional<CurrencyAttributes, 'currency_id' | 'last_updated'> {}

export class Currency extends Model<CurrencyAttributes, CurrencyCreationAttributes> {
  declare currency_id: number;
  declare code: string;
  declare name: string;
  declare symbol: string;
  declare rate_to_usd: number;
  declare last_updated: Date;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof Currency {
    Currency.init(
      {
        currency_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        code: {
          type: DataTypes.STRING(10),
          allowNull: false,
          unique: true,
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        symbol: {
          type: DataTypes.STRING(10),
          allowNull: false,
        },
        rate_to_usd: {
          type: DataTypes.DECIMAL(18, 6),
          allowNull: false,
          defaultValue: 1,
          comment: 'How many units of this currency equal 1 USD',
        },
        last_updated: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: 'currency',
      },
    );
    return Currency;
  }
}
