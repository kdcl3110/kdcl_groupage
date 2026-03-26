import { Sequelize } from 'sequelize';
import { env } from './env.config';

export const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'mariadb',
  dialectOptions: {
    timezone: 'local',
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  logging: env.isDev() ? (sql) => console.log(`[SQL] ${sql}`) : false,
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
});

export async function connectDatabase(): Promise<void> {
  const bootstrap = new Sequelize('', env.db.user, env.db.password, {
    host: env.db.host,
    port: env.db.port,
    dialect: 'mariadb',
    dialectOptions: { timezone: 'local' },
    logging: false,
  });

  try {
    await bootstrap.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await bootstrap.close();
    console.log(`Database "${env.db.name}" is ready.`);
  } catch (error) {
    console.error('Unable to create database:', error);
    process.exit(1);
  }

  // Authenticate with the target database
  try {
    await sequelize.authenticate();
    console.log('MariaDB connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
}

export async function syncDatabase(): Promise<void> {
  // alter: { drop: false } adds new columns/tables without trying to remove old columns
  // (workaround for Sequelize v6 bug with MariaDB 3.x driver: "Cannot delete property 'meta'")
  await sequelize.sync({ alter: { drop: false } });
  console.log('Database tables synchronized.');
}
