import React from 'react';
import L from 'leaflet';
import { ConstructionWork, Trip, LogisticsSchedule } from '../types';

const GEO_STORAGE_KEY = 'frotacontrol_city_coords_v1';

function normalizeGeoText(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

const rawCityCoords: Record<string, [number, number]> = {
  'são paulo': [-23.5505, -46.6333],
  'sao paulo': [-23.5505, -46.6333],
  'campinas': [-22.9056, -47.0608],
  'rio de janeiro': [-22.9068, -43.1729],
  'brasília': [-15.7801, -47.9292],
  'brasilia': [-15.7801, -47.9292],
  'curitiba': [-25.4284, -49.2733],
  'belo horizonte': [-19.9167, -43.9345],
  'porto alegre': [-30.0346, -51.2177],
  'salvador': [-12.9714, -38.5014],
  'recife': [-8.0476, -34.8770],
  'fortaleza': [-3.7172, -38.5433],
  'santos': [-23.9608, -46.3336],
  'sorocaba': [-23.5016, -47.4588],
  'ribeirão preto': [-21.1775, -47.8103],
  'ribeirao preto': [-21.1775, -47.8103],
  'são josé dos campos': [-23.2237, -45.9009],
  'sao jose dos campos': [-23.2237, -45.9009],
  'florianópolis': [-27.5954, -48.5480],
  'florianopolis': [-27.5954, -48.5480],
  'vitória': [-20.3155, -40.3128],
  'vitoria': [-20.3155, -40.3128],
  'goiânia': [-16.6864, -49.2643],
  'goiania': [-16.6864, -49.2643],
  'cuiabá': [-15.6014, -56.0979],
  'cuiaba': [-15.6014, -56.0979],
  'campo grande': [-20.4697, -54.6201],
  'manaus': [-3.1190, -60.0217],
  'belém': [-1.4558, -48.4902],
  'belem': [-1.4558, -48.4902],
  'são luís': [-2.5387, -44.2829],
  'sao luis': [-2.5387, -44.2829],
  'teresina': [-5.0919, -42.8034],
  'natal': [-5.7945, -35.2110],
  'joão pessoa': [-7.1195, -34.8450],
  'joao pessoa': [-7.1195, -34.8450],
  'maceió': [-9.6658, -35.7353],
  'maceio': [-9.6658, -35.7353],
  'aracaju': [-10.9472, -37.0731],
  'palmas': [-10.184, -48.3336],
  'araguaína': [-7.1924, -48.2078],
  'araguaina': [-7.1924, -48.2078],
  'gurupi': [-11.7292, -49.0686],
  'porto nacional': [-10.7069, -48.4169],
  'paraíso do tocantins': [-10.1749, -48.8825],
  'paraiso do tocantins': [-10.1749, -48.8825],
  'colinas do tocantins': [-8.0592, -48.4747],
  'guaraí': [-8.8339, -48.5106],
  'guarai': [-8.8339, -48.5106],
  'miracema do tocantins': [-9.5672, -48.3919],
  'dianópolis': [-11.6275, -46.8206],
  'dianopolis': [-11.6275, -46.8206],
  'tocantinópolis': [-6.3292, -47.4161],
  'tocantinopolis': [-6.3292, -47.4161],
  'formoso do araguaia': [-11.7972, -49.5289],
  'pedro afonso': [-8.9675, -48.1747],
};

const cityCoordsCache: Record<string, [number, number]> = (() => {
  const initial: Record<string, [number, number]> = {};
  Object.entries(rawCityCoords).forEach(([k, v]) => {
    initial[k] = v;
    initial[normalizeGeoText(k)] = v;
  });
  try {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(GEO_STORAGE_KEY) : null;
    if (saved) {
      const parsed = JSON.parse(saved) as Record<string, [number, number]>;
      Object.entries(parsed).forEach(([k, v]) => {
        if (Array.isArray(v) && v.length === 2 && Number.isFinite(v[0]) && Number.isFinite(v[1])) {
          initial[k] = v;
        }
      });
    }
  } catch {
    // Ignore storage read error
  }
  return initial;
})();

const inFlightGeoLookups = new Map<string, Promise<[number, number]>>();

function persistGeoCacheEntry(key: string, coords: [number, number]) {
  cityCoordsCache[key] = coords;
  try {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(GEO_STORAGE_KEY);
      const parsed = saved ? (JSON.parse(saved) as Record<string, [number, number]>) : {};
      parsed[key] = coords;
      window.localStorage.setItem(GEO_STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch {
    // Ignore storage write error
  }
}

const stateCenters: Record<string, [number, number]> = {
  sp: [-23.5505, -46.6333],
  rj: [-22.9068, -43.1729],
  mg: [-19.9167, -43.9345],
  rs: [-30.0346, -51.2177],
  pr: [-25.4284, -49.2733],
  sc: [-27.5954, -48.5480],
  ba: [-12.9714, -38.5014],
  pe: [-8.0476, -34.8770],
  ce: [-3.7172, -38.5433],
  df: [-15.7801, -47.9292],
  go: [-16.6864, -49.2643],
  es: [-20.3155, -40.3128],
  mt: [-15.6014, -56.0979],
  ms: [-20.4697, -54.6201],
  am: [-3.1190, -60.0217],
  pa: [-1.4558, -48.4902],
  ma: [-2.5387, -44.2829],
  pi: [-5.0919, -42.8034],
  rn: [-5.7945, -35.2110],
  pb: [-7.1195, -34.8450],
  al: [-9.6658, -35.7353],
  se: [-10.9472, -37.0731],
  to: [-10.184, -48.3336],
  ro: [-8.7619, -63.9039],
  ac: [-9.9749, -67.8243],
  ap: [0.0389, -51.0664],
  rr: [2.8195, -60.6733],
};

export async function resolveCityCoordinates(city: string, state: string): Promise<[number, number]> {
  const cleanCity = (city || '').trim().toLowerCase();
  const normCity = normalizeGeoText(city || '');
  const cleanState = normalizeGeoText(state || '');
  const cacheKey = cleanState ? `${normCity}|${cleanState}` : normCity;
  const rawKey = cleanState ? `${cleanCity}|${cleanState}` : cleanCity;

  if (cityCoordsCache[cacheKey]) return cityCoordsCache[cacheKey];
  if (cityCoordsCache[rawKey]) return cityCoordsCache[rawKey];
  if (!cleanState && cityCoordsCache[normCity]) return cityCoordsCache[normCity];
  if (!cleanState && cityCoordsCache[cleanCity]) return cityCoordsCache[cleanCity];
  if (!normCity) return stateCenters[cleanState] || [-10.184, -48.3336];

  const existingPromise = inFlightGeoLookups.get(cacheKey);
  if (existingPromise) return existingPromise;

  const lookupPromise = (async (): Promise<[number, number]> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const query = cleanState ? `${city}, ${state}, Brazil` : `${city}, Brazil`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { 'Accept-Language': 'pt-BR' }, signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            persistGeoCacheEntry(cacheKey, [lat, lon]);
            return [lat, lon];
          }
        }
      }
    } catch {
      // Fallback gracefully on timeout or rate limit
    }

    if (cityCoordsCache[normCity]) return cityCoordsCache[normCity];
    if (cityCoordsCache[cleanCity]) return cityCoordsCache[cleanCity];
    if (stateCenters[cleanState]) return stateCenters[cleanState];
    return [-10.184, -48.3336];
  })();

  inFlightGeoLookups.set(cacheKey, lookupPromise);
  try {
    return await lookupPromise;
  } finally {
    inFlightGeoLookups.delete(cacheKey);
  }
}

function createPinIcon(color: string, ringColor: string, label: string) {
  return L.divIcon({
    className: 'custom-route-pin',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:9999px;background:${color};border:3px solid ${ringColor};box-shadow:0 2px 8px rgba(0,0,0,0.45);color:#fff;font-size:10px;font-weight:800;font-family:monospace;">${label}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDateBrShort(iso?: string): string {
  if (!iso) return '-';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

const LOGISTICS_STATUS_LABEL: Record<string, string> = {
  programado: 'Programado',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export interface LeafletRouteMapProps {
  works: ConstructionWork[];
  trips?: Trip[];
  logisticsSchedules?: LogisticsSchedule[];
  heightClass?: string;
  autoFocusLogistics?: boolean;
  autoFocusIntervalMs?: number;
  initialOverviewDelayMs?: number;
}

interface PlottedLogisticsTarget {
  schedule: LogisticsSchedule;
  origCoord: [number, number];
  destCoord: [number, number];
  marker: L.Marker;
  polyline: L.Polyline;
}

export function LeafletRouteMap({
  works,
  trips = [],
  logisticsSchedules = [],
  heightClass = 'h-[380px]',
  autoFocusLogistics = false,
  autoFocusIntervalMs = 10000,
  initialOverviewDelayMs = 10000,
}: LeafletRouteMapProps) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<L.Map | null>(null);
  const layerGroupRef = React.useRef<L.LayerGroup | null>(null);
  const logisticsTargetsRef = React.useRef<PlottedLogisticsTarget[]>([]);
  const [focusedInfo, setFocusedInfo] = React.useState<{
    index: number;
    total: number;
    schedule: LogisticsSchedule;
  } | null>(null);
  const [overviewState, setOverviewState] = React.useState<{
    secondsLeft: number;
    totalLogistics: number;
  } | null>(null);

  const latestDataRef = React.useRef({ works, trips, logisticsSchedules });
  latestDataRef.current = { works, trips, logisticsSchedules };

  const mapDataSignature = React.useMemo(() => {
    const wSig = works.map(w => `${w.id}:${w.name}:${w.city}:${w.state}:${w.status}`).join('|');
    const tSig = trips
      .map(
        t =>
          `${t.id}:${t.originCity || t.checkIn.originCity || ''}:${t.destinationCity || t.checkIn.destinationCity || ''}:${t.checkIn.destination}`
      )
      .join('|');
    const lSig = logisticsSchedules
      .map(
        s =>
          `${s.id}:${s.scheduleStatus}:${s.originWorkId || ''}:${s.originCity || ''}:${s.originState || ''}:${s.workId || ''}:${s.destinationCity || ''}:${s.destinationState || ''}:${s.destinationLabel}:${s.vehicleModelPlate}:${s.complementVehicleModelPlate || ''}:${s.startDate}:${s.endDate}:${s.driverName || ''}:${s.cargoDescription || ''}`
      )
      .join('|');
    return `${wSig}##${tSig}##${lSig}`;
  }, [works, trips, logisticsSchedules]);

  // 1. Initialize Leaflet map & ResizeObserver once on mount, clean up on unmount
  React.useEffect(() => {
    const container = mapRef.current;
    if (!container) return;

    // Defensive cleanup if container was reused
    if ((container as unknown as { _leaflet_id?: number })._leaflet_id) {
      delete (container as unknown as { _leaflet_id?: number })._leaflet_id;
    }

    const map = L.map(container, {
      center: [-10.184, -48.3336],
      zoom: 6,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        if (mapInstanceRef.current === map && map.getContainer()) {
          try {
            map.invalidateSize();
          } catch {
            // Ignore resize calls during unmount
          }
        }
      });
      observer.observe(container);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
      logisticsTargetsRef.current = [];
      layerGroupRef.current = null;
      if (mapInstanceRef.current === map) {
        mapInstanceRef.current = null;
      }
      try {
        map.stop();
        map.remove();
      } catch {
        // Ignore removal errors if DOM already detached
      }
    };
  }, []);

  const focusFnRef = React.useRef<((idx: number) => void) | null>(null);
  const currentFocusIndexRef = React.useRef<number>(0);

  // 2. Render markers and routes safely into layerGroup
  React.useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    let isMounted = true;
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    let overviewTickInterval: ReturnType<typeof setInterval> | null = null;
    let focusStartTimeout: ReturnType<typeof setTimeout> | null = null;
    let focusInterval: ReturnType<typeof setInterval> | null = null;

    const isMapAlive = () =>
      isMounted &&
      mapInstanceRef.current === map &&
      layerGroupRef.current === layerGroup &&
      Boolean(map.getContainer()) &&
      Boolean(map.getPane('markerPane'));

    const isValidCoord = (coord: [number, number]) =>
      Array.isArray(coord) &&
      coord.length === 2 &&
      Number.isFinite(coord[0]) &&
      Number.isFinite(coord[1]);

    layerGroup.clearLayers();
    logisticsTargetsRef.current = [];
    focusFnRef.current = null;
    setFocusedInfo(null);
    setOverviewState(null);

    const hqCoord: [number, number] = [-10.184, -48.3336];
    const hqIcon = createPinIcon('#0f172a', '#38bdf8', 'HQ');
    const workIcon = createPinIcon('#2563eb', '#bfdbfe', 'OB');
    const tripIcon = createPinIcon('#059669', '#a7f3d0', 'VG');
    const logisticsIcon = createPinIcon('#7c3aed', '#ddd6fe', 'LG');
    const activeLogisticsIcon = createPinIcon('#f59e0b', '#fef3c7', 'LG');

    const focusLogisticsTarget = (targets: PlottedLogisticsTarget[], idx: number) => {
      if (!isMapAlive() || targets.length === 0) return;
      const safeIdx = ((idx % targets.length) + targets.length) % targets.length;
      const target = targets[safeIdx];
      currentFocusIndexRef.current = safeIdx;

      targets.forEach((entry, i) => {
        try {
          if (i === safeIdx) {
            entry.marker.setIcon(activeLogisticsIcon);
            entry.marker.setZIndexOffset(1000);
            entry.polyline.setStyle({
              color: '#f59e0b',
              weight: 5,
              opacity: 0.95,
              dashArray: undefined,
            });
            entry.polyline.bringToFront();
          } else {
            entry.marker.setIcon(logisticsIcon);
            entry.marker.setZIndexOffset(0);
            entry.polyline.setStyle({
              color: '#8b5cf6',
              weight: 3,
              opacity: 0.75,
              dashArray: '8, 6',
            });
          }
        } catch {
          // Ignore layer style error on teardown
        }
      });

      setFocusedInfo({
        index: safeIdx,
        total: targets.length,
        schedule: target.schedule,
      });

      try {
        const targetZoom = Math.max(map.getZoom(), 8);
        map.flyTo(target.destCoord, targetZoom, {
          animate: true,
          duration: 0.75,
        });
        target.marker.openPopup();
      } catch {
        // Ignore pan/popup error if map collapsed
      }
    };

    async function loadMarkers() {
      if (!isMapAlive()) return;

      const {
        works: curWorks,
        trips: curTrips,
        logisticsSchedules: curLogisticsSchedules,
      } = latestDataRef.current;

      const workById = new Map<string, ConstructionWork>();
      curWorks.forEach(w => workById.set(w.id, w));

      const activeLogistics = curLogisticsSchedules
        .filter(s => s.scheduleStatus !== 'cancelado')
        .sort((a, b) => {
          const priority = (st: string) => (st === 'em_andamento' ? 0 : st === 'programado' ? 1 : 2);
          return priority(a.scheduleStatus) - priority(b.scheduleStatus) || a.startDate.localeCompare(b.startDate);
        });

      // Collect all unique city/state pairs so we resolve them in parallel instead of slow sequential fetches
      const uniqueCities = new Map<string, { city: string; state: string }>();
      const registerCity = (city?: string, state?: string) => {
        const c = (city || '').trim();
        const s = (state || '').trim();
        if (!c) return;
        const k = `${normalizeGeoText(c)}|${normalizeGeoText(s)}`;
        if (!uniqueCities.has(k)) {
          uniqueCities.set(k, { city: c, state: s });
        }
      };

      curWorks.forEach(w => registerCity(w.city, w.state));
      curTrips.forEach(t => {
        registerCity(t.originCity || t.checkIn.originCity || 'Palmas', t.originState || t.checkIn.originState || 'TO');
        registerCity(t.destinationCity || t.checkIn.destinationCity, t.destinationState || t.checkIn.destinationState);
      });
      activeLogistics.forEach(sched => {
        const origWork = sched.originWorkId ? workById.get(sched.originWorkId) : undefined;
        const destWork = sched.workId ? workById.get(sched.workId) : undefined;
        registerCity(sched.originCity || origWork?.city || 'Palmas', sched.originState || origWork?.state || 'TO');
        registerCity(
          sched.destinationCity || destWork?.city || 'Palmas',
          sched.destinationState || destWork?.state || 'TO'
        );
      });

      const preCachedAreaCoords: [number, number][] = [];
      const tryGetCachedCoord = (city?: string, state?: string): [number, number] | undefined => {
        const cleanCity = (city || '').trim().toLowerCase();
        const normCity = normalizeGeoText(city || '');
        const cleanState = normalizeGeoText(state || '');
        const cacheKey = cleanState ? `${normCity}|${cleanState}` : normCity;
        const rawKey = cleanState ? `${cleanCity}|${cleanState}` : cleanCity;
        return (
          cityCoordsCache[cacheKey] ||
          cityCoordsCache[rawKey] ||
          (!cleanState ? cityCoordsCache[normCity] || cityCoordsCache[cleanCity] : undefined)
        );
      };

      curWorks.forEach(w => {
        const cached = tryGetCachedCoord(w.city, w.state);
        if (cached && isValidCoord(cached)) preCachedAreaCoords.push(cached);
      });
      activeLogistics.forEach(sched => {
        const origWork = sched.originWorkId ? workById.get(sched.originWorkId) : undefined;
        const destWork = sched.workId ? workById.get(sched.workId) : undefined;
        const origCached = tryGetCachedCoord(sched.originCity || origWork?.city, sched.originState || origWork?.state);
        const destCached = tryGetCachedCoord(
          sched.destinationCity || destWork?.city,
          sched.destinationState || destWork?.state
        );
        if (origCached && isValidCoord(origCached)) preCachedAreaCoords.push(origCached);
        if (destCached && isValidCoord(destCached)) preCachedAreaCoords.push(destCached);
      });

      if (preCachedAreaCoords.length > 0 && isMapAlive()) {
        try {
          map.invalidateSize();
          const preBounds = L.latLngBounds(preCachedAreaCoords);
          if (preBounds.getSouthWest().equals(preBounds.getNorthEast())) {
            map.setView(preBounds.getCenter(), 10, { animate: false });
          } else {
            map.fitBounds(preBounds, { padding: [24, 24], maxZoom: 11, animate: false });
          }
        } catch {
          // Ignore pre-fit errors
        }
      }

      const resolvedMap = new Map<string, [number, number]>();
      await Promise.all(
        Array.from(uniqueCities.entries()).map(async ([k, { city, state }]) => {
          const coord = await resolveCityCoordinates(city, state);
          resolvedMap.set(k, coord);
        })
      );

      if (!isMapAlive()) return;

      const getCoord = (city?: string, state?: string): [number, number] => {
        const c = (city || '').trim();
        const s = (state || '').trim();
        const k = `${normalizeGeoText(c)}|${normalizeGeoText(s)}`;
        return resolvedMap.get(k) || stateCenters[normalizeGeoText(s)] || [-10.184, -48.3336];
      };

      L.marker(hqCoord, { icon: hqIcon })
        .addTo(layerGroup)
        .bindPopup('<b>Escritório Central / Matriz - Palmas/TO</b>');

      const worksAndLogisticsCoords: [number, number][] = [];
      const fallbackCoords: [number, number][] = [hqCoord];

      // 1. Plot Construction Works & connection to HQ
      for (const work of curWorks) {
        if (!isMapAlive()) return;
        const coord = getCoord(work.city, work.state);
        if (!isValidCoord(coord)) continue;

        worksAndLogisticsCoords.push(coord);

        L.marker(coord, { icon: workIcon })
          .addTo(layerGroup)
          .bindPopup(
            `<b>Obra: ${escapeHtml(work.name)}</b><br/>📍 ${escapeHtml(work.city)} - ${escapeHtml(work.state)}<br/>Status: ${
              work.status === 'active' ? 'Ativa' : 'Concluída'
            }`
          );

        L.polyline([hqCoord, coord], {
          color: '#2563eb',
          weight: 3,
          opacity: 0.7,
          dashArray: '5, 10',
        }).addTo(layerGroup);
      }

      // 2. Plot Trip routes between Origin and Destination municipalities
      const plottedRoutes = new Set<string>();
      for (const trip of curTrips) {
        if (!isMapAlive()) return;
        const destCity = trip.destinationCity || trip.checkIn.destinationCity;
        const destState = trip.destinationState || trip.checkIn.destinationState || '';
        if (!destCity) continue;

        const origCity = trip.originCity || trip.checkIn.originCity || 'Palmas';
        const origState = trip.originState || trip.checkIn.originState || 'TO';
        const routeKey = `${normalizeGeoText(origCity)}|${normalizeGeoText(origState)}->${normalizeGeoText(destCity)}|${normalizeGeoText(destState)}`;
        if (plottedRoutes.has(routeKey)) continue;
        plottedRoutes.add(routeKey);

        const origCoord = getCoord(origCity, origState);
        const destCoord = getCoord(destCity, destState);
        if (!isValidCoord(origCoord) || !isValidCoord(destCoord)) continue;

        fallbackCoords.push(origCoord, destCoord);

        L.marker(destCoord, { icon: tripIcon })
          .addTo(layerGroup)
          .bindPopup(
            `<b>Destino Viagem: ${escapeHtml(trip.checkIn.destination)}</b><br/>📍 ${escapeHtml(destCity)}${
              destState ? ` - ${escapeHtml(destState)}` : ''
            }`
          );

        L.polyline([origCoord, destCoord], {
          color: '#10b981',
          weight: 3,
          opacity: 0.85,
        }).addTo(layerGroup);
      }

      // 3. Plot ALL non-canceled Logistics Schedules routes
      const destCityOccurrence = new Map<string, number>();
      const targets: PlottedLogisticsTarget[] = [];

      for (const sched of activeLogistics) {
        if (!isMapAlive()) return;
        const origWork = sched.originWorkId ? workById.get(sched.originWorkId) : undefined;
        const destWork = sched.workId ? workById.get(sched.workId) : undefined;

        const origCity = sched.originCity || origWork?.city || 'Palmas';
        const origState = sched.originState || origWork?.state || 'TO';
        const destCity = sched.destinationCity || destWork?.city || 'Palmas';
        const destState = sched.destinationState || destWork?.state || 'TO';

        const origCoord = getCoord(origCity, origState);
        const baseDestCoord = getCoord(destCity, destState);
        if (!isValidCoord(origCoord) || !isValidCoord(baseDestCoord)) continue;

        // Slightly offset overlapping markers in the same city so every logistics item is visible and centered individually
        const cityKey = `${normalizeGeoText(destCity)}|${normalizeGeoText(destState)}`;
        const occ = destCityOccurrence.get(cityKey) || 0;
        destCityOccurrence.set(cityKey, occ + 1);

        const destCoord: [number, number] =
          occ === 0
            ? baseDestCoord
            : [
                baseDestCoord[0] + 0.014 * Math.sin((occ * Math.PI) / 3),
                baseDestCoord[1] + 0.014 * Math.cos((occ * Math.PI) / 3),
              ];

        worksAndLogisticsCoords.push(origCoord, destCoord);

        const originText = sched.originWorkName || sched.originLabel || `${origCity}/${origState}`;
        const destText = sched.isThirdPartyRental
          ? `Locado: ${sched.thirdPartyName || sched.destinationLabel}`
          : sched.workName || sched.destinationLabel;
        const statusText = LOGISTICS_STATUS_LABEL[sched.scheduleStatus] || sched.scheduleStatus;
        const periodText = `${formatDateBrShort(sched.startDate)} até ${formatDateBrShort(sched.endDate)}`;

        const popupHtml = `
          <div style="min-width:230px;font-family:system-ui,sans-serif;line-height:1.4;color:#0f172a;">
            <div style="font-weight:800;font-size:13px;color:#5b21b6;margin-bottom:4px;">
              🚚 ${escapeHtml(sched.vehicleModelPlate)}
            </div>
            ${
              sched.complementVehicleModelPlate
                ? `<div style="font-size:11px;font-weight:700;color:#4338ca;margin-bottom:4px;">+ Complemento: ${escapeHtml(sched.complementVehicleModelPlate)}</div>`
                : ''
            }
            <div style="font-size:12px;margin-bottom:3px;">
              <b>Origem:</b> ${escapeHtml(originText)} (${escapeHtml(origCity)}/${escapeHtml(origState)})
            </div>
            <div style="font-size:12px;margin-bottom:3px;">
              <b>Destino:</b> ${escapeHtml(destText)} (${escapeHtml(destCity)}/${escapeHtml(destState)})
            </div>
            <div style="font-size:11px;margin-bottom:3px;">
              <b>Período:</b> ${escapeHtml(periodText)} · <b>Status:</b> ${escapeHtml(statusText)}
            </div>
            ${
              sched.driverName
                ? `<div style="font-size:11px;margin-bottom:2px;"><b>Motorista:</b> ${escapeHtml(sched.driverName)}</div>`
                : ''
            }
            ${
              sched.cargoDescription
                ? `<div style="font-size:11px;color:#334155;"><b>Carga:</b> ${escapeHtml(sched.cargoDescription)}</div>`
                : ''
            }
          </div>
        `;

        const marker = L.marker(destCoord, { icon: logisticsIcon })
          .addTo(layerGroup)
          .bindPopup(popupHtml, { maxWidth: 320, autoPan: !autoFocusLogistics });

        const polyline = L.polyline([origCoord, destCoord], {
          color: '#8b5cf6',
          weight: 3,
          opacity: 0.8,
          dashArray: '8, 6',
        }).addTo(layerGroup);

        targets.push({
          schedule: sched,
          origCoord,
          destCoord,
          marker,
          polyline,
        });
      }

      logisticsTargetsRef.current = targets;
      focusFnRef.current = (nextIdx: number) => focusLogisticsTarget(targets, nextIdx);

      const areaCoords = worksAndLogisticsCoords.length > 0 ? worksAndLogisticsCoords : fallbackCoords;
      let focusStarted = false;

      const applyLimitedAreaBounds = () => {
        if (!isMapAlive() || areaCoords.length === 0) return;
        try {
          map.setMinZoom(3);
          map.setMaxBounds([
            [-85, -180],
            [85, 180],
          ]);
          map.invalidateSize();
          const rawBounds = L.latLngBounds(areaCoords);
          const latSpan = Math.abs(rawBounds.getNorth() - rawBounds.getSouth());
          const lngSpan = Math.abs(rawBounds.getEast() - rawBounds.getWest());
          const isSingleArea = latSpan < 0.08 && lngSpan < 0.08;

          if (isSingleArea) {
            const center = rawBounds.getCenter();
            map.setView(center, 11, { animate: false });
          } else {
            map.fitBounds(rawBounds, { padding: [26, 26], maxZoom: 12, animate: false });
          }

          const fittedZoom = map.getZoom();
          map.setMinZoom(Math.max(4, fittedZoom));

          const limitBounds = isSingleArea
            ? L.latLngBounds(
                [rawBounds.getCenter().lat - 0.25, rawBounds.getCenter().lng - 0.25],
                [rawBounds.getCenter().lat + 0.25, rawBounds.getCenter().lng + 0.25]
              )
            : rawBounds.pad(0.22);

          map.options.maxBoundsViscosity = 0.9;
          map.setMaxBounds(limitBounds);
        } catch {
          // Ignore fitBounds/maxBounds error if map container collapsed
        }
      };

      applyLimitedAreaBounds();

      resizeTimeout = setTimeout(() => {
        if (!isMapAlive()) return;
        if (!focusStarted) {
          applyLimitedAreaBounds();
        } else {
          try {
            map.invalidateSize();
          } catch {
            // Ignore resize error
          }
        }
      }, 250);

      if (autoFocusLogistics && targets.length > 0 && isMapAlive()) {
        const overviewDelay = Math.max(0, initialOverviewDelayMs);

        if (overviewDelay >= 1000) {
          let remainingSec = Math.ceil(overviewDelay / 1000);
          setOverviewState({
            secondsLeft: remainingSec,
            totalLogistics: targets.length,
          });
          overviewTickInterval = setInterval(() => {
            if (!isMapAlive()) return;
            remainingSec -= 1;
            if (remainingSec > 0) {
              setOverviewState({
                secondsLeft: remainingSec,
                totalLogistics: targets.length,
              });
            } else if (overviewTickInterval) {
              clearInterval(overviewTickInterval);
              overviewTickInterval = null;
            }
          }, 1000);
        }

        focusStartTimeout = setTimeout(() => {
          if (!isMapAlive()) return;
          focusStarted = true;
          if (overviewTickInterval) {
            clearInterval(overviewTickInterval);
            overviewTickInterval = null;
          }
          setOverviewState(null);

          const initialIdx = ((currentFocusIndexRef.current % targets.length) + targets.length) % targets.length;
          focusLogisticsTarget(targets, initialIdx);

          if (targets.length > 1) {
            focusInterval = setInterval(() => {
              if (!isMapAlive()) return;
              const nextIdx = (currentFocusIndexRef.current + 1) % targets.length;
              focusLogisticsTarget(targets, nextIdx);
            }, Math.max(3000, autoFocusIntervalMs));
          }
        }, overviewDelay);
      }
    }

    map.whenReady(() => {
      if (isMapAlive()) {
        void loadMarkers();
      }
    });

    return () => {
      isMounted = false;
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      if (overviewTickInterval) {
        clearInterval(overviewTickInterval);
      }
      if (focusStartTimeout) {
        clearTimeout(focusStartTimeout);
      }
      if (focusInterval) {
        clearInterval(focusInterval);
      }
    };
  }, [mapDataSignature, autoFocusLogistics, autoFocusIntervalMs, initialOverviewDelayMs]);

  return (
    <div
      className={`w-full ${heightClass} rounded-2xl overflow-hidden border border-slate-700 shadow-inner relative z-10`}
    >
      <div ref={mapRef} className="w-full h-full" />

      {autoFocusLogistics && overviewState && !focusedInfo && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[400] max-w-md bg-slate-950/90 backdrop-blur-md border border-sky-400/50 rounded-xl px-3.5 py-2.5 text-white shadow-xl">
          <div className="flex items-center justify-between gap-3 text-xs font-mono text-sky-300 font-bold">
            <span>Área de Obras e Logísticas</span>
            <span className="text-amber-300 tabular-nums">
              Foco em {overviewState.secondsLeft}s
            </span>
          </div>
          <div className="text-xs text-slate-300 mt-0.5 font-mono">
            {overviewState.totalLogistics}{' '}
            {overviewState.totalLogistics === 1 ? 'logística ativa' : 'logísticas ativas'} prontas para exibição
          </div>
        </div>
      )}

      {autoFocusLogistics && focusedInfo && (
        <div className="absolute bottom-3 left-3 z-[400] max-w-md bg-slate-950/90 backdrop-blur-md border border-amber-400/50 rounded-xl px-3.5 py-2.5 text-white shadow-xl">
          <div className="flex items-center justify-between gap-3 text-[11px] font-mono text-amber-300 font-bold mb-1">
            <span>
              Logística em Foco ({focusedInfo.index + 1}/{focusedInfo.total})
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">
                {focusedInfo.total > 1 ? `A cada ${Math.round(autoFocusIntervalMs / 1000)}s` : 'Rota única'}
              </span>
              {focusedInfo.total > 1 && (
                <div className="flex items-center gap-1 ml-1">
                  <button
                    type="button"
                    onClick={() => focusFnRef.current?.(focusedInfo.index - 1)}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer leading-none"
                    title="Logística anterior"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => focusFnRef.current?.(focusedInfo.index + 1)}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer leading-none"
                    title="Próxima logística"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="text-sm font-black font-mono text-white truncate">
            {focusedInfo.schedule.vehicleModelPlate}
            {focusedInfo.schedule.complementVehicleModelPlate
              ? ` + ${focusedInfo.schedule.complementVehicleModelPlate}`
              : ''}
          </div>
          <div className="text-xs text-slate-200 truncate">
            {focusedInfo.schedule.originCity || 'Palmas'}/{focusedInfo.schedule.originState || 'TO'} →{' '}
            <strong>
              {focusedInfo.schedule.isThirdPartyRental
                ? focusedInfo.schedule.thirdPartyName || focusedInfo.schedule.destinationLabel
                : focusedInfo.schedule.workName || focusedInfo.schedule.destinationLabel}
            </strong>{' '}
            ({focusedInfo.schedule.destinationCity}/{focusedInfo.schedule.destinationState})
          </div>
          <div className="text-[11px] font-mono text-slate-300 truncate mt-0.5">
            {formatDateBrShort(focusedInfo.schedule.startDate)} até{' '}
            {formatDateBrShort(focusedInfo.schedule.endDate)}
            {focusedInfo.schedule.driverName ? ` · Mot.: ${focusedInfo.schedule.driverName}` : ''}
            {focusedInfo.schedule.cargoDescription ? ` · ${focusedInfo.schedule.cargoDescription}` : ''}
          </div>
        </div>
      )}
    </div>
  );
}

export default LeafletRouteMap;
