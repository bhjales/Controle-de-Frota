import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  Maximize2, 
  Minimize2, 
  Truck, 
  Building2, 
  Fuel, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  User, 
  Activity, 
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Gauge,
  DollarSign
} from 'lucide-react';
import { Vehicle, Equipment, Trip, EquipmentUsage, ConstructionWork, User as UserType, FuelInflow, FuelDispense } from '../types';
import { FleetStore } from '../store/fleetStore';

interface TvDashboardProps {
  vehicles: Vehicle[];
  equipments: Equipment[];
  trips: Trip[];
  equipmentUsages: EquipmentUsage[];
  users: UserType[];
  works: ConstructionWork[];
  fuelInflows: FuelInflow[];
  fuelDispenses: FuelDispense[];
  store: FleetStore;
}

export function TvDashboard({
  vehicles,
  equipments,
  trips,
  equipmentUsages,
  users,
  works,
  fuelInflows,
  fuelDispenses,
  store
}: TvDashboardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Clock ticker for live TV display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current && containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(err => {
          console.warn("Error attempting to enable fullscreen:", err);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Live Metrics calculations
  const activeTrips = trips.filter(t => t.status === 'active');
  const activeEquipments = equipmentUsages.filter(u => u.status === 'active');
  
  const totalVehicles = vehicles.filter(v => v.status !== 'inactive').length;
  const availableVehicles = vehicles.filter(v => v.status === 'available').length;
  const inUseVehicles = vehicles.filter(v => v.status === 'in_use').length;
  const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance').length;
  const inactiveVehicles = vehicles.filter(v => v.status === 'inactive').length;

  const totalEquipments = equipments.length;
  const availableEquipments = equipments.filter(e => e.status === 'available').length;
  const inUseEquipments = equipments.filter(e => e.status === 'in_use').length;
  const maintenanceEquipments = equipments.filter(e => e.status === 'maintenance').length;

  // Fuel stock summary
  const workBalances = works.map(w => store.getWorkFuelBalance(w.id));
  const totalFuelStock = workBalances.reduce((acc, w) => acc + w.balanceLiters, 0);
  const totalFuelConsumed = fuelDispenses.reduce((acc, d) => acc + (Number(d.liters) || 0), 0);

  return (
    <div 
      ref={containerRef}
      className={`space-y-6 transition-all duration-300 ${
        isFullscreen 
          ? 'fixed inset-0 z-[9999] bg-[#070B14] p-8 overflow-y-auto text-white w-screen h-screen' 
          : 'w-full'
      }`}
    >
      {/* TV Header Bar */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600/20 border border-blue-500/40 rounded-2xl text-blue-400 animate-pulse">
            <Tv className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-white tracking-tight font-display">Painel Geral de Operações (TV)</h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                AO VIVO
              </span>
            </div>
            <p className="text-xs text-slate-400">Monitoramento em tempo real da frota, frotas em trânsito, canteiros de obras e estoques de combustíveis.</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xl font-mono font-bold text-white">
              {currentTime.toLocaleTimeString('pt-BR')}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>

          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all border border-slate-700 cursor-pointer shadow-lg"
            title="Alternar Tela Cheia (Modo TV)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            {isFullscreen ? 'Sair da Tela Cheia' : 'Modo Tela Cheia (TV)'}
          </button>
        </div>
      </div>

      {/* Top KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Veículos */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider font-bold text-slate-400">Frota de Veículos</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-white font-mono">{totalVehicles}</span>
            <span className="text-xs text-emerald-400 font-bold font-mono">
              {availableVehicles} Disponíveis
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-center">
            <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
              <span className="text-indigo-400 font-bold block">{inUseVehicles}</span>
              <span className="text-slate-400">Em Uso</span>
            </div>
            <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
              <span className="text-amber-400 font-bold block">{maintenanceVehicles}</span>
              <span className="text-slate-400">Oficina</span>
            </div>
            <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
              <span className="text-rose-400 font-bold block">{inactiveVehicles}</span>
              <span className="text-slate-400">Inativos</span>
            </div>
          </div>
        </div>

        {/* Card 2: Maquinários */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider font-bold text-slate-400">Maquinários & Pesados</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <Gauge className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-white font-mono">{totalEquipments}</span>
            <span className="text-xs text-emerald-400 font-bold font-mono">
              {availableEquipments} Disponíveis
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-center">
            <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
              <span className="text-indigo-400 font-bold block">{inUseEquipments}</span>
              <span className="text-slate-400">Em Operação</span>
            </div>
            <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
              <span className="text-amber-400 font-bold block">{maintenanceEquipments}</span>
              <span className="text-slate-400">Manutenção</span>
            </div>
          </div>
        </div>

        {/* Card 3: Viagens Ativas */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider font-bold text-slate-400">Viagens em Curso</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-white font-mono">{activeTrips.length}</span>
            <span className="text-xs text-blue-400 font-bold font-mono">
              {activeEquipments.length} Operações de Máquinas
            </span>
          </div>
          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 font-medium truncate">
            {activeTrips.length > 0 ? `➔ ${activeTrips[0].driverName} com ${activeTrips[0].vehicleModelPlate}` : 'Nenhuma viagem em trânsito no momento'}
          </div>
        </div>

        {/* Card 4: Estoque de Combustível */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider font-bold text-slate-400">Estoque de Combustível</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Fuel className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-white font-mono">{totalFuelStock.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L</span>
            <span className="text-xs text-amber-400 font-bold font-mono">
              {totalFuelConsumed.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L Consumidos
            </span>
          </div>
          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 font-medium">
            {works.length} Obras / Canteiros integrados
          </div>
        </div>
      </div>

      {/* Active Works Cost Tracking & Charts Section */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2.5 font-display">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <DollarSign className="w-5 h-5" />
              </div>
              Acompanhamento de Custos e Gráficos — Obras Ativas ({works.filter(w => w.status !== 'completed').length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Visão consolidada de investimentos, custos por litro e consumo comparativo em tempo real por canteiro.</p>
          </div>
          <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-800 font-mono">
            <span className="text-xs text-slate-400">Investimento Total Ativo:</span>
            <span className="text-base font-black text-emerald-400">
              R$ {works.filter(w => w.status !== 'completed').reduce((acc, w) => acc + store.getWorkFuelBalance(w.id).totalCost, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {works.filter(w => w.status !== 'completed').length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Nenhuma obra ativa cadastrada no momento.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Comparative Bar Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Cost Comparison (R$) */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 font-mono">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Comparativo de Custo Total por Obra (R$)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Ordenado por Investimento</span>
                </div>

                <div className="space-y-3 pt-2">
                  {works.filter(w => w.status !== 'completed').map(w => store.getWorkFuelBalance(w.id))
                    .sort((a, b) => b.totalCost - a.totalCost)
                    .map(wb => {
                      const maxCost = Math.max(...works.filter(w => w.status !== 'completed').map(w => store.getWorkFuelBalance(w.id).totalCost), 1);
                      const pct = Math.round((wb.totalCost / maxCost) * 100);
                      return (
                        <div key={wb.workId} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-white font-bold truncate max-w-[60%]" title={wb.workName}>{wb.workName}</span>
                            <span className="text-emerald-400 font-black">
                              R$ {wb.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
                            <div 
                              className="bg-gradient-to-r from-emerald-600 to-teal-400 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${Math.max(pct, 4)}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                            <span>Média: R$ {wb.averageCostPerLiter.toFixed(2)}/L</span>
                            <span>{pct}% do máx.</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Chart 2: Volume Comparison (Liters) */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 font-mono">
                    <Fuel className="w-4 h-4 text-amber-400" />
                    Volume Adquirido vs Consumido (L)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Litros Totais</span>
                </div>

                <div className="space-y-3 pt-2">
                  {works.filter(w => w.status !== 'completed').map(w => store.getWorkFuelBalance(w.id))
                    .sort((a, b) => b.totalInflowLiters - a.totalInflowLiters)
                    .map(wb => {
                      const maxLiters = Math.max(...works.filter(w => w.status !== 'completed').map(w => store.getWorkFuelBalance(w.id).totalInflowLiters), 1);
                      const pct = Math.round((wb.totalInflowLiters / maxLiters) * 100);
                      return (
                        <div key={wb.workId} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-white font-bold truncate max-w-[60%]" title={wb.workName}>{wb.workName}</span>
                            <span className="text-amber-400 font-black">
                              {wb.totalInflowLiters.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
                            </span>
                          </div>
                          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
                            <div 
                              className="bg-gradient-to-r from-amber-600 to-yellow-400 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${Math.max(pct, 4)}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                            <span>Consumidos: {wb.totalDispenseLiters.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L</span>
                            <span>Tanque: {wb.balanceLiters.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Detailed Cards for Each Active Work */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {works.filter(w => w.status !== 'completed').map(w => {
                const wb = store.getWorkFuelBalance(w.id);
                return (
                  <div key={wb.workId} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md hover:border-slate-700 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm truncate" title={wb.workName}>{wb.workName}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        ATIVA
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 space-y-0.5 font-sans">
                      <div className="truncate">📍 Local: <span className="text-slate-300">{w.city}/{w.state}</span></div>
                      {w.description && <div className="truncate">📝 Obs: <span className="text-slate-300">{w.description}</span></div>}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 font-mono text-xs">
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Custo Total</span>
                        <span className="text-emerald-400 font-black">
                          R$ {wb.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Custo Médio / L</span>
                        <span className="text-amber-400 font-black">
                          R$ {wb.averageCostPerLiter.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-300">
                      <div className="bg-sky-950/40 p-2 rounded-lg border border-sky-900/50">
                        <span className="text-sky-400 font-bold block">🛢️ Diesel</span>
                        <span>R$ {wb.diesel.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <div className="text-slate-400">({wb.diesel.inflowLiters} L)</div>
                      </div>
                      <div className="bg-amber-950/40 p-2 rounded-lg border border-amber-900/50">
                        <span className="text-amber-400 font-bold block">⛽ Gasolina</span>
                        <span>R$ {wb.gasolina.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <div className="text-slate-400">({wb.gasolina.inflowLiters} L)</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Grid: Live Trips / Activity & Works Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Trips in Transit */}
        <div className="lg:col-span-2 bg-[#0F172A] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-display">
              <Activity className="w-5 h-5 text-blue-400" />
              Frota em Trânsito / Viagens Ativas ({activeTrips.length})
            </h3>
            <span className="text-[10px] uppercase font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/25">
              ATUALIZAÇÃO AUTOMÁTICA
            </span>
          </div>

          {activeTrips.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nenhum veículo ou motorista em viagem ativa no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
              {activeTrips.map(trip => (
                <div key={trip.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded bg-blue-600 text-white shadow-xs">
                      {trip.vehicleModelPlate}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Início: {trip.checkIn.time}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-white font-semibold">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{trip.driverName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">Destino: <strong className="text-white">{trip.checkIn.destination}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">Obra: {trip.workName || 'Geral'}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Odômetro Saída: {trip.checkIn.km.toLocaleString()} km</span>
                    <span className="text-emerald-400 font-bold animate-pulse">● EM ROTA</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Works & Fuel Balances */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-display">
              <Building2 className="w-5 h-5 text-emerald-400" />
              Saldos nos Canteiros de Obras
            </h3>
            <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/25">
              TANQUES
            </span>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {works.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Nenhuma obra cadastrada.
              </div>
            ) : (
              workBalances.map(wb => (
                <div key={wb.workId} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm truncate">{wb.workName}</span>
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {wb.balanceLiters.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 text-slate-300">
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <span className="text-sky-400 block font-bold">🛢️ Diesel</span>
                      <span className="text-white font-black">{wb.diesel.balanceLiters.toLocaleString('pt-BR')} L</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <span className="text-amber-400 block font-bold">⛽ Gasolina</span>
                      <span className="text-white font-black">{wb.gasolina.balanceLiters.toLocaleString('pt-BR')} L</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TvDashboard;
