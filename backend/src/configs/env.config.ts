import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export const env = {
  NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3000', 10),

  db: {
    host: requireEnv('DB_HOST'),
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    name: requireEnv('DB_NAME'),
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
  },

  jwt: {
    secret: requireEnv('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },

  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
  },

  resend: {
    apiKey:    requireEnv('RESEND_API_KEY'),
    fromEmail: process.env.RESEND_FROM_EMAIL ?? 'noreply@kdcl-groupage.com',
  },

  app: {
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  },

  isDev(): boolean {
    return this.NODE_ENV === 'development';
  },

  isProd(): boolean {
    return this.NODE_ENV === 'production';
  },
};
