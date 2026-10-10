import React, { useEffect, useMemo, useState } from 'react';
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
import { SafeImage, SeverityBadge } from '../components/ui/CommonUi';
import { STITCH_ASSETS } from '../mock/mockData';
import { RiskZone } from '../types';

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
      'High tourist footfall congestion and traffic bottleneck hotspot requiring active patrol monitoring.',
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
    assignResponseUnit,
    saveRiskZone,
    deleteRiskZone,
    toggleRiskZoneStatus,
    showToast,
  } = useOperational();
  const navigate = useNavigate();

  const [selectedSector, setSelectedSector] = useState(
    'Meghalaya East Khasi Hills / Shillong Sector'
  );
  // Default to OpenStreetMap ('street') so the map is always vivid, realistic, and never black
  const [mapStyle, setMapStyle] = useState<MapStyleMode>('street');
  const [activeFilter, setActiveFilter] = useState<MapEntityFilter>('ALL');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(true);
  const [inspectorTab, setInspectorTab] = useState<InspectorTabMode>('INCIDENT');
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

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
  const [fenceCategory, setFenceCategory] =
    useState<RiskZone['category']>('VIP_SECURITY_CORDON');
  const [fenceRiskLevel, setFenceRiskLevel] =
    useState<RiskZone['riskLevel']>('HIGH_RISK');
  const [fenceActiveHours, setFenceActiveHours] = useState<string>(
    '24/7 Police Tactical Enforcement'
  );
  const [fenceReason, setFenceReason] = useState<string>('');
  const [fenceRequirements, setFenceRequirements] = useState<string>(
    'Authorized Police / SDRF Personnel Only'
  );
  const [broadcastImmediately, setBroadcastImmediately] = useState<boolean>(true);

  // Local interactive dispatch states
  const [unitDispatchedIds, setUnitDispatchedIds] = useState<string[]>([]);

  // Allow ESC key to exit full screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  const selectedIncident = useMemo(
    () => incidents.find((i) => i.id === selectedIncidentId) || incidents[0],
    [incidents, selectedIncidentId]
  );

  const selectedZone = useMemo(
    () => riskZones.find((z) => z.id === selectedZoneId) || riskZones[0],
    [riskZones, selectedZoneId]
  );

  const handleDispatchNearestUnit = () => {
    if (!can('ASSIGN_RESPONSE_UNIT')) {
      showToast('Permission Denied: Your role cannot dispatch units.', 'WARNING');
      return;
    }
    if (!selectedIncident) return;
    const nearestUnit =
      responseUnits.find((u) => u.status === 'AVAILABLE') || responseUnits[0];
    if (nearestUnit) {
      assignResponseUnit(
        selectedIncident.id,
        nearestUnit.id,
        'Dispatched via Live Operations Map'
      );
    }
    setUnitDispatchedIds((prev) =>
      prev.includes(selectedIncident.id) ? prev : [...prev, selectedIncident.id]
    );
    showToast(
      `Nearest unit (${nearestUnit?.name || 'Alpha-12'}) dispatched to ${selectedIncident.id} (${selectedIncident.location?.name || 'Sector'})`,
      'SUCCESS'
    );
  };

  const startDrawingMode = (mode: MapDrawingMode, expandFullScreen = true) => {
    setDrawingMode(mode);
    setInspectorOpen(true);
    setInspectorTab('FENCE_BUILDER');
    if (expandFullScreen) {
      setIsFullScreen(true);
    }

    const sectorVp =
      SECTOR_VIEWPORTS[selectedSector] ||
      SECTOR_VIEWPORTS['Meghalaya East Khasi Hills / Shillong Sector'];

    if (mode === 'CIRCLE_HOTSPOT') {
      if (!draftHotspotCenter) {
        setDraftHotspotCenter({
          lat: sectorVp.center[0],
          lng: sectorVp.center[1],
        });
      }
      showToast(
        'Full-Screen Hotspot Mode Active: Click anywhere on the OpenStreetMap to position the circular hotspot perimeter.',
        'PRIMARY'
      );
    } else if (mode === 'POLYGON') {
      showToast(
        'Full-Screen Fence Drawing Active: Click 3 or more points directly on the OpenStreetMap to draw a restricted polygon.',
        'PRIMARY'
      );
    }
  };

  const handleMapClickDraw = (lat: number, lng: number) => {
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

    const sectorVp =
      SECTOR_VIEWPORTS[selectedSector] ||
      SECTOR_VIEWPORTS['Meghalaya East Khasi Hills / Shillong Sector'];

    if (preset.shapeType === 'CIRCLE_HOTSPOT') {
      setDrawingMode('CIRCLE_HOTSPOT');
      setDraftHotspotCenter({
        lat: Number((sectorVp.center[0] + (Math.random() - 0.5) * 0.015).toFixed(5)),
        lng: Number((sectorVp.center[1] + (Math.random() - 0.5) * 0.015).toFixed(5)),
      });
      showToast(
        `Loaded "${preset.label}" preset. Click on the OpenStreetMap to reposition or adjust radius.`,
        'PRIMARY'
      );
    } else {
      setDrawingMode('POLYGON');
      const cLat = sectorVp.center[0];
      const cLng = sectorVp.center[1];
      setDraftPolygonPoints([
        [Number((cLat + 0.008).toFixed(5)), Number((cLng - 0.009).toFixed(5))],
        [Number((cLat + 0.009).toFixed(5)), Number((cLng + 0.008).toFixed(5))],
        [Number((cLat - 0.007).toFixed(5)), Number((cLng + 0.01).toFixed(5))],
        [Number((cLat - 0.008).toFixed(5)), Number((cLng - 0.007).toFixed(5))],
      ]);
      showToast(
        `Loaded "${preset.label}" polygon fence on OpenStreetMap. Click to add vertices or publish immediately.`,
        'PRIMARY'
      );
    }
  };

  const handleSavePoliceFence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fenceName.trim()) {
      showToast('Please enter a name for the restricted zone or hotspot.', 'WARNING');
      return;
    }

    const isCircle = drawingMode === 'CIRCLE_HOTSPOT';
    if (!isCircle && draftPolygonPoints.length < 3) {
      showToast(
        'Please click at least 3 points on the map to form a restricted polygon fence.',
        'WARNING'
      );
      return;
    }
    if (isCircle && !draftHotspotCenter) {
      showToast(
        'Please click on the map to place the hotspot center point.',
        'WARNING'
      );
      return;
    }

    const newZoneId = `RZ-${Math.floor(100 + Math.random() * 900)}`;
    const centerCoords = isCircle
      ? draftHotspotCenter!
      : {
          lat: Number(
            (
              draftPolygonPoints.reduce((acc, p) => acc + p[0], 0) /
              draftPolygonPoints.length
            ).toFixed(5)
          ),
          lng: Number(
            (
              draftPolygonPoints.reduce((acc, p) => acc + p[1], 0) /
              draftPolygonPoints.length
            ).toFixed(5)
          ),
        };

    const newZone: RiskZone = {
      id: newZoneId,
      geoId: fenceGeoId.trim() || `#GF-${riskZones.length + 15}`,
      name: fenceName.trim(),
      sector: selectedSector,
      riskLevel: fenceRiskLevel,
      category: fenceCategory,
      shapeType: isCircle ? 'CIRCLE_HOTSPOT' : 'POLYGON',
      radiusMeters: isCircle ? draftHotspotRadius : undefined,
      polygonCoords: isCircle ? undefined : draftPolygonPoints,
      activeHours: fenceActiveHours.trim() || '24/7 Tactical Enforcement',
      reason:
        fenceReason.trim() ||
        'Police tactical restriction perimeter established via EOC Live Map.',
      geofenceStatus: 'ACTIVE',
      touristCount: Math.floor(Math.random() * 14) + 2,
      incidentCount: fenceRiskLevel === 'HIGH_RISK' ? 1 : 0,
      weatherHookText: 'Police Command Cordon • Live GIS Active',
      requirements: fenceRequirements.trim() || 'Police Clearance Required',
      coordinatesCenter: centerCoords,
      svgPolygonPoints: '320,220 440,210 460,310 340,320',
      mapX: 400,
      mapY: 250,
      createdBy: `${user?.name || 'Insp. Ananya Sharma'} (${
        user?.badgeNumber || '#8841'
      })`,
      createdAt: 'Just now',
      autoBroadcastAlert: broadcastImmediately,
    };

    saveRiskZone(newZone);
    setSelectedZoneId(newZone.id);
    setDrawingMode('NONE');
    setDraftPolygonPoints([]);
    setDraftHotspotCenter(null);
    setFenceName('');
    setFenceReason('');
    setFenceGeoId(`#GF-${String(riskZones.length + 16).padStart(2, '0')}`);
    setInspectorTab('ZONE_INSPECTOR');

    if (broadcastImmediately) {
      showToast(
        `Restricted Zone "${newZone.name}" activated on OpenStreetMap & emergency cell broadcast pushed to tourists in sector!`,
        'SUCCESS'
      );
    } else {
      showToast(
        `Restricted Zone "${newZone.name}" saved and rendered on OpenStreetMap.`,
        'SUCCESS'
      );
    }
  };

  const isDispatched =
    selectedIncident &&
    (unitDispatchedIds.includes(selectedIncident.id) ||
      Boolean(selectedIncident.assignedUnitId));

  return (
    <div
      className={
        isFullScreen
          ? 'fixed inset-0 z-[100] w-screen h-screen flex flex-col bg-surface text-on-surface overflow-hidden select-none'
          : 'flex flex-col h-[calc(100vh-3.75rem)] w-full bg-surface text-on-surface overflow-hidden select-none'
      }
    >
      {/* 1. CLEAN NON-OVERLAPPING TOP COMMAND BAR */}
      <div className="shrink-0 bg-surface-container-lowest border-b border-outline-variant/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-30 shadow-xs">
        {/* Left: Sector Selector & Entity Filter Pills */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-surface-container border border-outline-variant/30 rounded-lg px-3 py-1.5">
            <span className="material-symbols-outlined text-primary text-lg">
              explore
            </span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-outline block leading-none">
                Operational Sector (OpenStreetMap)
              </span>
              <select
                value={selectedSector}
                onChange={(e) => {
                  setSelectedSector(e.target.value);
                  setPan({ x: 0, y: 0 });
                }}
                aria-label="Operational Sector"
                className="bg-transparent text-xs font-bold text-on-surface focus:outline-none cursor-pointer pr-2 mt-0.5"
              >
                {Object.keys(SECTOR_VIEWPORTS).map((secName) => (
                  <option
                    key={secName}
                    value={secName}
                    className="bg-surface-container text-on-surface"
                  >
                    {secName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Entity Filter Pills */}
          <div className="hidden xl:flex items-center bg-surface-container p-1 rounded-lg border border-outline-variant/30">
            {(
              [
                {
                  id: 'ALL',
                  label: 'All Layers',
                  count: incidents.length + riskZones.length,
                },
                {
                  id: 'EMERGENCIES',
                  label: 'Active SOS',
                  count: incidents.filter((i) => i.severity === 'CRITICAL').length,
                },
                {
                  id: 'RISK_ZONES',
                  label: 'Fences & Hotspots',
                  count: riskZones.filter((z) => z.geofenceStatus === 'ACTIVE').length,
                },
                {
                  id: 'RESPONSE_UNITS',
                  label: 'Patrol Units',
                  count: responseUnits.length,
                },
              ] as { id: MapEntityFilter; label: string; count: number }[]
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeFilter === f.id
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    activeFilter === f.id
                      ? 'bg-black/20 text-white'
                      : 'bg-surface-container-high text-outline'
                  }`}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Police Geofence Studio Trigger, Base Map Switcher & Full Screen Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Primary Police Fencing Action Buttons */}
          <div className="flex items-center bg-surface-container p-1 rounded-lg border border-outline-variant/30 gap-1">
            <button
              onClick={() => {
                if (drawingMode === 'POLYGON') {
                  setDrawingMode('NONE');
                } else {
                  startDrawingMode('POLYGON', true);
                }
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                drawingMode === 'POLYGON'
                  ? 'bg-secondary text-on-secondary shadow-xs'
                  : 'bg-secondary-container/20 hover:bg-secondary-container/30 text-secondary'
              }`}
              title="Draw Polygon Restricted Area in Full-Screen OpenStreetMap"
            >
              <span className="material-symbols-outlined text-sm">pentagon</span>
              <span>
                {drawingMode === 'POLYGON'
                  ? 'Drawing Polygon Fence...'
                  : 'Draw Restricted Fence'}
              </span>
            </button>

            <button
              onClick={() => {
                if (drawingMode === 'CIRCLE_HOTSPOT') {
                  setDrawingMode('NONE');
                } else {
                  startDrawingMode('CIRCLE_HOTSPOT', true);
                }
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                drawingMode === 'CIRCLE_HOTSPOT'
                  ? 'bg-tertiary-container text-on-tertiary shadow-xs'
                  : 'bg-tertiary-container/20 hover:bg-tertiary-container/30 text-tertiary'
              }`}
              title="Mark Circular Hotspot in Full-Screen OpenStreetMap"
            >
              <span className="material-symbols-outlined text-sm">radar</span>
              <span>
                {drawingMode === 'CIRCLE_HOTSPOT' ? 'Marking Hotspot...' : 'Mark Hotspot'}
              </span>
            </button>

            {drawingMode !== 'NONE' && (
              <button
                onClick={() => {
                  setDrawingMode('NONE');
                  setDraftPolygonPoints([]);
                  setDraftHotspotCenter(null);
                }}
                className="px-2.5 py-1.5 rounded-md text-xs font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Map Base Style Switcher (OpenStreetMap Default) */}
          <div className="flex items-center bg-surface-container p-1 rounded-lg border border-outline-variant/30">
            {(
              [
                { id: 'street', label: 'OpenStreetMap', icon: 'map' },
                { id: 'satellite', label: 'Satellite', icon: 'satellite_alt' },
                { id: 'terrain', label: 'Topo', icon: 'terrain' },
                { id: 'tactical', label: 'Dark', icon: 'dark_mode' },
              ] as { id: MapStyleMode; label: string; icon: string }[]
            ).map((style) => (
              <button
                key={style.id}
                onClick={() => setMapStyle(style.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                  mapStyle === style.id
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{style.icon}</span>
                <span className="hidden md:inline">{style.label}</span>
              </button>
            ))}
          </div>

          {/* Full Screen Toggle Button */}
          <button
            onClick={() => setIsFullScreen((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              isFullScreen
                ? 'bg-primary text-on-primary border-primary shadow-xs'
                : 'bg-surface-container text-on-surface border-outline-variant/30 hover:border-primary'
            }`}
            title={isFullScreen ? 'Exit Full Screen (ESC)' : 'Enter Full Screen Map Mode'}
          >
            <span className="material-symbols-outlined text-sm">
              {isFullScreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
            <span>{isFullScreen ? 'Exit Full Screen' : 'Full Screen'}</span>
          </button>

          {/* Toggle Right Inspector Drawer */}
          <button
            onClick={() => setInspectorOpen((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              inspectorOpen
                ? 'bg-primary/15 text-primary border-primary/40'
                : 'bg-surface-container text-on-surface border-outline-variant/30'
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {inspectorOpen ? 'right_panel_close' : 'right_panel_open'}
            </span>
            <span className="hidden sm:inline">
              {inspectorOpen ? 'Hide Panel' : 'Open Panel'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. ACTIVE DRAWING INSTRUCTION BANNER */}
      {drawingMode !== 'NONE' && (
        <div className="shrink-0 bg-secondary-container/20 border-b border-secondary/40 px-4 py-2 flex flex-wrap items-center justify-between gap-3 z-20">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface">
              {drawingMode === 'POLYGON'
                ? `FULL-SCREEN POLYGON FENCING ON OPENSTREETMAP (${draftPolygonPoints.length} vertices placed — click map to add points)`
                : `FULL-SCREEN HOTSPOT MARKING ON OPENSTREETMAP (Radius: ${draftHotspotRadius}m — click map to move center)`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {drawingMode === 'POLYGON' && draftPolygonPoints.length > 0 && (
              <>
                <button
                  onClick={() => setDraftPolygonPoints((prev) => prev.slice(0, -1))}
                  className="px-2.5 py-1 rounded-md bg-surface-container-lowest hover:bg-surface-container-high text-on-surface text-xs font-semibold border border-outline-variant/40 cursor-pointer"
                >
                  Undo Last Point
                </button>
                <button
                  onClick={() => setDraftPolygonPoints([])}
                  className="px-2.5 py-1 rounded-md bg-surface-container-lowest hover:bg-surface-container-high text-secondary text-xs font-semibold border border-outline-variant/40 cursor-pointer"
                >
                  Clear Points
                </button>
              </>
            )}
            {!isFullScreen && (
              <button
                onClick={() => setIsFullScreen(true)}
                className="px-2.5 py-1 rounded-md bg-primary text-on-primary text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">fullscreen</span>
                Expand Full Screen
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. MAIN SPLIT WORKSPACE: OPENSTREETMAP CANVAS + DOCKED RIGHT INSPECTOR */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* LEFT/CENTER: INTERACTIVE LEAFLET OPENSTREETMAP CANVAS + FOOTER LEGEND */}
        <div className="flex-1 flex flex-col relative h-full min-w-0 overflow-hidden">
          <MapView
            incidents={incidents}
            riskZones={riskZones}
            responseUnits={responseUnits}
            selectedIncidentId={selectedIncident?.id || null}
            selectedZoneId={selectedZone?.id || null}
            onSelectIncident={(inc) => {
              setSelectedIncidentId(inc.id);
              setInspectorOpen(true);
              if (drawingMode === 'NONE') {
                setInspectorTab('INCIDENT');
              }
            }}
            onSelectZone={(zone) => {
              setSelectedZoneId(zone.id);
              setInspectorOpen(true);
              if (drawingMode === 'NONE') {
                setInspectorTab('ZONE_INSPECTOR');
              }
            }}
            activeFilter={activeFilter}
            mapStyle={mapStyle}
            selectedSector={selectedSector}
            drawingMode={drawingMode}
            draftPolygonPoints={draftPolygonPoints}
            draftHotspotCenter={draftHotspotCenter}
            draftHotspotRadius={draftHotspotRadius}
            draftRiskLevel={fenceRiskLevel}
            onMapDrawClick={handleMapClickDraw}
            isFullScreen={isFullScreen}
            zoom={zoom}
            pan={pan}
            onZoomIn={() => setZoom((z) => Math.min(2.2, Number((z + 0.25).toFixed(2))))}
            onZoomOut={() => setZoom((z) => Math.max(0.7, Number((z - 0.25).toFixed(2))))}
            onResetView={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            onPanChange={setPan}
          />
          <MapLegend />
        </div>

        {/* RIGHT DOCKED PANEL: INCIDENT / ZONE INSPECTOR / POLICE FENCE STUDIO */}
        {inspectorOpen && (
          <aside className="w-full sm:w-[400px] lg:w-[420px] shrink-0 h-full bg-surface-container-low border-l border-outline-variant/30 flex flex-col z-20 overflow-hidden">
            {/* Top Mode Switcher Tabs */}
            <div className="grid grid-cols-3 bg-surface-container p-1.5 border-b border-outline-variant/30 shrink-0 gap-1">
              <button
                onClick={() => setInspectorTab('INCIDENT')}
                className={`py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  inspectorTab === 'INCIDENT'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-sm">emergency_share</span>
                <span>SOS ({incidents.length})</span>
              </button>
              <button
                onClick={() => setInspectorTab('ZONE_INSPECTOR')}
                className={`py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  inspectorTab === 'ZONE_INSPECTOR'
                    ? 'bg-tertiary-container text-on-tertiary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-sm">shield_locked</span>
                <span>Zones ({riskZones.length})</span>
              </button>
              <button
                onClick={() => {
                  setInspectorTab('FENCE_BUILDER');
                  if (drawingMode === 'NONE') {
                    startDrawingMode('POLYGON', false);
                  }
                }}
                className={`py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  inspectorTab === 'FENCE_BUILDER'
                    ? 'bg-secondary text-on-secondary shadow-xs'
                    : 'text-secondary hover:bg-secondary-container/20'
                }`}
              >
                <span className="material-symbols-outlined text-sm">add_moderator</span>
                <span>Fence Tool</span>
              </button>
            </div>

            {/* TAB 1: POLICE GEOFENCE & HOTSPOT BUILDER */}
            {inspectorTab === 'FENCE_BUILDER' && (
              <form
                onSubmit={handleSavePoliceFence}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <div className="p-4 border-b border-outline-variant/30 bg-secondary-container/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-secondary-container/25 border border-secondary/30 flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-xl">
                        shield_with_house
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-on-surface">
                        Police Geofence &amp; Hotspot Studio
                      </h3>
                      <p className="text-xs text-on-surface-variant">
                        Mark restricted areas directly on OpenStreetMap
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFullScreen((prev) => !prev)}
                    className="px-2.5 py-1 rounded-md bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {isFullScreen ? 'fullscreen_exit' : 'fullscreen'}
                    </span>
                    {isFullScreen ? 'Standard' : 'Full Screen'}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {/* Step 1: Geometry Mode */}
                  <div>
                    <label className="text-xs font-bold text-outline uppercase tracking-wider block mb-2">
                      1. Choose Marking Tool on OpenStreetMap
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => startDrawingMode('POLYGON', isFullScreen)}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                          drawingMode === 'POLYGON'
                            ? 'bg-secondary-container/15 border-secondary text-on-surface shadow-xs'
                            : 'bg-surface-container border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="material-symbols-outlined text-secondary text-lg">
                            pentagon
                          </span>
                          {drawingMode === 'POLYGON' && (
                            <span className="text-[10px] font-mono bg-secondary text-on-secondary px-1.5 py-0.5 rounded font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-on-surface mt-1">
                          Polygon Fence
                        </p>
                        <p className="text-[11px] text-on-surface-variant leading-snug">
                          Click 3+ vertices on map for custom perimeter
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => startDrawingMode('CIRCLE_HOTSPOT', isFullScreen)}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                          drawingMode === 'CIRCLE_HOTSPOT'
                            ? 'bg-tertiary-container/15 border-tertiary text-on-surface shadow-xs'
                            : 'bg-surface-container border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="material-symbols-outlined text-tertiary text-lg">
                            radar
                          </span>
                          {drawingMode === 'CIRCLE_HOTSPOT' && (
                            <span className="text-[10px] font-mono bg-tertiary-container text-on-tertiary px-1.5 py-0.5 rounded font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-on-surface mt-1">
                          Circular Hotspot
                        </p>
                        <p className="text-[11px] text-on-surface-variant leading-snug">
                          Click center point &amp; set radius in meters
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Step 2: Live Map Coordinates Status */}
                  <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-outline uppercase tracking-wider">
                        {drawingMode === 'CIRCLE_HOTSPOT'
                          ? 'Hotspot Center & Radius'
                          : `Polygon Vertices (${draftPolygonPoints.length} placed)`}
                      </span>
                      {drawingMode === 'POLYGON' && draftPolygonPoints.length > 0 && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setDraftPolygonPoints((prev) => prev.slice(0, -1))
                            }
                            className="text-xs text-primary hover:underline cursor-pointer"
                          >
                            Undo
                          </button>
                          <button
                            type="button"
                            onClick={() => setDraftPolygonPoints([])}
                            className="text-xs text-secondary hover:underline cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>

                    {drawingMode === 'CIRCLE_HOTSPOT' ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-mono text-on-surface bg-surface-container-lowest px-3 py-2 rounded-lg border border-outline-variant/25">
                          <span>
                            {draftHotspotCenter
                              ? `${draftHotspotCenter.lat.toFixed(4)}°N, ${draftHotspotCenter.lng.toFixed(4)}°E`
                              : 'Click map to set hotspot center'}
                          </span>
                          <span className="text-tertiary font-bold">
                            R = {draftHotspotRadius}m
                          </span>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-on-surface-variant mb-1">
                            <span>Cordon Radius</span>
                            <span className="font-mono font-bold text-tertiary">
                              {draftHotspotRadius} meters
                            </span>
                          </div>
                          <input
                            type="range"
                            min={150}
                            max={2000}
                            step={50}
                            value={draftHotspotRadius}
                            onChange={(e) =>
                              setDraftHotspotRadius(Number(e.target.value))
                            }
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {draftPolygonPoints.length === 0 ? (
                          <p className="text-xs text-on-surface-variant bg-surface-container-lowest border border-outline-variant/25 rounded-lg p-2.5">
                            Click 3 or more points directly on the OpenStreetMap canvas to draw your custom restricted fence boundary.
                          </p>
                        ) : (
                          <div className="max-h-28 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {draftPolygonPoints.map((pt, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs font-mono bg-surface-container-lowest px-2.5 py-1.5 rounded border border-outline-variant/25 text-on-surface"
                              >
                                <span className="text-secondary font-bold">
                                  Vertex #{idx + 1}
                                </span>
                                <span>
                                  {pt[0].toFixed(4)}°N, {pt[1].toFixed(4)}°E
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick Templates */}
                  <div>
                    <label className="text-xs font-bold text-outline uppercase tracking-wider block mb-2">
                      Quick Police Templates
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {TACTICAL_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => applyTacticalPreset(preset)}
                          className="px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-xs font-semibold text-on-surface text-left flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm text-primary">
                            bolt
                          </span>
                          <span className="truncate">{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Zone Name & Classification */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-outline uppercase block mb-1">
                        Restricted Zone / Hotspot Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={fenceName}
                        onChange={(e) => setFenceName(e.target.value)}
                        placeholder="e.g., Laitlum Gorge Rim Police Cordon"
                        className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-xs font-bold text-outline uppercase block mb-1">
                          Threat Category
                        </label>
                        <select
                          value={fenceCategory}
                          onChange={(e) =>
                            setFenceCategory(e.target.value as RiskZone['category'])
                          }
                          className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-2.5 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                        >
                          <option value="VIP_SECURITY_CORDON">Police Security Cordon</option>
                          <option value="CROWD_HOTSPOT">Crowd / Crime Hotspot</option>
                          <option value="LANDSLIDE_BLOCKADE">Landslide Blockade</option>
                          <option value="FLASH_FLOOD">Flash Flood Gorge</option>
                          <option value="CLIFF_RESTRICTED">Unfenced Cliff Edge</option>
                          <option value="CURFEW_GORGE">Night Curfew Gorge</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-outline uppercase block mb-1">
                          Severity Level
                        </label>
                        <select
                          value={fenceRiskLevel}
                          onChange={(e) =>
                            setFenceRiskLevel(e.target.value as RiskZone['riskLevel'])
                          }
                          className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-2.5 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                        >
                          <option value="HIGH_RISK">High Risk (No Entry)</option>
                          <option value="ELEVATED">Elevated (Hotspot Watch)</option>
                          <option value="MODERATE">Moderate Advisory</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-outline uppercase block mb-1">
                        Operational Reason / Advisory Message
                      </label>
                      <textarea
                        rows={2}
                        value={fenceReason}
                        onChange={(e) => setFenceReason(e.target.value)}
                        placeholder="Describe why this area is fenced and instructions for tourists..."
                        className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-none focus:border-primary resize-none"
                      />
                    </div>

                    <label className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/10 border border-primary/25 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={broadcastImmediately}
                        onChange={(e) => setBroadcastImmediately(e.target.checked)}
                        className="mt-0.5 accent-blue-600"
                      />
                      <div>
                        <span className="text-xs font-bold text-on-surface block">
                          Push Immediate Cell Broadcast Alert
                        </span>
                        <span className="text-[11px] text-on-surface-variant">
                          Notify all registered tourists within 2km of this perimeter
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="p-4 border-t border-outline-variant/30 bg-surface-container shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDrawingMode('NONE');
                      setDraftPolygonPoints([]);
                      setDraftHotspotCenter(null);
                      setInspectorTab('ZONE_INSPECTOR');
                    }}
                    className="px-3 py-2.5 rounded-lg border border-outline-variant/40 text-xs font-bold text-on-surface-variant hover:text-on-surface cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 rounded-lg bg-secondary hover:opacity-95 text-on-secondary text-xs font-bold uppercase tracking-wider shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">
                      add_moderator
                    </span>
                    Publish Fence on Map
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: ACTIVE ZONES & HOTSPOTS INSPECTOR */}
            {inspectorTab === 'ZONE_INSPECTOR' && selectedZone && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-tertiary">
                        {selectedZone.geoId}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          selectedZone.geofenceStatus === 'ACTIVE'
                            ? 'bg-secondary-container/30 text-secondary border border-secondary/30'
                            : 'bg-surface-container-high text-outline'
                        }`}
                      >
                        {selectedZone.geofenceStatus === 'ACTIVE'
                          ? 'ACTIVE CORDON'
                          : 'STANDBY'}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-on-surface mt-1">
                      {selectedZone.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => startDrawingMode('POLYGON', true)}
                    className="px-2.5 py-1.5 rounded-lg bg-secondary text-on-secondary text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">add</span>
                    New Fence
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-3">
                      <span className="text-[11px] text-outline block">
                        Tourists Inside
                      </span>
                      <span className="text-xl font-bold font-mono text-on-surface mt-0.5 block">
                        {selectedZone.touristCount}
                      </span>
                    </div>
                    <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-3">
                      <span className="text-[11px] text-outline block">
                        Active Incidents
                      </span>
                      <span className="text-xl font-bold font-mono text-tertiary mt-0.5 block">
                        {selectedZone.incidentCount}
                      </span>
                    </div>
                  </div>

                  <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-outline">Geometry Type:</span>
                      <span className="font-mono font-bold text-on-surface">
                        {selectedZone.shapeType === 'CIRCLE_HOTSPOT'
                          ? `Circular Hotspot (${selectedZone.radiusMeters || 450}m)`
                          : 'Polygon Perimeter Fence'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-outline">Active Hours:</span>
                      <span className="font-semibold text-on-surface">
                        {selectedZone.activeHours}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-outline-variant/25">
                      <span className="text-outline block mb-1">
                        Operational Reason:
                      </span>
                      <p className="text-on-surface-variant leading-relaxed">
                        {selectedZone.reason}
                      </p>
                    </div>
                  </div>

                  {/* List of All Zones in Sector */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-outline">
                        All Sector Geofences ({riskZones.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {riskZones.map((z) => (
                        <div
                          key={z.id}
                          onClick={() => setSelectedZoneId(z.id)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                            selectedZone.id === z.id
                              ? 'bg-primary/10 border-primary/40'
                              : 'bg-surface-container border-outline-variant/25 hover:border-outline-variant'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-tertiary">
                                {z.geoId}
                              </span>
                              <span className="text-xs font-bold text-on-surface truncate">
                                {z.name}
                              </span>
                            </div>
                            <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                              {z.sector} • {z.touristCount} tourists inside
                            </p>
                          </div>
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              z.geofenceStatus === 'ACTIVE'
                                ? 'bg-secondary'
                                : 'bg-outline'
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-outline-variant/30 bg-surface-container flex items-center gap-2">
                  <button
                    onClick={() => toggleRiskZoneStatus(selectedZone.id)}
                    className="flex-1 py-2 px-3 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold cursor-pointer"
                  >
                    {selectedZone.geofenceStatus === 'ACTIVE'
                      ? 'Pause Fence'
                      : 'Activate Fence'}
                  </button>
                  <button
                    onClick={() => {
                      deleteRiskZone(selectedZone.id);
                      showToast(`Removed ${selectedZone.name}`, 'PRIMARY');
                    }}
                    className="py-2 px-3 rounded-lg bg-secondary-container/20 hover:bg-secondary-container/30 text-secondary border border-secondary/30 text-xs font-bold cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: INCIDENT INSPECTOR */}
            {inspectorTab === 'INCIDENT' && selectedIncident && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-primary">
                        {selectedIncident.id}
                      </span>
                      <SeverityBadge severity={selectedIncident.severity} />
                    </div>
                    <h3 className="text-sm font-bold text-on-surface mt-1">
                      {selectedIncident.title || selectedIncident.type.replace(/_/g, ' ')}
                    </h3>
                  </div>
                  <button
                    onClick={() => navigate(`/incidents/${selectedIncident.id}`)}
                    className="px-2.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-xs font-bold text-on-surface flex items-center gap-1 cursor-pointer"
                  >
                    <span>Full Case</span>
                    <span className="material-symbols-outlined text-xs">
                      open_in_new
                    </span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container border border-outline-variant/30">
                    <SafeImage
                      src={selectedIncident.touristAvatar || STITCH_ASSETS.arjunAvatar}
                      alt={selectedIncident.touristName}
                      className="w-11 h-11 rounded-full object-cover border border-outline-variant/40"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-on-surface truncate">
                        {selectedIncident.touristName}
                      </p>
                      <p className="text-xs text-on-surface-variant font-mono">
                        DTID: {selectedIncident.dtid} • Confidence:{' '}
                        {selectedIncident.aiAssessment?.confidencePercent ?? 96}%
                      </p>
                    </div>
                  </div>

                  <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="text-outline shrink-0">Location:</span>
                      <span className="font-semibold text-on-surface text-right">
                        {selectedIncident.location?.name || 'East Khasi Hills Sector'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-outline shrink-0">Coordinates:</span>
                      <span className="font-mono text-on-surface-variant">
                        {(selectedIncident.location?.lat ?? 25.5679).toFixed(4)}°N,{' '}
                        {(selectedIncident.location?.lng ?? 92.0124).toFixed(4)}°E
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-outline shrink-0">Assigned Unit:</span>
                      <span className="font-mono font-bold text-primary">
                        {selectedIncident.assignedUnitName || 'Unassigned'}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-outline-variant/25">
                      <span className="text-outline block mb-1">Summary:</span>
                      <p className="text-on-surface-variant leading-relaxed">
                        {selectedIncident.triggerDescription}
                      </p>
                    </div>
                  </div>

                  {/* Quick Incident Switcher */}
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-outline block mb-2">
                      Active Sector Incidents ({incidents.length})
                    </span>
                    <div className="space-y-2">
                      {incidents.map((inc) => (
                        <div
                          key={inc.id}
                          onClick={() => setSelectedIncidentId(inc.id)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                            selectedIncident.id === inc.id
                              ? 'bg-primary/10 border-primary/40'
                              : 'bg-surface-container border-outline-variant/25 hover:border-outline-variant'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-primary">
                                {inc.id}
                              </span>
                              <span className="text-xs font-bold text-on-surface truncate">
                                {inc.touristName}
                              </span>
                            </div>
                            <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                              {inc.location?.name || inc.title}
                            </p>
                          </div>
                          <SeverityBadge severity={inc.severity} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-outline-variant/30 bg-surface-container">
                  <button
                    onClick={handleDispatchNearestUnit}
                    className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isDispatched
                        ? 'bg-emerald-600 text-white'
                        : 'bg-primary hover:opacity-95 text-on-primary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {isDispatched ? 'check_circle' : 'local_police'}
                    </span>
                    <span>
                      {isDispatched
                        ? `Patrol Dispatched (${selectedIncident.assignedUnitName || 'Alpha-12'})`
                        : 'Dispatch Nearest Patrol Unit'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};
