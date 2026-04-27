import { Injectable } from '@nestjs/common';
import { enqueue, enqueueRollback, isBuilding } from './queue';

@Injectable()
export class WorkerService {
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
