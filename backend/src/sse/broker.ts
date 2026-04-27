import { Response } from 'express';

type LogEvent = {
  id?: string;
  line: string;
  phase: string;
};

type Subscriber = {
  res: Response;
  heartbeat: ReturnType<typeof setInterval>;
};

const subscribers = new Map<string, Set<Subscriber>>();

export const sseBroker = {
  subscribe(deploymentId: string, res: Response): () => void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const heartbeat = setInterval(() => res.write(': ping\n\n'), 15_000);
    const sub: Subscriber = { res, heartbeat };

    if (!subscribers.has(deploymentId)) {
      subscribers.set(deploymentId, new Set());
    }
    subscribers.get(deploymentId)!.add(sub);

    return () => {
      clearInterval(heartbeat);
      subscribers.get(deploymentId)?.delete(sub);
      if (subscribers.get(deploymentId)?.size === 0) {
        subscribers.delete(deploymentId);
      }
    };
  },

  broadcast(deploymentId: string, event: LogEvent): void {
    const subs = subscribers.get(deploymentId);
    if (!subs || subs.size === 0) return;
    const payload = formatEvent(event);
    for (const sub of subs) {
      try { sub.res.write(payload); } catch { /* client disconnected */ }
    }
  },

  close(deploymentId: string): void {
    const subs = subscribers.get(deploymentId);
    if (!subs) return;
    for (const sub of subs) {
      try {
        sub.res.write('event: done\ndata: {}\n\n');
        sub.res.end();
        clearInterval(sub.heartbeat);
      } catch { /* already closed */ }
    }
    subscribers.delete(deploymentId);
  },
};

function formatEvent(event: LogEvent): string {
  let out = '';
  if (event.id) out += `id: ${event.id}\n`;
  out += `event: log\n`;
  out += `data: ${JSON.stringify({ line: event.line, phase: event.phase })}\n\n`;
  return out;
}
