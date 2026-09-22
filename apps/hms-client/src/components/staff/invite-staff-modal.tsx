'use client';

import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Stethoscope,
  Building2,
  Phone,
  ArrowRight,
} from 'lucide-react';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { StaffRole, type InviteStaffResponse } from '@hms/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface InviteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ROLE_DETAILS: Record<
  StaffRole,
  { label: string; workspace: string; route: string; description: string; color: string }
> = {
  [StaffRole.DOCTOR]: {
    label: 'Medical Doctor',
    workspace: 'Doctor EMR Cockpit',
    route: '/emr',
    description: 'EMR notes, clinical encounters, prescription orders, lab requisitions',
    color: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  [StaffRole.RECEPTIONIST]: {
    label: 'OPD Receptionist',
    workspace: 'OPD Queue & Registration',
    route: '/appointments',
    description: 'Patient check-in, token dispensing, appointment booking & queue triage',
    color: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  [StaffRole.PHARMACIST]: {
    label: 'Pharmacist',
    workspace: 'Dispensary & Pharmacy',
    route: '/pharmacy',
    description: 'Prescription dispensing, FEFO batch allocation, drug inventory check',
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  [StaffRole.LAB_TECHNICIAN]: {
    label: 'Laboratory Technician',
    workspace: 'Diagnostic Laboratory',
    route: '/laboratory',
    description: 'Diagnostic worklists, specimen intake, result entry & verification',
    color: 'bg-purple-50 text-purple-800 border-purple-200',
  },
  [StaffRole.NURSE]: {
    label: 'Inpatient Nurse',
    workspace: 'IPD Bed & Ward Matrix',
    route: '/ipd',
    description: 'Ward bed status, patient transfers, nursing notes, vitals logging',
    color: 'bg-pink-50 text-pink-800 border-pink-200',
  },
  [StaffRole.ACCOUNTANT]: {
    label: 'Finance / Accountant',
    workspace: 'Billing & Cashier Center',
    route: '/billing',
    description: 'Invoice creation, cashier collections, payment receipts, billing refunds',
    color: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  [StaffRole.INVENTORY_MANAGER]: {
    label: 'Inventory Manager',
    workspace: 'Supply Chain & Stock',
    route: '/inventory',
    description: 'Supplier orders, goods receipt notes (GRN), inventory stock tracking',
    color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  [StaffRole.HOSPITAL_ADMIN]: {
    label: 'Hospital Administrator',
    workspace: 'Executive Hospital Cockpit',
    route: '/dashboard',
    description: 'Full administrative access, staff onboarding, audit logs & reports',
    color: 'bg-rose-50 text-rose-800 border-rose-200',
  },
};

const DEPARTMENTS = [
  'General Medicine',
  'Cardiology',
  'Pediatrics',
  'Orthopedics',
  'Neurology',
  'Emergency & Trauma',
  'Outpatient (OPD)',
  'Inpatient (IPD)',
  'Pharmacy',
  'Pathology & Lab',
  'Finance & Cashier',
  'Operations & Supply',
];

export function InviteStaffModal({ isOpen, onClose, onSuccess }: InviteStaffModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>(StaffRole.DOCTOR);
  const [department, setDepartment] = useState('General Medicine');
  const [specialization, setSpecialization] = useState('');
  const [phone, setPhone] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [invitedResult, setInvitedResult] = useState<InviteStaffResponse | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setRole(StaffRole.DOCTOR);
    setDepartment('General Medicine');
    setSpecialization('');
    setPhone('');
    setErrorMessage(null);
    setInvitedResult(null);
    setIsCopied(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        role,
        department: department.trim(),
        specialization: specialization.trim() || undefined,
        phone: phone.trim() || undefined,
      };

      const res = await apiClient.post<{ success: boolean; data: InviteStaffResponse }>(
        '/users/invite',
        payload,
      );

      if (res?.data) {
        setInvitedResult(res.data);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setErrorMessage('Failed to parse server response.');
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('An unexpected error occurred while inviting staff.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!invitedResult?.temporaryPassword) return;
    const text = `MedCore HMS Staff Login\nPortal: ${window.location.origin}/login\nEmail: ${invitedResult.email}\nTemporary Password: ${invitedResult.temporaryPassword}\nRole: ${invitedResult.role}`;
    void navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const currentRoleInfo = ROLE_DETAILS[role];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-300">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <h2 id="invite-modal-title" className="text-lg font-bold text-white tracking-tight">
                Invite Hospital Staff Member
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Provision role-based workstation credentials with instant email dispatch.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-6">
          {invitedResult ? (
            /* SUCCESS STATE */
            <div className="space-y-5 animate-in zoom-in-95 duration-200">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 text-emerald-950">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-emerald-900">
                      Staff Member Provisioned Successfully!
                    </h3>
                    <p className="text-xs text-emerald-700">
                      {invitedResult.emailDispatched
                        ? `Official credentials email dispatched to ${invitedResult.email}.`
                        : `Account created. You can share the temporary credentials below.`}
                    </p>
                  </div>
                </div>
              </div>

              {/* CREDENTIALS CARD */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Generated Access Credentials
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCredentials}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                        <span>Copy Credentials</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-200/80">
                    <span className="text-slate-400 block mb-1">Full Name</span>
                    <span className="font-semibold text-slate-900">
                      {invitedResult.firstName} {invitedResult.lastName}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200/80">
                    <span className="text-slate-400 block mb-1">Assigned Role</span>
                    <span className="font-semibold text-slate-900">
                      {invitedResult.role.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200/80">
                    <span className="text-slate-400 block mb-1">Login Username / Email</span>
                    <span className="font-mono font-bold text-slate-900 break-all">
                      {invitedResult.email}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-teal-300 bg-teal-50/30">
                    <span className="text-teal-700 block mb-1 font-semibold">Temporary Password</span>
                    <span className="font-mono font-black text-teal-900 text-sm tracking-wide">
                      {invitedResult.temporaryPassword}
                    </span>
                  </div>
                </div>

                {/* DESTINATION WORKSPACE PREVIEW */}
                <div className="mt-2 rounded-lg bg-indigo-50/70 border border-indigo-200 p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    <div>
                      <p className="text-xs font-bold text-indigo-950">
                        Workstation: {ROLE_DETAILS[invitedResult.role as StaffRole]?.workspace || 'Staff Portal'}
                      </p>
                      <p className="text-[11px] text-indigo-700">
                        When this staff member logs in, they will automatically land on{' '}
                        <code className="bg-indigo-100 px-1 py-0.5 rounded text-indigo-900 font-mono">
                          {ROLE_DETAILS[invitedResult.role as StaffRole]?.route || '/dashboard'}
                        </code>
                      </p>
                    </div>
                  </div>
                  <a
                    href={ROLE_DETAILS[invitedResult.role as StaffRole]?.route || '/dashboard'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline"
                  >
                    <span>Preview</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="outline" size="default" onClick={resetForm}>
                  Invite Another Staff Member
                </Button>
                <Button variant="teal" size="default" onClick={handleClose}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            /* INVITATION FORM */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Invitation Failed:</span> {errorMessage}
                  </div>
                </div>
              )}

              {/* NAME FIELDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="staff-first-name"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="staff-first-name"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Rajesh"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="staff-last-name"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="staff-last-name"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Sharma"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div>
                <label
                  htmlFor="staff-email"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Work Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    id="staff-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@hospital.com"
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Login credentials and portal instructions will be emailed to this address.
                </p>
              </div>

              {/* ROLE & DEPARTMENT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="staff-role"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Staff Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="staff-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as StaffRole)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none bg-white font-medium"
                  >
                    <option value={StaffRole.DOCTOR}>Doctor (EMR & Clinical)</option>
                    <option value={StaffRole.RECEPTIONIST}>Receptionist (OPD Queue)</option>
                    <option value={StaffRole.PHARMACIST}>Pharmacist (Dispensary)</option>
                    <option value={StaffRole.LAB_TECHNICIAN}>Lab Technician (Diagnostics)</option>
                    <option value={StaffRole.NURSE}>Nurse (IPD & Wards)</option>
                    <option value={StaffRole.ACCOUNTANT}>Accountant (Billing & Cashier)</option>
                    <option value={StaffRole.INVENTORY_MANAGER}>Inventory Manager</option>
                    <option value={StaffRole.HOSPITAL_ADMIN}>Hospital Administrator</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="staff-department"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Primary Department
                  </label>
                  <select
                    id="staff-department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none bg-white"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SPECIALIZATION & PHONE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="staff-specialization"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Specialization / Title (Optional)
                  </label>
                  <input
                    id="staff-specialization"
                    type="text"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="e.g. Interventional Cardiologist"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="staff-phone"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Contact Phone (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      id="staff-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* DYNAMIC WORKSPACE PREVIEW CARD */}
              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-teal-50/30 p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
                    Designated Workstation & Route
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${currentRoleInfo.color}`}
                  >
                    {currentRoleInfo.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <span>{currentRoleInfo.workspace}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-teal-600" />
                  <code className="rounded bg-white px-2 py-0.5 text-xs text-teal-800 font-mono border border-teal-200">
                    {currentRoleInfo.route}
                  </code>
                </div>
                <p className="text-xs text-slate-600 mt-1">{currentRoleInfo.description}</p>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="teal"
                  disabled={isSubmitting}
                  className="font-bold shadow-xs flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Provisioning & Sending Email...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      <span>Send Invitation & Credentials</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
