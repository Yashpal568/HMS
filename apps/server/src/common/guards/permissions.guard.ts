import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
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

    // Super Admin is bound strictly to platform permissions and has Zero PHI access
    if (user.role === 'SUPER_ADMIN') {
      const isClinicalOrTenant = requiredPermissions.some((p) => !p.startsWith('platform.'));
      if (isClinicalOrTenant) {
        throw new ForbiddenException({
          success: false,
          error: {
            code: 'TENANT_PHI_ACCESS_PROHIBITED',
            message: 'Access denied: Platform Super Admin is prohibited from accessing tenant clinical data plane.',
          },
        });
      }
    }

    // Wildcard permissions for hospital administrators within tenant boundary
    const userPermissions: string[] = user.permissions || [];
    if (user.role !== 'SUPER_ADMIN' && userPermissions.includes('*')) {
      return true;
    }

    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied: Missing required permission (${requiredPermissions.join(', ')}).`,
        },
      });
    }

    return true;
  }
}
