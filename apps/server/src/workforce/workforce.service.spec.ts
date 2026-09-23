import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { WorkforceService } from './workforce.service.js';
import {
  StaffType,
  ShiftType,
  AttendanceStatus,
  AttendanceCorrectionStatus,
  LeaveType,
  LeaveStatus,
} from '@hms/types';

describe('WorkforceService', () => {
  let service: WorkforceService;
  let mockEmployeeModel: any;
  let mockScheduleModel: any;
  let mockAttendanceModel: any;
  let mockLeaveModel: any;
  let mockUserModel: any;

  const tenantId = new Types.ObjectId().toString();
  const employeeId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();

  beforeEach(() => {
    mockEmployeeModel = {
      find: vi.fn(),
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      countDocuments: vi.fn(),
    };

    mockScheduleModel = {
      find: vi.fn(),
      findOne: vi.fn(),
      findById: vi.fn(),
    };

    mockAttendanceModel = {
      find: vi.fn(),
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
    };

    mockLeaveModel = {
      find: vi.fn(),
      findOne: vi.fn(),
    };

    mockUserModel = {
      findOne: vi.fn(),
      updateOne: vi.fn(),
    };

    service = new WorkforceService(
      mockEmployeeModel as any,
      mockScheduleModel as any,
      mockAttendanceModel as any,
      mockLeaveModel as any,
      mockUserModel as any,
    );
  });

  describe('Employee Management', () => {
    it('should create employee with auto-generated sequential employee ID', async () => {
      mockEmployeeModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });
      mockEmployeeModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(4),
      });

      const mockSaved = {
        _id: new Types.ObjectId(),
        employeeId: `EMP-${new Date().getFullYear()}-0005`,
        firstName: 'Anita',
        lastName: 'Roy',
        email: 'anita.roy@hospital.local',
        staffType: StaffType.NURSE,
      };

      (service as any).employeeModel = vi.fn().mockImplementation(function (dto: any) {
        return {
          ...dto,
          save: vi.fn().mockResolvedValue({ ...dto, _id: mockSaved._id }),
        };
      });
      (service as any).employeeModel.findOne = mockEmployeeModel.findOne;
      (service as any).employeeModel.countDocuments = mockEmployeeModel.countDocuments;

      const result = await service.createEmployee(tenantId, {
        firstName: 'Anita',
        lastName: 'Roy',
        email: 'anita.roy@hospital.local',
        designation: 'Staff Nurse',
        staffType: StaffType.NURSE,
      });

      expect(result.employeeId).toBe(`EMP-${new Date().getFullYear()}-0005`);
    });
  });

  describe('Workforce Scheduling', () => {
    it('should mark isOvernight as true when shift spans midnight (22:00 to 06:00)', async () => {
      mockEmployeeModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ _id: new Types.ObjectId(employeeId) }),
      });

      let capturedDoc: any;
      (service as any).scheduleModel = vi.fn().mockImplementation(function (dto: any) {
        capturedDoc = {
          ...dto,
          save: vi.fn().mockResolvedValue(dto),
        };
        return capturedDoc;
      });
      (service as any).scheduleModel.findOne = mockScheduleModel.findOne;

      await service.createSchedule(tenantId, {
        employeeId,
        shiftType: ShiftType.NIGHT,
        startTime: '22:00',
        endTime: '06:00',
        daysOfWeek: [1, 2, 3, 4, 5],
        effectiveFrom: '2026-09-01',
      });

      expect(capturedDoc.isOvernight).toBe(true);
    });
  });

  describe('Attendance & Corrections', () => {
    it('should create attendance record with LATE status if checked in > 15 mins after shift start', async () => {
      mockEmployeeModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ _id: new Types.ObjectId(employeeId) }),
      });
      mockAttendanceModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      // Shift started at 00:00 (definitely > 15 mins ago)
      mockScheduleModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ _id: new Types.ObjectId(), startTime: '00:00', endTime: '08:00' }),
      });

      let capturedDoc: any;
      (service as any).attendanceModel = vi.fn().mockImplementation(function (dto: any) {
        capturedDoc = {
          ...dto,
          save: vi.fn().mockResolvedValue(dto),
        };
        return capturedDoc;
      });
      (service as any).attendanceModel.findOne = mockAttendanceModel.findOne;

      await service.checkIn(tenantId, { employeeId });

      expect(capturedDoc.status).toBe(AttendanceStatus.LATE);
      expect(capturedDoc.lateMinutes).toBeGreaterThan(15);
    });

    it('should update correction status and apply corrected times when approved', async () => {
      const attendanceId = new Types.ObjectId().toString();
      const correctedTime = new Date('2026-09-23T08:30:00Z');

      const mockRecord = {
        _id: new Types.ObjectId(attendanceId),
        tenantId: new Types.ObjectId(tenantId),
        checkInTime: new Date('2026-09-23T09:45:00Z'),
        status: AttendanceStatus.LATE,
        correction: {
          correctedCheckIn: correctedTime,
          reason: 'Biometric reader offline',
          status: AttendanceCorrectionStatus.PENDING,
        },
        save: vi.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      };

      mockAttendanceModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockRecord),
      });

      const result = await service.reviewCorrection(tenantId, attendanceId, userId, {
        action: 'APPROVE',
        reviewNote: 'Verified with security desk',
      });

      expect(result.correction!.status).toBe(AttendanceCorrectionStatus.APPROVED);
      expect(result.checkInTime).toEqual(correctedTime);
      expect(result.status).toBe(AttendanceStatus.PRESENT);
    });
  });

  describe('Leave Management & Attendance Integration', () => {
    it('should approve leave and mark attendance as ON_LEAVE across all dates in range', async () => {
      const requestId = new Types.ObjectId().toString();
      const mockLeave = {
        _id: new Types.ObjectId(requestId),
        tenantId: new Types.ObjectId(tenantId),
        employeeId: new Types.ObjectId(employeeId),
        leaveType: LeaveType.ANNUAL,
        startDate: '2026-10-01',
        endDate: '2026-10-03',
        status: LeaveStatus.PENDING,
        save: vi.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      };

      mockLeaveModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockLeave),
      });
      mockAttendanceModel.findOneAndUpdate.mockResolvedValue({});

      const result = await service.reviewLeaveRequest(tenantId, requestId, userId, {
        action: 'APPROVE',
      });

      expect(result.status).toBe(LeaveStatus.APPROVED);
      // October 1, 2, 3 = 3 days marked
      expect(mockAttendanceModel.findOneAndUpdate).toHaveBeenCalledTimes(3);
    });
  });
});
