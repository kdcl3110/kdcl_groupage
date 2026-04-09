import { env } from './src/configs/env.config';
import { connectDatabase, sequelize, syncDatabase } from './src/configs/database.config';
import './src/models'; // initialize models and associations
import { seedCountries, seedCurrencies, seedPlatformConfig } from './src/configs/seed';
import { startCronJobs } from './src/services/cron.service';
import { currencyService } from './src/services/currency.service';
import createApp from './src/app';

async function bootstrap(): Promise<void> {
  await connectDatabase();
  await syncDatabase();

  await seedCountries();
  await seedCurrencies();
  await seedPlatformConfig();

  // Fetch up-to-date exchange rates on startup (non-blocking)
  currencyService.updateExchangeRates().catch((err) =>
    console.error('[Startup] Exchange rate fetch failed:', err),
  );

  startCronJobs();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`Server started in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`${signal} received — shutting down...`);
    server.close(async () => {
      await sequelize.close();
      console.log('Database connection closed. Shutdown complete.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Startup error:', err);
  process.exit(1);
});
