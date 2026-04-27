import { Injectable } from '@nestjs/common';
import { enqueue, isBuilding } from './queue';

@Injectable()
export class WorkerService {
  enqueue(deploymentId: string): void {
    enqueue(deploymentId);
  }

  isBuilding(deploymentId: string): boolean {
    return isBuilding(deploymentId);
  }
}
