import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../app/providers/AuthContext';
import { useOperational } from '../app/providers/OperationalContext';
import { PermissionNotice, SafeImage } from '../components/ui/CommonUi';
import { Permission, Role } from '../types';
import { ROLE_LABELS, ROLE_PERMISSIONS } from '../utils/rbac';

const ALL_PERMISSIONS: Permission[] = [
  'VIEW_DASHBOARD',
  'VIEW_INCIDENT',
  'ACKNOWLEDGE_INCIDENT',
  'VERIFY_INCIDENT',
  'ASSIGN_RESPONSE_UNIT',
  'ESCALATE_INCIDENT',
  'RESOLVE_INCIDENT',
  'VIEW_TOURIST',
  'VIEW_LOCATION',
  'VIEW_EMERGENCY_CONTACT',
  'VIEW_RISK_ZONES',
  'MANAGE_RISK_ZONES',
  'VIEW_ANALYTICS',
  'VIEW_AUDIT_LOG',
  'MANAGE_USERS',
  'MANAGE_ROLES',
  'CREATE_REPORT',
  'REVIEW_REPORT',
];

export const AdminSettingsProfilePage: React.FC<{
  section: 'USERS' | 'ROLES' | 'SETTINGS' | 'PROFILE';
}> = ({ section }) => {
  const { user, can, loginByRole } = useAuth();
  const { users, showToast } = useOperational();

  // Local state for user management table updates
  const [roleOverrides, setRoleOverrides] = useState<Record<string, Role>>({});
  const [suspendedMap, setSuspendedMap] = useState<Record<string, boolean>>({});

  // Settings local interactive state
  const [inactivityThresholdMins, setInactivityThresholdMins] = useState(40);
  const [overdueCheckInGraceMins, setOverdueCheckInGraceMins] = useState(30);
  const [autoSafetyPromptEnabled, setAutoSafetyPromptEnabled] = useState(true);
  const [strictHumanVerification, setStrictHumanVerification] = useState(true);
  const [duskCurfewAutoAlert, setDuskCurfewAutoAlert] = useState(true);

  if ((section === 'USERS' || section === 'ROLES') && !can('MANAGE_USERS')) {
    return (
      <div className="p-space-lg">
        <PermissionNotice requiredPermission="MANAGE_USERS" />
      </div>
    );
  }

  return (
    <div className="p-space-lg space-y-space-lg">
      {/* Top Sub-Navigation Header */}
      <div className="bg-surface-container-low p-space-lg rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-sm text-label-sm text-outline uppercase">
            <span>ADMINISTRATION &amp; GOVERNANCE</span>
            <span>/</span>
            <span className="text-primary font-bold">{section}</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface font-bold mt-1">
            {section === 'USERS'
              ? 'Authorized Personnel & Operator Accounts'
              : section === 'ROLES'
              ? 'Role-Based Access Control (RBAC) Matrix'
              : section === 'SETTINGS'
              ? 'System Thresholds & Escalation Rules'
              : 'Officer Duty Profile & Security Clearance'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-surface-container p-1 rounded-lg">
          <Link
            to="/users"
            className={`px-3 py-1.5 rounded font-label-sm text-label-sm ${
              section === 'USERS'
                ? 'bg-primary-container text-on-primary-container font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Users ({users.length})
          </Link>
          <Link
            to="/roles"
            className={`px-3 py-1.5 rounded font-label-sm text-label-sm ${
              section === 'ROLES'
                ? 'bg-primary-container text-on-primary-container font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Roles &amp; Permissions
          </Link>
          <Link
            to="/settings"
            className={`px-3 py-1.5 rounded font-label-sm text-label-sm ${
              section === 'SETTINGS'
                ? 'bg-primary-container text-on-primary-container font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Thresholds &amp; Settings
          </Link>
          <Link
            to="/profile"
            className={`px-3 py-1.5 rounded font-label-sm text-label-sm ${
              section === 'PROFILE'
                ? 'bg-primary-container text-on-primary-container font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            My Officer Profile
          </Link>
        </div>
      </div>

      {/* USERS SECTION */}
      {section === 'USERS' && (
        <div className="bg-surface-container-low rounded-xl p-space-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest text-outline font-label-md text-label-md uppercase border-b border-outline-variant/30">
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Badge ID</th>
                  <th className="py-3 px-4">Jurisdiction / Sector</th>
                  <th className="py-3 px-4">Assigned RBAC Role</th>
                  <th className="py-3 px-4">Clearance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 font-body-sm text-body-sm">
                {users.map((u) => {
                  const effectiveRole = roleOverrides[u.id] || u.role;
                  const isSuspended = suspendedMap[u.id] || false;
                  return (
                    <tr key={u.id} className="hover:bg-surface-container-high/50">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <SafeImage
                            src={u.avatarUrl}
                            alt={u.name}
                            className="w-9 h-9 rounded-lg object-cover"
                          />
                          <div>
                            <div className="font-bold text-on-surface">{u.name}</div>
                            <div className="font-mono text-xs text-outline">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-primary">{u.badgeNumber}</td>
                      <td className="py-3.5 px-4 text-on-surface">{u.sector}</td>
                      <td className="py-3.5 px-4">
                        <select
                          value={effectiveRole}
                          onChange={(e) => {
                            const newRole = e.target.value as Role;
                            setRoleOverrides((prev) => ({ ...prev, [u.id]: newRole }));
                            showToast(
                              `Updated ${u.name}'s RBAC role to ${ROLE_LABELS[newRole].title}.`,
                              'PRIMARY'
                            );
                          }}
                          className="h-8 px-2 rounded bg-surface-container-high text-on-surface font-mono text-xs"
                        >
                          {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-outline">
                        {u.clearanceLevel}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-label-sm text-[10px] font-bold ${
                            !isSuspended
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-secondary-container/40 text-secondary'
                          }`}
                        >
                          {!isSuspended ? u.status : 'SUSPENDED'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSuspendedMap((prev) => ({ ...prev, [u.id]: !isSuspended }));
                            showToast(
                              `${!isSuspended ? 'Suspended' : 'Restored'} operator account ${u.badgeNumber}.`,
                              'WARNING'
                            );
                          }}
                          className="px-2.5 py-1 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-sm text-label-sm"
                        >
                          {!isSuspended ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ROLES & RBAC MATRIX SECTION */}
      {section === 'ROLES' && (
        <div className="bg-surface-container-low rounded-xl p-space-lg space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
              <div
                key={r}
                className="bg-surface-container p-4 rounded-xl flex flex-col justify-between"
              >
                <div>
                  <span className="font-mono text-[10px] text-primary uppercase block">{r}</span>
                  <h3 className="font-headline-md text-on-surface font-bold mt-1">
                    {ROLE_LABELS[r].title}
                  </h3>
                  <p className="font-body-sm text-xs text-outline mt-1">
                    {ROLE_LABELS[r].description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void loginByRole(r);
                    showToast(
                      `Switched active session role to ${ROLE_LABELS[r].title}`,
                      'PRIMARY'
                    );
                  }}
                  className="mt-4 w-full py-1.5 rounded bg-surface-container-high hover:bg-primary-container hover:text-on-primary-container text-on-surface font-label-sm text-label-sm font-bold transition-colors"
                >
                  Test This Role
                </button>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto bg-surface-container-lowest rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high/60 text-outline font-label-sm text-label-sm uppercase border-b border-outline-variant/30">
                  <th className="py-3 px-4">Permission Token</th>
                  {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                    <th key={r} className="py-3 px-4 text-center">
                      {ROLE_LABELS[r].title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15 font-mono text-xs">
                {ALL_PERMISSIONS.map((perm) => (
                  <tr key={perm} className="hover:bg-surface-container-high/30">
                    <td className="py-2.5 px-4 text-on-surface font-semibold">{perm}</td>
                    {(Object.keys(ROLE_LABELS) as Role[]).map((r) => {
                      const has = ROLE_PERMISSIONS[r].includes(perm);
                      return (
                        <td key={r} className="py-2.5 px-4 text-center">
                          {has ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-primary/20 text-primary">
                              ✓
                            </span>
                          ) : (
                            <span className="text-outline-variant">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SETTINGS SECTION */}
      {section === 'SETTINGS' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
          <div className="bg-surface-container-low p-space-lg rounded-xl space-y-4">
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
              AI Anomaly &amp; Check-In Thresholds
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-surface-container p-3 rounded-lg">
                <div>
                  <div className="font-bold text-on-surface text-sm">
                    Prolonged Inactivity Alert Window
                  </div>
                  <div className="text-xs text-outline">
                    Minutes of stationary telemetry off-trail before flagging Level-1 anomaly
                  </div>
                </div>
                <input
                  type="number"
                  value={inactivityThresholdMins}
                  onChange={(e) => setInactivityThresholdMins(Number(e.target.value))}
                  className="w-20 h-9 px-2 rounded bg-surface-container-highest text-on-surface font-mono text-center"
                />
              </div>

              <div className="flex items-center justify-between bg-surface-container p-3 rounded-lg">
                <div>
                  <div className="font-bold text-on-surface text-sm">
                    Missed Check-In Grace Window
                  </div>
                  <div className="text-xs text-outline">
                    Minutes after scheduled waypoint check-in before sending automatic prompt
                  </div>
                </div>
                <input
                  type="number"
                  value={overdueCheckInGraceMins}
                  onChange={(e) => setOverdueCheckInGraceMins(Number(e.target.value))}
                  className="w-20 h-9 px-2 rounded bg-surface-container-highest text-on-surface font-mono text-center"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                showToast('Operational threshold settings saved and synced to EOC nodes.', 'SUCCESS')
              }
              className="px-4 py-2 rounded bg-primary-container text-on-primary-container font-label-md text-label-md font-bold"
            >
              Save Threshold Configuration
            </button>
          </div>

          <div className="bg-surface-container-low p-space-lg rounded-xl space-y-4">
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
              Progressive Escalation &amp; Privacy Guardrails
            </h2>
            <div className="space-y-3">
              {[
                [
                  'Mandatory Human Officer Verification (Zero Auto-Emergency)',
                  'Prevent AI anomalies or missed check-ins from dispatching police without officer verification',
                  strictHumanVerification,
                  setStrictHumanVerification,
                ],
                [
                  'Automated Tourist Safety Check-In Prompt (Level 2)',
                  'Send low-bandwidth SMS/App safety ping prior to escalating overdue check-ins',
                  autoSafetyPromptEnabled,
                  setAutoSafetyPromptEnabled,
                ],
                [
                  'Dusk Gorge Curfew Acoustic Broadcast (17:30 IST)',
                  'Automatically notify tourists inside high-risk gorge polygons 30m before sunset',
                  duskCurfewAutoAlert,
                  setDuskCurfewAutoAlert,
                ],
              ].map(([title, desc, val, setter], idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-surface-container p-3 rounded-lg gap-4"
                >
                  <div>
                    <div className="font-bold text-on-surface text-sm">{title as string}</div>
                    <div className="text-xs text-outline">{desc as string}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => (setter as React.Dispatch<React.SetStateAction<boolean>>)(!val)}
                    className={`px-3 py-1 rounded font-mono text-xs font-bold ${
                      val
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-highest text-outline'
                    }`}
                  >
                    {val ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* OFFICER PROFILE SECTION */}
      {section === 'PROFILE' && user && (
        <div className="bg-surface-container-low p-space-lg rounded-xl max-w-3xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <SafeImage
              src={user.avatarUrl}
              alt={user.name}
              className="w-20 h-20 rounded-xl object-cover ring-2 ring-primary/40"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">
                  {user.name}
                </h2>
                <span className="px-2 py-0.5 rounded bg-primary/15 text-primary font-mono text-xs font-bold">
                  {user.badgeNumber}
                </span>
              </div>
              <p className="font-body-md text-on-surface-variant">
                {user.rank} • {user.unit}
              </p>
              <p className="font-mono text-xs text-outline mt-1">
                {user.email} • Clearance: {user.clearanceLevel}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface-container p-4 rounded-xl font-body-sm">
            <div>
              <span className="text-outline font-label-sm uppercase block">Active RBAC Role</span>
              <span className="text-primary font-mono font-bold">
                {ROLE_LABELS[user.role].title} ({user.role})
              </span>
            </div>
            <div>
              <span className="text-outline font-label-sm uppercase block">Jurisdiction</span>
              <span className="text-on-surface font-semibold">{user.sector}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-outline font-label-sm uppercase block mb-1.5">
                Granted Permissions ({ROLE_PERMISSIONS[user.role].length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ROLE_PERMISSIONS[user.role].map((p) => (
                  <span
                    key={p}
                    className="px-2 py-0.5 rounded bg-surface-container-highest text-on-surface font-mono text-[11px]"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
