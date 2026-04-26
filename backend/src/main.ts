import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { validateEnv } from './env';
import { waitForDb, runMigrations } from './db/migrate';
import { waitForCaddy } from './caddy/client';

async function bootstrap() {
  validateEnv();
  await waitForDb();
  await runMigrations();
  await waitForCaddy();

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('');

  await app.listen(3000);
  console.log('[boot] Backend ready on port 3000');
}

bootstrap();
