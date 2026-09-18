import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmrService } from './emr.service.js';
import { EncounterStatus, AppointmentStatus, DiagnosisType, DiagnosisStatus } from '@hms/types';
import { Types } from 'mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('EmrService', () => {
  let service: EmrService;

  const mockEncounterModel: any = vi.fn();
  const mockPrescriptionModel: any = vi.fn();
  const mockAppointmentModel: any = {
    findOne: vi.fn(),
    updateOne: vi.fn(),
    findById: vi.fn(),
  };
  const mockPatientModel: any = {
    findOne: vi.fn(),
    findById: vi.fn(),
  };
  const mockUserModel: any = {
    findOne: vi.fn(),
    findById: vi.fn(),
  };
  const mockAuditService: any = {
    record: vi.fn().mockResolvedValue(undefined),
  };

  const tenantId = new Types.ObjectId().toString();
  const doctorId = new Types.ObjectId().toString();
  const patientId = new Types.ObjectId().toString();
  const appointmentId = new Types.ObjectId().toString();
  const encounterId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();

    mockEncounterModel.findOne = vi.fn();
    mockEncounterModel.findById = vi.fn();
    mockEncounterModel.find = vi.fn();

    mockPrescriptionModel.findOne = vi.fn();
    mockPrescriptionModel.find = vi.fn();

    service = new EmrService(
      mockEncounterModel,
      mockPrescriptionModel,
      mockAppointmentModel,
      mockPatientModel,
      mockUserModel,
      mockAuditService,
    );
  });

  describe('calculateBmi', () => {
    it('should accurately calculate normal BMI and category', () => {
      const result = service.calculateBmi(70, 175);
      expect(result.bmi).toBe(22.9);
      expect(result.category).toBe('normal');
    });

    it('should classify underweight BMI', () => {
      const result = service.calculateBmi(45, 170);
      expect(result.bmi).toBe(15.6);
      expect(result.category).toBe('underweight');
    });

    it('should classify overweight BMI', () => {
      const result = service.calculateBmi(80, 170);
      expect(result.bmi).toBe(27.7);
      expect(result.category).toBe('overweight');
    });

    it('should classify obese BMI', () => {
      const result = service.calculateBmi(105, 170);
      expect(result.bmi).toBe(36.3);
      expect(result.category).toBe('obese');
    });

    it('should return empty object for invalid/missing vitals', () => {
      expect(service.calculateBmi(0, 170)).toEqual({});
      expect(service.calculateBmi(70, 0)).toEqual({});
      expect(service.calculateBmi(undefined, undefined)).toEqual({});
    });
  });

  describe('checkAllergyContraindications', () => {
    it('should detect direct allergy conflict in prescribed medicines', () => {
      const allergies = [
        { allergen: 'Penicillin', severity: 'severe', reaction: 'Anaphylaxis' },
      ];
      const items = [
        { medicineName: 'Penicillin V 250mg' },
        { medicineName: 'Paracetamol 500mg' },
      ];

      const warnings = service.checkAllergyContraindications(allergies, items);
      expect(warnings.length).toBe(1);
      expect(warnings[0]).toContain('Penicillin');
      expect(warnings[0]).toContain('Anaphylaxis');
    });

    it('should return empty array when no allergies conflict', () => {
      const allergies = [
        { allergen: 'Sulfa drugs', severity: 'mild', reaction: 'Rash' },
      ];
      const items = [{ medicineName: 'Paracetamol 500mg' }];

      const warnings = service.checkAllergyContraindications(allergies, items);
      expect(warnings).toEqual([]);
    });
  });

  describe('startOrGetEncounter', () => {
    it('should create draft encounter and transition appointment to in_consultation', () => {
      const mockAppointment = {
        _id: new Types.ObjectId(appointmentId),
        tenantId: new Types.ObjectId(tenantId),
        patientId: new Types.ObjectId(patientId),
        status: AppointmentStatus.CHECKED_IN,
        chiefComplaint: 'Severe headache and fever',
        save: vi.fn().mockResolvedValue(true),
        toObject: () => ({ _id: appointmentId, status: AppointmentStatus.IN_CONSULTATION }),
      };

      mockAppointmentModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockAppointment),
      });

      // No existing encounter
      mockEncounterModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const mockSavedEncounter = {
        _id: new Types.ObjectId(encounterId),
        tenantId: new Types.ObjectId(tenantId),
        appointmentId: new Types.ObjectId(appointmentId),
        patientId: new Types.ObjectId(patientId),
        doctorId: new Types.ObjectId(doctorId),
        status: EncounterStatus.DRAFT,
        chiefComplaints: ['Severe headache and fever'],
        save: vi.fn().mockResolvedValue(true),
        toObject: () => ({ _id: encounterId, status: EncounterStatus.DRAFT }),
      };

      // Mock constructor behavior
      mockEncounterModel.mockImplementation(function (this: any) {
        return mockSavedEncounter;
      });

      mockPatientModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(patientId),
          allergies: [],
          toObject: () => ({ _id: patientId, allergies: [] }),
        }),
      });

      mockPrescriptionModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      return service.startOrGetEncounter(tenantId, doctorId, appointmentId).then((result) => {
        expect(result.encounter).toBeDefined();
        expect(result.encounter.status).toBe(EncounterStatus.DRAFT);
        expect(mockAppointment.status).toBe(AppointmentStatus.IN_CONSULTATION);
        expect(mockAppointment.save).toHaveBeenCalled();
        expect(mockAuditService.record).toHaveBeenCalledWith(
          expect.objectContaining({ action: 'ENCOUNTER_START' }),
        );
      });
    });

    it('should throw NotFoundException if appointment does not exist in tenant', async () => {
      mockAppointmentModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      await expect(
        service.startOrGetEncounter(tenantId, doctorId, appointmentId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if appointment is cancelled', async () => {
      mockAppointmentModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          status: AppointmentStatus.CANCELLED,
        }),
      });

      await expect(
        service.startOrGetEncounter(tenantId, doctorId, appointmentId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateEncounter', () => {
    it('should reject update if encounter is already finalized', async () => {
      mockEncounterModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(encounterId),
          status: EncounterStatus.FINALIZED,
        }),
      });

      await expect(
        service.updateEncounter(tenantId, doctorId, encounterId, {
          chiefComplaints: ['New complaint'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update vitals and compute BMI on draft encounter', async () => {
      const mockEncounter = {
        _id: new Types.ObjectId(encounterId),
        patientId: new Types.ObjectId(patientId),
        status: EncounterStatus.DRAFT,
        vitals: { toObject: () => ({ bpSystolic: 120 }) },
        chiefComplaints: [],
        save: vi.fn().mockResolvedValue(true),
        toObject: () => ({
          _id: encounterId,
          status: EncounterStatus.DRAFT,
          vitals: { bpSystolic: 130, weight: 70, height: 175, bmi: 22.9, bmiCategory: 'normal' },
        }),
      };

      mockEncounterModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockEncounter),
      });

      mockPrescriptionModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      mockPatientModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ allergies: [] }),
      });

      const result = await service.updateEncounter(tenantId, doctorId, encounterId, {
        vitals: { bpSystolic: 130, bpDiastolic: 85, weight: 70, height: 175 },
      });

      expect(result).toBeDefined();
      expect(mockEncounter.save).toHaveBeenCalled();
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ENCOUNTER_UPDATE' }),
      );
    });
  });

  describe('finalizeEncounter', () => {
    it('should require at least one diagnosis to finalize', async () => {
      const mockEncounter = {
        _id: new Types.ObjectId(encounterId),
        status: EncounterStatus.DRAFT,
        diagnoses: [],
      };

      mockEncounterModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockEncounter),
      });
      mockEncounterModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockEncounter),
      });

      await expect(
        service.finalizeEncounter(tenantId, doctorId, encounterId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should finalize encounter, lock document, and complete appointment', async () => {
      const mockEncounter: any = {
        _id: new Types.ObjectId(encounterId),
        appointmentId: new Types.ObjectId(appointmentId),
        patientId: new Types.ObjectId(patientId),
        status: EncounterStatus.DRAFT,
        diagnoses: [
          {
            code: 'J06.9',
            description: 'Acute upper respiratory infection',
            type: DiagnosisType.PRIMARY,
            status: DiagnosisStatus.CONFIRMED,
          },
        ],
        finalizedAt: undefined,
        save: vi.fn().mockResolvedValue(true),
        toObject: () => ({ _id: encounterId, status: EncounterStatus.FINALIZED }),
      };

      mockEncounterModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockEncounter),
      });
      mockEncounterModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockEncounter),
      });
      mockPrescriptionModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });
      mockAppointmentModel.updateOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
      });
      mockAppointmentModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(appointmentId),
          toObject: () => ({ _id: appointmentId, status: AppointmentStatus.COMPLETED }),
        }),
      });
      mockPatientModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });
      mockUserModel.findOne.mockReturnValue({
        select: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(null) }),
      });

      const result = await service.finalizeEncounter(tenantId, doctorId, encounterId);

      expect(result).toBeDefined();
      expect(mockEncounter.status).toBe(EncounterStatus.FINALIZED);
      expect(mockEncounter.finalizedAt).toBeDefined();
      expect(mockAppointmentModel.updateOne).toHaveBeenCalledWith(
        { _id: mockEncounter.appointmentId, tenantId: expect.any(Types.ObjectId) },
        { $set: { status: AppointmentStatus.COMPLETED } },
      );
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ENCOUNTER_FINALIZE' }),
      );
    });
  });
});
