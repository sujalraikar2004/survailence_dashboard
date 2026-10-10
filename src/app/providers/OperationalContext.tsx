import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  DEMO_USERS,
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
  STITCH_ASSETS,
} from '../../mock/mockData';
import {
  alertsApi,
  auditApi,
  incidentsApi,
  reportsApi,
  responseTeamsApi,
  riskZonesApi,
  touristsApi,
} from '../../services/api/mockApi';
import {
  Anomaly,
  AuditLog,
  CheckIn,
  DemoScenarioId,
  GeoFenceEvent,
  Incident,
  IncidentReport,
  IncidentStatus,
  Notification,
  ResolutionType,
  ResponseUnit,
  ResponseUnitStatus,
  RiskZone,
  SystemConnectivityState,
  Tourist,
  User,
} from '../../types';
import { useAuth } from './AuthContext';

export interface ToastItem {
  id: string;
  message: string;
  variant: 'PRIMARY' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
}

interface OperationalContextValue {
  incidents: Incident[];
  tourists: Tourist[];
  riskZones: RiskZone[];
  geofenceEvents: GeoFenceEvent[];
  anomalies: Anomaly[];
  checkIns: CheckIn[];
  responseUnits: ResponseUnit[];
  reports: IncidentReport[];
  auditLogs: AuditLog[];
  notifications: Notification[];
  users: User[];
  isLoading: boolean;
  error: string | null;
  connectivityState: SystemConnectivityState;
  audioMuted: boolean;
  demoModeOpen: boolean;
  demoWorkflowStep: number;
  toasts: ToastItem[];
  setConnectivityState: (state: SystemConnectivityState) => void;
  setAudioMuted: (muted: boolean) => void;
  setDemoModeOpen: (open: boolean) => void;
  showToast: (message: string, variant?: ToastItem['variant']) => void;
  dismissToast: (id: string) => void;
  retryLoadData: () => Promise<void>;
  simulateErrorState: () => void;
  acknowledgeIncident: (incidentId: string) => void;
  verifyIncident: (
    incidentId: string,
    action: 'VERIFY' | 'REQUEST_CONFIRMATION' | 'ESCALATE',
    notes?: string
  ) => void;
  assignResponseUnit: (incidentId: string, unitId: string, instructions?: string) => void;
  updateIncidentResponseState: (
    incidentId: string,
    nextStatus: 'EN_ROUTE' | 'ON_SCENE'
  ) => void;
  updateUnitStatus: (unitId: string, status: ResponseUnitStatus) => void;
  escalateIncident: (incidentId: string, reason: string) => void;
  resolveIncident: (
    incidentId: string,
    resolutionType: ResolutionType,
    notes: string
  ) => void;
  handleAnomalyAction: (
    anomalyId: string,
    action: 'VERIFY_SIGNALS' | 'ESCALATE' | 'MARK_EXPLAINED' | 'SEND_PROMPT'
  ) => void;
  handleCheckInAction: (
    checkInId: string,
    action: 'SEND_PROMPT' | 'MARK_VERIFIED' | 'ESCALATE'
  ) => void;
  saveReportDraft: (report: IncidentReport) => void;
  submitReportToDiary: (reportId: string) => void;
  generateDraftReportForIncident: (incidentId: string) => IncidentReport;
  saveRiskZone: (zone: RiskZone) => void;
  deleteRiskZone: (zoneId: string) => void;
  toggleRiskZoneStatus: (zoneId: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  recordAuditAction: (action: string, resource: string, resourceId: string, details: string) => void;
  triggerDemoScenario: (scenario: DemoScenarioId) => void;
  advanceMasterDemoStep: (targetStep?: number) => void;
  resetDemoState: () => void;
  updateUserRoleOrStatus: (userId: string, updates: Partial<User>) => void;
}

const OperationalContext = createContext<OperationalContextValue | undefined>(undefined);

function getNowIstTime(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export const OperationalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [incidents, setIncidents] = useState<Incident[]>(INITIAL_INCIDENTS);
  const [tourists, setTourists] = useState<Tourist[]>(INITIAL_TOURISTS);
  const [riskZones, setRiskZones] = useState<RiskZone[]>(INITIAL_RISK_ZONES);
  const [geofenceEvents, setGeofenceEvents] = useState<GeoFenceEvent[]>(INITIAL_GEOFENCE_EVENTS);
  const [anomalies, setAnomalies] = useState<Anomaly[]>(INITIAL_ANOMALIES);
  const [checkIns, setCheckIns] = useState<CheckIn[]>(INITIAL_CHECKINS);
  const [responseUnits, setResponseUnits] = useState<ResponseUnit[]>(INITIAL_RESPONSE_UNITS);
  const [reports, setReports] = useState<IncidentReport[]>(INITIAL_REPORTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [users, setUsers] = useState<User[]>(DEMO_USERS);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [connectivityState, setConnectivityState] = useState<SystemConnectivityState>('ONLINE');
  const [audioMuted, setAudioMuted] = useState<boolean>(false);
  const [demoModeOpen, setDemoModeOpen] = useState<boolean>(false);
  const [demoWorkflowStep, setDemoWorkflowStep] = useState<number>(1);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (message: string, variant: ToastItem['variant'] = 'PRIMARY') => {
      const id = `tst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const recordAuditAction = useCallback(
    (action: string, resource: string, resourceId: string, details: string) => {
      const officerName = user?.name || 'Insp. Ananya Sharma';
      const officerBadge = user?.badgeNumber || '#8841';
      const officerRole = user?.role || 'CONTROL_ROOM_OFFICER';
      const newLog: AuditLog = {
        id: `AUD-${Date.now()}`,
        officerName,
        officerBadge,
        role: officerRole,
        action,
        resource,
        resourceId,
        timestamp: `${getNowIstTime()} IST`,
        result: 'SUCCESS',
        details,
        hashSignature: `SHA256:${Math.random().toString(16).slice(2, 6)}...${Math.random()
          .toString(16)
          .slice(2, 6)}`,
      };
      setAuditLogs((prev) => [newLog, ...prev]);
    },
    [user]
  );

  const addNotification = useCallback(
    (
      type: Notification['type'],
      title: string,
      message: string,
      linkTo: string,
      resourceId?: string
    ) => {
      const newNotif: Notification = {
        id: `NTF-${Date.now()}`,
        type,
        title,
        message,
        timestamp: 'Just now',
        read: false,
        linkTo,
        resourceId,
      };
      setNotifications((prev) => [newNotif, ...prev]);
    },
    []
  );

  const retryLoadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [inc, tr, rz, gfe, anom, chk, units, rpts, aud, notifs] = await Promise.all([
        incidentsApi.getAll(),
        touristsApi.getAll(),
        riskZonesApi.getAll(),
        riskZonesApi.getEvents(),
        alertsApi.getAnomalies(),
        alertsApi.getCheckIns(),
        responseTeamsApi.getAllUnits(),
        reportsApi.getAll(),
        auditApi.getLogs(),
        alertsApi.getNotifications(),
      ]);
      setIncidents(inc);
      setTourists(tr);
      setRiskZones(rz);
      setGeofenceEvents(gfe);
      setAnomalies(anom);
      setCheckIns(chk);
      setResponseUnits(units);
      setReports(rpts);
      setAuditLogs(aud);
      setNotifications(notifs);
    } catch {
      setError('Unable to load incidents and telemetry feed. Please retry.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial lightweight load check
    void retryLoadData();
  }, [retryLoadData]);

  const simulateErrorState = useCallback(() => {
    setError('Unable to load incidents. Telemetry gateway timed out.');
    showToast('Unable to update incident. Please retry.', 'CRITICAL');
  }, [showToast]);

  const acknowledgeIncident = useCallback(
    (incidentId: string) => {
      const officerName = user?.name || 'Inspector Ananya Sharma';
      const timeStr = getNowIstTime();

      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc.id !== incidentId) return inc;
          const nextStatus: IncidentStatus =
            inc.status === 'NEW' || inc.status === 'ACTIVE' ? 'ACKNOWLEDGED' : inc.status;
          return {
            ...inc,
            status: nextStatus,
            acknowledgedBy: officerName,
            lastUpdatedAt: `14 Oct 2026, ${timeStr} IST`,
            timeline: [
              ...inc.timeline,
              {
                id: `TL-${Date.now()}`,
                incidentId: inc.id,
                timestamp: timeStr,
                title: 'Acknowledged',
                description: `${officerName} acknowledged incident.`,
                actor: officerName,
                category: 'COMMAND',
                highlight: 'PRIMARY',
              },
            ],
          };
        })
      );

      recordAuditAction(
        `Acknowledged ${incidentId}`,
        `Incident ${incidentId}`,
        incidentId,
        `${officerName} acknowledged incident and assumed EOC triage control.`
      );
      addNotification(
        'HIGH_PRIORITY',
        `Incident ${incidentId} Acknowledged`,
        `${officerName} acknowledged ${incidentId}. Ready for verification and unit dispatch.`,
        `/incidents/${incidentId}`,
        incidentId
      );
      showToast('Incident acknowledged.', 'SUCCESS');
    },
    [user, recordAuditAction, addNotification, showToast]
  );

  const verifyIncident = useCallback(
    (
      incidentId: string,
      action: 'VERIFY' | 'REQUEST_CONFIRMATION' | 'ESCALATE',
      notes?: string
    ) => {
      const officerName = user?.name || 'Inspector Ananya Sharma';
      const timeStr = getNowIstTime();

      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc.id !== incidentId) return inc;
          const nextVerificationState =
            action === 'VERIFY' || action === 'ESCALATE' ? 'VERIFIED' : 'VERIFYING_SIGNALS';
          const nextStatus: IncidentStatus =
            action === 'REQUEST_CONFIRMATION'
              ? 'VERIFYING'
              : inc.status === 'NEW' || inc.status === 'ACTIVE'
              ? 'ACKNOWLEDGED'
              : inc.status;

          const eventTitle =
            action === 'VERIFY'
              ? 'Signals Verified'
              : action === 'REQUEST_CONFIRMATION'
              ? 'Confirmation Prompted'
              : 'Escalated After Verification';
          const eventDesc =
            notes ||
            (action === 'VERIFY'
              ? `${officerName} verified multi-sensor anomaly signals (Route deviation + inactivity + risk-zone entry).`
              : action === 'REQUEST_CONFIRMATION'
              ? `Two-way SMS & VoLTE confirmation request transmitted to tourist device.`
              : `Escalated to Critical Priority following human verification.`);

          return {
            ...inc,
            status: nextStatus,
            verifiedBy: officerName,
            verificationState: nextVerificationState,
            severity: action === 'ESCALATE' ? 'CRITICAL' : inc.severity,
            lastUpdatedAt: `14 Oct 2026, ${timeStr} IST`,
            timeline: [
              ...inc.timeline,
              {
                id: `TL-${Date.now()}`,
                incidentId: inc.id,
                timestamp: timeStr,
                title: eventTitle,
                description: eventDesc,
                actor: officerName,
                category: 'COMMAND',
                highlight: action === 'ESCALATE' ? 'CRITICAL' : 'PRIMARY',
              },
            ],
          };
        })
      );

      recordAuditAction(
        `Verified Incident Signals (${action})`,
        `Incident ${incidentId}`,
        incidentId,
        notes || `Officer ${officerName} executed verification workflow: ${action}.`
      );
      showToast(
        action === 'REQUEST_CONFIRMATION'
          ? 'Tourist confirmation ping transmitted.'
          : 'Anomaly signals verified by officer.',
        'SUCCESS'
      );
    },
    [user, recordAuditAction, showToast]
  );

  const assignResponseUnit = useCallback(
    (incidentId: string, unitId: string, instructions?: string) => {
      const officerName = user?.name || 'Inspector Ananya Sharma';
      const timeStr = getNowIstTime();
      const targetUnit = responseUnits.find((u) => u.id === unitId || u.name === unitId);
      const unitName = targetUnit ? targetUnit.name : unitId;
      const resolvedUnitId = targetUnit ? targetUnit.id : unitId;

      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc.id !== incidentId) return inc;
          return {
            ...inc,
            status: 'ASSIGNED',
            assignedUnitId: resolvedUnitId,
            assignedUnitName: unitName,
            acknowledgedBy: inc.acknowledgedBy || officerName,
            lastUpdatedAt: `14 Oct 2026, ${timeStr} IST`,
            timeline: [
              ...inc.timeline,
              {
                id: `TL-${Date.now()}`,
                incidentId: inc.id,
                timestamp: timeStr,
                title: `Assigned ${unitName}`,
                description: instructions
                  ? `${unitName} assigned (${targetUnit?.distanceKm ?? 1.8} km away, ETA ${
                      targetUnit?.etaText ?? '04:20'
                    }). Instruction: ${instructions}`
                  : `${officerName} assigned response unit ${unitName} (${
                      targetUnit?.distanceKm ?? 1.8
                    } km away, ETA ${targetUnit?.etaText ?? '04:20'}).`,
                actor: officerName,
                category: 'DISPATCH',
                highlight: 'PRIMARY',
              },
            ],
          };
        })
      );

      setResponseUnits((prev) =>
        prev.map((u) => {
          if (u.id !== resolvedUnitId) return u;
          return {
            ...u,
            status: 'EN_ROUTE',
            statusBadgeText: 'ASSIGNED / EN ROUTE',
            currentIncidentId: incidentId,
            speedKmh: u.speedKmh > 0 ? u.speedKmh : 46,
          };
        })
      );

      recordAuditAction(
        `Assigned ${unitName}`,
        `Incident ${incidentId}`,
        incidentId,
        `Dispatched ${unitName} to ${incidentId}. ${instructions || 'Standard Code-3 intercept.'}`
      );
      addNotification(
        'RESPONSE_ASSIGNMENT',
        `Response Unit ${unitName} Assigned`,
        `${unitName} dispatched to ${incidentId} (ETA ${targetUnit?.etaText ?? '04m 20s'}).`,
        `/incidents/${incidentId}`,
        incidentId
      );
      showToast('Response unit assigned.', 'SUCCESS');
    },
    [user, responseUnits, recordAuditAction, addNotification, showToast]
  );

  const updateIncidentResponseState = useCallback(
    (incidentId: string, nextStatus: 'EN_ROUTE' | 'ON_SCENE') => {
      const officerName = user?.name || 'Inspector Ananya Sharma';
      const timeStr = getNowIstTime();

      const targetIncident = incidents.find((i) => i.id === incidentId);
      const unitName = targetIncident?.assignedUnitName || 'Alpha-12';
      const unitId = targetIncident?.assignedUnitId || 'UNIT-ALPHA-12';

      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc.id !== incidentId) return inc;
          return {
            ...inc,
            status: nextStatus,
            assignedUnitId: unitId,
            assignedUnitName: unitName,
            lastUpdatedAt: `14 Oct 2026, ${timeStr} IST`,
            timeline: [
              ...inc.timeline,
              {
                id: `TL-${Date.now()}`,
                incidentId: inc.id,
                timestamp: timeStr,
                title: nextStatus === 'EN_ROUTE' ? `${unitName} En Route` : `${unitName} On Scene`,
                description:
                  nextStatus === 'EN_ROUTE'
                    ? `${unitName} moving toward incident coordinates (1.4 km remaining).`
                    : `${unitName} arrived on scene and established visual/physical contact with tourist.`,
                actor: unitName,
                category: 'DISPATCH',
                highlight: 'PRIMARY',
              },
            ],
          };
        })
      );

      setResponseUnits((prev) =>
        prev.map((u) => {
          if (u.id !== unitId && u.name !== unitName) return u;
          return {
            ...u,
            status: nextStatus,
            statusBadgeText: nextStatus === 'EN_ROUTE' ? 'CRITICAL EN ROUTE' : 'ON SCENE',
            currentIncidentId: incidentId,
            distanceKm: nextStatus === 'ON_SCENE' ? 0.0 : 1.2,
            speedKmh: nextStatus === 'ON_SCENE' ? 0 : 48,
            etaText: nextStatus === 'ON_SCENE' ? 'ON SCENE' : '02m 40s',
            mapX: nextStatus === 'ON_SCENE' ? 720 : 665,
            mapY: nextStatus === 'ON_SCENE' ? 290 : 315,
          };
        })
      );

      recordAuditAction(
        `Updated unit state to ${nextStatus}`,
        `Incident ${incidentId} / ${unitName}`,
        incidentId,
        `${officerName} updated response tracking state for ${unitName} to ${nextStatus}.`
      );
      showToast(
        `Response unit ${unitName} status updated to ${
          nextStatus === 'EN_ROUTE' ? 'EN ROUTE' : 'ON SCENE'
        }.`,
        'PRIMARY'
      );
    },
    [user, incidents, recordAuditAction, showToast]
  );

  const updateUnitStatus = useCallback(
    (unitId: string, status: ResponseUnitStatus) => {
      const timeStr = getNowIstTime();
      const unit = responseUnits.find((u) => u.id === unitId);
      setResponseUnits((prev) =>
        prev.map((u) => {
          if (u.id !== unitId) return u;
          return {
            ...u,
            status,
            statusBadgeText: status.replace('_', ' '),
            speedKmh: status === 'EN_ROUTE' ? 48 : 0,
            etaText:
              status === 'ON_SCENE'
                ? 'ON SCENE'
                : status === 'AVAILABLE'
                ? 'Standby Ready'
                : u.etaText,
          };
        })
      );
      if (unit?.currentIncidentId && (status === 'EN_ROUTE' || status === 'ON_SCENE')) {
        setIncidents((prev) =>
          prev.map((inc) =>
            inc.id === unit.currentIncidentId
              ? {
                  ...inc,
                  status,
                  lastUpdatedAt: `14 Oct 2026, ${timeStr} IST`,
                }
              : inc
          )
        );
      }
      recordAuditAction(
        `Changed Unit Status to ${status}`,
        `Response Unit ${unit?.name || unitId}`,
        unitId,
        `Updated operational status to ${status} at ${timeStr} IST.`
      );
      showToast(`Unit ${unit?.name || unitId} marked ${status.replace('_', ' ')}.`, 'PRIMARY');
    },
    [responseUnits, recordAuditAction, showToast]
  );

  const escalateIncident = useCallback(
    (incidentId: string, reason: string) => {
      const officerName = user?.name || 'Inspector Ananya Sharma';
      const timeStr = getNowIstTime();

      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc.id !== incidentId) return inc;
          return {
            ...inc,
            severity: 'CRITICAL',
            tierLabel: 'CRITICAL SOS - TIER 1 (ESCALATED)',
            lastUpdatedAt: `14 Oct 2026, ${timeStr} IST`,
            timeline: [
              ...inc.timeline,
              {
                id: `TL-${Date.now()}`,
                incidentId: inc.id,
                timestamp: timeStr,
                title: 'Escalated to SP HQ',
                description: `Escalated by ${officerName}: ${reason}`,
                actor: officerName,
                category: 'COMMAND',
                highlight: 'CRITICAL',
              },
            ],
          };
        })
      );

      recordAuditAction(
        `Escalated ${incidentId} to SP HQ & SDRF`,
        `Incident ${incidentId}`,
        incidentId,
        `Reason: ${reason}`
      );
      addNotification(
        'CRITICAL_INCIDENT',
        `Incident ${incidentId} Escalated`,
        `Escalated to SP HQ & SDRF Rescue Command: ${reason}`,
        `/incidents/${incidentId}`,
        incidentId
      );
      showToast(`Incident ${incidentId} escalated to SP HQ.`, 'WARNING');
    },
    [user, recordAuditAction, addNotification, showToast]
  );

  const resolveIncident = useCallback(
    (incidentId: string, resolutionType: ResolutionType, notes: string) => {
      const officerName = user?.name || 'Inspector Ananya Sharma';
      const timeStr = getNowIstTime();
      const targetInc = incidents.find((i) => i.id === incidentId);
      const nextStatus: IncidentStatus =
        resolutionType === 'False / Unfounded' ? 'UNFOUNDED' : 'RESOLVED';

      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc.id !== incidentId) return inc;
          return {
            ...inc,
            status: nextStatus,
            verificationState: nextStatus === 'UNFOUNDED' ? 'UNFOUNDED' : 'VERIFIED',
            lastUpdatedAt: `14 Oct 2026, ${timeStr} IST`,
            resolution: {
              type: resolutionType,
              notes,
              resolvedBy: officerName,
              resolvedAt: `14 Oct 2026, ${timeStr} IST`,
            },
            timeline: [
              ...inc.timeline,
              {
                id: `TL-${Date.now()}`,
                incidentId: inc.id,
                timestamp: timeStr,
                title: `Incident ${nextStatus === 'UNFOUNDED' ? 'Unfounded' : 'Resolved'}`,
                description: `Resolution (${resolutionType}): ${notes}`,
                actor: officerName,
                category: 'RESOLUTION',
                highlight: 'PRIMARY',
              },
            ],
          };
        })
      );

      if (targetInc) {
        setTourists((prev) =>
          prev.map((t) =>
            t.id === targetInc.touristId || t.dtid === targetInc.dtid
              ? {
                  ...t,
                  safetyStatus: 'NORMAL',
                  checkInStatus: 'OK',
                  lastCheckInTime: `${timeStr} IST`,
                }
              : t
          )
        );

        if (targetInc.assignedUnitId) {
          setResponseUnits((prev) =>
            prev.map((u) =>
              u.id === targetInc.assignedUnitId
                ? {
                    ...u,
                    status: 'AVAILABLE',
                    statusBadgeText: 'AVAILABLE',
                    currentIncidentId: null,
                    speedKmh: 0,
                  }
                : u
            )
          );
        }
      }

      recordAuditAction(
        `Resolved ${incidentId} (${resolutionType})`,
        `Incident ${incidentId}`,
        incidentId,
        notes
      );
      addNotification(
        'HIGH_PRIORITY',
        `Incident ${incidentId} Resolved`,
        `Marked ${resolutionType} by ${officerName}. Moved to Incident History.`,
        `/incidents/${incidentId}`,
        incidentId
      );
      showToast(`Incident ${incidentId} resolved and logged.`, 'SUCCESS');
    },
    [user, incidents, recordAuditAction, addNotification, showToast]
  );

  const handleAnomalyAction = useCallback(
    (
      anomalyId: string,
      action: 'VERIFY_SIGNALS' | 'ESCALATE' | 'MARK_EXPLAINED' | 'SEND_PROMPT'
    ) => {
      const target = anomalies.find((a) => a.id === anomalyId);
      if (!target) return;

      setAnomalies((prev) =>
        prev.map((a) => {
          if (a.id !== anomalyId) return a;
          if (action === 'MARK_EXPLAINED') {
            return {
              ...a,
              status: 'DISMISSED',
              diagnosticNote: 'Marked explained / false alarm after operator verification.',
            };
          }
          if (action === 'ESCALATE') {
            return {
              ...a,
              status: 'PROMOTED_TO_EMERGENCY',
              severity: 'CRITICAL_CONCERN',
              diagnosticNote: 'Escalated to Level-3/4 Incident Queue by operator.',
            };
          }
          if (action === 'VERIFY_SIGNALS') {
            return {
              ...a,
              status: 'VERIFIED',
              diagnosticNote: 'Sensor signals verified by operator; active monitoring engaged.',
            };
          }
          return {
            ...a,
            diagnosticNote: `Auto-SMS & App safety check prompt dispatched at ${getNowIstTime()} IST.`,
          };
        })
      );

      recordAuditAction(
        `Anomaly ${action} on ${anomalyId}`,
        `Anomaly ${anomalyId} (${target.touristName})`,
        anomalyId,
        `Executed ${action} for ${target.dtid}`
      );
      showToast(
        action === 'MARK_EXPLAINED'
          ? `Anomaly ${anomalyId} marked as explained.`
          : action === 'ESCALATE'
          ? `Anomaly ${anomalyId} escalated to Incident Queue.`
          : action === 'VERIFY_SIGNALS'
          ? `Sensor signals for ${target.touristName} verified.`
          : `Safety confirmation prompt sent to ${target.touristName}.`,
        'SUCCESS'
      );
    },
    [anomalies, recordAuditAction, showToast]
  );

  const handleCheckInAction = useCallback(
    (checkInId: string, action: 'SEND_PROMPT' | 'MARK_VERIFIED' | 'ESCALATE') => {
      const target = checkIns.find((c) => c.id === checkInId);
      if (!target) return;

      setCheckIns((prev) =>
        prev.map((c) => {
          if (c.id !== checkInId) return c;
          if (action === 'MARK_VERIFIED') {
            return {
              ...c,
              status: 'COMPLETED',
              actualTime: `14 Oct, ${getNowIstTime()} IST`,
              notes: 'Verified safe via operator confirmation.',
            };
          }
          if (action === 'ESCALATE') {
            return {
              ...c,
              status: 'ESCALATED',
              notes: 'Escalated to Verification Queue for operator follow-up.',
            };
          }
          return {
            ...c,
            notes: `Two-way SMS & app check-in reminder sent at ${getNowIstTime()} IST.`,
          };
        })
      );

      recordAuditAction(
        `Check-In ${action}`,
        `Check-In ${checkInId} (${target.touristName})`,
        checkInId,
        `Operator executed ${action} for ${target.waypointName}`
      );
      showToast(
        action === 'MARK_VERIFIED'
          ? `Check-in for ${target.touristName} marked completed.`
          : action === 'ESCALATE'
          ? `Missed check-in escalated for verification.`
          : `Check-in prompt dispatched to ${target.touristName}.`,
        'PRIMARY'
      );
    },
    [checkIns, recordAuditAction, showToast]
  );

  const saveReportDraft = useCallback(
    (updatedReport: IncidentReport) => {
      const timeStr = getNowIstTime();
      setReports((prev) => {
        const exists = prev.some((r) => r.id === updatedReport.id);
        if (exists) {
          return prev.map((r) =>
            r.id === updatedReport.id
              ? { ...updatedReport, updatedAt: `14 Oct 2026, ${timeStr} IST` }
              : r
          );
        }
        return [{ ...updatedReport, updatedAt: `14 Oct 2026, ${timeStr} IST` }, ...prev];
      });
      recordAuditAction(
        `Saved Report Draft ${updatedReport.caseFileNumber}`,
        `Report ${updatedReport.id}`,
        updatedReport.id,
        `Saved factual narrative and verification state for ${updatedReport.incidentId}.`
      );
      showToast('Report saved successfully.', 'SUCCESS');
    },
    [recordAuditAction, showToast]
  );

  const submitReportToDiary = useCallback(
    (reportId: string) => {
      const officerName = user?.name || 'Inspector Ananya Sharma';
      const timeStr = getNowIstTime();
      const target = reports.find((r) => r.id === reportId);
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? {
                ...r,
                status: 'SUBMITTED_TO_DIARY',
                reviewingOfficer: officerName,
                updatedAt: `14 Oct 2026, ${timeStr} IST`,
              }
            : r
        )
      );
      recordAuditAction(
        `Reviewed & Submitted Report ${target?.caseFileNumber || reportId}`,
        `Report ${reportId}`,
        reportId,
        `Officer ${officerName} completed statutory verification checklist and logged report to Station Diary.`
      );
      showToast(
        `Report ${target?.caseFileNumber || reportId} marked reviewed & logged to Station Diary.`,
        'SUCCESS'
      );
    },
    [user, reports, recordAuditAction, showToast]
  );

  const generateDraftReportForIncident = useCallback(
    (incidentId: string): IncidentReport => {
      const existing = reports.find((r) => r.incidentId === incidentId);
      if (existing) return existing;

      const inc = incidents.find((i) => i.id === incidentId) || incidents[0];
      const tourist = tourists.find((t) => t.id === inc.touristId || t.dtid === inc.dtid);
      const primaryKin = tourist?.emergencyContacts[0];
      const newReport: IncidentReport = {
        id: `RPT-2026-${Math.floor(100 + Math.random() * 899)}`,
        caseFileNumber: `FIR-DRAFT-2026/SHL/${Math.floor(100 + Math.random() * 899)}`,
        incidentId: inc.id,
        touristId: inc.touristId,
        touristName: inc.touristName,
        dtid: inc.dtid,
        permitNo: tourist?.identity.permitNumber || 'MEG-2026-8819',
        tripPackage: tourist?.trip.packageName || 'Meghalaya Adventure Trek',
        subscriberPhone: tourist?.phone || '+91 98765-43210',
        emergencyContactName: primaryKin?.name || 'Priya Sharma',
        emergencyContactRelation: primaryKin?.relation || 'Sister',
        emergencyContactPhone: primaryKin?.phone || '+91 98111-22334',
        occurrenceTimestamp: inc.createdAt,
        severityClassification: `${inc.severity} (${inc.type})`,
        placeOfOccurrence: `${inc.location.name}, ${inc.location.sector}, Meghalaya`,
        coordinatesText: `${inc.location.lat.toFixed(4)}° N, ${inc.location.lng.toFixed(
          4
        )}° E (Alt: ${inc.location.altitudeMeters}m)`,
        cellTowerInfo: inc.connectivityNote,
        factualNarrative: `On ${inc.createdAt}, registered tourist ${inc.touristName} (${inc.dtid}) triggered incident ${inc.id} at ${inc.location.name}. Trigger: ${inc.triggerDescription}. ${inc.aiAssessment.summary} Assigned unit: ${inc.assignedUnitName || 'Alpha-12'}.`,
        defaultNarrative: `On ${inc.createdAt}, registered tourist ${inc.touristName} (${inc.dtid}) triggered incident ${inc.id} at ${inc.location.name}. Trigger: ${inc.triggerDescription}. ${inc.aiAssessment.summary} Assigned unit: ${inc.assignedUnitName || 'Alpha-12'}.`,
        assignedUnitName: inc.assignedUnitName || 'Rapid Response Alpha-12',
        leadOfficerName: 'Sub-Inspector Rajiv Sangma (ID: 4109)',
        onSceneArrivalTime: '14:39:12 IST',
        baseCampEscortTime: '15:15:00 IST',
        fieldFindings:
          inc.resolution?.notes ||
          'Field response unit dispatched for on-scene verification and tourist assistance. Review required before submission.',
        medicalTriage: 'Triage Code Green',
        propertyIntegrity: 'All Valuables Intact',
        sosResetStatus: 'Transponder Reset Pending Review',
        reviewingOfficer: user?.name || 'Inspector Ananya Sharma',
        reviewingBadge: `Badge ${user?.badgeNumber || '#8841'} | EOC Control Room Unit HQ-1`,
        status: 'DRAFT_PENDING_REVIEW',
        checklist: {
          telemetryVerified: true,
          medicalConfirmed: true,
          kinBriefed: false,
        },
        createdAt: `14 Oct 2026, ${getNowIstTime()} IST`,
        updatedAt: `14 Oct 2026, ${getNowIstTime()} IST`,
      };

      setReports((prev) => [newReport, ...prev]);
      recordAuditAction(
        `Generated E-FIR Draft ${newReport.caseFileNumber}`,
        `Report ${newReport.id}`,
        newReport.id,
        `Generated structured report draft from verified incident ${inc.id}.`
      );
      showToast(`Generated structured report draft for ${inc.id}.`, 'PRIMARY');
      return newReport;
    },
    [reports, incidents, tourists, user, recordAuditAction, showToast]
  );

  const saveRiskZone = useCallback(
    (zone: RiskZone) => {
      const officerName = user?.name || 'Inspector Ananya Sharma';
      const timeStr = getNowIstTime();
      let isNewZone = false;

      setRiskZones((prev) => {
        const exists = prev.some((z) => z.id === zone.id);
        isNewZone = !exists;
        const enriched: RiskZone = {
          ...zone,
          createdBy: zone.createdBy || officerName,
          createdAt: zone.createdAt || `14 Oct 2026, ${timeStr} IST`,
        };
        if (exists) {
          return prev.map((z) => (z.id === zone.id ? enriched : z));
        }
        return [enriched, ...prev];
      });

      recordAuditAction(
        `${isNewZone ? 'Deployed New Restricted Geofence' : 'Updated Risk Zone'} ${zone.geoId} (${zone.name})`,
        `Risk Zone ${zone.geoId}`,
        zone.id,
        `Type: ${zone.shapeType || 'POLYGON'}, Risk Level: ${zone.riskLevel}, Active hours: ${zone.activeHours}`
      );

      if (zone.autoBroadcastAlert || isNewZone) {
        const newEvent: GeoFenceEvent = {
          id: `GFE-${Date.now()}`,
          touristId: 'SECTOR-BROADCAST',
          touristName: `Sector Advisory (${zone.touristCount} Devices)`,
          dtid: 'BROADCAST-ALL',
          zoneId: zone.id,
          zoneName: zone.name,
          geoId: zone.geoId,
          event: 'RESTRICTED_TIME_ENTRY',
          timestamp: `14 Oct 2026, ${timeStr} IST`,
          severity: zone.riskLevel === 'HIGH_RISK' ? 'CRITICAL' : 'HIGH',
          actionTaken: `Police deployed ${
            zone.shapeType === 'CIRCLE_HOTSPOT' ? 'Circular Hotspot Cordon' : 'Restricted Geofence Polygon'
          } (${zone.geoId}). Push advisory broadcasted to ${zone.touristCount} devices.`,
        };
        setGeofenceEvents((prev) => [newEvent, ...prev]);

        addNotification(
          zone.riskLevel === 'HIGH_RISK' ? 'CRITICAL_INCIDENT' : 'HIGH_PRIORITY',
          `Geofence Deployed: ${zone.geoId} (${zone.name})`,
          `${officerName} marked ${zone.riskLevel.replace('_', ' ')} ${
            zone.shapeType === 'CIRCLE_HOTSPOT' ? 'Hotspot Cordon' : 'Restricted Perimeter'
          } in ${zone.sector}.`,
          `/risk-zones/${zone.id}`,
          zone.id
        );
      }

      showToast(
        `Restricted ${
          zone.shapeType === 'CIRCLE_HOTSPOT' ? 'Hotspot' : 'Geofence'
        } "${zone.name}" (${zone.geoId}) deployed to live GIS grid.`,
        'SUCCESS'
      );
    },
    [user, recordAuditAction, addNotification, showToast]
  );

  const deleteRiskZone = useCallback(
    (zoneId: string) => {
      const target = riskZones.find((z) => z.id === zoneId);
      setRiskZones((prev) => prev.filter((z) => z.id !== zoneId));
      recordAuditAction(
        `Removed Restricted Geofence ${target?.geoId || zoneId}`,
        `Risk Zone ${target?.name || zoneId}`,
        zoneId,
        `Decommissioned geofence boundary from live GIS operations map.`
      );
      showToast(`Removed restricted zone ${target?.name || zoneId} from map.`, 'WARNING');
    },
    [riskZones, recordAuditAction, showToast]
  );

  const toggleRiskZoneStatus = useCallback(
    (zoneId: string) => {
      const target = riskZones.find((z) => z.id === zoneId);
      if (!target) return;
      const nextStatus: RiskZone['geofenceStatus'] =
        target.geofenceStatus === 'ACTIVE'
          ? 'ADVISORY_ONLY'
          : target.geofenceStatus === 'ADVISORY_ONLY'
          ? 'PAUSED'
          : 'ACTIVE';

      setRiskZones((prev) =>
        prev.map((z) => (z.id === zoneId ? { ...z, geofenceStatus: nextStatus } : z))
      );
      recordAuditAction(
        `Changed Geofence Status to ${nextStatus}`,
        `Risk Zone ${target.geoId} (${target.name})`,
        zoneId,
        `Toggled enforcement state from ${target.geofenceStatus} to ${nextStatus}.`
      );
      showToast(
        `Geofence ${target.geoId} status set to ${nextStatus.replace('_', ' ')}.`,
        'PRIMARY'
      );
    },
    [riskZones, recordAuditAction, showToast]
  );

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast('All notifications marked as read.', 'PRIMARY');
  }, [showToast]);

  const updateUserRoleOrStatus = useCallback(
    (userId: string, updates: Partial<User>) => {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updates } : u)));
      recordAuditAction(
        `Updated operator account ${userId}`,
        `User ${userId}`,
        userId,
        `Updated fields: ${Object.keys(updates).join(', ')}`
      );
      showToast('Operator configuration updated.', 'SUCCESS');
    },
    [recordAuditAction, showToast]
  );

  const resetDemoState = useCallback(() => {
    setIncidents(INITIAL_INCIDENTS);
    setTourists(INITIAL_TOURISTS);
    setRiskZones(INITIAL_RISK_ZONES);
    setGeofenceEvents(INITIAL_GEOFENCE_EVENTS);
    setAnomalies(INITIAL_ANOMALIES);
    setCheckIns(INITIAL_CHECKINS);
    setResponseUnits(INITIAL_RESPONSE_UNITS);
    setReports(INITIAL_REPORTS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setConnectivityState('ONLINE');
    setDemoWorkflowStep(1);
    showToast('Demo state reset to initial Stitch baseline.', 'PRIMARY');
  }, [showToast]);

  const triggerDemoScenario = useCallback(
    (scenario: DemoScenarioId) => {
      const timeStr = getNowIstTime();
      switch (scenario) {
        case 'SCENARIO_A_NORMAL': {
          setIncidents((prev) =>
            prev.map((inc) =>
              inc.id === 'INC-2026-00421' ? { ...inc, status: 'RESOLVED' } : inc
            )
          );
          setTourists((prev) =>
            prev.map((t) =>
              t.dtid === 'DTID-8F4K29' ? { ...t, safetyStatus: 'NORMAL', checkInStatus: 'OK' } : t
            )
          );
          showToast('Scenario A: Normal Operations loaded.', 'SUCCESS');
          break;
        }
        case 'SCENARIO_B_RISK_ZONE': {
          const newEvent: GeoFenceEvent = {
            id: `GFE-${Date.now()}`,
            touristId: 'TR-001',
            touristName: 'Arjun Sharma',
            dtid: 'DTID-8F4K29',
            zoneId: 'RZ-01',
            zoneName: 'Mawryngkneng Forest Zone',
            geoId: '#GF-04',
            event: 'ENTERED',
            timestamp: `14 Oct 2026, ${timeStr} IST`,
            severity: 'HIGH',
            actionTaken: 'Entered High-Risk Mawryngkneng Forest Zone (#GF-04). Advisory tone pushed.',
          };
          setGeofenceEvents((prev) => [newEvent, ...prev]);
          addNotification(
            'VERIFICATION',
            'Risk Zone Entry: Mawryngkneng (#GF-04)',
            'Arjun Sharma (DTID-8F4K29) entered High-Risk Geofence #GF-04.',
            '/risk-zones/RZ-01',
            'RZ-01'
          );
          showToast('Scenario B: Risk zone entry detected for Arjun Sharma.', 'WARNING');
          break;
        }
        case 'SCENARIO_C_ROUTE_DEVIATION': {
          setAnomalies((prev) =>
            prev.map((a) =>
              a.id === 'ANOM-2026-0891'
                ? {
                    ...a,
                    status: 'VERIFICATION_REQUIRED',
                    detectedTime: `${timeStr} IST`,
                    relativeTime: 'Just now',
                  }
                : a
            )
          );
          addNotification(
            'VERIFICATION',
            'Anomaly Detected — Verification Required',
            'Arjun Sharma (DTID-8F4K29) deviated 1.8 km off TR-22 route.',
            '/anomalies',
            'ANOM-2026-0891'
          );
          showToast('Scenario C: 1.8km route deviation anomaly flagged.', 'WARNING');
          break;
        }
        case 'SCENARIO_D_MISSED_CHECKIN': {
          setCheckIns((prev) =>
            prev.map((c) =>
              c.id === 'CHK-101'
                ? {
                    ...c,
                    status: 'MISSED',
                    overdueMinutes: 27,
                    notes: 'Missed Waypoint 3 check-in. Verification required (not auto-critical).',
                  }
                : c
            )
          );
          showToast('Scenario D: Missed check-in logged at Waypoint 3.', 'WARNING');
          break;
        }
        case 'SCENARIO_E_SOS_EMERGENCY': {
          setIncidents((prev) =>
            prev.map((inc) =>
              inc.id === 'INC-2026-00421'
                ? {
                    ...inc,
                    status: 'ACTIVE',
                    assignedUnitId: null,
                    assignedUnitName: null,
                    verificationState: 'VERIFICATION_REQUIRED',
                    createdAt: `14 Oct 2026, ${timeStr} IST`,
                    lastUpdatedAt: `14 Oct 2026, ${timeStr} IST`,
                  }
                : inc
            )
          );
          setTourists((prev) =>
            prev.map((t) =>
              t.dtid === 'DTID-8F4K29'
                ? { ...t, safetyStatus: 'CRITICAL_SOS', checkInStatus: 'ESCALATED' }
                : t
            )
          );
          setResponseUnits((prev) =>
            prev.map((u) =>
              u.id === 'UNIT-ALPHA-12'
                ? {
                    ...u,
                    status: 'AVAILABLE',
                    statusBadgeText: 'AVAILABLE',
                    currentIncidentId: null,
                    distanceKm: 1.8,
                    etaText: '04m 20s',
                  }
                : u
            )
          );
          addNotification(
            'CRITICAL_INCIDENT',
            'EMERGENCY SOS TRIGGERED: INC-2026-00421',
            'Arjun Sharma (DTID-8F4K29) triggered SOS in Mawryngkneng Forest Zone!',
            '/incidents/INC-2026-00421',
            'INC-2026-00421'
          );
          showToast('Scenario E: Critical SOS INC-2026-00421 received!', 'CRITICAL');
          break;
        }
        case 'SCENARIO_F_RESPONDER_ASSIGN': {
          assignResponseUnit('INC-2026-00421', 'UNIT-ALPHA-12', 'Code-3 Gorge Intercept');
          break;
        }
        case 'SCENARIO_G_RESOLUTION': {
          resolveIncident(
            'INC-2026-00421',
            'Assisted Tourist',
            'Tourist assisted on Mawryngkneng ledge by Alpha-12, first aid applied for mild ankle sprain, escorted safely to base camp.'
          );
          break;
        }
      }
    },
    [addNotification, assignResponseUnit, resolveIncident, showToast]
  );

  const advanceMasterDemoStep = useCallback(
    (targetStep?: number) => {
      const next = targetStep ?? (demoWorkflowStep < 8 ? demoWorkflowStep + 1 : 1);
      setDemoWorkflowStep(next);

      if (next === 2) {
        // Simulated SOS arrives (unassigned so officer can acknowledge & assign)
        triggerDemoScenario('SCENARIO_E_SOS_EMERGENCY');
      } else if (next === 3) {
        verifyIncident('INC-2026-00421', 'VERIFY');
      } else if (next === 4) {
        acknowledgeIncident('INC-2026-00421');
      } else if (next === 5) {
        assignResponseUnit('INC-2026-00421', 'UNIT-ALPHA-12');
      } else if (next === 6) {
        updateIncidentResponseState('INC-2026-00421', 'EN_ROUTE');
      } else if (next === 7) {
        updateIncidentResponseState('INC-2026-00421', 'ON_SCENE');
      } else if (next === 8) {
        resolveIncident(
          'INC-2026-00421',
          'Assisted Tourist',
          'Tourist encountered slippery rocky ledge, suffered mild ankle sprain. First aid administered by Alpha-12 and escorted safely to Mawryngkneng Base Camp.'
        );
      }
    },
    [
      demoWorkflowStep,
      triggerDemoScenario,
      verifyIncident,
      acknowledgeIncident,
      assignResponseUnit,
      updateIncidentResponseState,
      resolveIncident,
    ]
  );

  return (
    <OperationalContext.Provider
      value={{
        incidents,
        tourists,
        riskZones,
        geofenceEvents,
        anomalies,
        checkIns,
        responseUnits,
        reports,
        auditLogs,
        notifications,
        users,
        isLoading,
        error,
        connectivityState,
        audioMuted,
        demoModeOpen,
        demoWorkflowStep,
        toasts,
        setConnectivityState,
        setAudioMuted,
        setDemoModeOpen,
        showToast,
        dismissToast,
        retryLoadData,
        simulateErrorState,
        acknowledgeIncident,
        verifyIncident,
        assignResponseUnit,
        updateIncidentResponseState,
        updateUnitStatus,
        escalateIncident,
        resolveIncident,
        handleAnomalyAction,
        handleCheckInAction,
        saveReportDraft,
        submitReportToDiary,
        generateDraftReportForIncident,
        saveRiskZone,
        deleteRiskZone,
        toggleRiskZoneStatus,
        markNotificationRead,
        markAllNotificationsRead,
        recordAuditAction,
        triggerDemoScenario,
        advanceMasterDemoStep,
        resetDemoState,
        updateUserRoleOrStatus,
      }}
    >
      {children}
    </OperationalContext.Provider>
  );
};

export function useOperational(): OperationalContextValue {
  const ctx = useContext(OperationalContext);
  if (!ctx) {
    throw new Error('useOperational must be used within an OperationalProvider');
  }
  return ctx;
}
