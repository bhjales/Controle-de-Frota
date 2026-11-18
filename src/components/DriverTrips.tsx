import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, CheckCircle, Navigation, MapPin, Compass, AlertCircle, Fuel, Calendar, Gauge, FileText, ArrowRight, Hourglass, Link2, CalendarRange, Package, X } from 'lucide-react';
import { Vehicle, Trip, User, ConstructionWork, LogisticsSchedule } from '../types';
import { FleetStore } from '../store/fleetStore';
import { formatIsoDateToBR } from '../utils/tripComparison';

interface DriverTripsProps {
  vehicles: Vehicle[];
  trips: Trip[];
  currentUser: User | null;
  store: FleetStore;
  works: ConstructionWork[];
  logisticsSchedules?: LogisticsSchedule[];
}

const BRAZILIAN_UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function DriverTrips({ vehicles, trips, currentUser, store, works = [], logisticsSchedules = [] }: DriverTripsProps) {
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);

  // Check if current user has an active trip
  useEffect(() => {
    if (currentUser) {
      const active = trips.find(t => t.driverId === currentUser.id && t.status === 'active');
      setActiveTrip(active || null);
    } else {
      setActiveTrip(null);
    }
  }, [trips, currentUser]);

  // Scheduled Logistics trips assigned to the current driver and not yet started
  const scheduledTripsForDriver = useMemo(() => {
    if (!currentUser) return [];
    const linkedScheduleIds = new Set(
      trips.map(t => t.logisticsScheduleId).filter((id): id is string => Boolean(id))
    );
    return logisticsSchedules
      .filter(
        s =>
          s.driverId === currentUser.id &&
          (s.scheduleStatus === 'programado' || s.scheduleStatus === 'em_andamento') &&
          !linkedScheduleIds.has(s.id)
      )
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [logisticsSchedules, trips, currentUser]);

  // --- CHECK-IN FORM STATES ---
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const skipVehicleAutofillRef = useRef(false);
  const checkInFormRef = useRef<HTMLDivElement>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedComplementId, setSelectedComplementId] = useState('');
  const [checkInKm, setCheckInKm] = useState<number | ''>('');
  const [checkInFuel, setCheckInFuel] = useState('1/2');
  const [selectedWorkId, setSelectedWorkId] = useState('');
  const [origin, setOrigin] = useState('Garagem Central (Geral)');
  const [originCity, setOriginCity] = useState('Palmas');
  const [originState, setOriginState] = useState('TO');
  const [destination, setDestination] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationState, setDestinationState] = useState('');
  const [reason, setReason] = useState('');
  const [checkInObs, setCheckInObs] = useState('');
  
  // --- CHECK-OUT FORM STATES ---
  const [checkOutKm, setCheckOutKm] = useState<number | ''>('');
  const [checkOutFuel, setCheckOutFuel] = useState('1/2');
  const [checkOutObs, setCheckOutObs] = useState('');

  // --- GENERAL RESPONSE FEEDBACK ---
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Pre-fill Km and Admin pre-allocation when vehicle changes (unless prefilled by Logistics Schedule)
  useEffect(() => {
    if (skipVehicleAutofillRef.current) {
      skipVehicleAutofillRef.current = false;
      const veh = vehicles.find(v => v.id === selectedVehicleId);
      if (veh) {
        setCheckInKm(veh.currentKm);
      }
      setErrorMsg('');
      return;
    }

    if (selectedVehicleId) {
      const veh = vehicles.find(v => v.id === selectedVehicleId);
      if (veh) {
        setCheckInKm(veh.currentKm);
        if (selectedScheduleId) {
          // Keep Logistics route/destination fields when driver picks a substitute vehicle
          setErrorMsg('');
          return;
        }
        if (veh.workId) {
          setSelectedWorkId(veh.workId);
          const matchedWork = works.find(w => w.id === veh.workId);
          if (matchedWork) {
            setOrigin(`${matchedWork.name}`);
            setOriginCity(matchedWork.city || 'Palmas');
            setOriginState(matchedWork.state || 'TO');
            setDestination(''); // Driver will fill in manually
            setDestinationCity('');
            setDestinationState('');
            setReason(`Transporte saindo de obra: ${matchedWork.name}`);
          } else {
            setOrigin('Garagem Central (Geral)');
            setOriginCity('Palmas');
            setOriginState('TO');
            setDestination('');
            setDestinationCity('');
            setDestinationState('');
            setReason('');
          }
        } else {
          setSelectedWorkId('');
          setOrigin('Garagem Central (Geral)');
          setOriginCity('Palmas');
          setOriginState('TO');
          setDestination('');
          setDestinationCity('');
          setDestinationState('');
          setReason('');
        }
      }
    } else if (!selectedScheduleId) {
      setCheckInKm('');
      setSelectedWorkId('');
      setOrigin('Garagem Central (Geral)');
      setOriginCity('Palmas');
      setOriginState('TO');
      setDestination('');
      setDestinationCity('');
      setDestinationState('');
      setReason('');
    }
    setErrorMsg('');
  }, [selectedVehicleId, vehicles, works, selectedScheduleId]);

  const handleSelectScheduledTrip = (sched: LogisticsSchedule) => {
    setErrorMsg('');
    setSuccessMsg('');
    skipVehicleAutofillRef.current = true;
    setSelectedScheduleId(sched.id);

    const schedVeh = vehicles.find(v => v.id === sched.vehicleId);
    const isVehAvailable =
      schedVeh &&
      !schedVeh.isComplement &&
      schedVeh.isActive !== false &&
      schedVeh.status === 'available' &&
      !activeTripAssetIds.has(schedVeh.id);

    if (isVehAvailable && schedVeh) {
      setSelectedVehicleId(schedVeh.id);
      setCheckInKm(schedVeh.currentKm);
    } else {
      setSelectedVehicleId('');
      setCheckInKm('');
    }

    const schedComp = sched.complementVehicleId
      ? vehicles.find(v => v.id === sched.complementVehicleId)
      : undefined;
    const isCompAvailable =
      schedComp &&
      Boolean(schedComp.isComplement) &&
      schedComp.isActive !== false &&
      schedComp.status === 'available' &&
      !activeTripAssetIds.has(schedComp.id);

    setSelectedComplementId(isCompAvailable && schedComp ? schedComp.id : '');
    setSelectedWorkId(sched.workId || '');
    setOrigin(sched.originWorkName || sched.originLabel || 'Garagem Central (Geral)');
    setOriginCity(sched.originCity || 'Palmas');
    setOriginState(sched.originState || 'TO');
    setDestination(sched.workName || sched.destinationLabel || '');
    setDestinationCity(sched.destinationCity || '');
    setDestinationState(sched.destinationState || '');
    setReason(
      sched.cargoDescription
        ? `Logística: ${sched.cargoDescription}`
        : `Viagem programada pela logística: ${sched.workName || sched.destinationLabel}`
    );
    setCheckInObs(sched.notes || '');

    setTimeout(() => {
      checkInFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleClearScheduledSelection = () => {
    setSelectedScheduleId(null);
    setSelectedVehicleId('');
    setSelectedComplementId('');
    setCheckInKm('');
    setSelectedWorkId('');
    setOrigin('Garagem Central (Geral)');
    setOriginCity('Palmas');
    setOriginState('TO');
    setDestination('');
    setDestinationCity('');
    setDestinationState('');
    setReason('');
    setCheckInObs('');
    setErrorMsg('');
  };

  // Pre-fill checkout Km with active trip initial Km + 10 (reasonable guess)
  useEffect(() => {
    if (activeTrip) {
      setCheckOutKm(activeTrip.checkIn.km + 20); // reasonable guess helper
    } else {
      setCheckOutKm('');
    }
  }, [activeTrip]);

  const handleCheckInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedVehicleId) {
      setErrorMsg('Por favor, selecione um veículo da lista.');
      return;
    }
    if (checkInKm === '' || Number(checkInKm) < 0) {
      setErrorMsg('Por favor, informe uma quilometragem inicial válida.');
      return;
    }
    if (!origin.trim()) {
      setErrorMsg('Por favor, informe o ponto de partida / origem.');
      return;
    }
    if (!originCity.trim()) {
      setErrorMsg('Por favor, informe o município de origem.');
      return;
    }
    if (!originState.trim() || originState.trim().length !== 2) {
      setErrorMsg('Por favor, selecione o estado (UF) do município de origem.');
      return;
    }
    if (!destination.trim()) {
      setErrorMsg('Por favor, defina um destino.');
      return;
    }
    if (!destinationCity.trim()) {
      setErrorMsg('Por favor, informe o município de destino.');
      return;
    }
    if (!destinationState.trim() || destinationState.trim().length !== 2) {
      setErrorMsg('Por favor, selecione o estado (UF) do município de destino.');
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('Por favor, informe o motivo da sua viagem.');
      return;
    }

    const res = store.checkInTrip(
      selectedVehicleId,
      {
        km: Number(checkInKm),
        fuel: checkInFuel,
        origin: origin.trim(),
        originCity: originCity.trim(),
        originState: originState.trim().toUpperCase(),
        destination: destination.trim(),
        destinationCity: destinationCity.trim(),
        destinationState: destinationState.trim().toUpperCase(),
        reason: reason.trim(),
        observations: checkInObs.trim()
      },
      selectedWorkId || undefined,
      selectedComplementId || undefined,
      selectedScheduleId || undefined
    );

    if (res.success) {
      setSuccessMsg(res.message);
      // Reset CheckIn states
      setSelectedScheduleId(null);
      setSelectedVehicleId('');
      setSelectedComplementId('');
      setCheckInKm('');
      setCheckInFuel('1/2');
      setSelectedWorkId('');
      setOrigin('Garagem Central (Geral)');
      setOriginCity('Palmas');
      setOriginState('TO');
      setDestination('');
      setDestinationCity('');
      setDestinationState('');
      setReason('');
      setCheckInObs('');
      
      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleCheckOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!activeTrip) {
      setErrorMsg('Nenhuma viagem ativa encontrada para finalizar.');
      return;
    }
    if (checkOutKm === '' || Number(checkOutKm) < activeTrip.checkIn.km) {
      setErrorMsg(`Quilometragem final não pode ser menor do que a inicial (${activeTrip.checkIn.km} km)`);
      return;
    }

    const res = store.checkOutTrip(activeTrip.id, {
      km: Number(checkOutKm),
      fuel: checkOutFuel,
      observations: checkOutObs.trim()
    });

    if (res.success) {
      setSuccessMsg(res.message);
      // Reset Checkout states
      setCheckOutKm('');
      setCheckOutFuel('1/2');
      setCheckOutObs('');
      
      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } else {
      setErrorMsg(res.message);
    }
  };

  const activeTripAssetIds = new Set<string>();
  trips
    .filter(t => t.status === 'active')
    .forEach(t => {
      if (t.vehicleId) activeTripAssetIds.add(t.vehicleId);
      if (t.complementVehicleId) activeTripAssetIds.add(t.complementVehicleId);
    });

  const scheduledVehicleIdsForDriver = new Set(scheduledTripsForDriver.map(s => s.vehicleId));

  const availableVehicles = vehicles.filter(
    v =>
      !v.isComplement &&
      v.isActive !== false &&
      v.status === 'available' &&
      !activeTripAssetIds.has(v.id) &&
      (currentUser?.role === 'admin' ||
        currentUser?.authorizedAssetIds?.includes(v.id) ||
        scheduledVehicleIdsForDriver.has(v.id))
  );

  const selectedSchedule = selectedScheduleId
    ? scheduledTripsForDriver.find(s => s.id === selectedScheduleId) || null
    : null;

  const availableComplements = vehicles.filter(
    v =>
      Boolean(v.isComplement) &&
      v.isActive !== false &&
      v.status === 'available' &&
      !activeTripAssetIds.has(v.id)
  );

  // List of suggested municipalities from registered works + central base
  const suggestedCities = Array.from(
    new Set([
      'Palmas',
      ...works.map(w => w.city).filter(Boolean),
      'Araguaína',
      'Gurupi',
      'Porto Nacional',
      'Paraíso do Tocantins',
      'Colinas do Tocantins',
      'Guaraí',
      'Dianópolis',
      'Miracema do Tocantins'
    ])
  );

  return (
    <div id="driver_trips_view" className="space-y-6">
      {/* Dynamic Trip Stage Selector Header */}
      <div className="bg-[#0F172A] text-white rounded-3xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[9px] font-bold tracking-wider font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-md">
            {activeTrip ? 'ESTÁGIO ATIVO: VIAGEM EM CURSO' : 'ESTÁGIO LIVRE: PRONTO PARA TRABALHAR'}
          </span>
          <h2 className="text-xl font-bold tracking-tight pt-1 font-display">Módulo de Gestão de Viagem</h2>
          <p className="text-xs text-slate-300">Faça o check-in ao pegar um veículo e o check-out ao devolvê-lo.</p>
        </div>
        
        {activeTrip && (
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3 text-xs flex items-center gap-3 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 block shrink-0"></span>
            <div>
              <p className="font-semibold text-slate-250">Veículo Alocado Atualmente:</p>
              <p className="font-mono text-[11px] text-blue-400">{activeTrip.vehicleModelPlate}</p>
              {activeTrip.complementVehicleModelPlate && (
                <p className="font-mono text-[11px] text-indigo-300 mt-0.5">
                  + Complemento: {activeTrip.complementVehicleModelPlate}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Form container based on trip state */}
      {!activeTrip ? (
        <div className="space-y-6">
          {/* SCHEDULED LOGISTICS TRIPS FOR DRIVER */}
          {scheduledTripsForDriver.length > 0 && (
            <div className="bg-white border border-blue-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                    <CalendarRange className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-display">
                      Viagens Programadas pela Logística ({scheduledTripsForDriver.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Selecione uma viagem programada para preencher o check-in automaticamente e iniciar o trajeto.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                {scheduledTripsForDriver.map(sched => {
                  const isSelected = selectedScheduleId === sched.id;
                  const schedVeh = vehicles.find(v => v.id === sched.vehicleId);
                  const isVehAvail =
                    schedVeh &&
                    !schedVeh.isComplement &&
                    schedVeh.isActive !== false &&
                    schedVeh.status === 'available' &&
                    !activeTripAssetIds.has(schedVeh.id);
                  return (
                    <div
                      key={sched.id}
                      className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all ${
                        isSelected
                          ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20'
                          : 'bg-slate-50/70 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-600 text-white">
                                Programado Logística
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white border border-slate-200 text-slate-700">
                                {formatIsoDateToBR(sched.startDate)} → {formatIsoDateToBR(sched.endDate)}
                              </span>
                              {sched.workName && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  Obra: {sched.workName}
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 truncate">
                              {sched.vehicleModelPlate}
                            </h4>
                            {sched.complementVehicleModelPlate && (
                              <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                                <Link2 className="w-3.5 h-3.5 shrink-0" />
                                + Complemento: {sched.complementVehicleModelPlate}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="bg-white border border-slate-200/80 rounded-xl px-3 py-2 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="truncate">
                              <strong>Origem:</strong> {sched.originWorkName || sched.originLabel || 'Matriz / Base'} ({sched.originCity || 'Palmas'}/{sched.originState || 'TO'})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-900">
                            <Navigation className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">
                              <strong>Destino:</strong> {sched.workName || sched.destinationLabel} ({sched.destinationCity}/{sched.destinationState})
                            </span>
                          </div>
                          {sched.cargoDescription && (
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Package className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span className="truncate">
                                <strong>Carga:</strong> {sched.cargoDescription}
                              </span>
                            </div>
                          )}
                          {sched.notes && (
                            <p className="text-[11px] text-slate-500 italic pt-0.5">Obs.: {sched.notes}</p>
                          )}
                        </div>

                        {!isVehAvail && (
                          <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 font-medium">
                            O veículo programado ({sched.vehicleModelPlate}) está no momento em{' '}
                            {schedVeh?.status === 'in_use' ? 'outra viagem' : schedVeh?.status === 'maintenance' ? 'manutenção' : 'indisponível'}. Você pode iniciar selecionando outro veículo disponível no check-in.
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => handleSelectScheduledTrip(sched)}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5" />
                          {isSelected ? 'Carregada no Check-In' : 'Iniciar com Check-In'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* --- VIEW A: REALIZAR CHECK-IN (INICIAR VIAGEM) --- */}
          <div ref={checkInFormRef} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm animate-fade-in space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 font-display">
                  <Play className="w-5 h-5 text-blue-600" />
                  1. Check-In de Nova Saída de Veículo
                </h3>
                <p className="text-sm text-slate-550 mt-0.5 font-medium">Preencha os dados de saída do veículo antes de partir nas rodovias.</p>
              </div>
            </div>

            {selectedSchedule && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5 text-xs">
                  <span className="font-bold text-blue-900 flex items-center gap-1.5">
                    <CalendarRange className="w-4 h-4 text-blue-600" />
                    Iniciando Viagem Programada pela Logística
                  </span>
                  <p className="text-blue-800">
                    Destino: <strong>{selectedSchedule.workName || selectedSchedule.destinationLabel}</strong> ({selectedSchedule.destinationCity}/{selectedSchedule.destinationState}) · Período: <strong>{formatIsoDateToBR(selectedSchedule.startDate)} a {formatIsoDateToBR(selectedSchedule.endDate)}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearScheduledSelection}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-800 bg-white hover:bg-blue-100 border border-blue-200 rounded-xl cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  Desvincular Programação
                </button>
              </div>
            )}

          <form id="checkin_trip_form" onSubmit={handleCheckInSubmit} className="space-y-6">
            {/* Auto-suggested municipalities datalist */}
            <datalist id="trip_cities_list">
              {suggestedCities.map((c, i) => (
                <option key={i} value={c} />
              ))}
            </datalist>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Vehicle Selection Block */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">Selecione o Veículo Principal (Não Complemento) *</label>
                {availableVehicles.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Nenhum veículo trator disponível no pátio atualmente. Todos estão em uso ou em manutenção. Solicite a liberação de um veículo a um Admin.</span>
                  </div>
                ) : (
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => {
                      setSelectedVehicleId(e.target.value);
                      if (!e.target.value) setSelectedComplementId('');
                    }}
                    className="w-full text-sm bg-[#F8FAFC] hover:bg-slate-100/50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3 outline-none transition-all cursor-pointer font-medium"
                    required
                  >
                    <option value="">-- Selecione o veículo --</option>
                    {availableVehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.brand} {vehicle.model} - [ {vehicle.plate} ] — {vehicle.currentKm.toLocaleString()} km
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Complement Coupling Selection Block */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1.5 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" />
                  Acoplar Complemento / Carroceria (Opcional)
                </label>
                <select
                  value={selectedComplementId}
                  onChange={(e) => setSelectedComplementId(e.target.value)}
                  disabled={!selectedVehicleId || availableComplements.length === 0}
                  className="w-full text-sm bg-indigo-50/40 hover:bg-indigo-50/70 disabled:bg-slate-100 disabled:text-slate-400 border border-indigo-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 outline-none transition-all cursor-pointer font-medium"
                >
                  <option value="">-- Sem complemento acoplado --</option>
                  {availableComplements.map((comp) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.brand} {comp.model} - [ {comp.plate} ]{comp.category ? ` (${comp.category})` : ''}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 block">
                  {availableComplements.length === 0 && vehicles.some(v => v.isComplement)
                    ? 'Nenhum complemento livre no pátio (em viagem ativa, manutenção ou inativo).'
                    : 'Complementos (carrocerias) só viajam acoplados a veículos que não sejam complemento e que não estejam em outra viagem.'}
                </span>
              </div>

              {/* Initial Km property */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">Odômetro Inicial (Km) *</label>
                <div className="relative">
                  <Gauge className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="number"
                    value={checkInKm}
                    onChange={(e) => setCheckInKm(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                    className="w-full pl-10 pr-4 py-3 text-sm bg-[#F8FAFC] border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all font-mono"
                    placeholder="Quilometragem inicial do painel"
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-mono italic block">Alinhado automaticamente com o histórico do veículo.</span>
              </div>

              {/* Fuel Level */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">Nível do Combustível de Partida *</label>
                <div className="flex gap-2 p-1.5 bg-[#F8FAFC] border border-slate-150 rounded-xl">
                  {['Vazio', '1/4', '1/2', '3/4', 'Cheio'].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setCheckInFuel(level)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        checkInFuel === level
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/40'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Obras Allocation Select Dropdown */}
              <div className="space-y-1.5 md:col-span-2 bg-blue-50/45 border border-blue-100 p-4 rounded-2xl mb-2 text-left">
                <label className="block text-[10px] uppercase font-mono font-black tracking-wider text-blue-900 mb-1">
                  Alocação de Obra (Definida pelo Admin)
                </label>
                
                {selectedVehicleId && (
                  (() => {
                    const veh = vehicles.find(v => v.id === selectedVehicleId);
                    if (veh && veh.workId) {
                      return (
                        <div className="bg-[#EEF2FF] border border-blue-200 p-3 rounded-xl text-xs mb-2">
                          <p className="font-extrabold text-blue-900 flex items-center gap-1.5">🏗️ Obra Pré-alocada pelo Administrador:</p>
                          <p className="font-bold text-slate-800 text-[13px] mt-1">{veh.workName}</p>
                          <p className="text-[10px] text-slate-500 font-medium mt-1 leading-normal">Este veículo está sob controle dedicado a esta obra. O faturamento e relatórios de viagem serão creditados nela.</p>
                        </div>
                      );
                    } else if (veh) {
                      return (
                        <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-xs mb-2">
                          <p className="font-extrabold text-amber-900 flex items-center gap-1.5">⚙️ Alocação Geral (Sem obra única dedicada):</p>
                          <p className="font-bold text-slate-800 text-[13px] mt-1">Rota/Uso Geral</p>
                          <p className="text-[10px] text-slate-500 font-medium mt-1 leading-normal">Não há obra específica associada a este carro pelo Admin. Os custos e quilometragens rodarão sob a conta Geral.</p>
                        </div>
                      );
                    }
                    return null;
                  })()
                )}

                <select
                  disabled={true}
                  id="driver_work_select"
                  value={selectedWorkId}
                  className="w-full px-3 py-2.5 text-xs bg-slate-100 border border-slate-200 rounded-xl outline-none font-bold text-slate-500 cursor-not-allowed"
                >
                  <option value="">⚙️ Geral (Sem alocação única)</option>
                  {works.map(w => (
                    <option key={w.id} value={w.id}>
                      🏗️ {w.name} ({w.city} - {w.state})
                    </option>
                  ))}
                </select>
                <p className="text-[9px] text-slate-400 mt-1 font-bold leading-normal uppercase">
                  🔒 Bloqueado: A alocação é efetuada exclusivamente pelo Administrador na gestão da garagem.
                </p>
              </div>

              {/* Origin Section: Location and Municipality */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">
                  Local / Ponto de Partida (Origem) *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all font-semibold text-slate-700"
                    placeholder="Ex: Escritório Central ou Garagem"
                    required
                  />
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">Obra pré-alocada pelo gestor, garagem ou ponto de saída.</p>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2 space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">
                    Município de Origem *
                  </label>
                  <div className="relative">
                    <Navigation className="w-4 h-4 text-blue-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      list="trip_cities_list"
                      value={originCity}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOriginCity(val);
                        const matched = works.find(w => w.city?.toLowerCase() === val.trim().toLowerCase());
                        if (matched?.state) setOriginState(matched.state);
                        else if (val.trim().toLowerCase() === 'palmas') setOriginState('TO');
                      }}
                      className="w-full pl-10 pr-3 py-3 text-sm bg-[#F8FAFC] border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all font-semibold text-slate-800"
                      placeholder="Ex: Palmas"
                      required
                    />
                  </div>
                </div>
                <div className="col-span-1 space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">
                    Estado (UF) *
                  </label>
                  <select
                    value={originState}
                    onChange={(e) => setOriginState(e.target.value)}
                    className="w-full px-3 py-3 text-sm bg-[#F8FAFC] border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all font-bold text-slate-800 cursor-pointer"
                    required
                  >
                    <option value="">UF</option>
                    {BRAZILIAN_UFS.map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
                <p className="col-span-3 text-[9px] text-slate-400 leading-tight">Cidade e estado de partida (Sede Central: Palmas/TO).</p>
              </div>

              {/* Destination Section: Location and Municipality + State */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">
                  Local / Ponto de Chegada (Destino) *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm bg-[#F8FAFC] border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all font-medium animate-none"
                    placeholder="Ex: Canteiro de Obras Norte, Fornecedor ou Cliente X"
                    required
                  />
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">Indique o local específico onde o veículo irá chegar.</p>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2 space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">
                    Município de Destino *
                  </label>
                  <div className="relative">
                    <Navigation className="w-4 h-4 text-emerald-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      list="trip_cities_list"
                      value={destinationCity}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDestinationCity(val);
                        const matched = works.find(w => w.city?.toLowerCase() === val.trim().toLowerCase());
                        if (matched?.state) setDestinationState(matched.state);
                        else if (['palmas', 'araguaína', 'araguaina', 'gurupi', 'porto nacional', 'paraíso do tocantins', 'paraiso do tocantins', 'colinas do tocantins', 'guaraí', 'guarai', 'dianópolis', 'dianopolis', 'miracema do tocantins'].includes(val.trim().toLowerCase())) {
                          setDestinationState('TO');
                        }
                      }}
                      className="w-full pl-10 pr-3 py-3 text-sm bg-[#F8FAFC] border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all font-semibold text-slate-800"
                      placeholder="Ex: Araguaína, Gurupi..."
                      required
                    />
                  </div>
                </div>
                <div className="col-span-1 space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">
                    Estado (UF) *
                  </label>
                  <select
                    value={destinationState}
                    onChange={(e) => setDestinationState(e.target.value)}
                    className="w-full px-3 py-3 text-sm bg-[#F8FAFC] border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all font-bold text-slate-800 cursor-pointer"
                    required
                  >
                    <option value="">UF</option>
                    {BRAZILIAN_UFS.map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
                <p className="col-span-3 text-[9px] text-slate-400 leading-tight">Cidade e estado (UF) do destino planejado.</p>
              </div>

              {/* Motif / Reason */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">Motivo / Finalidade da Viagem *</label>
                <div className="relative">
                  <Compass className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm bg-[#F8FAFC] border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all font-medium"
                    placeholder="Ex: Entrega de suprimentos ou reuniões de vendas"
                    required
                  />
                </div>
              </div>

              {/* General Observations */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">Observações Gerais de Partida</label>
                <textarea
                  value={checkInObs}
                  onChange={(e) => setCheckInObs(e.target.value)}
                  className="w-full text-sm bg-[#F8FAFC] border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 outline-none min-h-[80px] transition-all font-medium"
                  placeholder="Descreva eventuais problemas visíveis no carro ou observações sobre o clima, pneus, etc (opcional)"
                />
              </div>
            </div>

            {/* Form actions and alerts */}
            {errorMsg && (
              <div className="bg-red-50 border border-red-150 text-red-650 text-xs font-semibold px-4 py-3 rounded-xl">
                ⚠️ {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="bg-[#EEF2FF] border border-blue-100 text-blue-900 text-xs font-semibold px-4 py-3 rounded-xl animate-fade-in">
                🎉 {successMsg}
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={availableVehicles.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm active:scale-95 select-none text-sm disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                {selectedSchedule ? 'Iniciar Viagem Programada (Check-In)' : 'Iniciar Saída (Fazer Check-In)'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
        </div>
      ) : (
        /* --- VIEW B: REALIZAR CHECK-OUT (CONCLUIR VIAGEM) --- */
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm animate-fade-in space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 font-display">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              2. Check-Out e Encerramento de Viagem
            </h3>
            <p className="text-sm text-slate-550 mt-0.5 font-medium">Informe os dados de recebimento do veículo ao finalizar o percurso.</p>
          </div>

          <div className="bg-[#EEF2FF] rounded-3xl p-5 border border-blue-100 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase font-bold text-blue-500 block tracking-wider font-mono">Veículo do Trajeto</span>
              <p className="text-sm font-bold text-blue-900 leading-tight">{activeTrip.vehicleModelPlate}</p>
              {activeTrip.complementVehicleModelPlate && (
                <p className="text-xs font-bold text-indigo-700 leading-tight pt-1">
                  + Complemento: {activeTrip.complementVehicleModelPlate}
                </p>
              )}
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase font-bold text-blue-500 block tracking-wider font-mono">Rota (Origem / Destino)</span>
              <div className="text-xs font-bold text-blue-900 leading-tight space-y-0.5">
                <p className="flex items-center gap-1">
                  <span className="text-slate-400 font-medium font-mono text-[9px] uppercase">Origem:</span> 
                  {activeTrip.checkIn.origin || 'Escritório Central'} 
                  <span className="text-blue-700 font-semibold text-[11px]">
                    ({activeTrip.originCity || activeTrip.checkIn.originCity || 'Palmas'}
                    {(activeTrip.originState || activeTrip.checkIn.originState) ? `/${activeTrip.originState || activeTrip.checkIn.originState}` : '/TO'})
                  </span>
                </p>
                <p className="flex items-center gap-1">
                  <span className="text-blue-600 font-medium font-mono text-[9px] uppercase">Destino:</span> 
                  {activeTrip.checkIn.destination} 
                  <span className="text-emerald-700 font-semibold text-[11px]">
                    ({activeTrip.destinationCity || activeTrip.checkIn.destinationCity || 'Não informado'}
                    {(activeTrip.destinationState || activeTrip.checkIn.destinationState) ? `/${activeTrip.destinationState || activeTrip.checkIn.destinationState}` : ''})
                  </span>
                </p>
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase font-bold text-blue-500 block tracking-wider font-mono">Início das Atividades</span>
              <p className="text-sm font-bold text-blue-900 leading-tight">
                {new Date(activeTrip.checkIn.time).toLocaleDateString('pt-BR')} às {new Date(activeTrip.checkIn.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {activeTrip.plannedSnapshot && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <CalendarRange className="w-4 h-4 text-blue-600" />
                <span>Viagem Vinculada à Programação Logística</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-600">
                <div>
                  <span className="font-semibold text-slate-800">Programado:</span>{' '}
                  {activeTrip.plannedSnapshot.vehicleModelPlate}
                  {activeTrip.plannedSnapshot.complementVehicleModelPlate
                    ? ` + ${activeTrip.plannedSnapshot.complementVehicleModelPlate}`
                    : ''}
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Destino Previsto:</span>{' '}
                  {activeTrip.plannedSnapshot.workName || activeTrip.plannedSnapshot.destinationLabel} ({activeTrip.plannedSnapshot.destinationCity}/{activeTrip.plannedSnapshot.destinationState})
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Janela Prevista:</span>{' '}
                  {formatIsoDateToBR(activeTrip.plannedSnapshot.startDate)} a {formatIsoDateToBR(activeTrip.plannedSnapshot.endDate)}
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Ao finalizar com Check-Out, o comparativo completo entre Programado × Executado ficará disponível em Relatórios de Viagens.
              </p>
            </div>
          )}

          <form id="checkout_trip_form" onSubmit={handleCheckOutSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Check-in starting Km summary and checkout final Km input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">Odômetro Final (Km) *</label>
                <div className="relative">
                  <Gauge className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="number"
                    value={checkOutKm}
                    onChange={(e) => setCheckOutKm(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                    className="w-full pl-10 pr-4 py-3 text-sm bg-[#F8FAFC] border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all font-mono"
                    placeholder="Quilometragem final do painel"
                    required
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
                  <span>Partida: <strong>{activeTrip.checkIn.km.toLocaleString()} km</strong></span>
                  {checkOutKm !== '' && Number(checkOutKm) >= activeTrip.checkIn.km && (
                    <span className="text-blue-650 font-bold">Diferença: +{(Number(checkOutKm) - activeTrip.checkIn.km).toLocaleString()} km</span>
                  )}
                </div>
              </div>

              {/* Return Fuel Level */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">Nível do Combustível de Retorno *</label>
                <div className="flex gap-2 p-1.5 bg-[#F8FAFC] border border-slate-150 rounded-xl">
                  {['Vazio', '1/4', '1/2', '3/4', 'Cheio'].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setCheckOutFuel(level)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        checkOutFuel === level
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-950 hover:bg-slate-250/20'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

               {/* Return observations */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">Observações Finais de Entrega</label>
                <textarea
                  value={checkOutObs}
                  onChange={(e) => setCheckOutObs(e.target.value)}
                  className="w-full text-sm bg-[#F8FAFC] border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 outline-none min-h-[80px] transition-all font-medium"
                  placeholder="Descreva se abasteceu, se percebeu algum problema no carro ou quaisquer incidentes no trânsito (opcional)"
                />
              </div>
            </div>

            {/* Error alerts */}
            {errorMsg && (
              <div className="bg-red-50 border border-red-150 text-red-650 text-xs font-semibold px-4 py-3 rounded-xl font-medium">
                ⚠️ {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="bg-[#EEF2FF] border border-blue-100 text-blue-900 text-xs font-semibold px-4 py-3 rounded-xl font-medium animate-fade-in">
                🎉 {successMsg}
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0F172A] hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 text-sm cursor-pointer"
              >
                Encerrar Viagem (Fazer Check-Out)
                <CheckCircle className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
export default DriverTrips;
