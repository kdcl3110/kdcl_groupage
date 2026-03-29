import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export enum GroupageStatus {
  OPEN = 'open',
  FULL = 'full',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum TransportType {
  SHIP = 'ship',
  PLANE = 'plane',
}

export interface GroupageAttributes {
  groupage_id: number;
  transport_type: TransportType;
  origin_country: string;
  destination_country: string;
  itinerary: string | null;
  status: GroupageStatus;
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
    | 'groupage_id'
    | 'status'
    | 'itinerary'
    | 'container'
    | 'creation_date'
    | 'departure_date'
    | 'estimated_arrival_date'
  > {}

export class Groupage extends Model<GroupageAttributes, GroupageCreationAttributes> {
  declare groupage_id: number;
  declare transport_type: TransportType;
  declare origin_country: string;
  declare destination_country: string;
  declare itinerary: string | null;
  declare status: GroupageStatus;
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
        transport_type: {
          type: DataTypes.ENUM(...Object.values(TransportType)),
          allowNull: false,
        },
        origin_country: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        destination_country: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        itinerary: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: 'Optional free-text route description (e.g. "Bruxelles -> Douala via Paris")',
        },
        status: {
          type: DataTypes.ENUM(...Object.values(GroupageStatus)),
          allowNull: false,
          defaultValue: GroupageStatus.OPEN,
        },
        container: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        max_weight: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          comment: 'Max total weight in kg',
        },
        max_volume: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          comment: 'Max total volume in m³',
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
