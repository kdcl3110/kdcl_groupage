import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

import { env } from './configs/env.config';
import { errorHandler, notFound } from './middlewares/errorHandler';
import authRouter from './modules/auth/auth.router';

function createApp(): Application {
  const app = express();

  // HTTP security headers
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (Postman, server-to-server)
        if (!origin || env.cors.allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS blocked for origin: ${origin}`));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    }),
  );

  const limiter = rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: env.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message: 'Too many requests, please try again later.' },
  });
  app.use('/api', limiter);

  // Request logging
  app.use(morgan(env.isDev() ? 'dev' : 'combined'));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', env: env.NODE_ENV });
  });

  // API routes
  app.use('/api/v1/auth', authRouter);

  // Error handling
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
