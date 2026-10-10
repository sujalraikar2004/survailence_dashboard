import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../app/providers/AuthContext';
import { useOperational } from '../app/providers/OperationalContext';
import {
  MapDrawingMode,
  MapEntityFilter,
  MapLegend,
  MapStyleMode,
  MapView,
  SECTOR_VIEWPORTS,
} from '../components/maps/TacticalMapAbstraction';
import { SafeImage } from '../components/ui/CommonUi';
import { STITCH_ASSETS } from '../mock/mockData';
import { Incident, RiskZone } from '../types';

type InspectorTabMode = 'INCIDENT' | 'ZONE_INSPECTOR' | 'FENCE_BUILDER';

const TACTICAL_PRESETS: {
  label: string;
  name: string;
  category: RiskZone['category'];
  riskLevel: RiskZone['riskLevel'];
  shapeType: 'POLYGON' | 'CIRCLE_HOTSPOT';
  radiusMeters: number;
  activeHours: string;
  reason: string;
  requirements: string;
}[] = [
  {
    label: 'Landslide Blockade',
    name: 'NH-40 Dawki Road Landslide Cordon',
    category: 'LANDSLIDE_BLOCKADE',
    riskLevel: 'HIGH_RISK',
    shapeType: 'CIRCLE_HOTSPOT',
    radiusMeters: 550,
    activeHours: '24/7 Immediate Road & Slope Closure',
    reason:
      'Active slope failure and boulder debris slide reported by patrol. Strict no-entry perimeter enforced.',
    requirements: 'Police / SDRF clearance only; reroute all tourist vehicles via alternative ridge',
  },
  {
    label: 'Crowd / Security Hotspot',
    name: 'Police Bazaar Commercial Hotspot Cordon',
    category: 'CROWD_HOTSPOT',
    riskLevel: 'ELEVATED',
    shapeType: 'CIRCLE_HOTSPOT',
    radiusMeters: 400,
    activeHours: '16:00 - 23:00 IST High-Density Watch',
    reason:
      'High tourist footfall congestion and pickpocket/traffic bottleneck hotspot requiring active patrol monitoring.',
    requirements: 'Foot patrol surveillance + automated tourist app caution notification',
  },
  {
    label: 'Flash Flood Gorge',
    name: 'Wah Kaba Falls Downstream Surge Fence',
    category: 'FLASH_FLOOD',
    riskLevel: 'HIGH_RISK',
    shapeType: 'POLYGON',
    radiusMeters: 700,
    activeHours: '24/7 Heavy Rainfall Surge Alert',
    reason:
      'Sudden upstream catchment release causing rapid water level surge along canyon streambed.',
    requirements: 'Immediate evacuation of lower gorge trails + siren broadcast',
  },
  {
    label: 'Night Curfew Cliff',
    name: 'Laitlum Escarpment Night Curfew Fence',
    category: 'CLIFF_RESTRICTED',
    riskLevel: 'HIGH_RISK',
    shapeType: 'POLYGON',
    radiusMeters: 600,
    activeHours: '17:00 - 06:00 IST Night Curfew',
    reason:
      'Unfenced 600m sheer gorge drop with dense evening mountain fog (<80m visibility) and weak cellular coverage.',
    requirements: 'Mandatory daylight exit before 17:00 IST; BLE beacon required',
  },
];

export const LiveOperationsMapPage: React.FC = () => {
  const { user, can } = useAuth();
  const {
    incidents,
    riskZones,
    responseUnits,
    saveRiskZone,
    deleteRiskZone,
    toggleRiskZoneStatus,
    showToast,
  } = useOperational();
  const navigate = useNavigate();

  const [selectedSector, setSelectedSector] = useState(
    'Meghalaya East Khasi Hills / Shillong Sector'
  );
  const [timeWindow, setTimeWindow] = useState<'15m' | '1h' | 'today' | 'custom'>('1h');
  const [mapStyle, setMapStyle] = useState<MapStyleMode>('tactical');
  const [activeFilter, setActiveFilter] = useState<MapEntityFilter>('ALL');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(true);
  const [inspectorTab, setInspectorTab] = useState<InspectorTabMode>('INCIDENT');

  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('INC-2026-00421');
  const [selectedZoneId, setSelectedZoneId] = useState<string>(riskZones[0]?.id || 'RZ-01');

  // Interactive Police Geofence / Hotspot Marking State
  const [drawingMode, setDrawingMode] = useState<MapDrawingMode>('NONE');
  const [draftPolygonPoints, setDraftPolygonPoints] = useState<[number, number][]>([]);
  const [draftHotspotCenter, setDraftHotspotCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [draftHotspotRadius, setDraftHotspotRadius] = useState<number>(500);

  // Fence / Hotspot Form State
  const [fenceName, setFenceName] = useState<string>('');
  const [fenceGeoId, setFenceGeoId] = useState<string>(
    `#GF-${String(riskZones.length + 15).padStart(2, '0')}`
  );
  const [fenceRiskLevel, setFenceRiskLevel] = useState<RiskZone['riskLevel']>('HIGH_RISK');
  const [fenceCategory, setFenceCategory] = useState<RiskZone['category']>('CLIFF_RESTRICTED');
  const [fenceActiveHours, setFenceActiveHours] = useState<string>('24/7 Immediate Enforcement');
  const [fenceReason, setFenceReason] = useState<string>('');
  const [fenceRequirements, setFenceRequirements] = useState<string>(
    'Police perimeter clearance required; tourist app push alert active'
  );
  const [autoBroadcastAlert, setAutoBroadcastAlert] = useState<boolean>(true);
  const [fenceError, setFenceError] = useState<string | null>(null);

  const selectedIncident: Incident = useMemo(
    () =>
      incidents.find((i) => i.id === selectedIncidentId) ||
      incidents.find((i) => i.id === 'INC-2026-00421') ||
      incidents[0],
    [incidents, selectedIncidentId]
  );

  const selectedZone: RiskZone | undefined = useMemo(
    () => riskZones.find((z) => z.id === selectedZoneId) || riskZones[0],
    [riskZones, selectedZoneId]
  );

  const criticalCount = useMemo(
    () =>
      incidents.filter(
        (i) => i.severity === 'CRITICAL' && i.status !== 'RESOLVED' && i.status !== 'UNFOUNDED'
      ).length,
    [incidents]
  );

  const handleSelectIncident = (inc: Incident) => {
    setSelectedIncidentId(inc.id);
    setInspectorTab('INCIDENT');
    setInspectorOpen(true);
  };

  const handleSelectZoneOnMap = (zone: RiskZone) => {
    setSelectedZoneId(zone.id);
    setInspectorTab('ZONE_INSPECTOR');
    setInspectorOpen(true);
  };

  const startFencingMode = (initialMode: 'POLYGON' | 'CIRCLE_HOTSPOT' = 'POLYGON') => {
    setDrawingMode(initialMode);
    setDraftPolygonPoints([]);
    const sectorCenter =
      SECTOR_VIEWPORTS[selectedSector]?.center ||
      SECTOR_VIEWPORTS['Meghalaya East Khasi Hills / Shillong Sector'].center;
    if (initialMode === 'CIRCLE_HOTSPOT') {
      setDraftHotspotCenter({ lat: sectorCenter[0], lng: sectorCenter[1] });
    } else {
      setDraftHotspotCenter(null);
    }
    setFenceGeoId(`#GF-${String(riskZones.length + 16).padStart(2, '0')}`);
    setFenceError(null);
    setInspectorTab('FENCE_BUILDER');
    setInspectorOpen(true);
    showToast(
      initialMode === 'POLYGON'
        ? 'Polygon Fence Mode active: Click 3+ points on the OpenStreetMap to mark perimeter.'
        : 'Hotspot Cordon Mode active: Click anywhere on the map to position the hotspot center.',
      'PRIMARY'
    );
  };

  const exitFencingMode = () => {
    setDrawingMode('NONE');
    setDraftPolygonPoints([]);
    setDraftHotspotCenter(null);
    setFenceError(null);
    setInspectorTab('ZONE_INSPECTOR');
  };

  const handleMapDrawClick = (lat: number, lng: number) => {
    setFenceError(null);
    if (drawingMode === 'POLYGON') {
      setDraftPolygonPoints((prev) => [...prev, [lat, lng]]);
    } else if (drawingMode === 'CIRCLE_HOTSPOT') {
      setDraftHotspotCenter({ lat, lng });
    }
  };

  const applyTacticalPreset = (preset: (typeof TACTICAL_PRESETS)[number]) => {
    setFenceName(preset.name);
    setFenceCategory(preset.category);
    setFenceRiskLevel(preset.riskLevel);
    setFenceActiveHours(preset.activeHours);
    setFenceReason(preset.reason);
    setFenceRequirements(preset.requirements);
    setDraftHotspotRadius(preset.radiusMeters);
    setDrawingMode(preset.shapeType);
    setFenceError(null);

    const sectorCenter =
      SECTOR_VIEWPORTS[selectedSector]?.center ||
      SECTOR_VIEWPORTS['Meghalaya East Khasi Hills / Shillong Sector'].center;
    const cLat = sectorCenter[0];
    const cLng = sectorCenter[1];

    if (preset.shapeType === 'CIRCLE_HOTSPOT') {
      if (!draftHotspotCenter) {
        setDraftHotspotCenter({ lat: cLat, lng: cLng });
      }
    } else {
      if (draftPolygonPoints.length < 3) {
        setDraftPolygonPoints([
          [cLat + 0.008, cLng - 0.01],
          [cLat + 0.01, cLng + 0.011],
          [cLat - 0.007, cLng + 0.013],
          [cLat - 0.009, cLng - 0.008],
        ]);
      }
    }
    showToast(`Applied tactical preset: "${preset.label}". Adjust on map or deploy.`, 'PRIMARY');
  };

  const autoGenerateGeometryInSector = () => {
    const sectorCenter =
      SECTOR_VIEWPORTS[selectedSector]?.center ||
      SECTOR_VIEWPORTS['Meghalaya East Khasi Hills / Shillong Sector'].center;
    const cLat = sectorCenter[0];
    const cLng = sectorCenter[1];

    if (drawingMode === 'CIRCLE_HOTSPOT') {
      setDraftHotspotCenter({ lat: cLat, lng: cLng });
      showToast('Placed hotspot center at current sector focal coordinates.', 'PRIMARY');
    } else {
      setDraftPolygonPoints([
        [cLat + 0.0085, cLng - 0.0105],
        [cLat + 0.0105, cLng + 0.0115],
        [cLat - 0.0075, cLng + 0.013],
        [cLat - 0.0095, cLng - 0.0085],
      ]);
      showToast('Generated 4-vertex perimeter polygon in current sector.', 'PRIMARY');
    }
    setFenceError(null);
  };

  const handleDeployNewFence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fenceName.trim() || !fenceGeoId.trim() || !fenceReason.trim()) {
      setFenceError('Please provide a Zone/Hotspot Name, Geo-ID, and Hazard/Enforcement Reason.');
      return;
    }

    if (drawingMode === 'POLYGON' && draftPolygonPoints.length < 3) {
      setFenceError(
        'Please click at least 3 points on the OpenStreetMap to form a restricted polygon (or click "Auto-Place in Sector").'
      );
      return;
    }

    if (drawingMode === 'CIRCLE_HOTSPOT' && !draftHotspotCenter) {
      setFenceError(
        'Please click on the OpenStreetMap to set the hotspot center point (or click "Auto-Place in Sector").'
      );
      return;
    }

    const centerCoords =
      drawingMode === 'CIRCLE_HOTSPOT' && draftHotspotCenter
        ? draftHotspotCenter
        : {
            lat:
              draftPolygonPoints.reduce((acc, p) => acc + p[0], 0) /
              Math.max(draftPolygonPoints.length, 1),
            lng:
              draftPolygonPoints.reduce((acc, p) => acc + p[1], 0) /
              Math.max(draftPolygonPoints.length, 1),
          };

    const estimatedDevicesInside =
      drawingMode === 'CIRCLE_HOTSPOT'
        ? Math.max(3, Math.round(draftHotspotRadius / 45))
        : Math.max(5, draftPolygonPoints.length * 4);

    const newZone: RiskZone = {
      id: `RZ-${Date.now()}`,
      geoId: fenceGeoId.trim().startsWith('#') ? fenceGeoId.trim() : `#${fenceGeoId.trim()}`,
      name: fenceName.trim(),
      sector: selectedSector,
      riskLevel: fenceRiskLevel,
      category: fenceCategory,
      shapeType: drawingMode === 'CIRCLE_HOTSPOT' ? 'CIRCLE_HOTSPOT' : 'POLYGON',
      polygonCoords: drawingMode === 'POLYGON' ? draftPolygonPoints : undefined,
      radiusMeters: drawingMode === 'CIRCLE_HOTSPOT' ? draftHotspotRadius : undefined,
      activeHours: fenceActiveHours.trim() || '24/7 Active Enforcement',
      reason: fenceReason.trim(),
      touristCount: estimatedDevicesInside,
      incidentCount: fenceRiskLevel === 'HIGH_RISK' ? 1 : 0,
      geofenceStatus: 'ACTIVE',
      weatherHookText: 'Police Command Tactical Cordon • Real-Time GIS Synced',
      requirements:
        fenceRequirements.trim() || 'Mandatory compliance with police perimeter instructions',
      coordinatesCenter: centerCoords,
      svgPolygonPoints: '500,300 580,290 600,370 510,380',
      mapX: 540,
      mapY: 340,
      createdBy: user?.name || 'Inspector Ananya Sharma',
      createdAt: 'Just now',
      autoBroadcastAlert,
    };

    saveRiskZone(newZone);
    setSelectedZoneId(newZone.id);
    setDrawingMode('NONE');
    setDraftPolygonPoints([]);
    setDraftHotspotCenter(null);
    setFenceName('');
    setFenceReason('');
    setInspectorTab('ZONE_INSPECTOR');
  };

  return (
    <div
      className="relative w-full flex flex-col bg-surface-container-lowest overflow-hidden select-none"
      style={{ height: 'calc(100vh - 4rem)' }}
    >
      {/* TOP MAP CONTROL & FILTER STRIP */}
      <section className="shrink-0 z-30 bg-surface-container/95 backdrop-blur-md px-space-md py-space-sm flex flex-col gap-space-xs shadow-md border-b border-outline-variant/20">
        {/* Upper Strip: Sector, Time Range, Tile Layer & Tactical Meta */}
        <div className="flex items-center justify-between gap-space-md flex-wrap">
          <div className="flex items-center gap-space-md flex-wrap">
            <div className="flex items-center gap-space-xs bg-surface-container-high px-2.5 py-1.5 rounded-lg shadow-inner">
              <span className="material-symbols-outlined text-[17px] text-primary">radar</span>
              <div className="flex flex-col">
                <span className="font-label-sm text-[9px] text-outline uppercase tracking-wider">
                  COMMAND SECTOR
                </span>
                <select
                  value={selectedSector}
                  onChange={(e) => {
                    setSelectedSector(e.target.value);
                    showToast(`Switched GIS sector to ${e.target.value}.`, 'PRIMARY');
                  }}
                  className="bg-transparent font-headline-md text-headline-md text-on-surface focus:outline-none cursor-pointer"
                >
                  <option className="bg-surface-container-high text-on-surface">
                    Meghalaya East Khasi Hills / Shillong Sector
                  </option>
                  <option className="bg-surface-container-high text-on-surface">
                    Sohra / Cherrapunji Canyon Sector
                  </option>
                  <option className="bg-surface-container-high text-on-surface">
                    Dawki — Umngot River Corridor
                  </option>
                  <option className="bg-surface-container-high text-on-surface">
                    All Meghalaya Statewide Grid
                  </option>
                </select>
              </div>
            </div>

            {/* Time Window Toggle */}
            <div className="hidden xl:flex items-center bg-surface-container-lowest p-0.5 rounded-lg">
              {(
                [
                  ['15m', '15m'],
                  ['1h', '1h Active'],
                  ['today', 'Today'],
                  ['custom', 'Custom'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTimeWindow(key)}
                  className={`px-2.5 py-1 rounded font-label-md text-label-md transition-colors flex items-center gap-1 ${
                    timeWindow === key
                      ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span>{label}</span>
                  {key === 'custom' && (
                    <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-space-sm flex-wrap">
            {/* Tactical Map Layer Style Mode */}
            <div className="flex items-center bg-surface-container-lowest p-0.5 rounded-lg border border-outline-variant/20">
              {(
                [
                  ['tactical', 'dark_mode', 'Tactical Dark'],
                  ['street', 'map', 'OpenStreetMap'],
                  ['satellite', 'satellite_alt', 'Satellite'],
                  ['terrain', 'terrain', 'Topo'],
                ] as [MapStyleMode, string, string][]
              ).map(([mode, icon, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setMapStyle(mode)}
                  className={`px-2.5 py-1 rounded font-label-md text-label-md flex items-center gap-1 transition-colors ${
                    mapStyle === mode
                      ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Police Mark Restricted Area / Hotspot Fencing Button */}
            <div className="flex items-center gap-space-xs">
              {drawingMode === 'NONE' ? (
                <button
                  type="button"
                  onClick={() => startFencingMode('POLYGON')}
                  className="h-8 px-3 rounded-lg bg-tertiary-container text-on-tertiary font-headline-md text-headline-md font-bold flex items-center gap-1.5 shadow-md hover:opacity-95 transition-opacity"
                >
                  <span className="material-symbols-outlined text-[16px]">add_location_alt</span>
                  <span>Mark Restricted / Hotspot</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={exitFencingMode}
                  className="h-8 px-3 rounded-lg bg-surface-container-highest border border-secondary text-secondary font-headline-md text-headline-md font-bold flex items-center gap-1.5 shadow-md hover:bg-secondary-container/30 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                  <span>Exit Fencing Mode</span>
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  showToast(
                    'Sector-wide Emergency Advisory broadcasted to all active tourist devices and patrols.',
                    'CRITICAL'
                  )
                }
                className="h-8 px-3 rounded-lg bg-secondary-container hover:opacity-90 text-on-secondary-container font-headline-md text-headline-md flex items-center gap-1 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px] animate-pulse">
                  crisis_alert
                </span>
                <span className="hidden sm:inline">BROADCAST ALL</span>
              </button>
            </div>
          </div>
        </div>

        {/* Lower Strip: High-Triage Filter Chips */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 no-scrollbar">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveFilter('ALL')}
              className={`shrink-0 px-2.5 py-1 rounded-full font-label-md text-label-md flex items-center gap-1 transition-colors ${
                activeFilter === 'ALL'
                  ? 'bg-primary-container text-on-primary-container font-bold'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-variant'
              }`}
            >
              <span className="font-bold">ALL</span>
              <span className="opacity-80 font-mono">(1,284)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('EMERGENCIES')}
              className={`shrink-0 px-2.5 py-1 rounded-full font-label-md text-label-md flex items-center gap-1.5 shadow-sm transition-colors ${
                activeFilter === 'EMERGENCIES'
                  ? 'bg-secondary-container text-on-secondary-container ring-1 ring-white'
                  : 'bg-secondary-container/40 text-secondary hover:bg-secondary-container/60'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-80"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
              </span>
              <span className="font-bold tracking-wider">EMERGENCIES</span>
              <span className="px-1.5 py-0.2 bg-secondary-container text-on-secondary-container font-mono text-[10px] rounded font-bold">
                {criticalCount} CRITICAL
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('HIGH_PRIORITY')}
              className={`shrink-0 px-2.5 py-1 rounded-full font-label-md text-label-md flex items-center gap-1 transition-colors ${
                activeFilter === 'HIGH_PRIORITY'
                  ? 'bg-tertiary-container text-on-tertiary font-bold'
                  : 'bg-tertiary-container/30 text-tertiary hover:bg-tertiary-container/40'
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">warning</span>
              <span>HIGH PRIORITY</span>
              <span className="font-mono">(8)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('RESPONSE_UNITS')}
              className={`shrink-0 px-2.5 py-1 rounded-full font-label-md text-label-md flex items-center gap-1 transition-colors ${
                activeFilter === 'RESPONSE_UNITS'
                  ? 'bg-primary-container text-on-primary-container font-bold'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[13px] text-primary">
                local_police
              </span>
              <span>PATROLS</span>
              <span className="text-primary font-mono">({responseUnits.length} ACTIVE)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveFilter('RISK_ZONES');
                setInspectorTab('ZONE_INSPECTOR');
                setInspectorOpen(true);
              }}
              className={`shrink-0 px-2.5 py-1 rounded-full font-label-md text-label-md flex items-center gap-1 transition-colors ${
                activeFilter === 'RISK_ZONES'
                  ? 'bg-primary-container text-on-primary-container font-bold'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[13px] text-secondary">
                shield_lock
              </span>
              <span>RESTRICTED ZONES &amp; HOTSPOTS</span>
              <span className="font-mono opacity-80">({riskZones.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('TOURISTS')}
              className={`shrink-0 px-2.5 py-1 rounded-full font-label-md text-label-md flex items-center gap-1 transition-colors ${
                activeFilter === 'TOURISTS'
                  ? 'bg-primary-container text-on-primary-container font-bold'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[13px] text-primary">groups</span>
              <span>TOURISTS</span>
              <span className="font-mono opacity-80">(1,284)</span>
            </button>
          </div>
        </div>
      </section>

      {/* NON-OVERLAPPING POLICE GEOFENCE & HOTSPOT DRAWING STUDIO RIBBON (When Active) */}
      {drawingMode !== 'NONE' && (
        <div className="shrink-0 z-20 bg-[#131b2e] border-b border-tertiary/40 px-space-md py-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-2 py-0.5 rounded bg-tertiary-container text-on-tertiary font-mono font-bold text-[10px] uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary animate-ping" />
              POLICE GEOFENCE STUDIO
            </span>

            {/* Tool Selector: Polygon Fence vs Circular Hotspot */}
            <div className="flex items-center bg-surface-container-lowest p-0.5 rounded-lg border border-outline-variant/30">
              <button
                type="button"
                onClick={() => setDrawingMode('POLYGON')}
                className={`px-2.5 py-1 rounded font-label-sm text-label-sm flex items-center gap-1 transition-colors ${
                  drawingMode === 'POLYGON'
                    ? 'bg-primary-container text-on-primary-container font-bold'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">polyline</span>
                <span>Draw Polygon Fence</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDrawingMode('CIRCLE_HOTSPOT');
                  if (!draftHotspotCenter) {
                    const center =
                      SECTOR_VIEWPORTS[selectedSector]?.center ||
                      SECTOR_VIEWPORTS['Meghalaya East Khasi Hills / Shillong Sector'].center;
                    setDraftHotspotCenter({ lat: center[0], lng: center[1] });
                  }
                }}
                className={`px-2.5 py-1 rounded font-label-sm text-label-sm flex items-center gap-1 transition-colors ${
                  drawingMode === 'CIRCLE_HOTSPOT'
                    ? 'bg-primary-container text-on-primary-container font-bold'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">radar</span>
                <span>Mark Hotspot Radius</span>
              </button>
            </div>

            {/* Risk Level Selector */}
            <div className="flex items-center bg-surface-container-lowest p-0.5 rounded-lg border border-outline-variant/30">
              {(
                [
                  ['HIGH_RISK', 'Restricted (Red)', 'text-secondary'],
                  ['ELEVATED', 'Hotspot (Amber)', 'text-tertiary'],
                  ['MODERATE', 'Buffer (Cyan)', 'text-primary'],
                ] as const
              ).map(([lvl, label, col]) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setFenceRiskLevel(lvl)}
                  className={`px-2 py-1 rounded font-label-sm text-[10px] font-bold transition-colors ${
                    fenceRiskLevel === lvl
                      ? 'bg-surface-container-highest text-on-surface ring-1 ring-outline-variant'
                      : `${col} opacity-75 hover:opacity-100`
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Radius Slider when in Circle Hotspot Mode */}
            {drawingMode === 'CIRCLE_HOTSPOT' && (
              <div className="flex items-center gap-2 bg-surface-container-lowest px-2.5 py-1 rounded-lg border border-outline-variant/25 font-mono text-[11px]">
                <span className="text-outline">Radius:</span>
                <input
                  type="range"
                  min={150}
                  max={2500}
                  step={50}
                  value={draftHotspotRadius}
                  onChange={(e) => setDraftHotspotRadius(Number(e.target.value))}
                  className="w-24 accent-amber-400 cursor-pointer"
                />
                <span className="text-tertiary font-bold">{draftHotspotRadius}m</span>
              </div>
            )}

            {/* Vertex Counter & Undo/Clear when in Polygon Mode */}
            {drawingMode === 'POLYGON' && (
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="px-2 py-1 rounded bg-surface-container-lowest text-primary border border-outline-variant/25">
                  {draftPolygonPoints.length} Vertices Placed{' '}
                  {draftPolygonPoints.length < 3 ? '(Click 3+ points on map)' : '✓ Ready'}
                </span>
                {draftPolygonPoints.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setDraftPolygonPoints((prev) => prev.slice(0, -1))}
                      className="px-2 py-1 rounded bg-surface-container-high hover:bg-surface-variant text-on-surface text-[10px]"
                    >
                      Undo Point
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraftPolygonPoints([])}
                      className="px-2 py-1 rounded bg-surface-container-high hover:bg-surface-variant text-secondary text-[10px]"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Quick Tactical Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-label-sm text-[10px] text-outline uppercase">Quick Presets:</span>
            {TACTICAL_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyTacticalPreset(preset)}
                className="px-2 py-1 rounded bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-sm text-[10px] border border-outline-variant/25 transition-colors"
              >
                + {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CENTER CORE: FULL-WIDTH OPENSTREETMAP CONTAINER + DOCKED INSPECTOR */}
      <div className="relative flex-1 w-full min-h-0 overflow-hidden bg-surface-container-lowest flex">
        <MapView
          incidents={incidents}
          riskZones={riskZones}
          responseUnits={responseUnits}
          selectedIncidentId={selectedIncident?.id || null}
          selectedZoneId={inspectorTab === 'ZONE_INSPECTOR' ? selectedZone?.id || null : null}
          onSelectIncident={handleSelectIncident}
          onSelectUnit={(unit) => navigate(`/response-teams/${unit.id}`)}
          onSelectZone={handleSelectZoneOnMap}
          activeFilter={activeFilter}
          mapStyle={mapStyle}
          selectedSector={selectedSector}
          drawingMode={drawingMode}
          draftPolygonPoints={draftPolygonPoints}
          draftHotspotCenter={draftHotspotCenter}
          draftHotspotRadius={draftHotspotRadius}
          draftRiskLevel={fenceRiskLevel}
          onMapDrawClick={handleMapDrawClick}
          zoom={zoom}
          pan={pan}
          onZoomIn={() => setZoom((z) => Math.min(2.2, +(z + 0.2).toFixed(2)))}
          onZoomOut={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(2)))}
          onResetView={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          onPanChange={setPan}
        />

        {/* Reopen Inspector Button if Closed */}
        {!inspectorOpen && (
          <button
            type="button"
            onClick={() => setInspectorOpen(true)}
            className="absolute top-3 right-3 z-30 px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant/40 text-on-surface font-label-md text-label-md font-bold shadow-xl flex items-center gap-2 hover:bg-surface-variant"
          >
            <span className="w-2 h-2 rounded-full bg-secondary animate-ping" />
            <span>Open Operations Console</span>
          </button>
        )}

        {/* RIGHT DOCKED TACTICAL PANEL (Supports Incident Target, Geofence Inspector, and Fence Builder) */}
        {inspectorOpen && (
          <aside className="absolute right-0 top-0 bottom-0 lg:relative w-[400px] max-w-[calc(100vw-1rem)] shrink-0 z-30 flex flex-col bg-surface-container/98 backdrop-blur-md shadow-2xl overflow-hidden border-l border-outline-variant/30">
            {/* Top Mode Switcher Tabs inside Docked Panel */}
            <div className="px-2.5 pt-2 pb-1.5 bg-surface-container-high border-b border-outline-variant/25 flex items-center justify-between gap-1 shrink-0">
              <div className="flex items-center gap-1 flex-1">
                <button
                  type="button"
                  onClick={() => {
                    setDrawingMode('NONE');
                    setInspectorTab('INCIDENT');
                  }}
                  className={`flex-1 py-1.5 px-2 rounded font-label-sm text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors ${
                    inspectorTab === 'INCIDENT'
                      ? 'bg-secondary-container text-on-secondary-container shadow-xs'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px]">sos</span>
                  <span>SOS Target</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrawingMode('NONE');
                    setInspectorTab('ZONE_INSPECTOR');
                  }}
                  className={`flex-1 py-1.5 px-2 rounded font-label-sm text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors ${
                    inspectorTab === 'ZONE_INSPECTOR'
                      ? 'bg-primary-container text-on-primary-container shadow-xs'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px]">shield_lock</span>
                  <span>Zones ({riskZones.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (drawingMode === 'NONE') {
                      startFencingMode('POLYGON');
                    } else {
                      setInspectorTab('FENCE_BUILDER');
                    }
                  }}
                  className={`flex-1 py-1.5 px-2 rounded font-label-sm text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors ${
                    inspectorTab === 'FENCE_BUILDER'
                      ? 'bg-tertiary-container text-on-tertiary shadow-xs'
                      : 'text-tertiary hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px]">add_location_alt</span>
                  <span>+ Fence</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setInspectorOpen(false)}
                className="w-6 h-6 rounded flex items-center justify-center text-outline hover:text-on-surface shrink-0"
                title="Collapse Panel"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            {/* ===================================================================== */}
            {/* TAB 1: FENCE & HOTSPOT BUILDER (Mark Restricted Area / Hotspot on Map) */}
            {/* ===================================================================== */}
            {inspectorTab === 'FENCE_BUILDER' && (
              <form
                onSubmit={handleDeployNewFence}
                className="flex-1 overflow-y-auto p-space-md space-y-3.5 text-on-surface flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="bg-surface-container-lowest p-3 rounded-lg border border-tertiary/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-[10px] text-tertiary font-bold uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">ads_click</span>
                        Step 1: Mark Geometry on Map
                      </span>
                      <button
                        type="button"
                        onClick={autoGenerateGeometryInSector}
                        className="px-2 py-0.5 rounded bg-surface-container-high hover:bg-surface-variant text-primary font-mono text-[10px] font-bold"
                      >
                        Auto-Place in Sector
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDrawingMode('POLYGON')}
                        className={`p-2 rounded-lg border text-left transition-colors ${
                          drawingMode === 'POLYGON'
                            ? 'bg-primary-container/20 border-primary text-on-surface'
                            : 'bg-surface-container border-outline-variant/25 text-outline'
                        }`}
                      >
                        <div className="flex items-center gap-1 font-headline-md text-xs font-bold text-on-surface">
                          <span className="material-symbols-outlined text-[15px] text-primary">
                            polyline
                          </span>
                          <span>Polygon Fence</span>
                        </div>
                        <span className="font-body-sm text-[10px] text-outline block mt-0.5">
                          Click 3+ points on map ({draftPolygonPoints.length} pts)
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDrawingMode('CIRCLE_HOTSPOT');
                          if (!draftHotspotCenter) {
                            const center =
                              SECTOR_VIEWPORTS[selectedSector]?.center ||
                              SECTOR_VIEWPORTS['Meghalaya East Khasi Hills / Shillong Sector']
                                .center;
                            setDraftHotspotCenter({ lat: center[0], lng: center[1] });
                          }
                        }}
                        className={`p-2 rounded-lg border text-left transition-colors ${
                          drawingMode === 'CIRCLE_HOTSPOT'
                            ? 'bg-tertiary-container/20 border-tertiary text-on-surface'
                            : 'bg-surface-container border-outline-variant/25 text-outline'
                        }`}
                      >
                        <div className="flex items-center gap-1 font-headline-md text-xs font-bold text-on-surface">
                          <span className="material-symbols-outlined text-[15px] text-tertiary">
                            radar
                          </span>
                          <span>Hotspot Radius</span>
                        </div>
                        <span className="font-body-sm text-[10px] text-outline block mt-0.5">
                          Click center + radius ({draftHotspotRadius}m)
                        </span>
                      </button>
                    </div>

                    {drawingMode === 'POLYGON' ? (
                      <div className="text-[11px] font-mono text-outline bg-surface-container p-2 rounded flex items-center justify-between">
                        <span>
                          {draftPolygonPoints.length === 0
                            ? 'Click anywhere on map to drop Vertex #1'
                            : `${draftPolygonPoints.length} vertices marked on OpenStreetMap`}
                        </span>
                        {draftPolygonPoints.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setDraftPolygonPoints([])}
                            className="text-secondary hover:underline text-[10px]"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5 bg-surface-container p-2 rounded">
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-outline">Hotspot Center:</span>
                          <span className="text-primary font-bold">
                            {draftHotspotCenter
                              ? `${draftHotspotCenter.lat.toFixed(4)}°N, ${draftHotspotCenter.lng.toFixed(4)}°E`
                              : 'Click on map'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                          <span className="text-outline">Cordon Radius:</span>
                          <input
                            type="range"
                            min={150}
                            max={2500}
                            step={50}
                            value={draftHotspotRadius}
                            onChange={(e) => setDraftHotspotRadius(Number(e.target.value))}
                            className="flex-1 accent-amber-400"
                          />
                          <span className="text-tertiary font-bold w-12 text-right">
                            {draftHotspotRadius}m
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {fenceError && (
                    <div className="p-2.5 rounded-lg bg-secondary-container/30 border border-secondary/50 text-secondary font-label-sm text-label-sm">
                      {fenceError}
                    </div>
                  )}

                  {/* Quick Police Templates */}
                  <div className="space-y-1">
                    <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider block">
                      Quick Tactical Templates
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {TACTICAL_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => applyTacticalPreset(preset)}
                          className="px-2 py-1.5 rounded bg-surface-container-high hover:bg-surface-variant text-left font-label-sm text-[10px] text-on-surface border border-outline-variant/20 truncate"
                        >
                          ⚡ {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-1">
                      <label className="font-label-sm text-[10px] text-outline uppercase block">
                        Restricted Area / Hotspot Name *
                      </label>
                      <input
                        type="text"
                        value={fenceName}
                        onChange={(e) => setFenceName(e.target.value)}
                        placeholder="e.g. Laitlum Gorge Landslide Zone"
                        className="w-full h-8 px-2.5 rounded bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body-sm text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-label-sm text-[10px] text-outline uppercase block">
                        Geo-ID *
                      </label>
                      <input
                        type="text"
                        value={fenceGeoId}
                        onChange={(e) => setFenceGeoId(e.target.value)}
                        className="w-full h-8 px-2.5 rounded bg-surface-container-lowest border border-outline-variant/30 text-primary font-mono text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-label-sm text-[10px] text-outline uppercase block">
                        Restriction Severity *
                      </label>
                      <select
                        value={fenceRiskLevel}
                        onChange={(e) =>
                          setFenceRiskLevel(e.target.value as RiskZone['riskLevel'])
                        }
                        className="w-full h-8 px-2 rounded bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body-sm text-xs"
                      >
                        <option value="HIGH_RISK">HIGH RISK (Restricted / Red)</option>
                        <option value="ELEVATED">ELEVATED HOTSPOT (Amber)</option>
                        <option value="MODERATE">ADVISORY BUFFER (Cyan)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-label-sm text-[10px] text-outline uppercase block">
                        Threat Category *
                      </label>
                      <select
                        value={fenceCategory}
                        onChange={(e) =>
                          setFenceCategory(e.target.value as RiskZone['category'])
                        }
                        className="w-full h-8 px-2 rounded bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body-sm text-xs"
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
                  </div>

                  <div className="space-y-1">
                    <label className="font-label-sm text-[10px] text-outline uppercase block">
                      Active Enforcement / Curfew Window *
                    </label>
                    <input
                      type="text"
                      value={fenceActiveHours}
                      onChange={(e) => setFenceActiveHours(e.target.value)}
                      placeholder="e.g. 24/7 Immediate Lockdown or 17:30 - 06:00 IST"
                      className="w-full h-8 px-2.5 rounded bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-label-sm text-[10px] text-outline uppercase block">
                      Police Restriction Reason &amp; Tourist App Advisory *
                    </label>
                    <textarea
                      rows={2}
                      value={fenceReason}
                      onChange={(e) => setFenceReason(e.target.value)}
                      placeholder="Describe why this area is fenced/restricted and the alert message sent to tourists entering..."
                      className="w-full p-2 rounded bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body-sm text-xs"
                    />
                  </div>

                  <label className="flex items-center gap-2 p-2 rounded bg-surface-container-lowest border border-outline-variant/25 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoBroadcastAlert}
                      onChange={(e) => setAutoBroadcastAlert(e.target.checked)}
                      className="accent-sky-400"
                    />
                    <span className="font-label-sm text-[11px] text-on-surface">
                      Auto-broadcast emergency push alert to tourist devices inside perimeter
                    </span>
                  </label>
                </div>

                <div className="pt-2 border-t border-outline-variant/25 flex flex-col gap-1.5">
                  <button
                    type="submit"
                    className="w-full h-9 rounded-lg bg-tertiary-container hover:opacity-95 text-on-tertiary font-headline-md text-headline-md font-bold flex items-center justify-center gap-1.5 shadow-lg transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[18px]">shield_lock</span>
                    <span>Deploy Restricted Fence to Live Grid</span>
                  </button>
                  <button
                    type="button"
                    onClick={exitFencingMode}
                    className="w-full h-8 rounded-lg bg-surface-container-high hover:bg-surface-variant text-outline hover:text-on-surface font-label-md text-label-md"
                  >
                    Cancel Drawing
                  </button>
                </div>
              </form>
            )}

            {/* ===================================================================== */}
            {/* TAB 2: RESTRICTED ZONE & HOTSPOT INSPECTOR                            */}
            {/* ===================================================================== */}
            {inspectorTab === 'ZONE_INSPECTOR' && (
              <div className="flex-1 overflow-y-auto p-space-md space-y-space-md text-on-surface flex flex-col justify-between">
                <div className="space-y-3.5">
                  {/* New Fence CTA */}
                  <button
                    type="button"
                    onClick={() => startFencingMode('POLYGON')}
                    className="w-full py-2 px-3 rounded-lg bg-tertiary-container/20 border border-tertiary/50 hover:bg-tertiary-container/30 text-tertiary font-headline-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_location_alt</span>
                    <span>+ Mark New Restricted Area / Hotspot on Map</span>
                  </button>

                  {selectedZone && (
                    <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded font-label-sm text-[10px] font-bold uppercase ${
                              selectedZone.riskLevel === 'HIGH_RISK'
                                ? 'bg-secondary-container text-on-secondary-container'
                                : selectedZone.riskLevel === 'ELEVATED'
                                ? 'bg-tertiary-container text-on-tertiary'
                                : 'bg-primary-container text-on-primary-container'
                            }`}
                          >
                            {selectedZone.riskLevel.replace('_', ' ')}
                          </span>
                          <span className="font-mono text-xs font-bold text-primary">
                            {selectedZone.geoId}
                          </span>
                        </div>
                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                            selectedZone.geofenceStatus === 'ACTIVE'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : selectedZone.geofenceStatus === 'ADVISORY_ONLY'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-surface-container-high text-outline'
                          }`}
                        >
                          {selectedZone.geofenceStatus.replace('_', ' ')}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
                          {selectedZone.name}
                        </h3>
                        <p className="font-label-sm text-[11px] text-outline mt-0.5">
                          {selectedZone.sector} •{' '}
                          {selectedZone.shapeType === 'CIRCLE_HOTSPOT'
                            ? `Hotspot Cordon (${selectedZone.radiusMeters || 500}m Radius)`
                            : 'Polygon Perimeter Fence'}
                        </p>
                      </div>

                      <p className="font-body-sm text-xs text-on-surface-variant bg-surface-container p-2 rounded">
                        {selectedZone.reason}
                      </p>

                      <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                        <div className="bg-surface-container p-2 rounded">
                          <span className="text-outline text-[9px] block">ACTIVE WINDOW</span>
                          <span className="text-on-surface font-bold truncate block">
                            {selectedZone.activeHours}
                          </span>
                        </div>
                        <div className="bg-surface-container p-2 rounded">
                          <span className="text-outline text-[9px] block">DEVICES IN ZONE</span>
                          <span className="text-primary font-bold">
                            {selectedZone.touristCount} Monitored Tourists
                          </span>
                        </div>
                        <div className="bg-surface-container p-2 rounded">
                          <span className="text-outline text-[9px] block">CENTER WGS84</span>
                          <span className="text-on-surface font-bold">
                            {selectedZone.coordinatesCenter.lat.toFixed(4)}°N,{' '}
                            {selectedZone.coordinatesCenter.lng.toFixed(4)}°E
                          </span>
                        </div>
                        <div className="bg-surface-container p-2 rounded">
                          <span className="text-outline text-[9px] block">MARKED BY</span>
                          <span className="text-on-surface font-bold truncate block">
                            {selectedZone.createdBy || 'EOC Command'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            showToast(
                              `Emergency evacuation & caution push broadcasted to ${selectedZone.touristCount} tourists in ${selectedZone.name} (${selectedZone.geoId}).`,
                              'CRITICAL'
                            )
                          }
                          className="flex-1 h-8 px-2.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-[10px] font-bold flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">campaign</span>
                          <span>Broadcast Zone Alert</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleRiskZoneStatus(selectedZone.id)}
                          className="h-8 px-2.5 rounded bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-sm text-[10px] font-bold"
                        >
                          Toggle Status
                        </button>
                        {can('MANAGE_RISK_ZONES') && (
                          <button
                            type="button"
                            onClick={() => {
                              const nextZone = riskZones.find((z) => z.id !== selectedZone.id);
                              deleteRiskZone(selectedZone.id);
                              if (nextZone) setSelectedZoneId(nextZone.id);
                            }}
                            className="h-8 px-2 rounded bg-surface-container-high hover:bg-secondary-container/40 text-secondary font-label-sm text-[10px]"
                            title="Remove Geofence from Map"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* All Active Restricted Zones & Hotspots List */}
                  <div className="space-y-1.5">
                    <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider block">
                      All Active Restricted Fences &amp; Hotspots ({riskZones.length})
                    </span>
                    <div className="space-y-1.5">
                      {riskZones.map((zone) => {
                        const isSel = selectedZone?.id === zone.id;
                        return (
                          <div
                            key={zone.id}
                            onClick={() => setSelectedZoneId(zone.id)}
                            className={`p-2.5 rounded-lg border cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                              isSel
                                ? 'bg-surface-container-high border-primary'
                                : 'bg-surface-container-lowest border-outline-variant/20 hover:bg-surface-container'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    zone.riskLevel === 'HIGH_RISK'
                                      ? 'bg-secondary'
                                      : zone.riskLevel === 'ELEVATED'
                                      ? 'bg-tertiary'
                                      : 'bg-primary'
                                  }`}
                                />
                                <span className="font-mono text-[10px] font-bold text-primary">
                                  {zone.geoId}
                                </span>
                                <span className="font-headline-md text-xs text-on-surface font-semibold truncate">
                                  {zone.name}
                                </span>
                              </div>
                              <span className="font-mono text-[10px] text-outline block mt-0.5">
                                {zone.shapeType === 'CIRCLE_HOTSPOT'
                                  ? `Hotspot (${zone.radiusMeters || 500}m)`
                                  : 'Polygon Fence'}{' '}
                                • {zone.touristCount} Tourists
                              </span>
                            </div>
                            <span className="material-symbols-outlined text-[16px] text-outline">
                              my_location
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-outline-variant/25">
                  <button
                    type="button"
                    onClick={() => navigate('/risk-zones')}
                    className="w-full h-8 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-md text-label-md flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                    <span>Open Full Risk Zones &amp; Geofences Console</span>
                  </button>
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* TAB 3: INCIDENT TARGET INSPECTOR (Default)                            */}
            {/* ===================================================================== */}
            {inspectorTab === 'INCIDENT' && selectedIncident && (
              <>
                <div className="flex-1 overflow-y-auto p-space-md space-y-space-md text-on-surface">
                  {/* Distress Victim Summary Card */}
                  <div
                    onClick={() => navigate(`/tourists/${selectedIncident.dtid}`)}
                    className="bg-surface-container-lowest p-space-sm rounded-lg flex items-start gap-space-sm shadow-inner cursor-pointer hover:bg-surface-container-high/50 transition-colors"
                  >
                    <SafeImage
                      className="w-12 h-12 rounded object-cover shrink-0"
                      alt={selectedIncident.touristName}
                      src={selectedIncident.touristAvatar}
                      fallbackText={selectedIncident.touristName}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-headline-md text-headline-md text-on-surface truncate">
                          {selectedIncident.touristName}
                        </h3>
                        <span className="px-1.5 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-[9px] font-bold uppercase">
                          {selectedIncident.type === 'SOS' ? 'SOS PUSH' : selectedIncident.severity}
                        </span>
                      </div>
                      <p className="font-label-md text-label-md text-outline">
                        Tourist ID: {selectedIncident.dtid}
                      </p>
                      <p className="font-label-sm text-label-sm text-outline font-mono">
                        {selectedIncident.id} • {selectedIncident.location.name}
                      </p>
                    </div>
                  </div>

                  {/* Quick Police Action: Fence Hotspot Around Incident */}
                  <button
                    type="button"
                    onClick={() => {
                      setDrawingMode('CIRCLE_HOTSPOT');
                      setDraftHotspotCenter({
                        lat: selectedIncident.location.lat,
                        lng: selectedIncident.location.lng,
                      });
                      setDraftHotspotRadius(500);
                      setFenceName(`${selectedIncident.location.name} Emergency Cordon`);
                      setFenceRiskLevel('HIGH_RISK');
                      setFenceCategory('CLIFF_RESTRICTED');
                      setFenceReason(
                        `Emergency police search & rescue perimeter cordoned around active incident ${selectedIncident.id} (${selectedIncident.touristName}).`
                      );
                      setInspectorTab('FENCE_BUILDER');
                      showToast(
                        `Centered 500m emergency hotspot cordon around ${selectedIncident.id}.`,
                        'WARNING'
                      );
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-tertiary-container/20 border border-tertiary/40 hover:bg-tertiary-container/30 text-tertiary font-label-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">radar</span>
                    <span>Cordon 500m Restricted Hotspot Around Incident</span>
                  </button>

                  {/* Exact GIS Telemetry Grid */}
                  <div className="space-y-1.5">
                    <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                      GEODETIC TELEMETRY
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                      <div className="bg-surface-container-high p-2 rounded">
                        <span className="text-outline text-[9px] block">LATITUDE</span>
                        <span className="text-on-surface font-bold">
                          {selectedIncident.location.lat.toFixed(4)}° N
                        </span>
                      </div>
                      <div className="bg-surface-container-high p-2 rounded">
                        <span className="text-outline text-[9px] block">LONGITUDE</span>
                        <span className="text-on-surface font-bold">
                          {selectedIncident.location.lng.toFixed(4)}° E
                        </span>
                      </div>
                      <div className="bg-surface-container-high p-2 rounded">
                        <span className="text-outline text-[9px] block">ALTITUDE</span>
                        <span className="text-primary font-bold">
                          {selectedIncident.location.altitudeMeters.toLocaleString()} m MSL
                        </span>
                      </div>
                      <div className="bg-surface-container-high p-2 rounded">
                        <span className="text-outline text-[9px] block">GPS FIX ACCURACY</span>
                        <span className="text-tertiary-fixed font-bold">
                          ± {selectedIncident.location.accuracyMeters} meters
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Live Environmental & Micro-Climate Threat */}
                  <div className="space-y-1.5">
                    <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                      LOCAL ENVIRONMENTAL RISK
                    </span>
                    <div className="bg-surface-container-low p-2.5 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-tertiary">
                            foggy
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            Dense Mountain Fog
                          </span>
                        </div>
                        <span className="font-label-sm text-label-sm text-tertiary font-bold">
                          Index {selectedIncident.environmentalRisk.fogIndexPercent}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-outline">
                            visibility
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            Horizontal Visibility
                          </span>
                        </div>
                        <span className="font-label-sm text-label-sm text-secondary font-bold">
                          {selectedIncident.environmentalRisk.visibilityMeters} meters
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-tertiary-fixed-dim">
                            wb_twilight
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            Sunset / Dusk Alert
                          </span>
                        </div>
                        <span className="font-label-sm text-label-sm text-outline">
                          {selectedIncident.environmentalRisk.sunsetRemaining}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dispatch Telemetry / Nearest Responders */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                        CONVERGING PATROLS
                      </span>
                      <span className="font-label-sm text-[10px] text-primary font-bold">
                        SORTED BY ETA
                      </span>
                    </div>

                    {responseUnits.slice(0, 2).map((unit) => (
                      <div
                        key={unit.id}
                        onClick={() => navigate(`/response-teams/${unit.id}`)}
                        className="bg-surface-container-high p-2.5 rounded-lg flex items-center justify-between cursor-pointer hover:bg-surface-variant transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
                            <span className="material-symbols-outlined text-[18px]">
                              {unit.vehicleIcon}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="font-headline-md text-headline-md text-on-surface">
                                {unit.name}
                              </span>
                              <span className="px-1 py-0.2 rounded bg-primary-container/30 text-primary font-label-sm text-[9px] uppercase font-bold">
                                {unit.status.replace('_', ' ')}
                              </span>
                            </div>
                            <span className="font-label-sm text-[10px] text-outline font-mono">
                              {unit.distanceKm} km distance • {unit.speedKmh} km/h
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-headline-md text-headline-md text-primary font-mono block">
                            ETA {unit.etaText}
                          </span>
                          <span className="font-label-sm text-[9px] text-outline font-mono">
                            {unit.leadOfficer}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Peripheral Photo Feed from Last Tourist Check-in */}
                  <div className="space-y-1.5">
                    <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                      LAST UPLOADED FIELD PHOTO (14:12)
                    </span>
                    <div className="relative rounded-lg overflow-hidden h-28 bg-surface-container-lowest shadow-inner">
                      <SafeImage
                        className="w-full h-full object-cover"
                        alt="Mawryngkneng forest trail check-in photo"
                        src={selectedIncident.fieldPhotoUrl || STITCH_ASSETS.forestFieldPhoto}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/90 via-transparent to-transparent flex items-end p-2">
                        <span className="font-label-sm text-[9px] text-on-surface font-mono">
                          {selectedIncident.fieldPhotoCaption ||
                            'Camera: Samsung S24 Ultra • Lat 25.5679° N'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tactical Bottom Actions */}
                <div className="p-space-md bg-surface-container-high shrink-0 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/incidents/${selectedIncident.id}`)}
                    className="w-full h-9 rounded-lg bg-primary-container hover:opacity-90 text-on-primary-container font-headline-md text-headline-md flex items-center justify-center gap-1.5 shadow-md transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_full</span>
                    <span>Focus Incident Workspace</span>
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        showToast(
                          `Geofence containment alert broadcast in ${selectedIncident.location.name}.`,
                          'WARNING'
                        )
                      }
                      className="h-8 rounded-lg bg-surface-container text-on-surface hover:bg-surface-variant font-label-md text-label-md flex items-center justify-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[15px] text-secondary">
                        wifi_tethering
                      </span>
                      <span>Geofence Alert</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        showToast(
                          `Encrypted VoLTE Direct Link initiated with ${selectedIncident.touristName}.`,
                          'PRIMARY'
                        )
                      }
                      className="h-8 rounded-lg bg-surface-container text-on-surface hover:bg-surface-variant font-label-md text-label-md flex items-center justify-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[15px] text-primary">
                        call
                      </span>
                      <span>Direct Link</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </aside>
        )}
      </div>

      {/* BOTTOM MAP LEGEND & OPERATIONAL TELEMETRY BAR */}
      <MapLegend />
    </div>
  );
};
