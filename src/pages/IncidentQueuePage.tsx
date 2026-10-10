import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../app/providers/AuthContext';
import { useOperational } from '../app/providers/OperationalContext';
import {
  AssignUnitModal,
  ResolveIncidentModal,
  VerifyIncidentModal,
} from '../components/incidents/IncidentModals';
import {
  EmptyState,
  SafeImage,
  SeverityBadge,
  StatusBadge,
} from '../components/ui/CommonUi';
import { Incident, IncidentSeverity } from '../types';

export const IncidentQueuePage: React.FC<{ mode: 'QUEUE' | 'ACTIVE' | 'HISTORY' }> = ({
  mode,
}) => {
  const { can } = useAuth();
  const { incidents, acknowledgeIncident } = useOperational();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | IncidentSeverity>('ALL');
  const [sortBy, setSortBy] = useState<'PRIORITY' | 'RECENT' | 'ID'>('PRIORITY');
  const [assignModalIncident, setAssignModalIncident] = useState<Incident | null>(null);
  const [verifyModalIncident, setVerifyModalIncident] = useState<Incident | null>(null);
  const [resolveModalIncident, setResolveModalIncident] = useState<Incident | null>(null);

  const filteredIncidents = useMemo(() => {
    const priorityRank: Record<IncidentSeverity, number> = {
      CRITICAL: 1,
      HIGH: 2,
      CONCERN: 3,
      VERIFICATION: 4,
      WARNING: 5,
      NORMAL: 6,
    };

    return incidents
      .filter((inc) => {
        if (mode === 'HISTORY') {
          return inc.status === 'RESOLVED' || inc.status === 'UNFOUNDED';
        }
        return inc.status !== 'RESOLVED' && inc.status !== 'UNFOUNDED';
      })
      .filter((inc) => (severityFilter === 'ALL' ? true : inc.severity === severityFilter))
      .filter((inc) => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;
        return (
          inc.id.toLowerCase().includes(q) ||
          inc.touristName.toLowerCase().includes(q) ||
          inc.dtid.toLowerCase().includes(q) ||
          inc.location.name.toLowerCase().includes(q) ||
          inc.type.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'PRIORITY') {
          return priorityRank[a.severity] - priorityRank[b.severity];
        }
        if (sortBy === 'ID') {
          return b.id.localeCompare(a.id);
        }
        return b.lastUpdatedAt.localeCompare(a.lastUpdatedAt);
      });
  }, [incidents, mode, severityFilter, searchQuery, sortBy]);

  return (
    <div className="p-space-lg space-y-space-lg">
      {/* Header */}
      <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-md flex flex-col gap-space-md">
        <div className="flex flex-wrap items-center justify-between gap-space-md">
          <div>
            <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-outline uppercase tracking-wider">
              <span>OPERATIONS</span>
              <span>/</span>
              <span>INCIDENTS</span>
              <span>/</span>
              <span className="text-primary font-bold">
                {mode === 'HISTORY'
                  ? 'INCIDENT HISTORY & RESOLVED ARCHIVE'
                  : 'PRIORITY INCIDENT QUEUE'}
              </span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface font-bold mt-1">
              {mode === 'HISTORY'
                ? 'Incident History & Post-Operation Archive'
                : 'Priority Incident Queue & Active Triage'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/incidents"
              className={`px-3 py-1.5 rounded font-label-md text-label-md font-bold ${
                mode !== 'HISTORY'
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Active Queue (
              {incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'UNFOUNDED').length})
            </Link>
            <Link
              to="/incidents/history"
              className={`px-3 py-1.5 rounded font-label-md text-label-md font-bold ${
                mode === 'HISTORY'
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Resolved History (
              {incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'UNFOUNDED').length})
            </Link>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-space-sm items-center">
          <div className="md:col-span-5 relative flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Incident ID (INC-2026-00421), Tourist Name, DTID, Location..."
              className="w-full h-9 pl-9 pr-3 rounded bg-surface-container text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="md:col-span-4 flex items-center gap-1 overflow-x-auto">
            {(
              [
                ['ALL', 'All Priorities'],
                ['CRITICAL', 'Critical'],
                ['HIGH', 'High'],
                ['CONCERN', 'Concern'],
                ['VERIFICATION', 'Verification'],
              ] as ['ALL' | IncidentSeverity, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSeverityFilter(key)}
                className={`px-2.5 py-1.5 rounded font-label-sm text-label-sm whitespace-nowrap transition-colors ${
                  severityFilter === key
                    ? 'bg-primary text-on-primary font-bold'
                    : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="md:col-span-3 flex items-center justify-end gap-2">
            <span className="font-label-sm text-label-sm text-outline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'PRIORITY' | 'RECENT' | 'ID')}
              className="h-9 px-2.5 rounded bg-surface-container text-on-surface font-label-sm text-label-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="PRIORITY">Priority (Critical First)</option>
              <option value="RECENT">Most Recently Updated</option>
              <option value="ID">Incident ID</option>
            </select>
          </div>
        </div>
      </div>

      {/* Incident Table */}
      {filteredIncidents.length === 0 ? (
        <EmptyState
          icon="check_circle"
          title={mode === 'HISTORY' ? 'No Historical Incidents Found' : 'No Active Incidents Match'}
          description="Try clearing your search or severity filter to view all operational incidents."
          actionLabel="Reset Filters"
          onAction={() => {
            setSearchQuery('');
            setSeverityFilter('ALL');
          }}
        />
      ) : (
        <div className="bg-surface-container-low rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest text-outline font-label-md text-label-md uppercase border-b border-outline-variant/30">
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Incident ID</th>
                  <th className="py-3 px-4">Tourist &amp; Digital ID</th>
                  <th className="py-3 px-4">Incident Type &amp; Trigger</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Unit</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 font-body-sm text-body-sm">
                {filteredIncidents.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => navigate(`/incidents/${inc.id}`)}
                    className="hover:bg-surface-container-high/70 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <SeverityBadge severity={inc.severity} />
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-on-surface whitespace-nowrap">
                      {inc.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <SafeImage
                          src={inc.touristAvatar}
                          alt={inc.touristName}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                        <div>
                          <div className="font-semibold text-on-surface">{inc.touristName}</div>
                          <div className="font-mono text-primary text-[11px]">{inc.dtid}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-on-surface">
                        {inc.type.replace('_', ' ')}
                      </div>
                      <div className="text-[11px] text-outline truncate">
                        {inc.triggerDescription}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-on-surface font-medium">{inc.location.name}</div>
                      <div className="font-mono text-[10px] text-outline">
                        {inc.location.lat.toFixed(4)}° N, {inc.location.lng.toFixed(4)}° E
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-outline text-[11px] whitespace-nowrap">
                      {inc.lastUpdatedAt}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={inc.status} />
                    </td>
                    <td className="py-3 px-4 font-mono text-label-sm">
                      {inc.assignedUnitName ? (
                        <span className="text-primary font-bold">{inc.assignedUnitName}</span>
                      ) : (
                        <span className="text-outline">Unassigned</span>
                      )}
                    </td>
                    <td
                      className="py-3 px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        {inc.status !== 'RESOLVED' && inc.status !== 'UNFOUNDED' && (
                          <>
                            {(inc.status === 'NEW' || inc.status === 'ACTIVE') &&
                              can('ACKNOWLEDGE_INCIDENT') && (
                                <button
                                  type="button"
                                  onClick={() => acknowledgeIncident(inc.id)}
                                  className="px-2.5 py-1 rounded bg-primary-container text-on-primary-container font-label-sm text-label-sm font-bold hover:opacity-90"
                                >
                                  Ack
                                </button>
                              )}
                            {can('VERIFY_INCIDENT') && (
                              <button
                                type="button"
                                onClick={() => setVerifyModalIncident(inc)}
                                className="px-2.5 py-1 rounded bg-surface-container-high hover:bg-surface-variant text-tertiary font-label-sm text-label-sm font-bold"
                              >
                                Verify
                              </button>
                            )}
                            {can('ASSIGN_RESPONSE_UNIT') && (
                              <button
                                type="button"
                                onClick={() => setAssignModalIncident(inc)}
                                className="px-2.5 py-1 rounded bg-surface-container-high hover:bg-surface-variant text-primary font-label-sm text-label-sm font-bold"
                              >
                                Assign
                              </button>
                            )}
                            {can('RESOLVE_INCIDENT') && (
                              <button
                                type="button"
                                onClick={() => setResolveModalIncident(inc)}
                                className="px-2.5 py-1 rounded bg-secondary-container/40 hover:bg-secondary-container text-secondary hover:text-on-secondary-container font-label-sm text-label-sm font-bold"
                              >
                                Resolve
                              </button>
                            )}
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`/incidents/${inc.id}`)}
                          className="px-2.5 py-1 rounded bg-surface-container-highest text-on-surface font-label-sm text-label-sm hover:bg-surface-bright"
                        >
                          Open
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
      {resolveModalIncident && (
        <ResolveIncidentModal
          open={Boolean(resolveModalIncident)}
          onClose={() => setResolveModalIncident(null)}
          incident={resolveModalIncident}
        />
      )}
    </div>
  );
};
