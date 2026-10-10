import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './providers/AuthContext';
import { AppShell } from '../components/layout/AppShell';
import { AdminSettingsProfilePage } from '../pages/AdminSettingsProfilePage';
import { AnalyticsReportsAuditPage } from '../pages/AnalyticsReportsAuditPage';
import { AnomalyAndRiskZonesPage } from '../pages/AnomalyAndRiskZonesPage';
import { CommandCenterPage } from '../pages/CommandCenterPage';
import { IncidentDetailPage } from '../pages/IncidentDetailPage';
import { IncidentQueuePage } from '../pages/IncidentQueuePage';
import { LiveOperationsMapPage } from '../pages/LiveOperationsMapPage';
import { LoginPage } from '../pages/LoginPage';
import { ResponseTeamsPage } from '../pages/ResponseTeamsPage';
import { TouristRegistryPage } from '../pages/TouristRegistryPage';

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <AppShell>{children}</AppShell>;
};

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedLayout>
            <CommandCenterPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/live-map"
        element={
          <ProtectedLayout>
            <LiveOperationsMapPage />
          </ProtectedLayout>
        }
      />

      {/* Incidents Routes */}
      <Route
        path="/incidents"
        element={
          <ProtectedLayout>
            <IncidentQueuePage mode="QUEUE" />
          </ProtectedLayout>
        }
      />
      <Route
        path="/incidents/active"
        element={
          <ProtectedLayout>
            <IncidentQueuePage mode="ACTIVE" />
          </ProtectedLayout>
        }
      />
      <Route
        path="/incidents/history"
        element={
          <ProtectedLayout>
            <IncidentQueuePage mode="HISTORY" />
          </ProtectedLayout>
        }
      />
      <Route
        path="/incidents/:incidentId"
        element={
          <ProtectedLayout>
            <IncidentDetailPage />
          </ProtectedLayout>
        }
      />

      {/* Tourists Routes */}
      <Route
        path="/tourists"
        element={
          <ProtectedLayout>
            <TouristRegistryPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/tourists/:touristId"
        element={
          <ProtectedLayout>
            <TouristRegistryPage />
          </ProtectedLayout>
        }
      />

      {/* Risk Zones, Anomalies, Check-ins, Geofence Events */}
      <Route
        path="/risk-zones"
        element={
          <ProtectedLayout>
            <AnomalyAndRiskZonesPage activeSection="RISK_ZONES" />
          </ProtectedLayout>
        }
      />
      <Route
        path="/risk-zones/:zoneId"
        element={
          <ProtectedLayout>
            <AnomalyAndRiskZonesPage activeSection="RISK_ZONES" />
          </ProtectedLayout>
        }
      />
      <Route
        path="/anomalies"
        element={
          <ProtectedLayout>
            <AnomalyAndRiskZonesPage activeSection="ANOMALIES" />
          </ProtectedLayout>
        }
      />
      <Route
        path="/check-ins"
        element={
          <ProtectedLayout>
            <AnomalyAndRiskZonesPage activeSection="CHECKINS" />
          </ProtectedLayout>
        }
      />
      <Route
        path="/geofence-events"
        element={
          <ProtectedLayout>
            <AnomalyAndRiskZonesPage activeSection="GEOFENCE_EVENTS" />
          </ProtectedLayout>
        }
      />

      {/* Response Teams */}
      <Route
        path="/response-teams"
        element={
          <ProtectedLayout>
            <ResponseTeamsPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/response-teams/:unitId"
        element={
          <ProtectedLayout>
            <ResponseTeamsPage />
          </ProtectedLayout>
        }
      />

      {/* Reports, Analytics, Audit Logs */}
      <Route
        path="/reports"
        element={
          <ProtectedLayout>
            <AnalyticsReportsAuditPage activeTab="REPORTS" />
          </ProtectedLayout>
        }
      />
      <Route
        path="/reports/:reportId"
        element={
          <ProtectedLayout>
            <AnalyticsReportsAuditPage activeTab="REPORTS" />
          </ProtectedLayout>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedLayout>
            <AnalyticsReportsAuditPage activeTab="ANALYTICS" />
          </ProtectedLayout>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <ProtectedLayout>
            <AnalyticsReportsAuditPage activeTab="AUDIT_LOGS" />
          </ProtectedLayout>
        }
      />

      {/* Administration, Users, Roles, Settings, Profile */}
      <Route
        path="/users"
        element={
          <ProtectedLayout>
            <AdminSettingsProfilePage section="USERS" />
          </ProtectedLayout>
        }
      />
      <Route
        path="/roles"
        element={
          <ProtectedLayout>
            <AdminSettingsProfilePage section="ROLES" />
          </ProtectedLayout>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedLayout>
            <AdminSettingsProfilePage section="SETTINGS" />
          </ProtectedLayout>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedLayout>
            <AdminSettingsProfilePage section="PROFILE" />
          </ProtectedLayout>
        }
      />

      {/* Default & Catch-All Redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
