import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        error = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        error = (b['message'] as string) ?? exception.message;
        code = (b['code'] as string) ?? toCode(status);
      }
      code = toCode(status);
    } else if (exception instanceof Error) {
      error = exception.message;
    }

    console.error(`[${req.method}] ${req.url} → ${status}`, error);

    res.status(status).json({ error, code });
  }
}

function toCode(status: number): string {
  const map: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE',
    500: 'INTERNAL_ERROR',
  };
  return map[status] ?? 'INTERNAL_ERROR';
}
