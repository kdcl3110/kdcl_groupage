import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface PlatformConfigAttributes {
  key: string;
  value: string;
  description: string | null;
}

export interface PlatformConfigCreationAttributes
  extends Optional<PlatformConfigAttributes, 'description'> {}

export class PlatformConfig extends Model<PlatformConfigAttributes, PlatformConfigCreationAttributes> {
  declare key: string;
  declare value: string;
  declare description: string | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  /** Helper — get commission rate as a decimal (default 0.05 = 5%) */
  static async getCommissionRate(): Promise<number> {
    const cfg = await PlatformConfig.findByPk('commission_rate');
    const rate = cfg ? parseFloat(cfg.value) : 0.05;
    return isNaN(rate) ? 0.05 : rate;
  }

  static initModel(sequelize: Sequelize): typeof PlatformConfig {
    PlatformConfig.init(
      {
        key: {
          type: DataTypes.STRING(100),
          primaryKey: true,
        },
        value: {
          type: DataTypes.STRING(500),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'platform_config',
      },
    );
    return PlatformConfig;
  }
}
