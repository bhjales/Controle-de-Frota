import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, Navigation, MapPin, Compass, AlertCircle, Camera as CameraIcon, Fuel, Calendar, Gauge, FileText, ArrowRight, Hourglass } from 'lucide-react';
import { Vehicle, Trip, User, ConstructionWork } from '../types';
import { FleetStore } from '../store/fleetStore';
import { CameraModal } from './CameraModal';

interface DriverTripsProps {
  vehicles: Vehicle[];
  trips: Trip[];
  currentUser: User | null;
  store: FleetStore;
  works: ConstructionWork[];
}

export function DriverTrips({ vehicles, trips, currentUser, store, works = [] }: DriverTripsProps) {
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

  // --- CHECK-IN FORM STATES ---
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [checkInKm, setCheckInKm] = useState<number | ''>('');
  const [checkInFuel, setCheckInFuel] = useState('1/2');
  const [selectedWorkId, setSelectedWorkId] = useState('');
  const [origin, setOrigin] = useState('Garagem Central (Geral)');
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');
  const [checkInObs, setCheckInObs] = useState('');
  const [checkInPhoto, setCheckInPhoto] = useState('');
  
  // --- CHECK-OUT FORM STATES ---
  const [checkOutKm, setCheckOutKm] = useState<number | ''>('');
  const [checkOutFuel, setCheckOutFuel] = useState('1/2');
  const [checkOutObs, setCheckOutObs] = useState('');
  const [checkOutPhoto, setCheckOutPhoto] = useState('');

  // --- CAMERA MODAL STATE ---
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraModalTitle, setCameraModalTitle] = useState('');
  const [photoTarget, setPhotoTarget] = useState<'checkin' | 'checkout' | null>(null);

  // --- GENERAL RESPONSE FEEDBACK ---
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Pre-fill Km and Admin pre-allocation when vehicle changes
  useEffect(() => {
    if (selectedVehicleId) {
      const veh = vehicles.find(v => v.id === selectedVehicleId);
      if (veh) {
        setCheckInKm(veh.currentKm);
        if (veh.workId) {
          setSelectedWorkId(veh.workId);
          const matchedWork = works.find(w => w.id === veh.workId);
          if (matchedWork) {
            setOrigin(`${matchedWork.name} (${matchedWork.city} - ${matchedWork.state})`);
            setDestination(''); // Driver will fill in manually
            setReason(`Transporte saindo de obra: ${matchedWork.name}`);
          } else {
            setOrigin('Garagem Central (Geral)');
            setDestination('');
            setReason('');
          }
        } else {
          setSelectedWorkId('');
          setOrigin('Garagem Central (Geral)');
          setDestination('');
          setReason('');
        }
      }
    } else {
      setCheckInKm('');
      setSelectedWorkId('');
      setOrigin('Garagem Central (Geral)');
      setDestination('');
      setReason('');
    }
    setErrorMsg('');
  }, [selectedVehicleId, vehicles, works]);

  // Pre-fill checkout Km with active trip initial Km + 10 (reasonable guess)
  useEffect(() => {
    if (activeTrip) {
      setCheckOutKm(activeTrip.checkIn.km + 20); // reasonable guess helper
    } else {
      setCheckOutKm('');
    }
  }, [activeTrip]);

  const openCameraModal = (target: 'checkin' | 'checkout', title: string) => {
    setPhotoTarget(target);
    setCameraModalTitle(title);
    setCameraModalOpen(true);
  };

  const handleCapturePhoto = (base64Data: string) => {
    if (photoTarget === 'checkin') {
      setCheckInPhoto(base64Data);
    } else if (photoTarget === 'checkout') {
      setCheckOutPhoto(base64Data);
    }
  };

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
    if (!destination.trim()) {
      setErrorMsg('Por favor, defina um destino.');
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('Por favor, informe o motivo da sua viagem.');
      return;
    }
    if (!checkInPhoto) {
      setErrorMsg('Fotografia do hodômetro é item obrigatório para auditar check-in.');
      return;
    }

    const res = store.checkInTrip(selectedVehicleId, {
      km: Number(checkInKm),
      fuel: checkInFuel,
      origin: origin.trim(),
      destination: destination.trim(),
      reason: reason.trim(),
      observations: checkInObs.trim(),
      photo: checkInPhoto
    }, selectedWorkId || undefined);

    if (res.success) {
      setSuccessMsg(res.message);
      // Reset CheckIn states
      setSelectedVehicleId('');
      setCheckInKm('');
      setCheckInFuel('1/2');
      setSelectedWorkId('');
      setOrigin('Garagem Central (Geral)');
      setDestination('');
      setReason('');
      setCheckInObs('');
      setCheckInPhoto('');
      
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
    if (!checkOutPhoto) {
      setErrorMsg('Adicione a foto comprovante do painel/veículo para checkout.');
      return;
    }

    const res = store.checkOutTrip(activeTrip.id, {
      km: Number(checkOutKm),
      fuel: checkOutFuel,
      observations: checkOutObs.trim(),
      photo: checkOutPhoto
    });

    if (res.success) {
      setSuccessMsg(res.message);
      // Reset Checkout states
      setCheckOutKm('');
      setCheckOutFuel('1/2');
      setCheckOutObs('');
      setCheckOutPhoto('');
      
      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } else {
      setErrorMsg(res.message);
    }
  };

  const availableVehicles = vehicles.filter(v => v.status === 'available' && (currentUser?.role === 'admin' || currentUser?.authorizedAssetIds?.includes(v.id)));

  return (
    <div id="driver_trips_view" className="space-y-6">
      {/* Dynamic Trip Stage Selector Header */}
      <div className="bg-[#0F172A] text-white rounded-3xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[9px] font-bold tracking-wider font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-md">
            {activeTrip ? 'ESTÁGIO ATIVO: VIAGEM EM CURSO' : 'ESTÁGIO LIVRE: PRONTO PARA TRABALHAR'}
          </span>
          <h2 className="text-xl font-bold tracking-tight pt-1 font-display">Módulo de Gestão de Viagem</h2>
          <p className="text-xs text-slate-300">Faça o check-in fotográfico ao pegar um carro e o check-out ao devolvê-lo.</p>
        </div>
        
        {activeTrip && (
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3 text-xs flex items-center gap-3 animate-pulse shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-450 block shrink-0"></span>
            <div>
              <p className="font-semibold text-slate-250">Veículo Alocado Atualmente:</p>
              <p className="font-mono text-[11px] text-blue-400">{activeTrip.vehicleModelPlate}</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Form container based on trip state */}
      {!activeTrip ? (
        /* --- VIEW A: REALIZAR CHECK-IN (INICIAR VIAGEM) --- */
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm animate-fade-in space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 font-display">
              <Play className="w-5 h-5 text-blue-600 animate-pulse" />
              1. Check-In de Nova Saída de Veículo
            </h3>
            <p className="text-sm text-slate-550 mt-0.5 font-medium">Preencha os dados de saída do veículo antes de partir nas rodovias.</p>
          </div>

          <form id="checkin_trip_form" onSubmit={handleCheckInSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Vehicle Selection Block */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">Selecione o Veículo Disponível *</label>
                {availableVehicles.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Nenhum carro disponível no pátio atualmente. Todos estão em uso ou em manutenção. Solicite a liberação de um veículo a um Admin.</span>
                  </div>
                ) : (
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
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

              {/* Origin of the trip */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">Origem da Viagem *</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all font-semibold text-slate-600"
                    placeholder="Ex: Garagem Central"
                    required
                  />
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">Obra pré-alocada pelo gestor, ou ponto de partida customizado.</p>
              </div>

              {/* Destination */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">Destino Planejado *</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm bg-[#F8FAFC] border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all font-medium animate-none"
                    placeholder="Ex: Filial Bauru ou Cliente X"
                    required
                  />
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">Indique para onde este veículo se deslocará.</p>
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

              {/* Camera snap of Odometer - REQUIREMENT */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">Foto do Hodômetro (Obrigatório) *</label>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#F8FAFC] p-4 rounded-xl border border-slate-200">
                  {checkInPhoto ? (
                    <div className="relative w-36 aspect-video bg-black rounded-lg overflow-hidden border border-blue-500 shrink-0">
                      <img src={checkInPhoto} alt="Comprovante de Hodômetro" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setCheckInPhoto('')}
                        className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold"
                      >
                        Substituir Foto
                      </button>
                    </div>
                  ) : (
                    <div className="w-36 aspect-video bg-slate-200 border border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 shrink-0 select-none">
                      <FileText className="w-6 h-6 mb-1" />
                      <span className="text-[9px] font-mono tracking-wider">MÍDIA AUSENTE</span>
                    </div>
                  )}

                  <div className="text-center sm:text-left flex-1 space-y-2">
                    <p className="text-xs font-bold text-slate-800">Forneça o comprovante fotográfico do painel</p>
                    <p className="text-xs text-slate-500">Capture o painel com km visível para evitar glosas no faturamento ou fraudes.</p>
                    
                    <button
                      type="button"
                      onClick={() => openCameraModal('checkin', 'Foto do Hodômetro de Saída')}
                      className="inline-flex items-center gap-1.5 px-4.5 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer transition-all shadow-sm active:scale-95"
                    >
                      <CameraIcon className="w-4 h-4" />
                      {checkInPhoto ? 'Alterar Foto' : 'Capturar Foto do Painel'}
                    </button>
                  </div>
                </div>
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
                Iniciar Saída (Fazer Check-In)
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* --- VIEW B: REALIZAR CHECK-OUT (CONCLUIR VIAGEM) --- */
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm animate-fade-in space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 font-display">
              <CheckCircle className="w-5 h-5 text-blue-600 animate-pulse" />
              2. Check-Out e Encerramento de Viagem
            </h3>
            <p className="text-sm text-slate-550 mt-0.5 font-medium">Informe os dados de recebimento do veículo ao finalizar o percurso.</p>
          </div>

          <div className="bg-[#EEF2FF] rounded-3xl p-5 border border-blue-100 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase font-bold text-blue-500 block tracking-wider font-mono">Veículo do Trajeto</span>
              <p className="text-sm font-bold text-blue-900 leading-tight">{activeTrip.vehicleModelPlate}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase font-bold text-blue-500 block tracking-wider font-mono">Rota (Origem / Destino)</span>
              <div className="text-xs font-bold text-blue-900 leading-tight space-y-0.5">
                <p className="flex items-center gap-1"><span className="text-slate-400 font-medium font-mono text-[9px] uppercase">Origem:</span> {activeTrip.checkIn.origin || 'Garagem Central'}</p>
                <p className="flex items-center gap-1"><span className="text-blue-600 font-medium font-mono text-[9px] uppercase">Destino:</span> {activeTrip.checkIn.destination}</p>
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase font-bold text-blue-500 block tracking-wider font-mono">Início das Atividades</span>
              <p className="text-sm font-bold text-blue-900 leading-tight">
                {new Date(activeTrip.checkIn.time).toLocaleDateString('pt-BR')} às {new Date(activeTrip.checkIn.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

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

              {/* Photo check for checkout */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Foto do Estado do Carro / Odômetro (Checkout) *</label>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {checkOutPhoto ? (
                    <div className="relative w-36 aspect-video bg-black rounded-lg overflow-hidden border border-indigo-500 shrink-0">
                      <img src={checkOutPhoto} alt="Comprovante de Checkout" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setCheckOutPhoto('')}
                        className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold"
                      >
                        Substituir Foto
                      </button>
                    </div>
                  ) : (
                    <div className="w-36 aspect-video bg-slate-200 border border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 shrink-0 select-none">
                      <FileText className="w-6 h-6 mb-1" />
                      <span className="text-[9px] font-mono tracking-wider">MÍDIA AUSENTE</span>
                    </div>
                  )}

                  <div className="text-center sm:text-left flex-1 space-y-2">
                    <p className="text-xs font-bold text-slate-800">Submeta fotos de comprovação na finalização</p>
                    <p className="text-xs text-slate-500 font-medium">Fotografe o hodômetro final para arquivamento ou eventuais danos no automóvel.</p>
                    
                    <button
                      type="button"
                      onClick={() => openCameraModal('checkout', 'Foto do Painel de Checkout')}
                      className="inline-flex items-center gap-1.5 px-4.5 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer transition-all shadow-sm active:scale-95"
                    >
                      <CameraIcon className="w-4 h-4" />
                      {checkOutPhoto ? 'Alterar Foto' : 'Capturar Foto do Painel'}
                    </button>
                  </div>
                </div>
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

      {/* Camera Capture Dialog */}
      <CameraModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={handleCapturePhoto}
        title={cameraModalTitle}
      />
    </div>
  );
}
export default DriverTrips;
