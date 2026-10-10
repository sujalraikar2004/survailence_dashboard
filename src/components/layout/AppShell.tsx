import React, { useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthContext';
import { useOperational } from '../../app/providers/OperationalContext';
import { STITCH_ASSETS } from '../../mock/mockData';
import { DemoScenarioId, Role } from '../../types';
import { ROLE_LABELS } from '../../utils/rbac';
import { SafeImage, ToastContainer } from '../ui/CommonUi';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loginByRole, logout, demoAccounts } = useAuth();
  const {
    incidents,
    tourists,
    anomalies,
    riskZones,
    notifications,
    connectivityState,
    audioMuted,
    demoModeOpen,
    demoWorkflowStep,
    themeMode,
    toasts,
    setConnectivityState,
    setAudioMuted,
    setDemoModeOpen,
    toggleThemeMode,
    dismissToast,
    markNotificationRead,
    markAllNotificationsRead,
    triggerDemoScenario,
    advanceMasterDemoStep,
    resetDemoState,
    showToast,
  } = useOperational();

  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  const activeIncidents = useMemo(
    () => incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'UNFOUNDED'),
    [incidents]
  );
  const criticalCount = useMemo(
    () => activeIncidents.filter((i) => i.severity === 'CRITICAL').length,
    [activeIncidents]
  );
  const pendingVerificationCount = useMemo(
    () =>
      activeIncidents.filter(
        (i) =>
          i.verificationState === 'VERIFICATION_REQUIRED' ||
          i.verificationState === 'VERIFYING_SIGNALS'
      ).length + anomalies.filter((a) => a.status !== 'DISMISSED').length,
    [activeIncidents, anomalies]
  );
  const unreadNotifsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const matchedTourists = tourists.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.dtid.toLowerCase().includes(q) ||
        t.phone.toLowerCase().includes(q) ||
        t.trip.packageName.toLowerCase().includes(q) ||
        t.location.name.toLowerCase().includes(q)
    );
    const matchedIncidents = incidents.filter(
      (i) =>
        i.id.toLowerCase().includes(q) ||
        i.touristName.toLowerCase().includes(q) ||
        i.dtid.toLowerCase().includes(q) ||
        i.location.name.toLowerCase().includes(q) ||
        i.title.toLowerCase().includes(q)
    );
    const matchedZones = riskZones.filter(
      (z) =>
        z.name.toLowerCase().includes(q) ||
        z.geoId.toLowerCase().includes(q) ||
        z.sector.toLowerCase().includes(q)
    );
    const matchedAnomalies = anomalies.filter(
      (a) =>
        a.id.toLowerCase().includes(q) ||
        a.touristName.toLowerCase().includes(q) ||
        a.dtid.toLowerCase().includes(q) ||
        a.locationName.toLowerCase().includes(q)
    );

    const total =
      matchedTourists.length +
      matchedIncidents.length +
      matchedZones.length +
      matchedAnomalies.length;

    return {
      total,
      matchedTourists,
      matchedIncidents,
      matchedZones,
      matchedAnomalies,
    };
  }, [searchQuery, tourists, incidents, riskZones, anomalies]);

  const handleSelectSearchResult = (path: string) => {
    setSearchFocused(false);
    setSearchQuery('');
    navigate(path);
  };

  const handleRoleSwitch = async (role: Role) => {
    await loginByRole(role);
    setProfileOpen(false);
    showToast(`Switched active role to ${ROLE_LABELS[role].title}.`, 'PRIMARY');
  };

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'flex items-center justify-between px-3 py-2 transition-all group bg-primary-container text-on-primary-container font-semibold rounded-xl shadow-xs'
      : 'flex items-center justify-between px-3 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors group';

  const navIconClass = (isActive: boolean, specialColor?: string) =>
    isActive
      ? 'material-symbols-outlined text-[19px] text-on-primary-container'
      : `material-symbols-outlined text-[19px] ${
          specialColor || 'text-outline group-hover:text-primary'
        } transition-colors`;

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen">
      {/* TOP BAR */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-surface-container-lowest/95 backdrop-blur-md z-[100] flex items-center justify-between gap-3 px-4 lg:px-6 border-b border-outline-variant/50 shadow-xs">
        {/* Brand & Sidebar Toggle */}
        <div className="flex items-center gap-3 lg:w-60 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth < 1024) {
                setMobileMenuOpen((v) => !v);
              } else {
                setSidebarCollapsed((v) => !v);
              }
            }}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline-variant/40 transition-colors shrink-0"
            title="Toggle Navigation Sidebar"
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>
          <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <SafeImage
              alt="Smart Tourist Safety Emblem"
              className="h-8 w-8 rounded-lg object-contain shrink-0"
              src={STITCH_ASSETS.emblem}
              fallbackIcon="shield"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-headline-md text-[14px] font-bold tracking-tight text-on-surface uppercase truncate">
                Smart Tourist Safety
              </span>
              <span className="font-label-sm text-[10px] text-primary font-semibold tracking-wider uppercase hidden sm:block truncate">
                Police &amp; Responder EOC
              </span>
            </div>
          </Link>
        </div>

        {/* Global Search Bar */}
        <div
          ref={searchContainerRef}
          className="flex-1 max-w-xl relative hidden md:block"
        >
          <div className="relative flex items-center w-full">
            <span className="material-symbols-outlined absolute left-3.5 text-outline text-[18px] pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-8 bg-surface-container-high border border-outline-variant/50 rounded-xl text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              placeholder="Search tourist name, Digital ID (DTID-8F4K29), Incident INC-..., or Sector..."
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-outline hover:text-on-surface"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Categorized Global Search Dropdown */}
          {searchFocused && searchQuery.trim() !== '' && searchResults && (
            <div className="absolute left-0 right-0 top-12 bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-2xl z-50 max-h-[70vh] overflow-y-auto p-3 space-y-3">
              {searchResults.total === 0 ? (
                <div className="p-4 text-center text-outline font-body-sm">
                  No records match your search for "{searchQuery}".
                </div>
              ) : (
                <>
                  {searchResults.matchedIncidents.length > 0 && (
                    <div>
                      <div className="px-2.5 py-1 font-label-sm text-label-sm text-outline uppercase tracking-wider">
                        Incidents ({searchResults.matchedIncidents.length})
                      </div>
                      {searchResults.matchedIncidents.map((inc) => (
                        <button
                          key={inc.id}
                          type="button"
                          onMouseDown={() => handleSelectSearchResult(`/incidents/${inc.id}`)}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-surface-container-high flex items-center justify-between gap-2 transition-colors"
                        >
                          <div>
                            <span className="font-mono font-bold text-on-surface text-label-md">
                              {inc.id}
                            </span>
                            <span className="text-outline mx-1.5">•</span>
                            <span className="text-on-surface text-body-sm font-semibold">
                              {inc.touristName} ({inc.dtid})
                            </span>
                            <span className="block text-xs text-outline">
                              {inc.location.name} — {inc.title}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-secondary/15 text-secondary font-label-sm text-[10px] font-bold uppercase shrink-0">
                            {inc.severity}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.matchedTourists.length > 0 && (
                    <div>
                      <div className="px-2.5 py-1 font-label-sm text-label-sm text-outline uppercase tracking-wider">
                        Tourists &amp; Digital IDs ({searchResults.matchedTourists.length})
                      </div>
                      {searchResults.matchedTourists.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onMouseDown={() => handleSelectSearchResult(`/tourists/${t.dtid}`)}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-surface-container-high flex items-center justify-between gap-2 transition-colors"
                        >
                          <div>
                            <span className="font-headline-md text-body-md text-on-surface font-semibold">
                              {t.name}
                            </span>
                            <span className="font-mono text-primary text-label-sm ml-2">
                              {t.dtid}
                            </span>
                            <span className="block text-xs text-outline">
                              {t.trip.packageName} • {t.location.name}
                            </span>
                          </div>
                          <span className="font-label-sm text-[10px] text-outline font-mono">
                            {t.safetyStatus.replace('_', ' ')}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.matchedZones.length > 0 && (
                    <div>
                      <div className="px-2.5 py-1 font-label-sm text-label-sm text-outline uppercase tracking-wider">
                        Risk Zones &amp; Locations ({searchResults.matchedZones.length})
                      </div>
                      {searchResults.matchedZones.map((z) => (
                        <button
                          key={z.id}
                          type="button"
                          onMouseDown={() => handleSelectSearchResult(`/risk-zones/${z.id}`)}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-surface-container-high flex items-center justify-between gap-2 transition-colors"
                        >
                          <div>
                            <span className="font-headline-md text-body-md text-on-surface font-semibold">
                              {z.name}
                            </span>
                            <span className="font-mono text-outline text-label-sm ml-2">
                              {z.geoId}
                            </span>
                            <span className="block text-xs text-outline">{z.sector}</span>
                          </div>
                          <span className="font-label-sm text-[10px] text-secondary font-mono">
                            {z.riskLevel}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Right Top Bar Status & Controls (Clean, Non-Overlapping) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Active SOS & Verification Summary */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-surface-container-high border border-outline-variant/50 rounded-xl font-label-md text-label-md">
            <Link
              to="/incidents/active"
              className="text-secondary font-bold hover:underline flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-secondary animate-ping" />
              <span>{criticalCount} SOS</span>
            </Link>
            <span className="text-outline-variant">|</span>
            <Link to="/anomalies" className="text-tertiary font-bold hover:underline">
              {pendingVerificationCount} Verify
            </Link>
          </div>

          {/* System Connectivity Toggle */}
          <button
            type="button"
            onClick={() => {
              const next =
                connectivityState === 'ONLINE'
                  ? 'LIMITED'
                  : connectivityState === 'LIMITED'
                  ? 'OFFLINE'
                  : 'ONLINE';
              setConnectivityState(next);
              showToast(`System connectivity state changed to ${next}.`, 'PRIMARY');
            }}
            className="hidden 2xl:flex items-center gap-1.5 h-9 px-3 bg-surface-container-high border border-outline-variant/50 rounded-xl hover:bg-surface-variant transition-colors"
            title="Click to simulate connectivity state (ONLINE / LIMITED / OFFLINE)"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                connectivityState === 'ONLINE'
                  ? 'bg-emerald-500'
                  : connectivityState === 'LIMITED'
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
            />
            <span className="font-label-sm text-[11px] font-bold text-on-surface">
              {connectivityState}
            </span>
          </button>

          {/* LIGHT / DARK THEME MODE SWITCHER */}
          <button
            type="button"
            onClick={() => {
              toggleThemeMode();
              showToast(
                `Switched to ${themeMode === 'light' ? 'Tactical Dark' : 'Daylight Light'} Mode.`,
                'PRIMARY'
              );
            }}
            className="h-9 px-3 rounded-xl flex items-center gap-1.5 bg-surface-container-high hover:bg-surface-variant text-on-surface border border-outline-variant/50 font-label-sm text-label-sm font-bold transition-colors shadow-2xs"
            title={
              themeMode === 'light'
                ? 'Switch to Tactical Dark Mode'
                : 'Switch to Professional Light Mode'
            }
          >
            <span className="material-symbols-outlined text-[18px] text-primary">
              {themeMode === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
            <span className="hidden sm:inline">
              {themeMode === 'light' ? 'Dark Mode' : 'Light Mode'}
            </span>
          </button>

          {/* Demo Mode Presentation Controller Button */}
          <button
            type="button"
            onClick={() => setDemoModeOpen(!demoModeOpen)}
            className={`h-9 px-3 rounded-xl flex items-center gap-1.5 font-label-sm text-label-sm font-bold border transition-colors ${
              demoModeOpen
                ? 'bg-primary-container text-on-primary-container border-primary'
                : 'bg-surface-container-high text-primary border-outline-variant/50 hover:bg-surface-variant'
            }`}
            title="Open Demo Scenario & Workflow Controller"
          >
            <span className="material-symbols-outlined text-[17px]">play_circle</span>
            <span className="hidden md:inline">Demo Flow</span>
          </button>

          {/* Audio & Notifications */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setAudioMuted(!audioMuted);
                showToast(
                  audioMuted ? 'Tactical audio alerts unmuted.' : 'Tactical audio alerts muted.',
                  'PRIMARY'
                );
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-container-high border border-outline-variant/50 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors"
              title={audioMuted ? 'Audio Alerts: Muted' : 'Audio Alerts: Unmuted'}
            >
              <span className="material-symbols-outlined text-[18px]">
                {audioMuted ? 'volume_off' : 'volume_up'}
              </span>
            </button>

            {/* Notification Center Trigger & Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setProfileOpen(false);
                }}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-container-high border border-outline-variant/50 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors"
                title="Notifications"
              >
                <span className="material-symbols-outlined text-[18px]">notifications</span>
              </button>
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[9px] font-bold ring-2 ring-surface-container-lowest">
                  {unreadNotifsCount}
                </span>
              )}

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 bg-surface-container-high flex items-center justify-between border-b border-outline-variant/40">
                    <span className="font-headline-md text-body-md font-bold text-on-surface">
                      EOC Notification Center
                    </span>
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="font-label-sm text-label-sm text-primary font-bold hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-outline-variant/30">
                    {notifications.length === 0 ? (
                      <div className="p-5 text-center text-outline text-body-sm">
                        No notifications.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationRead(n.id);
                            setNotifOpen(false);
                            navigate(n.linkTo);
                          }}
                          className={`p-3.5 cursor-pointer hover:bg-surface-container-high transition-colors flex items-start gap-3 ${
                            !n.read ? 'bg-primary/5' : 'opacity-80'
                          }`}
                        >
                          <span
                            className={`material-symbols-outlined text-[19px] mt-0.5 ${
                              n.type === 'CRITICAL_INCIDENT'
                                ? 'text-secondary'
                                : n.type === 'VERIFICATION'
                                ? 'text-tertiary'
                                : 'text-primary'
                            }`}
                          >
                            {n.type === 'CRITICAL_INCIDENT'
                              ? 'emergency'
                              : n.type === 'VERIFICATION'
                              ? 'warning'
                              : 'notifications_active'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-headline-md text-body-sm font-bold text-on-surface truncate">
                                {n.title}
                              </span>
                              <span className="font-label-sm text-[10px] text-outline font-mono shrink-0">
                                {n.timestamp}
                              </span>
                            </div>
                            <p className="font-body-sm text-xs text-on-surface-variant leading-snug mt-1">
                              {n.message}
                            </p>
                          </div>
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Current User & Role Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileOpen((v) => !v);
                setNotifOpen(false);
              }}
              className="flex items-center gap-2.5 text-left bg-surface-container-high hover:bg-surface-variant border border-outline-variant/50 px-2.5 py-1.5 rounded-xl transition-colors"
            >
              <SafeImage
                alt={user?.name || 'Insp. Ananya Sharma'}
                className="w-7 h-7 rounded-full object-cover ring-1 ring-primary/40 shrink-0"
                src={user?.avatarUrl || STITCH_ASSETS.ananyaAvatar}
                fallbackText="AS"
              />
              <div className="hidden lg:flex flex-col">
                <span className="font-headline-md text-xs text-on-surface font-bold leading-tight">
                  {user?.name || 'Insp. Ananya Sharma'}
                </span>
                <span className="font-label-sm text-[10px] text-primary font-mono leading-tight">
                  {user?.role || 'CONTROL_ROOM_OPERATOR'}
                </span>
              </div>
              <span className="material-symbols-outlined text-[16px] text-outline hidden sm:inline">
                expand_more
              </span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-2xl z-50 p-3 space-y-2.5">
                <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/40">
                  <div className="font-headline-md text-body-md font-bold text-on-surface">
                    {user?.name}
                  </div>
                  <div className="font-label-sm text-label-sm text-primary font-mono mt-0.5">
                    Role: {user?.role} ({user?.badgeNumber})
                  </div>
                  <div className="font-body-sm text-xs text-outline mt-1">
                    {user?.clearanceLevel}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="px-2 font-label-sm text-[10px] text-outline uppercase tracking-wider font-bold block">
                    Quick Switch Demo Role (RBAC Preview)
                  </span>
                  {demoAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => void handleRoleSwitch(acc.role)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-body-sm flex items-center justify-between transition-colors ${
                        user?.role === acc.role
                          ? 'bg-primary/15 text-primary font-bold'
                          : 'hover:bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      <div>
                        <span className="block leading-tight font-semibold">{acc.name}</span>
                        <span className="font-mono text-[10px] text-outline">{acc.role}</span>
                      </div>
                      {user?.role === acc.role && (
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between gap-2">
                  <Link
                    to="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex-1 h-9 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-sm text-label-sm font-semibold flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[15px]">person</span>
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex-1 h-9 rounded-xl bg-secondary/15 hover:bg-secondary-container text-secondary hover:text-on-secondary-container font-label-sm text-label-sm font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">logout</span>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Connectivity Banner when LIMITED or OFFLINE */}
      {connectivityState !== 'ONLINE' && (
        <div
          className={`fixed top-16 left-0 right-0 z-30 px-4 py-1.5 text-center font-label-sm text-label-sm flex items-center justify-center gap-2 shadow-sm ${
            connectivityState === 'LIMITED'
              ? 'bg-tertiary-container text-on-tertiary font-bold'
              : 'bg-secondary-container text-on-secondary-container font-bold'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">
            {connectivityState === 'LIMITED' ? 'wifi_tethering_error' : 'cloud_off'}
          </span>
          <span>
            {connectivityState === 'LIMITED'
              ? 'LIMITED CONNECTIVITY MODE: High-elevation satellite SMS fallback active. Last known location timestamps displayed.'
              : 'OFFLINE STATION CACHE MODE: Operating on local station ledger. Actions queued for sync when link restores.'}
          </span>
          <button
            type="button"
            onClick={() => setConnectivityState('ONLINE')}
            className="underline ml-2 font-mono"
          >
            Restore Online
          </button>
        </div>
      )}

      {/* MOBILE SIDEBAR BACKDROP */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 top-16 bg-slate-900/50 backdrop-blur-xs z-[85] lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed left-0 top-16 bottom-0 bg-surface-container-lowest z-[90] flex flex-col justify-between overflow-y-auto border-r border-outline-variant/50 transition-all duration-200 ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        } ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="py-4">
          <nav className="px-3 space-y-5">
            {/* OVERVIEW */}
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <div className="px-3 py-1 font-label-sm text-[10px] text-outline font-bold uppercase tracking-wider">
                  Overview
                </div>
              )}
              <NavLink to="/dashboard" className={navLinkClass} title="Command Center">
                {({ isActive }) => (
                  <div className="flex items-center gap-3">
                    <span className={navIconClass(isActive)}>grid_view</span>
                    {!sidebarCollapsed && (
                      <span className="font-body-sm text-body-sm">Command Center</span>
                    )}
                  </div>
                )}
              </NavLink>
              <NavLink to="/live-map" className={navLinkClass} title="Live Operations Map">
                {({ isActive }) => (
                  <div className="flex items-center gap-3">
                    <span className={navIconClass(isActive)}>map</span>
                    {!sidebarCollapsed && (
                      <span className="font-body-sm text-body-sm">Live Operations Map</span>
                    )}
                  </div>
                )}
              </NavLink>
            </div>

            {/* INCIDENTS */}
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <div className="px-3 py-1 font-label-sm text-[10px] text-outline font-bold uppercase tracking-wider">
                  Incidents
                </div>
              )}
              <NavLink
                to="/incidents/active"
                className={({ isActive }) =>
                  navLinkClass({
                    isActive: isActive || location.pathname.startsWith('/incidents/INC-'),
                  })
                }
                title="Active Incidents"
              >
                {({ isActive }) => {
                  const active = isActive || location.pathname.startsWith('/incidents/INC-');
                  return (
                    <>
                      <div className="flex items-center gap-3">
                        <span className={navIconClass(active, 'text-secondary')}>emergency</span>
                        {!sidebarCollapsed && (
                          <span className="font-body-sm text-body-sm">Active Incidents</span>
                        )}
                      </div>
                      {!sidebarCollapsed && (
                        <span
                          className={`font-label-sm text-[10px] px-2 py-0.5 rounded-md font-bold ${
                            active
                              ? 'bg-white/20 text-white'
                              : 'bg-secondary/15 text-secondary'
                          }`}
                        >
                          {criticalCount} SOS
                        </span>
                      )}
                    </>
                  );
                }}
              </NavLink>
              <NavLink to="/incidents" end className={navLinkClass} title="Incident Queue">
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <span className={navIconClass(isActive)}>scan</span>
                      {!sidebarCollapsed && (
                        <span className="font-body-sm text-body-sm">Incident Queue</span>
                      )}
                    </div>
                    {!sidebarCollapsed && (
                      <span
                        className={`font-label-sm text-[10px] px-2 py-0.5 rounded-md font-mono ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        {activeIncidents.length}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
              <NavLink to="/incidents/history" className={navLinkClass} title="Incident History">
                {({ isActive }) => (
                  <div className="flex items-center gap-3">
                    <span className={navIconClass(isActive)}>history</span>
                    {!sidebarCollapsed && (
                      <span className="font-body-sm text-body-sm">Incident History</span>
                    )}
                  </div>
                )}
              </NavLink>
            </div>

            {/* TOURIST MANAGEMENT */}
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <div className="px-3 py-1 font-label-sm text-[10px] text-outline font-bold uppercase tracking-wider">
                  Tourist Management
                </div>
              )}
              <NavLink to="/tourists" end className={navLinkClass} title="Tourist Registry">
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <span className={navIconClass(isActive)}>badge</span>
                      {!sidebarCollapsed && (
                        <span className="font-body-sm text-body-sm">Tourist Registry</span>
                      )}
                    </div>
                    {!sidebarCollapsed && (
                      <span
                        className={`font-label-sm text-[10px] px-2 py-0.5 rounded-md font-mono ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        1,284
                      </span>
                    )}
                  </>
                )}
              </NavLink>
              <NavLink
                to="/tourists/DTID-8F4K29"
                className={navLinkClass}
                title="Active Trips & Itineraries"
              >
                {({ isActive }) => (
                  <div className="flex items-center gap-3">
                    <span className={navIconClass(isActive)}>route</span>
                    {!sidebarCollapsed && (
                      <span className="font-body-sm text-body-sm">Trips &amp; Itineraries</span>
                    )}
                  </div>
                )}
              </NavLink>
            </div>

            {/* SAFETY & GEOFENCING */}
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <div className="px-3 py-1 font-label-sm text-[10px] text-outline font-bold uppercase tracking-wider">
                  Safety &amp; Geofencing
                </div>
              )}
              <NavLink to="/anomalies" className={navLinkClass} title="Anomaly Queue">
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <span className={navIconClass(isActive, 'text-tertiary')}>warning</span>
                      {!sidebarCollapsed && (
                        <span className="font-body-sm text-body-sm">Anomaly Queue</span>
                      )}
                    </div>
                    {!sidebarCollapsed && (
                      <span
                        className={`font-label-sm text-[10px] px-2 py-0.5 rounded-md font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-tertiary/15 text-tertiary'
                        }`}
                      >
                        {anomalies.length}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
              <NavLink to="/risk-zones" className={navLinkClass} title="Risk Zones & Geofences">
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <span className={navIconClass(isActive)}>share_location</span>
                      {!sidebarCollapsed && (
                        <span className="font-body-sm text-body-sm">Risk Zones &amp; Fencing</span>
                      )}
                    </div>
                    {!sidebarCollapsed && (
                      <span
                        className={`font-label-sm text-[10px] px-2 py-0.5 rounded-md font-mono ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        {riskZones.length}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
              <NavLink to="/check-ins" className={navLinkClass} title="Check-In Monitoring">
                {({ isActive }) => (
                  <div className="flex items-center gap-3">
                    <span className={navIconClass(isActive)}>rule</span>
                    {!sidebarCollapsed && (
                      <span className="font-body-sm text-body-sm">Check-In Monitoring</span>
                    )}
                  </div>
                )}
              </NavLink>
              <NavLink to="/geofence-events" className={navLinkClass} title="Geo-Fence Events">
                {({ isActive }) => (
                  <div className="flex items-center gap-3">
                    <span className={navIconClass(isActive)}>radar</span>
                    {!sidebarCollapsed && (
                      <span className="font-body-sm text-body-sm">Geo-Fence Events</span>
                    )}
                  </div>
                )}
              </NavLink>
            </div>

            {/* DISPATCH & RESPONSE */}
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <div className="px-3 py-1 font-label-sm text-[10px] text-outline font-bold uppercase tracking-wider">
                  Dispatch &amp; Response
                </div>
              )}
              <NavLink to="/response-teams" className={navLinkClass} title="Response Teams">
                {({ isActive }) => (
                  <div className="flex items-center gap-3">
                    <span className={navIconClass(isActive)}>local_police</span>
                    {!sidebarCollapsed && (
                      <span className="font-body-sm text-body-sm">Response Teams</span>
                    )}
                  </div>
                )}
              </NavLink>
              <NavLink
                to="/reports"
                className={navLinkClass}
                title="Incident Reports & E-FIR Drafts"
              >
                {({ isActive }) => (
                  <div className="flex items-center gap-3">
                    <span className={navIconClass(isActive)}>description</span>
                    {!sidebarCollapsed && (
                      <span className="font-body-sm text-body-sm">Reports &amp; E-FIR</span>
                    )}
                  </div>
                )}
              </NavLink>
            </div>

            {/* GOVERNANCE */}
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <div className="px-3 py-1 font-label-sm text-[10px] text-outline font-bold uppercase tracking-wider">
                  Governance
                </div>
              )}
              <NavLink to="/analytics" className={navLinkClass} title="Safety Analytics">
                {({ isActive }) => (
                  <div className="flex items-center gap-3">
                    <span className={navIconClass(isActive)}>insights</span>
                    {!sidebarCollapsed && (
                      <span className="font-body-sm text-body-sm">Safety Analytics</span>
                    )}
                  </div>
                )}
              </NavLink>
              <NavLink to="/audit-logs" className={navLinkClass} title="Audit Trail & Access Logs">
                {({ isActive }) => (
                  <div className="flex items-center gap-3">
                    <span className={navIconClass(isActive)}>verified_user</span>
                    {!sidebarCollapsed && (
                      <span className="font-body-sm text-body-sm">Audit &amp; Access Logs</span>
                    )}
                  </div>
                )}
              </NavLink>
              <NavLink to="/users" className={navLinkClass} title="Users & Role Matrix">
                {({ isActive }) => (
                  <div className="flex items-center gap-3">
                    <span className={navIconClass(isActive)}>admin_panel_settings</span>
                    {!sidebarCollapsed && (
                      <span className="font-body-sm text-body-sm">Users &amp; Roles</span>
                    )}
                  </div>
                )}
              </NavLink>
              <NavLink to="/settings" className={navLinkClass} title="System Configuration">
                {({ isActive }) => (
                  <div className="flex items-center gap-3">
                    <span className={navIconClass(isActive)}>settings</span>
                    {!sidebarCollapsed && (
                      <span className="font-body-sm text-body-sm">System Settings</span>
                    )}
                  </div>
                )}
              </NavLink>
            </div>
          </nav>
        </div>

        {/* Need-to-Know Auth Footer Card */}
        {!sidebarCollapsed && (
          <div className="p-3.5 m-3 rounded-xl bg-surface-container border border-outline-variant/40">
            <div className="flex items-center gap-1.5 text-primary mb-1">
              <span className="material-symbols-outlined text-[15px]">lock</span>
              <span className="font-label-sm text-[10px] font-bold uppercase tracking-wider">
                Need-to-Know Auth
              </span>
            </div>
            <p className="font-body-sm text-xs text-outline leading-snug mb-2">
              {user?.clearanceLevel ||
                'Level 3 (Emergency Ops Console - Active Duty Dispatch Clearance)'}
            </p>
            <div className="flex flex-col gap-1 pt-2 border-t border-outline-variant/30 font-label-sm text-[10px] text-on-surface-variant">
              <span className="flex items-center justify-between">
                <span className="text-outline">Emergency 112:</span>
                <span className="text-secondary font-mono font-bold">CONNECTED</span>
              </span>
              <span className="flex items-center justify-between">
                <span className="text-outline">Tourist Line 1363:</span>
                <span className="text-primary font-mono font-bold">ONLINE</span>
              </span>
            </div>
          </div>
        )}
      </aside>

      {/* DEMO MODE PRESENTATION BAR (When Enabled) */}
      {demoModeOpen && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[140] w-[95%] max-w-5xl bg-surface-container-lowest/98 backdrop-blur-md border border-primary/50 rounded-2xl p-4 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-outline-variant/40">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[22px]">
                smart_display
              </span>
              <div>
                <span className="font-headline-md text-body-md font-bold text-on-surface">
                  Master Project Demonstration Controller (DETECT → VERIFY → RESPOND → RESOLVE)
                </span>
                <span className="font-label-sm text-[10px] text-outline block font-mono">
                  Deterministic Simulation Layer • Incident INC-2026-00421 (Arjun Sharma • DTID-8F4K29)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetDemoState}
                className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-sm text-label-sm font-semibold"
              >
                Reset Baseline
              </button>
              <button
                type="button"
                onClick={() => setDemoModeOpen(false)}
                className="w-8 h-8 rounded-lg bg-surface-container-high text-outline hover:text-on-surface flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>

          {/* 8-Step Guided Workflow Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mt-3">
            {[
              { step: 1, label: '1. Command Center', path: '/dashboard' },
              { step: 2, label: '2. Simulate SOS', path: '/dashboard' },
              { step: 3, label: '3. Open & Verify', path: '/incidents/INC-2026-00421' },
              { step: 4, label: '4. Acknowledge', path: '/incidents/INC-2026-00421' },
              { step: 5, label: '5. Assign Alpha-12', path: '/incidents/INC-2026-00421' },
              { step: 6, label: '6. Unit En Route', path: '/response-teams' },
              { step: 7, label: '7. Unit On Scene', path: '/incidents/INC-2026-00421' },
              { step: 8, label: '8. Resolve & E-FIR', path: '/reports/RPT-2026-088' },
            ].map((item) => (
              <button
                key={item.step}
                type="button"
                onClick={() => {
                  advanceMasterDemoStep(item.step);
                  navigate(item.path);
                }}
                className={`px-2.5 py-2 rounded-lg font-label-sm text-[10px] font-bold text-center transition-colors ${
                  demoWorkflowStep === item.step
                    ? 'bg-primary-container text-on-primary-container shadow-xs'
                    : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Controlled Scenarios A - G */}
          <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-2.5 border-t border-outline-variant/30 font-label-sm text-[10px]">
            <span className="text-outline uppercase font-bold mr-1">Scenarios:</span>
            {(
              [
                ['SCENARIO_A_NORMAL', 'A: Normal Ops'],
                ['SCENARIO_B_RISK_ZONE', 'B: Risk Zone Entry'],
                ['SCENARIO_C_ROUTE_DEVIATION', 'C: Route Deviation'],
                ['SCENARIO_D_MISSED_CHECKIN', 'D: Missed Check-In'],
                ['SCENARIO_E_SOS_EMERGENCY', 'E: SOS Emergency'],
                ['SCENARIO_F_RESPONDER_ASSIGN', 'F: Assign Alpha-12'],
                ['SCENARIO_G_RESOLUTION', 'G: Resolve Incident'],
              ] as [DemoScenarioId, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => triggerDemoScenario(id)}
                className="px-2.5 py-1 rounded-md bg-surface-container-high hover:bg-surface-container-highest text-primary font-mono font-semibold"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MAIN CONTENT VIEWPORT */}
      <div className={sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'}>
        <main
          className={`relative w-full ${
            connectivityState !== 'ONLINE' ? 'pt-24' : 'pt-16'
          } bg-surface min-h-screen`}
        >
          {children}
        </main>
      </div>

      {/* GLOBAL TOAST NOTIFICATIONS */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
