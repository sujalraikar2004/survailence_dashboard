import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../app/providers/AuthContext';
import { useOperational } from '../app/providers/OperationalContext';
import { AssignUnitModal, VerifyIncidentModal } from '../components/incidents/IncidentModals';
import { CommandCenterMiniMap } from '../components/maps/TacticalMapAbstraction';
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  SafeImage,
  StatusBadge,
} from '../components/ui/CommonUi';
import { STITCH_ASSETS } from '../mock/mockData';
import { Incident, IncidentSeverity } from '../types';

export const CommandCenterPage: React.FC = () => {
  const { user, can } = useAuth();
  const {
    incidents,
    tourists,
    riskZones,
    anomalies,
    responseUnits,
    isLoading,
    error,
    retryLoadData,
    acknowledgeIncident,
    handleCheckInAction,
    showToast,
  } = useOperational();

  const navigate = useNavigate();

  const [queueFilter, setQueueFilter] = useState<'ALL' | IncidentSeverity>('ALL');
  const [assignModalIncident, setAssignModalIncident] = useState<Incident | null>(null);
  const [verifyModalIncident, setVerifyModalIncident] = useState<Incident | null>(null);
  const [miniMapZoom, setMiniMapZoom] = useState(13.4);

  const activeIncidents = useMemo(
    () => incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'UNFOUNDED'),
    [incidents]
  );

  const filteredQueue = useMemo(() => {
    const priorityOrder: Record<IncidentSeverity, number> = {
      CRITICAL: 1,
      HIGH: 2,
      CONCERN: 3,
      VERIFICATION: 4,
      WARNING: 5,
      NORMAL: 6,
    };
    return [...activeIncidents]
      .filter((i) => (queueFilter === 'ALL' ? true : i.severity === queueFilter))
      .sort((a, b) => priorityOrder[a.severity] - priorityOrder[b.severity]);
  }, [activeIncidents, queueFilter]);

  const criticalEmergenciesCount = useMemo(
    () => activeIncidents.filter((i) => i.severity === 'CRITICAL').length,
    [activeIncidents]
  );
  const highPriorityCount = useMemo(
    () =>
      activeIncidents.filter((i) => i.severity === 'HIGH' || i.severity === 'CONCERN').length + 6,
    [activeIncidents]
  );
  const pendingAnomaliesCount = useMemo(
    () => anomalies.filter((a) => a.status !== 'DISMISSED').length + 8,
    [anomalies]
  );
  const resolvedTodayCount = useMemo(
    () => 23 + incidents.filter((i) => i.status === 'RESOLVED').length,
    [incidents]
  );

  if (isLoading) {
    return (
      <div className="p-space-lg">
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-space-lg">
        <ErrorState message={error} onRetry={() => void retryLoadData()} />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <div className="p-space-lg space-y-space-lg">
        {/* KPI Operational Triage Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-space-sm">
          {/* 1. Critical SOS */}
          <div
            onClick={() => navigate('/incidents/active')}
            className="bg-surface-container-low p-space-md rounded-lg flex flex-col justify-between shadow-sm relative overflow-hidden cursor-pointer hover:bg-surface-container transition-colors"
          >
            <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-secondary-container/20 rounded-full blur-xl pointer-events-none"></div>
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                ACTIVE EMERGENCIES
              </span>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary"></span>
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-headline-xl text-headline-xl font-bold text-secondary tracking-tight font-mono">
                {String(criticalEmergenciesCount).padStart(2, '0')}
              </span>
              <span className="font-label-sm text-label-sm text-secondary-fixed font-semibold uppercase">
                CRITICAL
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-secondary/80">
              <span className="material-symbols-outlined text-[14px]">bolt</span>
              <span className="font-body-sm text-[11px] leading-tight">
                Immediate dispatch active
              </span>
            </div>
          </div>

          {/* 2. High-Priority Alerts */}
          <div
            onClick={() => navigate('/incidents')}
            className="bg-surface-container-low p-space-md rounded-lg flex flex-col justify-between shadow-sm relative overflow-hidden cursor-pointer hover:bg-surface-container transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                HIGH-PRIORITY ALERTS
              </span>
              <span className="material-symbols-outlined text-tertiary text-[18px]">warning</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-headline-xl text-headline-xl font-bold text-tertiary tracking-tight font-mono">
                {String(highPriorityCount).padStart(2, '0')}
              </span>
              <span className="font-label-sm text-label-sm text-tertiary-fixed font-semibold uppercase">
                TIER-3
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-outline">
              <span className="material-symbols-outlined text-[14px]">timer</span>
              <span className="font-body-sm text-[11px] leading-tight">Awaiting verification</span>
            </div>
          </div>

          {/* 3. Pending Anomalies */}
          <div
            onClick={() => navigate('/anomalies')}
            className="bg-surface-container-low p-space-md rounded-lg flex flex-col justify-between shadow-sm relative overflow-hidden cursor-pointer hover:bg-surface-container transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                PENDING ANOMALIES
              </span>
              <span className="material-symbols-outlined text-outline text-[18px]">alt_route</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-headline-xl text-headline-xl font-bold text-on-surface tracking-tight font-mono">
                {pendingAnomaliesCount}
              </span>
              <span className="font-label-sm text-label-sm text-outline font-semibold uppercase">
                ANOMALY
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-outline">
              <span className="material-symbols-outlined text-[14px]">psychology</span>
              <span className="font-body-sm text-[11px] leading-tight">
                Missed check-ins &amp; ML dev
              </span>
            </div>
          </div>

          {/* 4. Monitored Tourists */}
          <div
            onClick={() => navigate('/tourists')}
            className="bg-surface-container-low p-space-md rounded-lg flex flex-col justify-between shadow-sm relative overflow-hidden cursor-pointer hover:bg-surface-container transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                MONITORED TOURISTS
              </span>
              <span className="material-symbols-outlined text-primary text-[18px]">
                travel_explore
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-headline-xl text-headline-xl font-bold text-primary tracking-tight font-mono">
                {(1279 + tourists.length).toLocaleString()}
              </span>
              <span className="font-label-sm text-label-sm text-primary/80 font-semibold uppercase">
                ACTIVE
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-outline">
              <span className="material-symbols-outlined text-[14px]">how_to_reg</span>
              <span className="font-body-sm text-[11px] leading-tight">Authorized digital IDs</span>
            </div>
          </div>

          {/* 5. Active Geofences */}
          <div
            onClick={() => navigate('/risk-zones')}
            className="bg-surface-container-low p-space-md rounded-lg flex flex-col justify-between shadow-sm relative overflow-hidden cursor-pointer hover:bg-surface-container transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                ACTIVE GEOFENCES
              </span>
              <span className="material-symbols-outlined text-outline text-[18px]">fence</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-headline-xl text-headline-xl font-bold text-on-surface tracking-tight font-mono">
                {12 + riskZones.length}
              </span>
              <span className="font-label-sm text-label-sm text-outline font-semibold uppercase">
                POLYGONS
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-outline">
              <span className="material-symbols-outlined text-[14px]">crisis_alert</span>
              <span className="font-body-sm text-[11px] leading-tight">6 High / 11 Moderate</span>
            </div>
          </div>

          {/* 6. Resolved Today */}
          <div
            onClick={() => navigate('/incidents/history')}
            className="bg-surface-container-low p-space-md rounded-lg flex flex-col justify-between shadow-sm relative overflow-hidden cursor-pointer hover:bg-surface-container transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                RESOLVED TODAY
              </span>
              <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-headline-xl text-headline-xl font-bold text-on-surface tracking-tight font-mono">
                {resolvedTodayCount}
              </span>
              <span className="font-label-sm text-label-sm text-primary font-semibold uppercase">
                01m 42s AVG
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-outline">
              <span className="material-symbols-outlined text-[14px]">speed</span>
              <span className="font-body-sm text-[11px] leading-tight">
                Ack Target &lt; 02m 00s • 99.8% Uptime
              </span>
            </div>
          </div>
        </div>

        {/* Progressive Threat Escalation Meter Bar */}
        <div className="bg-surface-container-low p-space-md rounded-lg shadow-sm space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">
                stacked_bar_chart
              </span>
              <span className="font-headline-md text-headline-md text-on-surface">
                PROGRESSIVE THREAT ESCALATION SPECTRUM
              </span>
              <span className="font-label-sm text-label-sm text-outline font-mono">
                1,284 MONITORED
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-label-sm font-label-sm">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-surface-container-high"></span>L0
                Normal (1,215)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-surface-variant"></span>L1 Caution (46)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary-container"></span>L2 Check-in
                Due (12)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>L3 Concern (8)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>L4
                Critical SOS ({criticalEmergenciesCount})
              </span>
            </div>
          </div>
          <div className="w-full h-3 rounded-full bg-surface-container-highest flex overflow-hidden">
            <div
              className="bg-surface-bright/70"
              style={{ width: '94.6%' }}
              title="Level 0: 1,215 Safe"
            ></div>
            <div
              className="bg-primary/50"
              style={{ width: '3.5%' }}
              title="Level 1: 46 Caution"
            ></div>
            <div
              className="bg-tertiary-container"
              style={{ width: '0.9%' }}
              title="Level 2: 12 Check-in Due"
            ></div>
            <div
              className="bg-tertiary"
              style={{ width: '0.6%' }}
              title="Level 3: 8 Concern"
            ></div>
            <div
              className="bg-secondary shadow-[0_0_8px_rgba(255,179,173,0.9)] animate-pulse"
              style={{ width: '0.4%' }}
              title="Level 4: Critical Emergencies"
            ></div>
          </div>
        </div>

        {/* Main Operational Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg">
          {/* LEFT & CENTER COLUMN (8 cols) */}
          <div className="xl:col-span-8 space-y-space-lg flex flex-col">
            {/* Critical Incident Queue Section */}
            <div className="bg-surface-container-low rounded-lg p-space-lg shadow-md space-y-space-md">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-space-xs">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[22px]">
                    e911_emergency
                  </span>
                  <div className="flex flex-col">
                    <span className="font-headline-md text-headline-md text-on-surface uppercase tracking-wide">
                      CRITICAL &amp; PRIORITY INCIDENT QUEUE
                    </span>
                    <span className="font-label-sm text-label-sm text-outline">
                      Real-time triage prioritized by escalation urgency &amp; telemetry freshness
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      ['ALL', `ALL (${activeIncidents.length})`],
                      ['CRITICAL', 'CRITICAL'],
                      ['CONCERN', 'CONCERN'],
                      ['VERIFICATION', 'VERIFICATION'],
                    ] as ['ALL' | IncidentSeverity, string][]
                  ).map(([fKey, fLabel]) => (
                    <button
                      key={fKey}
                      type="button"
                      onClick={() => setQueueFilter(fKey)}
                      className={`px-2 py-0.5 rounded font-label-sm text-label-sm font-mono transition-colors ${
                        queueFilter === fKey
                          ? 'bg-primary-container text-on-primary-container font-bold'
                          : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {fLabel}
                    </button>
                  ))}
                  <Link
                    to="/incidents"
                    className="bg-surface-container-high hover:bg-surface-variant text-on-surface px-2.5 py-1 rounded text-label-sm font-label-sm flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">tune</span> Full Queue
                  </Link>
                </div>
              </div>

              {filteredQueue.length === 0 ? (
                <EmptyState
                  icon="verified"
                  title="No Active Emergencies in Current Filter"
                  description="All incidents matching this priority filter have been cleared or resolved."
                  actionLabel="Show All Active"
                  onAction={() => setQueueFilter('ALL')}
                />
              ) : (
                filteredQueue.map((inc) => {
                  const isCritical = inc.severity === 'CRITICAL';
                  const isConcern = inc.severity === 'CONCERN' || inc.severity === 'HIGH';
                  const accentBarClass = isCritical
                    ? 'bg-secondary shadow-[0_0_12px_rgba(255,179,173,0.8)]'
                    : isConcern
                    ? 'bg-tertiary'
                    : 'bg-primary/60';

                  return (
                    <div
                      key={inc.id}
                      className="bg-surface-container rounded-lg p-space-md shadow-lg relative overflow-hidden transition-all duration-200 hover:bg-surface-container-high/90"
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${accentBarClass}`} />
                      <div className="pl-2 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isCritical ? (
                              <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold tracking-wider flex items-center gap-1 uppercase">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
                                </span>
                                {inc.tierLabel}
                              </span>
                            ) : isConcern ? (
                              <span className="px-2 py-0.5 rounded bg-tertiary-container/30 text-tertiary font-label-sm text-label-sm font-bold tracking-wider uppercase">
                                {inc.tierLabel}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-bold tracking-wider uppercase">
                                {inc.tierLabel}
                              </span>
                            )}
                            <Link
                              to={`/incidents/${inc.id}`}
                              className="font-label-md text-label-md font-bold text-on-surface hover:text-primary font-mono"
                            >
                              {inc.id}
                            </Link>
                            <span className="text-outline text-label-sm">•</span>
                            <span
                              className={`font-label-sm text-label-sm font-mono ${
                                isCritical ? 'text-secondary' : 'text-outline'
                              }`}
                            >
                              {isCritical
                                ? `GPS Ping: ${inc.location.minutesAgo}m ago (±${inc.location.accuracyMeters}m accuracy)`
                                : inc.triggerDescription}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <StatusBadge status={inc.status} />
                          </div>
                        </div>

                        {/* Content Row */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                          <div
                            onClick={() => navigate(`/tourists/${inc.dtid}`)}
                            className="md:col-span-4 flex items-center gap-3 cursor-pointer"
                          >
                            <SafeImage
                              className="w-12 h-12 rounded-lg object-cover bg-surface-container-highest shadow-sm shrink-0"
                              alt={inc.touristName}
                              src={inc.touristAvatar}
                              fallbackText={inc.touristName}
                            />
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="font-headline-md text-headline-md text-on-surface hover:text-primary">
                                  {inc.touristName}
                                </span>
                                <span
                                  className="material-symbols-outlined text-primary text-[14px]"
                                  title="Digital Tourist ID Verified"
                                >
                                  verified
                                </span>
                              </div>
                              <span className="font-label-sm text-label-sm text-outline font-mono">
                                {inc.dtid} • Age: {inc.touristAge} • {inc.touristOrigin}
                              </span>
                              {inc.id === 'INC-2026-00421' ? (
                                <span className="font-body-sm text-[11px] text-tertiary flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[12px]">ecg</span>{' '}
                                  BPM: 134 (Spike Detected)
                                </span>
                              ) : inc.id === 'INC-2026-00419' ? (
                                <span className="font-body-sm text-[11px] text-error flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[12px]">
                                    schedule
                                  </span>{' '}
                                  Missed Check-in: 34m overdue
                                </span>
                              ) : (
                                <span className="font-body-sm text-[11px] text-outline flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[12px]">
                                    battery_charging_full
                                  </span>{' '}
                                  Battery: 88% • Alt {inc.location.altitudeMeters}m
                                </span>
                              )}
                            </div>
                          </div>

                          <div
                            onClick={() => navigate(`/incidents/${inc.id}`)}
                            className="md:col-span-4 flex flex-col justify-center cursor-pointer"
                          >
                            <div className="flex items-center gap-1.5 text-on-surface font-body-sm text-body-sm font-semibold">
                              <span
                                className={`material-symbols-outlined text-[16px] ${
                                  isCritical
                                    ? 'text-secondary'
                                    : isConcern
                                    ? 'text-tertiary'
                                    : 'text-primary'
                                }`}
                              >
                                {isCritical ? 'location_on' : isConcern ? 'hiking' : 'landscape'}
                              </span>
                              <span>{inc.location.name}</span>
                            </div>
                            <span className="font-label-sm text-label-sm text-outline font-mono">
                              {inc.location.lat.toFixed(4)}° N, {inc.location.lng.toFixed(4)}° E (
                              {inc.location.sector})
                            </span>
                            <span className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">
                              {inc.triggerDescription}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="md:col-span-4 flex flex-col sm:flex-row items-stretch md:items-center justify-end gap-2">
                            {isCritical ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    acknowledgeIncident(inc.id);
                                    navigate(`/incidents/${inc.id}`);
                                  }}
                                  className="bg-primary-container hover:bg-surface-tint text-on-primary-container px-3 py-2 rounded font-label-md text-label-md font-bold tracking-wide flex items-center justify-center gap-1.5 shadow-md transition-colors whitespace-nowrap"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    open_in_new
                                  </span>
                                  {inc.status === 'ACTIVE' || inc.status === 'NEW'
                                    ? 'ACKNOWLEDGE'
                                    : 'OPEN WORKSPACE'}
                                </button>
                                {can('ASSIGN_RESPONSE_UNIT') && (
                                  <button
                                    type="button"
                                    onClick={() => setAssignModalIncident(inc)}
                                    className="bg-secondary-container hover:bg-error-container text-on-secondary-container px-3 py-2 rounded font-label-md text-label-md font-bold tracking-wide flex items-center justify-center gap-1.5 shadow-md transition-colors whitespace-nowrap"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      send
                                    </span>
                                    {inc.assignedUnitName
                                      ? `UNIT: ${inc.assignedUnitName.toUpperCase()}`
                                      : 'DISPATCH ALPHA-12'}
                                  </button>
                                )}
                              </>
                            ) : isConcern ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    showToast(
                                      `Cell Tower poll sent for ${inc.touristName} (${inc.dtid}).`,
                                      'PRIMARY'
                                    )
                                  }
                                  className="bg-surface-container-high hover:bg-surface-variant text-on-surface px-3 py-2 rounded font-label-md text-label-md font-semibold tracking-wide flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    cell_tower
                                  </span>
                                  PING CELL TOWER
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setVerifyModalIncident(inc)}
                                  className="bg-tertiary-container hover:bg-tertiary text-on-tertiary-container px-3 py-2 rounded font-label-md text-label-md font-bold tracking-wide flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    visibility
                                  </span>
                                  REVIEW SIGNALS
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleCheckInAction('CHK-103', 'SEND_PROMPT');
                                  }}
                                  className="bg-surface-container-high hover:bg-surface-variant text-on-surface px-3 py-2 rounded font-label-md text-label-md font-semibold tracking-wide flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                                >
                                  <span className="material-symbols-outlined text-[16px]">sms</span>
                                  AUTO-SMS BOT
                                </button>
                                <button
                                  type="button"
                                  onClick={() => navigate(`/incidents/${inc.id}`)}
                                  className="bg-primary/20 hover:bg-primary/30 text-primary px-3 py-2 rounded font-label-md text-label-md font-bold tracking-wide flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    ring_volume
                                  </span>
                                  REQUEST CHECK-IN
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Tactical Mini-Map Preview Widget */}
            <div className="bg-surface-container-low rounded-lg p-space-lg shadow-md space-y-space-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">layers</span>
                  <div className="flex flex-col">
                    <span className="font-headline-md text-headline-md text-on-surface uppercase">
                      GEOSPATIAL SITUATIONAL AWARENESS: SHILLONG SECTOR
                    </span>
                    <span className="font-label-sm text-label-sm text-outline">
                      Real-time GPS fixes, patrol transponders &amp; polygon boundary overlays
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container-high text-primary font-mono">
                    LIVE SYNC: 1s
                  </span>
                  <Link
                    to="/live-map"
                    className="font-label-sm text-label-sm text-primary hover:underline flex items-center gap-1 font-semibold"
                  >
                    FULL SCREEN MAP{' '}
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </Link>
                </div>
              </div>

              {/* Interactive OpenStreetMap Situational Awareness Container */}
              <CommandCenterMiniMap
                incidents={incidents}
                riskZones={riskZones}
                responseUnits={responseUnits}
                onSelectIncident={(id) => navigate(`/incidents/${id}`)}
                onSelectUnit={(id) => navigate(`/response-teams/${id}`)}
              />
            </div>
          </div>

          {/* RIGHT COLUMN (4 cols) */}
          <div className="xl:col-span-4 space-y-space-lg flex flex-col">
            {/* Live Dispatch & Patrol Units */}
            <div className="bg-surface-container-low rounded-lg p-space-lg shadow-md space-y-space-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    local_police
                  </span>
                  <div className="flex flex-col">
                    <span className="font-headline-md text-headline-md text-on-surface uppercase">
                      LIVE DISPATCH &amp; PATROLS
                    </span>
                    <span className="font-label-sm text-label-sm text-outline">
                      Available rapid intervention forces
                    </span>
                  </div>
                </div>
                <Link
                  to="/response-teams"
                  className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-primary-container/20 text-primary font-mono font-bold hover:underline"
                >
                  {responseUnits.length} ON DUTY
                </Link>
              </div>

              <div className="space-y-2.5">
                {responseUnits.slice(0, 3).map((unit) => (
                  <div
                    key={unit.id}
                    className="bg-surface-container rounded-lg p-space-md shadow-sm space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div
                        onClick={() => navigate(`/response-teams/${unit.id}`)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-label-sm font-bold ${
                            unit.id === 'UNIT-ALPHA-12'
                              ? 'bg-primary-container text-on-primary-container'
                              : 'bg-surface-container-highest text-on-surface'
                          }`}
                        >
                          {unit.code}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-headline-md text-body-md font-semibold text-on-surface hover:text-primary">
                            Unit {unit.name}
                          </span>
                          <span className="font-body-sm text-[11px] text-outline">
                            {unit.leadOfficer} ({unit.vehicleType})
                          </span>
                        </div>
                      </div>
                      <span
                        className={`font-label-sm text-label-sm px-2 py-0.5 rounded font-semibold uppercase ${
                          unit.status === 'EN_ROUTE'
                            ? 'bg-tertiary-container/30 text-tertiary'
                            : unit.status === 'AVAILABLE'
                            ? 'bg-surface-container-high text-primary'
                            : 'bg-surface-container-high text-on-surface'
                        }`}
                      >
                        {unit.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-body-sm text-outline pt-1">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">near_me</span>{' '}
                        {unit.distanceKm}km • {unit.locationName}
                      </span>
                      <span className="font-mono text-primary font-semibold">
                        ETA: {unit.etaText}
                      </span>
                    </div>

                    {unit.id === 'UNIT-ALPHA-12' ? (
                      <button
                        type="button"
                        onClick={() => {
                          const sosInc =
                            incidents.find((i) => i.id === 'INC-2026-00421') || incidents[0];
                          setAssignModalIncident(sosInc);
                        }}
                        className="w-full bg-secondary-container hover:bg-error-container text-on-secondary-container py-1.5 rounded font-label-md text-label-md font-bold flex items-center justify-center gap-1.5 shadow transition-colors"
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          send_time_extension
                        </span>
                        {unit.currentIncidentId
                          ? `ASSIGNED TO ${unit.currentIncidentId}`
                          : 'DISPATCH TO SOS (INC-00421)'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate(`/response-teams/${unit.id}`)}
                        className="w-full bg-surface-container-high hover:bg-surface-variant text-on-surface-variant py-1 rounded font-label-sm text-label-sm text-center transition-colors"
                      >
                        {unit.currentIncidentId
                          ? `ASSIGNED: ${unit.currentIncidentId}`
                          : 'VIEW UNIT TELEMETRY'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Active Risk Geofences Card */}
            <div className="bg-surface-container-low rounded-lg p-space-lg shadow-md space-y-space-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">
                    share_location
                  </span>
                  <div className="flex flex-col">
                    <span className="font-headline-md text-headline-md text-on-surface uppercase">
                      ACTIVE RISK GEOFENCES
                    </span>
                    <span className="font-label-sm text-label-sm text-outline">
                      Dynamic containment boundaries
                    </span>
                  </div>
                </div>
                <Link
                  to="/risk-zones"
                  className="font-label-sm text-label-sm text-primary font-mono hover:underline"
                >
                  17 ZONES
                </Link>
              </div>

              <div className="space-y-2.5">
                {riskZones.slice(0, 2).map((zone) => {
                  const isHigh = zone.riskLevel === 'HIGH_RISK';
                  return (
                    <div
                      key={zone.id}
                      onClick={() => navigate(`/risk-zones/${zone.id}`)}
                      className="bg-surface-container rounded-lg p-space-md shadow-sm space-y-2 cursor-pointer hover:bg-surface-container-high transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-headline-md text-body-md font-semibold text-on-surface">
                          {zone.name}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded font-label-sm text-label-sm font-bold uppercase ${
                            isHigh
                              ? 'bg-secondary-container text-on-secondary-container'
                              : 'bg-tertiary-container/40 text-tertiary'
                          }`}
                        >
                          {zone.riskLevel.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="font-body-sm text-[11px] text-on-surface-variant leading-relaxed">
                        {zone.reason}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <span
                          className={`font-label-sm text-label-sm font-mono font-bold flex items-center gap-1 ${
                            isHigh ? 'text-secondary' : 'text-tertiary'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">groups</span>{' '}
                          {zone.touristCount} Tourists Inside
                        </span>
                        <span className="font-label-sm text-label-sm text-outline font-mono">
                          GEO-ID {zone.geoId}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* System Health & Privacy Governance Footer Card */}
            <div className="bg-surface-container-low rounded-lg p-space-lg shadow-md space-y-space-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    security
                  </span>
                  <span className="font-headline-md text-headline-md text-on-surface uppercase">
                    SYSTEM HEALTH &amp; PRIVACY
                  </span>
                </div>
                <span className="w-2 h-2 rounded-full bg-primary"></span>
              </div>
              <div className="space-y-2 font-label-sm text-label-sm text-outline">
                <div className="flex items-center justify-between pb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-primary">
                      sensors
                    </span>{' '}
                    Telemetry Ingestion Rate
                  </span>
                  <span className="font-mono text-primary font-bold">99.8% Online</span>
                </div>
                <div className="flex items-center justify-between pb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">cell_tower</span> SMS
                    Satellite Fallback
                  </span>
                  <span className="font-mono text-on-surface font-bold">Standby (0 Latency)</span>
                </div>
                <div className="flex items-center justify-between pb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">neurology</span> Anomaly
                    Detection Engine
                  </span>
                  <span className="font-mono text-primary font-bold">Operational (v4.2)</span>
                </div>
              </div>
              <div className="p-2.5 rounded bg-surface-container text-[11px] font-body-sm text-on-surface-variant space-y-1">
                <div className="flex items-center gap-1 font-label-sm text-label-sm text-primary font-bold">
                  <span className="material-symbols-outlined text-[13px]">verified_user</span>
                  NEED-TO-KNOW PRIVACY ENFORCEMENT
                </div>
                <p className="leading-relaxed text-outline">
                  Operator:{' '}
                  <span className="text-on-surface font-semibold">
                    {user?.name || 'Insp. Ananya Sharma'} (Badge {user?.badgeNumber || '#8841'})
                  </span>
                  . Active distress telemetry decryption clearance is logged to tamper-proof state
                  audit ledger.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assign & Verify Modals */}
      {assignModalIncident && (
        <AssignUnitModal
          open={Boolean(assignModalIncident)}
          onClose={() => setAssignModalIncident(null)}
          incident={assignModalIncident}
        />
      )}
      {verifyModalIncident && (
        <VerifyIncidentModal
          open={Boolean(verifyModalIncident)}
          onClose={() => setVerifyModalIncident(null)}
          incident={verifyModalIncident}
        />
      )}
    </div>
  );
};
