import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkerService {
  enqueue(_deploymentId: string): void {}

  isBuilding(_deploymentId: string): boolean {
    return false;
  }
}
