'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Patient,
  DoctorUserSummary,
  AvailableSlot,
  AppointmentType,
  Appointment,
} from '@hms/types';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { AppShell } from '@/components/layout/app-shell';
import { SlotPicker } from '@/components/appointments/slot-picker';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Search,
  User,
  CheckCircle2,
  ChevronLeft,
  ArrowRight,
  AlertCircle,
  Hash,
  UserPlus,
} from 'lucide-react';

const DEPARTMENTS = [
  'General Medicine',
  'Cardiology',
  'Pediatrics',
  'Orthopedics',
  'Neurology',
  'Dermatology',
  'Ophthalmology',
  'General Surgery',
  'Gynecology',
];

export default function BookAppointmentPage() {
  // Wizard Step: 1 = Patient, 2 = Doctor & Slot, 3 = Review & Confirm, 4 = Success
  const [step, setStep] = useState<number>(1);

  // Step 1: Patient selection state
  const [patientSearch, setPatientSearch] = useState('');
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Step 2: Doctor & Slot state
  const [doctors, setDoctors] = useState<DoctorUserSummary[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('General Medicine');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>(
    AppointmentType.NEW
  );

  // Step 3: Details & Confirmation state
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 4: Booking Result
  const [createdAppointment, setCreatedAppointment] = useState<Appointment | null>(null);

  // Search patients
  const handleSearchPatients = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setPatientResults([]);
      return;
    }
    setSearchingPatients(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: Patient[] }>(
        `/patients?search=${encodeURIComponent(q)}&limit=10`
      );
      setPatientResults(res.data || []);
    } catch (err) {
      console.error('Patient search failed', err);
    } finally {
      setSearchingPatients(false);
    }
  }, []);

  // Debounced patient search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearchPatients(patientSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch, handleSearchPatients]);

  // Load doctors
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const res = await apiClient.get<{ success: boolean; data: DoctorUserSummary[] }>(
          '/appointments/doctors'
        );
        const docs = res.data || [];
        setDoctors(docs);
        if (docs.length > 0) {
          const firstDocId = docs[0].id || docs[0]._id || '';
          setSelectedDoctorId((prev) => prev || firstDocId);
          if (docs[0].department) {
            setSelectedDepartment((prev) => prev || docs[0].department);
          }
        }
      } catch (err) {
        console.error('Failed to load doctors', err);
      }
    };
    loadDoctors();
  }, []);

  // Fetch slots whenever doctor or date changes
  useEffect(() => {
    if (!selectedDoctorId || !selectedDate) return;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const res = await apiClient.get<{
          success: boolean;
          data: { slots: AvailableSlot[]; doctorId: string; date: string };
        }>(`/appointments/slots?doctorId=${selectedDoctorId}&date=${selectedDate}`);

        setSlots(res.data?.slots || (res.data as any)?.availableSlots || []);
      } catch (err) {
        console.error('Failed to load slots', err);
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDoctorId, selectedDate]);

  // Handle final submission
  const handleBookAppointment = async () => {
    if (!selectedPatient || !selectedDoctorId || !selectedDate || !selectedSlot) {
      setError('Please complete all required appointment details.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await apiClient.post<{ success: boolean; data: Appointment }>(
        '/appointments',
        {
          patientId: selectedPatient.id || selectedPatient._id,
          doctorId: selectedDoctorId,
          scheduledAt: selectedDate,
          timeSlot: selectedSlot,
          type: appointmentType,
          department: selectedDepartment,
          chiefComplaint: chiefComplaint.trim() || undefined,
          notes: notes.trim() || undefined,
        }
      );

      setCreatedAppointment(res.data);
      setStep(4);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to book appointment. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDoctor = doctors.find((d) => (d.id || d._id) === selectedDoctorId);
  const selectedDoctorName = selectedDoctor ? selectedDoctor.name : 'Doctor';

  const patientFullName = selectedPatient
    ? [
        selectedPatient.name.first,
        selectedPatient.name.middle,
        selectedPatient.name.last,
      ]
        .filter(Boolean)
        .join(' ')
    : '';

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link href="/appointments" className="hover:text-teal-600 transition-colors">
                Appointments & OPD
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-medium">Book Appointment</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Book Outpatient Consultation
            </h1>
          </div>

          <Link href="/appointments">
            <Button variant="outline" size="sm" className="rounded-xl text-xs">
              Back to OPD Queue
            </Button>
          </Link>
        </div>

        {/* Wizard Progress Steps (1 to 3) */}
        {step < 4 && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              {/* Step 1 */}
              <div
                className={`flex items-center gap-3 cursor-pointer ${
                  step === 1 ? 'text-teal-600' : step > 1 ? 'text-slate-800' : 'text-slate-400'
                }`}
                onClick={() => setStep(1)}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                    step === 1
                      ? 'bg-teal-600 text-white shadow-xs'
                      : step > 1
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
                </div>
                <div>
                  <p className="text-xs font-semibold">1. Select Patient</p>
                  <p className="text-[11px] text-slate-400">
                    {selectedPatient ? patientFullName : 'Search UHID or Name'}
                  </p>
                </div>
              </div>

              <div className="h-0.5 flex-1 mx-4 bg-slate-100" />

              {/* Step 2 */}
              <div
                className={`flex items-center gap-3 cursor-pointer ${
                  step === 2 ? 'text-teal-600' : step > 2 ? 'text-slate-800' : 'text-slate-400'
                }`}
                onClick={() => selectedPatient && setStep(2)}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                    step === 2
                      ? 'bg-teal-600 text-white shadow-xs'
                      : step > 2
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {step > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
                </div>
                <div>
                  <p className="text-xs font-semibold">2. Doctor & Time Slot</p>
                  <p className="text-[11px] text-slate-400">
                    {selectedSlot ? `${selectedDate} (${selectedSlot})` : 'Choose schedule'}
                  </p>
                </div>
              </div>

              <div className="h-0.5 flex-1 mx-4 bg-slate-100" />

              {/* Step 3 */}
              <div
                className={`flex items-center gap-3 cursor-pointer ${
                  step === 3 ? 'text-teal-600' : 'text-slate-400'
                }`}
                onClick={() => selectedPatient && selectedSlot && setStep(3)}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                    step === 3 ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  3
                </div>
                <div>
                  <p className="text-xs font-semibold">3. Confirm & Issue Token</p>
                  <p className="text-[11px] text-slate-400">Review & finalize</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: PATIENT SELECTION */}
        {step === 1 && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Select Patient</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Search registered patients by UHID, Full Name, or Phone Number
              </p>
            </div>

            {selectedPatient ? (
              <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
                    {selectedPatient.name.first[0]}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{patientFullName}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-600 font-mono mt-0.5">
                      <span>{selectedPatient.uhid}</span>
                      <span>•</span>
                      <span>{selectedPatient.gender}</span>
                      {selectedPatient.contacts?.phone && (
                        <>
                          <span>•</span>
                          <span>{selectedPatient.contacts.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPatient(null)}
                  className="rounded-xl text-xs border-slate-200 hover:bg-white"
                >
                  Change Patient
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Search by UHID (e.g. UHID-2026-000001), Name or Phone..."
                    className="w-full text-xs rounded-xl border border-slate-200 pl-10 pr-4 py-3 text-slate-900 placeholder:text-slate-400 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    autoFocus
                  />
                </div>

                {searchingPatients && (
                  <div className="text-center py-6 text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 animate-spin text-teal-600" />
                    <span>Searching patient database...</span>
                  </div>
                )}

                {patientResults.length > 0 && (
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {patientResults.map((p) => {
                      const pid = p.id || p._id || '';
                      const name = [p.name.first, p.name.middle, p.name.last]
                        .filter(Boolean)
                        .join(' ');
                      const phone = p.contacts?.phone || 'No phone';
                      return (
                        <div
                          key={pid}
                          onClick={() => {
                            setSelectedPatient(p);
                            setPatientSearch('');
                            setPatientResults([]);
                          }}
                          className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                              {p.name.first[0]}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{name}</p>
                              <p className="text-[11px] text-slate-500 font-mono">
                                {p.uhid} • {p.gender} • {phone}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-teal-600">Select</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {patientSearch.length >= 2 && !searchingPatients && patientResults.length === 0 && (
                  <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/40">
                    <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-700">No patient record found</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Could not find any patient matching &quot;{patientSearch}&quot;.
                    </p>
                    <div className="mt-3">
                      <Link href="/patients/register">
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-xl text-xs bg-teal-600 hover:bg-teal-700 text-white"
                        >
                          <UserPlus className="w-3.5 h-3.5 mr-1" />
                          Register New Patient
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end pt-4 border-t border-slate-100">
              <Button
                type="button"
                disabled={!selectedPatient}
                onClick={() => setStep(2)}
                className="rounded-xl text-xs px-6 bg-teal-600 hover:bg-teal-700 text-white font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <span>Continue to Doctor & Slot</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: DOCTOR & SLOT SELECTION */}
        {step === 2 && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Doctor & Time Slot</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select clinical department, consulting physician, consultation date, and available slot
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Department */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Clinical Department
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Doctor */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Consulting Doctor <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => {
                    setSelectedDoctorId(e.target.value);
                    const doc = doctors.find((d) => (d.id || d._id) === e.target.value);
                    if (doc?.department) {
                      setSelectedDepartment(doc.department);
                    }
                  }}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  {doctors.map((doc) => {
                    const docId = doc.id || doc._id || '';
                    return (
                      <option key={docId} value={docId}>
                        Dr. {doc.name} ({doc.department || 'General'})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Appointment Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Appointment Type
                </label>
                <select
                  value={appointmentType}
                  onChange={(e) => setAppointmentType(e.target.value as AppointmentType)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value={AppointmentType.NEW}>New Consultation</option>
                  <option value={AppointmentType.FOLLOW_UP}>Follow-up Visit</option>
                  <option value={AppointmentType.WALK_IN}>Walk-in</option>
                  <option value={AppointmentType.ROUTINE_CHECKUP}>Routine Check-up</option>
                  <option value={AppointmentType.EMERGENCY}>Emergency Outpatient</option>
                </select>
              </div>
            </div>

            {/* Date Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Consultation Date <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                <span className="text-xs text-slate-500 font-medium">
                  {new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Slot Picker Component */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Available Time Slots <span className="text-rose-500">*</span>
              </label>
              <SlotPicker
                slots={slots}
                selectedSlot={selectedSlot}
                onSelectSlot={(slot) => setSelectedSlot(slot)}
                loading={loadingSlots}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="rounded-xl text-xs px-4"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                type="button"
                disabled={!selectedSlot}
                onClick={() => setStep(3)}
                className="rounded-xl text-xs px-6 bg-teal-600 hover:bg-teal-700 text-white font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <span>Review & Confirm</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: DETAILS, REVIEW & CONFIRMATION */}
        {step === 3 && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Review & Issue Token</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify consultation parameters and enter presenting symptoms before issuing token
              </p>
            </div>

            {/* Summary Review Card */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-200/60">
                {/* Patient Summary */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Patient Information
                  </span>
                  <h4 className="text-base font-bold text-slate-900 mt-1">{patientFullName}</h4>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">
                    UHID: {selectedPatient?.uhid} • {selectedPatient?.gender}
                  </p>
                </div>

                {/* Consultation Details */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Physician & Schedule
                  </span>
                  <h4 className="text-base font-bold text-slate-900 mt-1">
                    Dr. {selectedDoctorName}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {selectedDepartment} • {selectedDate} ({selectedSlot})
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                <span>Appointment Type: <strong>{appointmentType}</strong></span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 font-semibold font-mono">
                  <Hash className="w-3.5 h-3.5 text-teal-600" />
                  Token Number Assigned Sequentially On Confirmation
                </span>
              </div>
            </div>

            {/* Chief Complaint & Notes */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Chief Complaint / Presenting Symptoms
                </label>
                <textarea
                  rows={2}
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="e.g. Mild chest discomfort, routine hypertension check-up, headache for 3 days..."
                  className="w-full text-xs rounded-xl border border-slate-200 bg-white p-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Reception Notes / Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Needs wheelchair assistance, brought old ECG report..."
                  className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => setStep(2)}
                className="rounded-xl text-xs px-4"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                type="button"
                disabled={submitting}
                onClick={handleBookAppointment}
                className="rounded-xl text-xs px-6 bg-teal-600 hover:bg-teal-700 text-white font-semibold flex items-center gap-2 shadow-md shadow-teal-600/20"
              >
                {submitting ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>Reserving Slot & Issuing Token...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Booking & Issue Token</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS CONFIRMATION & TOKEN SLIP */}
        {step === 4 && createdAppointment && (
          <div className="bg-white border border-emerald-200 rounded-3xl p-8 shadow-lg text-center max-w-lg mx-auto animate-in zoom-in-95 duration-200 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold uppercase tracking-wider">
                Appointment Confirmed
              </span>
              <h2 className="text-2xl font-bold text-slate-900 mt-2">
                Token #{String(createdAppointment.tokenNumber).padStart(2, '0')}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Outpatient token has been generated and time slot reserved
              </p>
            </div>

            {/* Token Card */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 text-left space-y-3 font-mono text-xs">
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">Patient</span>
                <span className="font-bold text-slate-900">{patientFullName}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">UHID</span>
                <span className="font-bold text-slate-900">{selectedPatient?.uhid}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">Doctor</span>
                <span className="font-bold text-slate-900">Dr. {selectedDoctorName}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">Time Slot</span>
                <span className="font-bold text-teal-700">
                  {createdAppointment.timeSlot} ({new Date(createdAppointment.scheduledAt).toLocaleDateString()})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="font-bold text-amber-600">SCHEDULED</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Link href="/appointments" className="w-full">
                <Button className="w-full rounded-xl text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold">
                  Go to OPD Queue Board
                </Button>
              </Link>
              <Link href={`/appointments/${createdAppointment.id || createdAppointment._id}`} className="w-full">
                <Button variant="outline" className="w-full rounded-xl text-xs border-slate-200">
                  View Details
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
