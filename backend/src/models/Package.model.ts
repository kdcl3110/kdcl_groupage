import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export enum PackageStatus {
  PENDING = 'pending',
  IN_TRAVEL = 'in_travel',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  RETURNED = 'returned',
  CANCELLED = 'cancelled',
}

export interface PackageAttributes {
  package_id: number;
  client_id: number;
  travel_id: number | null;
  recipient_id: number;
  tracking_number: string;
  description: string;
  weight: number;
  volume: number;
  declared_value: number;
  status: PackageStatus;
  special_instructions: string | null;
  creation_date: Date;
  estimated_delivery_date: Date | null;
  delivery_date: Date | null;
}

export interface PackageCreationAttributes
  extends Optional<
    PackageAttributes,
    | 'package_id'
    | 'travel_id'
    | 'tracking_number'
    | 'creation_date'
    | 'special_instructions'
    | 'estimated_delivery_date'
    | 'delivery_date'
  > {}

export class Package extends Model<PackageAttributes, PackageCreationAttributes> {
  declare package_id: number;
  declare client_id: number;
  declare travel_id: number | null;
  declare recipient_id: number;
  declare tracking_number: string;
  declare description: string;
  declare weight: number;
  declare volume: number;
  declare declared_value: number;
  declare status: PackageStatus;
  declare special_instructions: string | null;
  declare creation_date: Date;
  declare estimated_delivery_date: Date | null;
  declare delivery_date: Date | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof Package {
    Package.init(
      {
        package_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        client_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: 'user', key: 'user_id' },
        },
        travel_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: true,
          references: { model: 'travel', key: 'travel_id' },
        },
        recipient_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: 'recipient', key: 'recipient_id' },
        },
        tracking_number: {
          type: DataTypes.STRING(50),
          allowNull: false,
          unique: true,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        weight: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          comment: 'Weight in kg',
        },
        volume: {
          type: DataTypes.DECIMAL(10, 3),
          allowNull: false,
          comment: 'Volume in m³',
        },
        declared_value: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM(...Object.values(PackageStatus)),
          allowNull: false,
          defaultValue: PackageStatus.PENDING,
        },
        special_instructions: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        creation_date: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        estimated_delivery_date: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        delivery_date: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'package',
        hooks: {
          beforeCreate: (pkg) => {
            if (!pkg.tracking_number) {
              const timestamp = Date.now().toString(36).toUpperCase();
              const random = Math.random().toString(36).substring(2, 6).toUpperCase();
              pkg.tracking_number = `PKG-${timestamp}-${random}`;
            }
          },
        },
      },
    );
    return Package;
  }
}
