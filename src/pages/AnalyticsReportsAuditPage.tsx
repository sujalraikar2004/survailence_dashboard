import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../app/providers/AuthContext';
import { useOperational } from '../app/providers/OperationalContext';
import { Drawer, Modal, PermissionNotice } from '../components/ui/CommonUi';
import { IncidentReport } from '../types';

export const AnalyticsReportsAuditPage: React.FC<{
  activeTab: 'ANALYTICS' | 'REPORTS' | 'AUDIT_LOGS';
}> = ({ activeTab }) => {
  const { reportId } = useParams<{ reportId?: string }>();
  const { user, can } = useAuth();
  const {
    reports,
    auditLogs,
    incidents,
    saveReportDraft,
    submitReportToDiary,
    showToast,
  } = useOperational();
  const navigate = useNavigate();

  const [auditFilter, setAuditFilter] = useState<'ALL' | 'AUTHORIZED' | 'VERIFIED' | 'SUCCESS'>(
    'ALL'
  );
  const [auditSearch, setAuditSearch] = useState('');
  const [createReportOpen, setCreateReportOpen] = useState(false);

  // New Report Form State
  const [formIncidentId, setFormIncidentId] = useState(incidents[0]?.id || 'INC-2026-0891');
  const [formSummary, setFormSummary] = useState('');
  const [formActionsTaken, setFormActionsTaken] = useState('');
  const [formOutcome, setFormOutcome] = useState('Active SAR / Verification in progress');
  const [formError, setFormError] = useState<string | null>(null);

  const selectedReport = useMemo(
    () =>
      reportId
        ? reports.find(
            (r) =>
              r.id.toLowerCase() === reportId.toLowerCase() ||
              r.caseFileNumber.toLowerCase() === reportId.toLowerCase()
          ) || null
        : null,
    [reports, reportId]
  );

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (auditFilter !== 'ALL' && log.result !== auditFilter) return false;
      const q = auditSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        log.officerName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.resource.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.hashSignature.toLowerCase().includes(q)
      );
    });
  }, [auditLogs, auditFilter, auditSearch]);

  if (activeTab === 'AUDIT_LOGS' && !can('VIEW_AUDIT_LOG')) {
    return (
      <div className="p-space-lg">
        <PermissionNotice requiredPermission="VIEW_AUDIT_LOG" />
      </div>
    );
  }

  const handleCreateReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSummary.trim() || !formActionsTaken.trim()) {
      setFormError('Incident summary and actions taken are required for statutory filing.');
      return;
    }
    const targetInc = incidents.find((i) => i.id === formIncidentId) || incidents[0];
    const newReport: IncidentReport = {
      id: `REP-${Date.now()}`,
      caseFileNumber: `#EFIR-ML-2026-${Math.floor(402 + Math.random() * 500)}`,
      incidentId: targetInc.id,
      touristId: targetInc.touristId,
      touristName: targetInc.touristName,
      dtid: targetInc.dtid,
      permitNo: 'ILP-ML-2026-994120',
      tripPackage: '7-Day Khasi Hills Trek',
      subscriberPhone: '+91 98204-77129',
      emergencyContactName: 'Meera Mehta',
      emergencyContactRelation: 'Spouse',
      emergencyContactPhone: '+91 98201-44310',
      occurrenceTimestamp: new Date().toLocaleTimeString(),
      severityClassification: `${targetInc.type.replace(/_/g, ' ')} • ${targetInc.severity}`,
      placeOfOccurrence: `${targetInc.location.name} (${targetInc.location.sector})`,
      coordinatesText: `${targetInc.location.lat.toFixed(4)}° N, ${targetInc.location.lng.toFixed(4)}° E`,
      cellTowerInfo: 'BSNL-SHL-04',
      factualNarrative: formSummary.trim(),
      defaultNarrative: formSummary.trim(),
      assignedUnitName: targetInc.assignedUnitName || 'Unit Alpha-12',
      leadOfficerName: 'SI R. Kharbuli (Sohra PS)',
      onSceneArrivalTime: '14:35 IST',
      baseCampEscortTime: '15:10 IST',
      fieldFindings: formActionsTaken.trim(),
      medicalTriage: formOutcome.trim(),
      propertyIntegrity: 'Intact — Verified on scene',
      sosResetStatus: 'Hardware Beacon Reset Verified',
      reviewingOfficer: user ? user.name : 'Insp. Ananya Sharma',
      reviewingBadge: user ? user.badgeNumber : 'MP-EOC-402',
      status: 'SUBMITTED_TO_DIARY',
      checklist: {
        telemetryVerified: true,
        medicalConfirmed: true,
        kinBriefed: true,
      },
      createdAt: 'Just now',
      updatedAt: 'Just now',
    };
    saveReportDraft(newReport);
    setFormSummary('');
    setFormActionsTaken('');
    setFormError(null);
    setCreateReportOpen(false);
  };

  return (
    <div className="p-space-lg flex flex-col gap-space-lg">
      {/* Page Header & Global Export/Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-surface-container-low p-space-lg rounded-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-primary-container/20 text-primary font-label-sm text-label-sm font-mono uppercase">
              Meghalaya Police CCTNS-V4 Bridge
            </span>
            <span className="font-label-sm text-label-sm text-outline font-mono">
              • SEC-65B EVIDENCE ACT COMPLIANT
            </span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight">
            {activeTab === 'REPORTS'
              ? 'Statutory Incident Reports & E-FIR Docket Archive'
              : activeTab === 'AUDIT_LOGS'
              ? 'Immutable Security & Privacy Access Audit Ledger'
              : 'Analytics, E-FIR Reports & Compliance Audit Ledger'}
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Post-incident operational intelligence, statutory electronic First Information Reports
            (E-FIR), and immutable PII access governance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-space-sm">
          {/* Sub-Navigation Switcher */}
          <div className="flex items-center bg-surface-container p-1 rounded-lg gap-1">
            <Link
              to="/analytics"
              className={`px-3 py-1.5 rounded font-label-sm text-label-sm ${
                activeTab === 'ANALYTICS'
                  ? 'bg-primary-container text-on-primary-container font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Analytics
            </Link>
            <Link
              to="/reports"
              className={`px-3 py-1.5 rounded font-label-sm text-label-sm ${
                activeTab === 'REPORTS'
                  ? 'bg-primary-container text-on-primary-container font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Incident Reports ({reports.length})
            </Link>
            <Link
              to="/audit-logs"
              className={`px-3 py-1.5 rounded font-label-sm text-label-sm ${
                activeTab === 'AUDIT_LOGS'
                  ? 'bg-primary-container text-on-primary-container font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Audit Ledger ({auditLogs.length})
            </Link>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="h-9 px-3 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-md text-label-md flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">print</span>
            <span>Print Summary</span>
          </button>

          {can('CREATE_REPORT') && (
            <button
              type="button"
              onClick={() => setCreateReportOpen(true)}
              className="h-9 px-3.5 rounded bg-primary-container text-on-primary-container hover:opacity-90 font-label-md text-label-md font-bold flex items-center gap-1.5 transition-opacity cursor-pointer shadow-lg"
            >
              <span className="material-symbols-outlined text-[16px]">gavel</span>
              <span>Generate Statutory E-FIR</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: Executive Performance & SLA KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="bg-surface-container p-space-md rounded-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-md text-label-md text-outline uppercase">
              Total Incidents (30D)
            </span>
            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-label-sm text-label-sm font-mono">
              +14.2% YoY
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-label-lg text-label-lg text-on-surface font-mono font-bold">
              342
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Across 12 Tourist Sectors
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-outline-variant/20 flex items-center justify-between font-label-sm text-label-sm text-outline font-mono">
            <span>SOS: 48</span>
            <span>Geofence: 164</span>
            <span>Medical: 130</span>
          </div>
        </div>

        <div className="bg-surface-container p-space-md rounded-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-md text-label-md text-outline uppercase">
              Mean Triage &amp; Dispatch SLA
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-label-sm text-label-sm font-mono">
              -1m 18s vs Target
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-label-lg text-label-lg text-on-surface font-mono font-bold">
              04m 12s
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Target SLA &lt; 05m 30s
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-outline-variant/20 flex items-center justify-between font-label-sm text-label-sm text-outline font-mono">
            <span>96.4% Within SLA</span>
            <span className="text-emerald-400">Optimal Readiness</span>
          </div>
        </div>

        <div className="bg-surface-container p-space-md rounded-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-tertiary"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-md text-label-md text-outline uppercase">
              AI Heuristic False-Alarm Rate
            </span>
            <span className="px-1.5 py-0.5 rounded bg-tertiary/15 text-tertiary font-label-sm text-label-sm font-mono">
              Human-in-Loop Verified
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-label-lg text-label-lg text-on-surface font-mono font-bold">
              8.4%
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              29 False Positives Suppressed
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-outline-variant/20 flex items-center justify-between font-label-sm text-label-sm text-outline font-mono">
            <span>Model v4.2 Precision: 91.6%</span>
            <span className="text-primary">Calibrated</span>
          </div>
        </div>

        <div className="bg-surface-container p-space-md rounded-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-secondary"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-md text-label-md text-outline uppercase">
              Statutory E-FIRs &amp; Dockets
            </span>
            <span className="px-1.5 py-0.5 rounded bg-secondary-container/40 text-secondary font-label-sm text-label-sm font-mono">
              2 Pending Sign-off
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-label-lg text-label-lg text-on-surface font-mono font-bold">
              {25 + reports.length}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Filed to State CCTNS Node
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-outline-variant/20 flex items-center justify-between font-label-sm text-label-sm text-outline font-mono">
            <span>26 Sealed</span>
            <span>100% Hash Verified</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: Operational Analytics Bento Grid (Shown on /analytics) */}
      {activeTab === 'ANALYTICS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
          {/* Chart 1: 30-Day Incident Volume & Response Time Trend (7 cols) */}
          <div className="lg:col-span-7 bg-surface-container-low p-space-lg rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                    Incident Escalation Volume vs. Mean Dispatch Latency
                  </h2>
                  <p className="font-body-sm text-body-sm text-outline">
                    Daily breakdown by escalation tier (Level 1 Advisory → Level 4 SOS) and average
                    field unit arrival
                  </p>
                </div>
                <div className="flex items-center gap-3 font-label-sm text-label-sm">
                  <span className="flex items-center gap-1.5 text-secondary">
                    <span className="w-2.5 h-2.5 rounded-xs bg-secondary inline-block"></span>L4
                    Critical SOS
                  </span>
                  <span className="flex items-center gap-1.5 text-tertiary">
                    <span className="w-2.5 h-2.5 rounded-xs bg-tertiary inline-block"></span>L2-L3
                    Anomaly
                  </span>
                  <span className="flex items-center gap-1.5 text-primary">
                    <span className="w-2.5 h-0.5 bg-primary inline-block"></span>Dispatch SLA (min)
                  </span>
                </div>
              </div>

              {/* SVG Tactical Chart */}
              <div className="bg-surface-container-lowest p-4 rounded-lg">
                <svg className="w-full h-52 overflow-visible" viewBox="0 0 700 200">
                  <line stroke="#262c3d" strokeDasharray="3,3" x1="40" x2="680" y1="20" y2="20" />
                  <line stroke="#262c3d" strokeDasharray="3,3" x1="40" x2="680" y1="65" y2="65" />
                  <line
                    stroke="#262c3d"
                    strokeDasharray="3,3"
                    x1="40"
                    x2="680"
                    y1="110"
                    y2="110"
                  />
                  <line
                    stroke="#262c3d"
                    strokeDasharray="3,3"
                    x1="40"
                    x2="680"
                    y1="155"
                    y2="155"
                  />
                  <line stroke="#3f484f" x1="40" x2="680" y1="175" y2="175" />
                  <text fill="#88929b" fontFamily="JetBrains Mono" fontSize="10" x="5" y="24">
                    40
                  </text>
                  <text fill="#88929b" fontFamily="JetBrains Mono" fontSize="10" x="5" y="69">
                    30
                  </text>
                  <text fill="#88929b" fontFamily="JetBrains Mono" fontSize="10" x="5" y="114">
                    20
                  </text>
                  <text fill="#88929b" fontFamily="JetBrains Mono" fontSize="10" x="5" y="159">
                    10
                  </text>

                  {[
                    [65, 95, 65, 78, 17, '01 Oct'],
                    [125, 80, 75, 58, 22, '05 Oct'],
                    [185, 105, 55, 91, 14, '09 Oct'],
                    [245, 70, 80, 40, 30, '13 Oct'],
                    [305, 90, 68, 72, 18, '17 Oct'],
                    [365, 60, 85, 32, 28, '21 Oct'],
                    [425, 85, 72, 65, 20, '25 Oct'],
                    [485, 50, 90, 20, 30, '28 Oct'],
                    [545, 78, 77, 56, 22, '30 Oct'],
                    [605, 62, 78, 28, 34, 'Today'],
                  ].map(([x, y1, h1, y2, h2, label], idx) => (
                    <g key={idx}>
                      <rect
                        fill="#ffb95f"
                        fillOpacity="0.75"
                        height={h1}
                        rx="2"
                        width="24"
                        x={x}
                        y={y1}
                      />
                      <rect
                        fill="#ff5355"
                        height={h2}
                        rx="2"
                        width="24"
                        x={x}
                        y={y2}
                      />
                      <text
                        fill={label === 'Today' ? '#89ceff' : '#88929b'}
                        fontFamily="JetBrains Mono"
                        fontSize="10"
                        x={Number(x) - 2}
                        y="192"
                      >
                        {label}
                      </text>
                    </g>
                  ))}

                  <polyline
                    fill="none"
                    points="77,90 137,78 197,102 257,65 317,85 377,58 437,74 497,48 557,68 617,52"
                    stroke="#89ceff"
                    strokeWidth="2.5"
                  />
                </svg>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-2 font-label-sm text-label-sm text-outline">
              <span>
                Peak Incident Window:{' '}
                <strong className="text-on-surface font-mono">
                  16:30 – 19:45 IST (Dusk Trail Descent)
                </strong>
              </span>
              <span className="text-primary font-mono">
                Predictive patrol positioning reduced Sohra gorge response by 28%
              </span>
            </div>
          </div>

          {/* Chart 2: Risk Zone Breach Heatmap & Anomaly Classification Matrix (5 cols) */}
          <div className="lg:col-span-5 bg-surface-container-low p-space-lg rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                    High-Risk Geofence Breach Distribution
                  </h2>
                  <p className="font-body-sm text-body-sm text-outline">
                    Top sectors by perimeter violations &amp; verified rescues
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded bg-surface-container-high font-label-sm text-label-sm text-primary font-mono">
                  GIS TELEMETRY
                </span>
              </div>

              <div className="space-y-3.5">
                {[
                  [
                    'Sohra / Nohkalikai Gorge Rim (Sector-4)',
                    '118 Breaches • 19 SOS',
                    'text-secondary',
                    'bg-secondary',
                    '78%',
                  ],
                  [
                    'Mawryngkneng Reserve Forest (Night Curfew)',
                    '84 Breaches • 14 SOS',
                    'text-tertiary',
                    'bg-tertiary',
                    '58%',
                  ],
                  [
                    'Dawki — Umngot River Flash-Flood Buffer',
                    '62 Breaches • 8 SOS',
                    'text-primary',
                    'bg-primary',
                    '44%',
                  ],
                  [
                    'Laitlum Canyons Fog Advisory Perimeter',
                    '49 Breaches • 5 SOS',
                    'text-emerald-400',
                    'bg-emerald-400',
                    '32%',
                  ],
                ].map(([name, stat, textCls, barCls, width], idx) => (
                  <div key={idx}>
                    <div className="flex justify-between font-label-sm text-label-sm mb-1">
                      <span className="text-on-surface font-medium">{name}</span>
                      <span className={`font-mono ${textCls}`}>{stat}</span>
                    </div>
                    <div className="w-full h-2 bg-surface-container-lowest rounded-full overflow-hidden">
                      <div className={`h-full ${barCls} rounded-full`} style={{ width }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-outline-variant/20 grid grid-cols-3 gap-2">
              <div className="bg-surface-container p-2.5 rounded">
                <span className="font-label-sm text-label-sm text-outline block">
                  ROUTE DEVIATION
                </span>
                <span className="font-headline-md text-headline-md text-on-surface font-mono font-bold">
                  44.2%
                </span>
                <span className="font-label-sm text-label-sm text-tertiary block">
                  Primary Trigger
                </span>
              </div>
              <div className="bg-surface-container p-2.5 rounded">
                <span className="font-label-sm text-label-sm text-outline block">
                  MISSED CHECK-IN
                </span>
                <span className="font-headline-md text-headline-md text-on-surface font-mono font-bold">
                  31.8%
                </span>
                <span className="font-label-sm text-label-sm text-primary block">
                  72% Auto-Resolved
                </span>
              </div>
              <div className="bg-surface-container p-2.5 rounded">
                <span className="font-label-sm text-label-sm text-outline block">
                  MANUAL SOS PANIC
                </span>
                <span className="font-headline-md text-headline-md text-on-surface font-mono font-bold">
                  24.0%
                </span>
                <span className="font-label-sm text-label-sm text-secondary block">
                  100% Dispatched
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: Statutory E-FIR & Incident Report Ledger (Shown on /analytics and /reports) */}
      {(activeTab === 'ANALYTICS' || activeTab === 'REPORTS') && (
        <div className="bg-surface-container-low rounded-lg p-space-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md mb-space-md">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  folder_Special
                </span>
                <h2 className="font-headline-lg text-headline-lg text-on-surface font-semibold">
                  Statutory E-FIR &amp; Incident Resolution Docket Registry
                </h2>
              </div>
              <p className="font-body-sm text-body-sm text-outline mt-0.5">
                Digitally signed First Information Reports and verified rescue dockets with
                cryptographic telemetry hashes.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto bg-surface-container-lowest rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high/60 text-outline font-label-md text-label-md uppercase border-b border-outline-variant/30">
                  <th className="py-3 px-4">E-FIR / Docket ID</th>
                  <th className="py-3 px-4">Linked Incident</th>
                  <th className="py-3 px-4">Tourist Subject &amp; DTID</th>
                  <th className="py-3 px-4">Classification &amp; Sector</th>
                  <th className="py-3 px-4">Assigned IO / Responder</th>
                  <th className="py-3 px-4">Evidence Integrity</th>
                  <th className="py-3 px-4">Statutory Status</th>
                  <th className="py-3 px-4 text-right">Dossier Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15 font-body-sm text-body-sm">
                {reports.map((rep) => (
                  <tr
                    key={rep.id}
                    onClick={() => navigate(`/reports/${rep.id}`)}
                    className="hover:bg-surface-container-high/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-semibold text-on-surface">{rep.caseFileNumber}</div>
                      <div className="font-label-sm text-label-sm text-outline">
                        Filed: {rep.createdAt}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <Link
                        to={`/incidents/${rep.incidentId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-0.5 rounded bg-secondary-container/30 text-secondary font-label-sm text-label-sm hover:underline"
                      >
                        #{rep.incidentId}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-on-surface">{rep.touristName}</div>
                      <div className="font-label-sm text-label-sm text-primary font-mono">
                        {rep.dtid}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-on-surface">{rep.severityClassification}</div>
                      <div className="font-label-sm text-label-sm text-outline">
                        {rep.placeOfOccurrence}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-on-surface">{rep.leadOfficerName}</div>
                      <div className="font-label-sm text-label-sm text-outline">
                        Reviewed by {rep.reviewingOfficer}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-label-sm text-label-sm">
                        <span className="material-symbols-outlined text-[14px]">verified</span>
                        <span>SHA-256 SEALED</span>
                      </div>
                      <div className="font-label-sm text-label-sm text-outline">
                        {rep.cellTowerInfo} • {rep.sosResetStatus}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-1 rounded bg-primary-container/20 text-primary font-label-sm text-label-sm font-mono uppercase">
                        {rep.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td
                      className="py-3.5 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/reports/${rep.id}`)}
                          className="px-2.5 py-1 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-sm text-label-sm cursor-pointer"
                        >
                          Inspect
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            showToast(
                              `Downloaded certified PDF packet for ${rep.caseFileNumber}.`,
                              'PRIMARY'
                            )
                          }
                          className="px-2.5 py-1 rounded bg-primary-container text-on-primary-container font-label-sm text-label-sm font-bold cursor-pointer"
                        >
                          Export PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 4: Immutable Compliance & Privacy Access Audit Ledger */}
      {(activeTab === 'ANALYTICS' || activeTab === 'AUDIT_LOGS') && can('VIEW_AUDIT_LOG') && (
        <div className="bg-surface-container-low rounded-lg p-space-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md mb-space-md">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[20px]">
                  policy
                </span>
                <h2 className="font-headline-lg text-headline-lg text-on-surface font-semibold">
                  Immutable Security &amp; Privacy Access Audit Ledger
                </h2>
                <span className="px-2 py-0.5 rounded bg-surface-container-high font-label-sm text-label-sm text-emerald-400 font-mono">
                  APPEND-ONLY WORM STORAGE
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-outline mt-0.5">
                Every operator access to restricted Tourist Digital ID (DTID), live location
                history, or emergency contact PII is cryptographically recorded.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search actor, DTID, hash..."
                className="h-8 px-3 rounded bg-surface-container-high text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {(
                [
                  ['ALL', 'All Events'],
                  ['AUTHORIZED', 'Authorized Access'],
                  ['VERIFIED', 'Verified Action'],
                  ['SUCCESS', 'System Sync'],
                ] as const
              ).map(([cKey, label]) => (
                <button
                  key={cKey}
                  type="button"
                  onClick={() => setAuditFilter(cKey)}
                  className={`px-2.5 py-1 rounded font-label-sm text-label-sm cursor-pointer ${
                    auditFilter === cKey
                      ? 'bg-primary-container/25 text-primary font-bold'
                      : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto bg-surface-container-lowest rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high/60 text-outline font-label-md text-label-md uppercase border-b border-outline-variant/30">
                  <th className="py-3 px-4">Timestamp (IST)</th>
                  <th className="py-3 px-4">Operator &amp; Role</th>
                  <th className="py-3 px-4">Action &amp; Result</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Access Justification</th>
                  <th className="py-3 px-4 text-right">SHA-256 Chain Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15 font-body-sm text-body-sm">
                {filteredAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container-high/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-label-sm text-label-sm text-on-surface whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-on-surface">{log.officerName}</div>
                      <div className="font-label-sm text-label-sm text-outline font-mono">
                        {log.role} • {log.officerBadge}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-label-sm text-label-sm font-mono uppercase bg-primary/15 text-primary">
                        {log.result}
                      </span>
                      <div className="text-on-surface-variant text-xs mt-0.5">{log.action}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-primary font-label-sm text-label-sm">
                      {log.resource} ({log.resourceId})
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant">{log.details}</td>
                    <td className="py-3 px-4 text-right font-mono font-label-sm text-label-sm text-emerald-400">
                      {log.hashSignature}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report Detail Drawer when /reports/:reportId is visited */}
      <Drawer
        open={Boolean(selectedReport)}
        onClose={() => navigate('/reports')}
        title={
          selectedReport ? `Statutory Docket ${selectedReport.caseFileNumber}` : 'Incident Report'
        }
        subtitle={
          selectedReport
            ? `Linked Incident #${selectedReport.incidentId} • Filed ${selectedReport.createdAt}`
            : ''
        }
      >
        {selectedReport && (
          <div className="space-y-4">
            <div className="bg-surface-container p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-primary font-bold">
                  {selectedReport.caseFileNumber}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs">
                  {selectedReport.status}
                </span>
              </div>
              <h3 className="font-headline-md text-on-surface font-bold">
                {selectedReport.touristName} ({selectedReport.dtid})
              </h3>
              <p className="font-body-sm text-outline">{selectedReport.placeOfOccurrence}</p>
            </div>

            <div className="bg-surface-container p-4 rounded-xl space-y-3 font-body-sm">
              <div>
                <span className="font-label-sm text-outline uppercase block">
                  Incident Factual Narrative
                </span>
                <p className="text-on-surface mt-1">{selectedReport.factualNarrative}</p>
              </div>
              <div>
                <span className="font-label-sm text-outline uppercase block">Field Findings</span>
                <p className="text-on-surface mt-1">{selectedReport.fieldFindings}</p>
              </div>
              <div>
                <span className="font-label-sm text-outline uppercase block">Medical Triage</span>
                <p className="text-on-surface mt-1">{selectedReport.medicalTriage}</p>
              </div>
              <div>
                <span className="font-label-sm text-outline uppercase block">
                  Reviewing Officer
                </span>
                <p className="text-on-surface mt-1">
                  {selectedReport.reviewingOfficer} ({selectedReport.reviewingBadge})
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              {selectedReport.status !== 'SUBMITTED_TO_DIARY' && (
                <button
                  type="button"
                  onClick={() => submitReportToDiary(selectedReport.id)}
                  className="px-4 py-2 rounded bg-secondary-container text-on-secondary-container font-label-md text-label-md font-bold"
                >
                  Seal &amp; Submit to Diary
                </button>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded bg-surface-container-high text-on-surface font-label-md text-label-md"
              >
                Print Certified Copy
              </button>
              <button
                type="button"
                onClick={() =>
                  showToast(
                    `Exported ${selectedReport.caseFileNumber} to CCTNS judicial packet.`,
                    'SUCCESS'
                  )
                }
                className="px-4 py-2 rounded bg-primary-container text-on-primary-container font-label-md text-label-md font-bold"
              >
                Download PDF Packet
              </button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Create Statutory E-FIR Modal */}
      <Modal
        open={createReportOpen}
        onClose={() => setCreateReportOpen(false)}
        title="Generate Statutory E-FIR / Incident Report"
        subtitle="Cryptographically seal telemetry and dispatch actions under Sec-65B"
        icon="gavel"
      >
        <form onSubmit={handleCreateReportSubmit} className="space-y-4">
          {formError && (
            <div className="p-2.5 rounded bg-secondary-container/30 text-secondary font-label-sm text-label-sm">
              {formError}
            </div>
          )}
          <div className="space-y-1">
            <label className="font-label-sm text-label-sm text-outline uppercase block">
              Linked Incident *
            </label>
            <select
              value={formIncidentId}
              onChange={(e) => setFormIncidentId(e.target.value)}
              className="w-full h-9 px-3 rounded bg-surface-container text-on-surface font-body-sm"
            >
              {incidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  #{inc.id} — {inc.touristName} ({inc.dtid})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="font-label-sm text-label-sm text-outline uppercase block">
              Executive Incident Summary *
            </label>
            <textarea
              rows={2}
              value={formSummary}
              onChange={(e) => setFormSummary(e.target.value)}
              placeholder="Summarize trigger signals, route deviation, and telemetry coordinates..."
              className="w-full p-2.5 rounded bg-surface-container text-on-surface font-body-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="font-label-sm text-label-sm text-outline uppercase block">
              Responder &amp; Control Room Actions Taken *
            </label>
            <textarea
              rows={2}
              value={formActionsTaken}
              onChange={(e) => setFormActionsTaken(e.target.value)}
              placeholder="Detail units dispatched, voice bridge checks, and containment steps..."
              className="w-full p-2.5 rounded bg-surface-container text-on-surface font-body-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="font-label-sm text-label-sm text-outline uppercase block">
              Medical Triage &amp; Outcome
            </label>
            <input
              type="text"
              value={formOutcome}
              onChange={(e) => setFormOutcome(e.target.value)}
              className="w-full h-9 px-3 rounded bg-surface-container text-on-surface font-body-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateReportOpen(false)}
              className="px-4 py-2 rounded bg-surface-container-high text-on-surface font-label-md text-label-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-primary-container text-on-primary-container font-label-md text-label-md font-bold"
            >
              Seal &amp; Submit E-FIR
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
