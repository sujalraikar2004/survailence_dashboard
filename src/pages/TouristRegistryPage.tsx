import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../app/providers/AuthContext';
import { useOperational } from '../app/providers/OperationalContext';
import {
  EmptyState,
  PermissionNotice,
  SafeImage,
} from '../components/ui/CommonUi';
import { STITCH_ASSETS } from '../mock/mockData';
import { SafetyStatus, Tourist } from '../types';

export const TouristRegistryPage: React.FC = () => {
  const { touristId } = useParams<{ touristId?: string }>();
  const { can } = useAuth();
  const {
    tourists,
    incidents,
    anomalies,
    checkIns,
    auditLogs,
    recordAuditAction,
    showToast,
  } = useOperational();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState(touristId || '');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [circuitFilter, setCircuitFilter] = useState<string>('ALL');
  const [kycFilter, setKycFilter] = useState<string>('ALL');
  const [quickSubTab, setQuickSubTab] = useState<'ALL' | 'PRIORITY' | 'SOHRA' | 'SOLO'>('ALL');
  const [viewMode, setViewMode] = useState<'SPLIT_DOSSIER' | 'TABLE'>('SPLIT_DOSSIER');
  const [activeDossierTab, setActiveDossierTab] = useState<
    'PROFILE' | 'ITINERARY' | 'ANOMALIES' | 'CONTACTS' | 'AUDIT'
  >('PROFILE');

  const selectedTourist: Tourist = useMemo(() => {
    if (touristId) {
      const found = tourists.find(
        (t) =>
          t.id.toLowerCase() === touristId.toLowerCase() ||
          t.dtid.toLowerCase() === touristId.toLowerCase()
      );
      if (found) return found;
    }
    return tourists[0];
  }, [tourists, touristId]);

  useEffect(() => {
    if (touristId) {
      recordAuditAction(
        'Viewed tourist profile',
        `Tourist ${selectedTourist.dtid} (${selectedTourist.name})`,
        selectedTourist.id,
        'Authorized profile inspection in Tourist Registry Dossier.'
      );
    }
  }, [touristId, selectedTourist.dtid, selectedTourist.id, selectedTourist.name, recordAuditAction]);

  const filteredTourists = useMemo(() => {
    return tourists.filter((t) => {
      if (statusFilter !== 'ALL' && t.safetyStatus !== statusFilter) return false;
      if (circuitFilter !== 'ALL' && !t.trip.circuit.toLowerCase().includes(circuitFilter.toLowerCase())) {
        return false;
      }
      if (kycFilter !== 'ALL' && t.identity.kycStatus !== kycFilter) return false;

      if (quickSubTab === 'PRIORITY' && t.safetyStatus === 'NORMAL') return false;
      if (quickSubTab === 'SOHRA' && !t.trip.circuit.toLowerCase().includes('sohra')) return false;
      if (quickSubTab === 'SOLO' && t.trip.groupSize > 1) return false;

      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.dtid.toLowerCase().includes(q) ||
        t.phone.toLowerCase().includes(q) ||
        t.identity.permitNumber.toLowerCase().includes(q) ||
        t.location.name.toLowerCase().includes(q) ||
        t.trip.packageName.toLowerCase().includes(q)
      );
    });
  }, [tourists, statusFilter, circuitFilter, kycFilter, quickSubTab, searchQuery]);

  const relatedIncidents = useMemo(
    () =>
      incidents.filter(
        (i) => i.touristId === selectedTourist.id || i.dtid === selectedTourist.dtid
      ),
    [incidents, selectedTourist]
  );

  const relatedAnomalies = useMemo(
    () =>
      anomalies.filter(
        (a) => a.touristId === selectedTourist.id || a.dtid === selectedTourist.dtid
      ),
    [anomalies, selectedTourist]
  );

  const relatedCheckIns = useMemo(
    () =>
      checkIns.filter(
        (c) => c.touristId === selectedTourist.id || c.dtid === selectedTourist.dtid
      ),
    [checkIns, selectedTourist]
  );

  const renderSafetyBadge = (status: SafetyStatus) => {
    if (status === 'CRITICAL_SOS') {
      return (
        <span className="px-2 py-0.5 rounded font-label-sm text-label-sm bg-secondary-container text-on-secondary-container font-bold inline-flex items-center gap-1 whitespace-nowrap">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-secondary"></span>
          </span>
          CRITICAL — SOS ACTIVE
        </span>
      );
    }
    if (status === 'CHECKIN_OVERDUE' || status === 'HIGH_CONCERN') {
      return (
        <span className="px-2 py-0.5 rounded font-label-sm text-label-sm bg-tertiary-container/30 text-tertiary font-bold inline-flex items-center gap-1 whitespace-nowrap">
          <span className="h-1.5 w-1.5 rounded-full bg-tertiary"></span>
          CHECK-IN OVERDUE
        </span>
      );
    }
    if (status === 'INACTIVITY_ALERT' || status === 'GEOFENCE_WARNING') {
      return (
        <span className="px-2 py-0.5 rounded font-label-sm text-label-sm bg-tertiary-container/20 text-tertiary-fixed-dim font-bold whitespace-nowrap">
          {status.replace('_', ' ')}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded font-label-sm text-label-sm bg-primary/10 text-primary font-bold whitespace-nowrap">
        NORMAL • ON ROUTE
      </span>
    );
  };

  return (
    <div className="flex flex-col w-full">
      {/* Top Command Context Bar */}
      <div className="px-space-lg py-space-md bg-surface-container-lowest flex flex-col gap-space-md shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-outline">
              <span>OPERATIONS</span>
              <span className="material-symbols-outlined text-[13px] text-outline-variant">
                chevron_right
              </span>
              <span>TOURIST MANAGEMENT</span>
              <span className="material-symbols-outlined text-[13px] text-outline-variant">
                chevron_right
              </span>
              <span className="text-primary font-bold">REGISTRY &amp; SUBJECT PROFILES</span>
            </div>
            <div className="flex items-center gap-space-md mt-1 flex-wrap">
              <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                Tourist Registry &amp; Subject Investigation
              </h1>
              <div className="flex items-center gap-space-xs px-2 py-0.5 rounded bg-surface-container-high font-label-sm text-label-sm text-primary">
                <span className="material-symbols-outlined text-[14px]">shield</span>
                <span>SECURE FORENSIC CONSOLE</span>
              </div>
            </div>
          </div>

          {/* Live Counters & Triage Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-surface-container-high shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="font-label-md text-label-md font-bold text-on-surface font-mono">
                1,284
              </span>
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                Active Monitored
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-secondary-container/40 text-secondary shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-secondary animate-pulse"></span>
              <span className="font-label-md text-label-md font-bold text-secondary font-mono">
                3
              </span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                Level-4 SOS Active
              </span>
            </div>
            <div className="flex items-center gap-2 border border-outline-variant/30 rounded p-0.5 bg-surface-container">
              <button
                type="button"
                onClick={() => setViewMode('SPLIT_DOSSIER')}
                className={`px-2.5 py-1 rounded font-label-sm text-label-sm transition-colors ${
                  viewMode === 'SPLIT_DOSSIER'
                    ? 'bg-primary-container text-on-primary-container font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Split Dossier View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className={`px-2.5 py-1 rounded font-label-sm text-label-sm transition-colors ${
                  viewMode === 'TABLE'
                    ? 'bg-primary-container text-on-primary-container font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Full Registry Table
              </button>
            </div>
            <button
              type="button"
              onClick={() =>
                showToast('Exported authorized tourist roster (CSV) to local station cache.', 'PRIMARY')
              }
              className="h-8 px-3 rounded bg-surface-container-high hover:bg-surface-variant text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              <span>EXPORT ROSTER (CSV)</span>
            </button>
            <Link
              to="/audit-logs"
              className="h-8 px-3 rounded bg-surface-container-high hover:bg-surface-variant text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">history</span>
              <span>AUDIT LOG</span>
            </Link>
          </div>
        </div>

        {/* Filter & Parametric Query Strip */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-space-sm items-center pt-space-xs">
          <div className="md:col-span-4 relative flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-outline text-[18px] pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded bg-surface-container text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
              placeholder="Filter by Tourist Name, DTID (e.g. DTID-8F4K29), Permit Ref, or Phone..."
            />
          </div>
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-9 px-2.5 rounded bg-surface-container text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">Status: All Critical &amp; Active</option>
              <option value="CRITICAL_SOS">Status: Critical SOS</option>
              <option value="CHECKIN_OVERDUE">Status: Check-in Overdue</option>
              <option value="INACTIVITY_ALERT">Status: Inactivity Alert</option>
              <option value="GEOFENCE_WARNING">Status: Geofence Warning</option>
              <option value="NORMAL">Status: Normal &amp; On-Route</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <select
              value={circuitFilter}
              onChange={(e) => setCircuitFilter(e.target.value)}
              className="w-full h-9 px-2.5 rounded bg-surface-container text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">Circuit: All Regions</option>
              <option value="East Khasi Hills">Circuit: East Khasi Hills</option>
              <option value="Sohra">Circuit: Sohra / Cherrapunji</option>
              <option value="Dawki">Circuit: Dawki River Corridor</option>
            </select>
          </div>
          <div className="md:col-span-2 flex items-center gap-space-xs">
            <select
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
              className="w-full h-9 px-2 rounded bg-surface-container text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Auth Tiers</option>
              <option value="FULL_EKYC_VERIFIED">Full e-KYC</option>
              <option value="TRANSIT_PERMIT_ISSUED">Transit Permit</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setCircuitFilter('ALL');
                setKycFilter('ALL');
                setQuickSubTab('ALL');
              }}
              className="h-9 w-9 shrink-0 rounded bg-surface-container-high hover:bg-surface-variant text-outline hover:text-on-surface flex items-center justify-center transition-colors"
              title="Reset Filters"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            </button>
          </div>
        </div>
      </div>

      {/* FULL TABLE MODE (Section 27 columns: Tourist, Digital Tourist ID, Trip, Destination, Safety Status, Last Update, Location Confidence, Check-in, Alerts) */}
      {viewMode === 'TABLE' ? (
        <div className="p-space-lg">
          <div className="bg-surface-container-low rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-lowest text-outline font-label-md text-label-md uppercase border-b border-outline-variant/30">
                    <th className="py-3 px-4">Tourist</th>
                    <th className="py-3 px-4">Digital Tourist ID</th>
                    <th className="py-3 px-4">Trip</th>
                    <th className="py-3 px-4">Destination / Sector</th>
                    <th className="py-3 px-4">Safety Status</th>
                    <th className="py-3 px-4">Last Update</th>
                    <th className="py-3 px-4">Location Confidence</th>
                    <th className="py-3 px-4">Check-in</th>
                    <th className="py-3 px-4 text-right">Alerts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 font-body-sm text-body-sm">
                  {filteredTourists.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => {
                        setViewMode('SPLIT_DOSSIER');
                        navigate(`/tourists/${t.dtid}`);
                      }}
                      className="hover:bg-surface-container-high/70 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <SafeImage
                            src={t.avatarUrl}
                            alt={t.name}
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                          />
                          <div>
                            <div className="font-bold text-on-surface">{t.name}</div>
                            <div className="text-[11px] text-outline">
                              Age {t.identity.age} • {t.identity.nationality}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-primary font-bold">{t.dtid}</td>
                      <td className="py-3 px-4">
                        <div className="text-on-surface font-medium">{t.trip.packageName}</div>
                        <div className="text-[11px] text-outline font-mono">
                          {t.trip.startDate} – {t.trip.endDate}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-on-surface">{t.location.name}</div>
                        <div className="text-[11px] text-outline">{t.trip.circuit}</div>
                      </td>
                      <td className="py-3 px-4">{renderSafetyBadge(t.safetyStatus)}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-outline">
                        {t.location.minutesAgo > 15
                          ? `Last known location received ${t.location.minutesAgo}m ago`
                          : `${t.location.minutesAgo}m ago (${t.location.updatedAt})`}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-mono font-label-sm px-2 py-0.5 rounded ${
                            t.locationConfidence === 'HIGH'
                              ? 'bg-primary/15 text-primary'
                              : 'bg-tertiary/15 text-tertiary'
                          }`}
                        >
                          {t.locationConfidence} (±{t.location.accuracyMeters}m)
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-label-sm">
                        <span
                          className={
                            t.checkInStatus === 'OK'
                              ? 'text-primary font-bold'
                              : t.checkInStatus === 'ESCALATED'
                              ? 'text-secondary font-bold'
                              : 'text-tertiary font-bold'
                          }
                        >
                          {t.checkInStatus} ({t.lastCheckInTime})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {t.alertsCount > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-secondary-container/30 text-secondary">
                            {t.alertsCount} Active
                          </span>
                        ) : (
                          <span className="text-outline">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Operational Split Workspace: 40% Left Roster / 60% Right Dossier */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 bg-surface">
          {/* LEFT WING: Registry Directory & Incident Roster (Col 1-5) */}
          <div className="lg:col-span-5 bg-surface-container-lowest flex flex-col shadow-inner">
            {/* Quick Filter Subtabs */}
            <div className="px-space-md py-space-sm bg-surface-container-low flex items-center justify-between gap-1 overflow-x-auto">
              <div className="flex items-center gap-1 font-label-sm text-label-sm">
                <button
                  type="button"
                  onClick={() => setQuickSubTab('ALL')}
                  className={`px-2.5 py-1 rounded ${
                    quickSubTab === 'ALL'
                      ? 'bg-primary text-on-primary font-bold'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  All (1,284)
                </button>
                <button
                  type="button"
                  onClick={() => setQuickSubTab('PRIORITY')}
                  className={`px-2.5 py-1 rounded flex items-center gap-1 ${
                    quickSubTab === 'PRIORITY'
                      ? 'bg-secondary-container text-on-secondary-container font-bold'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="flex h-1.5 w-1.5 rounded-full bg-secondary"></span>
                  Priority / SOS (15)
                </button>
                <button
                  type="button"
                  onClick={() => setQuickSubTab('SOHRA')}
                  className={`px-2.5 py-1 rounded ${
                    quickSubTab === 'SOHRA'
                      ? 'bg-primary text-on-primary font-bold'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Sohra (342)
                </button>
                <button
                  type="button"
                  onClick={() => setQuickSubTab('SOLO')}
                  className={`px-2.5 py-1 rounded ${
                    quickSubTab === 'SOLO'
                      ? 'bg-primary text-on-primary font-bold'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Solo (88)
                </button>
              </div>
              <div className="flex items-center gap-1 text-outline font-label-sm text-[10px]">
                <span className="material-symbols-outlined text-[14px]">sort</span>
                <span>RISK SCORE</span>
              </div>
            </div>

            {/* Roster List */}
            <div className="flex flex-col overflow-y-auto max-h-[calc(100vh-230px)] divide-y-0 p-space-sm space-y-2">
              {filteredTourists.length === 0 ? (
                <EmptyState
                  icon="person_search"
                  title="No Search Results"
                  description="No tourist records match your filter criteria."
                  actionLabel="Clear Search"
                  onAction={() => setSearchQuery('')}
                />
              ) : (
                filteredTourists.map((t) => {
                  const isSelected = t.id === selectedTourist.id;
                  const isSos = t.safetyStatus === 'CRITICAL_SOS';
                  const isWarn =
                    t.safetyStatus === 'CHECKIN_OVERDUE' ||
                    t.safetyStatus === 'INACTIVITY_ALERT' ||
                    t.safetyStatus === 'GEOFENCE_WARNING';

                  return (
                    <div
                      key={t.id}
                      onClick={() => navigate(`/tourists/${t.dtid}`)}
                      className={`p-space-md rounded-lg transition-all cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? 'bg-surface-container-high shadow-md ring-1 ring-primary/40'
                          : 'bg-surface-container hover:bg-surface-container-high shadow-sm'
                      }`}
                    >
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                          isSos ? 'bg-secondary' : isWarn ? 'bg-tertiary' : 'bg-primary'
                        }`}
                      />
                      <div className="pl-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-headline-md text-headline-md text-on-surface font-bold">
                                {t.name}
                              </span>
                              <span className="font-label-sm text-label-sm text-outline">
                                Age {t.identity.age} • {t.identity.homeCity}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-label-sm text-label-sm font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                {t.dtid}
                              </span>
                              <span className="font-body-sm text-body-sm text-on-surface-variant">
                                {t.trip.packageName}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {renderSafetyBadge(t.safetyStatus)}
                            <span className="font-label-sm text-label-sm text-outline font-mono">
                              {t.location.minutesAgo > 15
                                ? `Last known location received ${t.location.minutesAgo} minutes ago`
                                : `${t.location.minutesAgo}m ago`}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 grid grid-cols-3 gap-2 bg-surface-container-low p-2 rounded">
                          <div className="flex flex-col">
                            <span className="font-label-sm text-[10px] text-outline uppercase">
                              Sector / Ping
                            </span>
                            <span className="font-label-sm text-label-sm text-on-surface font-semibold truncate">
                              {t.location.name}
                            </span>
                            <span className="font-label-sm text-[10px] text-outline font-mono">
                              ±{t.location.accuracyMeters}m ({t.locationConfidence})
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-label-sm text-[10px] text-outline uppercase">
                              Telemetry
                            </span>
                            <div className="flex items-center gap-1.5 text-on-surface font-label-sm text-label-sm">
                              <span
                                className={`material-symbols-outlined text-[14px] ${
                                  t.device.batteryPercent < 25 ? 'text-secondary' : 'text-primary'
                                }`}
                              >
                                battery_4_bar
                              </span>
                              <span>{t.device.batteryPercent}%</span>
                            </div>
                            <span className="font-label-sm text-[10px] text-outline truncate">
                              {t.device.networkStatus}
                            </span>
                          </div>
                          <div className="flex flex-col items-end justify-center">
                            {t.activeIncidentId ? (
                              <>
                                <span className="font-label-sm text-[10px] text-secondary font-bold uppercase tracking-wider">
                                  {t.activeIncidentId}
                                </span>
                                <span className="font-label-sm text-[10px] text-on-surface-variant font-mono">
                                  Check-in: {t.checkInStatus}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="font-label-sm text-[10px] text-primary uppercase font-mono">
                                  Check-in {t.checkInStatus}
                                </span>
                                <span className="font-label-sm text-[10px] text-outline">
                                  {t.lastCheckInTime}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {isSos && (
                          <div className="mt-2 flex items-center gap-1.5 text-secondary font-body-sm text-[11px] bg-secondary-container/20 px-2 py-1 rounded">
                            <span className="material-symbols-outlined text-[15px] shrink-0">
                              emergency_home
                            </span>
                            <span className="truncate font-semibold">
                              Route deviation 1.8km into gorge + Panic SOS Trigger depressed
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Roster Pagination */}
            <div className="p-space-sm bg-surface-container-low flex items-center justify-between font-label-sm text-label-sm text-outline">
              <span>
                Showing <strong className="text-on-surface">1 – {filteredTourists.length}</strong>{' '}
                of <strong className="text-on-surface">1,284</strong> tourists
              </span>
              <div className="flex items-center gap-1">
                <span className="px-2 py-1 rounded bg-primary text-on-primary font-bold">1</span>
                <button
                  type="button"
                  onClick={() => setViewMode('TABLE')}
                  className="px-2 py-1 rounded bg-surface-container text-on-surface hover:bg-surface-variant"
                >
                  Table View
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT WING: Deep Tourist Investigation Dossier (Col 6-12) */}
          <div className="lg:col-span-7 bg-surface flex flex-col p-space-lg gap-space-lg overflow-y-auto max-h-[calc(100vh-140px)]">
            {/* 1. Investigation Profile Header Banner */}
            <div className="p-space-lg rounded-xl bg-surface-container shadow-md flex flex-col gap-space-md">
              {selectedTourist.activeIncidentId && (
                <div
                  onClick={() => navigate(`/incidents/${selectedTourist.activeIncidentId}`)}
                  className="px-3 py-2 rounded-lg bg-secondary-container text-on-secondary-container flex flex-wrap items-center justify-between gap-2 shadow-sm cursor-pointer hover:opacity-95"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">e911_emergency</span>
                    <span className="font-headline-md text-headline-md font-bold tracking-wide uppercase">
                      Emergency Dispatch In Progress — {selectedTourist.activeIncidentId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-label-sm text-label-sm">
                    <span className="bg-secondary/20 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                      Assigned: Unit Alpha-12
                    </span>
                    <span className="bg-surface-container-lowest px-2 py-0.5 rounded text-secondary font-bold font-mono">
                      OPEN WORKSPACE →
                    </span>
                  </div>
                </div>
              )}

              {/* Subject Core Header Info */}
              <div className="flex flex-col sm:flex-row items-start gap-space-md">
                <div className="relative shrink-0">
                  <SafeImage
                    className="w-24 h-28 object-cover rounded-lg shadow-inner bg-surface-container-high"
                    alt={selectedTourist.name}
                    src={
                      selectedTourist.dtid === 'DTID-8F4K29'
                        ? STITCH_ASSETS.arjunDossierPortrait
                        : selectedTourist.avatarUrl
                    }
                  />
                  <div className="absolute -bottom-2 -right-2 px-1.5 py-0.5 rounded bg-primary text-on-primary font-label-sm text-[9px] font-bold uppercase shadow">
                    KYC OK
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-between w-full">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight">
                          {selectedTourist.name}
                        </h2>
                        <span className="font-label-md text-label-md font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {selectedTourist.dtid}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded bg-surface-container-high font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-primary">
                            verified_user
                          </span>
                          DigiLocker Token:{' '}
                          <strong className="font-mono text-on-surface">
                            {selectedTourist.identity.digilockerTokenMasked}
                          </strong>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-surface-container-high font-label-sm text-label-sm text-on-surface-variant">
                          Permit:{' '}
                          <strong className="font-mono text-on-surface">
                            {selectedTourist.identity.permitNumber}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Quick Tactical Actions */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          showToast(
                            `VoLTE Voice Bridge initiated to ${selectedTourist.name} (${selectedTourist.phone}).`,
                            'PRIMARY'
                          )
                        }
                        className="h-8 px-2.5 rounded bg-secondary-container hover:bg-secondary-container/80 text-on-secondary-container font-label-sm text-label-sm flex items-center gap-1 shadow-sm font-bold"
                      >
                        <span className="material-symbols-outlined text-[16px]">call</span>
                        <span>VoLTE Voice Bridge</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          showToast(
                            `Transponder ping transmitted to ${selectedTourist.dtid} via ${selectedTourist.device.btsTower}.`,
                            'SUCCESS'
                          )
                        }
                        className="h-8 px-2.5 rounded bg-primary hover:bg-primary-fixed-dim text-on-primary font-label-sm text-label-sm flex items-center gap-1 shadow-sm font-bold"
                      >
                        <span className="material-symbols-outlined text-[16px]">podcasts</span>
                        <span>Ping Transponder</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/live-map')}
                        className="h-8 w-8 rounded bg-surface-container-high hover:bg-surface-variant text-on-surface flex items-center justify-center transition-colors"
                        title="Live GIS Map Focus"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          travel_explore
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between flex-wrap gap-2 font-body-sm text-body-sm text-outline">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-tertiary">
                        terrain
                      </span>
                      <span>{selectedTourist.trip.itinerary.trailName}</span>
                    </span>
                    {selectedTourist.location.minutesAgo > 15 && (
                      <span className="font-label-sm text-label-sm text-tertiary font-mono">
                        Last known location received {selectedTourist.location.minutesAgo} minutes
                        ago.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Investigation Multi-Tabs */}
              <div className="flex items-center gap-2 pt-2 overflow-x-auto font-label-sm text-label-sm">
                {(
                  [
                    ['PROFILE', 'badge', 'Comprehensive Profile & Telemetry'],
                    ['ITINERARY', 'route', 'Itinerary & Check-Ins'],
                    [
                      'ANOMALIES',
                      'warning',
                      `Alerts & Incidents (${relatedAnomalies.length + relatedIncidents.length})`,
                    ],
                    ['CONTACTS', 'family_restroom', 'Emergency Kin & Contacts'],
                    ['AUDIT', 'security', 'Audit Access Log'],
                  ] as const
                ).map(([tabKey, icon, label]) => (
                  <button
                    key={tabKey}
                    type="button"
                    onClick={() => setActiveDossierTab(tabKey)}
                    className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                      activeDossierTab === tabKey
                        ? 'bg-primary text-on-primary font-bold shadow-sm'
                        : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content Grid: High-Density Structured Forensic Modules */}
            {activeDossierTab === 'PROFILE' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                {/* MODULE 1: Subject Identity & Authorization Dossier */}
                <div className="p-space-md rounded-xl bg-surface-container shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-space-sm mb-space-sm bg-surface-container-low px-space-sm py-1.5 rounded">
                      <span className="font-headline-md text-body-md text-on-surface font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-primary">
                          person_search
                        </span>
                        1. Identity &amp; Travel Clearance
                      </span>
                      <span className="font-label-sm text-[10px] text-outline font-mono">
                        SEC-14 ACT AUTHORIZED
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 text-body-sm font-body-sm">
                      <div>
                        <span className="font-label-sm text-[10px] text-outline uppercase block">
                          Nationality
                        </span>
                        <span className="text-on-surface font-medium">
                          {selectedTourist.identity.nationality}
                        </span>
                      </div>
                      <div>
                        <span className="font-label-sm text-[10px] text-outline uppercase block">
                          D.O.B &amp; Age
                        </span>
                        <span className="text-on-surface font-medium">
                          {selectedTourist.identity.dob} ({selectedTourist.identity.age} yrs)
                        </span>
                      </div>
                      <div>
                        <span className="font-label-sm text-[10px] text-outline uppercase block">
                          Blood Group
                        </span>
                        <span className="text-secondary font-mono font-bold">
                          {selectedTourist.identity.bloodGroup}
                        </span>
                      </div>
                      <div>
                        <span className="font-label-sm text-[10px] text-outline uppercase block">
                          Gender
                        </span>
                        <span className="text-on-surface font-medium">
                          {selectedTourist.identity.gender}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-label-sm text-[10px] text-outline uppercase block">
                          Registered Lodging Base
                        </span>
                        <span className="text-on-surface font-medium">
                          {selectedTourist.trip.lodgingBase}
                        </span>
                        <span className="font-label-sm text-[10px] text-outline block">
                          Checked in {selectedTourist.trip.startDate} • Next base:{' '}
                          {selectedTourist.trip.nextBase}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-label-sm text-[10px] text-outline uppercase block">
                          Tour Guide / Solo Status
                        </span>
                        <span className="text-on-surface font-medium">
                          {selectedTourist.trip.guideStatus}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-label-sm text-[10px] text-outline uppercase block">
                          Mandatory Travel Insurance
                        </span>
                        <div className="flex items-center justify-between bg-surface-container-low px-2 py-1 rounded mt-0.5">
                          <span className="text-primary font-mono text-label-sm font-semibold">
                            {selectedTourist.identity.insurancePolicyNumber}
                          </span>
                          <span className="font-label-sm text-[10px] text-primary bg-primary/10 px-1 rounded">
                            Medical Evac Covered
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 bg-surface-container-low/50 p-2 rounded flex items-center gap-1.5 font-label-sm text-[10px] text-outline">
                    <span className="material-symbols-outlined text-[14px] text-primary">
                      lock_clock
                    </span>
                    <span>
                      Authorized disclosure under Section 14 Tourist Safety Act. Access logged to
                      EOC Vault.
                    </span>
                  </div>
                </div>

                {/* MODULE 2: Live Device & Physical Sensor State */}
                {can('VIEW_LOCATION') ? (
                  <div className="p-space-md rounded-xl bg-surface-container shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-space-sm mb-space-sm bg-surface-container-low px-space-sm py-1.5 rounded">
                        <span className="font-headline-md text-body-md text-on-surface font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-tertiary">
                            sensors
                          </span>
                          2. Live Device &amp; Telemetry Feed
                        </span>
                        <span className="font-label-sm text-[10px] text-secondary font-mono animate-pulse">
                          STREAM ACTIVE
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 text-body-sm font-body-sm">
                        <div>
                          <span className="font-label-sm text-[10px] text-outline uppercase block">
                            Hardware Device
                          </span>
                          <span className="text-on-surface font-medium truncate block">
                            {selectedTourist.device.model}
                          </span>
                          <span className="font-label-sm text-[10px] text-outline font-mono">
                            {selectedTourist.device.appVersion}
                          </span>
                        </div>
                        <div>
                          <span className="font-label-sm text-[10px] text-outline uppercase block">
                            Battery Reserve
                          </span>
                          <div className="flex items-center gap-1 text-on-surface font-bold font-mono">
                            <span className="material-symbols-outlined text-[16px] text-tertiary">
                              battery_saver
                            </span>
                            <span>{selectedTourist.device.batteryPercent}%</span>
                            {selectedTourist.device.powerSaver && (
                              <span className="font-label-sm text-[10px] text-tertiary font-normal">
                                (Power Saver)
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="font-label-sm text-[10px] text-outline uppercase block">
                            Network Cell Mesh
                          </span>
                          <span className="text-secondary font-medium block">
                            {selectedTourist.device.networkStatus}
                          </span>
                          <span className="font-label-sm text-[10px] text-outline font-mono">
                            {selectedTourist.device.btsTower}
                          </span>
                        </div>
                        <div>
                          <span className="font-label-sm text-[10px] text-outline uppercase block">
                            Transponder BLE
                          </span>
                          <span className="text-primary font-mono font-bold block">
                            BEACON ACTIVE
                          </span>
                          <span className="font-label-sm text-[10px] text-outline">
                            TX Power: +4 dBm
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="font-label-sm text-[10px] text-outline uppercase block">
                            Biometric &amp; Motion Sensors
                          </span>
                          <div className="mt-1 grid grid-cols-2 gap-2 bg-surface-container-low p-2 rounded">
                            <div>
                              <span className="text-outline font-label-sm text-[10px] block">
                                Heart Rate
                              </span>
                              <span className="text-secondary font-mono font-bold text-label-lg">
                                {selectedTourist.device.heartRateBpm || 74} BPM
                              </span>
                              <span className="text-outline font-label-sm text-[9px] block">
                                {selectedTourist.device.heartRateNote || 'Normal baseline'}
                              </span>
                            </div>
                            <div>
                              <span className="text-outline font-label-sm text-[10px] block">
                                Motion / Impact
                              </span>
                              <span className="text-secondary font-mono font-bold text-label-md">
                                {selectedTourist.device.motionState}
                              </span>
                            </div>
                          </div>
                        </div>
                        {selectedTourist.device.panicTriggerNote && (
                          <div className="col-span-2">
                            <span className="font-label-sm text-[10px] text-outline uppercase block">
                              Panic Hardware Event
                            </span>
                            <span className="font-mono text-label-sm text-secondary font-bold">
                              {selectedTourist.device.panicTriggerNote}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between bg-surface-container-low/50 p-2 rounded">
                      <span className="font-label-sm text-[10px] text-outline font-mono">
                        GPS Ping: {selectedTourist.location.lat.toFixed(4)}° N,{' '}
                        {selectedTourist.location.lng.toFixed(4)}° E
                      </span>
                      <span className="font-label-sm text-[10px] text-primary font-mono">
                        ±{selectedTourist.location.accuracyMeters}m radius
                      </span>
                    </div>
                  </div>
                ) : (
                  <PermissionNotice
                    requiredPermission="VIEW_LOCATION"
                    contextLabel="Live GPS Coordinates & Device Sensor Telemetry"
                  />
                )}

                {/* MODULE 3: Active Trip Plan vs Actual Progress & Deviation Trail */}
                <div className="md:col-span-2 p-space-md rounded-xl bg-surface-container shadow-sm flex flex-col gap-space-md">
                  <div className="flex items-center justify-between pb-space-sm bg-surface-container-low px-space-sm py-1.5 rounded flex-wrap gap-2">
                    <span className="font-headline-md text-body-md text-on-surface font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        alt_route
                      </span>
                      3. Planned Itinerary vs. Actual Trajectory &amp; Gorge Offset
                    </span>
                    {selectedTourist.trip.itinerary.deviationKm > 0 ? (
                      <span className="font-label-sm text-label-sm bg-secondary-container/30 text-secondary font-mono font-bold px-2 py-0.5 rounded">
                        ROUTE DEVIATION: {selectedTourist.trip.itinerary.deviationKm} KM OFF-GRID
                      </span>
                    ) : (
                      <span className="font-label-sm text-label-sm bg-primary/15 text-primary font-mono font-bold px-2 py-0.5 rounded">
                        ON DESIGNATED TRAIL
                      </span>
                    )}
                  </div>

                  <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col gap-3">
                    <div className="flex items-center justify-between font-label-sm text-label-sm flex-wrap gap-2">
                      <span className="text-outline">
                        Trip Itinerary: {selectedTourist.trip.packageName} (Day{' '}
                        {selectedTourist.trip.currentDay} of {selectedTourist.trip.totalDays})
                      </span>
                      <span className="text-secondary font-mono font-bold">
                        Planned {selectedTourist.trip.itinerary.trailCode} Trail • Slope Hazard{' '}
                        {selectedTourist.trip.itinerary.slopeHazardDeg}°
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 relative">
                      {selectedTourist.trip.itinerary.waypoints.map((wp) => {
                        const isMissed = wp.status === 'MISSED';
                        const isSos = wp.status === 'ACTIVE_DISTRESS';
                        return (
                          <div
                            key={wp.id}
                            className="relative z-10 flex flex-col items-center text-center p-2 rounded bg-surface-container"
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-label-sm font-bold shadow ${
                                isSos
                                  ? 'bg-secondary-container text-on-secondary-container animate-bounce'
                                  : isMissed
                                  ? 'bg-surface-container-highest text-tertiary'
                                  : 'bg-primary text-on-primary'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {isSos ? 'emergency' : isMissed ? 'close' : 'check'}
                              </span>
                            </div>
                            <span className="font-label-sm text-label-sm text-on-surface font-bold mt-1.5">
                              {wp.name}
                            </span>
                            <span className="font-label-sm text-[10px] text-outline font-mono">
                              {wp.actualTime || wp.plannedTime}
                            </span>
                            <span
                              className={`font-label-sm text-[9px] font-bold uppercase ${
                                isSos
                                  ? 'text-secondary'
                                  : isMissed
                                  ? 'text-tertiary'
                                  : 'text-primary'
                              }`}
                            >
                              {wp.status.replace('_', ' ')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* MODULE 4: Verified Emergency Contacts */}
                <div className="p-space-md rounded-xl bg-surface-container shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-space-sm mb-space-sm bg-surface-container-low px-space-sm py-1.5 rounded">
                      <span className="font-headline-md text-body-md text-on-surface font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-primary">
                          contacts
                        </span>
                        4. Verified Emergency Kin Contacts
                      </span>
                      <span className="font-label-sm text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono">
                        VERIFIED
                      </span>
                    </div>

                    {can('VIEW_EMERGENCY_CONTACT') ? (
                      <div className="space-y-3">
                        {selectedTourist.emergencyContacts.map((kin) => (
                          <div
                            key={kin.id}
                            className="p-2.5 rounded bg-surface-container-low flex flex-col gap-1.5"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-headline-md text-body-md text-on-surface font-bold">
                                    {kin.name}
                                  </span>
                                  <span className="font-label-sm text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase font-bold">
                                    {kin.relation}
                                  </span>
                                </div>
                                <span className="font-mono text-label-sm text-outline">
                                  {kin.phone} • {kin.city}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  showToast(
                                    `Direct voice/SMS bridge connected to ${kin.name} (${kin.phone}).`,
                                    'PRIMARY'
                                  )
                                }
                                className="px-2 py-1 rounded bg-secondary-container hover:bg-secondary-container/80 text-on-secondary-container font-label-sm text-label-sm flex items-center gap-1 font-bold shadow-sm"
                              >
                                <span className="material-symbols-outlined text-[14px]">
                                  phone_in_talk
                                </span>
                                <span>Direct Bridge</span>
                              </button>
                            </div>
                            {kin.lastNotifiedAt && (
                              <div className="mt-1 flex items-center gap-1.5 text-primary font-body-sm text-[11px] bg-primary/5 px-2 py-1 rounded">
                                <span className="material-symbols-outlined text-[14px] shrink-0">
                                  check_circle
                                </span>
                                <span>
                                  Notified via EOC Automated SMS &amp; VoLTE Bridge at{' '}
                                  {kin.lastNotifiedAt}.
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <PermissionNotice
                        requiredPermission="VIEW_EMERGENCY_CONTACT"
                        contextLabel="Emergency Contact Phone Numbers & Kin Records"
                      />
                    )}
                  </div>
                </div>

                {/* MODULE 5: Chain of Custody & Profile Audit Trail */}
                <div className="p-space-md rounded-xl bg-surface-container shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-space-sm mb-space-sm bg-surface-container-low px-space-sm py-1.5 rounded">
                      <span className="font-headline-md text-body-md text-on-surface font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-outline">
                          verified
                        </span>
                        5. Chain of Custody &amp; Profile Audit Trail
                      </span>
                      <span className="font-label-sm text-[10px] text-outline font-mono">
                        EOC-LEGAL-IMMUTABLE
                      </span>
                    </div>
                    <div className="space-y-2 font-mono text-label-sm">
                      {auditLogs.slice(0, 4).map((log) => (
                        <div
                          key={log.id}
                          className="p-2 rounded bg-surface-container-low flex items-start gap-2"
                        >
                          <span className="text-primary font-bold shrink-0">
                            {log.timestamp.replace(' IST', '')}
                          </span>
                          <div className="flex flex-col">
                            <span className="text-on-surface font-semibold">
                              {log.officerName} ({log.officerBadge})
                            </span>
                            <span className="text-outline text-[11px]">{log.action}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between bg-surface-container-low/50 p-2 rounded text-outline font-label-sm text-[10px]">
                    <span>Hash: SHA256: 8f4a...91ce</span>
                    <span className="text-primary font-mono font-bold">DIGITALLY SIGNED</span>
                  </div>
                </div>
              </div>
            )}

            {/* ITINERARY & CHECK-INS TAB */}
            {activeDossierTab === 'ITINERARY' && (
              <div className="bg-surface-container rounded-xl p-space-lg space-y-4">
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface uppercase">
                  Check-In History &amp;Location Breadcrumbs ({selectedTourist.name})
                </h3>
                <div className="space-y-2">
                  {relatedCheckIns.map((chk) => (
                    <div
                      key={chk.id}
                      className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-semibold text-on-surface block">
                          {chk.waypointName}
                        </span>
                        <span className="font-mono text-label-sm text-outline">
                          Scheduled: {chk.scheduledTime} • {chk.notes}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-surface-container-high font-mono font-label-sm text-primary font-bold">
                        {chk.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ANOMALIES & INCIDENTS TAB */}
            {activeDossierTab === 'ANOMALIES' && (
              <div className="bg-surface-container rounded-xl p-space-lg space-y-4">
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface uppercase">
                  Related Incidents &amp; Heuristic Anomalies
                </h3>
                {relatedIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    onClick={() => navigate(`/incidents/${inc.id}`)}
                    className="p-3 rounded-lg bg-surface-container-low hover:bg-surface-container-high cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono font-bold text-secondary">{inc.id}</span>
                      <span className="text-on-surface font-semibold ml-2">{inc.title}</span>
                      <p className="text-outline text-body-sm mt-0.5">{inc.triggerDescription}</p>
                    </div>
                    <span className="text-primary font-label-sm font-bold">Open →</span>
                  </div>
                ))}
                {relatedAnomalies.map((anom) => (
                  <div
                    key={anom.id}
                    className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono font-bold text-tertiary">{anom.id}</span>
                      <span className="text-on-surface font-semibold ml-2">
                        {anom.type.replace('_', ' ')} (Confidence: {anom.confidencePercent}%)
                      </span>
                      <p className="text-outline text-body-sm mt-0.5">{anom.diagnosticNote}</p>
                    </div>
                    <span className="font-mono text-label-sm text-outline">
                      Score: {anom.heuristicScore}/100
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* CONTACTS TAB */}
            {activeDossierTab === 'CONTACTS' && (
              <div className="bg-surface-container rounded-xl p-space-lg space-y-4">
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface uppercase">
                  Authorized Emergency Contacts
                </h3>
                {can('VIEW_EMERGENCY_CONTACT') ? (
                  selectedTourist.emergencyContacts.map((ec) => (
                    <div
                      key={ec.id}
                      className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-on-surface">{ec.name}</span>
                        <span className="text-outline ml-2">({ec.relation})</span>
                        <div className="font-mono text-primary text-label-md mt-0.5">
                          {ec.phone} • {ec.city}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          showToast(`Calling ${ec.name} (${ec.phone})...`, 'PRIMARY')
                        }
                        className="px-3 py-1.5 rounded bg-primary-container text-on-primary-container font-label-sm font-bold"
                      >
                        Call Kin
                      </button>
                    </div>
                  ))
                ) : (
                  <PermissionNotice requiredPermission="VIEW_EMERGENCY_CONTACT" />
                )}
              </div>
            )}

            {/* AUDIT TAB */}
            {activeDossierTab === 'AUDIT' && (
              <div className="bg-surface-container rounded-xl p-space-lg space-y-3">
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface uppercase">
                  Subject Access Audit Log
                </h3>
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded bg-surface-container-low flex items-center justify-between font-mono text-label-sm"
                  >
                    <div>
                      <span className="text-primary font-bold">{log.officerName}</span> —{' '}
                      <span className="text-on-surface">{log.action}</span>
                    </div>
                    <span className="text-outline">{log.timestamp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
