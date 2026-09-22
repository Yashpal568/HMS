import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersService } from './users.service.js';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { StaffRole } from '@hms/types';

describe('UsersService - Staff Onboarding & Invite', () => {
  let service: UsersService;
  let mockUserModel: any;
  let mockMailService: any;
  let mockAuditService: any;
  let mockRolesService: any;

  const hospitalId = new Types.ObjectId().toString();

  beforeEach(() => {
    mockUserModel = {
      findOne: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      find: vi.fn(),
      countDocuments: vi.fn(),
      findByIdAndUpdate: vi.fn(),
    };

    mockMailService = {
      sendStaffCredentials: vi.fn().mockResolvedValue({
        success: true,
        messageId: 'msg-test-12345',
      }),
    };

    mockAuditService = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    mockRolesService = {
      findByName: vi.fn().mockResolvedValue({
        name: 'DOCTOR',
        permissions: ['patients.read', 'emr.read', 'emr.create'],
      }),
    };

    service = new UsersService(
      mockUserModel,
      mockMailService,
      mockAuditService,
      mockRolesService,
    );
  });

  describe('inviteStaff', () => {
    it('should successfully invite a new doctor, hash temporary password, record audit, and dispatch credentials email', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const fakeCreatedUser = {
        _id: new Types.ObjectId(),
        email: 'dr.sharma@hospital.com',
        firstName: 'Rajesh',
        lastName: 'Sharma',
        role: 'DOCTOR',
        permissions: ['patients.read', 'emr.read', 'emr.create'],
        hospitalId: new Types.ObjectId(hospitalId),
        department: 'Cardiology',
        specialization: 'Interventional Cardiologist',
        mustChangePassword: true,
      };

      mockUserModel.create.mockResolvedValue(fakeCreatedUser);

      const result = await service.inviteStaff(
        hospitalId,
        {
          firstName: 'Rajesh',
          lastName: 'Sharma',
          email: 'dr.sharma@hospital.com',
          role: StaffRole.DOCTOR,
          department: 'Cardiology',
          specialization: 'Interventional Cardiologist',
        },
        {
          userId: 'admin-1',
          email: 'admin@hospital.com',
          name: 'Chief Admin',
        },
      );

      expect(result).toBeDefined();
      expect(result.email).toBe('dr.sharma@hospital.com');
      expect(result.role).toBe('DOCTOR');
      expect(result.temporaryPassword).toMatch(/^Med#[A-Za-z0-9]{6}9$/);
      expect(result.emailDispatched).toBe(true);

      // Verify DB creation
      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'dr.sharma@hospital.com',
          firstName: 'Rajesh',
          lastName: 'Sharma',
          role: 'DOCTOR',
          department: 'Cardiology',
          specialization: 'Interventional Cardiologist',
          mustChangePassword: true,
        }),
      );

      // Verify Audit record
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'STAFF_INVITED',
          hospitalId,
          tenantId: hospitalId,
          userEmail: 'admin@hospital.com',
        }),
      );

      // Verify Mail dispatch
      expect(mockMailService.sendStaffCredentials).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'dr.sharma@hospital.com',
          firstName: 'Rajesh',
          role: StaffRole.DOCTOR,
          temporaryPassword: result.temporaryPassword,
        }),
      );
    });

    it('should throw BadRequestException if email is already registered', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ _id: 'existing-id', email: 'duplicate@hospital.com' }),
      });

      await expect(
        service.inviteStaff(
          hospitalId,
          {
            firstName: 'Duplicate',
            lastName: 'User',
            email: 'duplicate@hospital.com',
            role: StaffRole.NURSE,
          },
          {
            userId: 'admin-1',
            email: 'admin@hospital.com',
          },
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockUserModel.create).not.toHaveBeenCalled();
      expect(mockMailService.sendStaffCredentials).not.toHaveBeenCalled();
    });
  });

  describe('findStaffByHospital', () => {
    it('should query users scoped to tenant hospitalId with pagination and filters', async () => {
      const mockUsers = [
        {
          _id: new Types.ObjectId(),
          email: 'nurse.mary@hospital.com',
          firstName: 'Mary',
          lastName: 'Jane',
          role: 'NURSE',
          department: 'Emergency',
          status: 'ACTIVE',
          createdAt: new Date(),
        },
      ];

      mockUserModel.find.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(mockUsers),
      });

      mockUserModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });

      const res = await service.findStaffByHospital(hospitalId, {
        role: 'NURSE',
        page: 1,
        limit: 10,
      });

      expect(res.total).toBe(1);
      expect(res.staff.length).toBe(1);
      expect(res.staff[0].email).toBe('nurse.mary@hospital.com');
      expect(res.staff[0].role).toBe('NURSE');
    });
  });
});
