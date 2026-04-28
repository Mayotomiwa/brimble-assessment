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

    // Subscribe BEFORE replaying history — prevents losing lines broadcast
    // between the DB query returning and the subscriber being registered.
    const unsubscribe = sseBroker.subscribe(id, res);
    req.on('close', unsubscribe);

    // Replay persisted logs. Guard each write: sseBroker.close() may fire during
    // this loop (pipeline finished while we were awaiting getLogs), which calls
    // res.end() — any write after that throws and aborts the loop.
    const logs = await db.getLogs(id, { afterId: lastEventId });
    for (const log of logs) {
      if (res.writableEnded) break;
      res.write(
        `id: ${log.id}\nevent: log\ndata: ${JSON.stringify({ line: log.line, phase: log.phase })}\n\n`,
      );
    }

    if (res.writableEnded) {
      // sseBroker.close() already fired during replay — stream is done.
      return;
    }

    // Re-fetch status: the cached `deployment` may be stale if the pipeline
    // finished between the initial fetch and now.
    const fresh = await db.getDeployment(id);
    const isTerminal = fresh?.status === 'running' || fresh?.status === 'failed';

    if (isTerminal && !res.writableEnded) {
      try {
        res.write('event: done\ndata: {}\n\n');
        res.end();
      } catch { /* sseBroker.close() raced us to res.end() */ }
      unsubscribe();
    }
    // Otherwise stay open — sseBroker.close() ends the stream when the pipeline finishes
  }
}
