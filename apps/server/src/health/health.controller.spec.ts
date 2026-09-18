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
});

