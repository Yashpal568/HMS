import { describe, it, expect, beforeEach } from 'vitest';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard.js';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
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

  it('should allow access if no permissions are required', () => {
    reflector.getAllAndOverride = () => null;
    const context = createMockContext({ role: 'NURSE', permissions: [] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user is SUPER_ADMIN', () => {
    reflector.getAllAndOverride = () => ['patients.read', 'billing.refund'];
    const context = createMockContext({ role: 'SUPER_ADMIN', permissions: ['*'] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has required permissions', () => {
    reflector.getAllAndOverride = () => ['patients.read'];
    const context = createMockContext({ role: 'DOCTOR', permissions: ['patients.read', 'emr.read'] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user lacks required permission', () => {
    reflector.getAllAndOverride = () => ['billing.refund'];
    const context = createMockContext({ role: 'DOCTOR', permissions: ['patients.read'] });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if user is not present on request', () => {
    reflector.getAllAndOverride = () => ['patients.read'];
    const context = createMockContext(null);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
