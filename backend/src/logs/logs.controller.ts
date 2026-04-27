import { Controller, Get, NotFoundException, Param, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { db } from '../db/queries';
import { sseBroker } from '../sse/broker';

@Controller('deployments')
export class LogsController {
  @Get(':id/logs')
  async stream(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const deployment = await db.getDeployment(id);
    if (!deployment) throw new NotFoundException('Deployment not found');

    const lastEventId = req.headers['last-event-id'] as string | undefined;

    // Subscribe BEFORE replaying history — prevents losing lines emitted
    // between the DB query returning and the subscriber being registered.
    const unsubscribe = sseBroker.subscribe(id, res);
    req.on('close', unsubscribe);

    // Replay persisted logs (full history, or from Last-Event-ID on reconnect)
    const logs = await db.getLogs(id, { afterId: lastEventId });
    for (const log of logs) {
      res.write(
        `id: ${log.id}\nevent: log\ndata: ${JSON.stringify({ line: log.line, phase: log.phase })}\n\n`,
      );
    }

    // If already terminal, close immediately after replay
    if (deployment.status === 'running' || deployment.status === 'failed') {
      res.write('event: done\ndata: {}\n\n');
      res.end();
      unsubscribe();
    }
    // Otherwise stay open — sseBroker.close() ends the stream when the pipeline finishes
  }
}
