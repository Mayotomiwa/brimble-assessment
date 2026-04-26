import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { DeploymentsModule } from './deployments/deployments.module';
import { LogsModule } from './logs/logs.module';
import { WorkerModule } from './worker/worker.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    DbModule,
    WorkerModule,
    DeploymentsModule,
    LogsModule,
    HealthModule,
  ],
})
export class AppModule {}
