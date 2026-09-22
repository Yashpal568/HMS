import { describe, it, expect, beforeEach } from 'vitest';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return status ok and not_configured when connection is not provided', () => {
    const response = controller.check();
    expect(response).toEqual({
      success: true,
      status: 'ok',
      database: 'not_configured',
    });
  });

  it('should report connected when connection readyState is 1', () => {
    const mockConnection = { readyState: 1 } as any;
    const controllerWithDb = new HealthController(mockConnection);
    const response = controllerWithDb.check();
    expect(response).toEqual({
      success: true,
      status: 'ok',
      database: 'connected',
    });
  });

  it('should return deep telemetry with database latency and memory metrics', async () => {
    const mockConnection = {
      readyState: 1,
      db: {
        admin: () => ({
          ping: async () => ({ ok: 1 }),
        }),
      },
      client: {
        options: { maxPoolSize: 20 },
      },
    } as any;

    const controllerWithDb = new HealthController(mockConnection);
    const response = await controllerWithDb.deep();

    expect(response.status).toBe('ok');
    expect(response.database.status).toBe('connected');
    expect(response.database.poolSize).toBe(20);
    expect(response.database.latencyMs).toBeGreaterThanOrEqual(1);
    expect(response.memory.heapUsedMb).toBeGreaterThan(0);
    expect(response.memory.heapTotalMb).toBeGreaterThan(0);
    expect(typeof response.uptimeSeconds).toBe('number');
  });

  it('should return degraded status if database ping fails', async () => {
    const mockConnection = {
      readyState: 1,
      db: {
        admin: () => ({
          ping: async () => {
            throw new Error('Connection timed out');
          },
        }),
      },
    } as any;

    const controllerWithDb = new HealthController(mockConnection);
    const response = await controllerWithDb.deep();

    expect(response.status).toBe('degraded');
    expect(response.database.latencyMs).toBe(-1);
  });
});


