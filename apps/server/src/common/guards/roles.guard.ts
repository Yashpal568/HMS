import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied: User is not authenticated.',
        },
      });
    }

    // Strict Zero-PHI Invariant: Super Admin is strictly barred from tenant clinical data plane
    if (user.role === 'SUPER_ADMIN' && !requiredRoles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'TENANT_PHI_ACCESS_PROHIBITED',
          message: 'Access denied: Platform Super Admin is prohibited from accessing tenant clinical data plane.',
        },
      });
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied: Role ${user.role} is not authorized.`,
        },
      });
    }

    return true;
  }
}
