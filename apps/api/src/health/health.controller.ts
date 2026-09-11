import { Controller, Get, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(
    @Optional() @InjectConnection() private readonly connection?: Connection,
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

