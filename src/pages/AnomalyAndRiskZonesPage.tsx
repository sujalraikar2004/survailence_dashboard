import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../app/providers/AuthContext';
import { useOperational } from '../app/providers/OperationalContext';
import {
  MapDrawingMode,
  RiskZonesInteractiveMap,
} from '../components/maps/TacticalMapAbstraction';
import { EmptyState, Modal, SeverityBadge } from '../components/ui/CommonUi';
import { Anomaly, CheckIn, RiskZone } from '../types';

export const AnomalyAndRiskZonesPage: React.FC<{
  activeSection: 'ANOMALIES' | 'RISK_ZONES' | 'CHECKINS' | 'GEOFENCE_EVENTS';
}> = ({ activeSection }) => {
  const { zoneId } = useParams<{ zoneId?: string }>();
  const { can } = useAuth();
  const {
    anomalies,
    riskZones,
    checkIns,
    geofenceEvents,
    handleAnomalyAction,
    handleCheckInAction,
    saveRiskZone,
    deleteRiskZone,
    toggleRiskZoneStatus,
    showToast,
  } = useOperational();
  const navigate = useNavigate();

  const [anomalyFilter, setAnomalyFilter] = useState<'ALL' | Anomaly['type']>('ALL');
  const [checkInTab, setCheckInTab] = useState<CheckIn['status'] | 'ALL'>('ALL');
  const [geofenceEventFilter, setGeofenceEventFilter] = useState<string>('ALL');

  // Interactive Map Drawing State on /risk-zones
  const [mapDrawMode, setMapDrawMode] = useState<MapDrawingMode>('NONE');
  const [draftPolygonPoints, setDraftPolygonPoints] = useState<[number, number][]>([]);
  const [draftHotspotCenter, setDraftHotspotCenter] = useState<{
    lat: number;
    lng: number;
  } | null>({ lat: 25.558, lng: 91.945 });
  const [draftHotspotRadius, setDraftHotspotRadius] = useState<number>(500);

  // Risk Zone Modal State
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<RiskZone | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [zoneGeoId, setZoneGeoId] = useState('');
  const [zoneRiskLevel, setZoneRiskLevel] = useState<RiskZone['riskLevel']>('HIGH_RISK');
  const [zoneShapeType, setZoneShapeType] = useState<'POLYGON' | 'CIRCLE_HOTSPOT'>('POLYGON');
  const [zoneCategory, setZoneCategory] = useState<RiskZone['category']>('CLIFF_RESTRICTED');
  const [zoneActiveHours, setZoneActiveHours] = useState('18:00 - 06:00 IST');
  const [zoneReason, setZoneReason] = useState('');
  const [zoneFormError, setZoneFormError] = useState<string | null>(null);

  const selectedZone = useMemo(
    () => (zoneId ? riskZones.find((z) => z.id === zoneId || z.geoId === zoneId) : null),
    [riskZones, zoneId]
  );

  const filteredAnomalies = useMemo(
    () =>
      anomalies.filter((a) => (anomalyFilter === 'ALL' ? true : a.type === anomalyFilter)),
    [anomalies, anomalyFilter]
  );

  const filteredCheckIns = useMemo(
    () => checkIns.filter((c) => (checkInTab === 'ALL' ? true : c.status === checkInTab)),
    [checkIns, checkInTab]
  );

  const filteredGeofenceEvents = useMemo(
    () =>
      geofenceEvents.filter((ev) =>
        geofenceEventFilter === 'ALL' ? true : ev.event === geofenceEventFilter
      ),
    [geofenceEvents, geofenceEventFilter]
  );

  const openConfigureZoneModal = (zone?: RiskZone) => {
    if (zone) {
      setEditingZone(zone);
      setZoneName(zone.name);
      setZoneGeoId(zone.geoId);
      setZoneRiskLevel(zone.riskLevel);
      setZoneShapeType(zone.shapeType || 'POLYGON');
      setZoneCategory(zone.category || 'CLIFF_RESTRICTED');
      if (zone.radiusMeters) setDraftHotspotRadius(zone.radiusMeters);
      setZoneActiveHours(zone.activeHours);
      setZoneReason(zone.reason);
    } else {
      setEditingZone(null);
      setZoneName('');
      setZoneGeoId(`#GF-${Math.floor(16 + Math.random() * 70)}`);
      setZoneRiskLevel('HIGH_RISK');
      setZoneShapeType(mapDrawMode === 'CIRCLE_HOTSPOT' ? 'CIRCLE_HOTSPOT' : 'POLYGON');
      setZoneCategory('CLIFF_RESTRICTED');
      setZoneActiveHours('18:00 - 06:00 IST');
      setZoneReason('');
    }
    setZoneFormError(null);
    setZoneModalOpen(true);
  };

  const handleSaveZoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName.trim() || !zoneReason.trim()) {
      setZoneFormError('Zone name and operational hazard reason are required.');
      return;
    }

    const centerCoords =
      zoneShapeType === 'CIRCLE_HOTSPOT' && draftHotspotCenter
        ? draftHotspotCenter
        : draftPolygonPoints.length >= 3
        ? {
            lat:
              draftPolygonPoints.reduce((acc, p) => acc + p[0], 0) /
              draftPolygonPoints.length,
            lng:
              draftPolygonPoints.reduce((acc, p) => acc + p[1], 0) /
              draftPolygonPoints.length,
          }
        : editingZone?.coordinatesCenter || { lat: 25.558, lng: 91.945 };

    const newOrUpdated: RiskZone = editingZone
      ? {
          ...editingZone,
          name: zoneName.trim(),
          geoId: zoneGeoId.trim(),
          riskLevel: zoneRiskLevel,
          shapeType: zoneShapeType,
          category: zoneCategory,
          radiusMeters: zoneShapeType === 'CIRCLE_HOTSPOT' ? draftHotspotRadius : undefined,
          polygonCoords:
            zoneShapeType === 'POLYGON' && draftPolygonPoints.length >= 3
              ? draftPolygonPoints
              : editingZone.polygonCoords,
          activeHours: zoneActiveHours.trim(),
          reason: zoneReason.trim(),
        }
      : {
          id: `RZ-${Date.now()}`,
          geoId: zoneGeoId.trim(),
          name: zoneName.trim(),
          sector: 'East Khasi Hills Sector',
          riskLevel: zoneRiskLevel,
          category: zoneCategory,
          shapeType: zoneShapeType,
          polygonCoords:
            zoneShapeType === 'POLYGON'
              ? draftPolygonPoints.length >= 3
                ? draftPolygonPoints
                : [
                    [centerCoords.lat + 0.008, centerCoords.lng - 0.01],
                    [centerCoords.lat + 0.01, centerCoords.lng + 0.011],
                    [centerCoords.lat - 0.007, centerCoords.lng + 0.013],
                    [centerCoords.lat - 0.009, centerCoords.lng - 0.008],
                  ]
              : undefined,
          radiusMeters: zoneShapeType === 'CIRCLE_HOTSPOT' ? draftHotspotRadius : undefined,
          activeHours: zoneActiveHours.trim(),
          reason: zoneReason.trim(),
          touristCount: zoneShapeType === 'CIRCLE_HOTSPOT' ? 8 : 5,
          incidentCount: zoneRiskLevel === 'HIGH_RISK' ? 1 : 0,
          geofenceStatus: 'ACTIVE',
          weatherHookText: 'Police Command Cordon • Met Radar Synced',
          requirements: 'Mandatory compliance with police perimeter instructions',
          coordinatesCenter: centerCoords,
          svgPolygonPoints: '320,220 440,210 460,310 340,320',
          mapX: 390,
          mapY: 265,
          autoBroadcastAlert: true,
        };

    saveRiskZone(newOrUpdated);
    setMapDrawMode('NONE');
    setDraftPolygonPoints([]);
    setZoneModalOpen(false);
  };

  return (
    <div className="flex flex-col w-full text-on-surface">
      {/* Top Command Context & Metrics Strip */}
      <div className="p-space-lg flex flex-col gap-space-md bg-surface-container-lowest">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 font-label-sm text-label-sm text-outline uppercase tracking-wider">
              <span>SAFETY &amp; ANOMALY</span>
              <span className="text-outline-variant">/</span>
              <span className="text-primary font-semibold">
                {activeSection === 'CHECKINS'
                  ? 'CHECK-IN MONITORING PROTOCOL'
                  : activeSection === 'GEOFENCE_EVENTS'
                  ? 'GEO-FENCE EVENT STREAM'
                  : activeSection === 'RISK_ZONES'
                  ? 'CONFIGURED RISK ZONES & GEOFENCES'
                  : 'ANOMALY DETECTION QUEUE & ACTIVE RISK GEOFENCES'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight">
                {activeSection === 'CHECKINS'
                  ? 'Scheduled Waypoint Check-In Monitoring'
                  : activeSection === 'GEOFENCE_EVENTS'
                  ? 'Geo-Fence Boundary Ingress & Exit History'
                  : activeSection === 'RISK_ZONES'
                  ? 'Risk Zones & Dynamic Geofence Polygons'
                  : 'Anomaly Queue & Geofence Intelligence'}
              </h1>
              <span className="px-2.5 py-1 rounded bg-secondary-container/30 text-secondary font-label-sm text-label-sm font-semibold uppercase tracking-wide flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                V4.2 HEURISTICS ACTIVE - HUMAN VERIFICATION MANDATORY
              </span>
            </div>
          </div>

          {/* Sub-Navigation Pills + Action Cluster */}
          <div className="flex flex-wrap items-center gap-space-sm">
            <div className="flex items-center bg-surface-container p-1 rounded-lg gap-1">
              <Link
                to="/anomalies"
                className={`px-2.5 py-1 rounded font-label-sm text-label-sm ${
                  activeSection === 'ANOMALIES'
                    ? 'bg-primary-container text-on-primary-container font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Anomalies ({anomalies.length})
              </Link>
              <Link
                to="/risk-zones"
                className={`px-2.5 py-1 rounded font-label-sm text-label-sm ${
                  activeSection === 'RISK_ZONES'
                    ? 'bg-primary-container text-on-primary-container font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Risk Zones ({riskZones.length})
              </Link>
              <Link
                to="/check-ins"
                className={`px-2.5 py-1 rounded font-label-sm text-label-sm ${
                  activeSection === 'CHECKINS'
                    ? 'bg-primary-container text-on-primary-container font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Check-Ins ({checkIns.length})
              </Link>
              <Link
                to="/geofence-events"
                className={`px-2.5 py-1 rounded font-label-sm text-label-sm ${
                  activeSection === 'GEOFENCE_EVENTS'
                    ? 'bg-primary-container text-on-primary-container font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Geo-Fence Events ({geofenceEvents.length})
              </Link>
            </div>

            {can('MANAGE_RISK_ZONES') && (
              <button
                type="button"
                onClick={() => openConfigureZoneModal()}
                className="h-9 px-space-md rounded bg-primary-container hover:bg-primary-container/90 text-on-primary-container font-label-md text-label-md font-bold flex items-center gap-1.5 transition-all shadow-md"
              >
                <span className="material-symbols-outlined text-[16px]">polyline</span>
                Configure New Geofence Polygon
              </button>
            )}
          </div>
        </div>

        {/* Live Operational Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md pt-space-xs">
          <div className="p-space-md rounded-lg bg-surface-container flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-outline">
              <span className="font-label-sm text-label-sm uppercase tracking-wider">
                Unverified Alerts
              </span>
              <span className="material-symbols-outlined text-[18px] text-tertiary">warning</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="font-label-lg text-[28px] font-bold text-on-surface leading-none font-mono">
                  12
                </span>
                <span className="font-label-sm text-label-sm text-outline">Active Queue</span>
              </div>
              <div className="flex items-center gap-1 font-label-sm text-label-sm font-mono">
                <span className="px-1.5 py-0.5 rounded bg-secondary-container/40 text-secondary font-bold">
                  3 High
                </span>
                <span className="px-1.5 py-0.5 rounded bg-tertiary-container/30 text-tertiary">
                  6 Med
                </span>
                <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant">
                  3 Low
                </span>
              </div>
            </div>
          </div>

          <div className="p-space-md rounded-lg bg-surface-container flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-outline">
              <span className="font-label-sm text-label-sm uppercase tracking-wider">
                Active Geofences
              </span>
              <span className="material-symbols-outlined text-[18px] text-primary">security</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="font-label-lg text-[28px] font-bold text-on-surface leading-none font-mono">
                  {12 + riskZones.length}
                </span>
                <span className="font-label-sm text-label-sm text-outline">Live Zones</span>
              </div>
              <div className="flex items-center gap-1 font-label-sm text-label-sm">
                <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface">
                  6 Curfew
                </span>
                <span className="px-1.5 py-0.5 rounded bg-tertiary-container/30 text-tertiary">
                  11 Hazard
                </span>
              </div>
            </div>
          </div>

          <div className="p-space-md rounded-lg bg-surface-container flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-outline">
              <span className="font-label-sm text-label-sm uppercase tracking-wider">
                Pattern Telemetry Confidence
              </span>
              <span className="material-symbols-outlined text-[18px] text-primary-container">
                psychology
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="font-label-lg text-[28px] font-bold text-primary leading-none font-mono">
                  94.2%
                </span>
                <span className="font-label-sm text-label-sm text-outline font-mono">
                  L9 Kalman Filter
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-primary font-mono tracking-tighter">
                Zero Auto-Declare
              </span>
            </div>
          </div>

          <div className="p-space-md rounded-lg bg-surface-container flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-outline">
              <span className="font-label-sm text-label-sm uppercase tracking-wider">
                Avg Operator Verification
              </span>
              <span className="material-symbols-outlined text-[18px] text-outline">timer</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="font-label-lg text-[28px] font-bold text-on-surface leading-none font-mono">
                  02m 14s
                </span>
                <span className="font-label-sm text-label-sm text-outline">Target &lt; 05m</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-primary-container/20 text-primary font-label-sm text-label-sm font-mono">
                -18s vs D-1
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 32: CHECK-IN MONITORING VIEW */}
      {activeSection === 'CHECKINS' && (
        <div className="p-space-lg space-y-space-md">
          <div className="bg-surface-container-low p-space-md rounded-xl flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  ['ALL', 'All Check-Ins'],
                  ['UPCOMING', 'Upcoming'],
                  ['DUE', 'Due'],
                  ['MISSED', 'Missed'],
                  ['COMPLETED', 'Completed'],
                  ['ESCALATED', 'Escalated'],
                ] as const
              ).map(([tabKey, label]) => (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setCheckInTab(tabKey)}
                  className={`px-3 py-1.5 rounded font-label-sm text-label-sm transition-colors ${
                    checkInTab === tabKey
                      ? 'bg-primary text-on-primary font-bold'
                      : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="font-label-sm text-label-sm text-tertiary flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">policy</span>
              UX Safety Rule: A missed check-in does NOT automatically become a critical emergency;
              human verification is required.
            </span>
          </div>

          {filteredCheckIns.length === 0 ? (
            <EmptyState
              icon="rule"
              title="No Check-In Records in Selected Tab"
              description="All check-ins for this status category are clear."
              actionLabel="Show All"
              onAction={() => setCheckInTab('ALL')}
            />
          ) : (
            <div className="grid grid-cols-1 gap-space-sm">
              {filteredCheckIns.map((chk) => (
                <div
                  key={chk.id}
                  className="bg-surface-container p-space-md rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/tourists/${chk.dtid}`}
                        className="font-headline-md text-headline-md font-bold text-on-surface hover:text-primary"
                      >
                        {chk.touristName}
                      </Link>
                      <span className="font-mono text-primary text-label-sm bg-primary/10 px-1.5 py-0.5 rounded">
                        {chk.dtid}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-label-sm text-[10px] font-bold uppercase ${
                          chk.status === 'ESCALATED'
                            ? 'bg-secondary-container text-on-secondary-container'
                            : chk.status === 'MISSED'
                            ? 'bg-tertiary-container/30 text-tertiary'
                            : chk.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-surface-container-high text-primary'
                        }`}
                      >
                        {chk.status}
                      </span>
                    </div>
                    <div className="font-body-sm text-body-sm text-on-surface">
                      Waypoint: <strong>{chk.waypointName}</strong> ({chk.circuit})
                    </div>
                    <div className="font-label-sm text-label-sm text-outline font-mono">
                      Scheduled: {chk.scheduledTime}
                      {chk.overdueMinutes ? ` • Overdue by ${chk.overdueMinutes} mins` : ''} •
                      Battery: {chk.batteryPercent}% • Signal: {chk.signalStrength}
                    </div>
                    <p className="font-body-sm text-[11px] text-on-surface-variant">{chk.notes}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCheckInAction(chk.id, 'SEND_PROMPT')}
                      className="px-3 py-1.5 rounded bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-sm text-label-sm flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">sms</span>
                      Request Confirmation
                    </button>
                    {chk.status !== 'COMPLETED' && (
                      <button
                        type="button"
                        onClick={() => handleCheckInAction(chk.id, 'MARK_VERIFIED')}
                        className="px-3 py-1.5 rounded bg-primary-container text-on-primary-container font-label-sm text-label-sm font-bold"
                      >
                        Mark Verified Safe
                      </button>
                    )}
                    {chk.status === 'MISSED' && (
                      <button
                        type="button"
                        onClick={() => handleCheckInAction(chk.id, 'ESCALATE')}
                        className="px-3 py-1.5 rounded bg-tertiary-container text-on-tertiary font-label-sm text-label-sm font-bold"
                      >
                        Escalate for Review
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 33: GEOFENCE EVENTS VIEW */}
      {activeSection === 'GEOFENCE_EVENTS' && (
        <div className="p-space-lg space-y-space-md">
          <div className="bg-surface-container-low p-space-md rounded-xl flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  ['ALL', 'All Events'],
                  ['APPROACHING', 'Approaching'],
                  ['ENTERED', 'Entered'],
                  ['EXITED', 'Exited'],
                  ['RESTRICTED_TIME_ENTRY', 'Restricted-Time Entry'],
                  ['REPEATED_ENTRY', 'Repeated Entry'],
                ] as const
              ).map(([evKey, label]) => (
                <button
                  key={evKey}
                  type="button"
                  onClick={() => setGeofenceEventFilter(evKey)}
                  className={`px-3 py-1.5 rounded font-label-sm text-label-sm transition-colors ${
                    geofenceEventFilter === evKey
                      ? 'bg-primary text-on-primary font-bold'
                      : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-low rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-lowest text-outline font-label-md text-label-md uppercase border-b border-outline-variant/30">
                    <th className="py-3 px-4">Tourist</th>
                    <th className="py-3 px-4">Risk Zone</th>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Action / Protocol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 font-body-sm text-body-sm">
                  {filteredGeofenceEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-surface-container-high/60">
                      <td className="py-3 px-4">
                        <Link
                          to={`/tourists/${ev.dtid}`}
                          className="font-bold text-on-surface hover:text-primary"
                        >
                          {ev.touristName}
                        </Link>
                        <span className="font-mono text-primary text-[11px] block">{ev.dtid}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          to={`/risk-zones/${ev.zoneId}`}
                          className="font-semibold text-on-surface hover:text-primary"
                        >
                          {ev.zoneName}
                        </Link>
                        <span className="font-mono text-outline text-[11px] block">{ev.geoId}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-label-sm text-on-surface">
                        {ev.event.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 font-mono text-outline text-[11px]">
                        {ev.timestamp}
                      </td>
                      <td className="py-3 px-4">
                        <SeverityBadge severity={ev.severity} />
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant">{ev.actionTaken}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PRIMARY 2-COLUMN SPLIT CONSOLE VIEWPORT (Anomalies + Risk Zones) */}
      {(activeSection === 'ANOMALIES' || activeSection === 'RISK_ZONES') && (
        <div className="p-space-lg grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          {/* Selected Risk Zone Detail Banner if /risk-zones/:zoneId is open */}
          {selectedZone && (
            <div className="lg:col-span-12 bg-surface-container-low p-space-lg rounded-xl border border-primary/40 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">
                    {selectedZone.riskLevel.replace('_', ' ')}
                  </span>
                  <span className="font-mono text-primary font-bold">{selectedZone.geoId}</span>
                  <span className="font-label-sm text-outline">• {selectedZone.sector}</span>
                </div>
                <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">
                  {selectedZone.name} — Detailed Geofence Configuration
                </h2>
                <p className="font-body-sm text-on-surface-variant">{selectedZone.reason}</p>
                <div className="flex flex-wrap items-center gap-4 pt-1 font-mono text-label-sm text-outline">
                  <span>Active Hours: {selectedZone.activeHours}</span>
                  <span>Tourists Inside: {selectedZone.touristCount}</span>
                  <span>Active Incidents: {selectedZone.incidentCount}</span>
                  <span>Status: {selectedZone.geofenceStatus}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {can('MANAGE_RISK_ZONES') && (
                  <button
                    type="button"
                    onClick={() => openConfigureZoneModal(selectedZone)}
                    className="px-3 py-1.5 rounded bg-primary-container text-on-primary-container font-label-sm text-label-sm font-bold"
                  >
                    Edit Zone Boundary
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate('/live-map')}
                  className="px-3 py-1.5 rounded bg-surface-container-high text-on-surface font-label-sm text-label-sm"
                >
                  View on GIS Map
                </button>
              </div>
            </div>
          )}

          {/* LEFT COLUMN (58% -> 7 cols): Anomaly Queue Triage Stack */}
          <div className="lg:col-span-7 flex flex-col gap-space-md">
            <div className="bg-surface-container-low rounded-lg shadow-md flex flex-col">
              {/* Triage Tab Filter Toolbar */}
              <div className="p-space-md bg-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm rounded-t-lg">
                <div className="flex flex-wrap items-center gap-1">
                  {(
                    [
                      ['ALL', `All (${anomalies.length})`],
                      ['COMBINED_RISK_PATTERN', 'Combined Pattern'],
                      ['ROUTE_DEVIATION', 'Route Deviations'],
                      ['PROLONGED_INACTIVITY', 'Prolonged Inactivity'],
                      ['MISSED_CHECKIN', 'Missed Check-ins'],
                      ['RISK_ZONE_ENTRY', 'Restricted Entry'],
                    ] as const
                  ).map(([fKey, label]) => (
                    <button
                      key={fKey}
                      type="button"
                      onClick={() => setAnomalyFilter(fKey)}
                      className={`px-3 py-1.5 rounded font-label-sm text-label-sm transition-colors ${
                        anomalyFilter === fKey
                          ? 'bg-primary text-on-primary font-bold shadow-sm'
                          : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-label-sm text-label-sm text-outline">Sort:</span>
                  <span className="font-label-sm text-label-sm text-on-surface font-mono bg-surface-container-high px-2 py-1 rounded">
                    Heuristic Risk Score ↓
                  </span>
                </div>
              </div>

              {/* Triage Feed Container */}
              <div className="p-space-md flex flex-col gap-space-md">
                {filteredAnomalies.map((anom) => {
                  const isCrit = anom.severity === 'CRITICAL_CONCERN';
                  const isElev =
                    anom.severity === 'ELEVATED_CONCERN' ||
                    anom.severity === 'GEOFENCE_BUFFER_BREACH';
                  return (
                    <div
                      key={anom.id}
                      className="rounded-lg bg-surface-container p-space-md shadow-lg flex flex-col gap-space-sm relative overflow-hidden"
                    >
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                          isCrit
                            ? 'bg-secondary'
                            : isElev
                            ? 'bg-tertiary'
                            : 'bg-outline-variant'
                        }`}
                      />
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-space-xs pl-2">
                        <div className="flex items-center gap-space-sm flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded font-label-sm text-label-sm font-bold uppercase tracking-wide flex items-center gap-1.5 ${
                              isCrit
                                ? 'bg-secondary-container text-on-secondary-container'
                                : isElev
                                ? 'bg-tertiary-container/30 text-tertiary'
                                : 'bg-surface-container-highest text-on-surface-variant'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isCrit
                                  ? 'bg-secondary animate-ping'
                                  : isElev
                                  ? 'bg-tertiary'
                                  : 'bg-outline'
                              }`}
                            />
                            {anom.severity.replace(/_/g, ' ')}
                          </span>
                          <span className="font-label-md text-label-md text-outline font-mono">
                            {anom.id}
                          </span>
                          <span className="font-label-sm text-label-sm text-secondary font-mono">
                            Score: {anom.heuristicScore}/100 (Confidence: {anom.confidencePercent}%)
                          </span>
                        </div>
                        <span className="font-label-sm text-label-sm text-outline font-mono">
                          Triggered: {anom.detectedTime} ({anom.relativeTime})
                        </span>
                      </div>

                      {/* Subject Profile Snippet */}
                      <div className="pl-2 grid grid-cols-1 sm:grid-cols-12 gap-space-sm items-center py-1">
                        <div className="sm:col-span-7 flex items-center gap-space-sm">
                          <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center font-headline-md text-headline-md text-primary font-bold">
                            {anom.initials}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/tourists/${anom.dtid}`}
                                className="font-headline-md text-headline-md text-on-surface font-semibold hover:text-primary"
                              >
                                {anom.touristName}
                              </Link>
                              <span className="font-label-sm text-label-sm text-outline font-mono">
                                {anom.dtid}
                              </span>
                            </div>
                            <span className="font-body-sm text-body-sm text-on-surface-variant">
                              {anom.touristMeta}
                            </span>
                          </div>
                        </div>
                        <div className="sm:col-span-5 flex flex-col sm:items-end font-label-sm text-label-sm text-outline">
                          <span className="text-on-surface font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px] text-secondary">
                              location_on
                            </span>
                            {anom.locationName}
                          </span>
                          <span className="font-mono text-outline-variant">
                            {anom.coordinatesText}
                          </span>
                        </div>
                      </div>

                      {/* Signal Breakdown Box */}
                      <div className="pl-2 bg-surface-container-lowest p-space-sm rounded flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-label-sm text-outline font-bold uppercase tracking-wider">
                            Compound Heuristic Breakdown
                          </span>
                          <span className="font-label-sm text-[10px] text-tertiary font-mono">
                            Anomaly detected — verification required
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm font-label-sm text-label-sm">
                          {anom.signals.map((sig, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded bg-surface-container-low flex flex-col"
                            >
                              <span className="text-outline">{sig.category}:</span>
                              <span className="text-secondary font-mono font-bold">
                                {sig.value}
                              </span>
                              <span className="text-outline-variant text-[9px]">{sig.detail}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Operator Action Row */}
                      <div className="pl-2 flex flex-wrap items-center justify-between gap-space-sm pt-1">
                        <span className="font-label-sm text-label-sm text-outline font-mono">
                          {anom.diagnosticNote}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAnomalyAction(anom.id, 'VERIFY_SIGNALS')}
                            className="h-8 px-3 rounded bg-surface-container-highest hover:bg-surface-bright text-on-surface font-label-sm text-label-sm font-medium transition-colors"
                          >
                            Verify Sensor Signals
                          </button>
                          {anom.linkedIncidentId ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/incidents/${anom.linkedIncidentId}`)}
                              className="h-8 px-3 rounded bg-secondary hover:bg-secondary/90 text-on-secondary font-label-sm text-label-sm font-bold transition-colors shadow-sm"
                            >
                              View Active Incident Workspace
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAnomalyAction(anom.id, 'MARK_EXPLAINED')}
                                className="h-8 px-3 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm"
                              >
                                Mark Explained
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAnomalyAction(anom.id, 'SEND_PROMPT')}
                                className="h-8 px-3 rounded bg-primary text-on-primary font-label-sm text-label-sm font-bold"
                              >
                                Send Safety Prompt
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (42% -> 5 cols): Interactive OpenStreetMap Fencing + Configured Risk Geofences */}
          <div className="lg:col-span-5 flex flex-col gap-space-md">
            {/* Interactive OpenStreetMap Geofence & Hotspot Marking Card */}
            <div className="bg-surface-container-low rounded-lg shadow-md p-space-md flex flex-col gap-space-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-tertiary text-[18px]">
                      add_location_alt
                    </span>
                    <span>Interactive Map Fence &amp; Hotspot Marker</span>
                  </h2>
                  <span className="font-label-sm text-label-sm text-outline">
                    Click on OpenStreetMap to draw restricted polygons or mark circular hotspots
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMapDrawMode((m) => (m === 'POLYGON' ? 'NONE' : 'POLYGON'));
                      setDraftPolygonPoints([]);
                      setZoneShapeType('POLYGON');
                    }}
                    className={`px-2.5 py-1 rounded font-label-sm text-[10px] font-bold flex items-center gap-1 transition-colors ${
                      mapDrawMode === 'POLYGON'
                        ? 'bg-primary-container text-on-primary-container'
                        : 'bg-surface-container-high text-on-surface hover:bg-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">polyline</span>
                    <span>{mapDrawMode === 'POLYGON' ? 'Drawing Polygon...' : 'Draw Fence'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMapDrawMode((m) => (m === 'CIRCLE_HOTSPOT' ? 'NONE' : 'CIRCLE_HOTSPOT'));
                      setZoneShapeType('CIRCLE_HOTSPOT');
                    }}
                    className={`px-2.5 py-1 rounded font-label-sm text-[10px] font-bold flex items-center gap-1 transition-colors ${
                      mapDrawMode === 'CIRCLE_HOTSPOT'
                        ? 'bg-tertiary-container text-on-tertiary'
                        : 'bg-surface-container-high text-on-surface hover:bg-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">radar</span>
                    <span>
                      {mapDrawMode === 'CIRCLE_HOTSPOT' ? 'Click Hotspot...' : 'Mark Hotspot'}
                    </span>
                  </button>
                </div>
              </div>

              {mapDrawMode !== 'NONE' && (
                <div className="p-2.5 rounded-lg bg-surface-container border border-tertiary/40 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
                  {mapDrawMode === 'POLYGON' ? (
                    <span className="text-primary">
                      Polygon Mode: Click 3+ points on map ({draftPolygonPoints.length} vertices)
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-tertiary">Hotspot Radius:</span>
                      <input
                        type="range"
                        min={150}
                        max={2500}
                        step={50}
                        value={draftHotspotRadius}
                        onChange={(e) => setDraftHotspotRadius(Number(e.target.value))}
                        className="w-24 accent-amber-400"
                      />
                      <span className="text-on-surface font-bold">{draftHotspotRadius}m</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    {mapDrawMode === 'POLYGON' && draftPolygonPoints.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setDraftPolygonPoints([])}
                        className="px-2 py-0.5 rounded bg-surface-container-highest text-secondary text-[10px]"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openConfigureZoneModal()}
                      className="px-2.5 py-1 rounded bg-tertiary-container text-on-tertiary font-bold text-[10px]"
                    >
                      Save Marked Zone →
                    </button>
                  </div>
                </div>
              )}

              <RiskZonesInteractiveMap
                riskZones={riskZones}
                selectedZoneId={selectedZone?.id || null}
                onSelectZone={(z) => navigate(`/risk-zones/${z.id}`)}
                drawingMode={mapDrawMode}
                draftPolygonPoints={draftPolygonPoints}
                draftHotspotCenter={draftHotspotCenter}
                draftHotspotRadius={draftHotspotRadius}
                draftRiskLevel={zoneRiskLevel}
                onMapDrawClick={(lat, lng) => {
                  if (mapDrawMode === 'POLYGON') {
                    setDraftPolygonPoints((prev) => [...prev, [lat, lng]]);
                  } else if (mapDrawMode === 'CIRCLE_HOTSPOT') {
                    setDraftHotspotCenter({ lat, lng });
                  }
                }}
              />
            </div>

            <div className="bg-surface-container-low rounded-lg shadow-md p-space-md flex flex-col gap-space-md">
              <div className="flex items-center justify-between pb-space-xs">
                <div className="flex flex-col">
                  <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                    Configured Risk Geofences &amp; Hotspots
                  </h2>
                  <span className="font-label-sm text-label-sm text-outline">
                    {riskZones.length} Active GIS Containment Perimeters
                  </span>
                </div>
                <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-primary-container/20 text-primary font-mono font-bold">
                  OSM SYNCED
                </span>
              </div>

              {riskZones.map((zone) => {
                const isHigh = zone.riskLevel === 'HIGH_RISK';
                const isElev = zone.riskLevel === 'ELEVATED';
                return (
                  <div
                    key={zone.id}
                    className="p-space-md rounded-lg bg-surface-container flex flex-col gap-space-sm shadow-sm relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded font-label-sm text-label-sm font-bold uppercase ${
                            isHigh
                              ? 'bg-secondary-container/40 text-secondary'
                              : isElev
                              ? 'bg-tertiary-container/30 text-tertiary'
                              : 'bg-surface-container-highest text-on-surface-variant'
                          }`}
                        >
                          {zone.riskLevel.replace('_', ' ')}
                        </span>
                        <span className="font-label-md text-label-md font-mono text-outline">
                          GEO-ID: {zone.geoId}
                        </span>
                      </div>
                      <span
                        className={`font-label-sm text-label-sm font-bold font-mono ${
                          zone.incidentCount > 0 ? 'text-secondary' : 'text-primary'
                        }`}
                      >
                        {zone.incidentCount > 0
                          ? `${zone.incidentCount} Active Incident`
                          : zone.geofenceStatus}
                      </span>
                    </div>

                    <div>
                      <Link
                        to={`/risk-zones/${zone.id}`}
                        className="font-headline-md text-headline-md text-on-surface font-semibold hover:text-primary"
                      >
                        {zone.name}
                      </Link>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        {zone.reason}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-space-sm font-label-sm text-label-sm pt-1">
                      <div className="p-2 rounded bg-surface-container-lowest flex flex-col">
                        <span className="text-outline">Active Window</span>
                        <span className="text-on-surface font-mono font-semibold">
                          {zone.activeHours}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-surface-container-lowest flex flex-col">
                        <span className="text-outline">Monitored In-Zone</span>
                        <span className="text-primary font-mono text-[14px] font-bold">
                          {zone.touristCount} Devices
                        </span>
                      </div>
                    </div>

                     <div className="p-2 rounded bg-surface-container-lowest font-label-sm text-label-sm text-outline flex items-center justify-between">
                      <span className="truncate">
                        {zone.shapeType === 'CIRCLE_HOTSPOT'
                          ? `Hotspot Cordon (${zone.radiusMeters || 500}m) • `
                          : 'Polygon Fence • '}
                        {zone.requirements}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          to={`/risk-zones/${zone.id}`}
                          className="text-primary hover:underline font-bold"
                        >
                          Focus
                        </Link>
                        {can('MANAGE_RISK_ZONES') && (
                          <>
                            <span className="text-outline-variant">•</span>
                            <button
                              type="button"
                              onClick={() => toggleRiskZoneStatus(zone.id)}
                              className="text-tertiary hover:underline font-bold"
                            >
                              {zone.geofenceStatus === 'PAUSED' ? 'Activate' : 'Pause'}
                            </button>
                            <span className="text-outline-variant">•</span>
                            <button
                              type="button"
                              onClick={() => openConfigureZoneModal(zone)}
                              className="text-primary hover:underline font-bold"
                            >
                              Edit
                            </button>
                            <span className="text-outline-variant">•</span>
                            <button
                              type="button"
                              onClick={() => deleteRiskZone(zone.id)}
                              className="text-secondary hover:underline font-bold"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progressive Escalation Policy Matrix */}
            <div className="bg-surface-container-low rounded-lg shadow-md p-space-md flex flex-col gap-space-sm">
              <div className="flex items-center justify-between border-b border-surface-container pb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">policy</span>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-bold">
                    Progressive Escalation Policy Matrix
                  </h3>
                </div>
                <span className="font-label-sm text-label-sm text-outline uppercase font-mono">
                  SOP v3.8
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                The autonomous heuristic engine flags potential deviations, but adheres strictly to
                non-punitive human verification. Emergency dispatch or formal police escalations
                require deliberate controller sign-off.
              </p>
              <div className="grid grid-cols-5 gap-2 pt-2 text-center font-label-sm text-label-sm">
                {[
                  ['0', 'Level 0', 'Baseline Tracking', 'bg-surface-container text-outline'],
                  ['1', 'Level 1', 'Heuristic Flag', 'bg-surface-container text-primary'],
                  ['2', 'Level 2', 'Auto-Prompt', 'bg-surface-container text-tertiary'],
                  [
                    '3',
                    'Level 3',
                    'Officer Verify',
                    'bg-primary-container/20 text-primary ring-1 ring-primary/40',
                  ],
                  [
                    '4',
                    'Level 4',
                    'Emergency Dispatch',
                    'bg-secondary-container/30 text-secondary',
                  ],
                ].map(([num, lvl, desc, cls]) => (
                  <div
                    key={num}
                    className={`p-2 rounded flex flex-col items-center gap-1 ${cls}`}
                  >
                    <span className="w-5 h-5 rounded-full bg-surface-container-highest flex items-center justify-center font-mono text-[10px] font-bold">
                      {num}
                    </span>
                    <span className="text-on-surface font-bold">{lvl}</span>
                    <span className="text-outline text-[10px] leading-tight">{desc}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 p-2.5 rounded bg-surface-container-lowest flex items-start gap-2 text-outline font-label-sm text-label-sm">
                <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">
                  verified_user
                </span>
                <span className="leading-normal">
                  <strong className="text-on-surface">Legal Safeguard:</strong> Model inferences
                  never auto-declare tourist missing status without manual verification from active
                  duty officer.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configure / Edit Risk Zone Modal */}
      <Modal
        open={zoneModalOpen}
        onClose={() => setZoneModalOpen(false)}
        title={editingZone ? `Edit Risk Zone ${editingZone.geoId}` : 'Configure New Geofence Polygon'}
        subtitle="Dynamic Containment & Advisory Threshold Configuration"
        icon="polyline"
      >
        <form onSubmit={handleSaveZoneSubmit} className="space-y-4">
          {zoneFormError && (
            <div className="p-2.5 rounded bg-secondary-container/30 text-secondary font-label-sm text-label-sm">
              {zoneFormError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-label-sm text-label-sm text-outline uppercase block">
                Risk Zone Name *
              </label>
              <input
                type="text"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="e.g. Laitlum Canyon Escarpment"
                className="w-full h-9 px-3 rounded bg-surface-container text-on-surface font-body-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="font-label-sm text-label-sm text-outline uppercase block">
                Geo-Fence ID *
              </label>
              <input
                type="text"
                value={zoneGeoId}
                onChange={(e) => setZoneGeoId(e.target.value)}
                className="w-full h-9 px-3 rounded bg-surface-container text-on-surface font-mono font-body-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="font-label-sm text-label-sm text-outline uppercase block">
                Geometry Type *
              </label>
              <select
                value={zoneShapeType}
                onChange={(e) =>
                  setZoneShapeType(e.target.value as 'POLYGON' | 'CIRCLE_HOTSPOT')
                }
                className="w-full h-9 px-3 rounded bg-surface-container text-on-surface font-body-sm"
              >
                <option value="POLYGON">Polygon Perimeter Fence</option>
                <option value="CIRCLE_HOTSPOT">Circular Hotspot Cordon (Radius)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-label-sm text-label-sm text-outline uppercase block">
                Threat / Police Category *
              </label>
              <select
                value={zoneCategory}
                onChange={(e) => setZoneCategory(e.target.value as RiskZone['category'])}
                className="w-full h-9 px-3 rounded bg-surface-container text-on-surface font-body-sm"
              >
                <option value="CLIFF_RESTRICTED">Cliff / Escarpment Drop</option>
                <option value="LANDSLIDE_BLOCKADE">Landslide / Road Blockade</option>
                <option value="CROWD_HOTSPOT">Crowd / Crime Hotspot</option>
                <option value="FLASH_FLOOD">Flash Flood Corridor</option>
                <option value="CURFEW_GORGE">Night Curfew Gorge</option>
                <option value="VIP_SECURITY_CORDON">Police Security Cordon</option>
                <option value="CAVE_HAZARD">Subterranean Cave Hazard</option>
                <option value="WATER_BUFFER">Water Body Buffer</option>
              </select>
            </div>
            {zoneShapeType === 'CIRCLE_HOTSPOT' && (
              <div className="space-y-1 sm:col-span-2">
                <label className="font-label-sm text-label-sm text-outline uppercase block">
                  Hotspot Cordon Radius ({draftHotspotRadius} meters)
                </label>
                <input
                  type="range"
                  min={150}
                  max={2500}
                  step={50}
                  value={draftHotspotRadius}
                  onChange={(e) => setDraftHotspotRadius(Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="font-label-sm text-label-sm text-outline uppercase block">
                Risk Level *
              </label>
              <select
                value={zoneRiskLevel}
                onChange={(e) => setZoneRiskLevel(e.target.value as RiskZone['riskLevel'])}
                className="w-full h-9 px-3 rounded bg-surface-container text-on-surface font-body-sm"
              >
                <option value="HIGH_RISK">HIGH RISK (Restricted / Red)</option>
                <option value="ELEVATED">ELEVATED RISK (Amber)</option>
                <option value="MODERATE">MODERATE BUFFER</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-label-sm text-label-sm text-outline uppercase block">
                Active Curfew / Alert Hours *
              </label>
              <input
                type="text"
                value={zoneActiveHours}
                onChange={(e) => setZoneActiveHours(e.target.value)}
                className="w-full h-9 px-3 rounded bg-surface-container text-on-surface font-mono font-body-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="font-label-sm text-label-sm text-outline uppercase block">
              Operational Hazard Reason &amp; Advisory Message *
            </label>
            <textarea
              rows={3}
              value={zoneReason}
              onChange={(e) => setZoneReason(e.target.value)}
              placeholder="Describe terrain hazard, cellular blind spots, or seasonal weather triggers..."
              className="w-full p-2.5 rounded bg-surface-container text-on-surface font-body-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/30">
            <button
              type="button"
              onClick={() => setZoneModalOpen(false)}
              className="px-4 py-2 rounded bg-surface-container-high text-on-surface font-label-md text-label-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-primary-container text-on-primary-container font-label-md text-label-md font-bold"
            >
              Save Geofence Polygon
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
