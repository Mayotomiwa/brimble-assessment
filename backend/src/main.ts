import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { validateEnv } from './env';
import { waitForDb, runMigrations } from './db/migrate';
import { waitForCaddy } from './caddy/client';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  validateEnv();
  await waitForDb();
  await runMigrations();
  await waitForCaddy();

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('');
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.listen(3000);
  console.log('[boot] Backend ready on port 3000');
  console.log('[boot] App running at http://localhost (via Caddy on port 80)');
}

bootstrap();
