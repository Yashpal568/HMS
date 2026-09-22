import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service.js';
import { RolesService } from '../roles/roles.service.js';
import { AuditService } from '../audit/audit.service.js';
import { LoginDto } from './dto/login.dto.js';
import { UserDocument } from '../users/schemas/user.schema.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly auditService: AuditService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUserCredentials(dto: LoginDto, ipAddress: string, userAgent: string): Promise<UserDocument> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      await this.auditService.record({
        userId: dto.email,
        action: 'LOGIN_FAILED',
        resource: 'auth',
        details: { reason: 'User not found' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
    }

    // Check account lockout
    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      const remainingMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000));
      await this.auditService.record({
        userId: user._id.toString(),
        hospitalId: user.hospitalId?.toString(),
        action: 'LOGIN_LOCKED',
        resource: 'auth',
        details: { lockUntil: user.lockUntil, remainingMinutes },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: `Account is temporarily locked. Please try again in ${remainingMinutes} minute(s).`,
        },
      });
    }

    // Check account status
    if (user.status !== 'ACTIVE') {
      await this.auditService.record({
        userId: user._id.toString(),
        hospitalId: user.hospitalId?.toString(),
        action: 'LOGIN_REJECTED',
        resource: 'auth',
        details: { status: user.status },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: `Account is currently ${user.status.toLowerCase()}. Please contact your hospital administrator.`,
        },
      });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.usersService.handleFailedLogin(user._id.toString());
      await this.auditService.record({
        userId: user._id.toString(),
        hospitalId: user.hospitalId?.toString(),
        action: 'LOGIN_FAILED',
        resource: 'auth',
        details: { reason: 'Incorrect password' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
    }

    return user;
  }

  async login(dto: LoginDto, ipAddress: string, userAgent: string) {
    const user = await this.validateUserCredentials(dto, ipAddress, userAgent);

    // Reset failed attempts & record success
    await this.usersService.updateLastLogin(user._id.toString());
    await this.auditService.record({
      userId: user._id.toString(),
      hospitalId: user.hospitalId?.toString(),
      action: 'LOGIN_SUCCESS',
      resource: 'auth',
      ipAddress,
      userAgent,
    });

    const rolePermissions = await this.rolesService.getPermissionsForRole(user.role);
    const permissions = Array.from(
      new Set([...rolePermissions, ...(user.permissions || [])]),
    );

    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      hospitalId: user.hospitalId?.toString(),
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      success: true,
      accessToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department: (user as any).department,
        specialization: (user as any).specialization,
        phone: (user as any).phone,
        permissions,
        status: user.status,
        hospitalId: user.hospitalId?.toString(),
        branchId: user.branchId?.toString(),
        createdAt: user.createdAt,
      },
    };
  }

  async logout(userId: string, ipAddress: string, userAgent: string) {
    await this.auditService.record({
      userId,
      action: 'LOGOUT',
      resource: 'auth',
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: 'Logged out successfully.',
    };
  }
}
