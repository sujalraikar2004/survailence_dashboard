import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../app/providers/AuthContext';
import { useOperational } from '../app/providers/OperationalContext';
import { Drawer, EmptyState, Modal } from '../components/ui/CommonUi';
import { ResponseUnit, ResponseUnitStatus } from '../types';

export const ResponseTeamsPage: React.FC = () => {
  const { unitId } = useParams<{ unitId?: string }>();
  const { can } = useAuth();
  const {
    responseUnits,
    incidents,
    assignResponseUnit,
    updateUnitStatus,
    showToast,
  } = useOperational();
  const navigate = useNavigate();

  const [jurisdictionFilter, setJurisdictionFilter] = useState<string>('ALL');
  const [unitTypeFilter, setUnitTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [assignModalUnit, setAssignModalUnit] = useState<ResponseUnit | null>(null);
  const [selectedIncidentForUnit, setSelectedIncidentForUnit] = useState<string>(
    incidents.find((i) => i.status !== 'RESOLVED' && i.status !== 'UNFOUNDED')?.id ||
      'INC-2026-0891'
  );
  const [dispatchOpenModal, setDispatchOpenModal] = useState(false);

  const selectedUnit = useMemo(
    () =>
      unitId
        ? responseUnits.find(
            (u) =>
              u.id.toLowerCase() === unitId.toLowerCase() ||
              u.code.toLowerCase() === unitId.toLowerCase()
          ) || null
        : null,
    [responseUnits, unitId]
  );

  const filteredUnits = useMemo(() => {
    return responseUnits.filter((u) => {
      if (jurisdictionFilter !== 'ALL' && u.sector !== jurisdictionFilter) return false;
      if (unitTypeFilter !== 'ALL' && !u.vehicleType.toLowerCase().includes(unitTypeFilter.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.code.toLowerCase().includes(q) ||
        u.leadOfficer.toLowerCase().includes(q) ||
        u.sector.toLowerCase().includes(q) ||
        u.registrationNo.toLowerCase().includes(q)
      );
    });
  }, [responseUnits, jurisdictionFilter, unitTypeFilter, statusFilter, searchQuery]);

  const unitsByJurisdiction = useMemo(() => {
    const groups: Record<string, ResponseUnit[]> = {};
    filteredUnits.forEach((u) => {
      if (!groups[u.sector]) {
        groups[u.sector] = [];
      }
      groups[u.sector].push(u);
    });
    return groups;
  }, [filteredUnits]);

  const counts = useMemo(() => {
    const total = responseUnits.length;
    const available = responseUnits.filter((u) => u.status === 'AVAILABLE').length;
    const enRoute = responseUnits.filter((u) => u.status === 'EN_ROUTE').length;
    const onScene = responseUnits.filter(
      (u) => u.status === 'ON_SCENE' || u.status === 'BUSY'
    ).length;
    const offline = responseUnits.filter((u) => u.status === 'OFFLINE').length;
    return { total, available, enRoute, onScene, offline };
  }, [responseUnits]);

  const renderStatusPill = (status: ResponseUnitStatus) => {
    if (status === 'ON_SCENE') {
      return (
        <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping"></span>
          ON SCENE
        </span>
      );
    }
    if (status === 'EN_ROUTE') {
      return (
        <span className="px-2 py-0.5 rounded bg-tertiary-container/30 text-tertiary font-label-sm text-label-sm font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
          EN ROUTE
        </span>
      );
    }
    if (status === 'AVAILABLE') {
      return (
        <span className="px-2 py-0.5 rounded bg-primary-container/30 text-primary font-label-sm text-label-sm font-bold">
          AVAILABLE
        </span>
      );
    }
    if (status === 'OFFLINE') {
      return (
        <span className="px-2 py-0.5 rounded bg-surface-container-highest text-outline font-label-sm text-label-sm font-bold">
          OFFLINE
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded bg-tertiary-container/20 text-tertiary font-label-sm text-label-sm font-bold">
        BUSY
      </span>
    );
  };

  return (
    <div className="p-space-lg space-y-space-lg">
      {/* Top Operational Header & Action Cluster */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-2 text-outline font-label-sm text-label-sm mb-1">
            <span>OPERATIONS COMMAND</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="text-primary">FIELD DISPATCH &amp; FLEET ROSTER</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
            Response Teams &amp; Field Unit Operations
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Real-time TETRA telemetry, GPS patrol tracking, and multi-agency deployment across
            Meghalaya Tourist Sectors
          </p>
        </div>

        {/* Tactical Command Actions */}
        <div className="flex flex-wrap items-center gap-space-sm">
          <button
            type="button"
            onClick={() =>
              showToast('All-Units Emergency Broadcast transmitted on TETRA CH-01.', 'WARNING')
            }
            className="h-9 px-space-md rounded bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-md text-label-md flex items-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] text-tertiary">
              cell_tower
            </span>
            <span>All-Units Broadcast</span>
          </button>
          <button
            type="button"
            onClick={() =>
              showToast('Roster shift handover audit snapshot recorded.', 'PRIMARY')
            }
            className="h-9 px-space-md rounded bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-md text-label-md flex items-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">sync_alt</span>
            <span>Shift Handover Log</span>
          </button>
          {can('ASSIGN_RESPONSE_UNIT') && (
            <button
              type="button"
              onClick={() => setDispatchOpenModal(true)}
              className="h-9 px-space-md rounded bg-primary-container hover:opacity-90 text-on-primary-container font-label-md text-label-md font-bold flex items-center gap-2 shadow-lg transition-opacity"
            >
              <span className="material-symbols-outlined text-[18px]">send_time_extension</span>
              <span>Dispatch Available Unit</span>
            </button>
          )}
        </div>
      </div>

      {/* Fleet Readiness KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-space-md">
        <div className="bg-surface-container p-space-md rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-outline">TOTAL FIELD UNITS</span>
            <span className="material-symbols-outlined text-primary text-[18px]">shield_person</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-label-lg text-label-lg text-on-surface font-mono">
              28 / {counts.total} Shown
            </span>
            <span className="font-label-sm text-label-sm text-primary">3 Sectors</span>
          </div>
        </div>

        <div className="bg-surface-container p-space-md rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-outline">AVAILABLE / READY</span>
            <span className="w-2 h-2 rounded-full bg-primary"></span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-label-lg text-label-lg text-primary font-mono">
              14 ({counts.available} Roster)
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              50% Standby
            </span>
          </div>
        </div>

        <div className="bg-surface-container p-space-md rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-outline">EN ROUTE (DISPATCHED)</span>
            <span className="w-2 h-2 rounded-full bg-tertiary animate-ping"></span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-label-lg text-label-lg text-tertiary font-mono">
              6 ({counts.enRoute} Active)
            </span>
            <span className="font-label-sm text-label-sm text-tertiary">Avg ETA 6.4m</span>
          </div>
        </div>

        <div className="bg-surface-container p-space-md rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-outline">ON SCENE / ENGAGED</span>
            <span className="w-2 h-2 rounded-full bg-secondary"></span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-label-lg text-label-lg text-secondary font-mono">
              5 ({counts.onScene} Tactical)
            </span>
            <span className="font-label-sm text-label-sm text-secondary">2 Critical SOS</span>
          </div>
        </div>

        <div className="bg-surface-container p-space-md rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-outline">OFFLINE / SHIFT BREAK</span>
            <span className="w-2 h-2 rounded-full bg-outline"></span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-label-lg text-label-lg text-on-surface-variant font-mono">
              3 ({counts.offline} Shown)
            </span>
            <span className="font-label-sm text-label-sm text-outline">1 Loss of Signal</span>
          </div>
        </div>

        <div className="bg-surface-container p-space-md rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-outline">MEAN DISPATCH SLA</span>
            <span className="material-symbols-outlined text-primary text-[18px]">speed</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-label-lg text-label-lg text-on-surface font-mono">04m 18s</span>
            <span className="font-label-sm text-label-sm text-primary">-12% vs Target</span>
          </div>
        </div>
      </div>

      {/* Filter & Jurisdiction Control Bar */}
      <div className="bg-surface-container-low p-space-md rounded-lg flex flex-wrap items-center justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-space-sm">
          <span className="font-label-sm text-label-sm text-outline mr-1">JURISDICTION:</span>
          {[
            ['ALL', 'All Sectors (28)'],
            ['East Khasi Hills District', 'East Khasi Hills'],
            ['Mawryngkneng Forest Zone', 'Mawryngkneng Forest'],
            ['Police Bazaar & Cherrapunji', 'Cherrapunji / Police Bazaar'],
          ].map(([jKey, label]) => (
            <button
              key={jKey}
              type="button"
              onClick={() => setJurisdictionFilter(jKey)}
              className={`px-3 py-1.5 rounded font-label-sm text-label-sm transition-colors ${
                jurisdictionFilter === jKey
                  ? 'bg-primary-container text-on-primary-container font-bold'
                  : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-space-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search unit callsign, officer, plate..."
            className="h-8 px-3 rounded bg-surface-container-high text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <select
            value={unitTypeFilter}
            onChange={(e) => setUnitTypeFilter(e.target.value)}
            className="h-8 px-2.5 rounded bg-surface-container-high text-on-surface font-label-sm text-label-sm focus:outline-none"
          >
            <option value="ALL">UNIT TYPE: ALL</option>
            <option value="Interceptor">Police Interceptor</option>
            <option value="Beat">Tourist Police Beat</option>
            <option value="Ambulance">108 Trauma Ambulance</option>
            <option value="SDRF">Forest SAR / SDRF</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2.5 rounded bg-surface-container-high text-on-surface font-label-sm text-label-sm focus:outline-none"
          >
            <option value="ALL">STATUS: ALL</option>
            <option value="AVAILABLE">Available</option>
            <option value="EN_ROUTE">En Route</option>
            <option value="ON_SCENE">On Scene</option>
            <option value="OFFLINE">Offline</option>
          </select>
        </div>
      </div>

      {/* Main Split Workspace: Unit Cards by Jurisdiction (8 Cols) + Active Dispatch Panel (4 Cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
        {/* LEFT 8 COLUMNS: Unit Cards by Jurisdiction */}
        <div className="xl:col-span-8 space-y-space-lg">
          {filteredUnits.length === 0 ? (
            <EmptyState
              icon="local_police"
              title="No Field Units Match Filters"
              description="Reset jurisdiction or status filters to view all active patrol teams."
              actionLabel="Reset Filters"
              onAction={() => {
                setJurisdictionFilter('ALL');
                setUnitTypeFilter('ALL');
                setStatusFilter('ALL');
                setSearchQuery('');
              }}
            />
          ) : (
            (Object.entries(unitsByJurisdiction) as [string, ResponseUnit[]][]).map(
              ([jurisdiction, units]) => {
                if (units.length === 0) return null;
                return (
                  <div key={jurisdiction} className="space-y-space-md">
                    <div className="flex items-center justify-between bg-surface-container-low px-space-md py-2.5 rounded-lg">
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-primary text-[20px]">
                          {jurisdiction.includes('Forest')
                            ? 'forest'
                            : jurisdiction.includes('Bazaar')
                            ? 'Temple_buddhist'
                            : 'landscape'}
                        </span>
                        <h2 className="font-headline-md text-headline-md text-on-surface">
                          Sector: {jurisdiction}
                        </h2>
                        <span className="px-2 py-0.5 rounded bg-surface-container-highest font-label-sm text-label-sm text-on-surface-variant font-mono">
                          {units.length} UNITS
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-label-sm text-label-sm">
                        <span className="text-primary">TETRA MESH SYNCED</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                      {units.map((unit) => {
                        const isCritical = unit.status === 'ON_SCENE';
                        const isEnRoute = unit.status === 'EN_ROUTE';
                        const isOffline = unit.status === 'OFFLINE';

                        return (
                          <div
                            key={unit.id}
                            onClick={() => navigate(`/response-teams/${unit.id}`)}
                            className={`bg-surface-container rounded-lg p-space-md flex flex-col justify-between relative overflow-hidden cursor-pointer hover:bg-surface-container-high/80 transition-colors ${
                              isOffline ? 'opacity-80' : ''
                            }`}
                          >
                            <div
                              className={`absolute left-0 top-0 bottom-0 w-1 ${
                                isCritical
                                  ? 'bg-secondary'
                                  : isEnRoute
                                  ? 'bg-tertiary'
                                  : isOffline
                                  ? 'bg-outline'
                                  : 'bg-primary'
                              }`}
                            />
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-headline-md text-headline-md text-on-surface">
                                      {unit.name}
                                    </span>
                                    <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant">
                                      {unit.specialty}
                                    </span>
                                  </div>
                                  <p className="font-body-sm text-body-sm text-outline mt-0.5">
                                    {unit.leadOfficer} • {unit.personnelCount} Crew •{' '}
                                    {unit.vehicleType} ({unit.registrationNo})
                                  </p>
                                </div>
                                {renderStatusPill(unit.status)}
                              </div>

                              {unit.currentIncidentId ? (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/incidents/${unit.currentIncidentId}`);
                                  }}
                                  className={`mt-3 p-2.5 rounded ${
                                    isCritical
                                      ? 'bg-secondary-container/20'
                                      : 'bg-tertiary-container/15'
                                  }`}
                                >
                                  <div className="flex items-center justify-between font-label-sm text-label-sm">
                                    <span
                                      className={
                                        isCritical
                                          ? 'text-secondary font-bold'
                                          : 'text-tertiary font-bold'
                                      }
                                    >
                                      ASSIGNED: #{unit.currentIncidentId}
                                    </span>
                                    <span className="text-on-surface font-mono">
                                      {unit.etaText} ({unit.distanceKm} km)
                                    </span>
                                  </div>
                                  <p className="font-body-sm text-body-sm text-on-surface mt-1">
                                    {unit.statusBadgeText} • {unit.locationName}
                                  </p>
                                </div>
                              ) : (
                                <div className="mt-3 p-2.5 rounded bg-surface-container-low">
                                  <div className="flex items-center justify-between font-label-sm text-label-sm">
                                    <span className="text-primary">PATROL SECTOR ASSIGNMENT</span>
                                    <span className="text-outline font-mono">
                                      {unit.statusBadgeText}
                                    </span>
                                  </div>
                                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                                    {unit.locationName}
                                  </p>
                                </div>
                              )}

                              {/* Telemetry Grid */}
                              <div className="mt-3 grid grid-cols-3 gap-2 pt-2 border-t border-outline-variant/20 font-label-sm text-label-sm">
                                <div>
                                  <span className="text-outline block">TETRA RADIO</span>
                                  <span className="text-on-surface font-mono">
                                    {unit.radioChannel}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-outline block">SPEED / FUEL</span>
                                  <span className="text-primary font-mono">
                                    {unit.speedKmh} km/h • {unit.fuelPercent}%
                                  </span>
                                </div>
                                <div>
                                  <span className="text-outline block">EQUIPMENT</span>
                                  <span className="text-on-surface truncate block">
                                    {unit.equipment.join(', ')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div
                              className="mt-4 flex items-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  showToast(
                                    `Opened encrypted TETRA audio channel (${unit.radioChannel}) with ${unit.leadOfficer}.`,
                                    'PRIMARY'
                                  )
                                }
                                className="flex-1 h-8 rounded bg-surface-container-highest hover:bg-surface-bright text-on-surface font-label-sm text-label-sm flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[15px]">mic</span>
                                <span>Radio Hail</span>
                              </button>
                              {unit.status === 'AVAILABLE' && can('ASSIGN_RESPONSE_UNIT') ? (
                                <button
                                  type="button"
                                  onClick={() => setAssignModalUnit(unit)}
                                  className="flex-1 h-8 rounded bg-primary-container hover:opacity-90 text-on-primary-container font-label-sm text-label-sm font-bold flex items-center justify-center gap-1.5 transition-opacity"
                                >
                                  <span className="material-symbols-outlined text-[15px]">
                                    assignment_add
                                  </span>
                                  <span>Assign Incident</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => navigate('/live-map')}
                                  className="flex-1 h-8 rounded bg-surface-container-highest hover:bg-surface-bright text-primary font-label-sm text-label-sm flex items-center justify-center gap-1.5 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[15px]">
                                    my_location
                                  </span>
                                  <span>Track on Map</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
            )
          )}
        </div>

        {/* RIGHT 4 COLUMNS: Active Dispatch Matrix & Proximity Calculator */}
        <div className="xl:col-span-4 space-y-space-lg">
          {/* Active Incident Dispatch Matrix */}
          <div className="bg-surface-container rounded-lg p-space-md space-y-space-md">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-label-sm text-label-sm text-primary block">
                  LIVE COMMAND MATRIX
                </span>
                <h3 className="font-headline-md text-headline-md text-on-surface">
                  Active Incident Assignments
                </h3>
              </div>
              <span className="px-2 py-1 rounded bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">
                {incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'UNFOUNDED').length}{' '}
                ACTIVE
              </span>
            </div>

            {incidents
              .filter((inc) => inc.status !== 'RESOLVED' && inc.status !== 'UNFOUNDED')
              .slice(0, 3)
              .map((inc) => {
                const assignedUnits = responseUnits.filter(
                  (u) => u.currentIncidentId === inc.id || u.id === inc.assignedUnitId
                );
                return (
                  <div
                    key={inc.id}
                    className="bg-surface-container-low rounded-lg p-space-md space-y-3 relative overflow-hidden"
                  >
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 ${
                        inc.severity === 'CRITICAL' ? 'bg-secondary' : 'bg-tertiary'
                      }`}
                    />
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/incidents/${inc.id}`}
                            className={`font-label-md text-label-md font-mono hover:underline ${
                              inc.severity === 'CRITICAL' ? 'text-secondary' : 'text-tertiary'
                            }`}
                          >
                            #{inc.id}
                          </Link>
                          <span
                            className={`px-1.5 py-0.5 rounded font-label-sm text-label-sm font-bold ${
                              inc.severity === 'CRITICAL'
                                ? 'bg-secondary-container text-on-secondary-container'
                                : 'bg-tertiary-container/30 text-tertiary'
                            }`}
                          >
                            {inc.severity}
                          </span>
                        </div>
                        <h4 className="font-headline-md text-headline-md text-on-surface mt-1">
                          {inc.touristName} ({inc.dtid})
                        </h4>
                        <p className="font-body-sm text-body-sm text-outline">
                          {inc.location.name} ({inc.location.sector})
                        </p>
                      </div>
                      <span className="font-label-sm text-label-sm text-outline font-mono">
                        {inc.elapsedTimeText}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-outline-variant/20">
                      <span className="font-label-sm text-label-sm text-outline block">
                        ASSIGNED RESPONSE TEAMS ({assignedUnits.length}):
                      </span>
                      {assignedUnits.length === 0 ? (
                        <div className="flex items-center justify-between bg-surface-container p-2 rounded font-label-sm text-label-sm">
                          <span className="text-tertiary">Unassigned — Awaiting Dispatch</span>
                          {can('ASSIGN_RESPONSE_UNIT') && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedIncidentForUnit(inc.id);
                                setDispatchOpenModal(true);
                              }}
                              className="text-primary font-bold hover:underline"
                            >
                              + Assign Unit
                            </button>
                          )}
                        </div>
                      ) : (
                        assignedUnits.map((u) => (
                          <div
                            key={u.id}
                            className="flex items-center justify-between bg-surface-container p-2 rounded font-label-sm text-label-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  u.status === 'ON_SCENE' ? 'bg-secondary' : 'bg-tertiary'
                                }`}
                              />
                              <span className="text-on-surface font-semibold">{u.name}</span>
                              <span className="text-outline">({u.specialty})</span>
                            </div>
                            <span
                              className={`font-mono ${
                                u.status === 'ON_SCENE' ? 'text-secondary' : 'text-tertiary'
                              }`}
                            >
                              {u.status === 'ON_SCENE' ? 'ON SCENE' : u.etaText}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Nearest Available Unit Recommendation Engine */}
          <div className="bg-surface-container rounded-lg p-space-md space-y-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">radar</span>
                <h3 className="font-headline-md text-headline-md text-on-surface">
                  Nearest Unit Recommender
                </h3>
              </div>
              <span className="font-label-sm text-label-sm text-outline font-mono">
                GIS ROUTING
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Calculated road &amp; trail ETA to highest unserved anomaly:{' '}
              <strong className="text-on-surface">Nohkalikai Upper Falls (#INC-2026-0884)</strong>
            </p>
            <div className="space-y-2">
              {responseUnits
                .filter((u) => u.status === 'AVAILABLE')
                .slice(0, 3)
                .map((u, idx) => (
                  <div
                    key={u.id}
                    className={`p-3 rounded-lg bg-surface-container-low flex items-center justify-between ${
                      idx === 0 ? 'border-l-2 border-primary' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-headline-md text-headline-md text-on-surface">
                          {idx + 1}. {u.name}
                        </span>
                        {idx === 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-primary-container/30 text-primary font-label-sm text-label-sm font-bold">
                            BEST MATCH
                          </span>
                        )}
                      </div>
                      <span className="font-body-sm text-body-sm text-outline block mt-0.5">
                        {u.leadOfficer} • {u.locationName}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-label-md text-label-md text-primary font-mono block font-bold">
                        {u.etaText}
                      </span>
                      {can('ASSIGN_RESPONSE_UNIT') && (
                        <button
                          type="button"
                          onClick={() => {
                            assignResponseUnit('INC-2026-0884', u.id);
                          }}
                          className="mt-1 px-2.5 py-1 rounded bg-primary-container text-on-primary-container font-label-sm text-label-sm font-bold"
                        >
                          Dispatch
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Unit Detail Drawer when /response-teams/:unitId is active */}
      <Drawer
        open={Boolean(selectedUnit)}
        onClose={() => navigate('/response-teams')}
        title={selectedUnit ? `${selectedUnit.name} — Field Dossier` : 'Response Unit'}
        subtitle={
          selectedUnit
            ? `${selectedUnit.leadOfficer} • ${selectedUnit.sector} • ${selectedUnit.registrationNo}`
            : ''
        }
      >
        {selectedUnit && (
          <div className="space-y-4">
            <div className="bg-surface-container p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">
                    {selectedUnit.vehicleIcon || 'local_police'}
                  </span>
                </div>
                <div>
                  <div className="font-headline-md text-on-surface font-bold">
                    {selectedUnit.leadOfficer}
                  </div>
                  <div className="font-label-sm text-outline font-mono">
                    {selectedUnit.radioChannel} • Shift: {selectedUnit.shiftHours}
                  </div>
                </div>
              </div>
              {renderStatusPill(selectedUnit.status)}
            </div>

            <div className="bg-surface-container p-4 rounded-xl space-y-2">
              <span className="font-label-sm text-outline uppercase block">
                Update Field Unit Operational Status
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(
                  [
                    'AVAILABLE',
                    'EN_ROUTE',
                    'ON_SCENE',
                    'BUSY',
                    'OFFLINE',
                  ] as ResponseUnitStatus[]
                ).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => updateUnitStatus(selectedUnit.id, st)}
                    className={`py-2 px-3 rounded font-label-sm text-label-sm font-bold transition-colors ${
                      selectedUnit.status === st
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-surface-container p-4 rounded-xl space-y-2 font-body-sm">
              <div className="flex justify-between">
                <span className="text-outline">Vehicle &amp; Callsign:</span>
                <span className="text-on-surface font-mono">
                  {selectedUnit.vehicleType} ({selectedUnit.registrationNo})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Current Sector Location:</span>
                <span className="text-on-surface">{selectedUnit.locationName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Equipment Manifest:</span>
                <span className="text-on-surface">{selectedUnit.equipment.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Active Assignment:</span>
                <span className="text-primary font-mono">
                  {selectedUnit.currentIncidentId || 'None — Available for Dispatch'}
                </span>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Assign Specific Unit to Incident Modal */}
      <Modal
        open={Boolean(assignModalUnit)}
        onClose={() => setAssignModalUnit(null)}
        title={assignModalUnit ? `Dispatch ${assignModalUnit.name}` : 'Dispatch Unit'}
        subtitle="Select active incident for immediate field deployment"
        icon="local_police"
      >
        {assignModalUnit && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="font-label-sm text-label-sm text-outline uppercase block">
                Target Active Incident
              </label>
              <select
                value={selectedIncidentForUnit}
                onChange={(e) => setSelectedIncidentForUnit(e.target.value)}
                className="w-full h-10 px-3 rounded bg-surface-container text-on-surface font-body-sm"
              >
                {incidents
                  .filter((i) => i.status !== 'RESOLVED' && i.status !== 'UNFOUNDED')
                  .map((inc) => (
                    <option key={inc.id} value={inc.id}>
                      #{inc.id} — {inc.touristName} ({inc.title})
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignModalUnit(null)}
                className="px-4 py-2 rounded bg-surface-container-high text-on-surface font-label-md text-label-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  assignResponseUnit(selectedIncidentForUnit, assignModalUnit.id);
                  setAssignModalUnit(null);
                }}
                className="px-4 py-2 rounded bg-primary-container text-on-primary-container font-label-md text-label-md font-bold"
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* General Dispatch Available Unit Modal */}
      <Modal
        open={dispatchOpenModal}
        onClose={() => setDispatchOpenModal(false)}
        title="Dispatch Available Field Unit"
        subtitle="Assign any standby patrol or trauma team to an active incident"
        icon="send_time_extension"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-label-sm text-label-sm text-outline uppercase block">
              Select Incident
            </label>
            <select
              value={selectedIncidentForUnit}
              onChange={(e) => setSelectedIncidentForUnit(e.target.value)}
              className="w-full h-10 px-3 rounded bg-surface-container text-on-surface font-body-sm"
            >
              {incidents
                .filter((i) => i.status !== 'RESOLVED' && i.status !== 'UNFOUNDED')
                .map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    #{inc.id} — {inc.touristName} ({inc.severity})
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-2">
            <span className="font-label-sm text-label-sm text-outline uppercase block">
              Available Standby Units
            </span>
            {responseUnits
              .filter((u) => u.status === 'AVAILABLE')
              .map((u) => (
                <div
                  key={u.id}
                  className="p-3 rounded bg-surface-container flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-on-surface">{u.name}</div>
                    <div className="text-xs text-outline">
                      {u.leadOfficer} • {u.locationName}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      assignResponseUnit(selectedIncidentForUnit, u.id);
                      setDispatchOpenModal(false);
                    }}
                    className="px-3 py-1.5 rounded bg-primary-container text-on-primary-container font-label-sm text-label-sm font-bold"
                  >
                    Dispatch Now
                  </button>
                </div>
              ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};
