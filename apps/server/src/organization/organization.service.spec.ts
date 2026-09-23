import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { OrganizationService } from './organization.service.js';
import { OnboardingStep } from '@hms/types';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let mockDepartmentModel: any;
  let mockTeamModel: any;
  let mockOnboardingModel: any;

  const tenantId = new Types.ObjectId().toString();

  beforeEach(() => {
    mockDepartmentModel = {
      find: vi.fn(),
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      insertMany: vi.fn(),
    };

    mockTeamModel = {
      find: vi.fn(),
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
    };

    mockOnboardingModel = {
      findOne: vi.fn(),
    };

    service = new OrganizationService(
      mockDepartmentModel as any,
      mockTeamModel as any,
      mockOnboardingModel as any,
    );
  });

  describe('getDepartments', () => {
    it('should return existing departments when available', async () => {
      const mockDepts = [{ name: 'Cardiology', code: 'CARDIO' }];
      mockDepartmentModel.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockDepts),
        }),
      });

      const result = await service.getDepartments(tenantId);
      expect(result).toEqual(mockDepts);
      expect(mockDepartmentModel.insertMany).not.toHaveBeenCalled();
    });

    it('should auto-seed default departments when none exist for tenant', async () => {
      mockDepartmentModel.find
        .mockReturnValueOnce({
          sort: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue([]),
          }),
        })
        .mockReturnValueOnce({
          sort: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue([{ name: 'Outpatient Department', code: 'OPD' }]),
          }),
        });
      mockDepartmentModel.insertMany.mockResolvedValue([]);

      const result = await service.getDepartments(tenantId);
      expect(mockDepartmentModel.insertMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('onboarding', () => {
    it('should initialize onboarding state if none exists', async () => {
      mockOnboardingModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      // Mock constructor
      const mockInstance = {
        save: vi.fn().mockResolvedValue({
          tenantId: new Types.ObjectId(tenantId),
          currentStep: OnboardingStep.PROFILE,
          completedSteps: [],
          completionPercentage: 0,
        }),
      };
      (service as any).onboardingModel = vi.fn().mockImplementation(function (this: any) {
        Object.assign(this, mockInstance);
        this.save = mockInstance.save;
        return this;
      });
      (service as any).onboardingModel.findOne = mockOnboardingModel.findOne;

      const result = await service.getOnboardingState(tenantId);
      expect(result).toBeDefined();
    });
  });
});
