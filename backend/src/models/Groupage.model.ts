import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export enum GroupageStatus {
  OPEN = 'open',
  FULL = 'full',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export interface GroupageAttributes {
  groupage_id: number;
  status: GroupageStatus;
  country: string;
  itinerary: string;
  container: string | null;
  max_weight: number;
  max_volume: number;
  min_load_percentage: number;
  max_load_percentage: number;
  creation_date: Date;
  departure_date: Date | null;
  estimated_arrival_date: Date | null;
}

export interface GroupageCreationAttributes
  extends Optional<
    GroupageAttributes,
    'groupage_id' | 'creation_date' | 'container' | 'departure_date' | 'estimated_arrival_date'
  > {}

export class Groupage extends Model<GroupageAttributes, GroupageCreationAttributes> {
  declare groupage_id: number;
  declare status: GroupageStatus;
  declare country: string;
  declare itinerary: string;
  declare container: string | null;
  declare max_weight: number;
  declare max_volume: number;
  declare min_load_percentage: number;
  declare max_load_percentage: number;
  declare creation_date: Date;
  declare departure_date: Date | null;
  declare estimated_arrival_date: Date | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof Groupage {
    Groupage.init(
      {
        groupage_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        status: {
          type: DataTypes.ENUM(...Object.values(GroupageStatus)),
          allowNull: false,
          defaultValue: GroupageStatus.OPEN,
        },
        country: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        itinerary: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        container: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        max_weight: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        max_volume: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        min_load_percentage: {
          type: DataTypes.TINYINT.UNSIGNED,
          allowNull: false,
        },
        max_load_percentage: {
          type: DataTypes.TINYINT.UNSIGNED,
          allowNull: false,
        },
        creation_date: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        departure_date: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        estimated_arrival_date: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'groupage',
      },
    );
    return Groupage;
  }
}
