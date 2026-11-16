import React, { useState } from 'react';
import { Search, MapPin, Calendar, Clock, Gauge, Fuel, Eye, Film, Trash2, CheckCircle, Navigation, Info, TrendingUp, Compass, Award, Hourglass } from 'lucide-react';
import { Trip, User, ConstructionWork } from '../types';
import { FleetStore } from '../store/fleetStore';
import L from 'leaflet';

interface TripHistoryProps {
  trips: Trip[];
  currentUser: User | null;
  store: FleetStore;
}

export function TripHistory({ trips, currentUser, store }: TripHistoryProps) {
  const [search, setSearch] = useState('');
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);

  const handleDeleteTrip = (tripId: string) => {
    const isConfirmed = window.confirm('Deseja excluir este registro de viagem? O veículo associado retornará ao pátio.');
    if (isConfirmed) {
      store.deleteTrip(tripId);
    }
  };

  // Filter based on credentials (Drivers only see their personal trips, Admin sees everything)
  const isDriver = currentUser?.role === 'driver';
  
  const accessibleTrips = trips.filter(t => {
    if (isDriver) {
      return t.driverId === currentUser?.id;
    }
    return true; // Admin views all records
  });

  // Filter based on search input and sort by date descending
  const filteredTrips = accessibleTrips.filter(t => {
    const query = search.toLowerCase();
    return (
      t.driverName.toLowerCase().includes(query) ||
      t.vehicleModelPlate.toLowerCase().includes(query) ||
      t.checkIn.destination.toLowerCase().includes(query) ||
      t.checkIn.reason.toLowerCase().includes(query)
    );
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // --- STATS ACCUMULATORS ---
  const completedTrips = accessibleTrips.filter(t => t.status === 'completed');
  const activeTripsCount = accessibleTrips.filter(t => t.status === 'active').length;
  
  // Sum up Kms Rodados
  const totalKmDriven = completedTrips.reduce((acc, t) => acc + (t.kmDriven || 0), 0);
  const avgKmPerTrip = completedTrips.length > 0 ? Math.round(totalKmDriven / completedTrips.length) : 0;

  return (
    <div id="trip_history_view" className="space-y-6">
      
      {/* 📊 Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between min-h-[130px] shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">Quilometragem Coletiva</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Award className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-900 font-display tracking-tight leading-none">{totalKmDriven.toLocaleString()} km</p>
            <span className="text-[10px] text-slate-500 block mt-1">Total acumulado consolidado</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between min-h-[130px] shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">Viagens Concluídas</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-900 font-display tracking-tight leading-none">{completedTrips.length}</p>
            <span className="text-[10px] text-slate-500 block mt-1">Com checkout finalizado</span>
          </div>
        </div>

        <div className="bg-[#EEF2FF] border border-blue-100 rounded-3xl p-6 flex flex-col justify-between min-h-[130px] shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider font-mono">Em Andamento</span>
            <div className="p-2 bg-blue-600 text-white rounded-xl">
              <Hourglass className="w-4.5 h-4.5 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-[#0F172A] font-display tracking-tight leading-none">{activeTripsCount}</p>
            <span className="text-[10px] text-blue-700 block mt-1">Carros rodando nas estradas</span>
          </div>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 flex flex-col justify-between min-h-[130px] shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">Média por Viagem</span>
            <div className="p-2 bg-slate-800 text-slate-200 rounded-xl">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-white font-display tracking-tight leading-none">{avgKmPerTrip} km</p>
            <span className="text-[10px] text-slate-400 block mt-1">Eficiência média de rotas</span>
          </div>
        </div>
      </div>

      {/* 🗺️ Interactive Route Map based on Work and Trip Cities */}
      <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-slate-800 rounded-3xl p-6 text-white shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-2xl text-blue-400">
              <Compass className="w-6 h-6 animate-spin" style={{ animationDuration: '20s' }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2 font-display">
                Mapa de Rotas e Itinerários por Cidades (Obras)
              </h3>
              <p className="text-xs text-slate-400">Visualização geográfica e conexões de rotas entre a Base e os canteiros de obras.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              {store.works.length} Cidades de Obras Integradas
            </span>
            <button
              onClick={() => setShowMap(!showMap)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all border border-slate-700 cursor-pointer"
            >
              {showMap ? 'Ocultar Mapa' : 'Exibir Mapa'}
            </button>
          </div>
        </div>

        {showMap && (
          <div className="space-y-4">
            {/* Real Leaflet Map */}
            <LeafletRouteMap works={store.works} />

            {/* Quick Route List / Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 text-xs space-y-1 font-mono">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Total de Destinos Atendidos</span>
                <span className="text-lg font-black text-white">{store.works.length} Cidades / Obras</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 text-xs space-y-1 font-mono">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Quilometragem Mapeada</span>
                <span className="text-lg font-black text-emerald-400">{totalKmDriven.toLocaleString()} km rodados</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 text-xs space-y-1 font-mono">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Status do Sistema de Rotas</span>
                <span className="text-lg font-black text-blue-400">🟢 Sincronizado</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Panel */}
      <div className="space-y-4">
        {/* Banner with filters */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 font-display">
              📂 Histórico Geral de Movimentação
            </h3>
            <p className="text-xs text-slate-500">
              {isDriver ? 'Mostrando suas movimentações individuais registradas.' : 'Registro unificado de todos os itinerários da frota.'}
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filtrar por motorista, veículo ou destino..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#F8FAFC] hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all font-medium"
            />
          </div>
        </div>

        {/* Trips registry */}
        {filteredTrips.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-550 shadow-sm">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-pulse" />
            <p className="font-bold text-slate-800 font-display">Nenhuma viagem registrada</p>
            <p className="text-xs text-slate-450 max-w-sm mx-auto mt-1">Você ainda não realizou percursos ou não há correspondentes para os filtros inseridos.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTrips.map((trip) => {
              const isCompleted = trip.status === 'completed';

              return (
                <div
                  key={trip.id}
                  className={`bg-white border rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden ${
                    isCompleted ? 'border-slate-200' : 'border-blue-200 bg-blue-50/5'
                  }`}
                >
                  {/* Status left ribbon */}
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${isCompleted ? 'bg-slate-300' : 'bg-blue-600'}`} />

                  {/* Header / Info Row */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="space-y-1 pl-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[9px] text-slate-400 uppercase font-bold tracking-wider">TICKET: {trip.id.replace('trip-', '').toUpperCase()}</span>
                        {!isCompleted && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-50/70 text-blue-600 border border-blue-100 uppercase tracking-wide">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-650 block animate-ping"></span>
                            Em Trânsito
                          </span>
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wide">
                            Finalizado
                          </span>
                        )}
                      </div>
                      
                      <h4 className="text-base font-bold text-slate-900 leading-tight">
                        <span className="text-slate-400 font-medium">Veículo:</span> {trip.vehicleModelPlate}
                      </h4>
                      {!isDriver && (
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                          👤 <strong className="text-slate-700">{trip.driverName}</strong> <span className="text-slate-300">•</span> {trip.driverEmail}
                        </p>
                      )}
                    </div>

                    {/* Km driven badge */}
                    {isCompleted && (
                      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl px-4 py-2.5 text-right shrink-0">
                        <span className="text-[9px] uppercase font-bold text-emerald-800 tracking-wider block font-mono">Trecho Rodado</span>
                        <p className="text-lg font-bold text-emerald-950 font-mono leading-none mt-0.5">+{trip.kmDriven} km</p>
                      </div>
                    )}
                  </div>

                  {/* Route badge showing origin -> destination city */}
                  <div className="mt-4 mx-2 bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                        <MapPin className="w-3.5 h-3.5" />
                      </span>
                      <span>Rota: <strong className="text-slate-900">Base Central (Sede)</strong> ➔ <strong className="text-blue-600">{trip.checkIn.destination}</strong></span>
                    </div>
                    {trip.workName && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
                        Obra: {trip.workName}
                      </span>
                    )}
                  </div>

                  {/* Body Layout: CHECK-IN on Left, CHECK-OUT on Right (if completed) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 pl-2">
                    
                    {/* Check In Column */}
                    <div className="space-y-3.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-650 text-white flex items-center justify-center text-[10px] font-bold">I</span>
                        <h5 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Dados do Check-In</h5>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="col-span-2 space-y-0.5">
                          <span className="text-slate-400 block font-semibold text-[10px] uppercase">Data / Horário de Início</span>
                          <p className="text-slate-850 font-bold flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                            {new Date(trip.createdAt).toLocaleDateString('pt-BR')} às {new Date(trip.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-slate-400 block font-semibold text-[10px] uppercase">Quilometragem Inicial</span>
                          <p className="font-mono text-slate-800 font-bold flex items-center gap-1">
                            <Gauge className="w-3.5 h-3.5 text-slate-450" />
                            {trip.checkIn.km.toLocaleString()} km
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-slate-400 block font-semibold text-[10px] uppercase">Combustível Partida</span>
                          <p className="text-slate-800 font-bold flex items-center gap-1">
                            <Fuel className="w-3.5 h-3.5 text-slate-455" />
                            {trip.checkIn.fuel}
                          </p>
                        </div>
                        <div className="col-span-2 grid grid-cols-2 gap-3 bg-slate-50/70 border border-slate-200/50 p-2.5 rounded-xl">
                          <div className="space-y-0.5">
                            <span className="text-slate-400 block font-bold text-[9px] uppercase font-mono tracking-wider">Início / Origem</span>
                            <p className="text-slate-850 font-bold text-[11px] flex items-center gap-1 leading-tight">
                              <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span>{trip.checkIn.origin || 'Garagem Central'}</span>
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-slate-400 block font-bold text-[9px] uppercase font-mono tracking-wider">Fim / Destino</span>
                            <p className="text-slate-855 font-bold text-[11px] flex items-center gap-1 leading-tight">
                              <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              <span>{trip.checkIn.destination}</span>
                            </p>
                          </div>
                        </div>
                        <div className="col-span-2 space-y-0.5">
                          <span className="text-slate-400 block font-semibold text-[10px] uppercase">Finalidade da Saída</span>
                          <p className="text-slate-800 font-medium italic text-xs leading-relaxed flex items-start gap-1">
                            <Compass className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{trip.checkIn.reason}</span>
                          </p>
                        </div>
                      </div>

                      {/* Observations */}
                      {trip.checkIn.observations && (
                        <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-xs space-y-1">
                          <span className="font-bold text-[10px] text-slate-400 uppercase">Observações do Motorista:</span>
                          <p className="text-slate-650 leading-relaxed font-medium">{trip.checkIn.observations}</p>
                        </div>
                      )}

                      {/* Photo Thumbnail */}
                      {trip.checkIn.photo && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Foto do Painel (Check-in):</span>
                          <button
                            onClick={() => setActivePhoto(trip.checkIn.photo)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100 hover:scale-103 transition-all cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            Visualizar Mídia
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Check Out Column */}
                    <div className="space-y-3.5 border-t md:border-t-0 border-dashed border-slate-150 pt-5 md:pt-0">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-950 text-white flex items-center justify-center text-[10px] font-bold">F</span>
                        <h5 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Dados do Check-Out</h5>
                      </div>

                      {isCompleted && trip.checkOut ? (
                        <>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="space-y-0.5">
                              <span className="text-slate-400 block font-semibold text-[10px] uppercase">Quilometragem Final</span>
                              <p className="font-mono text-slate-800 font-bold flex items-center gap-1">
                                <Gauge className="w-3.5 h-3.5 text-slate-450" />
                                {trip.checkOut.km.toLocaleString()} km
                              </p>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-slate-400 block font-semibold text-[10px] uppercase">Combustível Retorno</span>
                              <p className="text-slate-800 font-bold flex items-center gap-1">
                                <Fuel className="w-3.5 h-3.5 text-slate-455" />
                                {trip.checkOut.fuel}
                              </p>
                            </div>
                            <div className="col-span-2 space-y-0.5">
                              <span className="text-slate-400 block font-semibold text-[10px] uppercase">Data / Horário de Encerramento</span>
                              <p className="text-slate-850 font-bold flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                {new Date(trip.checkOut.time).toLocaleDateString('pt-BR')} às {new Date(trip.checkOut.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <div className="col-span-2 space-y-0.5">
                              <span className="text-slate-400 block font-semibold text-[10px] uppercase">Tempo de Viagem</span>
                              <p className="text-slate-850 font-bold flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                                {(() => {
                                  const ms = new Date(trip.checkOut.time).getTime() - new Date(trip.createdAt).getTime();
                                  const h = Math.floor(ms / (1000 * 60 * 60));
                                  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
                                  return h > 0 ? `${h}h ${m}m` : `${m}m`;
                                })()}
                              </p>
                            </div>
                          </div>

                          {/* Observations */}
                          {trip.checkOut.observations && (
                            <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-xs space-y-1">
                              <span className="font-bold text-[10px] text-slate-400 uppercase">Observações da Entrega:</span>
                              <p className="text-slate-650 leading-relaxed font-medium">{trip.checkOut.observations}</p>
                            </div>
                          )}

                          {/* Photo Thumbnail */}
                          {trip.checkOut.photo && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Foto do Painel (Check-out):</span>
                              <button
                                onClick={() => setActivePhoto(trip.checkOut?.photo || null)}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-100 hover:scale-103 transition-all cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                Visualizar Mídia
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="bg-amber-50/50 border border-dashed border-amber-200 rounded-xl p-4 text-center text-amber-900 text-xs flex flex-col items-center justify-center min-h-[140px]">
                          <Hourglass className="w-7 h-7 text-amber-500 mb-1.5 animate-spin" />
                          <p className="font-bold">Aguardando Retorno do Veículo</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">O motorista deverá preencher o checkout do veículo ao retornar para registrar a medição final.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin Options */}
                  {currentUser?.role === 'admin' && (
                    <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => handleDeleteTrip(trip.id)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-red-650 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-all"
                        title="Limpar log do histórico"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remover Registro
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Popover Photo lightbox Modal */}
      {activePhoto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-[60] flex items-center justify-center p-4" onClick={() => setActivePhoto(null)}>
          <div className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-2 animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <img src={activePhoto} alt="Zoom Audit" className="w-full h-auto aspect-video object-contain rounded-xl" />
            <div className="p-3 text-center">
              <span className="text-[10px] font-mono tracking-wider font-bold text-emerald-400 uppercase">DOCUMENTAÇÃO COMPROVATÓRIA DE REGISTRO</span>
              <button
                onClick={() => setActivePhoto(null)}
                className="mt-2 block mx-auto text-xs font-bold text-white bg-slate-850 hover:bg-slate-800 px-4 py-2 rounded-lg"
              >
                Fechar Imagem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
};

const stateCenters: Record<string, [number, number]> = {
  'sp': [-23.5505, -46.6333],
  'rj': [-22.9068, -43.1729],
  'mg': [-19.9167, -43.9345],
  'rs': [-30.0346, -51.2177],
  'pr': [-25.4284, -49.2733],
  'sc': [-27.5954, -48.5480],
  'ba': [-12.9714, -38.5014],
  'pe': [-8.0476, -34.8770],
  'ce': [-3.7172, -38.5433],
  'df': [-15.7801, -47.9292],
  'go': [-16.6864, -49.2643],
  'es': [-20.3155, -40.3128],
  'mt': [-15.6014, -56.0979],
  'ms': [-20.4697, -54.6201],
  'am': [-3.1190, -60.0217],
  'pa': [-1.4558, -48.4902],
  'ma': [-2.5387, -44.2829],
  'pi': [-5.0919, -42.8034],
  'rn': [-5.7945, -35.2110],
  'pb': [-7.1195, -34.8450],
  'al': [-9.6658, -35.7353],
  'se': [-10.9472, -37.0731],
  'to': [-10.184, -48.3336],
  'ro': [-8.7619, -63.9039],
  'ac': [-9.9749, -67.8243],
  'ap': [0.0389, -51.0664],
  'rr': [2.8195, -60.6733],
};

async function resolveCityCoordinates(city: string, state: string): Promise<[number, number]> {
  const cleanCity = (city || '').trim().toLowerCase();
  const cleanState = (state || '').trim().toLowerCase();
  
  if (cityCoordsCache[cleanCity]) {
    return cityCoordsCache[cleanCity];
  }

  try {
    const query = `${city}, ${state}, Brazil`;
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
      headers: { 'Accept-Language': 'pt-BR' }
    });
    const data = await res.json();
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      cityCoordsCache[cleanCity] = [lat, lon];
      return [lat, lon];
    }
  } catch (err) {
    console.warn('Geocoding fetch failed for:', city, state, err);
  }

  if (stateCenters[cleanState]) {
    return stateCenters[cleanState];
  }

  return [-23.5505, -46.6333];
}

function LeafletRouteMap({ works }: { works: ConstructionWork[] }) {
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
    L.marker(hqCoord).addTo(map).bindPopup('<b>Escritório Central - Palmas/TO</b>');

    let isMounted = true;

    async function loadMarkers() {
      const latLngs: [number, number][] = [hqCoord];

      for (const work of works) {
        if (!isMounted) break;
        const coord = await resolveCityCoordinates(work.city, work.state);
        latLngs.push(coord);

        const marker = L.marker(coord).addTo(map);
        marker.bindPopup(`<b>Obra: ${work.name}</b><br/>📍 ${work.city} - ${work.state}`);

        L.polyline([hqCoord, coord], {
          color: '#2563eb',
          weight: 3,
          opacity: 0.7,
          dashArray: '5, 10'
        }).addTo(map);
      }

      if (isMounted && latLngs.length > 1) {
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [50, 50] });
      }

      setTimeout(() => {
        map.invalidateSize();
      }, 300);
    }

    loadMarkers();

    return () => {
      isMounted = false;
    };
  }, [works]);

  return (
    <div className="w-full h-[380px] rounded-2xl overflow-hidden border border-slate-700 shadow-inner relative z-10">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}

export default TripHistory;
