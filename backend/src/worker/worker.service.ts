import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { enqueue, enqueueRollback, isBuilding } from './queue';
import { db } from '../db/queries';

@Injectable()
export class WorkerService implements OnModuleInit {
  private readonly logger = new Logger(WorkerService.name);

  async onModuleInit() {
    const all = await db.listDeployments();
    const stuck = all.filter(d => d.status === 'building' || d.status === 'pending');
    for (const d of stuck) {
      await db.updateStatus(d.id, 'failed');
      this.logger.warn(`Boot recovery: reset deployment ${d.id} from ${d.status} → failed`);
    }
  }

  enqueue(deploymentId: string): void {
    enqueue(deploymentId);
  }

  enqueueRollback(deploymentId: string, registryRef: string): void {
    enqueueRollback(deploymentId, registryRef);
  }

  isBuilding(deploymentId: string): boolean {
    return isBuilding(deploymentId);
  }
}
