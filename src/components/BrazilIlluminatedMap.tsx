import React, { useMemo, useState, useEffect } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker
} from "react-simple-maps";
import { ArrowLeft } from 'lucide-react';
import { ConstructionWork, Vehicle, Equipment } from '../types';

const geoUrl = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

// Approximate center coordinates for Brazilian states [lng, lat]
const stateCoordinates: Record<string, [number, number]> = {
  "AC": [-70.5516, -9.0238],
  "AL": [-36.7820, -9.5713],
  "AP": [-52.0206, 1.4137], // Adjusted slightly north
  "AM": [-65.8561, -3.4168],
  "BA": [-41.7007, -12.5797],
  "CE": [-39.3206, -5.4984],
  "DF": [-47.9292, -15.7801],
  "ES": [-40.3089, -19.1834],
  "GO": [-49.2533, -15.8270],
  "MA": [-45.2744, -4.9609],
  "MT": [-56.5211, -12.6819],
  "MS": [-54.6201, -20.4428],
  "MG": [-44.6867, -18.5122],
  "PA": [-52.9230, -3.2024],
  "PB": [-36.1800, -7.1153],
  "PR": [-51.9253, -25.2521],
  "PE": [-37.2140, -8.8137],
  "PI": [-42.7322, -7.7183],
  "RJ": [-43.1561, -22.9083],
  "RN": [-36.6698, -5.4026],
  "RS": [-51.2177, -30.0346],
  "RO": [-62.9908, -11.5057],
  "RR": [-60.6733, -2.7300],
  "SC": [-50.0162, -27.2423],
  "SP": [-49.2831, -23.5505],
  "SE": [-37.3857, -10.5741],
  "TO": [-48.3624, -10.1753],
};

const stateScales: Record<string, number> = {
  "AC": 2000, "AL": 5000, "AP": 2500, "AM": 1200, "BA": 1500, 
  "CE": 2500, "DF": 8000, "ES": 4000, "GO": 2000, "MA": 1800, 
  "MT": 1200, "MS": 1800, "MG": 1500, "PA": 1000, "PB": 4000, 
  "PR": 2500, "PE": 3000, "PI": 2000, "RJ": 4000, "RN": 4000, 
  "RS": 2000, "RO": 2000, "RR": 2500, "SC": 3000, "SP": 2500, 
  "SE": 6000, "TO": 2000,
};

// Global cache for geocoded cities
const cityCoordsCache: Record<string, [number, number]> = {};

interface BrazilIlluminatedMapProps {
  works: ConstructionWork[];
  vehicles?: Vehicle[];
  equipments?: Equipment[];
  onStateSelect?: (state: string | null) => void;
  onCitySelect?: (city: string | null) => void;
}

export function BrazilIlluminatedMap({ 
  works, 
  vehicles = [], 
  equipments = [], 
  onStateSelect, 
  onCitySelect 
}: BrazilIlluminatedMapProps) {
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  useEffect(() => {
    if (onStateSelect) onStateSelect(selectedState);
    if (!selectedState) {
      setSelectedCity(null);
      if (onCitySelect) onCitySelect(null);
    }
  }, [selectedState, onStateSelect]);

  useEffect(() => {
    if (onCitySelect) onCitySelect(selectedCity);
  }, [selectedCity, onCitySelect]);
  const [localCityCoords, setLocalCityCoords] = useState<Record<string, [number, number]>>({});

  useEffect(() => {
    if (!selectedState) return;
    
    let isMounted = true;
    const worksInState = works.filter(w => w.state.toUpperCase() === selectedState);
    const uniqueCities = Array.from(new Set(worksInState.map(w => w.city)));

    const fetchCoords = async () => {
      for (const city of uniqueCities) {
        if (!isMounted) break;
        const key = `${city}-${selectedState}`;
        if (cityCoordsCache[key]) {
          setLocalCityCoords(prev => ({ ...prev, [key]: cityCoordsCache[key] }));
          continue;
        }

        try {
          const query = `${city}, ${selectedState}, Brazil`;
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
          const response = await fetch(url);
          const data = await response.json();
          if (data && data.length > 0) {
            const coords: [number, number] = [parseFloat(data[0].lon), parseFloat(data[0].lat)];
            cityCoordsCache[key] = coords;
            if (isMounted) {
              setLocalCityCoords(prev => ({ ...prev, [key]: coords }));
            }
          }
          await new Promise(r => setTimeout(r, 600)); // Respect OpenStreetMap rate limit
        } catch (err) {
          console.error("Geocoding failed for", city, err);
        }
      }
    };

    fetchCoords();

    return () => {
      isMounted = false;
    };
  }, [selectedState, works]);

  const mapData = useMemo(() => {
    const activeByState: Record<string, number> = {};
    const completedByState: Record<string, number> = {};

    works.forEach(w => {
      const UF = w.state.toUpperCase();
      if (w.status === 'active') {
        activeByState[UF] = (activeByState[UF] || 0) + 1;
      } else {
        completedByState[UF] = (completedByState[UF] || 0) + 1;
      }
    });

    const markers = [];
    for (const [state, coords] of Object.entries(stateCoordinates)) {
      const activeCount = activeByState[state] || 0;
      const completedCount = completedByState[state] || 0;

      if (activeCount > 0 || completedCount > 0) {
        markers.push({
          state,
          coordinates: coords,
          activeCount,
          completedCount,
          status: activeCount > 0 ? 'active' : 'completed'
        });
      }
    }
    return markers;
  }, [works]);
  
  const cityMarkers = useMemo(() => {
     if (!selectedState) return [];
     const worksInState = works.filter(w => w.state.toUpperCase() === selectedState);
     const markers: any[] = [];
     
     worksInState.forEach(w => {
        const key = `${w.city}-${selectedState}`;
        const coords = localCityCoords[key] || cityCoordsCache[key];
        if (coords) {
           const vehiclesCount = vehicles.filter(v => v.workId === w.id).length;
           const equipmentsCount = equipments.filter(e => e.workId === w.id).length;
           markers.push({
              id: w.id,
              name: w.name,
              city: w.city,
              coordinates: coords,
              status: w.status,
              vehiclesCount,
              equipmentsCount
           });
        }
     });
     
     return markers;
  }, [selectedState, works, vehicles, equipments, localCityCoords]);

  const projectionConfig = useMemo(() => {
    if (selectedState && stateCoordinates[selectedState]) {
      return {
        scale: stateScales[selectedState] || 2500,
        center: stateCoordinates[selectedState]
      };
    }
    return {
      scale: 650,
      center: [-54, -15] as [number, number]
    };
  }, [selectedState]);

  return (
    <div className="w-full bg-[#0m1e] bg-slate-900 rounded-3xl overflow-hidden relative border border-slate-800 shadow-2xl flex items-center justify-center p-4">
       <div className="absolute top-6 left-6 p-4 bg-slate-950/60 backdrop-blur-md rounded-2xl border border-slate-800/80 z-10 text-left">
          <h3 className="font-display font-bold tracking-tight text-white flex items-center gap-2 text-sm">
             <span className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
             {selectedState ? `Obra(s) em ${selectedState}` : 'Mapa de Operações'}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1 mb-3">
             {selectedState ? 'Visualização estadual' : 'Distribuição nacional de obras.'}
          </p>
          {!selectedState && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                <span className="text-xs font-bold text-slate-200">Ativas ({works.filter(w=>w.status==='active').length})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-slate-600 rounded-full"></span>
                <span className="text-xs font-bold text-slate-200">Concluídas ({works.filter(w=>w.status!=='active').length})</span>
              </div>
            </div>
          )}
          {selectedState && (
             <button 
                onClick={() => setSelectedState(null)} 
                className="mt-2 flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
             >
                <ArrowLeft className="w-3 h-3" /> Voltar ao mapa nacional
             </button>
          )}
       </div>

      <ComposableMap
        projection="geoMercator"
        projectionConfig={projectionConfig}
        width={800}
        height={600}
        style={{
          width: "100%",
          maxHeight: "500px",
          background: "transparent"
        }}
        className="transition-all duration-700 ease-in-out"
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const isSelected = selectedState === geo.properties.sigla;
              const opacity = selectedState && !isSelected ? 0.3 : 1;
              return (
                 <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#1e293b"
                    stroke="#334155"
                    strokeWidth={selectedState ? 1 : 0.5}
                    style={{
                      default: { outline: "none", opacity, transformOrigin: 'center' },
                      hover: { fill: "#334155", outline: "none", opacity: selectedState ? opacity : 1, cursor: selectedState ? 'default' : 'pointer' },
                      pressed: { outline: "none", opacity },
                    }}
                    onClick={() => {
                       if (!selectedState) {
                          setSelectedState(geo.properties.sigla);
                       }
                    }}
                  />
              );
            })
          }
        </Geographies>

        {!selectedState && mapData.map(({ state, coordinates, activeCount, completedCount, status }) => {
           const isEqActive = status === 'active';
           const color = isEqActive ? "#10b981" : "#475569";
           
           return (
              <Marker key={state} coordinates={coordinates}>
                <g 
                  className="cursor-pointer transition-all hover:scale-125"
                  onClick={(e) => {
                     e.stopPropagation();
                     setSelectedState(state);
                  }}
                >
                  <circle
                    r={isEqActive ? 8 : 5}
                    fill={color}
                    opacity={0.8}
                  />
                  {/* Label containing UF */}
                  <text
                    textAnchor="middle"
                    y={-12}
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "12px",
                      fill: "white",
                      fontWeight: "bold",
                    }}
                  >
                    {state}
                  </text>
                  <rect x="-10" y="8" width="20" height="12" rx="4" fill="#0f172a" stroke="#1e293b" strokeWidth="1"/>
                  <text
                    textAnchor="middle"
                    y={17}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "8px",
                      fill: color,
                      fontWeight: "bold"
                    }}
                  >
                    {activeCount + completedCount}
                  </text>
                </g>
              </Marker>
           );
        })}

        {selectedState && cityMarkers.map((marker, index) => {
           const isEqActive = marker.status === 'active';
           const color = isEqActive ? "#10b981" : "#475569";
           
           // Slight random variation to prevent exact overlap if same city has multiple works
           const jiggleX = Math.random() * 0.1 - 0.05;
           const jiggleY = Math.random() * 0.1 - 0.05;
           const finalCoords: [number, number] = [marker.coordinates[0] + jiggleX, marker.coordinates[1] + jiggleY];

           return (
              <Marker key={`${marker.id}-${index}`} coordinates={finalCoords}>
                <g 
                  className="cursor-pointer transition-all hover:scale-125"
                  onClick={(e) => {
                     e.stopPropagation();
                     if (selectedCity === marker.city) {
                        setSelectedCity(null);
                     } else {
                        setSelectedCity(marker.city);
                     }
                  }}
                >
                  <circle
                    r={6}
                    fill={selectedCity && selectedCity !== marker.city ? "#334155" : color}
                    opacity={0.8}
                    stroke={selectedCity === marker.city ? "white" : "none"}
                    strokeWidth={selectedCity === marker.city ? 1.5 : 0}
                  />
                  <text
                    textAnchor="middle"
                    y={-10}
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "10px",
                      fill: "white",
                      fontWeight: "normal",
                      textShadow: "1px 1px 2px rgba(0,0,0,0.8)"
                    }}
                  >
                    {marker.city}
                  </text>
                  {(marker.vehiclesCount > 0 || marker.equipmentsCount > 0) && (
                     <text
                       textAnchor="middle"
                       y={16}
                       style={{
                         fontFamily: "var(--font-mono)",
                         fontSize: "8px",
                         fill: "#94a3b8",
                         fontWeight: "bold",
                         textShadow: "1px 1px 2px rgba(0,0,0,0.8)"
                       }}
                     >
                       V:{marker.vehiclesCount} | M:{marker.equipmentsCount}
                     </text>
                  )}
                </g>
              </Marker>
           );
        })}
      </ComposableMap>
    </div>
  );
}
