/**
 * @hms/auth - Shared Authentication & Authorization Contracts
 *
 * Provides shared token interfaces, role categories, tenant context interfaces,
 * and client-side authorization helpers for all surfaces:
 * - apps/server
 * - apps/hms-client
 * - apps/patient-app
 * - apps/super-admin
 */

import { UserRole } from '@hms/types';

export { UserRole };

/**
 * High-level User Context Classification across Platform, Hospital, and Patient
 */
export enum UserSurface {
  PLATFORM = 'PLATFORM', // Super Admin, Platform Support
  HOSPITAL = 'HOSPITAL', // Hospital Admin, Doctor, Nurse, Staff
  PATIENT = 'PATIENT',   // Patient healthcare portal user
}

/**
 * Standard Decoded JWT Payload across all application surfaces
 */
export interface AuthenticatedJwtPayload {
  sub: string;            // User ID
  email: string;          // User Email
  role: UserRole | string;// Assigned Role
  tenantId?: string;      // Tenant ID (for Hospital and Patient contexts)
  hospitalId?: string;    // Hospital ID alias
  surface: UserSurface;   // Originating user surface
  iat?: number;
  exp?: number;
}

/**
 * Sovereign Tenant Context resolved strictly by the server
 */
export interface ResolvedTenantContext {
  tenantId: string;
  isPlatformAdmin: boolean;
  hospitalName?: string;
  planTier?: string;
}

/**
 * Client Session State representation
 */
export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  tenantId?: string;
  surface: UserSurface;
  token: string;
}

/**
 * Helper to determine user surface from role
 */
export function getSurfaceFromRole(role: string): UserSurface {
  if (role === UserRole.SUPER_ADMIN || role === 'PLATFORM_SUPER_ADMIN') {
    return UserSurface.PLATFORM;
  }
  if (role === 'PATIENT') {
    return UserSurface.PATIENT;
  }
  return UserSurface.HOSPITAL;
}

/**
 * Helper to extract Bearer token from authorization header string
 */
export function extractBearerToken(authHeader?: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7).trim();
}
