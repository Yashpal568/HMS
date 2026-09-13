import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PatientsService } from './patients.service.js';
import {
  PatientGender,
  BloodGroup,
  MaritalStatus,
  AllergyCategory,
  AllergySeverity,
} from '@hms/types';

describe('PatientsService', () => {
  let service: PatientsService;
  let mockPatientModel: any;
  let mockCounterModel: any;
  let mockAuditService: any;

  const tenantA = new Types.ObjectId('65f1a1a1a1a1a1a1a1a1a1a1');
  const tenantB = new Types.ObjectId('65f2b2b2b2b2b2b2b2b2b2b2');
  const mockUserId = 'user-test-123';

  beforeEach(() => {
    mockCounterModel = {
      findOneAndUpdate: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue({ seq: 42 }),
      }),
    };

    mockAuditService = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    const mockPatientInstance = {
      _id: new Types.ObjectId('65f3c3c3c3c3c3c3c3c3c3c3'),
      tenantId: tenantA,
      uhid: 'UHID-2026-000042',
      name: { first: 'John', middle: 'H.', last: 'Doe' },
      dateOfBirth: new Date('1985-05-15'),
      gender: PatientGender.MALE,
      bloodGroup: BloodGroup.O_POSITIVE,
      maritalStatus: MaritalStatus.MARRIED,
      contacts: {
        phone: '+919876543210',
        email: 'john.doe@example.com',
        address: {
          street: '123 Health Ave',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
        },
      },
      emergencyContact: {
        name: 'Jane Doe',
        relationship: 'Spouse',
        phone: '+919876543211',
      },
      allergies: [
        {
          allergen: 'Penicillin',
          category: AllergyCategory.DRUG,
          severity: AllergySeverity.SEVERE,
          notes: 'Anaphylaxis risk',
        },
      ],
      status: 'active',
      createdAt: new Date('2026-09-11T12:00:00.000Z'),
      updatedAt: new Date('2026-09-11T12:00:00.000Z'),
      save: vi.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      }),
    };

    mockPatientModel = vi.fn().mockImplementation(function (dto: any) {
      return {
        ...mockPatientInstance,
        ...dto,
        save: vi.fn().mockResolvedValue({
          ...mockPatientInstance,
          ...dto,
        }),
      };
    });

    mockPatientModel.findOne = vi.fn();
    mockPatientModel.find = vi.fn();
    mockPatientModel.countDocuments = vi.fn();

    service = new PatientsService(
      mockPatientModel as any,
      mockCounterModel as any,
      mockAuditService as any,
    );
  });

  describe('generateNextUhid', () => {
    it('should atomically generate a zero-padded sequential UHID for the current year', async () => {
      const year = new Date().getFullYear();
      const uhid = await service.generateNextUhid(tenantA);

      expect(uhid).toBe(`UHID-${year}-000042`);
      expect(mockCounterModel.findOneAndUpdate).toHaveBeenCalledWith(
        { tenantId: tenantA, year },
        { $inc: { seq: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    });
  });

  describe('checkDuplicate', () => {
    it('should return hasDuplicate: true when matching phone and DOB exist in tenant', async () => {
      mockPatientModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId('65f3c3c3c3c3c3c3c3c3c3c3'),
          uhid: 'UHID-2026-000042',
          name: { first: 'John', last: 'Doe' },
          contacts: { phone: '+919876543210' },
          dateOfBirth: new Date('1985-05-15'),
        }),
      });

      const result = await service.checkDuplicate('+919876543210', '1985-05-15', tenantA);

      expect(result.hasDuplicate).toBe(true);
      expect(result.existingPatient?.uhid).toBe('UHID-2026-000042');
      expect(mockPatientModel.findOne).toHaveBeenCalledWith({
        tenantId: tenantA,
        'contacts.phone': '+919876543210',
        dateOfBirth: expect.any(Date),
      });
    });

    it('should return hasDuplicate: false when no matching patient exists', async () => {
      mockPatientModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const result = await service.checkDuplicate('+919999999999', '1990-01-01', tenantA);

      expect(result.hasDuplicate).toBe(false);
      expect(result.existingPatient).toBeUndefined();
    });

    it('should throw BadRequestException if date of birth is invalid', async () => {
      await expect(
        service.checkDuplicate('+919876543210', 'invalid-date', tenantA),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('create', () => {
    it('should create patient with atomic UHID and record security audit', async () => {
      const dto = {
        name: { first: 'Alice', last: 'Smith' },
        dateOfBirth: '1992-08-20',
        gender: PatientGender.FEMALE,
        bloodGroup: BloodGroup.B_POSITIVE,
        maritalStatus: MaritalStatus.SINGLE,
        contacts: {
          phone: '+919876500000',
          address: {
            street: '456 Clinic Way',
            city: 'Delhi',
            state: 'Delhi',
            postalCode: '110001',
            country: 'India',
          },
        },
        emergencyContact: {
          name: 'Bob Smith',
          relationship: 'Father',
          phone: '+919876500001',
        },
        allergies: [],
      };

      const result = await service.create(dto, tenantA, mockUserId);

      expect(result.uhid).toBeDefined();
      expect(result.name.first).toBe('Alice');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          action: 'PATIENT_CREATE',
          resource: 'patients',
          status: 'SUCCESS',
        }),
      );
    });
  });

  describe('findById (Tenant Isolation & Existence Masking)', () => {
    it('should return patient when found in matching tenant', async () => {
      const patientId = '65f3c3c3c3c3c3c3c3c3c3c3';
      mockPatientModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(patientId),
          tenantId: tenantA,
          uhid: 'UHID-2026-000042',
          name: { first: 'John', middle: 'H.', last: 'Doe' },
          dateOfBirth: new Date('1985-05-15'),
          gender: PatientGender.MALE,
          bloodGroup: BloodGroup.O_POSITIVE,
          maritalStatus: MaritalStatus.MARRIED,
          contacts: {
            phone: '+919876543210',
            address: { street: '', city: '', state: '', postalCode: '', country: '' },
          },
          emergencyContact: { name: '', relationship: '', phone: '' },
          allergies: [],
          status: 'active',
        }),
      });

      const result = await service.findById(patientId, tenantA, mockUserId);

      expect(result.id).toBe(patientId);
      expect(mockPatientModel.findOne).toHaveBeenCalledWith({
        _id: new Types.ObjectId(patientId),
        tenantId: tenantA,
      });
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PATIENT_ACCESS',
          resource: 'patients',
        }),
      );
    });

    it('should throw NotFoundException when querying entity belonging to another tenant (IDOR existence masking)', async () => {
      mockPatientModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      await expect(
        service.findById('65f3c3c3c3c3c3c3c3c3c3c3', tenantB),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated patient summaries scoped to caller tenant', async () => {
      mockPatientModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });

      mockPatientModel.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              exec: vi.fn().mockResolvedValue([
                {
                  _id: new Types.ObjectId('65f3c3c3c3c3c3c3c3c3c3c3'),
                  uhid: 'UHID-2026-000042',
                  name: { first: 'John', last: 'Doe' },
                  dateOfBirth: new Date('1985-05-15'),
                  gender: PatientGender.MALE,
                  bloodGroup: BloodGroup.O_POSITIVE,
                  contacts: {
                    phone: '+919876543210',
                    address: { city: 'Mumbai' },
                  },
                  allergies: [
                    {
                      allergen: 'Penicillin',
                      category: AllergyCategory.DRUG,
                      severity: AllergySeverity.SEVERE,
                    },
                  ],
                  status: 'active',
                  createdAt: new Date(),
                },
              ]),
            }),
          }),
        }),
      });

      const result = await service.findAll({ page: 1, limit: 10 }, tenantA);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.uhid).toBe('UHID-2026-000042');
      expect(result.data[0]?.hasSevereAllergies).toBe(true);
      expect(result.meta.total).toBe(1);
    });
  });
});
