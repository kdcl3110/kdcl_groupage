import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export enum UserRole {
  CLIENT = 'client',
  ADMIN = 'admin',
  FREIGHT_FORWARDER = 'freight_forwarder',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export interface UserAttributes {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
  street: string;
  city: string;
  country: string;
  postal_code: string | null;
  role: UserRole;
  status: UserStatus;
  registration_date: Date;
  pdf_file: string | null;
  reset_password_token: string | null;
  reset_password_expires: Date | null;
}

export interface UserCreationAttributes
  extends Optional<
    UserAttributes,
    | 'user_id'
    | 'registration_date'
    | 'pdf_file'
    | 'status'
    | 'postal_code'
    | 'reset_password_token'
    | 'reset_password_expires'
  > {}

export class User extends Model<UserAttributes, UserCreationAttributes> {
  declare user_id: number;
  declare first_name: string;
  declare last_name: string;
  declare email: string;
  declare password: string;
  declare phone: string;
  declare street: string;
  declare city: string;
  declare country: string;
  declare postal_code: string | null;
  declare role: UserRole;
  declare status: UserStatus;
  declare registration_date: Date;
  declare pdf_file: string | null;
  declare reset_password_token: string | null;
  declare reset_password_expires: Date | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof User {
    User.init(
      {
        user_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        first_name: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        last_name: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        email: {
          type: DataTypes.STRING(150),
          allowNull: false,
          unique: true,
          validate: { isEmail: true },
        },
        password: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        phone: {
          type: DataTypes.STRING(20),
          allowNull: false,
        },
        street: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        city: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        country: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        postal_code: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        role: {
          type: DataTypes.ENUM(...Object.values(UserRole)),
          allowNull: false,
          defaultValue: UserRole.CLIENT,
        },
        status: {
          type: DataTypes.ENUM(...Object.values(UserStatus)),
          allowNull: false,
          defaultValue: UserStatus.ACTIVE,
        },
        registration_date: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        pdf_file: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        reset_password_token: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        reset_password_expires: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'user',
        indexes: [{ unique: true, fields: ['email'] }],
      },
    );
    return User;
  }
}
