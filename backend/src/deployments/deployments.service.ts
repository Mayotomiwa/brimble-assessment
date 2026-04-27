import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { createHash } from 'crypto';
import { db, Deployment, ImageTag } from '../db/queries';
import { WorkerService } from '../worker/worker.service';

@Injectable()
export class DeploymentsService {
  constructor(private readonly worker: WorkerService) {}

  async create(body: { gitUrl?: string }): Promise<Deployment> {
    const gitUrl = body.gitUrl ?? null;
    const cacheKey = gitUrl
      ? createHash('sha256').update(gitUrl).digest('hex')
      : null;

    const deployment = await db.createDeployment({
      gitUrl,
      sourceType: 'git',
      cacheKey,
    });

    this.worker.enqueue(deployment.id);
    return deployment;
  }

  async list(): Promise<Deployment[]> {
    return db.listDeployments();
  }

  async get(id: string): Promise<Deployment> {
    const deployment = await db.getDeployment(id);
    if (!deployment) throw new NotFoundException('Deployment not found');
    return deployment;
  }

  async remove(id: string): Promise<void> {
    const deployment = await db.getDeployment(id);
    if (!deployment) throw new NotFoundException('Deployment not found');
    await db.deleteDeployment(id);
  }

  async redeploy(id: string): Promise<void> {
    const deployment = await db.getDeployment(id);
    if (!deployment) throw new NotFoundException('Deployment not found');
    if (this.worker.isBuilding(id)) {
      throw new ConflictException({ error: 'Build already in progress', code: 'BUILD_IN_PROGRESS' });
    }
    this.worker.enqueue(id);
  }

  async rollback(id: string, body: { imageTagId: string }): Promise<void> {
    const deployment = await db.getDeployment(id);
    if (!deployment) throw new NotFoundException('Deployment not found');
    if (this.worker.isBuilding(id)) {
      throw new ConflictException({ error: 'Build already in progress', code: 'BUILD_IN_PROGRESS' });
    }
    const tag = await db.getImageTag(body.imageTagId);
    if (!tag) throw new NotFoundException('Image tag not found');
    this.worker.enqueue(id);
  }

  async listTags(id: string): Promise<ImageTag[]> {
    const deployment = await db.getDeployment(id);
    if (!deployment) throw new NotFoundException('Deployment not found');
    return db.listImageTags(id);
  }
}
