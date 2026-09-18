import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../../users/users.service.js';
import { RolesService } from '../../roles/roles.service.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  hospitalId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request) => {
          return request?.cookies?.['access_token'] || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET || 'hms-dev-insecure-secret-key-change-in-prod-2026',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User account no longer exists.');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(`Account is currently ${user.status.toLowerCase()}.`);
    }

    // Merge role permissions with any user-specific permissions
    const rolePermissions = await this.rolesService.getPermissionsForRole(user.role);
    const combinedPermissions = Array.from(
      new Set([...rolePermissions, ...(user.permissions || [])]),
    );

    const tenantId = user.hospitalId?.toString() || (user as any).tenantId?.toString() || '6aa3f64974f6740b10b10001';

    return {
      id: user._id.toString(),
      userId: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permissions: combinedPermissions,
      tenantId,
      hospitalId: tenantId,
      branchId: user.branchId?.toString(),
    };
  }
}
