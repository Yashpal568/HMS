export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  HOSPITAL_ADMIN = 'HOSPITAL_ADMIN',
  DOCTOR = 'DOCTOR',
  NURSE = 'NURSE',
  RECEPTIONIST = 'RECEPTIONIST',
  LAB_TECHNICIAN = 'LAB_TECHNICIAN',
  PHARMACIST = 'PHARMACIST',
  ACCOUNTANT = 'ACCOUNTANT',
  INVENTORY_MANAGER = 'INVENTORY_MANAGER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: string[];
  status: UserStatus;
  hospitalId?: string;
  branchId?: string;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user: UserSummary;
  accessToken: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  meta?: PaginationMeta;
  error?: {
    code: string;
    message: string;
    requestId?: string;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DashboardAuditItem {
  id: string;
  action: string;
  resource: string;
  status: string;
  timestamp: string;
  ipAddress?: string;
  userEmail?: string;
}

export interface ModuleReadinessItem {
  key: string;
  name: string;
  category: 'Overview' | 'Clinical' | 'Operations' | 'Finance' | 'Administration' | 'Security';
  status: 'active' | 'scheduled' | 'in_development';
  route: string;
  description: string;
  targetMilestone: string;
}

export interface PatientAnalyticsSummary {
  totalPatients: number;
  activePatients: number;
  genderBreakdown: {
    male: number;
    female: number;
    other: number;
  };
  bloodGroupBreakdown: Record<string, number>;
  allergiesRecorded: number;
  recentIntakeTrend: { day: string; date: string; count: number }[];
}

export interface DashboardSummary {
  system: {
    status: 'operational' | 'degraded' | 'maintenance';
    database: string;
    version: string;
    uptimeSeconds: number;
    timestamp: string;
  };
  authAndUsers: {
    totalUsers: number;
    activeUsers: number;
    lockedUsers: number;
    roleBreakdown: Record<string, number>;
  };
  patients?: PatientAnalyticsSummary;
  recentAuditActivity: DashboardAuditItem[];
  moduleReadiness: ModuleReadinessItem[];
  clinicalOverview: {
    todayAppointments: { count: number; note: string };
    activeAdmissions: { count: number; note: string };
    pendingLabOrders: { count: number; note: string };
    lowStockAlerts: { count: number; note: string };
    pendingInvoices: { count: number; note: string };
    beds?: { total: number; occupied: number; available: number };
  };
}

/* =========================================================================
   Patient Management Domain Models (Milestone 03)
========================================================================= */

export enum PatientGender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum BloodGroup {
  A_POSITIVE = 'A+',
  A_NEGATIVE = 'A-',
  B_POSITIVE = 'B+',
  B_NEGATIVE = 'B-',
  AB_POSITIVE = 'AB+',
  AB_NEGATIVE = 'AB-',
  O_POSITIVE = 'O+',
  O_NEGATIVE = 'O-',
  UNKNOWN = 'unknown',
}

export enum MaritalStatus {
  SINGLE = 'single',
  MARRIED = 'married',
  DIVORCED = 'divorced',
  WIDOWED = 'widowed',
}

export enum PatientStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DECEASED = 'deceased',
}

export enum AllergySeverity {
  MILD = 'mild',
  MODERATE = 'moderate',
  SEVERE = 'severe',
}

export enum AllergyCategory {
  DRUG = 'drug',
  FOOD = 'food',
  ENVIRONMENTAL = 'environmental',
  OTHER = 'other',
}

export interface PatientName {
  first: string;
  middle?: string;
  last: string;
}

export interface PatientAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface PatientContacts {
  phone: string;
  alternatePhone?: string;
  email?: string;
  address: PatientAddress;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface PatientAllergy {
  allergen: string;
  category: AllergyCategory;
  severity: AllergySeverity;
  notes?: string;
}

export interface Patient {
  id: string;
  _id?: string;
  tenantId: string;
  uhid: string;
  name: PatientName;
  dateOfBirth: string;
  gender: PatientGender;
  bloodGroup: BloodGroup;
  maritalStatus: MaritalStatus;
  contacts: PatientContacts;
  emergencyContact: EmergencyContact;
  allergies: PatientAllergy[];
  status: PatientStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface PatientSummary {
  id: string;
  _id?: string;
  uhid: string;
  name: PatientName;
  dateOfBirth: string;
  gender: PatientGender;
  bloodGroup: BloodGroup;
  phone: string;
  city?: string;
  status: PatientStatus;
  allergyCount: number;
  hasSevereAllergies: boolean;
  contacts?: PatientContacts;
  createdAt: string;
}

export interface CreatePatientPayload {
  name: PatientName;
  dateOfBirth: string;
  gender: PatientGender;
  bloodGroup?: BloodGroup;
  maritalStatus?: MaritalStatus;
  contacts: PatientContacts;
  emergencyContact: EmergencyContact;
  allergies?: PatientAllergy[];
}

export interface UpdatePatientPayload {
  name?: Partial<PatientName>;
  dateOfBirth?: string;
  gender?: PatientGender;
  bloodGroup?: BloodGroup;
  maritalStatus?: MaritalStatus;
  contacts?: Partial<PatientContacts>;
  emergencyContact?: Partial<EmergencyContact>;
  allergies?: PatientAllergy[];
  status?: PatientStatus;
}

export interface DuplicateCheckResult {
  hasDuplicate: boolean;
  existingPatient?: {
    id: string;
    uhid: string;
    name: PatientName;
    phone: string;
    dateOfBirth: string;
  };
}

/* =========================================================================
   Appointments & OPD Queue Domain Models (Milestone 04)
========================================================================= */

export enum DayOfWeek {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CHECKED_IN = 'CHECKED_IN',
  IN_CONSULTATION = 'IN_CONSULTATION',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum AppointmentType {
  NEW = 'NEW',
  FOLLOW_UP = 'FOLLOW_UP',
  WALK_IN = 'WALK_IN',
  ROUTINE_CHECKUP = 'ROUTINE_CHECKUP',
  EMERGENCY = 'EMERGENCY',
}

export interface DoctorSchedule {
  id: string;
  _id?: string;
  tenantId: string;
  doctorId: string;
  doctorName?: string;
  department: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday ... 6 = Saturday
  startTime: string; // e.g. "09:00"
  endTime: string; // e.g. "13:00"
  slotDurationMinutes: number; // default 15
  maxPatients: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DoctorUserSummary {
  id: string;
  _id?: string;
  name: string;
  email: string;
  department: string;
  role: string;
  username?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    specialization?: string;
  };
}

export interface AvailableSlot {
  timeSlot: string; // e.g. "09:00 - 09:15"
  isAvailable: boolean;
  reason?: string;
}

export interface Appointment {
  id: string;
  _id?: string;
  tenantId: string;
  hospitalId?: string;
  patientId: string;
  doctorId: string;
  department: string;
  tokenNumber: number;
  scheduledAt: string; // ISO date string
  timeSlot: string; // e.g. "10:30 - 10:45"
  type: AppointmentType;
  status: AppointmentStatus;
  chiefComplaint?: string;
  notes?: string;
  checkedInAt?: string;
  cancelledReason?: string;
  cancellationReason?: string;
  patient?: PatientSummary;
  doctor?: DoctorUserSummary;
  createdAt: string;
  updatedAt: string;
}

export interface BookAppointmentPayload {
  patientId: string;
  doctorId: string;
  department: string;
  scheduledAt: string; // "YYYY-MM-DD"
  timeSlot: string; // "10:30 - 10:45"
  type?: AppointmentType;
  chiefComplaint?: string;
}

export interface CancelAppointmentPayload {
  reason: string;
}

export interface DoctorSchedulePayload {
  doctorId: string;
  department: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes?: number;
  maxPatients?: number;
  isActive?: boolean;
}

export interface AppointmentQueryPayload {
  date?: string; // "YYYY-MM-DD"
  doctorId?: string;
  department?: string;
  status?: AppointmentStatus;
  patientId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ==========================================
// Enterprise OPD Queue Engine Domain Types
// ==========================================

export enum QueueEntryStatus {
  WAITING = 'waiting',
  CALLED = 'called',
  IN_CONSULTATION = 'in_consultation',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
  CANCELLED = 'cancelled',
}

export enum QueuePriority {
  NORMAL = 'normal',
  URGENT = 'urgent',
  EMERGENCY = 'emergency',
}

export enum QueueStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
}

export enum QueueSession {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  EVENING = 'evening',
  NIGHT = 'night',
}

export enum QueueEventType {
  ENTRY_CHECKED_IN = 'queue.entry_checked_in',
  ENTRY_CALLED = 'queue.entry_called',
  CONSULTATION_STARTED = 'queue.consultation_started',
  CONSULTATION_COMPLETED = 'queue.consultation_completed',
  ENTRY_SKIPPED = 'queue.entry_skipped',
  ENTRY_CANCELLED = 'queue.entry_cancelled',
}

export interface Queue {
  id: string;
  _id?: string;
  tenantId: string;
  hospitalId?: string;
  department: string;
  doctorId: string;
  date: string; // YYYY-MM-DD
  session: QueueSession;
  status: QueueStatus;
  currentServingToken?: number | string;
  currentServingEntryId?: string;
  totalTokensIssued: number;
  totalCompleted: number;
  totalSkipped: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface QueueEntry {
  id: string;
  _id?: string;
  tenantId: string;
  queueId: string;
  patientId: string;
  appointmentId?: string;
  encounterId?: string;
  doctorId: string;
  department: string;
  date: string; // YYYY-MM-DD
  tokenNumber: number;
  formattedToken: string; // e.g. "A-021"
  priority: QueuePriority;
  priorityWeight: number; // 0 for NORMAL, 10 for URGENT, 50 for EMERGENCY
  status: QueueEntryStatus;
  chiefComplaint?: string;
  triageNotes?: string;
  checkedInAt: string;
  calledAt?: string;
  consultationStartedAt?: string;
  completedAt?: string;
  skippedAt?: string;
  estimatedWaitMinutes?: number;
  patient?: PatientSummary;
  doctor?: DoctorUserSummary;
  createdAt?: string;
  updatedAt?: string;
}

export interface CallNextPatientPayload {
  date?: string;
  session?: QueueSession;
}

export interface CheckInQueuePayload {
  appointmentId?: string;
  patientId: string;
  doctorId: string;
  department: string;
  priority?: QueuePriority;
  chiefComplaint?: string;
  triageNotes?: string;
  date?: string;
  session?: QueueSession;
}

// ==========================================
// Milestone 05: EMR & Clinical Consultation Types
// ==========================================

export enum EncounterType {
  OPD = 'opd',
  EMERGENCY = 'emergency',
  IPD = 'ipd',
  TELECONSULT = 'teleconsult',
}

export enum EncounterStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  FINALIZED = 'finalized',
  CANCELLED = 'cancelled',
}

export enum DiagnosisType {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
}

export enum DiagnosisStatus {
  PROVISIONAL = 'provisional',
  CONFIRMED = 'confirmed',
}

export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese';

export interface Vitals {
  bpSystolic?: number;
  bpDiastolic?: number;
  pulse?: number;
  temperature?: number;
  respiratoryRate?: number;
  spO2?: number;
  weight?: number; // in kg
  height?: number; // in cm
  bmi?: number;
  bmiCategory?: BmiCategory;
}

export interface Diagnosis {
  code: string; // e.g. ICD-10 code (J06.9)
  description: string;
  type: DiagnosisType;
  status: DiagnosisStatus;
}

export interface InvestigationOrder {
  testName: string;
  notes?: string;
  urgency: 'routine' | 'urgent';
}

export enum PrescriptionStatus {
  ACTIVE = 'active',
  PARTIALLY_DISPENSED = 'partially_dispensed',
  DISPENSED = 'dispensed',
  CANCELLED = 'cancelled',
}

export interface PrescriptionItem {
  medicineName: string;
  dosageForm: string; // 'tablet' | 'capsule' | 'syrup' | 'injection' | 'ointment' | 'drops' | 'inhaler'
  strength: string; // e.g. '500mg'
  frequency: string; // e.g. '1-0-1', 'OD', 'BD', 'TID', 'PRN', 'SOS'
  route: string; // 'oral' | 'topical' | 'subcutaneous' | 'intravenous' | 'inhalation'
  durationDays: number;
  quantity: number;
  instructions: string; // e.g. 'After meals'
}

export interface Prescription {
  id: string;
  _id?: string;
  tenantId: string;
  encounterId: string;
  patientId: string;
  doctorId: string;
  status: PrescriptionStatus;
  items: PrescriptionItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Encounter {
  id: string;
  _id?: string;
  tenantId: string;
  hospitalId?: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  status: EncounterStatus;
  vitals: Vitals;
  chiefComplaints: string[];
  historyOfPresentIllness?: string;
  examinationNotes?: string;
  diagnoses: Diagnosis[];
  investigations: InvestigationOrder[];
  prescription?: Prescription;
  finalizedAt?: string;
  finalizedBy?: string;
  patient?: PatientSummary;
  doctor?: DoctorUserSummary;
  appointment?: Appointment;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEncounterPayload {
  appointmentId: string;
}

export interface UpdateEncounterPayload {
  vitals?: Vitals;
  chiefComplaints?: string[];
  historyOfPresentIllness?: string;
  examinationNotes?: string;
  diagnoses?: Diagnosis[];
  investigations?: InvestigationOrder[];
  prescriptionItems?: PrescriptionItem[];
  prescriptionNotes?: string;
}

export interface FinalizeEncounterPayload extends UpdateEncounterPayload {
  doctorNotes?: string;
}

// ==========================================
// MILESTONE 06: INPATIENT DEPARTMENT (IPD) & BEDS
// ==========================================

export enum WardType {
  GENERAL = 'general',
  SEMI_PRIVATE = 'semi_private',
  PRIVATE = 'private',
  ICU = 'icu',
  CCU = 'ccu',
  MATERNITY = 'maternity',
  PEDIATRIC = 'pediatric',
}

export enum BedStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  MAINTENANCE = 'maintenance',
  CLEANING = 'cleaning',
}

export enum AdmissionStatus {
  ADMITTED = 'admitted',
  DISCHARGED = 'discharged',
  TRANSFERRED = 'transferred',
}

export enum AdmissionSource {
  OPD_REFERRAL = 'opd_referral',
  EMERGENCY = 'emergency',
  ELECTIVE_TRANSFER = 'elective_transfer',
}

export enum DischargeCondition {
  CURED = 'cured',
  IMPROVED = 'improved',
  TRANSFERRED = 'transferred',
  LAMA = 'lama', // Left Against Medical Advice
  DECEASED = 'deceased',
}

export interface Ward {
  id: string;
  _id?: string;
  tenantId: string;
  name: string;
  code: string;
  type: WardType;
  floor?: string;
  totalBeds: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Bed {
  id: string;
  _id?: string;
  tenantId: string;
  bedNumber: string;
  wardId: string;
  status: BedStatus;
  currentAdmissionId?: string;
  ward?: Ward;
  currentAdmission?: Admission;
  createdAt?: string;
  updatedAt?: string;
}

export interface BedAllocation {
  id: string;
  _id?: string;
  tenantId: string;
  admissionId: string;
  patientId: string;
  bedId: string;
  allocatedAt: string;
  releasedAt?: string;
  transferReason?: string;
  bed?: Bed;
  createdAt?: string;
  updatedAt?: string;
}

export interface Admission {
  id: string;
  _id?: string;
  tenantId: string;
  admissionNumber: string;
  patientId: string;
  attendingDoctorId: string;
  admittedBedId: string;
  admissionDate: string;
  admittingDiagnosis: string;
  admissionSource: AdmissionSource;
  status: AdmissionStatus;
  dischargeDate?: string;
  dischargeCondition?: DischargeCondition;
  dischargeSummary?: string;
  followUpInstructions?: string;
  patient?: PatientSummary;
  doctor?: DoctorUserSummary;
  bed?: Bed;
  allocations?: BedAllocation[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WardCensusItem {
  wardId: string;
  wardName: string;
  wardCode: string;
  wardType: WardType;
  floor?: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  cleaningBeds: number;
  maintenanceBeds: number;
  occupancyRate: number;
}

export interface IpdCensusSummary {
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  cleaningBeds: number;
  maintenanceBeds: number;
  occupancyRate: number;
  wardBreakdown: WardCensusItem[];
}

export interface CreateAdmissionPayload {
  patientId: string;
  attendingDoctorId: string;
  bedId: string;
  admittingDiagnosis: string;
  admissionSource?: AdmissionSource;
}

export interface TransferBedPayload {
  destinationBedId: string;
  reason: string;
}

export interface DischargePayload {
  dischargeSummary: string;
  dischargeCondition: DischargeCondition;
  followUpInstructions?: string;
}

export interface UpdateBedStatusPayload {
  status: BedStatus;
}

export interface CreateBedPayload {
  bedNumber: string;
  wardId: string;
  status?: BedStatus;
}

export interface CreateWardPayload {
  name: string;
  code: string;
  type: WardType;
  floor?: string;
}

// ==========================================
// MILESTONE 07: LABORATORY INFORMATION SYSTEM (LIS)
// ==========================================

export enum LabTestCategory {
  HEMATOLOGY = 'hematology',
  BIOCHEMISTRY = 'biochemistry',
  MICROBIOLOGY = 'microbiology',
  IMMUNOLOGY = 'immunology',
  SEROLOGY = 'serology',
  PATHOLOGY = 'pathology',
}

export enum LabOrderPriority {
  ROUTINE = 'routine',
  URGENT = 'urgent',
  STAT = 'stat',
}

export enum LabOrderStatus {
  ORDERED = 'ordered',
  SAMPLE_COLLECTED = 'sample_collected',
  IN_PROCESS = 'in_process',
  RESULT_ENTERED = 'result_entered',
  VERIFIED = 'verified',
  CANCELLED = 'cancelled',
}

export enum LabResultFlag {
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  LOW = 'LOW',
  CRITICAL = 'CRITICAL',
}

export interface LabTestParameter {
  name: string;
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
  criticalLow?: number;
  criticalHigh?: number;
  textOptions?: string[];
}

export interface LabTest {
  id: string;
  _id?: string;
  tenantId: string;
  code: string; // e.g. "CBC", "LIPID", "LFT", "RFT"
  name: string;
  category: LabTestCategory;
  specimenType: string;
  parameters: LabTestParameter[];
  tariffPrice: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LabResultItem {
  testId: string;
  parameterName: string;
  value: string;
  numericValue?: number;
  unit: string;
  flag: LabResultFlag;
  referenceRange?: string;
  criticalRange?: string;
}

export interface LabOrder {
  id: string;
  _id?: string;
  tenantId: string;
  orderNumber: string; // e.g. "LAB-2026-00001"
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  admissionId?: string;
  testIds: string[];
  priority: LabOrderPriority;
  status: LabOrderStatus;
  accessionNumber?: string; // e.g. "ACC-2026-00001"
  sampleCollectedAt?: string;
  containerType?: string;
  phlebotomistNotes?: string;
  results: LabResultItem[];
  technicianNotes?: string;
  pathologistRemarks?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  patient?: PatientSummary;
  doctor?: DoctorUserSummary;
  tests?: LabTest[];
  verifiedByUser?: DoctorUserSummary;
  createdAt: string;
  updatedAt: string;
}

export interface LabDashboardSummary {
  totalOrders: number;
  pendingCollection: number;
  inProcess: number;
  awaitingVerification: number;
  completedToday: number;
  criticalCountToday: number;
}

export interface CreateLabOrderPayload {
  patientId: string;
  doctorId: string;
  testIds: string[];
  priority?: LabOrderPriority;
  appointmentId?: string;
  admissionId?: string;
  clinicalNotes?: string;
}

export interface CollectSamplePayload {
  containerType?: string;
  phlebotomistNotes?: string;
}

export interface EnterLabResultsPayload {
  results: {
    testId: string;
    parameterName: string;
    value: string;
  }[];
  technicianNotes?: string;
}

export interface VerifyLabOrderPayload {
  pathologistRemarks?: string;
}

export interface CreateLabTestPayload {
  code: string;
  name: string;
  category: LabTestCategory;
  specimenType: string;
  parameters: LabTestParameter[];
  tariffPrice: number;
}

// ==========================================
// Milestone 08 — Pharmacy & Dispensing
// ==========================================

export enum DosageForm {
  TABLET = 'tablet',
  CAPSULE = 'capsule',
  SYRUP = 'syrup',
  INJECTION = 'injection',
  OINTMENT = 'ointment',
  INHALER = 'inhaler',
  DROPS = 'drops',
}

export enum DrugSchedule {
  OTC = 'otc',
  PRESCRIPTION = 'prescription',
  SCHEDULE_H = 'schedule_h',
  NARCOTIC = 'narcotic',
}

export enum PharmacyTransactionType {
  PURCHASE_IN = 'purchase_in',
  DISPENSE_OUT = 'dispense_out',
  RETURN_IN = 'return_in',
  ADJUSTMENT_OUT = 'adjustment_out',
}

export interface Medicine {
  id: string;
  _id?: string;
  tenantId: string;
  brandName: string;
  genericName: string;
  dosageForm: DosageForm;
  strength: string;
  category: string;
  schedule: DrugSchedule;
  storageConditions?: string;
  minStockLevel: number;
  isActive: boolean;
  activeBatchesCount?: number;
  totalStock?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MedicineBatch {
  id: string;
  _id?: string;
  tenantId: string;
  medicineId: string | Medicine;
  batchNumber: string;
  expiryDate: string;
  manufactureDate?: string;
  initialQuantity: number;
  currentQuantity: number;
  unitCostPrice?: number;
  unitSalePrice: number;
  isActive: boolean;
  daysToExpiry?: number;
  isExpired?: boolean;
  isNearExpiry?: boolean;
  isFefoRecommended?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DispensingRecordItem {
  medicineId: string;
  medicineName: string;
  batchId: string;
  batchNumber: string;
  quantity: number;
  dosageForm?: string;
  strength?: string;
  instructions?: string;
  unitSalePrice: number;
  totalPrice: number;
}

export interface DispensingRecord {
  id: string;
  _id?: string;
  tenantId: string;
  dispenseNumber: string;
  prescriptionId: string | Prescription;
  patientId: string | Patient;
  pharmacistId: string | any;
  items: DispensingRecordItem[];
  totalAmount: number;
  notes?: string;
  dispensedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PharmacyTransaction {
  id: string;
  _id?: string;
  tenantId: string;
  batchId: string;
  medicineId: string;
  type: PharmacyTransactionType;
  quantity: number;
  balanceAfter: number;
  referenceId?: string;
  notes?: string;
  performedBy?: string;
  createdAt: string;
}

export interface PharmacyDashboardMetrics {
  pendingPrescriptionsCount: number;
  dispensedTodayCount: number;
  nearExpiryBatchesCount: number;
  lowStockMedicinesCount: number;
  totalMedicinesCount: number;
  totalBatchesCount: number;
}

export interface BatchAlertsResponse {
  nearExpiry: MedicineBatch[];
  expired: MedicineBatch[];
  lowStock: Medicine[];
}

export interface DispenseItemInput {
  medicineId: string;
  batchId: string;
  quantity: number;
  instructions?: string;
}

export interface DispensePayload {
  prescriptionId: string;
  items: DispenseItemInput[];
  notes?: string;
}

export interface CreateMedicinePayload {
  brandName: string;
  genericName: string;
  dosageForm: DosageForm;
  strength: string;
  category: string;
  schedule?: DrugSchedule;
  storageConditions?: string;
  minStockLevel?: number;
}

export interface CreateBatchPayload {
  medicineId: string;
  batchNumber: string;
  expiryDate: string;
  manufactureDate?: string;
  initialQuantity: number;
  unitCostPrice?: number;
  unitSalePrice: number;
}

export interface ReturnMedicinePayload {
  dispenseId: string;
  batchId: string;
  quantity: number;
  reason: string;
}

// ==========================================
// Milestone 09 — Inventory, Stock & Procurement
// ==========================================

export enum InventoryCategory {
  CONSUMABLE = 'consumable',
  SURGICAL = 'surgical',
  REAGENT = 'reagent',
  LINEN = 'linen',
  GENERAL = 'general',
  EQUIPMENT = 'equipment',
}

export enum ItemUom {
  PIECE = 'piece',
  BOX = 'box',
  VIAL = 'vial',
  ROLL = 'roll',
  LITER = 'liter',
  PACK = 'pack',
  PAIR = 'pair',
  SET = 'set',
}

export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  PARTIALLY_RECEIVED = 'partially_received',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum StockMovementType {
  GRN_RECEIPT = 'grn_receipt',
  DEPT_TRANSFER = 'dept_transfer',
  ADJUSTMENT_LOSS = 'adjustment_loss',
  ADJUSTMENT_GAIN = 'adjustment_gain',
  PURCHASE = 'purchase',
  SALE = 'sale',
  DISPENSE = 'dispense',
  RETURN = 'return',
  TRANSFER = 'transfer',
  ADJUSTMENT = 'adjustment',
  OPENING_BALANCE = 'opening_balance',
}

export interface InventoryItem {
  id: string;
  _id?: string;
  tenantId: string;
  itemCode: string;
  name: string;
  category: InventoryCategory;
  uom: string;
  reorderLevel: number;
  reorderQuantity?: number;
  stockOnHand: number;
  unitCost?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  _id?: string;
  tenantId: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  taxId?: string;
  address?: string;
  paymentTerms?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PurchaseOrderItem {
  itemId: string | InventoryItem;
  itemCode?: string;
  itemName?: string;
  uom?: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PurchaseOrder {
  id: string;
  _id?: string;
  tenantId: string;
  poNumber: string;
  supplierId: string | Supplier;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  totalAmount: number;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdById?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GoodsReceiptItem {
  itemId: string | InventoryItem;
  itemCode?: string;
  itemName?: string;
  quantityReceived: number;
  lotNumber: string;
  expiryDate?: string;
  unitPrice: number;
}

export interface GoodsReceipt {
  id: string;
  _id?: string;
  tenantId: string;
  grnNumber: string;
  poId: string | PurchaseOrder;
  supplierId: string | Supplier;
  receivedBy: string;
  items: GoodsReceiptItem[];
  notes?: string;
  receivedDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockMovement {
  id: string;
  _id?: string;
  tenantId: string;
  itemId: string | InventoryItem;
  type: StockMovementType;
  fromLocation?: string;
  toLocation?: string;
  quantity: number;
  balanceAfter: number;
  reason?: string;
  performedBy?: string;
  referenceId?: string;
  createdAt?: string;
}

export interface InventoryDashboardMetrics {
  totalItemsCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  activePurchaseOrdersCount: number;
  totalValuation: number;
  recentMovementsCount: number;
}

export interface CreateInventoryItemPayload {
  itemCode?: string;
  name: string;
  category: InventoryCategory;
  uom: string;
  reorderLevel: number;
  reorderQuantity?: number;
  initialStock?: number;
  unitCost?: number;
}

export interface UpdateInventoryItemPayload {
  name?: string;
  category?: InventoryCategory;
  uom?: string;
  reorderLevel?: number;
  reorderQuantity?: number;
  unitCost?: number;
  isActive?: boolean;
}

export interface CreateSupplierPayload {
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  taxId?: string;
  address?: string;
  paymentTerms?: string;
}

export interface CreatePurchaseOrderItemInput {
  itemId: string;
  quantityOrdered: number;
  unitPrice: number;
}

export interface CreatePurchaseOrderPayload {
  supplierId: string;
  items: CreatePurchaseOrderItemInput[];
  notes?: string;
}

export interface CreateGoodsReceiptItemInput {
  itemId: string;
  quantityReceived: number;
  lotNumber: string;
  expiryDate?: string;
  unitPrice?: number;
}

export interface CreateGoodsReceiptPayload {
  poId: string;
  items: CreateGoodsReceiptItemInput[];
  notes?: string;
}

export interface StockTransferPayload {
  itemId: string;
  quantity: number;
  toDepartment: string;
  reason?: string;
}

export interface StockAdjustmentPayload {
  itemId: string;
  quantity: number;
  type: 'loss' | 'gain';
  reason: string;
}

// ==========================================
// MILESTONE 10: BILLING, INVOICING & PAYMENTS
// ==========================================

export enum ServiceCategory {
  CONSULTATION = 'consultation',
  BED_CHARGE = 'bed_charge',
  PROCEDURE = 'procedure',
  NURSING = 'nursing',
  DIAGNOSTIC = 'diagnostic',
  PHARMACY = 'pharmacy',
  OTHER = 'other',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum InvoiceItemType {
  CONSULTATION = 'consultation',
  BED_CHARGE = 'bed_charge',
  PROCEDURE = 'procedure',
  NURSING = 'nursing',
  DIAGNOSTIC = 'diagnostic',
  PHARMACY = 'pharmacy',
  OTHER = 'other',
}

export enum PaymentMethod {
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  UPI = 'upi',
  BANK_TRANSFER = 'bank_transfer',
  INSURANCE_CLAIM = 'insurance_claim',
}

export enum PaymentStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum RefundStatus {
  REQUESTED = 'requested',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DISBURSED = 'disbursed',
}

export interface HospitalService {
  id: string;
  _id?: string;
  tenantId: string;
  code: string;
  name: string;
  category: ServiceCategory;
  standardRate: number;
  taxRatePercent: number;
  department?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceLineItem {
  serviceId?: string;
  itemType: InvoiceItemType;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  referenceId?: string;
}

export interface Invoice {
  id: string;
  _id?: string;
  tenantId: string;
  invoiceNumber: string;
  patientId: string | Patient;
  admissionId?: string;
  encounterId?: string;
  appointmentId?: string;
  status: InvoiceStatus;
  items: InvoiceLineItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  dueDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Payment {
  id: string;
  _id?: string;
  tenantId: string;
  receiptNumber: string;
  invoiceId: string | Invoice;
  patientId: string | Patient;
  cashierId: string | UserSummary;
  amount: number;
  method: PaymentMethod;
  transactionReference?: string;
  notes?: string;
  paidAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Refund {
  id: string;
  _id?: string;
  tenantId: string;
  refundNumber: string;
  invoiceId: string | Invoice;
  paymentId?: string | Payment;
  amount: number;
  reason: string;
  requestedBy: string | UserSummary;
  approvedBy?: string | UserSummary;
  status: RefundStatus;
  approvedAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BillingSummaryMetrics {
  todayCollections: number;
  totalReceivables: number;
  totalInvoiced: number;
  pendingInvoicesCount: number;
  collectionsByMethod: Record<string, number>;
  recentInvoicesCount: number;
}

export interface UnbilledChargeItem {
  referenceId: string;
  itemType: InvoiceItemType;
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  date: string;
}

export interface CreateTariffPayload {
  code: string;
  name: string;
  category: ServiceCategory;
  standardRate: number;
  taxRatePercent?: number;
  department?: string;
  isActive?: boolean;
}

export interface CreateInvoiceItemInput {
  serviceId?: string;
  itemType: InvoiceItemType;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxRatePercent?: number;
  referenceId?: string;
}

export interface CreateInvoicePayload {
  patientId: string;
  admissionId?: string;
  encounterId?: string;
  appointmentId?: string;
  items: CreateInvoiceItemInput[];
  dueDate?: string;
  notes?: string;
}

export interface ProcessPaymentPayload {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  transactionReference?: string;
  notes?: string;
}

export interface CreateRefundPayload {
  invoiceId: string;
  paymentId?: string;
  amount: number;
  reason: string;
  notes?: string;
}

export interface ApproveRefundPayload {
  notes?: string;
  action: 'approve' | 'reject';
}

// ==========================================
// MILESTONE 11: REPORTS, ANALYTICS & AUDIT
// ==========================================

export interface CensusReport {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  patientVolume: {
    totalRegistrations: number;
    activePatients: number;
    genderDistribution: {
      male: number;
      female: number;
      other: number;
    };
    ageDistribution: {
      pediatric: number;
      adult: number;
      geriatric: number;
    };
  };
  opdWorkload: {
    totalAppointments: number;
    attended: number;
    cancelled: number;
    noShow: number;
    doctorWorkload: {
      doctorId: string;
      doctorName: string;
      department: string;
      count: number;
      completed: number;
    }[];
  };
  ipdCensus: {
    totalAdmissions: number;
    totalDischarges: number;
    currentInpatients: number;
    totalBeds: number;
    occupiedBeds: number;
    bedOccupancyRate: number;
    averageLengthOfStayDays: number;
    wardBreakdown: {
      wardName: string;
      totalBeds: number;
      occupiedBeds: number;
      occupancyRate: number;
    }[];
  };
  labWorkload: {
    totalOrdered: number;
    verified: number;
    pending: number;
    averageTatHours: number;
    categoryBreakdown: Record<string, number>;
  };
}

export interface FinancialReport {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalInvoiced: number;
    totalCollected: number;
    totalOutstanding: number;
    totalRefunded: number;
    totalDiscountGiven: number;
  };
  paymentMethodBreakdown: Record<PaymentMethod, number>;
  cashierCollections: {
    cashierId: string;
    cashierName: string;
    totalCollected: number;
    transactionCount: number;
  }[];
  departmentalRevenue: {
    department: string;
    amount: number;
    percentage: number;
  }[];
  ageingBuckets: {
    current: number; // 0-30 days
    thirtyToSixty: number; // 31-60 days
    sixtyToNinety: number; // 61-90 days
    overNinety: number; // >90 days
  };
}

export interface InventoryPharmacyReport {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  pharmacy: {
    dispenseCount: number;
    nearExpiryBatchesCount: number;
    nearExpiryBatches: {
      batchNumber: string;
      medicineName: string;
      expiryDate: string;
      stock: number;
      daysUntilExpiry: number;
    }[];
    stockoutRiskMedicines: {
      medicineId: string;
      name: string;
      stockOnHand: number;
      minStock: number;
    }[];
  };
  inventory: {
    totalValuation: number;
    lowStockItemCount: number;
    openPurchaseOrdersCount: number;
    movementCountByType: Record<string, number>;
  };
}

export interface AuditLogEntry {
  _id?: string;
  id: string;
  hospitalId?: string;
  tenantId?: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  action: string;
  resource: string;
  status: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  createdAt?: string;
}

export interface AuditQueryParams {
  startDate?: string;
  endDate?: string;
  action?: string;
  userId?: string;
  resource?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AuditQueryResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==========================================
// Staff Onboarding & Role-Based Workstations
// ==========================================

export enum StaffRole {
  DOCTOR = 'DOCTOR',
  NURSE = 'NURSE',
  RECEPTIONIST = 'RECEPTIONIST',
  LAB_TECHNICIAN = 'LAB_TECHNICIAN',
  PHARMACIST = 'PHARMACIST',
  ACCOUNTANT = 'ACCOUNTANT',
  INVENTORY_MANAGER = 'INVENTORY_MANAGER',
  HOSPITAL_ADMIN = 'HOSPITAL_ADMIN',
}

export interface InviteStaffPayload {
  firstName: string;
  lastName: string;
  email: string;
  role: StaffRole;
  department?: string;
  specialization?: string;
  phone?: string;
}

export interface InviteStaffResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  specialization?: string;
  temporaryPassword?: string;
  emailDispatched: boolean;
  message: string;
}

export interface StaffUserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  specialization?: string;
  phone?: string;
  status: string;
  employeeId?: string;
  lastLoginAt?: string;
  createdAt: string;
}

// ============================================================================
// SaaS Platform & Super Admin Governance Contracts (Milestone 13)
// ============================================================================

export enum TenantStatus {
  PROVISIONING = 'PROVISIONING',
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  SUSPENDED = 'SUSPENDED',
  OFFBOARDED = 'OFFBOARDED',
}

export enum SubscriptionTier {
  FREE_TRIAL = 'FREE_TRIAL',
  STARTER_CLINIC = 'STARTER_CLINIC',
  GROWTH_HOSPITAL = 'GROWTH_HOSPITAL',
  ENTERPRISE_NETWORK = 'ENTERPRISE_NETWORK',
}

export enum SubscriptionStatus {
  TRIALING = 'TRIALING',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  UNPAID = 'UNPAID',
}

export interface TenantQuotas {
  maxDoctors: number;
  maxBeds: number;
  maxStorageGb: number;
}

export interface TenantUsage {
  doctorsCount: number;
  bedsCount: number;
  storageGbUsed: number;
}

export interface TenantBillingContact {
  name: string;
  email: string;
  phone?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  customDomain?: string;
  status: TenantStatus;
  tier: SubscriptionTier;
  planId?: string;
  subscriptionId?: string;
  billingContact: TenantBillingContact;
  quotas: TenantQuotas;
  usage: TenantUsage;
  trialEndsAt?: string;
  suspendedAt?: string;
  suspensionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  tier: SubscriptionTier;
  description?: string;
  priceMonthly: number;
  priceAnnual: number;
  currency: string;
  limits: TenantQuotas;
  includedModules: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  tenantId: string;
  tenantName?: string;
  planId: string;
  planName?: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  limitsOverride?: Partial<TenantQuotas> & {
    expiresAt?: string;
    reason?: string;
  };
  billingCycle: 'MONTHLY' | 'ANNUAL';
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformTelemetry {
  databasePingMs: number;
  activeConnections: number;
  memoryRssMb: number;
  memoryHeapMb: number;
  uptimeSeconds: number;
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  systemTimestamp: string;
}

export interface PlatformAuditLog {
  id: string;
  action: string;
  actorId: string;
  actorEmail: string;
  targetTenantId?: string;
  targetTenantName?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface PlatformBroadcast {
  id: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  targetAudience: 'ALL' | 'HOSPITAL_ADMINS' | 'CLINICIANS';
  active: boolean;
  expiresAt?: string;
  createdAt: string;
}

export interface CreateTenantDto {
  name: string;
  subdomain: string;
  customDomain?: string;
  tier: SubscriptionTier;
  planId?: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminPassword?: string;
  phone?: string;
  city?: string;
}

export interface UpdateTenantStatusDto {
  status: TenantStatus;
  reason?: string;
}

export interface QuotaOverrideDto {
  maxDoctors?: number;
  maxBeds?: number;
  maxStorageGb?: number;
  expiresAt?: string;
  reason?: string;
}

export interface CreatePlanDto {
  code: string;
  name: string;
  tier: SubscriptionTier;
  description?: string;
  priceMonthly: number;
  priceAnnual: number;
  currency: string;
  limits: TenantQuotas;
  includedModules: string[];
}

export interface CreateBroadcastDto {
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  targetAudience: 'ALL' | 'HOSPITAL_ADMINS' | 'CLINICIANS';
  expiresAt?: string;
}

// ============================================================================
// Enterprise Hospital Foundation: Workforce, Organization & Operations
// ============================================================================

export enum StaffType {
  HOSPITAL_ADMIN = 'HOSPITAL_ADMIN',
  DOCTOR = 'DOCTOR',
  RECEPTIONIST = 'RECEPTIONIST',
  NURSE = 'NURSE',
  PHARMACIST = 'PHARMACIST',
  LAB_TECHNICIAN = 'LAB_TECHNICIAN',
  ACCOUNTANT = 'ACCOUNTANT',
  INVENTORY_MANAGER = 'INVENTORY_MANAGER',
  DEPARTMENT_MANAGER = 'DEPARTMENT_MANAGER',
  OTHER = 'OTHER',
}

export enum EmploymentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXITED = 'EXITED',
}

export enum ResourceScope {
  HOSPITAL_WIDE = 'HOSPITAL_WIDE',
  DEPARTMENT_ONLY = 'DEPARTMENT_ONLY',
  TEAM_ONLY = 'TEAM_ONLY',
  ASSIGNED_RESOURCES = 'ASSIGNED_RESOURCES',
}

export interface Employee {
  id: string;
  _id?: string;
  tenantId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  departmentId?: string;
  departmentName?: string;
  teamId?: string;
  teamName?: string;
  designation: string;
  staffType: StaffType;
  employmentStatus: EmploymentStatus;
  managerId?: string;
  managerName?: string;
  joiningDate?: string;
  userId?: string;
  userEmail?: string;
  assignedRoles: string[];
  assignedWorkspaces: string[];
  accessScope: ResourceScope;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeePayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  departmentId?: string;
  teamId?: string;
  designation: string;
  staffType: StaffType;
  managerId?: string;
  joiningDate?: string;
  assignedRoles?: string[];
  assignedWorkspaces?: string[];
  accessScope?: ResourceScope;
}

export interface UpdateEmployeePayload extends Partial<CreateEmployeePayload> {
  employmentStatus?: EmploymentStatus;
}

export interface LinkUserToEmployeePayload {
  employeeId: string;
  userId: string;
}

// ----------------------------------------------------------------------------
// Organization: Departments & Teams
// ----------------------------------------------------------------------------

export interface Department {
  id: string;
  _id?: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  headEmployeeId?: string;
  headEmployeeName?: string;
  type: string;
  isActive: boolean;
  teamsCount?: number;
  employeesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentPayload {
  name: string;
  code: string;
  description?: string;
  headEmployeeId?: string;
  type?: string;
}

export interface Team {
  id: string;
  _id?: string;
  tenantId: string;
  departmentId: string;
  departmentName?: string;
  name: string;
  code: string;
  description?: string;
  teamLeadEmployeeId?: string;
  teamLeadEmployeeName?: string;
  isActive: boolean;
  employeesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeamPayload {
  departmentId: string;
  name: string;
  code: string;
  description?: string;
  teamLeadEmployeeId?: string;
}

// ----------------------------------------------------------------------------
// Workforce Scheduling
// ----------------------------------------------------------------------------

export enum ShiftType {
  MORNING = 'MORNING',
  EVENING = 'EVENING',
  NIGHT = 'NIGHT',
  ROTATING = 'ROTATING',
  CUSTOM = 'CUSTOM',
}

export interface WorkforceSchedule {
  id: string;
  _id?: string;
  tenantId: string;
  employeeId: string;
  employeeName?: string;
  departmentId?: string;
  shiftType: ShiftType;
  startTime: string; // HH:mm format, e.g. 22:00
  endTime: string;   // HH:mm format, e.g. 06:00
  isOvernight: boolean;
  daysOfWeek: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkforceSchedulePayload {
  employeeId: string;
  departmentId?: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  effectiveFrom: string;
  effectiveTo?: string;
}

// ----------------------------------------------------------------------------
// Attendance & Corrections
// ----------------------------------------------------------------------------

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EARLY_LEAVE = 'EARLY_LEAVE',
  HALF_DAY = 'HALF_DAY',
  ON_LEAVE = 'ON_LEAVE',
  HOLIDAY = 'HOLIDAY',
  WEEK_OFF = 'WEEK_OFF',
}

export enum AttendanceMethod {
  WEB = 'WEB',
  MANUAL = 'MANUAL',
  BIOMETRIC_API = 'BIOMETRIC_API',
  RFID = 'RFID',
}

export enum AttendanceCorrectionStatus {
  NONE = 'NONE',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface AttendanceCorrection {
  originalCheckIn?: string;
  originalCheckOut?: string;
  correctedCheckIn?: string;
  correctedCheckOut?: string;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  status: AttendanceCorrectionStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export interface AttendanceRecord {
  id: string;
  _id?: string;
  tenantId: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  date: string; // YYYY-MM-DD
  checkInTime?: string;
  checkOutTime?: string;
  status: AttendanceStatus;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  method: AttendanceMethod;
  notes?: string;
  correction?: AttendanceCorrection;
  createdAt: string;
  updatedAt: string;
}

export interface CheckInPayload {
  employeeId: string;
  method?: AttendanceMethod;
  notes?: string;
}

export interface CheckOutPayload {
  employeeId: string;
  method?: AttendanceMethod;
  notes?: string;
}

export interface RequestAttendanceCorrectionPayload {
  attendanceId: string;
  correctedCheckIn?: string;
  correctedCheckOut?: string;
  reason: string;
}

export interface ReviewAttendanceCorrectionPayload {
  attendanceId: string;
  action: 'APPROVE' | 'REJECT';
  reviewNote?: string;
}

// ----------------------------------------------------------------------------
// Leave Management
// ----------------------------------------------------------------------------

export enum LeaveType {
  CASUAL = 'CASUAL',
  SICK = 'SICK',
  ANNUAL = 'ANNUAL',
  MATERNITY = 'MATERNITY',
  UNPAID = 'UNPAID',
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export interface LeaveRequest {
  id: string;
  _id?: string;
  tenantId: string;
  employeeId: string;
  employeeName?: string;
  departmentName?: string;
  leaveType: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveRequestPayload {
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface ReviewLeaveRequestPayload {
  action: 'APPROVE' | 'REJECT';
  rejectionReason?: string;
}

// ----------------------------------------------------------------------------
// Hospital Onboarding State
// ----------------------------------------------------------------------------

export enum OnboardingStep {
  PROFILE = 'PROFILE',
  DEPARTMENTS = 'DEPARTMENTS',
  ROLES = 'ROLES',
  EMPLOYEES = 'EMPLOYEES',
  WORKSPACES = 'WORKSPACES',
  STORES = 'STORES',
  INVENTORY_IMPORT = 'INVENTORY_IMPORT',
  GO_LIVE = 'GO_LIVE',
}

export interface HospitalOnboardingState {
  tenantId: string;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  isCompleted: boolean;
  completionPercentage: number;
  lastUpdated: string;
}

// ----------------------------------------------------------------------------
// Bulk Inventory Migration & Import Pipeline
// ----------------------------------------------------------------------------

export enum ImportStage {
  UPLOADED = 'UPLOADED',
  MAPPING = 'MAPPING',
  VALIDATING = 'VALIDATING',
  READY_FOR_APPROVAL = 'READY_FOR_APPROVAL',
  IMPORTING = 'IMPORTING',
  COMPLETED = 'COMPLETED',
  COMPLETED_WITH_ERRORS = 'COMPLETED_WITH_ERRORS',
  FAILED = 'FAILED',
}

export interface ColumnMappingConfig {
  brandName: string;
  genericName: string;
  dosageForm: string;
  strength: string;
  category: string;
  batchNumber?: string;
  expiryDate?: string;
  unitCostPrice?: string;
  unitSalePrice?: string;
  quantity?: string;
  minStockLevel?: string;
}

export interface ImportValidationError {
  rowNumber: number;
  field: string;
  message: string;
  rawValue?: string;
}

export interface InventoryImportJob {
  id: string;
  _id?: string;
  tenantId: string;
  fileName: string;
  fileSizeBytes: number;
  stage: ImportStage;
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  importedRowsCount: number;
  detectedColumns: string[];
  columnMapping?: ColumnMappingConfig;
  previewRows?: Record<string, string>[];
  errors?: ImportValidationError[];
  uploadedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveColumnMappingPayload {
  importId: string;
  mapping: ColumnMappingConfig;
}

// ----------------------------------------------------------------------------
// Internal Tasks & Notifications
// ----------------------------------------------------------------------------

export enum TaskPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface HospitalTaskComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface HospitalTask {
  id: string;
  _id?: string;
  tenantId: string;
  title: string;
  description?: string;
  creatorId: string;
  creatorName?: string;
  assigneeId?: string;
  assigneeName?: string;
  departmentId?: string;
  departmentName?: string;
  teamId?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  contextType?: 'PATIENT' | 'ENCOUNTER' | 'WARD' | 'GENERAL';
  contextId?: string;
  contextTitle?: string;
  comments: HospitalTaskComment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateHospitalTaskPayload {
  title: string;
  description?: string;
  assigneeId?: string;
  departmentId?: string;
  teamId?: string;
  priority?: TaskPriority;
  dueDate?: string;
  contextType?: 'PATIENT' | 'ENCOUNTER' | 'WARD' | 'GENERAL';
  contextId?: string;
  contextTitle?: string;
}

export enum HospitalNotificationType {
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  LEAVE_REQUEST = 'LEAVE_REQUEST',
  ATTENDANCE_CORRECTION = 'ATTENDANCE_CORRECTION',
  STOCK_ALERT = 'STOCK_ALERT',
  IMPORT_COMPLETED = 'IMPORT_COMPLETED',
  GENERAL = 'GENERAL',
}

export interface HospitalNotification {
  id: string;
  _id?: string;
  tenantId: string;
  recipientId: string; // Employee or User ID
  title: string;
  message: string;
  type: HospitalNotificationType;
  isRead: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}



