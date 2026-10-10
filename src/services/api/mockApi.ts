import {
  INITIAL_ANOMALIES,
  INITIAL_AUDIT_LOGS,
  INITIAL_CHECKINS,
  INITIAL_GEOFENCE_EVENTS,
  INITIAL_INCIDENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_REPORTS,
  INITIAL_RESPONSE_UNITS,
  INITIAL_RISK_ZONES,
  INITIAL_TOURISTS,
} from '../../mock/mockData';
import {
  Anomaly,
  AuditLog,
  CheckIn,
  GeoFenceEvent,
  Incident,
  IncidentReport,
  Notification,
  ResponseUnit,
  RiskZone,
  Tourist,
} from '../../types';

/**
 * Typed API Service Layer (MERN Backend Boundary)
 * Currently backed by deterministic in-memory state + mock latency.
 * Ready to swap with fetch(`${import.meta.env.VITE_API_BASE_URL}/...`) when Express + MongoDB backend is attached.
 */
const simulateNetwork = async <T>(data: T, delayMs = 120): Promise<T> => {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return data;
};

export const incidentsApi = {
  getAll: () => simulateNetwork<Incident[]>([...INITIAL_INCIDENTS]),
  getById: (id: string) =>
    simulateNetwork<Incident | undefined>(INITIAL_INCIDENTS.find((i) => i.id === id)),
};

export const touristsApi = {
  getAll: () => simulateNetwork<Tourist[]>([...INITIAL_TOURISTS]),
  getById: (idOrDtid: string) =>
    simulateNetwork<Tourist | undefined>(
      INITIAL_TOURISTS.find((t) => t.id === idOrDtid || t.dtid === idOrDtid)
    ),
};

export const riskZonesApi = {
  getAll: () => simulateNetwork<RiskZone[]>([...INITIAL_RISK_ZONES]),
  getEvents: () => simulateNetwork<GeoFenceEvent[]>([...INITIAL_GEOFENCE_EVENTS]),
};

export const alertsApi = {
  getAnomalies: () => simulateNetwork<Anomaly[]>([...INITIAL_ANOMALIES]),
  getCheckIns: () => simulateNetwork<CheckIn[]>([...INITIAL_CHECKINS]),
  getNotifications: () => simulateNetwork<Notification[]>([...INITIAL_NOTIFICATIONS]),
};

export const responseTeamsApi = {
  getAllUnits: () => simulateNetwork<ResponseUnit[]>([...INITIAL_RESPONSE_UNITS]),
};

export const reportsApi = {
  getAll: () => simulateNetwork<IncidentReport[]>([...INITIAL_REPORTS]),
  getById: (id: string) =>
    simulateNetwork<IncidentReport | undefined>(INITIAL_REPORTS.find((r) => r.id === id)),
};

export const auditApi = {
  getLogs: () => simulateNetwork<AuditLog[]>([...INITIAL_AUDIT_LOGS]),
};
