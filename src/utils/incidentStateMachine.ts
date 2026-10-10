import { IncidentStatus } from '../types';

const ALLOWED_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  NEW: ['ACKNOWLEDGED', 'VERIFYING', 'ASSIGNED'],
  ACTIVE: ['ACKNOWLEDGED', 'VERIFYING', 'ASSIGNED'],
  ACKNOWLEDGED: ['VERIFYING', 'ASSIGNED', 'EN_ROUTE', 'RESOLVING'],
  VERIFYING: ['ACKNOWLEDGED', 'ASSIGNED', 'UNFOUNDED', 'RESOLVING'],
  ASSIGNED: ['EN_ROUTE', 'ON_SCENE', 'RESOLVING'],
  EN_ROUTE: ['ON_SCENE', 'RESOLVING'],
  ON_SCENE: ['RESOLVING', 'RESOLVED'],
  RESOLVING: ['RESOLVED'],
  RESOLVED: [],
  UNFOUNDED: [],
};

export function canTransitionIncident(from: IncidentStatus, to: IncidentStatus): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

export function getNextAllowedStatuses(status: IncidentStatus): IncidentStatus[] {
  return ALLOWED_TRANSITIONS[status] || [];
}

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  NEW: 'UNASSIGNED - NEW',
  ACTIVE: 'UNASSIGNED - PENDING DISPATCH',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  VERIFYING: 'VERIFYING SIGNALS',
  ASSIGNED: 'UNIT ASSIGNED',
  EN_ROUTE: 'UNIT EN ROUTE',
  ON_SCENE: 'RESPONDER ON SCENE',
  RESOLVING: 'RESOLVING',
  RESOLVED: 'RESOLVED / SAFE',
  UNFOUNDED: 'UNFOUNDED / CLEARED',
};
