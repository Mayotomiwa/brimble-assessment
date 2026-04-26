import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { env } from '../env';

@Injectable()
export class DbService implements OnModuleDestroy {
  readonly pool = new Pool({ connectionString: env.databaseUrl });

  async onModuleDestroy() {
    await this.pool.end();
  }
}
