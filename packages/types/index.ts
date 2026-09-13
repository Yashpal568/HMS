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

