import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { AppointmentsService } from './appointments.service.js';
import { AppointmentStatus, AppointmentType } from '@hms/types';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('AppointmentsService', () => {
  let appointmentsService: AppointmentsService;
  let mockAppointmentModel: any;
  let mockDoctorScheduleModel: any;
  let mockPatientModel: any;
  let mockUserModel: any;
  let mockAuditService: any;

  const sampleTenantId = new Types.ObjectId().toString();
  const sampleUserId = new Types.ObjectId().toString();
  const samplePatientId = new Types.ObjectId().toString();
  const sampleDoctorId = new Types.ObjectId().toString();

  beforeEach(() => {
    mockAppointmentModel = {
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              populate: vi.fn().mockReturnValue({
                populate: vi.fn().mockReturnValue({
                  lean: vi.fn().mockReturnValue({
                    exec: vi.fn().mockResolvedValue([]),
                  }),
                }),
              }),
            }),
          }),
        }),
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      findOne: vi.fn(),
      countDocuments: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(0),
      }),
      create: vi.fn(),
    };

    mockDoctorScheduleModel = {
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      findOne: vi.fn().mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue({
            startTime: '09:00',
            endTime: '11:00',
            slotDurationMinutes: 30,
            department: 'Cardiology',
            isActive: true,
          }),
        }),
      }),
      findOneAndUpdate: vi.fn().mockResolvedValue({
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '13:00',
      }),
    };

    mockPatientModel = {
      findOne: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(samplePatientId),
          tenantId: new Types.ObjectId(sampleTenantId),
          uhid: 'UHID-2026-000001',
          name: { first: 'Aarav', last: 'Sharma' },
        }),
      }),
    };

    mockUserModel = {
      findById: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(sampleDoctorId),
          firstName: 'Rajesh',
          lastName: 'Sharma',
          email: 'dr.sharma@hms.local',
          role: 'DOCTOR',
        }),
      }),
      find: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue([
              {
                _id: new Types.ObjectId(sampleDoctorId),
                firstName: 'Rajesh',
                lastName: 'Sharma',
                email: 'dr.sharma@hms.local',
                role: 'DOCTOR',
              },
            ]),
          }),
        }),
      }),
      create: vi.fn(),
    };

    mockAuditService = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    appointmentsService = new AppointmentsService(
      mockAppointmentModel,
      mockDoctorScheduleModel,
      mockPatientModel,
      mockUserModel,
      mockAuditService,
    );
  });

  it('should compute available time slots based on doctor schedule and exclude booked slots', async () => {
    // Return one existing booked appointment at 09:30 - 10:00
    mockAppointmentModel.find = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue([{ timeSlot: '09:30 - 10:00' }]),
        }),
      }),
    });

    const result = await appointmentsService.getAvailableSlots(
      sampleTenantId,
      sampleDoctorId,
      '2026-09-15',
    );

    expect(result.doctorName).toBe('Rajesh Sharma');
    expect(result.availableSlots).toHaveLength(4); // 09:00-09:30, 09:30-10:00, 10:00-10:30, 10:30-11:00
    expect(result.availableSlots[0]).toEqual({
      timeSlot: '09:00 - 09:30',
      isAvailable: true,
      reason: undefined,
    });
    // The booked slot should have isAvailable: false
    const booked = result.availableSlots.find((s) => s.timeSlot === '09:30 - 10:00');
    expect(booked?.isAvailable).toBe(false);
    expect(booked?.reason).toBe('Booked');
  });

  it('should increment token sequence sequentially per doctor per day', async () => {
    mockAppointmentModel.findOne = vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue({ tokenNumber: 4 }),
          }),
        }),
      }),
    });

    const nextToken = await appointmentsService.getNextToken(
      new Types.ObjectId(sampleTenantId),
      new Types.ObjectId(sampleDoctorId),
      new Date('2026-09-15'),
    );

    expect(nextToken).toBe(5);
  });

  it('should book an appointment, assign token number, and write audit log', async () => {
    // No conflicting slots, and return 0 for latest token
    mockAppointmentModel.findOne = vi.fn().mockImplementation((filter?: any) => {
      if (filter?._id) {
        return {
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              lean: vi.fn().mockReturnValue({
                exec: vi.fn().mockResolvedValue({
                  _id: filter._id,
                  tenantId: new Types.ObjectId(sampleTenantId),
                  patientId: { uhid: 'UHID-2026-000001', name: { first: 'Aarav', last: 'Sharma' } },
                  doctorId: { firstName: 'Rajesh', lastName: 'Sharma' },
                  tokenNumber: 1,
                  status: AppointmentStatus.SCHEDULED,
                  timeSlot: '09:00 - 09:30',
                }),
              }),
            }),
          }),
        };
      }
      if (filter?.timeSlot || filter?.patientId) {
        return null;
      }
      // For getNextToken which does .sort().select().lean().exec()
      return {
        sort: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            lean: vi.fn().mockReturnValue({
              exec: vi.fn().mockResolvedValue(null),
            }),
          }),
        }),
      };
    });

    mockAppointmentModel.create = vi.fn().mockResolvedValue({
      _id: new Types.ObjectId(),
      tokenNumber: 1,
    });

    const appointment = await appointmentsService.bookAppointment(sampleTenantId, sampleUserId, {
      patientId: samplePatientId,
      doctorId: sampleDoctorId,
      department: 'Cardiology',
      scheduledAt: '2026-09-15',
      timeSlot: '09:00 - 09:30',
      type: AppointmentType.NEW,
      chiefComplaint: 'Chest tightness',
    });

    expect(appointment).toBeDefined();
    expect(appointment.status).toBe(AppointmentStatus.SCHEDULED);
    expect(mockAuditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'APPOINTMENT_CREATE',
        status: 'SUCCESS',
      }),
    );
  });

  it('should reject booking with 404 when patient does not exist in tenant', async () => {
    mockPatientModel.findOne = vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    });

    await expect(
      appointmentsService.bookAppointment(sampleTenantId, sampleUserId, {
        patientId: samplePatientId,
        doctorId: sampleDoctorId,
        department: 'Cardiology',
        scheduledAt: '2026-09-15',
        timeSlot: '09:00 - 09:30',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should reject booking with 409 Conflict when slot is already booked for that doctor', async () => {
    mockAppointmentModel.findOne = vi.fn().mockResolvedValue({
      _id: new Types.ObjectId(),
      timeSlot: '09:00 - 09:30',
    });

    await expect(
      appointmentsService.bookAppointment(sampleTenantId, sampleUserId, {
        patientId: samplePatientId,
        doctorId: sampleDoctorId,
        department: 'Cardiology',
        scheduledAt: '2026-09-15',
        timeSlot: '09:00 - 09:30',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should transition appointment status to CHECKED_IN upon reception check-in', async () => {
    const mockAppt = {
      _id: new Types.ObjectId(),
      status: AppointmentStatus.SCHEDULED,
      tokenNumber: 2,
      save: vi.fn().mockResolvedValue(undefined),
    };

    mockAppointmentModel.findOne = vi.fn().mockImplementation((filter?: any) => {
      if (filter?._id && !filter?.populate) {
        return {
          exec: vi.fn().mockResolvedValue(mockAppt),
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              lean: vi.fn().mockReturnValue({
                exec: vi.fn().mockResolvedValue({
                  ...mockAppt,
                  status: AppointmentStatus.CHECKED_IN,
                }),
              }),
            }),
          }),
        };
      }
      return {
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            lean: vi.fn().mockReturnValue({
              exec: vi.fn().mockResolvedValue({
                ...mockAppt,
                status: AppointmentStatus.CHECKED_IN,
              }),
            }),
          }),
        }),
      };
    });

    const result = await appointmentsService.checkInAppointment(
      sampleTenantId,
      sampleUserId,
      mockAppt._id.toString(),
    );

    expect(result).toBeDefined();
    expect(mockAppt.status).toBe(AppointmentStatus.CHECKED_IN);
    expect(mockAppt.save).toHaveBeenCalled();
    expect(mockAuditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'APPOINTMENT_CHECKIN',
        status: 'SUCCESS',
      }),
    );
  });

  it('should reject cancellation without valid reason and transition status to CANCELLED', async () => {
    const apptId = new Types.ObjectId().toString();

    // Rejection when reason is too short
    await expect(
      appointmentsService.cancelAppointment(sampleTenantId, sampleUserId, apptId, 'no'),
    ).rejects.toThrow(BadRequestException);

    const mockAppt = {
      _id: new Types.ObjectId(apptId),
      status: AppointmentStatus.SCHEDULED,
      tokenNumber: 3,
      save: vi.fn().mockResolvedValue(undefined),
    };

    mockAppointmentModel.findOne = vi.fn().mockImplementation((_filter?: any) => {
      return {
        exec: vi.fn().mockResolvedValue(mockAppt),
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            lean: vi.fn().mockReturnValue({
              exec: vi.fn().mockResolvedValue({
                ...mockAppt,
                status: AppointmentStatus.CANCELLED,
              }),
            }),
          }),
        }),
      };
    });

    const cancelled = await appointmentsService.cancelAppointment(
      sampleTenantId,
      sampleUserId,
      apptId,
      'Patient requested reschedule due to travel',
    );

    expect(cancelled).toBeDefined();
    expect(mockAppt.status).toBe(AppointmentStatus.CANCELLED);
    expect(mockAuditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'APPOINTMENT_CANCEL',
        status: 'SUCCESS',
      }),
    );
  });

  it('should throw uniform 404 when querying appointment belonging to another tenant', async () => {
    mockAppointmentModel.findOne = vi.fn().mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(null),
          }),
        }),
      }),
    });

    await expect(
      appointmentsService.getAppointmentById(sampleTenantId, new Types.ObjectId().toString()),
    ).rejects.toThrow(NotFoundException);
  });
});
