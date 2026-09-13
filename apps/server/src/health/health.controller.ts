import { Controller, Get, Optional, Inject } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(
    @Optional() @Inject(getConnectionToken()) private readonly connection?: Connection,
  ) {}

  @Get()
  check() {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const dbStatus = this.connection ? states[this.connection.readyState] ?? 'unknown' : 'not_configured';

    return {
      success: true,
      status: 'ok',
      database: dbStatus,
    };
  }
}

