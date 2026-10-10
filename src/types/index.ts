export type Role =
  | 'CONTROL_ROOM_OFFICER'
  | 'RESPONDER'
  | 'SUPERVISOR'
  | 'TOURISM_ADMIN'
  | 'SYSTEM_ADMIN';

export type Permission =
  | 'VIEW_DASHBOARD'
  | 'VIEW_INCIDENT'
  | 'ACKNOWLEDGE_INCIDENT'
  | 'VERIFY_INCIDENT'
  | 'ASSIGN_RESPONSE_UNIT'
  | 'ESCALATE_INCIDENT'
  | 'RESOLVE_INCIDENT'
  | 'VIEW_TOURIST'
  | 'VIEW_LOCATION'
  | 'VIEW_EMERGENCY_CONTACT'
  | 'VIEW_RISK_ZONES'
  | 'MANAGE_RISK_ZONES'
  | 'VIEW_ANALYTICS'
  | 'VIEW_AUDIT_LOG'
  | 'MANAGE_USERS'
  | 'MANAGE_ROLES'
  | 'CREATE_REPORT'
  | 'REVIEW_REPORT';

export interface User {
  id: string;
  name: string;
  rank: string;
  badgeNumber: string;
  email: string;
  role: Role;
  unit: string;
  sector: string;
  avatarUrl: string;
  status: 'ACTIVE' | 'ON_PATROL' | 'OFF_DUTY';
  clearanceLevel: string;
  lastLogin: string;
}

export interface Location {
  name: string;
  sector: string;
  lat: number;
  lng: number;
  altitudeMeters: number;
  accuracyMeters: number;
  updatedAt: string;
  minutesAgo: number;
}

export interface LocationHistory {
  id: string;
  touristId: string;
  location: Location;
  timestamp: string;
  status: 'ON_ROUTE' | 'DEVIATION' | 'STATIONARY' | 'SOS_PING' | 'CHECKPOINT';
}

export interface EmergencyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
  city: string;
  isPrimary: boolean;
  verified: boolean;
  lastNotifiedAt?: string;
  notificationStatus?: 'DELIVERED' | 'READ' | 'STANDBY' | 'PENDING';
}

export interface TouristIdentity {
  dtid: string;
  kycStatus: 'FULL_EKYC_VERIFIED' | 'TRANSIT_PERMIT_ISSUED' | 'SELF_REGISTERED';
  digilockerTokenMasked: string;
  permitNumber: string;
  nationality: string;
  age: number;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup: string;
  homeCity: string;
  insurancePolicyNumber: string;
  insuranceCovered: boolean;
}

export interface ItineraryWaypoint {
  id: string;
  order: number;
  name: string;
  plannedTime: string;
  actualTime?: string;
  status: 'DEPARTED' | 'VERIFIED' | 'MISSED' | 'ACTIVE_DISTRESS' | 'UPCOMING';
  coordinates: string;
}

export interface Itinerary {
  id: string;
  tripId: string;
  trailCode: string;
  trailName: string;
  waypoints: ItineraryWaypoint[];
  deviationKm: number;
  slopeHazardDeg: number;
}

export interface Trip {
  id: string;
  touristId: string;
  packageName: string;
  circuit: string;
  startDate: string;
  endDate: string;
  currentDay: number;
  totalDays: number;
  lodgingBase: string;
  nextBase: string;
  guideStatus: string;
  groupSize: number;
  itinerary: Itinerary;
}

export type SafetyStatus =
  | 'CRITICAL_SOS'
  | 'HIGH_CONCERN'
  | 'CHECKIN_OVERDUE'
  | 'INACTIVITY_ALERT'
  | 'GEOFENCE_WARNING'
  | 'NORMAL';

export interface Tourist {
  id: string;
  name: string;
  dtid: string;
  avatarUrl: string;
  phone: string;
  identity: TouristIdentity;
  trip: Trip;
  safetyStatus: SafetyStatus;
  location: Location;
  locationConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  device: {
    model: string;
    appVersion: string;
    batteryPercent: number;
    powerSaver: boolean;
    networkStatus: string;
    btsTower: string;
    bleBeaconActive: boolean;
    heartRateBpm?: number;
    heartRateNote?: string;
    motionState: string;
    panicTriggerNote?: string;
  };
  emergencyContacts: EmergencyContact[];
  locationHistory: LocationHistory[];
  activeIncidentId?: string;
  checkInStatus: 'OK' | 'DUE' | 'MISSED' | 'ESCALATED';
  lastCheckInTime: string;
  alertsCount: number;
}

export type IncidentSeverity =
  | 'CRITICAL'
  | 'HIGH'
  | 'CONCERN'
  | 'VERIFICATION'
  | 'WARNING'
  | 'NORMAL';

export type IncidentStatus =
  | 'NEW'
  | 'ACTIVE'
  | 'ACKNOWLEDGED'
  | 'VERIFYING'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'ON_SCENE'
  | 'RESOLVING'
  | 'RESOLVED'
  | 'UNFOUNDED';

export type IncidentType =
  | 'SOS'
  | 'ROUTE_DEVIATION'
  | 'INACTIVITY_ANOMALY'
  | 'MISSED_CHECKIN'
  | 'GEOFENCE_BREACH'
  | 'MEDICAL_ASSIST';

export type ResolutionType =
  | 'Resolved'
  | 'Assisted Tourist'
  | 'Medical Assistance'
  | 'Reunited'
  | 'False / Unfounded'
  | 'Other';

export interface IncidentTimelineEvent {
  id: string;
  incidentId: string;
  timestamp: string;
  title: string;
  description: string;
  actor: string;
  category: 'INGESTION' | 'ANOMALY' | 'SOS' | 'COMMAND' | 'DISPATCH' | 'RESOLUTION';
  highlight?: 'CRITICAL' | 'PRIMARY' | 'WARNING' | 'NORMAL';
}

export interface Incident {
  id: string;
  severity: IncidentSeverity;
  tierLabel: string;
  type: IncidentType;
  title: string;
  triggerDescription: string;
  touristId: string;
  touristName: string;
  dtid: string;
  touristAge: number;
  touristOrigin: string;
  touristAvatar: string;
  location: Location;
  status: IncidentStatus;
  assignedUnitId: string | null;
  assignedUnitName: string | null;
  backupUnitName?: string;
  acknowledgedBy?: string;
  verifiedBy?: string;
  verificationState: 'VERIFICATION_REQUIRED' | 'VERIFYING_SIGNALS' | 'VERIFIED' | 'UNFOUNDED';
  aiAssessment: {
    confidencePercent: number;
    modelVersion: string;
    summary: string;
    signals: {
      label: string;
      weight: string;
      severity: 'CRITICAL' | 'WARNING' | 'INFO';
      icon: string;
    }[];
  };
  connectivityNote: string;
  locationConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  environmentalRisk: {
    weatherSummary: string;
    fogIndexPercent: number;
    visibilityMeters: number;
    sunsetRemaining: string;
    terrainGradientDeg: number;
  };
  fieldPhotoUrl?: string;
  fieldPhotoCaption?: string;
  createdAt: string;
  lastUpdatedAt: string;
  elapsedTimeText: string;
  timeline: IncidentTimelineEvent[];
  resolution?: {
    type: ResolutionType;
    notes: string;
    resolvedBy: string;
    resolvedAt: string;
  };
}

export interface RiskZone {
  id: string;
  geoId: string;
  name: string;
  sector: string;
  riskLevel: 'HIGH_RISK' | 'ELEVATED' | 'MODERATE';
  category:
    | 'CURFEW_GORGE'
    | 'FLASH_FLOOD'
    | 'WATER_BUFFER'
    | 'CAVE_HAZARD'
    | 'CLIFF_RESTRICTED'
    | 'LANDSLIDE_BLOCKADE'
    | 'CROWD_HOTSPOT'
    | 'VIP_SECURITY_CORDON';
  shapeType?: 'POLYGON' | 'CIRCLE_HOTSPOT';
  polygonCoords?: [number, number][];
  radiusMeters?: number;
  activeHours: string;
  reason: string;
  touristCount: number;
  incidentCount: number;
  geofenceStatus: 'ACTIVE' | 'ADVISORY_ONLY' | 'PAUSED';
  weatherHookText: string;
  requirements: string;
  coordinatesCenter: { lat: number; lng: number };
  svgPolygonPoints: string;
  mapX: number;
  mapY: number;
  createdBy?: string;
  createdAt?: string;
  autoBroadcastAlert?: boolean;
}

export interface GeoFenceEvent {
  id: string;
  touristId: string;
  touristName: string;
  dtid: string;
  zoneId: string;
  zoneName: string;
  geoId: string;
  event: 'APPROACHING' | 'ENTERED' | 'EXITED' | 'RESTRICTED_TIME_ENTRY' | 'REPEATED_ENTRY';
  timestamp: string;
  severity: IncidentSeverity;
  actionTaken: string;
}

export interface Anomaly {
  id: string;
  touristId: string;
  touristName: string;
  dtid: string;
  touristAge: number;
  touristMeta: string;
  initials: string;
  type:
    | 'ROUTE_DEVIATION'
    | 'PROLONGED_INACTIVITY'
    | 'UNEXPECTED_LOCATION_CHANGE'
    | 'MISSED_CHECKIN'
    | 'RISK_ZONE_ENTRY'
    | 'COMBINED_RISK_PATTERN';
  severity: 'CRITICAL_CONCERN' | 'ELEVATED_CONCERN' | 'MODERATE_ANOMALY' | 'GEOFENCE_BUFFER_BREACH';
  heuristicScore: number;
  confidencePercent: number;
  locationName: string;
  coordinatesText: string;
  detectedTime: string;
  relativeTime: string;
  status: 'PROMOTED_TO_EMERGENCY' | 'VERIFICATION_REQUIRED' | 'AWAITING_OPERATOR' | 'DISMISSED' | 'VERIFIED';
  linkedIncidentId?: string;
  signals: {
    category: string;
    value: string;
    detail: string;
  }[];
  diagnosticNote: string;
}

export interface CheckIn {
  id: string;
  touristId: string;
  touristName: string;
  dtid: string;
  waypointName: string;
  circuit: string;
  scheduledTime: string;
  actualTime?: string;
  status: 'UPCOMING' | 'DUE' | 'MISSED' | 'COMPLETED' | 'ESCALATED';
  overdueMinutes?: number;
  batteryPercent: number;
  signalStrength: string;
  notes: string;
}

export type ResponseUnitStatus = 'AVAILABLE' | 'EN_ROUTE' | 'ON_SCENE' | 'BUSY' | 'OFFLINE';

export interface ResponseUnit {
  id: string;
  code: string;
  name: string;
  vehicleType: string;
  vehicleIcon: string;
  registrationNo: string;
  radioChannel: string;
  leadOfficer: string;
  officers: string[];
  personnelCount: number;
  status: ResponseUnitStatus;
  statusBadgeText: string;
  locationName: string;
  sector: string;
  distanceKm: number;
  speedKmh: number;
  etaText: string;
  currentIncidentId: string | null;
  specialty: string;
  equipment: string[];
  shiftHours: string;
  fuelPercent: number;
  mapX: number;
  mapY: number;
  matchScorePercent?: number;
}

export type ResponseTeam = ResponseUnit;

export interface Alert {
  id: string;
  title: string;
  severity: IncidentSeverity;
  touristId: string;
  touristName: string;
  incidentId?: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface IncidentReport {
  id: string;
  caseFileNumber: string;
  incidentId: string;
  touristId: string;
  touristName: string;
  dtid: string;
  permitNo: string;
  tripPackage: string;
  subscriberPhone: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  occurrenceTimestamp: string;
  severityClassification: string;
  placeOfOccurrence: string;
  coordinatesText: string;
  cellTowerInfo: string;
  factualNarrative: string;
  defaultNarrative: string;
  assignedUnitName: string;
  leadOfficerName: string;
  onSceneArrivalTime: string;
  baseCampEscortTime: string;
  fieldFindings: string;
  medicalTriage: string;
  propertyIntegrity: string;
  sosResetStatus: string;
  reviewingOfficer: string;
  reviewingBadge: string;
  status: 'DRAFT_PENDING_REVIEW' | 'OFFICER_REVIEWED' | 'SUBMITTED_TO_DIARY';
  checklist: {
    telemetryVerified: boolean;
    medicalConfirmed: boolean;
    kinBriefed: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  officerName: string;
  officerBadge: string;
  role: Role;
  action: string;
  resource: string;
  resourceId: string;
  timestamp: string;
  result: 'AUTHORIZED' | 'SUCCESS' | 'VERIFIED' | 'RESTRICTED';
  details: string;
  hashSignature: string;
}

export interface Notification {
  id: string;
  type: 'CRITICAL_INCIDENT' | 'HIGH_PRIORITY' | 'VERIFICATION' | 'RESPONSE_ASSIGNMENT' | 'SYSTEM_WARNING';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  linkTo: string;
  resourceId?: string;
}

export interface DashboardMetric {
  id: string;
  label: string;
  value: string | number;
  unitLabel: string;
  subtext: string;
  trend?: string;
  variant: 'CRITICAL' | 'WARNING' | 'PRIMARY' | 'NEUTRAL';
}

export type SystemConnectivityState = 'ONLINE' | 'LIMITED' | 'OFFLINE';

export type DemoScenarioId =
  | 'SCENARIO_A_NORMAL'
  | 'SCENARIO_B_RISK_ZONE'
  | 'SCENARIO_C_ROUTE_DEVIATION'
  | 'SCENARIO_D_MISSED_CHECKIN'
  | 'SCENARIO_E_SOS_EMERGENCY'
  | 'SCENARIO_F_RESPONDER_ASSIGN'
  | 'SCENARIO_G_RESOLUTION';
