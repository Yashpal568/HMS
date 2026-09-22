import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(AppThrottlerGuard.name);

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const path = req.originalUrl || req.url || 'unknown';
    const method = req.method || 'GET';

    this.logger.warn(
      `[RATE_LIMIT_BREACH] IP: ${ip} exceeded limit on ${method} ${path} (${throttlerLimitDetail.ttl}ms window)`,
    );

    await super.throwThrottlingException(context, throttlerLimitDetail);
  }
}
