import React from 'react';
import L from 'leaflet';
import { ConstructionWork, Trip, LogisticsSchedule } from '../types';

const cityCoordsCache: Record<string, [number, number]> = {
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
};

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
  const cleanState = (state || '').trim().toLowerCase();
  const cacheKey = cleanState ? `${cleanCity}|${cleanState}` : cleanCity;

  if (cityCoordsCache[cacheKey]) {
    return cityCoordsCache[cacheKey];
  }
  if (!cleanState && cityCoordsCache[cleanCity]) {
    return cityCoordsCache[cleanCity];
  }

  try {
    const query = cleanState ? `${city}, ${state}, Brazil` : `${city}, Brazil`;
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      { headers: { 'Accept-Language': 'pt-BR' } }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      cityCoordsCache[cacheKey] = [lat, lon];
      return [lat, lon];
    }
  } catch (err) {
    console.warn('Geocoding fetch failed for:', city, state, err);
  }

  if (cityCoordsCache[cleanCity]) {
    return cityCoordsCache[cleanCity];
  }

  if (stateCenters[cleanState]) {
    return stateCenters[cleanState];
  }

  return [-10.184, -48.3336];
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

export interface LeafletRouteMapProps {
  works: ConstructionWork[];
  trips?: Trip[];
  logisticsSchedules?: LogisticsSchedule[];
  heightClass?: string;
}

export function LeafletRouteMap({
  works,
  trips = [],
  logisticsSchedules = [],
  heightClass = 'h-[380px]',
}: LeafletRouteMapProps) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<L.Map | null>(null);

  React.useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        center: [-10.184, -48.3336],
        zoom: 6,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });

    const hqCoord: [number, number] = [-10.184, -48.3336];
    const hqIcon = createPinIcon('#0f172a', '#38bdf8', 'HQ');
    const workIcon = createPinIcon('#2563eb', '#bfdbfe', 'OB');
    const tripIcon = createPinIcon('#059669', '#a7f3d0', 'VG');
    const logisticsIcon = createPinIcon('#7c3aed', '#ddd6fe', 'LG');

    L.marker(hqCoord, { icon: hqIcon })
      .addTo(map)
      .bindPopup('<b>Escritório Central / Matriz - Palmas/TO</b>');

    let isMounted = true;

    async function loadMarkers() {
      const latLngs: [number, number][] = [hqCoord];

      // 1. Plot Construction Works & connection to HQ
      for (const work of works) {
        if (!isMounted) break;
        const coord = await resolveCityCoordinates(work.city, work.state);
        latLngs.push(coord);

        const marker = L.marker(coord, { icon: workIcon }).addTo(map);
        marker.bindPopup(
          `<b>Obra: ${work.name}</b><br/>📍 ${work.city} - ${work.state}<br/>Status: ${
            work.status === 'active' ? 'Ativa' : 'Concluída'
          }`
        );

        L.polyline([hqCoord, coord], {
          color: '#2563eb',
          weight: 3,
          opacity: 0.7,
          dashArray: '5, 10',
        }).addTo(map);
      }

      // 2. Plot Trip routes between Origin and Destination municipalities
      const plottedRoutes = new Set<string>();
      for (const trip of trips) {
        if (!isMounted) break;
        const destCity = trip.destinationCity || trip.checkIn.destinationCity;
        const destState = trip.destinationState || trip.checkIn.destinationState || '';
        if (!destCity) continue;

        const origCity = trip.originCity || trip.checkIn.originCity || 'Palmas';
        const origState = trip.originState || trip.checkIn.originState || 'TO';
        const routeKey = `${origCity.toLowerCase()}|${origState.toLowerCase()}->${destCity.toLowerCase()}|${destState.toLowerCase()}`;
        if (plottedRoutes.has(routeKey)) continue;
        plottedRoutes.add(routeKey);

        const origCoord = await resolveCityCoordinates(origCity, origState);
        const destCoord = await resolveCityCoordinates(destCity, destState);
        latLngs.push(origCoord, destCoord);

        L.marker(destCoord, { icon: tripIcon })
          .addTo(map)
          .bindPopup(
            `<b>Destino Viagem: ${trip.checkIn.destination}</b><br/>📍 ${destCity}${
              destState ? ` - ${destState}` : ''
            }`
          );

        L.polyline([origCoord, destCoord], {
          color: '#10b981',
          weight: 3,
          opacity: 0.85,
        }).addTo(map);
      }

      // 3. Plot active/scheduled Logistics Schedules routes
      const plottedLogistics = new Set<string>();
      for (const sched of logisticsSchedules) {
        if (!isMounted) break;
        if (sched.scheduleStatus === 'cancelado') continue;
        if (!sched.destinationCity) continue;

        const origCity = sched.originCity || 'Palmas';
        const origState = sched.originState || 'TO';
        const lKey = `${origCity.toLowerCase()}|${origState.toLowerCase()}->${sched.destinationCity.toLowerCase()}|${(sched.destinationState || '').toLowerCase()}`;
        if (plottedLogistics.has(lKey)) continue;
        plottedLogistics.add(lKey);

        const origCoord = await resolveCityCoordinates(origCity, origState);
        const destCoord = await resolveCityCoordinates(sched.destinationCity, sched.destinationState);
        latLngs.push(origCoord, destCoord);

        L.marker(destCoord, { icon: logisticsIcon })
          .addTo(map)
          .bindPopup(
            `<b>Logística: ${sched.vehicleModelPlate}</b><br/>📍 ${sched.destinationLabel} (${sched.destinationCity}/${sched.destinationState})`
          );

        L.polyline([origCoord, destCoord], {
          color: '#8b5cf6',
          weight: 3,
          opacity: 0.8,
          dashArray: '8, 6',
        }).addTo(map);
      }

      if (isMounted && latLngs.length > 1) {
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [50, 50] });
      }

      setTimeout(() => {
        if (isMounted && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 250);
    }

    loadMarkers();

    return () => {
      isMounted = false;
    };
  }, [works, trips, logisticsSchedules]);

  React.useEffect(() => {
    const el = mapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      className={`w-full ${heightClass} rounded-2xl overflow-hidden border border-slate-700 shadow-inner relative z-10`}
    >
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}

export default LeafletRouteMap;
