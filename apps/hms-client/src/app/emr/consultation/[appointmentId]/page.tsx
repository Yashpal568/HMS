'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api-client';
import {
  Stethoscope,
  ArrowLeft,
  Save,
  CheckCircle,
  AlertTriangle,
  HeartPulse,
  Activity,
  Plus,
  Trash2,
  Printer,
  Pill,
  FileCheck,
  Clock,
  User,
  AlertCircle,
  Sparkles,
  ClipboardList,
} from 'lucide-react';
import type {
  Vitals,
  Diagnosis,
  PrescriptionItem,
  InvestigationOrder,
  BmiCategory,
} from '@hms/types';

// Common ICD-10 suggestions
const COMMON_ICD10 = [
  { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified' },
  { code: 'I10', description: 'Essential (primary) hypertension' },
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
  { code: 'K29.7', description: 'Gastritis, unspecified' },
  { code: 'M54.5', description: 'Low back pain' },
  { code: 'R50.9', description: 'Fever, unspecified' },
  { code: 'J20.9', description: 'Acute bronchitis, unspecified' },
  { code: 'K21.9', description: 'Gastro-esophageal reflux disease' },
];

// Common Prescriptions presets
const MEDICINE_PRESETS = [
  { medicineName: 'Paracetamol', dosageForm: 'tablet', strength: '650mg', frequency: '1-0-1', route: 'oral', durationDays: 3, quantity: 6, instructions: 'After meals' },
  { medicineName: 'Amoxicillin', dosageForm: 'capsule', strength: '500mg', frequency: 'TID', route: 'oral', durationDays: 5, quantity: 15, instructions: 'After meals' },
  { medicineName: 'Azithromycin', dosageForm: 'tablet', strength: '500mg', frequency: 'OD', route: 'oral', durationDays: 3, quantity: 3, instructions: '1 hour before meals' },
  { medicineName: 'Pantoprazole', dosageForm: 'tablet', strength: '40mg', frequency: 'OD', route: 'oral', durationDays: 7, quantity: 7, instructions: 'Empty stomach in morning' },
  { medicineName: 'Cetirizine', dosageForm: 'tablet', strength: '10mg', frequency: 'OD', route: 'oral', durationDays: 5, quantity: 5, instructions: 'At bedtime' },
  { medicineName: 'Ibuprofen', dosageForm: 'tablet', strength: '400mg', frequency: 'BD', route: 'oral', durationDays: 3, quantity: 6, instructions: 'After meals with water' },
];

export default function DoctorConsultationPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const appointmentId = params?.appointmentId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Encounter State
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [encounterStatus, setEncounterStatus] = useState<'draft' | 'finalized'>('draft');
  const [patientData, setPatientData] = useState<any>(null);
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [finalizedAt, setFinalizedAt] = useState<string | null>(null);

  // Form State
  const [vitals, setVitals] = useState<Vitals>({
    bpSystolic: undefined,
    bpDiastolic: undefined,
    pulse: undefined,
    temperature: undefined,
    respiratoryRate: undefined,
    spO2: undefined,
    weight: undefined,
    height: undefined,
  });

  const [chiefComplaints, setChiefComplaints] = useState<string[]>([]);
  const [newComplaintInput, setNewComplaintInput] = useState('');
  const [hpi, setHpi] = useState('');
  const [examinationNotes, setExaminationNotes] = useState('');
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [investigations, setInvestigations] = useState<InvestigationOrder[]>([]);
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);
  const [prescriptionNotes, setPrescriptionNotes] = useState('');

  // Auto-calculated BMI
  const computedBmi = useMemo(() => {
    if (!vitals.weight || !vitals.height || vitals.weight <= 0 || vitals.height <= 0) {
      return null;
    }
    const heightM = vitals.height / 100;
    const val = Math.round((vitals.weight / (heightM * heightM)) * 10) / 10;
    let category: BmiCategory = 'normal';
    if (val < 18.5) category = 'underweight';
    else if (val < 25) category = 'normal';
    else if (val < 30) category = 'overweight';
    else category = 'obese';
    return { val, category };
  }, [vitals.weight, vitals.height]);

  // Real-time Allergy Contraindications detection
  const allergyWarnings = useMemo(() => {
    if (!patientData?.allergies || patientData.allergies.length === 0 || prescriptionItems.length === 0) {
      return [];
    }
    const warnings: string[] = [];
    for (const item of prescriptionItems) {
      const medLower = (item.medicineName || '').toLowerCase().trim();
      if (!medLower) continue;

      for (const allergy of patientData.allergies) {
        const allergenLower = ((allergy.allergen || allergy) + '').toLowerCase().trim();
        if (!allergenLower) continue;

        if (medLower.includes(allergenLower) || allergenLower.includes(medLower)) {
          warnings.push(
            `Prescribed "${item.medicineName}" directly conflicts with documented patient allergy: "${allergy.allergen || allergy}" (${allergy.severity || 'severe'} severity)`,
          );
        }
      }
    }
    return warnings;
  }, [patientData, prescriptionItems]);

  const isFinalized = encounterStatus === 'finalized';

  // Load or start encounter
  const loadEncounter = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Try to get existing encounter for this appointment
      let encounterRes: any;
      try {
        encounterRes = await apiClient.get<any>(`/emr/encounters/appointment/${appointmentId}`);
      } catch (e: any) {
        // If not found, initialize it via POST
        encounterRes = await apiClient.post<any>('/emr/encounters', { appointmentId });
      }

      if (encounterRes.success && encounterRes.data) {
        const data = encounterRes.data;
        setEncounterId(data._id || data.id);
        setEncounterStatus(data.status || 'draft');
        setPatientData(data.patient);
        setAppointmentData(data.appointment);
        setFinalizedAt(data.finalizedAt);

        // Load vitals
        if (data.vitals) {
          setVitals({
            bpSystolic: data.vitals.bpSystolic,
            bpDiastolic: data.vitals.bpDiastolic,
            pulse: data.vitals.pulse,
            temperature: data.vitals.temperature,
            respiratoryRate: data.vitals.respiratoryRate,
            spO2: data.vitals.spO2,
            weight: data.vitals.weight,
            height: data.vitals.height,
          });
        }

        // Load complaints & notes
        setChiefComplaints(data.chiefComplaints || []);
        setHpi(data.historyOfPresentIllness || '');
        setExaminationNotes(data.examinationNotes || '');
        setDiagnoses(data.diagnoses || []);
        setInvestigations(data.investigations || []);

        // Load prescriptions
        if (data.prescription?.items) {
          setPrescriptionItems(data.prescription.items);
          setPrescriptionNotes(data.prescription.notes || '');
        }
      } else {
        setError('Failed to load consultation encounter.');
      }
    } catch (err: any) {
      console.error('Error loading encounter:', err);
      setError(err.message || 'Failed to load consultation session.');
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    loadEncounter();
  }, [loadEncounter]);

  // Save Draft Handler
  const handleSaveDraft = async () => {
    if (!encounterId || isFinalized) return;
    try {
      setSaving(true);
      setSaveSuccessMsg(null);

      const payload = {
        vitals,
        chiefComplaints,
        historyOfPresentIllness: hpi,
        examinationNotes,
        diagnoses,
        investigations,
        prescriptionItems,
        prescriptionNotes,
      };

      const res = await apiClient.patch<any>(`/emr/encounters/${encounterId}`, payload);
      if (res.success) {
        setSaveSuccessMsg('Draft consultation saved at ' + new Date().toLocaleTimeString());
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      console.error('Save draft error:', err);
      alert(err.message || 'Failed to save draft.');
    } finally {
      setSaving(false);
    }
  };

  // Finalize Encounter Handler
  const handleFinalize = async () => {
    if (!encounterId || isFinalized) return;
    if (diagnoses.length === 0) {
      alert('At least one ICD-10 diagnosis is mandatory to finalize and seal the consultation.');
      return;
    }

    try {
      setFinalizing(true);
      const payload = {
        vitals,
        chiefComplaints,
        historyOfPresentIllness: hpi,
        examinationNotes,
        diagnoses,
        investigations,
        prescriptionItems,
        prescriptionNotes,
      };

      const res = await apiClient.post<any>(`/emr/encounters/${encounterId}/finalize`, payload);
      if (res.success) {
        setEncounterStatus('finalized');
        setFinalizedAt(new Date().toISOString());
        setShowFinalizeModal(false);
        setSaveSuccessMsg('Consultation successfully finalized and sealed.');
      }
    } catch (err: any) {
      console.error('Finalize encounter error:', err);
      alert(err.message || 'Failed to finalize consultation.');
    } finally {
      setFinalizing(false);
    }
  };

  // Helper functions for array updates
  const addComplaint = (complaint: string) => {
    if (isFinalized) return;
    const trimmed = complaint.trim();
    if (trimmed && !chiefComplaints.includes(trimmed)) {
      setChiefComplaints([...chiefComplaints, trimmed]);
      setNewComplaintInput('');
    }
  };

  const removeComplaint = (index: number) => {
    if (isFinalized) return;
    setChiefComplaints(chiefComplaints.filter((_, i) => i !== index));
  };

  const addDiagnosis = (code: string, description: string) => {
    if (isFinalized) return;
    if (diagnoses.some((d) => d.code === code)) return;
    setDiagnoses([
      ...diagnoses,
      {
        code,
        description,
        type: diagnoses.length === 0 ? ('primary' as any) : ('secondary' as any),
        status: 'confirmed' as any,
      },
    ]);
  };

  const removeDiagnosis = (index: number) => {
    if (isFinalized) return;
    setDiagnoses(diagnoses.filter((_, i) => i !== index));
  };

  const addPrescriptionItem = (preset?: typeof MEDICINE_PRESETS[0]) => {
    if (isFinalized) return;
    const newItem: PrescriptionItem = preset
      ? { ...preset }
      : {
          medicineName: '',
          dosageForm: 'tablet',
          strength: '500mg',
          frequency: '1-0-1',
          route: 'oral',
          durationDays: 5,
          quantity: 10,
          instructions: 'After meals',
        };
    setPrescriptionItems([...prescriptionItems, newItem]);
  };

  const updatePrescriptionItem = (index: number, field: keyof PrescriptionItem, value: any) => {
    if (isFinalized) return;
    const updated = [...prescriptionItems];
    updated[index] = { ...updated[index], [field]: value };
    setPrescriptionItems(updated);
  };

  const removePrescriptionItem = (index: number) => {
    if (isFinalized) return;
    setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
  };

  const addInvestigation = (testName: string) => {
    if (isFinalized) return;
    if (investigations.some((inv) => inv.testName === testName)) return;
    setInvestigations([...investigations, { testName, urgency: 'routine' }]);
  };

  const removeInvestigation = (index: number) => {
    if (isFinalized) return;
    setInvestigations(investigations.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6 pb-12">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !patientData) {
    return (
      <AppShell>
        <div className="py-12">
          <ErrorState
            title="Consultation Session Not Found"
            message={error || 'Could not retrieve patient encounter data.'}
            onRetry={loadEncounter}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 pb-16">
        {/* Navigation & Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/emr">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ArrowLeft className="w-3.5 h-3.5" />
                Queue
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">Clinical Consultation</h1>
                {isFinalized ? (
                  <Badge variant="success" className="gap-1 text-xs">
                    <FileCheck className="w-3.5 h-3.5" />
                    Finalized & Sealed
                  </Badge>
                ) : (
                  <Badge variant="warning" className="gap-1 text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    Draft in Progress
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Appointment Token #{appointmentData?.tokenNumber} &bull; Attending Clinician: Dr. {user?.firstName} {user?.lastName}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            {saveSuccessMsg && (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                {saveSuccessMsg}
              </span>
            )}

            {!isFinalized && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="gap-1.5 text-xs"
                >
                  <Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
                  {saving ? 'Saving...' : 'Save Draft'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowFinalizeModal(true)}
                  disabled={finalizing}
                  className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Finalize Consultation
                </Button>
              </>
            )}

            {isFinalized && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5 text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Prescription
              </Button>
            )}
          </div>
        </div>

        {/* Patient Identity Banner */}
        <Card className="border-border/80 bg-gradient-to-r from-teal-500/5 via-card to-card">
          <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-lg shrink-0 uppercase">
                {(patientData.name?.first?.[0] || patientData.firstName?.[0] || 'P')}
                {(patientData.name?.last?.[0] || patientData.lastName?.[0] || '')}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg font-bold text-foreground">
                    {patientData.name
                      ? `${patientData.name.first} ${patientData.name.last}`.trim()
                      : `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim() || 'Patient'}
                  </h2>
                  <Badge variant="outline" className="font-mono text-xs">
                    {patientData.uhid}
                  </Badge>
                  {patientData.gender && (
                    <span className="text-xs text-muted-foreground font-medium">
                      {patientData.gender.toUpperCase()}
                      {patientData.ageYears
                        ? `, ${patientData.ageYears} YRS`
                        : patientData.dateOfBirth
                        ? `, ${Math.max(0, Math.floor((Date.now() - new Date(patientData.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)))} YRS`
                        : ''}
                    </span>
                  )}
                  {patientData.bloodGroup && (
                    <Badge variant="secondary" className="text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/30">
                      Blood Group: {patientData.bloodGroup}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                  <span>Phone: {patientData.contacts?.phone || patientData.phone || 'N/A'}</span>
                  <span>Chief Complaint: {appointmentData?.chiefComplaint || 'None specified'}</span>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <Link href={`/patients/${patientData._id || patientData.id}`} target="_blank">
                <Button variant="ghost" size="sm" className="text-xs text-teal-600 dark:text-teal-400">
                  Full Medical Record &rarr;
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Severe Allergy Alert Banner */}
        {patientData.allergies && patientData.allergies.length > 0 && (
          <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-50/50 dark:bg-rose-950/20 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                Documented Patient Allergies
              </h4>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {patientData.allergies.map((allergy: any, idx: number) => (
                  <Badge key={idx} variant="destructive" className="text-xs">
                    {allergy.allergen || allergy} {allergy.severity ? `(${allergy.severity})` : ''}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Real-time Contraindication Warning Modal/Box */}
        {allergyWarnings.length > 0 && (
          <div className="p-4 rounded-xl border border-amber-500 bg-amber-50 dark:bg-amber-950/40 flex items-start gap-3 shadow-xs animate-pulse">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                Active Medication Contraindication Warning
              </h4>
              {allergyWarnings.map((warning, idx) => (
                <p key={idx} className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                  {warning}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Workstation 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Vitals, Complaints & Notes (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* 1. Vitals Card */}
            <Card className="border-border/80">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-teal-600" />
                    <CardTitle className="text-sm font-semibold">Patient Vital Signs</CardTitle>
                  </div>
                  {computedBmi && (
                    <Badge
                      variant={
                        computedBmi.category === 'normal'
                          ? 'success'
                          : computedBmi.category === 'underweight'
                          ? 'outline'
                          : 'warning'
                      }
                      className="text-[11px] font-semibold"
                    >
                      BMI: {computedBmi.val} ({computedBmi.category.toUpperCase()})
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-muted-foreground font-medium block mb-1">BP Systolic</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="120"
                        disabled={isFinalized}
                        value={vitals.bpSystolic || ''}
                        onChange={(e) => setVitals({ ...vitals, bpSystolic: Number(e.target.value) || undefined })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">mmHg</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-muted-foreground font-medium block mb-1">BP Diastolic</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="80"
                        disabled={isFinalized}
                        value={vitals.bpDiastolic || ''}
                        onChange={(e) => setVitals({ ...vitals, bpDiastolic: Number(e.target.value) || undefined })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">mmHg</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-muted-foreground font-medium block mb-1">Pulse Rate</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="72"
                        disabled={isFinalized}
                        value={vitals.pulse || ''}
                        onChange={(e) => setVitals({ ...vitals, pulse: Number(e.target.value) || undefined })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">bpm</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-muted-foreground font-medium block mb-1">Temperature</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="98.6"
                        disabled={isFinalized}
                        value={vitals.temperature || ''}
                        onChange={(e) => setVitals({ ...vitals, temperature: Number(e.target.value) || undefined })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">°F</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-muted-foreground font-medium block mb-1">SpO2</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="98"
                        disabled={isFinalized}
                        value={vitals.spO2 || ''}
                        onChange={(e) => setVitals({ ...vitals, spO2: Number(e.target.value) || undefined })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-muted-foreground font-medium block mb-1">Resp Rate</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="16"
                        disabled={isFinalized}
                        value={vitals.respiratoryRate || ''}
                        onChange={(e) => setVitals({ ...vitals, respiratoryRate: Number(e.target.value) || undefined })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">/min</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-muted-foreground font-medium block mb-1">Weight</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        placeholder="70"
                        disabled={isFinalized}
                        value={vitals.weight || ''}
                        onChange={(e) => setVitals({ ...vitals, weight: Number(e.target.value) || undefined })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">kg</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-muted-foreground font-medium block mb-1">Height</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="175"
                        disabled={isFinalized}
                        value={vitals.height || ''}
                        onChange={(e) => setVitals({ ...vitals, height: Number(e.target.value) || undefined })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">cm</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Chief Complaints */}
            <Card className="border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Chief Complaints</CardTitle>
                <CardDescription className="text-xs">Primary clinical reasons for consultation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Tag list */}
                <div className="flex flex-wrap gap-1.5 min-h-7">
                  {chiefComplaints.map((complaint, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                    >
                      {complaint}
                      {!isFinalized && (
                        <button
                          onClick={() => removeComplaint(index)}
                          className="hover:text-rose-600 focus:outline-none ml-1"
                        >
                          &times;
                        </button>
                      )}
                    </span>
                  ))}
                  {chiefComplaints.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">No complaints added yet.</span>
                  )}
                </div>

                {/* Quick chip presets */}
                {!isFinalized && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Quick Add Common Symptoms:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {['Fever', 'Cough', 'Headache', 'Chest Pain', 'Sore Throat', 'Abdominal Pain', 'Fatigue'].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => addComplaint(chip)}
                          className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add custom complaint input */}
                {!isFinalized && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add another symptom / complaint..."
                      value={newComplaintInput}
                      onChange={(e) => setNewComplaintInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addComplaint(newComplaintInput);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => addComplaint(newComplaintInput)}
                      className="text-xs"
                    >
                      Add
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3. Clinical Examination & Notes */}
            <Card className="border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Clinical SOAP Notes</CardTitle>
                <CardDescription className="text-xs">History of present illness & physical findings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    History of Present Illness (HPI)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Onset, duration, severity, modifying factors..."
                    disabled={isFinalized}
                    value={hpi}
                    onChange={(e) => setHpi(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Physical Examination Findings
                  </label>
                  <textarea
                    rows={3}
                    placeholder="General appearance, systemic findings (CVS, RS, PA, CNS)..."
                    disabled={isFinalized}
                    value={examinationNotes}
                    onChange={(e) => setExaminationNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 4. Investigation Orders (Lab / Imaging) */}
            <Card className="border-border/80">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Investigation Requisitions</CardTitle>
                  <Badge variant="outline" className="text-[11px]">{investigations.length} Ordered</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {!isFinalized && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Order Diagnostic Tests:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {['Complete Blood Count (CBC)', 'Lipid Profile', 'Liver Function Test (LFT)', 'HbA1c', 'Serum Creatinine', 'Chest X-Ray PA', 'ECG 12-Lead'].map((test) => (
                        <button
                          key={test}
                          type="button"
                          onClick={() => addInvestigation(test)}
                          className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors"
                        >
                          + {test}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {investigations.map((inv, index) => (
                    <div
                      key={index}
                      className="p-2 rounded-lg border border-border bg-muted/20 flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-medium text-foreground">{inv.testName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">
                          {inv.urgency}
                        </span>
                        {!isFinalized && (
                          <button
                            onClick={() => removeInvestigation(index)}
                            className="text-muted-foreground hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {investigations.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No lab or imaging investigations ordered.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Diagnoses & Electronic Prescription (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. ICD-10 Diagnoses */}
            <Card className="border-border/80">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">ICD-10 Diagnoses</CardTitle>
                    <CardDescription className="text-xs">Clinical impressions and confirmed diagnoses</CardDescription>
                  </div>
                  <Badge variant={diagnoses.length > 0 ? 'success' : 'destructive'} className="text-[11px]">
                    {diagnoses.length > 0 ? `${diagnoses.length} Diagnoses Added` : 'Required to Finalize'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Added Diagnoses list */}
                <div className="space-y-2">
                  {diagnoses.map((diag, index) => (
                    <div
                      key={index}
                      className="p-2.5 rounded-lg border border-teal-500/30 bg-teal-50/20 dark:bg-teal-950/20 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-teal-700 dark:text-teal-300">
                            [{diag.code}]
                          </span>
                          <span className="font-semibold text-foreground">{diag.description}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                          <Badge variant="outline" className="text-[10px] uppercase">{diag.type}</Badge>
                          <Badge variant="success" className="text-[10px] uppercase">{diag.status}</Badge>
                        </div>
                      </div>

                      {!isFinalized && (
                        <button
                          onClick={() => removeDiagnosis(index)}
                          className="text-muted-foreground hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {diagnoses.length === 0 && (
                    <div className="p-3 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
                      No diagnosis added yet. Select from common conditions below or enter code.
                    </div>
                  )}
                </div>

                {/* Common ICD-10 Selector */}
                {!isFinalized && (
                  <div className="border-t border-border pt-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Quick Add Common Diagnoses:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {COMMON_ICD10.map((preset) => (
                        <button
                          key={preset.code}
                          type="button"
                          onClick={() => addDiagnosis(preset.code, preset.description)}
                          className="p-1.5 text-left rounded-lg border border-border bg-card hover:border-teal-500 text-xs transition-colors flex items-center justify-between"
                        >
                          <span className="truncate">
                            <strong className="text-teal-600 font-mono">[{preset.code}]</strong> {preset.description}
                          </span>
                          <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. Electronic Prescription Builder (Rx) */}
            <Card className="border-border/80">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-teal-600" />
                    <CardTitle className="text-sm font-semibold">Electronic Prescription (Rx)</CardTitle>
                  </div>
                  {!isFinalized && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addPrescriptionItem()}
                      className="gap-1 text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Medication
                    </Button>
                  )}
                </div>
                <CardDescription className="text-xs">
                  Itemized medication orders with schedules and meal timing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Presets Quick-Add */}
                {!isFinalized && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Formulary Presets:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {MEDICINE_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => addPrescriptionItem(preset)}
                          className="text-[11px] px-2.5 py-1 rounded-md border border-border bg-muted/30 hover:bg-muted text-foreground transition-colors flex items-center gap-1"
                        >
                          <span>+ {preset.medicineName} {preset.strength}</span>
                          <span className="text-[10px] text-muted-foreground">({preset.frequency})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prescription Rows */}
                <div className="space-y-3">
                  {prescriptionItems.map((item, index) => (
                    <div
                      key={index}
                      className="p-3.5 rounded-xl border border-border bg-muted/10 space-y-3 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-teal-600 uppercase">
                          Medication #{index + 1}
                        </span>
                        {!isFinalized && (
                          <button
                            type="button"
                            onClick={() => removePrescriptionItem(index)}
                            className="text-muted-foreground hover:text-rose-600 text-xs flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                        {/* Drug Name */}
                        <div className="sm:col-span-5">
                          <label className="text-[11px] text-muted-foreground font-medium block mb-0.5">
                            Medicine Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Amoxicillin"
                            disabled={isFinalized}
                            value={item.medicineName}
                            onChange={(e) => updatePrescriptionItem(index, 'medicineName', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
                          />
                        </div>

                        {/* Dosage Form */}
                        <div className="sm:col-span-3">
                          <label className="text-[11px] text-muted-foreground font-medium block mb-0.5">
                            Form
                          </label>
                          <select
                            disabled={isFinalized}
                            value={item.dosageForm}
                            onChange={(e) => updatePrescriptionItem(index, 'dosageForm', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
                          >
                            <option value="tablet">Tablet</option>
                            <option value="capsule">Capsule</option>
                            <option value="syrup">Syrup</option>
                            <option value="injection">Injection</option>
                            <option value="ointment">Ointment</option>
                            <option value="inhaler">Inhaler</option>
                            <option value="drops">Drops</option>
                          </select>
                        </div>

                        {/* Strength */}
                        <div className="sm:col-span-4">
                          <label className="text-[11px] text-muted-foreground font-medium block mb-0.5">
                            Strength
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 500mg"
                            disabled={isFinalized}
                            value={item.strength}
                            onChange={(e) => updatePrescriptionItem(index, 'strength', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
                          />
                        </div>

                        {/* Schedule Frequency */}
                        <div className="sm:col-span-4">
                          <label className="text-[11px] text-muted-foreground font-medium block mb-0.5">
                            Frequency
                          </label>
                          <select
                            disabled={isFinalized}
                            value={item.frequency}
                            onChange={(e) => updatePrescriptionItem(index, 'frequency', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60 font-semibold"
                          >
                            <option value="1-0-1">1-0-1 (Morning & Night)</option>
                            <option value="1-0-0">1-0-0 (Morning only)</option>
                            <option value="0-0-1">0-0-1 (Night only)</option>
                            <option value="1-1-1">1-1-1 (TID - Thrice daily)</option>
                            <option value="OD">OD (Once daily)</option>
                            <option value="BD">BD (Twice daily)</option>
                            <option value="TID">TID (Three times daily)</option>
                            <option value="QID">QID (Four times daily)</option>
                            <option value="PRN">PRN (As needed / SOS)</option>
                          </select>
                        </div>

                        {/* Duration */}
                        <div className="sm:col-span-3">
                          <label className="text-[11px] text-muted-foreground font-medium block mb-0.5">
                            Duration (Days)
                          </label>
                          <input
                            type="number"
                            min="1"
                            disabled={isFinalized}
                            value={item.durationDays || ''}
                            onChange={(e) => updatePrescriptionItem(index, 'durationDays', Number(e.target.value) || 1)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
                          />
                        </div>

                        {/* Quantity */}
                        <div className="sm:col-span-2">
                          <label className="text-[11px] text-muted-foreground font-medium block mb-0.5">
                            Total Qty
                          </label>
                          <input
                            type="number"
                            min="1"
                            disabled={isFinalized}
                            value={item.quantity || ''}
                            onChange={(e) => updatePrescriptionItem(index, 'quantity', Number(e.target.value) || 1)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
                          />
                        </div>

                        {/* Instructions */}
                        <div className="sm:col-span-3">
                          <label className="text-[11px] text-muted-foreground font-medium block mb-0.5">
                            Meal Timing
                          </label>
                          <input
                            type="text"
                            placeholder="After meals"
                            disabled={isFinalized}
                            value={item.instructions}
                            onChange={(e) => updatePrescriptionItem(index, 'instructions', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {prescriptionItems.length === 0 && (
                    <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                      No prescription items added. Add items from formulary presets above.
                    </div>
                  )}
                </div>

                {/* Additional Rx Notes */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Special Advice & Dietary Instructions
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Drink plenty of fluids, review after 5 days if fever persists..."
                    disabled={isFinalized}
                    value={prescriptionNotes}
                    onChange={(e) => setPrescriptionNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Finalize Consultation Confirmation Modal */}
        {showFinalizeModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2.5 text-teal-600">
                <FileCheck className="w-6 h-6" />
                <h3 className="text-lg font-bold text-foreground">Sign & Finalize Consultation</h3>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground border-y border-border py-3">
                <p>
                  You are about to complete and seal the consultation for{' '}
                  <strong>
                    {patientData.name
                      ? `${patientData.name.first} ${patientData.name.last}`.trim()
                      : `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim() || 'Patient'}
                  </strong>{' '}
                  ({patientData.uhid}).
                </p>
                <div className="bg-muted/40 p-3 rounded-lg space-y-1 text-foreground">
                  <p><strong>Diagnoses ({diagnoses.length}):</strong> {diagnoses.map((d) => `[${d.code}] ${d.description}`).join('; ') || 'None'}</p>
                  <p><strong>Medications Prescribed:</strong> {prescriptionItems.length} items</p>
                  <p><strong>Investigation Orders:</strong> {investigations.length} items</p>
                </div>
                <p className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Finalized clinical records are sealed and immutable for medico-legal integrity.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFinalizeModal(false)}
                  disabled={finalizing}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleFinalize}
                  disabled={finalizing}
                  className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
                >
                  {finalizing ? 'Sealing...' : 'Confirm & Finalize'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
