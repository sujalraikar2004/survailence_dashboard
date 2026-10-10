import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../app/providers/AuthContext';
import { useOperational } from '../app/providers/OperationalContext';
import {
  AssignUnitModal,
  ResolveIncidentModal,
  VerifyIncidentModal,
} from '../components/incidents/IncidentModals';
import { IncidentTacticalMap } from '../components/maps/TacticalMapAbstraction';
import {
  Drawer,
  PermissionNotice,
  SafeImage,
  StatusBadge,
} from '../components/ui/CommonUi';

export const IncidentDetailPage: React.FC = () => {
  const { incidentId } = useParams<{ incidentId: string }>();
  const { can } = useAuth();
  const {
    incidents,
    tourists,
    responseUnits,
    acknowledgeIncident,
    updateIncidentResponseState,
    escalateIncident,
    generateDraftReportForIncident,
    showToast,
  } = useOperational();
  const navigate = useNavigate();

  const incident = useMemo(
    () =>
      incidents.find((i) => i.id === (incidentId || 'INC-2026-00421')) ||
      incidents.find((i) => i.id === 'INC-2026-00421') ||
      incidents[0],
    [incidents, incidentId]
  );

  const tourist = useMemo(
    () =>
      tourists.find((t) => t.id === incident.touristId || t.dtid === incident.dtid) ||
      tourists[0],
    [tourists, incident]
  );

  const assignedUnit = useMemo(
    () =>
      responseUnits.find(
        (u) => u.id === incident.assignedUnitId || u.name === incident.assignedUnitName
      ) || responseUnits[0],
    [responseUnits, incident]
  );

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [efirDrawerOpen, setEfirDrawerOpen] = useState(false);
  const [mapLayerMode, setMapLayerMode] = useState<'mesh' | 'topo' | 'geofences'>('mesh');
  const [mapZoom, setMapZoom] = useState(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(256);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedElapsed = useMemo(() => {
    const m = Math.floor(elapsedSeconds / 60);
    const s = elapsedSeconds % 60;
    return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  }, [elapsedSeconds]);

  const handleOpenEfirReport = () => {
    const draft = generateDraftReportForIncident(incident.id);
    navigate(`/reports/${draft.id}`);
  };

  return (
    <div className="flex flex-col w-full text-on-surface">
      {/* TOP CONSOLE / INCIDENT COMMAND HEADER */}
      <section className="w-full bg-surface-container-lowest px-space-lg py-space-md shadow-md">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
          {/* Incident Identification & Triage Flag */}
          <div className="flex flex-wrap items-center gap-space-md">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-secondary-container/20 text-secondary">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary"></span>
              </span>
              <span className="font-label-md text-label-md tracking-widest uppercase font-bold text-secondary">
                {incident.severity} —{' '}
                {incident.status === 'RESOLVED' ? 'RESOLVED CASE' : 'ACTIVE EMERGENCY'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight font-mono">
                {incident.id}
              </span>
              <StatusBadge status={incident.status} />
            </div>
            <div className="hidden sm:flex items-center gap-2 text-outline font-label-md text-label-md">
              <span>TRIGGER:</span>
              <span className="text-tertiary font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">touch_app</span>{' '}
                {incident.triggerDescription}
              </span>
            </div>
            <div className="flex items-center gap-3 font-label-sm text-label-sm bg-surface-container px-2.5 py-1 rounded">
              <span className="text-on-surface-variant">
                LOGGED: <strong className="text-on-surface font-mono">14:32:10 IST</strong>
              </span>
              <span className="text-outline">|</span>
              <span className="text-secondary font-mono flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">timelapse</span> ELAPSED:{' '}
                <span>{formattedElapsed}</span>
              </span>
              <span className="text-outline">|</span>
              <span className="text-primary font-bold uppercase">
                {incident.assignedUnitName
                  ? `${incident.assignedUnitName} (${incident.status.replace('_', ' ')})`
                  : 'UNASSIGNED'}
              </span>
            </div>
          </div>

          {/* Tactical Action Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {can('ACKNOWLEDGE_INCIDENT') && (
              <button
                type="button"
                onClick={() => acknowledgeIncident(incident.id)}
                className="h-9 px-3 rounded bg-surface-container-high hover:bg-surface-variant text-on-surface font-headline-md text-body-sm flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
                <span>
                  {incident.acknowledgedBy
                    ? `ACKNOWLEDGED (${incident.acknowledgedBy.split(' ').slice(0, 2).join(' ')})`
                    : 'ACKNOWLEDGE'}
                </span>
              </button>
            )}

            {can('VERIFY_INCIDENT') && (
              <button
                type="button"
                onClick={() => setVerifyModalOpen(true)}
                className="h-9 px-3 rounded bg-surface-container-high hover:bg-surface-variant text-tertiary font-headline-md text-body-sm flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">psychology</span>
                <span>
                  {incident.verificationState === 'VERIFIED' ? 'VERIFIED' : 'VERIFY SIGNALS'}
                </span>
              </button>
            )}

            {can('ASSIGN_RESPONSE_UNIT') && (
              <button
                type="button"
                onClick={() => setAssignModalOpen(true)}
                className="h-9 px-3 rounded bg-primary-container hover:bg-primary-fixed-dim text-on-primary-container font-headline-md text-body-sm flex items-center gap-1.5 transition-colors shadow-sm font-bold"
              >
                <span className="material-symbols-outlined text-[18px]">local_police</span>
                <span>
                  {incident.assignedUnitName
                    ? `ASSIGNED: ${incident.assignedUnitName}`
                    : 'ASSIGN UNIT'}
                </span>
              </button>
            )}

            {/* Response Unit Tracking Progression (ASSIGNED -> EN_ROUTE -> ON_SCENE) */}
            {incident.assignedUnitName && incident.status !== 'RESOLVED' && (
              <div className="flex items-center bg-surface-container-high rounded p-0.5 gap-0.5">
                <button
                  type="button"
                  onClick={() => updateIncidentResponseState(incident.id, 'EN_ROUTE')}
                  className={`h-8 px-2.5 rounded font-label-sm text-label-sm font-bold transition-colors ${
                    incident.status === 'EN_ROUTE'
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  EN ROUTE
                </button>
                <button
                  type="button"
                  onClick={() => updateIncidentResponseState(incident.id, 'ON_SCENE')}
                  className={`h-8 px-2.5 rounded font-label-sm text-label-sm font-bold transition-colors ${
                    incident.status === 'ON_SCENE'
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  ON SCENE
                </button>
              </div>
            )}

            {can('ESCALATE_INCIDENT') && (
              <button
                type="button"
                onClick={() =>
                  escalateIncident(
                    incident.id,
                    'High-angle gorge terrain requires SDRF rope rescue support & SP HQ oversight.'
                  )
                }
                className="h-9 px-3 rounded bg-surface-container-high hover:bg-surface-variant text-tertiary font-headline-md text-body-sm flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">e911_emergency</span>
                <span>ESCALATE TO SP HQ</span>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                showToast(
                  `VoLTE Encrypted voice bridge connected to ${incident.touristName} (${tourist.phone}).`,
                  'PRIMARY'
                )
              }
              className="h-9 px-3 rounded bg-surface-container-high hover:bg-surface-variant text-primary font-headline-md text-body-sm flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">call</span>
              <span>CALL TOURIST</span>
            </button>

            <button
              type="button"
              onClick={() =>
                showToast(
                  `Emergency contact Priya Sharma (+91 98765-43210) notified via EOC dispatch desk.`,
                  'SUCCESS'
                )
              }
              className="h-9 px-3 rounded bg-surface-container-high hover:bg-surface-variant text-on-surface-variant font-headline-md text-body-sm flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">contact_phone</span>
              <span>NOTIFY KIN</span>
            </button>

            {can('RESOLVE_INCIDENT') && incident.status !== 'RESOLVED' && (
              <button
                type="button"
                onClick={() => setResolveModalOpen(true)}
                className="h-9 px-3 rounded bg-secondary-container hover:bg-error-container text-on-secondary-container font-headline-md text-body-sm flex items-center gap-1.5 transition-colors shadow-sm font-bold"
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>RESOLVE CASE</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* SPLIT WORKSPACE: TACTICAL MAP (LEFT) & CONTEXT / AI / BIOMETRICS (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter p-space-md bg-surface">
        {/* LEFT COLUMN: TACTICAL OPENSTREETMAP GIS WORKSPACE (Lg 7 / Xl 8) */}
        <section className="lg:col-span-7 xl:col-span-8 flex flex-col gap-space-md">
          <IncidentTacticalMap incident={incident} assignedUnit={assignedUnit} />

          {/* Live Responder Quick-Telemetry Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter bg-surface-container-low p-space-md rounded-xl">
            <div
              onClick={() => navigate(`/response-teams/${assignedUnit.id}`)}
              className="flex items-center gap-space-sm bg-surface-container p-space-sm rounded-lg cursor-pointer hover:bg-surface-container-high transition-colors"
            >
              <div className="w-10 h-10 rounded bg-primary-container/20 flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-[22px]">directions_car</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm text-outline uppercase font-semibold">
                  Primary Intercept
                </span>
                <span className="font-headline-md text-body-md text-on-surface font-bold truncate">
                  {assignedUnit.name.toUpperCase()} (Mawryngkneng PS)
                </span>
                <span className="font-label-sm text-label-sm text-primary font-mono">
                  {assignedUnit.leadOfficer} ({assignedUnit.personnelCount} Officers)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-space-sm bg-surface-container p-space-sm rounded-lg">
              <div className="w-10 h-10 rounded bg-tertiary-container/20 flex items-center justify-center text-tertiary shrink-0">
                <span className="material-symbols-outlined text-[22px]">navigation</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm text-outline uppercase font-semibold">
                  Proximity &amp; Speed
                </span>
                <span className="font-headline-md text-body-md text-tertiary font-mono font-bold">
                  {incident.status === 'ON_SCENE'
                    ? '0.0 km (ON SCENE)'
                    : `${assignedUnit.distanceKm} km Remaining @ ${assignedUnit.speedKmh} km/h`}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Terrain: Wet asphalt to gravel trail
                </span>
              </div>
            </div>
            <div className="flex items-center gap-space-sm bg-surface-container p-space-sm rounded-lg">
              <div className="w-10 h-10 rounded bg-secondary-container/20 flex items-center justify-center text-secondary shrink-0">
                <span className="material-symbols-outlined text-[22px]">medical_services</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm text-outline uppercase font-semibold">
                  Backup Standby
                </span>
                <span className="font-headline-md text-body-md text-on-surface font-bold">
                  108 EMS Ambulance #04
                </span>
                <span className="font-label-sm text-label-sm text-secondary font-mono">
                  Dispatched from Shillong Civil Hospital
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: TOURIST IDENTITY, AI SIGNAL AUDIT & DEVICE STATE (Lg 5 / Xl 4) */}
        <section className="lg:col-span-5 xl:col-span-4 flex flex-col gap-space-md">
          {/* Tourist Identity & Authorization Card */}
          <div className="bg-surface-container-low rounded-xl p-space-md shadow-md flex flex-col gap-space-md">
            <div className="flex items-start justify-between">
              <Link
                to={`/tourists/${tourist.dtid}`}
                className="flex items-center gap-3 group"
              >
                <SafeImage
                  className="w-14 h-14 rounded-lg object-cover ring-2 ring-primary/40 shadow-sm"
                  alt={tourist.name}
                  src={tourist.avatarUrl}
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-headline-lg text-headline-lg font-bold text-on-surface group-hover:text-primary">
                      {tourist.name}
                    </span>
                    <span
                      className="material-symbols-outlined text-primary text-[18px]"
                      title="Digital Tourist ID Verified"
                    >
                      verified_user
                    </span>
                  </div>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {tourist.identity.gender}, {tourist.identity.age} • {tourist.identity.homeCity}
                  </span>
                  <span className="font-label-sm text-label-sm text-primary font-mono font-semibold">
                    {tourist.dtid} (Digital Tourist ID)
                  </span>
                </div>
              </Link>
              <span className="px-2 py-0.5 rounded bg-surface-container-high text-primary font-label-sm text-label-sm font-bold uppercase">
                REGISTERED
              </span>
            </div>

            {/* Statutory Need-to-Know Authorization Bar */}
            <div className="p-2.5 rounded bg-surface-container-lowest flex items-start gap-2">
              <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">
                policy
              </span>
              <p className="font-label-sm text-[10px] text-outline leading-tight">
                <strong>AUTHORIZED DISCLOSURE:</strong> Real-time biometric, geofence, and contact
                retrieval under <em>Section 14 of Tourist Safety &amp; Emergency Regulation Act</em>
                . All queries logged to State Security Audit Trail.
              </p>
            </div>

            {/* Trip Details Grid */}
            <div className="grid grid-cols-2 gap-2 text-body-sm bg-surface-container p-2.5 rounded-lg">
              <div>
                <span className="text-outline font-label-sm text-label-sm block">
                  ACTIVE ITINERARY
                </span>
                <span className="text-on-surface font-semibold">{tourist.trip.packageName}</span>
              </div>
              <div>
                <span className="text-outline font-label-sm text-label-sm block">
                  TRAVEL WINDOW
                </span>
                <span className="text-on-surface font-mono font-medium">
                  {tourist.trip.startDate} – {tourist.trip.endDate}
                </span>
              </div>
              <div>
                <span className="text-outline font-label-sm text-label-sm block">LODGING BASE</span>
                <span className="text-on-surface truncate block">{tourist.trip.lodgingBase}</span>
              </div>
              <div>
                <span className="text-outline font-label-sm text-label-sm block">
                  PERMIT REFERENCE
                </span>
                <span className="text-on-surface font-mono">{tourist.identity.permitNumber}</span>
              </div>
            </div>

            {/* Device & Connectivity Health Strip */}
            <div className="flex items-center justify-between p-2.5 bg-surface-container rounded-lg">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[20px]">
                  battery_4_bar
                </span>
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-outline">PHONE BATTERY</span>
                  <span className="font-label-md text-label-md text-on-surface font-bold font-mono">
                    {tourist.device.batteryPercent}% (Conserving)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  network_cell
                </span>
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-outline">CELL MESH SIGNAL</span>
                  <span className="font-label-md text-label-md text-primary font-bold font-mono">
                    {tourist.device.networkStatus}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  sensors
                </span>
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-outline">GPS ACCURACY</span>
                  <span className="font-label-md text-label-md text-secondary font-bold font-mono">
                    ±{incident.location.accuracyMeters} METERS
                  </span>
                </div>
              </div>
            </div>

            {/* Emergency Kin Contact (Privacy-Aware UI) */}
            {can('VIEW_EMERGENCY_CONTACT') ? (
              <div className="flex items-center justify-between p-2.5 bg-surface-container rounded-lg">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-on-surface">
                    <span className="material-symbols-outlined text-[16px]">family_restroom</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline-md text-body-sm font-bold text-on-surface">
                      {tourist.emergencyContacts[0]?.name || 'Priya Sharma'} (
                      {tourist.emergencyContacts[0]?.relation || 'Sister'})
                    </span>
                    <span className="font-label-sm text-label-sm text-outline font-mono">
                      {tourist.emergencyContacts[0]?.phone || '+91 98765-43210'} • Verified Kin
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-primary-container/20 text-primary font-label-sm text-label-sm font-bold">
                  REACHABLE
                </span>
              </div>
            ) : (
              <PermissionNotice
                requiredPermission="VIEW_EMERGENCY_CONTACT"
                contextLabel="Emergency Contact & Personal Kin Details"
              />
            )}
          </div>

          {/* Explainable AI Anomaly Engine & Multi-Modal Verification */}
          <div className="bg-surface-container-low rounded-xl p-space-md shadow-md flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[20px]">
                  psychology
                </span>
                <span className="font-headline-md text-headline-md font-bold text-on-surface">
                  Safety AI Anomaly Assessment
                </span>
              </div>
              <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-tertiary-container text-on-tertiary-container font-mono font-bold">
                {incident.aiAssessment.modelVersion}
              </span>
            </div>

            {/* Confidence Gauge Component */}
            <div className="p-3 bg-surface-container rounded-lg flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-outline uppercase font-semibold">
                  Distress Correlation Confidence
                </span>
                <span className="font-headline-xl text-headline-xl font-bold text-secondary font-mono">
                  {incident.aiAssessment.confidencePercent}%
                </span>
                <p className="font-body-sm text-[12px] text-on-surface-variant leading-snug">
                  {incident.aiAssessment.summary}
                </p>
              </div>
              <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-surface-variant"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                  ></path>
                  <path
                    className="text-secondary"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray={`${incident.aiAssessment.confidencePercent}, 100`}
                    strokeLinecap="round"
                    strokeWidth="3.5"
                  ></path>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="font-label-md text-label-md text-secondary font-bold font-mono">
                    {incident.aiAssessment.confidencePercent}%
                  </span>
                </div>
              </div>
            </div>

            {/* AI Explainability Feature Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                  CORRELATED SIGNAL CHAIN
                </span>
                <span className="font-label-sm text-[10px] text-tertiary font-mono font-bold uppercase">
                  {incident.verificationState === 'VERIFIED'
                    ? 'OFFICER VERIFIED'
                    : 'VERIFICATION REQUIRED'}
                </span>
              </div>
              <div className="space-y-1.5 font-body-sm text-body-sm">
                {incident.aiAssessment.signals.map((sig, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded bg-surface-container"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`material-symbols-outlined text-[16px] ${
                          sig.severity === 'CRITICAL' ? 'text-secondary' : 'text-tertiary'
                        }`}
                      >
                        {sig.icon}
                      </span>
                      <span
                        className={
                          sig.severity === 'CRITICAL'
                            ? 'text-secondary font-bold'
                            : 'text-on-surface'
                        }
                      >
                        {sig.label}
                      </span>
                    </div>
                    <span
                      className={`font-label-sm text-label-sm font-mono font-semibold ${
                        sig.severity === 'CRITICAL' ? 'text-secondary' : 'text-tertiary'
                      }`}
                    >
                      {sig.weight}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Connectivity Diagnostic Note */}
            <div className="p-2.5 rounded bg-surface-container-lowest text-body-sm flex items-center justify-between">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-primary text-[16px]">
                  signal_cellular_alt
                </span>
                <span className="text-body-sm">{incident.connectivityNote}</span>
              </div>
              <span className="font-label-sm text-label-sm text-primary font-bold font-mono shrink-0">
                CONFIDENCE: {incident.locationConfidence}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* BOTTOM SECTION: INCIDENT OPERATIONAL TIMELINE & E-FIR INTEGRATION */}
      <section className="p-space-md pt-0">
        <div className="bg-surface-container-low rounded-xl p-space-md shadow-md flex flex-col gap-space-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">
                linear_scale
              </span>
              <div className="flex flex-col">
                <span className="font-headline-md text-headline-md font-bold text-on-surface">
                  Chronological Incident Timeline ({incident.timeline.length} Events)
                </span>
                <span className="font-body-sm text-body-sm text-outline">
                  Real-time telemetry event stream recorded from mobile client, officer actions, and
                  network tower logs
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setEfirDrawerOpen(true)}
                className="h-9 px-3 rounded bg-primary-container hover:bg-primary-fixed-dim text-on-primary-container font-headline-md text-body-sm font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">gavel</span>
                <span>Generate Draft E-FIR / Incident Record</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  showToast(`Exported ${incident.id} chronological audit trail to CSV.`, 'PRIMARY')
                }
                className="h-9 px-3 rounded bg-surface-container-high hover:bg-surface-variant text-on-surface font-headline-md text-body-sm flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>Export Audit Trail (CSV)</span>
              </button>
            </div>
          </div>

          {/* Step-by-Step Horizontal Visual Pipeline Timeline */}
          <div className="overflow-x-auto pb-2">
            <div className="min-w-[940px] grid grid-cols-4 md:grid-cols-8 gap-2 relative">
              {incident.timeline.map((ev, idx) => {
                const isLast = idx === incident.timeline.length - 1;
                const isCrit = ev.highlight === 'CRITICAL';
                const isWarn = ev.highlight === 'WARNING';
                return (
                  <div
                    key={ev.id}
                    className={`p-2.5 rounded-lg flex flex-col justify-between ${
                      isCrit
                        ? 'bg-surface-container-high ring-1 ring-secondary/50'
                        : isLast
                        ? 'bg-primary-container/20 ring-1 ring-primary/40'
                        : 'bg-surface-container'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`font-label-sm text-label-sm font-mono font-bold ${
                          isCrit
                            ? 'text-secondary'
                            : isWarn
                            ? 'text-tertiary'
                            : 'text-primary'
                        }`}
                      >
                        {ev.timestamp}
                      </span>
                      <span
                        className={`material-symbols-outlined text-[14px] ${
                          isCrit
                            ? 'text-secondary'
                            : isWarn
                            ? 'text-tertiary'
                            : 'text-primary'
                        }`}
                      >
                        {ev.category === 'SOS'
                          ? 'crisis_alert'
                          : ev.category === 'DISPATCH'
                          ? 'local_police'
                          : ev.category === 'RESOLUTION'
                          ? 'check_circle'
                          : 'how_to_reg'}
                      </span>
                    </div>
                    <span
                      className={`font-label-md text-label-md font-bold leading-tight ${
                        isCrit
                          ? 'text-secondary'
                          : isWarn
                          ? 'text-tertiary'
                          : isLast
                          ? 'text-primary'
                          : 'text-on-surface'
                      }`}
                    >
                      {ev.title}
                    </span>
                    <span className="font-body-sm text-[11px] text-outline mt-1 leading-snug">
                      {ev.description}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Modals & E-FIR Drawer */}
      <AssignUnitModal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        incident={incident}
      />
      <VerifyIncidentModal
        open={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        incident={incident}
      />
      <ResolveIncidentModal
        open={resolveModalOpen}
        onClose={() => setResolveModalOpen(false)}
        incident={incident}
      />

      <Drawer
        open={efirDrawerOpen}
        onClose={() => setEfirDrawerOpen(false)}
        title="Automated Incident E-FIR Draft Assistance"
        subtitle={`DRAFT REF: EFIR-MG-${incident.id} • Review required before submission`}
        icon="description"
      >
        <div className="space-y-4">
          <div className="p-3 bg-surface-container-lowest rounded-lg font-mono text-body-sm text-on-surface-variant space-y-1.5 border-l-2 border-primary">
            <div className="text-on-surface font-bold">
              POLICE STATION: MAWRYNGKNENG, EAST KHASI HILLS DISTRICT
            </div>
            <div>DATE &amp; TIME: {incident.createdAt}</div>
            <div>
              COMPLAINANT / SUBJECT: {incident.touristName.toUpperCase()}, {incident.dtid}
            </div>
            <div>
              NATURE OF OCCURRENCE: {incident.title.toUpperCase()} ({incident.type})
            </div>
            <div>
              COORDINATES: LAT {incident.location.lat.toFixed(4)}° N, LON{' '}
              {incident.location.lng.toFixed(4)}° E ({incident.location.name.toUpperCase()})
            </div>
            <div className="text-primary">
              INVESTIGATING OFFICER: INSP. ANANYA SHARMA (CONTROL ROOM EOC LEAD)
            </div>
          </div>

          <div className="p-2.5 rounded bg-tertiary-container/20 text-tertiary font-label-sm text-label-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">gavel</span>
            <span>
              Structured report assistance only — Review required before submission to Station
              Diary.
            </span>
          </div>

          <div className="space-y-1.5">
            <span className="font-label-sm text-label-sm text-outline uppercase font-semibold block">
              Factual Telemetry Narrative (Synthesized from Verified Logs)
            </span>
            <div className="p-3 bg-surface-container rounded-lg font-body-sm text-body-sm text-on-surface leading-relaxed">
              On {incident.createdAt}, registered tourist {incident.touristName} ({incident.dtid})
              entered {incident.location.name} under Permit {tourist.identity.permitNumber}.{' '}
              {incident.triggerDescription}. {incident.aiAssessment.summary} Assigned unit:{' '}
              {incident.assignedUnitName || 'Alpha-12'}.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-outline-variant/30">
            <button
              type="button"
              onClick={() => setEfirDrawerOpen(false)}
              className="px-4 py-2 rounded bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-md text-label-md"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => {
                setEfirDrawerOpen(false);
                handleOpenEfirReport();
              }}
              className="px-4 py-2 rounded bg-primary-container hover:opacity-90 text-on-primary-container font-label-md text-label-md font-bold flex items-center gap-1.5 shadow-md"
            >
              <span className="material-symbols-outlined text-[16px]">edit_document</span>
              Open Full Report &amp; E-FIR Editor
            </button>
          </div>
        </div>
      </Drawer>
    </div>
  );
};
