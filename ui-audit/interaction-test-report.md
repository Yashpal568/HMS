# HMS Interactive Verification & UX Test Report

## Overview
This report documents live interactive behavioral tests executed across `apps/hms-client` during the audit cycle.

## Test Matrix

### 1. Authentication & Session Security
| Test Case | Target Route | Executed Actions | Expected Outcome | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Unauthenticated Route Redirection** | `/dashboard` | Direct browser navigation without JWT token in localStorage | Automatic redirect to `/login` | Redirected to `http://localhost:3000/login` | **PASS** |
| **Staff Form Authentication** | `/login` | Entered email `admin@hms.local`, password `Admin@HMS2026`, clicked Submit | JWT token issued, stored in `localStorage('hms_token')`, redirected to `/dashboard` | Token stored, profile loaded, redirected to `/dashboard` | **PASS** |
| **Session Persistence** | `/dashboard` | Page reload while token present in localStorage | Session maintained, user profile fetched via `GET /api/v1/auth/me` | User remained logged in without re-authenticating | **PASS** |

### 2. Multi-Role Workspaces & Dynamic Sidebar
| Role | Email | Active Workspace | Key Nav Items Rendered | Dashboard Focus | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hospital Administrator** | `admin@hms.local` | `HOSPITAL_ADMIN` | Executive Cockpit, Patients, Appointments, EMR, IPD, Lab, Pharmacy, Inventory, Billing, Reports, Staff, Departments, Users, Roles, Permissions, Workspaces, Audit | Master Hospital Flow & Bed Occupancy Gauge | **PASS** |
| **Doctor** | `dr.sharma@hms.local` | `DOCTOR` | Clinical Cockpit, My Schedule, OPD Queue, My Patients, EMR & Encounters, Lab Orders, Shift Roster, Diagnostic Reports | Current Patient Callout (`A-021`), Next Patient Peek, Live Queue Table | **PASS** |
| **Pharmacist** | `pharmacy.staff@hms.local` | `PHARMACIST` | Dispensary, Prescriptions, Dispensing Counter, Batch Stock, Bulk Import | Pending e-Prescriptions Queue, Expiring Batches Watch | **PASS** |
| **Accountant** | `billing.staff@hms.local` | `ACCOUNTANT` | Revenue Cockpit, Invoice Ledger, Universal Invoice Wizard, Payments Register, Refunds Queue, Service Tariffs | Amount Collected in `₹ INR`, Payment Methods Breakdown | **PASS** |
| **Receptionist** | `opd.staff@hms.local` | `RECEPTIONIST` | OPD Token Hub, Register Patient, Book Appointment, Check In, Live OPD Token Board | Active Token Queue Board (`A-021` to `A-025`), Registration Ledger | **PASS** |
| **Lab Technician** | `lab.staff@hms.local` | `LAB_TECHNICIAN` | Diagnostic Station, Requisitions, Dual-Bench Worklist, Test Catalog, Analyzer Telemetry | Lab Orders Worksheet, Automated Analyzer Telemetry | **PASS** |

### 3. Interactive Modals & Dialogs
| Component | Route | Trigger Action | Dialog State Verified | Close Action | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **New Employee Modal** | `/employees` | Click "+ New Employee" | Modal rendered with 3 tabs: Personal, Employment, Login Account & Workspaces | Escape key pressed, modal dismissed | **PASS** |
| **Invite User Modal** | `/users` | Click "+ Invite Staff User" | Modal rendered with email input, role dropdown, temporary password generator | Escape key pressed, modal dismissed | **PASS** |
| **Create Custom Role Modal** | `/roles` | Click "+ Create Custom Role" | Modal rendered with Role Name, Description, and Domain Permissions Checkbox Grid | Escape key pressed, modal dismissed | **PASS** |
| **Add Tariff Service Modal** | `/billing/tariffs` | Click "+ Add Service" | Modal rendered with Service Code, Category, Department, Price in `₹ INR` | Escape key pressed, modal dismissed | **PASS** |
