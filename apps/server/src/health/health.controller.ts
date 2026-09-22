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

  @Get('deep')
  async deep() {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const readyState = this.connection?.readyState ?? 0;
    const dbStatus = this.connection ? states[readyState] ?? 'unknown' : 'not_configured';

    let latencyMs = 0;
    let isConnected = readyState === 1;

    if (isConnected && this.connection?.db) {
      try {
        const start = Date.now();
        await this.connection.db.admin().ping();
        latencyMs = Math.max(1, Date.now() - start);
      } catch {
        isConnected = false;
        latencyMs = -1;
      }
    }

    const mem = process.memoryUsage();
    const heapUsedMb = Math.round(mem.heapUsed / (1024 * 1024));
    const heapTotalMb = Math.round(mem.heapTotal / (1024 * 1024));
    const rssMb = Math.round(mem.rss / (1024 * 1024));
    const uptimeSeconds = Math.floor(process.uptime());

    const poolSize =
      (this.connection as any)?.client?.options?.maxPoolSize ||
      (this.connection as any)?.client?.s?.options?.maxPoolSize ||
      10;

    return {
      status: isConnected ? 'ok' : 'degraded',
      database: {
        status: isConnected ? dbStatus : 'degraded',
        latencyMs,
        poolSize,
      },
      memory: {
        heapUsedMb,
        heapTotalMb,
        rssMb,
      },
      uptimeSeconds,
      timestamp: new Date().toISOString(),
    };
  }
}


