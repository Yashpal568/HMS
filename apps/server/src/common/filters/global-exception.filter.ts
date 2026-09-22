import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId = (request as any).correlationId || request.headers['x-request-id'] || 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errorType = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, any>;
        if (body.error && typeof body.error === 'object') {
          message = body.error.message || body.message || exception.message;
          errorType = body.error.code || body.error || exception.name;
        } else {
          message = body.message || exception.message;
          errorType = body.error || exception.name;
        }
      }
    } else if (exception instanceof Error) {
      // Don't leak raw internal error details to client in production
      this.logger.error(
        `[${correlationId}] Unhandled Exception: ${exception.message}`,
        exception.stack,
      );

      // Keep generic message for 500
      message = 'An unexpected internal server error occurred. Please contact support with the correlation ID.';
    }

    const payload = {
      success: false,
      statusCode: status,
      error: errorType,
      message,
      correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(payload);
  }
}
