import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Clock, 
  Gauge, 
  Fuel, 
  Eye, 
  Film, 
  Trash2, 
  CheckCircle, 
  CheckCircle2,
  Navigation, 
  Info, 
  TrendingUp, 
  Compass, 
  Award, 
  Hourglass,
  FileText,
  Download,
  Filter,
  RotateCcw,
  FileSpreadsheet,
  Car,
  Building2,
  AlertCircle,
  X
} from 'lucide-react';
import { Trip, User } from '../types';
import { FleetStore } from '../store/fleetStore';
import { exportTripReportPDF, exportTripsConsolidatedCSV, getFilteredTripData } from '../utils/tripReports';
import { LeafletRouteMap } from './LeafletRouteMap';

interface TripHistoryProps {
  trips: Trip[];
  currentUser: User | null;
  store: FleetStore;
}

export function TripHistory({ trips, currentUser, store }: TripHistoryProps) {
  const [search, setSearch] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [selectedWork, setSelectedWork] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'active'>('all');
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 5000);
  };

  const handleDeleteTrip = (tripId: string) => {
    const isConfirmed = window.confirm('Deseja excluir este registro de viagem? O veículo associado retornará ao pátio.');
    if (isConfirmed) {
      store.deleteTrip(tripId);
    }
  };

  // Filter based on credentials (Drivers only see their personal trips, Admin/Gerencial sees everything)
  const isDriver = currentUser?.role === 'driver';
  
  const accessibleTrips = trips.filter(t => {
    if (isDriver) {
      return t.driverId === currentUser?.id;
    }
    return true; // Admin views all records
  });

  // Filter based on Vehicle, Work, Period, Status, Search
  const filteredTrips = getFilteredTripData({
    trips: accessibleTrips,
    works: store.works,
    vehicles: store.vehicles,
    currentUser,
    selectedVehicleId: selectedVehicle,
    selectedWorkId: selectedWork,
    startDate,
    endDate,
    statusFilter,
    searchQuery: search
  });

  // --- STATS ACCUMULATORS ---
  const completedTrips = filteredTrips.filter(t => t.status === 'completed');
  const activeTripsCount = filteredTrips.filter(t => t.status === 'active').length;
  
  // Sum up Kms Rodados
  const totalKmDriven = completedTrips.reduce((acc, t) => acc + (t.kmDriven || 0), 0);
  const avgKmPerTrip = completedTrips.length > 0 ? Math.round(totalKmDriven / completedTrips.length) : 0;

  // Export handlers
  const handleExportPDF = () => {
    try {
      setIsExporting(true);
      exportTripReportPDF({
        trips: accessibleTrips,
        works: store.works,
        vehicles: store.vehicles,
        currentUser,
        selectedVehicleId: selectedVehicle,
        selectedWorkId: selectedWork,
        startDate,
        endDate,
        statusFilter,
        searchQuery: search
      });
      showNotification('success', 'Relatório gerencial de viagens em PDF exportado com sucesso!');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Erro ao gerar o relatório de viagens em PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    try {
      exportTripsConsolidatedCSV({
        trips: accessibleTrips,
        works: store.works,
        vehicles: store.vehicles,
        currentUser,
        selectedVehicleId: selectedVehicle,
        selectedWorkId: selectedWork,
        startDate,
        endDate,
        statusFilter,
        searchQuery: search
      });
      showNotification('success', 'Planilha detalhada de viagens exportada com sucesso!');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Erro ao exportar a planilha CSV.');
    }
  };

  const handlePresetDate = (days: number) => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const start = new Date();
    start.setDate(today.getDate() - days);
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(todayStr);
  };

  const handleThisMonth = () => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().slice(0, 10));
    setEndDate(todayStr);
  };

  const handleClearFilters = () => {
    setSelectedVehicle('all');
    setSelectedWork('all');
    setStartDate('');
    setEndDate('');
    setStatusFilter('all');
    setSearch('');
  };

  const hasActiveFilters = selectedVehicle !== 'all' || selectedWork !== 'all' || !!startDate || !!endDate || statusFilter !== 'all' || !!search;

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
            <LeafletRouteMap works={store.works} trips={filteredTrips} />

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

      {/* Global Feedback notification */}
      {feedback && (
        <div className={`p-4 rounded-2xl flex items-center justify-between border shadow-sm transition-all duration-300 ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="text-xs font-semibold">{feedback.message}</span>
          </div>
          <button 
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 📄 Central de Relatórios de Viagens (PDF & Filtros Operacionais) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <FileText className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold text-slate-900 font-display">
                Central de Relatórios de Viagens (Exportação PDF)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Filtre viagens por veículo, canteiro de obra e período cronológico para emitir relatórios executivos auditados em PDF.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow cursor-pointer disabled:opacity-50"
              title="Gerar e Baixar Relatório em PDF"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Exportar Relatório PDF ({filteredTrips.length})</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Exportar dados tabulados em CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Planilha CSV</span>
            </button>
          </div>
        </div>

        {/* 🎛️ Filtros Avançados: Veículo, Obra, Período, Status e Busca */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Filtro por Veículo */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Car className="w-3.5 h-3.5 text-blue-600" />
              Filtrar por Veículo
            </label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full text-xs px-3 py-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
            >
              <option value="all">🚗 Todos os Veículos ({store.vehicles.length})</option>
              {store.vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  [{v.plate}] {v.brand} {v.model} ({v.category || 'Geral'})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filtro por Obra */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              Filtrar por Obra
            </label>
            <select
              value={selectedWork}
              onChange={(e) => setSelectedWork(e.target.value)}
              className="w-full text-xs px-3 py-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
            >
              <option value="all">🏗️ Todas as Obras ({store.works.length})</option>
              {store.works.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.city}/{w.state})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Filtro por Status */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
              Status da Viagem
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full text-xs px-3 py-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
            >
              <option value="all">Todos os Status</option>
              <option value="completed">Concluídas (Checkout Realizado)</option>
              <option value="active">Em Trânsito (Rodando Agora)</option>
            </select>
          </div>

          {/* 4. Busca por texto */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              Buscar Condutor / Rota
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ex: Condutor, destino, placa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* 📅 Filtro por Período & Atalhos Rápidos */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-600 font-mono flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              Período:
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none focus:border-blue-500 font-medium"
                title="Data Inicial"
              />
              <span className="text-slate-400 font-mono">até</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none focus:border-blue-500 font-medium"
                title="Data Final"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase font-mono font-bold mr-1">Atalhos:</span>
            <button
              onClick={() => handlePresetDate(0)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              Hoje
            </button>
            <button
              onClick={() => handlePresetDate(7)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              7 Dias
            </button>
            <button
              onClick={() => handlePresetDate(30)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              30 Dias
            </button>
            <button
              onClick={handleThisMonth}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              Este Mês
            </button>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ml-1"
                title="Limpar todos os filtros aplicados"
              >
                <RotateCcw className="w-3 h-3" />
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {/* Badges de filtros ativos */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Filtros aplicados:</span>
            {selectedVehicle !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Veículo: {store.vehicles.find(v => v.id === selectedVehicle)?.plate || selectedVehicle}
                <button onClick={() => setSelectedVehicle('all')} className="hover:text-blue-900 cursor-pointer">×</button>
              </span>
            )}
            {selectedWork !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Obra: {store.works.find(w => w.id === selectedWork)?.name || selectedWork}
                <button onClick={() => setSelectedWork('all')} className="hover:text-emerald-900 cursor-pointer">×</button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Status: {statusFilter === 'completed' ? 'Concluídas' : 'Em Trânsito'}
                <button onClick={() => setStatusFilter('all')} className="hover:text-indigo-900 cursor-pointer">×</button>
              </span>
            )}
            {(startDate || endDate) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Período: {startDate || '...'} até {endDate || '...'}
                <button onClick={() => { setStartDate(''); setEndDate(''); }} className="hover:text-amber-900 cursor-pointer">×</button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Busca: "{search}"
                <button onClick={() => setSearch('')} className="hover:text-slate-900 cursor-pointer">×</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Panel */}
      <div className="space-y-4">

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
                      <span>
                        Rota: <strong className="text-slate-900">
                          {trip.checkIn.origin || 'Escritório Central'}
                          {(trip.originCity || trip.checkIn.originCity) ? ` (${trip.originCity || trip.checkIn.originCity}${(trip.originState || trip.checkIn.originState) ? `/${trip.originState || trip.checkIn.originState}` : '/TO'})` : ''}
                        </strong> ➔ <strong className="text-blue-600">
                          {trip.checkIn.destination}
                          {(trip.destinationCity || trip.checkIn.destinationCity) ? ` (${trip.destinationCity || trip.checkIn.destinationCity}${(trip.destinationState || trip.checkIn.destinationState) ? `/${trip.destinationState || trip.checkIn.destinationState}` : ''})` : ''}
                        </strong>
                      </span>
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
                              <span>{trip.checkIn.origin || 'Escritório Central'}</span>
                            </p>
                            <span className="text-[10px] text-slate-500 font-medium pl-4 block">
                              📍 {trip.originCity || trip.checkIn.originCity || 'Palmas'}/{(trip.originState || trip.checkIn.originState || 'TO')}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-slate-400 block font-bold text-[9px] uppercase font-mono tracking-wider">Fim / Destino</span>
                            <p className="text-slate-855 font-bold text-[11px] flex items-center gap-1 leading-tight">
                              <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              <span>{trip.checkIn.destination}</span>
                            </p>
                            <span className="text-[10px] text-blue-600 font-semibold pl-4 block">
                              📍 {trip.destinationCity || trip.checkIn.destinationCity || 'Não informado'}{(trip.destinationState || trip.checkIn.destinationState) ? `/${trip.destinationState || trip.checkIn.destinationState}` : ''}
                            </span>
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

export default TripHistory;
