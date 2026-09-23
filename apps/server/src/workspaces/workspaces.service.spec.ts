import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { WorkspacesService, STANDARD_WORKSPACES } from './workspaces.service.js';

describe('WorkspacesService', () => {
  let service: WorkspacesService;
  let mockUserModel: any;
  let mockEmployeeModel: any;
  let mockDepartmentModel: any;

  const tenantId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();

  beforeEach(() => {
    mockUserModel = {
      findOne: vi.fn(),
    };
    mockEmployeeModel = {
      findOne: vi.fn(),
    };
    mockDepartmentModel = {
      findOne: vi.fn(),
    };

    service = new WorkspacesService(
      mockUserModel as any,
      mockEmployeeModel as any,
      mockDepartmentModel as any,
    );
  });

  describe('getTemplates', () => {
    it('should return all standard hospital workspace templates', () => {
      const templates = service.getTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(8);
      const codes = templates.map((t) => t.code);
      expect(codes).toContain('HOSPITAL_ADMIN');
      expect(codes).toContain('DOCTOR');
      expect(codes).toContain('PHARMACIST');
      expect(codes).toContain('LAB_TECHNICIAN');
    });
  });

  describe('resolveUserWorkspaces', () => {
    it('should resolve assigned workspaces and department context for linked employee', async () => {
      const mockUser = {
        _id: new Types.ObjectId(userId),
        email: 'doctor@hms.local',
        role: 'DOCTOR',
        permissions: ['emr.read', 'emr.create'],
        employeeId: new Types.ObjectId(),
      };

      const mockEmployee = {
        _id: mockUser.employeeId,
        employeeId: 'EMP-2026-0001',
        firstName: 'Rahul',
        lastName: 'Sharma',
        designation: 'Senior Cardiologist',
        departmentId: { _id: new Types.ObjectId(), name: 'Cardiology' },
        assignedWorkspaces: ['DOCTOR', 'DEPARTMENT_MANAGER'],
        accessScope: 'DEPARTMENT_ONLY',
      };

      mockUserModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockUser),
      });

      mockEmployeeModel.findOne.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(mockEmployee),
          }),
        }),
      });

      const context = await service.resolveUserWorkspaces(tenantId, userId);

      expect(context.userId).toBe(userId);
      expect(context.employee?.designation).toBe('Senior Cardiologist');
      expect(context.availableWorkspaces).toHaveLength(2);
      expect(context.availableWorkspaces.map((w) => w.code)).toEqual([
        'DOCTOR',
        'DEPARTMENT_MANAGER',
      ]);
      expect(context.scope).toBe('DEPARTMENT_ONLY');
    });

    it('should grant preview access to all workspaces for HOSPITAL_ADMIN', async () => {
      const mockAdminUser = {
        _id: new Types.ObjectId(userId),
        email: 'admin@hms.local',
        role: 'HOSPITAL_ADMIN',
        permissions: ['*'],
      };

      mockUserModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockAdminUser),
      });
      mockEmployeeModel.findOne.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(null),
          }),
        }),
      });

      const context = await service.resolveUserWorkspaces(tenantId, userId);

      expect(context.availableWorkspaces.length).toBe(
        Object.keys(STANDARD_WORKSPACES).length,
      );
      expect(context.activeWorkspace.code).toBe('HOSPITAL_ADMIN');
    });
  });
});
