import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface CountryAttributes {
  country_id: number;
  name: string;
  is_active: boolean;
}

export interface CountryCreationAttributes
  extends Optional<CountryAttributes, 'country_id' | 'is_active'> {}

export class Country extends Model<CountryAttributes, CountryCreationAttributes> {
  declare country_id: number;
  declare name: string;
  declare is_active: boolean;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof Country {
    Country.init(
      {
        country_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true,
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        sequelize,
        tableName: 'country',
      },
    );
    return Country;
  }
}
