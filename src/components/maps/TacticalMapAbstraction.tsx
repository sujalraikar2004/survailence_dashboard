import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Incident, ResponseUnit, RiskZone } from '../../types';

export type MapStyleMode = 'tactical' | 'street' | 'satellite' | 'terrain';
export type MapEntityFilter =
  | 'ALL'
  | 'EMERGENCIES'
  | 'HIGH_PRIORITY'
  | 'VERIFICATION'
  | 'TOURISTS'
  | 'RISK_ZONES'
  | 'RESPONSE_UNITS';

export type MapDrawingMode = 'NONE' | 'POLYGON' | 'CIRCLE_HOTSPOT';

export interface TouristClusterNode {
  id: string;
  label: string;
  count: number;
  lat: number;
  lng: number;
  elevatedRisk?: boolean;
}

const TILE_CONFIGS: Record<
  MapStyleMode,
  { url: string; attribution: string; className: string; maxZoom: number }
> = {
  tactical: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    className: 'tactical-osm-tiles',
    maxZoom: 19,
  },
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    className: 'street-osm-tiles',
    maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, GIS User Community',
    className: 'satellite-osm-tiles',
    maxZoom: 18,
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    className: 'street-osm-tiles',
    maxZoom: 17,
  },
};

export const SECTOR_VIEWPORTS: Record<string, { center: [number, number]; zoom: number }> = {
  'Meghalaya East Khasi Hills / Shillong Sector': {
    center: [25.558, 91.945],
    zoom: 12,
  },
  'Sohra / Cherrapunji Canyon Sector': {
    center: [25.265, 91.712],
    zoom: 13,
  },
  'Dawki — Umngot River Corridor': {
    center: [25.195, 92.015],
    zoom: 13,
  },
  'All Meghalaya Statewide Grid': {
    center: [25.43, 91.88],
    zoom: 10,
  },
};

const ZONE_POLYGONS_BY_ID: Record<string, [number, number][]> = {
  'RZ-01': [
    [25.579, 91.998],
    [25.582, 92.026],
    [25.563, 92.034],
    [25.553, 92.012],
    [25.561, 91.994],
  ],
  'RZ-02': [
    [25.286, 91.678],
    [25.289, 91.702],
    [25.269, 91.706],
    [25.266, 91.682],
  ],
  'RZ-03': [
    [25.661, 91.891],
    [25.664, 91.915],
    [25.646, 91.918],
    [25.643, 91.894],
  ],
  'RZ-04': [
    [25.249, 91.715],
    [25.251, 91.734],
    [25.235, 91.736],
    [25.233, 91.717],
  ],
  'RZ-05': [
    [25.541, 91.844],
    [25.543, 91.864],
    [25.527, 91.866],
    [25.525, 91.846],
  ],
};

const UNIT_COORDS_BY_ID: Record<string, [number, number]> = {
  'UNIT-ALPHA-12': [25.5565, 91.9935],
  'UNIT-BRAVO-04': [25.5788, 91.8833],
  'UNIT-CHARLIE-03': [25.4495, 91.9085],
  'UNIT-CHARLIE-02': [25.546, 91.969],
  'UNIT-SIERRA-01': [25.282, 91.698],
  'UNIT-EMS-04': [25.568, 91.924],
  'UNIT-DELTA-07': [25.269, 91.732],
};

const DEFAULT_CLUSTERS: TouristClusterNode[] = [
  { id: 'CL-1', label: 'Police Bazaar Hub', count: 428, lat: 25.5765, lng: 91.8825 },
  { id: 'CL-2', label: 'Elephant Falls Circuit', count: 142, lat: 25.5362, lng: 91.8225 },
  {
    id: 'CL-3',
    label: 'Mawryngkneng Trek',
    count: 86,
    lat: 25.5755,
    lng: 92.0265,
    elevatedRisk: true,
  },
  { id: 'CL-4', label: 'Sohra Viewpoint', count: 194, lat: 25.2735, lng: 91.721 },
];

export function getZonePolygonCoords(zone: RiskZone, idx: number): [number, number][] {
  if (zone.polygonCoords && zone.polygonCoords.length >= 3) {
    return zone.polygonCoords;
  }
  if (ZONE_POLYGONS_BY_ID[zone.id]) {
    return ZONE_POLYGONS_BY_ID[zone.id];
  }
  const cLat = zone.coordinatesCenter?.lat || 25.54 + idx * 0.02;
  const cLng = zone.coordinatesCenter?.lng || 91.91 + idx * 0.02;
  return [
    [cLat + 0.009, cLng - 0.011],
    [cLat + 0.011, cLng + 0.012],
    [cLat - 0.008, cLng + 0.014],
    [cLat - 0.01, cLng - 0.009],
  ];
}

function getZoneStyleColors(riskLevel: RiskZone['riskLevel'], isPaused: boolean) {
  if (isPaused) {
    return {
      stroke: '#88929b',
      fill: '#3e4850',
      text: '#bec8d2',
      badgeBg: 'rgba(25, 31, 47, 0.92)',
    };
  }
  if (riskLevel === 'HIGH_RISK') {
    return {
      stroke: '#ff5355',
      fill: '#a40217',
      text: '#ffb3ad',
      badgeBg: 'rgba(125, 0, 19, 0.92)',
    };
  }
  if (riskLevel === 'ELEVATED') {
    return {
      stroke: '#ffb95f',
      fill: '#d88a00',
      text: '#ffb95f',
      badgeBg: 'rgba(71, 42, 0, 0.92)',
    };
  }
  return {
    stroke: '#89ceff',
    fill: '#0ea5e9',
    text: '#89ceff',
    badgeBg: 'rgba(0, 52, 77, 0.92)',
  };
}

function renderRiskZoneOnLayerGroup(
  zone: RiskZone,
  idx: number,
  group: L.LayerGroup,
  selectedZoneId?: string | null,
  onSelectZone?: (zone: RiskZone) => void
) {
  const isPaused = zone.geofenceStatus === 'PAUSED';
  const isSelected = selectedZoneId === zone.id;
  const colors = getZoneStyleColors(zone.riskLevel, isPaused);
  const strokeWeight = isSelected ? 3.5 : 2.2;
  const fillOpacity = isPaused ? 0.08 : isSelected ? 0.34 : 0.22;

  const tooltipHtml = `
    <div style="font-weight:700;color:${colors.text}">
      ${zone.geoId} • ${zone.name}
    </div>
    <div style="color:#dde2f8;font-size:10px;margin-top:2px;">
      ${zone.shapeType === 'CIRCLE_HOTSPOT' ? `HOTSPOT CORDON (${zone.radiusMeters || 500}m)` : 'RESTRICTED POLYGON FENCE'} • ${zone.riskLevel.replace('_', ' ')}
    </div>
    <div style="color:#bec8d2;font-size:9.5px;margin-top:1px;">
      Status: ${zone.geofenceStatus.replace('_', ' ')} | ${zone.touristCount} Devices In-Zone
    </div>
  `;

  if (zone.shapeType === 'CIRCLE_HOTSPOT') {
    const radius = zone.radiusMeters || 600;
    const center: [number, number] = [zone.coordinatesCenter.lat, zone.coordinatesCenter.lng];

    const circle = L.circle(center, {
      radius,
      color: isSelected ? '#ffffff' : colors.stroke,
      weight: strokeWeight,
      dashArray: isPaused ? '3, 6' : zone.riskLevel === 'HIGH_RISK' ? '7, 5' : '5, 5',
      fillColor: colors.fill,
      fillOpacity,
    });

    circle.bindTooltip(tooltipHtml, { className: 'tactical-map-tooltip', sticky: true });
    circle.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      if (onSelectZone) onSelectZone(zone);
    });
    circle.addTo(group);

    // Center Hotspot Beacon Badge
    const hotspotBadge = L.divIcon({
      className: 'tactical-div-icon',
      iconSize: [140, 32],
      iconAnchor: [70, 16],
      html: `
        <div style="display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:6px;background:${colors.badgeBg};border:1.5px solid ${
        isSelected ? '#ffffff' : colors.stroke
      };box-shadow:0 4px 12px rgba(0,0,0,0.65);font-family:'JetBrains Mono',monospace;cursor:pointer;white-space:nowrap;">
          <span class="material-symbols-outlined" style="font-size:13px;color:${colors.text};">radar</span>
          <span style="font-size:9.5px;font-weight:700;color:#ffffff;">${zone.geoId}</span>
          <span style="font-size:8.5px;color:${colors.text};">HOTSPOT (${radius}m)</span>
        </div>
      `,
    });

    const badgeMarker = L.marker(center, { icon: hotspotBadge, zIndexOffset: 250 });
    badgeMarker.bindTooltip(tooltipHtml, { className: 'tactical-map-tooltip', direction: 'top' });
    badgeMarker.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      if (onSelectZone) onSelectZone(zone);
    });
    badgeMarker.addTo(group);
  } else {
    const coords = getZonePolygonCoords(zone, idx);
    const poly = L.polygon(coords, {
      color: isSelected ? '#ffffff' : colors.stroke,
      weight: strokeWeight,
      dashArray: isPaused ? '3, 6' : zone.riskLevel === 'HIGH_RISK' ? '6, 4' : '4, 4',
      fillColor: colors.fill,
      fillOpacity,
    });

    poly.bindTooltip(tooltipHtml, { className: 'tactical-map-tooltip', sticky: true });
    poly.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      if (onSelectZone) onSelectZone(zone);
    });
    poly.addTo(group);

    // Polygon Centroid Tag
    const centerLat =
      coords.reduce((acc, pt) => acc + pt[0], 0) / Math.max(coords.length, 1);
    const centerLng =
      coords.reduce((acc, pt) => acc + pt[1], 0) / Math.max(coords.length, 1);

    const fenceBadge = L.divIcon({
      className: 'tactical-div-icon',
      iconSize: [140, 26],
      iconAnchor: [70, 13],
      html: `
        <div style="display:inline-flex;align-items:center;gap:4px;padding:1.5px 7px;border-radius:4px;background:${colors.badgeBg};border:1px solid ${
        isSelected ? '#ffffff' : colors.stroke
      };font-family:'JetBrains Mono',monospace;cursor:pointer;white-space:nowrap;box-shadow:0 3px 10px rgba(0,0,0,0.6);">
          <span class="material-symbols-outlined" style="font-size:12px;color:${colors.text};">shield_lock</span>
          <span style="font-size:9px;font-weight:700;color:#ffffff;">${zone.geoId}</span>
          <span style="font-size:8.5px;color:${colors.text};">${
        zone.riskLevel === 'HIGH_RISK' ? 'RESTRICTED' : 'FENCE'
      }</span>
        </div>
      `,
    });

    const badgeMarker = L.marker([centerLat, centerLng], { icon: fenceBadge, zIndexOffset: 240 });
    badgeMarker.bindTooltip(tooltipHtml, { className: 'tactical-map-tooltip', direction: 'top' });
    badgeMarker.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      if (onSelectZone) onSelectZone(zone);
    });
    badgeMarker.addTo(group);
  }
}

function getUnitCoords(unit: ResponseUnit, idx: number): [number, number] {
  if (UNIT_COORDS_BY_ID[unit.id]) {
    return UNIT_COORDS_BY_ID[unit.id];
  }
  return [25.55 + (idx % 4) * 0.018, 91.89 + (idx % 3) * 0.025];
}

export const MapLegend: React.FC = () => (
  <footer className="shrink-0 z-20 bg-surface-container-lowest border-t border-outline-variant/25 px-space-md py-2 flex items-center justify-between flex-wrap gap-3 text-outline">
    <div className="flex items-center gap-4 overflow-x-auto font-label-sm text-[10px] no-scrollbar">
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="h-2.5 w-2.5 rounded-full bg-secondary animate-pulse"></span>
        <span className="text-on-surface font-semibold">Critical SOS</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="h-2.5 w-2.5 rounded-full bg-tertiary"></span>
        <span>High Priority / Anomaly</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="h-2.5 w-2.5 rounded-full bg-primary"></span>
        <span>Tourist Cluster</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="material-symbols-outlined text-primary text-[13px]">local_police</span>
        <span>Response Patrol</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="inline-block w-3 h-2 rounded-xs bg-secondary/35 border border-secondary"></span>
        <span>Restricted Geofence</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-tertiary/35 border border-tertiary"></span>
        <span>Marked Hotspot Cordon</span>
      </div>
    </div>
    <div className="flex items-center gap-4 font-mono font-label-sm text-[10px]">
      <span>
        MAP ENGINE: <strong className="text-primary">OPENSTREETMAP / WGS84</strong>
      </span>
      <span className="hidden sm:inline">
        ENCRYPTION: <strong className="text-on-surface">TLS 1.3 / AES-256</strong>
      </span>
      <span className="flex items-center gap-1 text-emerald-400 font-bold">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        OSM TELEMETRY LIVE
      </span>
    </div>
  </footer>
);

export const MapView: React.FC<{
  incidents: Incident[];
  riskZones: RiskZone[];
  responseUnits: ResponseUnit[];
  selectedIncidentId: string | null;
  selectedZoneId?: string | null;
  onSelectIncident: (inc: Incident) => void;
  onSelectUnit?: (unit: ResponseUnit) => void;
  onSelectZone?: (zone: RiskZone) => void;
  activeFilter: MapEntityFilter;
  mapStyle: MapStyleMode;
  selectedSector?: string;
  drawingMode?: MapDrawingMode;
  draftPolygonPoints?: [number, number][];
  draftHotspotCenter?: { lat: number; lng: number } | null;
  draftHotspotRadius?: number;
  draftRiskLevel?: RiskZone['riskLevel'];
  onMapDrawClick?: (lat: number, lng: number) => void;
  zoom: number;
  pan: { x: number; y: number };
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onPanChange: (pan: { x: number; y: number }) => void;
}> = ({
  incidents,
  riskZones,
  responseUnits,
  selectedIncidentId,
  selectedZoneId = null,
  onSelectIncident,
  onSelectUnit,
  onSelectZone,
  activeFilter,
  mapStyle,
  selectedSector = 'Meghalaya East Khasi Hills / Shillong Sector',
  drawingMode = 'NONE',
  draftPolygonPoints = [],
  draftHotspotCenter = null,
  draftHotspotRadius = 450,
  draftRiskLevel = 'HIGH_RISK',
  onMapDrawClick,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const overlayGroupRef = useRef<L.LayerGroup | null>(null);
  const drawGroupRef = useRef<L.LayerGroup | null>(null);
  const drawClickCallbackRef = useRef<typeof onMapDrawClick>(onMapDrawClick);
  const drawingModeRef = useRef<MapDrawingMode>(drawingMode);

  useEffect(() => {
    drawClickCallbackRef.current = onMapDrawClick;
    drawingModeRef.current = drawingMode;
  }, [onMapDrawClick, drawingMode]);

  const [cursorCoords, setCursorCoords] = useState({ lat: '25.5679', lng: '92.0124' });
  const [currentZoom, setCurrentZoom] = useState<number>(12);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialViewport =
      SECTOR_VIEWPORTS[selectedSector] ||
      SECTOR_VIEWPORTS['Meghalaya East Khasi Hills / Shillong Sector'];

    const map = L.map(containerRef.current, {
      center: initialViewport.center,
      zoom: initialViewport.zoom,
      zoomControl: false,
      attributionControl: true,
    });

    const tileCfg = TILE_CONFIGS[mapStyle] || TILE_CONFIGS.tactical;
    const tileLayer = L.tileLayer(tileCfg.url, {
      attribution: tileCfg.attribution,
      maxZoom: tileCfg.maxZoom,
    }).addTo(map);

    const overlayGroup = L.layerGroup().addTo(map);
    const drawGroup = L.layerGroup().addTo(map);

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCursorCoords({
        lat: e.latlng.lat.toFixed(4),
        lng: e.latlng.lng.toFixed(4),
      });
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (drawingModeRef.current !== 'NONE' && drawClickCallbackRef.current) {
        drawClickCallbackRef.current(
          Number(e.latlng.lat.toFixed(5)),
          Number(e.latlng.lng.toFixed(5))
        );
      }
    });

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    mapRef.current = map;
    tileLayerRef.current = tileLayer;
    overlayGroupRef.current = overlayGroup;
    drawGroupRef.current = drawGroup;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      overlayGroupRef.current = null;
      drawGroupRef.current = null;
    };
  }, []);

  // Switch Tile Layer when mapStyle changes
  useEffect(() => {
    if (!mapRef.current) return;
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }
    const tileCfg = TILE_CONFIGS[mapStyle] || TILE_CONFIGS.tactical;
    tileLayerRef.current = L.tileLayer(tileCfg.url, {
      attribution: tileCfg.attribution,
      maxZoom: tileCfg.maxZoom,
    }).addTo(mapRef.current);
  }, [mapStyle]);

  // Fly to Sector when selectedSector changes
  useEffect(() => {
    if (!mapRef.current) return;
    const vp = SECTOR_VIEWPORTS[selectedSector];
    if (vp) {
      mapRef.current.flyTo(vp.center, vp.zoom, { duration: 0.85 });
    }
  }, [selectedSector]);

  // Fly to selected incident when clicked
  useEffect(() => {
    if (!mapRef.current || !selectedIncidentId || drawingMode !== 'NONE') return;
    const inc = incidents.find((i) => i.id === selectedIncidentId);
    if (inc) {
      mapRef.current.flyTo(
        [inc.location.lat, inc.location.lng],
        Math.max(mapRef.current.getZoom(), 13),
        { duration: 0.75 }
      );
    }
  }, [selectedIncidentId]);

  // Fly to selected risk zone when clicked
  useEffect(() => {
    if (!mapRef.current || !selectedZoneId || drawingMode !== 'NONE') return;
    const zone = riskZones.find((z) => z.id === selectedZoneId);
    if (zone && zone.coordinatesCenter) {
      mapRef.current.flyTo(
        [zone.coordinatesCenter.lat, zone.coordinatesCenter.lng],
        Math.max(mapRef.current.getZoom(), 13),
        { duration: 0.75 }
      );
    }
  }, [selectedZoneId]);

  // Render Live Draft Fence / Hotspot Overlay during Police Drawing Mode
  useEffect(() => {
    const drawGroup = drawGroupRef.current;
    if (!drawGroup) return;
    drawGroup.clearLayers();

    if (drawingMode === 'NONE') return;

    const colors = getZoneStyleColors(draftRiskLevel, false);

    if (drawingMode === 'POLYGON' && draftPolygonPoints.length > 0) {
      if (draftPolygonPoints.length >= 3) {
        L.polygon(draftPolygonPoints, {
          color: colors.stroke,
          weight: 2.8,
          dashArray: '6, 4',
          fillColor: colors.fill,
          fillOpacity: 0.3,
        })
          .bindTooltip(
            `<strong>DRAFT RESTRICTED FENCE (${draftPolygonPoints.length} vertices)</strong>`,
            { className: 'tactical-map-tooltip', sticky: true }
          )
          .addTo(drawGroup);
      } else if (draftPolygonPoints.length === 2) {
        L.polyline(draftPolygonPoints, {
          color: colors.stroke,
          weight: 2.8,
          dashArray: '6, 4',
        }).addTo(drawGroup);
      }

      // Render numbered vertex handles
      draftPolygonPoints.forEach((pt, index) => {
        const vertexIcon = L.divIcon({
          className: 'tactical-div-icon',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          html: `
            <div style="width:22px;height:22px;border-radius:999px;background:${colors.badgeBg};border:2px solid #ffffff;color:#ffffff;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.8);">
              ${index + 1}
            </div>
          `,
        });
        L.marker(pt, { icon: vertexIcon, zIndexOffset: 1200 })
          .bindTooltip(`Vertex #${index + 1}: ${pt[0].toFixed(4)}°N, ${pt[1].toFixed(4)}°E`, {
            className: 'tactical-map-tooltip',
            direction: 'top',
          })
          .addTo(drawGroup);
      });
    }

    if (drawingMode === 'CIRCLE_HOTSPOT' && draftHotspotCenter) {
      const center: [number, number] = [draftHotspotCenter.lat, draftHotspotCenter.lng];
      L.circle(center, {
        radius: draftHotspotRadius,
        color: colors.stroke,
        weight: 2.8,
        dashArray: '6, 4',
        fillColor: colors.fill,
        fillOpacity: 0.3,
      })
        .bindTooltip(
          `<strong>DRAFT HOTSPOT CORDON (Radius: ${draftHotspotRadius}m)</strong>`,
          { className: 'tactical-map-tooltip', sticky: true }
        )
        .addTo(drawGroup);

      const centerIcon = L.divIcon({
        className: 'tactical-div-icon',
        iconSize: [150, 44],
        iconAnchor: [75, 22],
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;">
            <div style="position:relative;display:flex;align-items:center;justify-content:center;">
              <span style="position:absolute;width:36px;height:36px;border-radius:999px;background:${colors.stroke};opacity:0.35;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>
              <div style="position:relative;width:26px;height:26px;border-radius:999px;background:${colors.badgeBg};border:2px solid #ffffff;color:#ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.85);">
                <span class="material-symbols-outlined" style="font-size:15px;">radar</span>
              </div>
            </div>
            <div style="margin-top:2px;padding:1.5px 6px;border-radius:4px;background:rgba(8,14,29,0.95);border:1px solid ${colors.stroke};color:${colors.text};font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;white-space:nowrap;">
              HOTSPOT • ${draftHotspotRadius}m RADIUS
            </div>
          </div>
        `,
      });
      L.marker(center, { icon: centerIcon, zIndexOffset: 1200 }).addTo(drawGroup);
    }
  }, [drawingMode, draftPolygonPoints, draftHotspotCenter, draftHotspotRadius, draftRiskLevel]);

  // Render dynamic layers (Geofences, Incidents, Units, Tourist Clusters, Intercept Vectors)
  useEffect(() => {
    const group = overlayGroupRef.current;
    if (!group) return;
    group.clearLayers();

    const showIncidents =
      activeFilter === 'ALL' ||
      activeFilter === 'EMERGENCIES' ||
      activeFilter === 'HIGH_PRIORITY' ||
      activeFilter === 'VERIFICATION';
    const showRiskZones =
      activeFilter === 'ALL' || activeFilter === 'RISK_ZONES' || drawingMode !== 'NONE';
    const showTourists = activeFilter === 'ALL' || activeFilter === 'TOURISTS';
    const showUnits = activeFilter === 'ALL' || activeFilter === 'RESPONSE_UNITS';

    // 1. Risk Zone Geofence Polygons & Circular Hotspots
    if (showRiskZones) {
      riskZones.forEach((zone, idx) => {
        renderRiskZoneOnLayerGroup(zone, idx, group, selectedZoneId, (clickedZone) => {
          if (drawingMode === 'NONE' && onSelectZone) {
            onSelectZone(clickedZone);
          }
        });
      });
    }

    // 2. Intercept Route Vector (Alpha-12 -> Active SOS)
    const sosIncident = incidents.find(
      (i) => i.id === 'INC-2026-00421' && i.status !== 'RESOLVED' && i.status !== 'UNFOUNDED'
    );
    const alphaUnit = responseUnits.find((u) => u.id === 'UNIT-ALPHA-12');
    if (sosIncident && alphaUnit && (showIncidents || showUnits)) {
      const unitCoords = getUnitCoords(alphaUnit, 0);
      const vectorLine = L.polyline(
        [
          unitCoords,
          [25.5625, 92.003],
          [sosIncident.location.lat, sosIncident.location.lng],
        ],
        {
          color: '#89ceff',
          weight: 3,
          dashArray: '8, 6',
          opacity: 0.9,
        }
      );
      vectorLine.bindTooltip('INTERCEPT VECTOR: ALPHA-12 → SOS BEACON (1.8 km)', {
        className: 'tactical-map-tooltip',
      });
      vectorLine.addTo(group);
    }

    // 3. Tourist Clusters
    if (showTourists) {
      DEFAULT_CLUSTERS.forEach((cluster) => {
        const borderCol = cluster.elevatedRisk ? '#ffb95f' : '#89ceff';
        const bgCol = cluster.elevatedRisk ? 'rgba(71, 42, 0, 0.92)' : 'rgba(21, 27, 43, 0.92)';
        const textCol = cluster.elevatedRisk ? '#ffb95f' : '#dde2f8';

        const icon = L.divIcon({
          className: 'tactical-div-icon',
          iconSize: [140, 30],
          iconAnchor: [70, 15],
          html: `
            <div style="display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;background:${bgCol};border:1px solid ${borderCol};box-shadow:0 4px 12px rgba(0,0,0,0.6);white-space:nowrap;font-family:'JetBrains Mono',monospace;">
              <span style="width:7px;height:7px;border-radius:50%;background:${borderCol};display:inline-block;"></span>
              <span style="font-weight:700;font-size:11px;color:${textCol};">${cluster.count}</span>
              <span style="font-size:10px;color:#bec8d2;">${cluster.label}</span>
            </div>
          `,
        });

        L.marker([cluster.lat, cluster.lng], { icon })
          .bindTooltip(
            `<strong>${cluster.label}</strong><br/>${cluster.count} Monitored Digital Tourist IDs`,
            { className: 'tactical-map-tooltip', direction: 'top' }
          )
          .addTo(group);
      });
    }

    // 4. Police & Responder Patrol Units
    if (showUnits) {
      responseUnits.forEach((unit, idx) => {
        const coords = getUnitCoords(unit, idx);
        const isEngaged = unit.status === 'EN_ROUTE' || unit.status === 'ON_SCENE';
        const badgeBg = isEngaged ? '#0ea5e9' : '#191f2f';
        const badgeText = isEngaged ? '#001e2f' : '#89ceff';
        const borderCol = isEngaged ? '#89ceff' : '#3e4850';

        const icon = L.divIcon({
          className: 'tactical-div-icon',
          iconSize: [120, 44],
          iconAnchor: [60, 22],
          html: `
            <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
              <div style="width:28px;height:28px;border-radius:8px;background:${badgeBg};color:${badgeText};border:1.5px solid ${borderCol};display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.65);">
                <span class="material-symbols-outlined" style="font-size:16px;">${unit.vehicleIcon || 'local_police'}</span>
              </div>
              <div style="margin-top:2px;padding:1px 6px;border-radius:4px;background:rgba(13,19,34,0.94);border:1px solid ${borderCol};color:#dde2f8;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.5);">
                ${unit.name.toUpperCase()} • ${unit.status.replace('_', ' ')}
              </div>
            </div>
          `,
        });

        const marker = L.marker(coords, { icon });
        marker.bindTooltip(
          `<div><strong>${unit.name} (${unit.code})</strong></div>
           <div>Lead: ${unit.leadOfficer} • ${unit.radioChannel}</div>
           <div style="color:#89ceff">ETA: ${unit.etaText} • ${unit.speedKmh} km/h</div>`,
          { className: 'tactical-map-tooltip', direction: 'top', offset: [0, -16] }
        );
        marker.on('click', () => {
          if (drawingMode === 'NONE' && onSelectUnit) onSelectUnit(unit);
        });
        marker.addTo(group);
      });
    }

    // 5. Incident Pins
    if (showIncidents) {
      const visibleIncidents = incidents.filter((inc) => {
        if (inc.status === 'RESOLVED' || inc.status === 'UNFOUNDED') return false;
        if (activeFilter === 'EMERGENCIES') return inc.severity === 'CRITICAL';
        if (activeFilter === 'HIGH_PRIORITY')
          return inc.severity === 'HIGH' || inc.severity === 'CONCERN';
        if (activeFilter === 'VERIFICATION') return inc.severity === 'VERIFICATION';
        return true;
      });

      visibleIncidents.forEach((inc) => {
        const isCritical = inc.severity === 'CRITICAL';
        const isConcern = inc.severity === 'HIGH' || inc.severity === 'CONCERN';
        const isSelected = selectedIncidentId === inc.id;

        const pinBg = isCritical ? '#a40217' : isConcern ? '#d88a00' : '#242a3a';
        const pinBorder = isSelected
          ? '#ffffff'
          : isCritical
          ? '#ffb3ad'
          : isConcern
          ? '#ffb95f'
          : '#89ceff';
        const labelColor = isCritical ? '#ffb3ad' : isConcern ? '#ffb95f' : '#89ceff';

        const icon = L.divIcon({
          className: 'tactical-div-icon',
          iconSize: [150, 56],
          iconAnchor: [75, 28],
          html: `
            <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
              <div style="position:relative;display:flex;align-items:center;justify-content:center;">
                ${
                  isCritical
                    ? `<span style="position:absolute;width:42px;height:42px;border-radius:999px;background:rgba(255,83,85,0.35);animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>`
                    : ''
                }
                <div style="position:relative;width:32px;height:32px;border-radius:999px;background:${pinBg};border:2px solid ${pinBorder};color:#ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(0,0,0,0.75);">
                  <span class="material-symbols-outlined" style="font-size:17px;">${
                    isCritical ? 'sos' : isConcern ? 'warning' : 'help'
                  }</span>
                </div>
              </div>
              <div style="margin-top:3px;padding:2px 7px;border-radius:5px;background:rgba(8,14,29,0.95);border:1px solid ${pinBorder};font-family:'JetBrains Mono',monospace;font-size:9.5px;font-weight:700;color:${labelColor};white-space:nowrap;box-shadow:0 4px 10px rgba(0,0,0,0.65);">
                ${inc.id.replace('INC-2026-', '#')} • ${inc.touristName.split(' ')[0].toUpperCase()}
              </div>
            </div>
          `,
        });

        const marker = L.marker([inc.location.lat, inc.location.lng], {
          icon,
          zIndexOffset: isCritical ? 1000 : isConcern ? 500 : 100,
        });

        marker.bindTooltip(
          `<div style="font-weight:700;color:${labelColor}">${inc.id} — ${inc.tierLabel}</div>
           <div style="font-weight:600;color:#dde2f8">${inc.touristName} (${inc.dtid})</div>
           <div style="color:#bec8d2;font-size:9px">${inc.location.name} • ±${inc.location.accuracyMeters}m</div>`,
          { className: 'tactical-map-tooltip', direction: 'top', offset: [0, -22] }
        );

        marker.on('click', () => {
          if (drawingMode === 'NONE') {
            onSelectIncident(inc);
          }
        });

        marker.addTo(group);
      });
    }
  }, [
    incidents,
    riskZones,
    responseUnits,
    activeFilter,
    selectedIncidentId,
    selectedZoneId,
    drawingMode,
    onSelectIncident,
    onSelectUnit,
    onSelectZone,
  ]);

  const tileClass = (TILE_CONFIGS[mapStyle] || TILE_CONFIGS.tactical).className;

  return (
    <div
      className={`relative isolate z-0 flex-1 w-full h-full overflow-hidden ${tileClass} ${
        drawingMode !== 'NONE' ? 'cursor-crosshair' : ''
      }`}
    >
      {/* Real OpenStreetMap Container */}
      <div
        ref={containerRef}
        className={`w-full h-full ${drawingMode !== 'NONE' ? '!cursor-crosshair' : ''}`}
      />

      {/* Non-Overlapping Left-Top Tactical Map Zoom & Compass Controls */}
      <div className="absolute top-3 left-3 z-[400] flex flex-col gap-1.5 pointer-events-auto">
        <div className="bg-surface-container/95 backdrop-blur-md border border-outline-variant/30 rounded-lg p-1 flex flex-col items-center shadow-xl">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            title="Zoom In OpenStreetMap"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
          </button>
          <div className="w-4 h-px bg-outline/20 my-0.5"></div>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            title="Zoom Out OpenStreetMap"
          >
            <span className="material-symbols-outlined text-[18px]">remove</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            const vp =
              SECTOR_VIEWPORTS[selectedSector] ||
              SECTOR_VIEWPORTS['Meghalaya East Khasi Hills / Shillong Sector'];
            mapRef.current?.flyTo(vp.center, vp.zoom, { duration: 0.75 });
          }}
          className="bg-surface-container/95 backdrop-blur-md border border-outline-variant/30 rounded-lg p-1.5 flex items-center justify-center shadow-xl cursor-pointer hover:bg-surface-container-high transition-colors"
          title="Re-Center Sector Viewport"
        >
          <span className="material-symbols-outlined text-primary text-[18px]">my_location</span>
        </button>
      </div>

      {/* Non-Overlapping Bottom-Left Geodetic Coordinate Crosshair Readout */}
      <div className="absolute bottom-3 left-3 z-[400] bg-surface-container-lowest/92 backdrop-blur-md border border-outline-variant/30 px-3 py-1.5 rounded-lg flex items-center gap-3 font-mono font-label-sm text-[10px] text-outline shadow-xl pointer-events-none">
        <span className="text-primary font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
          {drawingMode !== 'NONE' ? 'FENCE MARKING ACTIVE' : 'OSM LIVE'}
        </span>
        <span className="text-on-surface">
          LAT {cursorCoords.lat}° N, LNG {cursorCoords.lng}° E
        </span>
        <span className="hidden sm:inline">ZOOM: {currentZoom}x</span>
      </div>
    </div>
  );
};

/**
 * Interactive OpenStreetMap Mini-Map for Command Center Dashboard (/dashboard)
 */
export const CommandCenterMiniMap: React.FC<{
  incidents: Incident[];
  riskZones: RiskZone[];
  responseUnits: ResponseUnit[];
  onSelectIncident: (incidentId: string) => void;
  onSelectUnit: (unitId: string) => void;
}> = ({ incidents, riskZones, responseUnits, onSelectIncident, onSelectUnit }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const [styleMode, setStyleMode] = useState<MapStyleMode>('tactical');

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [25.562, 91.975],
      zoom: 12,
      zoomControl: false,
      attributionControl: true,
    });

    const cfg = TILE_CONFIGS[styleMode];
    const tile = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);

    mapRef.current = map;
    tileLayerRef.current = tile;
    layerGroupRef.current = group;

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }
    const cfg = TILE_CONFIGS[styleMode];
    tileLayerRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(mapRef.current);
  }, [styleMode]);

  useEffect(() => {
    const group = layerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    // Draw Risk Zones & Hotspots
    riskZones.forEach((zone, idx) => {
      renderRiskZoneOnLayerGroup(zone, idx, group);
    });

    // Draw Intercept Vector
    const sosInc = incidents.find((i) => i.id === 'INC-2026-00421');
    const alpha = responseUnits.find((u) => u.id === 'UNIT-ALPHA-12');
    if (sosInc && alpha) {
      L.polyline(
        [
          getUnitCoords(alpha, 0),
          [25.5625, 92.003],
          [sosInc.location.lat, sosInc.location.lng],
        ],
        { color: '#89ceff', weight: 2.5, dashArray: '6, 5' }
      ).addTo(group);
    }

    // Draw Patrol Units
    responseUnits.slice(0, 4).forEach((unit, idx) => {
      const coords = getUnitCoords(unit, idx);
      const icon = L.divIcon({
        className: 'tactical-div-icon',
        iconSize: [105, 38],
        iconAnchor: [52, 19],
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
            <div style="width:24px;height:24px;border-radius:6px;background:#0ea5e9;color:#001e2f;border:1.5px solid #89ceff;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.6);">
              <span class="material-symbols-outlined" style="font-size:14px;">${unit.vehicleIcon || 'local_police'}</span>
            </div>
            <div style="margin-top:2px;padding:1px 5px;border-radius:4px;background:rgba(8,14,29,0.92);border:1px solid rgba(137,206,255,0.35);color:#89ceff;font-family:'JetBrains Mono',monospace;font-size:8.5px;font-weight:700;white-space:nowrap;">
              ${unit.name.toUpperCase()}
            </div>
          </div>
        `,
      });
      L.marker(coords, { icon })
        .on('click', () => onSelectUnit(unit.id))
        .addTo(group);
    });

    // Draw Active Incidents
    incidents
      .filter((i) => i.status !== 'RESOLVED' && i.status !== 'UNFOUNDED')
      .forEach((inc) => {
        const isCritical = inc.severity === 'CRITICAL';
        const pinBg = isCritical ? '#a40217' : '#d88a00';
        const pinBorder = isCritical ? '#ffb3ad' : '#ffb95f';
        const icon = L.divIcon({
          className: 'tactical-div-icon',
          iconSize: [130, 48],
          iconAnchor: [65, 24],
          html: `
            <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
              <div style="position:relative;display:flex;align-items:center;justify-content:center;">
                ${
                  isCritical
                    ? `<span style="position:absolute;width:36px;height:36px;border-radius:999px;background:rgba(255,83,85,0.35);animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>`
                    : ''
                }
                <div style="position:relative;width:28px;height:28px;border-radius:999px;background:${pinBg};border:2px solid ${pinBorder};color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.7);">
                  <span class="material-symbols-outlined" style="font-size:15px;">${isCritical ? 'emergency' : 'warning'}</span>
                </div>
              </div>
              <div style="margin-top:2px;padding:1.5px 6px;border-radius:4px;background:rgba(8,14,29,0.95);border:1px solid ${pinBorder};color:${pinBorder};font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;white-space:nowrap;">
                ${isCritical ? 'SOS: ' : ''}${inc.touristName.split(' ')[0].toUpperCase()}
              </div>
            </div>
          `,
        });
        L.marker([inc.location.lat, inc.location.lng], {
          icon,
          zIndexOffset: isCritical ? 900 : 300,
        })
          .on('click', () => onSelectIncident(inc.id))
          .addTo(group);
      });
  }, [incidents, riskZones, responseUnits, onSelectIncident, onSelectUnit]);

  const tileClass = TILE_CONFIGS[styleMode].className;

  return (
    <div className="flex flex-col rounded-xl overflow-hidden border border-outline-variant/25 bg-surface-container-lowest shadow-lg">
      {/* Clean Non-Overlapping Top Map Bar */}
      <div className="px-3 py-2 bg-surface-container flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/20">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
          <span className="text-on-surface font-bold">SECTOR: EAST KHASI HILLS &amp; SOHRA</span>
          <span className="text-outline hidden sm:inline">
            • {riskZones.length} Restricted Zones &amp; Hotspots Active
          </span>
        </div>
        <div className="flex items-center gap-1 bg-surface-container-lowest p-0.5 rounded-lg">
          {(
            [
              ['tactical', 'Tactical Dark'],
              ['street', 'OSM Street'],
              ['satellite', 'Satellite'],
              ['terrain', 'Topo'],
            ] as [MapStyleMode, string][]
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setStyleMode(mode)}
              className={`px-2 py-0.5 rounded font-label-sm text-[10px] transition-colors ${
                styleMode === mode
                  ? 'bg-primary-container text-on-primary-container font-bold'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Real OpenStreetMap Canvas */}
      <div className={`relative isolate z-0 w-full h-80 ${tileClass}`}>
        <div ref={containerRef} className="w-full h-full" />

        <div className="absolute bottom-3 right-3 z-[400] flex items-center gap-1 bg-surface-container/95 backdrop-blur-md border border-outline-variant/30 p-1 rounded-lg shadow-lg">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            className="w-7 h-7 rounded bg-surface-container-high text-on-surface flex items-center justify-center hover:bg-surface-variant"
            title="Zoom In"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            className="w-7 h-7 rounded bg-surface-container-high text-on-surface flex items-center justify-center hover:bg-surface-variant"
            title="Zoom Out"
          >
            <span className="material-symbols-outlined text-[16px]">remove</span>
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.flyTo([25.565, 92.002], 13, { duration: 0.7 })}
            className="px-2 h-7 rounded bg-surface-container-high text-primary font-mono text-[10px] font-bold flex items-center gap-1 hover:bg-surface-variant"
            title="Focus Active SOS"
          >
            <span className="material-symbols-outlined text-[14px]">my_location</span>
            Focus SOS
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Interactive OpenStreetMap Geofence & Hotspot Editor Map for /risk-zones
 */
export const RiskZonesInteractiveMap: React.FC<{
  riskZones: RiskZone[];
  selectedZoneId: string | null;
  onSelectZone: (zone: RiskZone) => void;
  drawingMode: MapDrawingMode;
  draftPolygonPoints: [number, number][];
  draftHotspotCenter: { lat: number; lng: number } | null;
  draftHotspotRadius: number;
  draftRiskLevel: RiskZone['riskLevel'];
  onMapDrawClick: (lat: number, lng: number) => void;
}> = ({
  riskZones,
  selectedZoneId,
  onSelectZone,
  drawingMode,
  draftPolygonPoints,
  draftHotspotCenter,
  draftHotspotRadius,
  draftRiskLevel,
  onMapDrawClick,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const zonesGroupRef = useRef<L.LayerGroup | null>(null);
  const drawGroupRef = useRef<L.LayerGroup | null>(null);
  const drawClickRef = useRef(onMapDrawClick);
  const modeRef = useRef(drawingMode);

  useEffect(() => {
    drawClickRef.current = onMapDrawClick;
    modeRef.current = drawingMode;
  }, [onMapDrawClick, drawingMode]);

  const [styleMode, setStyleMode] = useState<MapStyleMode>('tactical');
  const [cursorCoords, setCursorCoords] = useState({ lat: '25.5682', lng: '92.0124' });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [25.558, 91.945],
      zoom: 11,
      zoomControl: false,
      attributionControl: true,
    });

    const cfg = TILE_CONFIGS[styleMode];
    const tile = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(map);

    const zGroup = L.layerGroup().addTo(map);
    const dGroup = L.layerGroup().addTo(map);

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCursorCoords({
        lat: e.latlng.lat.toFixed(4),
        lng: e.latlng.lng.toFixed(4),
      });
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (modeRef.current !== 'NONE' && drawClickRef.current) {
        drawClickRef.current(
          Number(e.latlng.lat.toFixed(5)),
          Number(e.latlng.lng.toFixed(5))
        );
      }
    });

    mapRef.current = map;
    tileLayerRef.current = tile;
    zonesGroupRef.current = zGroup;
    drawGroupRef.current = dGroup;

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }
    const cfg = TILE_CONFIGS[styleMode];
    tileLayerRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(mapRef.current);
  }, [styleMode]);

  useEffect(() => {
    if (!mapRef.current || !selectedZoneId) return;
    const z = riskZones.find((item) => item.id === selectedZoneId);
    if (z?.coordinatesCenter) {
      mapRef.current.flyTo([z.coordinatesCenter.lat, z.coordinatesCenter.lng], 13, {
        duration: 0.75,
      });
    }
  }, [selectedZoneId]);

  useEffect(() => {
    const group = zonesGroupRef.current;
    if (!group) return;
    group.clearLayers();
    riskZones.forEach((zone, idx) => {
      renderRiskZoneOnLayerGroup(zone, idx, group, selectedZoneId, (clicked) => {
        if (drawingMode === 'NONE') {
          onSelectZone(clicked);
        }
      });
    });
  }, [riskZones, selectedZoneId, drawingMode, onSelectZone]);

  useEffect(() => {
    const dGroup = drawGroupRef.current;
    if (!dGroup) return;
    dGroup.clearLayers();
    if (drawingMode === 'NONE') return;

    const colors = getZoneStyleColors(draftRiskLevel, false);

    if (drawingMode === 'POLYGON' && draftPolygonPoints.length > 0) {
      if (draftPolygonPoints.length >= 3) {
        L.polygon(draftPolygonPoints, {
          color: colors.stroke,
          weight: 2.8,
          dashArray: '6, 4',
          fillColor: colors.fill,
          fillOpacity: 0.3,
        }).addTo(dGroup);
      } else if (draftPolygonPoints.length === 2) {
        L.polyline(draftPolygonPoints, {
          color: colors.stroke,
          weight: 2.8,
          dashArray: '6, 4',
        }).addTo(dGroup);
      }

      draftPolygonPoints.forEach((pt, idx) => {
        const icon = L.divIcon({
          className: 'tactical-div-icon',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
          html: `<div style="width:20px;height:20px;border-radius:999px;background:${colors.badgeBg};border:2px solid #fff;color:#fff;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;">${
            idx + 1
          }</div>`,
        });
        L.marker(pt, { icon, zIndexOffset: 1000 }).addTo(dGroup);
      });
    }

    if (drawingMode === 'CIRCLE_HOTSPOT' && draftHotspotCenter) {
      const center: [number, number] = [draftHotspotCenter.lat, draftHotspotCenter.lng];
      L.circle(center, {
        radius: draftHotspotRadius,
        color: colors.stroke,
        weight: 2.8,
        dashArray: '6, 4',
        fillColor: colors.fill,
        fillOpacity: 0.3,
      }).addTo(dGroup);

      const icon = L.divIcon({
        className: 'tactical-div-icon',
        iconSize: [130, 34],
        iconAnchor: [65, 17],
        html: `<div style="padding:2px 7px;border-radius:5px;background:${colors.badgeBg};border:1.5px solid #fff;color:#fff;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;white-space:nowrap;text-align:center;">HOTSPOT (${draftHotspotRadius}m)</div>`,
      });
      L.marker(center, { icon, zIndexOffset: 1000 }).addTo(dGroup);
    }
  }, [drawingMode, draftPolygonPoints, draftHotspotCenter, draftHotspotRadius, draftRiskLevel]);

  const tileClass = TILE_CONFIGS[styleMode].className;

  return (
    <div className="flex flex-col rounded-xl overflow-hidden border border-outline-variant/25 bg-surface-container-lowest shadow-lg">
      <div className="px-3 py-2 bg-surface-container flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/20">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="material-symbols-outlined text-primary text-[16px]">share_location</span>
          <span className="text-on-surface font-bold">
            OPENSTREETMAP GEOFENCE &amp; HOTSPOT PERIMETER GRID
          </span>
          <span className="text-outline hidden sm:inline">
            • LAT {cursorCoords.lat}°N, LNG {cursorCoords.lng}°E
          </span>
        </div>
        <div className="flex items-center gap-1 bg-surface-container-lowest p-0.5 rounded-lg">
          {(
            [
              ['tactical', 'Tactical Dark'],
              ['street', 'OSM Street'],
              ['satellite', 'Satellite'],
              ['terrain', 'Topo'],
            ] as [MapStyleMode, string][]
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setStyleMode(mode)}
              className={`px-2 py-0.5 rounded font-label-sm text-[10px] transition-colors ${
                styleMode === mode
                  ? 'bg-primary-container text-on-primary-container font-bold'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={`relative isolate z-0 w-full h-72 ${tileClass}`}>
        <div
          ref={containerRef}
          className={`w-full h-full ${drawingMode !== 'NONE' ? '!cursor-crosshair' : ''}`}
        />

        <div className="absolute bottom-3 right-3 z-[400] flex items-center gap-1 bg-surface-container/95 backdrop-blur-md border border-outline-variant/30 p-1 rounded-lg shadow-lg">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            className="w-7 h-7 rounded bg-surface-container-high text-on-surface flex items-center justify-center hover:bg-surface-variant"
            title="Zoom In"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            className="w-7 h-7 rounded bg-surface-container-high text-on-surface flex items-center justify-center hover:bg-surface-variant"
            title="Zoom Out"
          >
            <span className="material-symbols-outlined text-[16px]">remove</span>
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.flyTo([25.558, 91.945], 11, { duration: 0.7 })}
            className="px-2 h-7 rounded bg-surface-container-high text-primary font-mono text-[10px] font-bold flex items-center gap-1 hover:bg-surface-variant"
          >
            <span className="material-symbols-outlined text-[14px]">my_location</span>
            Shillong
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.flyTo([25.265, 91.712], 12, { duration: 0.7 })}
            className="px-2 h-7 rounded bg-surface-container-high text-tertiary font-mono text-[10px] font-bold flex items-center gap-1 hover:bg-surface-variant"
          >
            Sohra
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Forensic Incident Detail OpenStreetMap Workspace (/incidents/:incidentId)
 */
export const IncidentTacticalMap: React.FC<{
  incident: Incident;
  assignedUnit: ResponseUnit;
}> = ({ incident, assignedUnit }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const groupRef = useRef<L.LayerGroup | null>(null);

  const [styleMode, setStyleMode] = useState<MapStyleMode>('tactical');
  const [showGeofence, setShowGeofence] = useState(true);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [incident.location.lat, incident.location.lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
    });

    const cfg = TILE_CONFIGS[styleMode];
    const tile = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);

    mapRef.current = map;
    tileLayerRef.current = tile;
    groupRef.current = group;

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }
    const cfg = TILE_CONFIGS[styleMode];
    tileLayerRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(mapRef.current);
  }, [styleMode]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo([incident.location.lat, incident.location.lng], 14, { duration: 0.75 });
  }, [incident.id, incident.location.lat, incident.location.lng]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.clearLayers();

    const lat = incident.location.lat;
    const lng = incident.location.lng;

    // 1. Geofence Hazard Polygon around incident sector
    if (showGeofence) {
      const hazardPolygon: [number, number][] = [
        [lat + 0.008, lng - 0.011],
        [lat + 0.011, lng + 0.009],
        [lat - 0.006, lng + 0.013],
        [lat - 0.01, lng - 0.007],
      ];
      L.polygon(hazardPolygon, {
        color: '#ffb3ad',
        weight: 1.8,
        dashArray: '6, 4',
        fillColor: '#a40217',
        fillOpacity: 0.18,
      })
        .bindTooltip('GEOFENCE HAZARD PERIMETER (SLOPE > 38°)', {
          className: 'tactical-map-tooltip',
        })
        .addTo(group);
    }

    // 2. 300m and 700m Search & Rescue Range Rings
    L.circle([lat, lng], {
      radius: 300,
      color: '#ffb3ad',
      weight: 1,
      dashArray: '4, 4',
      fillColor: '#ff5355',
      fillOpacity: 0.08,
    }).addTo(group);

    L.circle([lat, lng], {
      radius: 700,
      color: '#89ceff',
      weight: 1,
      dashArray: '3, 5',
      fillOpacity: 0,
    }).addTo(group);

    // 3. Approved Trekking Trail (TR-22 Cyan Dashed Line)
    const trailPoints: [number, number][] = [
      [lat - 0.009, lng - 0.016],
      [lat - 0.005, lng - 0.01],
      [lat - 0.001, lng - 0.006],
      [lat + 0.005, lng - 0.002],
      [lat + 0.01, lng + 0.004],
    ];
    L.polyline(trailPoints, {
      color: '#89ceff',
      weight: 3,
      dashArray: '8, 6',
      opacity: 0.9,
    })
      .bindTooltip('APPROVED TRAIL: EXPEDITION TR-22', { className: 'tactical-map-tooltip' })
      .addTo(group);

    // 4. Actual Off-Trail Deviation Path (Amber Dotted)
    const deviationStart: [number, number] = [lat - 0.001, lng - 0.006];
    L.polyline([deviationStart, [lat - 0.0005, lng - 0.0025], [lat, lng]], {
      color: '#ffb95f',
      weight: 3.5,
      dashArray: '3, 6',
    })
      .bindTooltip('OFF-TRAIL DEVIATION (+1.8 KM INTO GORGE)', {
        className: 'tactical-map-tooltip',
      })
      .addTo(group);

    // Deviation Point Marker
    const devIcon = L.divIcon({
      className: 'tactical-div-icon',
      iconSize: [110, 26],
      iconAnchor: [55, 13],
      html: `
        <div style="display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:4px;background:rgba(21,27,43,0.94);border:1px solid #ffb95f;color:#ffb95f;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;white-space:nowrap;">
          <span style="width:6px;height:6px;border-radius:50%;background:#ffb95f;"></span>
          DEVIATION 14:08
        </div>
      `,
    });
    L.marker(deviationStart, { icon: devIcon }).addTo(group);

    // 5. Responder Unit Position & Intercept Vector
    const unitLat = incident.status === 'ON_SCENE' ? lat + 0.0008 : lat - 0.0055;
    const unitLng = incident.status === 'ON_SCENE' ? lng - 0.0008 : lng - 0.0085;

    L.polyline(
      [
        [unitLat, unitLng],
        [lat, lng],
      ],
      {
        color: '#0ea5e9',
        weight: 2.5,
        dashArray: '5, 5',
      }
    ).addTo(group);

    const unitIcon = L.divIcon({
      className: 'tactical-div-icon',
      iconSize: [150, 46],
      iconAnchor: [75, 23],
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div style="width:28px;height:28px;border-radius:8px;background:#0ea5e9;color:#001e2f;border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.7);">
            <span class="material-symbols-outlined" style="font-size:16px;">directions_car</span>
          </div>
          <div style="margin-top:2px;padding:2px 6px;border-radius:4px;background:rgba(8,14,29,0.95);border:1px solid #89ceff;color:#89ceff;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;white-space:nowrap;">
            ${(incident.assignedUnitName || assignedUnit.name).toUpperCase()} (${
        incident.status === 'ON_SCENE' ? 'ON SCENE' : `ETA ${assignedUnit.etaText}`
      })
          </div>
        </div>
      `,
    });
    L.marker([unitLat, unitLng], { icon: unitIcon, zIndexOffset: 600 }).addTo(group);

    // 6. Active SOS Target Marker
    const sosIcon = L.divIcon({
      className: 'tactical-div-icon',
      iconSize: [180, 62],
      iconAnchor: [90, 31],
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div style="position:relative;display:flex;align-items:center;justify-content:center;">
            <span style="position:absolute;width:44px;height:44px;border-radius:999px;background:rgba(255,83,85,0.4);animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>
            <div style="position:relative;width:34px;height:34px;border-radius:999px;background:#a40217;border:2.5px solid #ffffff;color:#ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(0,0,0,0.85);">
              <span class="material-symbols-outlined" style="font-size:18px;">sos</span>
            </div>
          </div>
          <div style="margin-top:3px;padding:2px 8px;border-radius:5px;background:rgba(8,14,29,0.96);border:1px solid #ffb3ad;color:#ffb3ad;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.7);">
            ${incident.touristName.toUpperCase()} • ±${incident.location.accuracyMeters}m
          </div>
        </div>
      `,
    });
    L.marker([lat, lng], { icon: sosIcon, zIndexOffset: 1000 }).addTo(group);
  }, [incident, assignedUnit, showGeofence]);

  const tileClass = TILE_CONFIGS[styleMode].className;

  return (
    <div className="w-full rounded-xl overflow-hidden bg-surface-container-lowest border border-outline-variant/25 shadow-xl flex flex-col">
      {/* Docked Top Telemetry & Layer Bar (Zero Overlap) */}
      <div className="px-space-md py-2.5 bg-surface-container flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/25">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">satellite_alt</span>
          <div>
            <div className="font-label-sm text-label-sm text-on-surface font-bold uppercase tracking-wider">
              {incident.location.name} — OpenStreetMap Forensic Telemetry
            </div>
            <div className="font-label-sm text-[10px] text-outline font-mono">
              WGS84: {incident.location.lat.toFixed(4)}°N, {incident.location.lng.toFixed(4)}°E |
              ELEV: {incident.location.altitudeMeters}m MSL
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center bg-surface-container-lowest p-0.5 rounded-lg">
            {(
              [
                ['tactical', 'Tactical Dark'],
                ['street', 'OSM Street'],
                ['satellite', 'Satellite'],
                ['terrain', 'Topo'],
              ] as [MapStyleMode, string][]
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setStyleMode(mode)}
                className={`px-2.5 py-1 rounded font-label-sm text-[10px] transition-colors ${
                  styleMode === mode
                    ? 'bg-primary-container text-on-primary-container font-bold'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowGeofence((v) => !v)}
            className={`px-2.5 py-1 rounded-lg font-label-sm text-[10px] font-bold border transition-colors ${
              showGeofence
                ? 'bg-secondary-container/30 border-secondary/50 text-secondary'
                : 'bg-surface-container-high border-outline-variant/30 text-outline'
            }`}
          >
            Geofence Overlay
          </button>
        </div>
      </div>

      {/* Real Interactive OpenStreetMap Canvas */}
      <div className={`relative isolate z-0 w-full h-[460px] ${tileClass}`}>
        <div ref={containerRef} className="w-full h-full" />

        {/* Non-Overlapping Zoom Controls */}
        <div className="absolute top-3 left-3 z-[400] flex flex-col gap-1 bg-surface-container/95 backdrop-blur-md border border-outline-variant/30 p-1 rounded-lg shadow-lg">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            className="w-7 h-7 rounded hover:bg-surface-container-high text-on-surface flex items-center justify-center"
            title="Zoom In"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            className="w-7 h-7 rounded hover:bg-surface-container-high text-on-surface flex items-center justify-center"
            title="Zoom Out"
          >
            <span className="material-symbols-outlined text-[16px]">remove</span>
          </button>
          <button
            type="button"
            onClick={() =>
              mapRef.current?.flyTo([incident.location.lat, incident.location.lng], 14, {
                duration: 0.7,
              })
            }
            className="w-7 h-7 rounded hover:bg-surface-container-high text-primary flex items-center justify-center"
            title="Center on SOS Beacon"
          >
            <span className="material-symbols-outlined text-[16px]">my_location</span>
          </button>
        </div>
      </div>

      {/* Docked Bottom Legend Ribbon (Zero Overlap) */}
      <div className="px-space-md py-2.5 bg-surface-container flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/25 font-label-sm text-label-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-primary rounded"></span>
            <span className="text-on-surface-variant">Approved Trail (TR-22)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-tertiary rounded"></span>
            <span className="text-tertiary">Deviation (+1.8km off trail)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
            <span className="text-secondary font-bold">Tourist Distress Beacon</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-primary-container"></span>
            <span className="text-primary font-bold">
              Intercept Unit ({incident.assignedUnitName || assignedUnit.name})
            </span>
          </div>
        </div>
        <span className="font-mono text-[10px] text-emerald-400 font-bold">
          RANGE RINGS: 300m / 700m
        </span>
      </div>
    </div>
  );
};
