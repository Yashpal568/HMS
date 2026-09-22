import { describe, it, expect, beforeEach } from 'vitest';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockContext(user: any): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow access if no roles are required', () => {
    reflector.getAllAndOverride = () => null;
    const context = createMockContext({ role: 'NURSE' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has required role', () => {
    reflector.getAllAndOverride = () => ['DOCTOR', 'HOSPITAL_ADMIN'];
    const context = createMockContext({ role: 'DOCTOR' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if route requires SUPER_ADMIN and user is SUPER_ADMIN', () => {
    reflector.getAllAndOverride = () => ['SUPER_ADMIN'];
    const context = createMockContext({ role: 'SUPER_ADMIN' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if SUPER_ADMIN attempts to access clinical hospital routes (Zero-PHI)', () => {
    reflector.getAllAndOverride = () => ['PHARMACIST'];
    const context = createMockContext({ role: 'SUPER_ADMIN' });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if user lacks required role', () => {
    reflector.getAllAndOverride = () => ['HOSPITAL_ADMIN'];
    const context = createMockContext({ role: 'RECEPTIONIST' });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
