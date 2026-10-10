import { Permission, Role, User } from '../types';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  CONTROL_ROOM_OFFICER: [
    'VIEW_DASHBOARD',
    'VIEW_INCIDENT',
    'ACKNOWLEDGE_INCIDENT',
    'VERIFY_INCIDENT',
    'ASSIGN_RESPONSE_UNIT',
    'ESCALATE_INCIDENT',
    'RESOLVE_INCIDENT',
    'VIEW_TOURIST',
    'VIEW_LOCATION',
    'VIEW_EMERGENCY_CONTACT',
    'VIEW_RISK_ZONES',
    'VIEW_ANALYTICS',
    'VIEW_AUDIT_LOG',
    'CREATE_REPORT',
    'REVIEW_REPORT',
  ],
  RESPONDER: [
    'VIEW_DASHBOARD',
    'VIEW_INCIDENT',
    'ACKNOWLEDGE_INCIDENT',
    'RESOLVE_INCIDENT',
    'VIEW_TOURIST',
    'VIEW_LOCATION',
    'VIEW_RISK_ZONES',
    'CREATE_REPORT',
  ],
  SUPERVISOR: [
    'VIEW_DASHBOARD',
    'VIEW_INCIDENT',
    'ACKNOWLEDGE_INCIDENT',
    'VERIFY_INCIDENT',
    'ASSIGN_RESPONSE_UNIT',
    'ESCALATE_INCIDENT',
    'RESOLVE_INCIDENT',
    'VIEW_TOURIST',
    'VIEW_LOCATION',
    'VIEW_EMERGENCY_CONTACT',
    'VIEW_RISK_ZONES',
    'MANAGE_RISK_ZONES',
    'VIEW_ANALYTICS',
    'VIEW_AUDIT_LOG',
    'CREATE_REPORT',
    'REVIEW_REPORT',
  ],
  TOURISM_ADMIN: [
    'VIEW_DASHBOARD',
    'VIEW_INCIDENT',
    'VIEW_TOURIST',
    'VIEW_RISK_ZONES',
    'MANAGE_RISK_ZONES',
    'VIEW_ANALYTICS',
  ],
  SYSTEM_ADMIN: [
    'VIEW_DASHBOARD',
    'VIEW_INCIDENT',
    'ACKNOWLEDGE_INCIDENT',
    'VERIFY_INCIDENT',
    'ASSIGN_RESPONSE_UNIT',
    'ESCALATE_INCIDENT',
    'RESOLVE_INCIDENT',
    'VIEW_TOURIST',
    'VIEW_LOCATION',
    'VIEW_EMERGENCY_CONTACT',
    'VIEW_RISK_ZONES',
    'MANAGE_RISK_ZONES',
    'VIEW_ANALYTICS',
    'VIEW_AUDIT_LOG',
    'MANAGE_USERS',
    'MANAGE_ROLES',
    'CREATE_REPORT',
    'REVIEW_REPORT',
  ],
};

export function can(user: User | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  const permissions = ROLE_PERMISSIONS[user.role];
  return permissions ? permissions.includes(permission) : false;
}

export const ROLE_LABELS: Record<Role, { title: string; clearance: string; description: string }> = {
  CONTROL_ROOM_OFFICER: {
    title: 'Control Room Officer',
    clearance: 'Level 3 (Emergency Ops Console - Active Duty Dispatch Clearance)',
    description: 'Full triage, incident acknowledgement, verification, responder dispatch, and E-FIR draft review.',
  },
  RESPONDER: {
    title: 'Field Responder',
    clearance: 'Level 2 (Tactical Field Intercept Clearance)',
    description: 'Field unit status updates, on-scene verification, tourist assistance, and field findings logging.',
  },
  SUPERVISOR: {
    title: 'Sector Supervisor',
    clearance: 'Level 4 (Command & Statutory Oversight Clearance)',
    description: 'Full operational command, geofence threshold control, E-FIR sign-off, and SLA audit review.',
  },
  TOURISM_ADMIN: {
    title: 'Tourism Safety Admin',
    clearance: 'Level 1 (Privacy-Filtered Advisory & Risk Zone Clearance)',
    description: 'Manages risk zones, circuit advisories, and anonymised safety analytics. Restricted from private kin/biometric telemetry.',
  },
  SYSTEM_ADMIN: {
    title: 'System Administrator',
    clearance: 'Level 5 (System Governance & RBAC Provisioning)',
    description: 'Full access to RBAC role matrices, officer accounts, system configuration, and audit trails.',
  },
};
