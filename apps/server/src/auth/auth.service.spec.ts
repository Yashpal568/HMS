import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: any;
  let rolesService: any;
  let auditService: any;
  let jwtService: any;

  beforeEach(() => {
    usersService = {
      findByEmail: vi.fn(),
      handleFailedLogin: vi.fn(),
      updateLastLogin: vi.fn(),
    };
    rolesService = {
      getPermissionsForRole: vi.fn().mockResolvedValue(['users.read', 'patients.read']),
    };
    auditService = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    jwtService = {
      sign: vi.fn().mockReturnValue('mock-jwt-access-token'),
    };

    authService = new AuthService(
      usersService,
      rolesService,
      auditService,
      jwtService,
    );
  });

  it('should authenticate valid credentials and return user with accessToken', async () => {
    const password = 'CorrectPassword123';
    const passwordHash = await bcrypt.hash(password, 10);
    const mockUser = {
      _id: 'user123',
      email: 'doctor@hms.local',
      passwordHash,
      firstName: 'Jane',
      lastName: 'Doe',
      role: 'DOCTOR',
      permissions: ['emr.create'],
      status: 'ACTIVE',
      createdAt: new Date(),
    };

    usersService.findByEmail.mockResolvedValue(mockUser);

    const result = await authService.login(
      { email: 'doctor@hms.local', password },
      '127.0.0.1',
      'test-agent',
    );

    expect(result.success).toBe(true);
    expect(result.accessToken).toBe('mock-jwt-access-token');
    expect(result.user.email).toBe('doctor@hms.local');
    expect(result.user.permissions).toContain('emr.create');
    expect(result.user.permissions).toContain('patients.read');
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN_SUCCESS' }),
    );
  });

  it('should throw UnauthorizedException and record audit for unknown email without leaking existence', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      authService.login(
        { email: 'nonexistent@hms.local', password: 'password' },
        '127.0.0.1',
        'test-agent',
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN_FAILED' }),
    );
  });

  it('should throw UnauthorizedException for wrong password and increment failed attempts', async () => {
    const passwordHash = await bcrypt.hash('realPassword', 10);
    const mockUser = {
      _id: 'user123',
      email: 'nurse@hms.local',
      passwordHash,
      status: 'ACTIVE',
    };

    usersService.findByEmail.mockResolvedValue(mockUser);

    await expect(
      authService.login(
        { email: 'nurse@hms.local', password: 'wrongPassword' },
        '127.0.0.1',
        'test-agent',
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(usersService.handleFailedLogin).toHaveBeenCalledWith('user123');
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN_FAILED' }),
    );
  });

  it('should reject login if account is currently locked', async () => {
    const futureLock = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes in future
    const mockUser = {
      _id: 'user123',
      email: 'locked@hms.local',
      passwordHash: 'hash',
      status: 'ACTIVE',
      lockUntil: futureLock,
    };

    usersService.findByEmail.mockResolvedValue(mockUser);

    await expect(
      authService.login(
        { email: 'locked@hms.local', password: 'any' },
        '127.0.0.1',
        'test-agent',
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN_LOCKED' }),
    );
  });

  it('should reject login if user status is not ACTIVE', async () => {
    const mockUser = {
      _id: 'user123',
      email: 'inactive@hms.local',
      passwordHash: 'hash',
      status: 'SUSPENDED',
    };

    usersService.findByEmail.mockResolvedValue(mockUser);

    await expect(
      authService.login(
        { email: 'inactive@hms.local', password: 'any' },
        '127.0.0.1',
        'test-agent',
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN_REJECTED' }),
    );
  });
});
