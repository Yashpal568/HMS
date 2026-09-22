import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const rawHeader = req.headers['x-request-id'];
    const correlationId = (Array.isArray(rawHeader) ? rawHeader[0] : rawHeader) || `req-${randomUUID()}`;

    // Attach to request and response headers
    req.headers['x-request-id'] = correlationId;
    (req as any).correlationId = correlationId;
    res.setHeader('x-request-id', correlationId);

    next();
  }
}
