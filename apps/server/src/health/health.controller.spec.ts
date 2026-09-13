import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
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

