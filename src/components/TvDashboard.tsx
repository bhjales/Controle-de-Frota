import React, { useState, useEffect, useMemo } from 'react';
import {
  Tv,
  Maximize2,
  Minimize2,
  Truck,
  Building2,
  Fuel,
  MapPin,
  Navigation,
  User,
  Activity,
  TrendingUp,
  Gauge,
  DollarSign,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  Wrench,
  Package,
  Layers
} from 'lucide-react';
import {
  Vehicle,
  Equipment,
  Trip,
  EquipmentUsage,
  ConstructionWork,
  User as UserType,
  FuelInflow,
  FuelDispense,
  LogisticsSchedule
} from '../types';
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
  logisticsSchedules: LogisticsSchedule[];
  store: FleetStore;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
];

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function TvDashboard({
  vehicles,
  equipments,
  trips,
  equipmentUsages,
  works,
  fuelDispenses,
  logisticsSchedules,
  store
}: TvDashboardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);

  const slideTitles = [
    'QTD de Frotas & Visão Geral',
    'Calendário Mensal de Logística (Mês Atual)',
    'Quadro de Obras — Veículos por Obra',
    'Quadro de Custos — Obras Ativas',
    'Quadro de Combustível — Tanques e Consumo',
    'Frota em Trânsito / Viagens Ativas'
  ];
  const totalSlides = slideTitles.length;

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Clock ticker for live TV display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Slideshow automatic autoplay timer
  useEffect(() => {
    if (!isAutoplay) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % totalSlides);
    }, 12000);
    return () => clearInterval(interval);
  }, [isAutoplay, totalSlides]);

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
          console.warn('Error attempting to enable fullscreen:', err);
        });
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  // Live Metrics calculations
  const activeTrips = trips.filter(t => t.status === 'active');
  const activeEquipments = equipmentUsages.filter(u => u.status === 'active');

  const activeFleetVehicles = vehicles.filter(v => v.status !== 'inactive');
  const totalVehicles = activeFleetVehicles.length;
  const availableVehicles = vehicles.filter(v => v.status === 'available').length;
  const inUseVehicles = vehicles.filter(v => v.status === 'in_use').length;
  const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance').length;
  const inactiveVehicles = vehicles.filter(v => v.status === 'inactive').length;
  const logisticsEnabledVehicles = activeFleetVehicles.filter(v => Boolean(v.hasLogisticsControl)).length;

  const totalEquipments = equipments.length;
  const availableEquipments = equipments.filter(e => e.status === 'available').length;
  const inUseEquipments = equipments.filter(e => e.status === 'in_use').length;
  const maintenanceEquipments = equipments.filter(e => e.status === 'maintenance').length;

  // Fleet Quantity breakdown by Vehicle Category
  const vehiclesByCategory = useMemo(() => {
    const map = new Map<
      string,
      { category: string; total: number; available: number; inUse: number; maintenance: number; logistics: number }
    >();

    activeFleetVehicles.forEach(v => {
      const cat = (v.category || 'Sem Categoria').trim() || 'Sem Categoria';
      const entry = map.get(cat) || {
        category: cat,
        total: 0,
        available: 0,
        inUse: 0,
        maintenance: 0,
        logistics: 0
      };
      entry.total += 1;
      if (v.status === 'available') entry.available += 1;
      else if (v.status === 'in_use') entry.inUse += 1;
      else if (v.status === 'maintenance') entry.maintenance += 1;
      if (v.hasLogisticsControl) entry.logistics += 1;
      map.set(cat, entry);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [activeFleetVehicles]);

  // Machinery Quantity breakdown by Type
  const equipmentsByType = useMemo(() => {
    const map = new Map<
      string,
      { type: string; total: number; available: number; inUse: number; maintenance: number }
    >();

    equipments.forEach(e => {
      const t = (e.type || 'Outros').trim() || 'Outros';
      const entry = map.get(t) || { type: t, total: 0, available: 0, inUse: 0, maintenance: 0 };
      entry.total += 1;
      if (e.status === 'available') entry.available += 1;
      else if (e.status === 'in_use') entry.inUse += 1;
      else if (e.status === 'maintenance') entry.maintenance += 1;
      map.set(t, entry);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [equipments]);

  // Fuel & Costs summaries
  const activeWorks = useMemo(() => works.filter(w => w.status !== 'completed'), [works]);
  const workBalances = useMemo(() => works.map(w => store.getWorkFuelBalance(w.id)), [works, store, fuelDispenses]);
  const activeWorkBalances = useMemo(
    () => activeWorks.map(w => ({ work: w, balance: store.getWorkFuelBalance(w.id) })),
    [activeWorks, store, fuelDispenses]
  );

  // Maintenance costs per work from vehicles & equipments maintenanceHistory
  const workMaintenanceCosts = useMemo(() => {
    const map = new Map<string, number>();
    vehicles.forEach(v => {
      (v.maintenanceHistory || []).forEach(log => {
        const wId = log.workId || v.workId || 'geral';
        map.set(wId, (map.get(wId) || 0) + (Number(log.cost) || 0));
      });
    });
    equipments.forEach(e => {
      (e.maintenanceHistory || []).forEach(log => {
        const wId = log.workId || e.workId || 'geral';
        map.set(wId, (map.get(wId) || 0) + (Number(log.cost) || 0));
      });
    });
    return map;
  }, [vehicles, equipments]);

  const totalFuelStock = workBalances.reduce((acc, w) => acc + w.balanceLiters, 0);
  const totalFuelInflow = workBalances.reduce((acc, w) => acc + w.totalInflowLiters, 0);
  const totalFuelConsumed = fuelDispenses.reduce((acc, d) => acc + (Number(d.liters) || 0), 0);

  const totalActiveFuelCost = activeWorkBalances.reduce((acc, item) => acc + item.balance.totalCost, 0);
  const totalActiveMaintCost = activeWorks.reduce(
    (acc, w) => acc + (workMaintenanceCosts.get(w.id) || 0),
    0
  );
  const totalGeneralMaintCost = workMaintenanceCosts.get('geral') || 0;

  // Current Month Calendar Math (always reflects current month from live clock)
  const currentYear = currentTime.getFullYear();
  const currentMonth = currentTime.getMonth();
  const todayStr = formatDateISO(currentTime);
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstWeekday = new Date(currentYear, currentMonth, 1).getDay();
  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const monthStartStr = `${monthPrefix}-01`;
  const monthEndStr = `${monthPrefix}-${String(daysInCurrentMonth).padStart(2, '0')}`;

  const currentMonthDays = useMemo(() => {
    const arr: { day: number; iso: string; weekday: number; isWeekend: boolean }[] = [];
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dt = new Date(currentYear, currentMonth, d);
      const wd = dt.getDay();
      arr.push({
        day: d,
        iso: formatDateISO(dt),
        weekday: wd,
        isWeekend: wd === 0 || wd === 6
      });
    }
    return arr;
  }, [currentYear, currentMonth, daysInCurrentMonth]);

  const monthLogisticsSchedules = useMemo(() => {
    return logisticsSchedules
      .filter(
        s => s.scheduleStatus !== 'cancelado' && s.startDate <= monthEndStr && s.endDate >= monthStartStr
      )
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [logisticsSchedules, monthStartStr, monthEndStr]);

  const getScheduleDarkStyle = (item: LogisticsSchedule) => {
    if (item.scheduleStatus === 'concluido') {
      return 'bg-slate-800/90 text-slate-300 border-slate-700';
    }
    if (item.scheduleStatus === 'em_andamento') {
      return 'bg-emerald-950/80 text-emerald-200 border-emerald-500/50';
    }
    if (item.isThirdPartyRental || item.allocationType === 'terceiros') {
      return 'bg-purple-950/80 text-purple-200 border-purple-500/50';
    }
    return 'bg-blue-950/80 text-blue-200 border-blue-500/50';
  };

  // Grouping vehicles by Work for "Quadro de Obras — Veículos por Obra"
  const vehiclesGroupedByWork = useMemo(() => {
    const groups: {
      id: string;
      name: string;
      city?: string;
      state?: string;
      status: 'active' | 'completed' | 'geral';
      vehicles: Vehicle[];
    }[] = works.map(w => ({
      id: w.id,
      name: w.name,
      city: w.city,
      state: w.state,
      status: w.status,
      vehicles: vehicles
        .filter(v => v.workId === w.id)
        .sort((a, b) => a.plate.localeCompare(b.plate))
    }));

    const unallocatedVehicles = vehicles
      .filter(v => !v.workId || !works.some(w => w.id === v.workId))
      .sort((a, b) => a.plate.localeCompare(b.plate));

    if (unallocatedVehicles.length > 0) {
      groups.push({
        id: 'geral',
        name: 'Geral / Matriz (Sem Obra Fixa)',
        status: 'geral',
        vehicles: unallocatedVehicles
      });
    }

    return groups;
  }, [works, vehicles]);

  return (
    <div
      ref={containerRef}
      className={`space-y-6 transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-[9999] bg-[#070B14] p-6 sm:p-8 overflow-y-auto text-white w-screen h-screen'
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
              <h2 className="text-2xl font-black text-white tracking-tight font-display">
                Painel Geral de Operações (TV)
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                AO VIVO
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Monitoramento em tempo real da frota, logística mensal, obras, custos financeiros e estoques de combustíveis.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xl font-mono font-bold text-white">
              {currentTime.toLocaleTimeString('pt-BR')}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              {currentTime.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
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

      {/* Slideshow Control Bar */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl px-5 py-3 flex flex-col xl:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsAutoplay(!isAutoplay)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isAutoplay
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            {isAutoplay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isAutoplay ? 'Apresentação Automática' : 'Pausado'}
          </button>
          <span className="text-xs text-slate-400 font-mono">
            Slide {currentSlide + 1} de {totalSlides}:{' '}
            <strong className="text-white">{slideTitles[currentSlide]}</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {slideTitles.map((title, idx) => (
            <button
              key={title}
              onClick={() => {
                setCurrentSlide(idx);
                setIsAutoplay(false);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                currentSlide === idx
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
              }`}
              title={title}
            >
              {idx + 1}
            </button>
          ))}
          <button
            onClick={() => {
              setCurrentSlide(prev => (prev - 1 + totalSlides) % totalSlides);
              setIsAutoplay(false);
            }}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs ml-1.5 cursor-pointer"
            title="Slide Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setCurrentSlide(prev => (prev + 1) % totalSlides);
              setIsAutoplay(false);
            }}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs cursor-pointer"
            title="Próximo Slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================
          SLIDE 0: QUANTIDADE DE FROTAS & VISÃO GERAL
         ======================================================================== */}
      {currentSlide === 0 && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Veículos */}
            <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-mono tracking-wider font-bold text-slate-400">
                  Frota de Veículos
                </span>
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
                <span className="text-xs uppercase font-mono tracking-wider font-bold text-slate-400">
                  Maquinários & Pesados
                </span>
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

            {/* Card 3: Viagens Ativas & Logística */}
            <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-mono tracking-wider font-bold text-slate-400">
                  Viagens & Logística
                </span>
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                  <Activity className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-white font-mono">{activeTrips.length}</span>
                <span className="text-xs text-blue-400 font-bold font-mono">
                  {logisticsEnabledVehicles} em Logística
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 font-medium truncate">
                {activeTrips.length > 0
                  ? `➔ ${activeTrips[0].driverName} (${activeTrips[0].vehicleModelPlate})`
                  : `${monthLogisticsSchedules.length} programações em ${MONTH_NAMES[currentMonth]}`}
              </div>
            </div>

            {/* Card 4: Estoque de Combustível */}
            <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-mono tracking-wider font-bold text-slate-400">
                  Estoque de Combustível
                </span>
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                  <Fuel className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-white font-mono">
                  {totalFuelStock.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
                </span>
                <span className="text-xs text-amber-400 font-bold font-mono">
                  {totalFuelConsumed.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L Consumidos
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 font-medium">
                {works.length} Obras / Canteiros integrados
              </div>
            </div>
          </div>

          {/* Quantitativo Detalhado de Frotas por Categoria & Maquinários */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* QTD Frotas de Veículos por Categoria */}
            <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-black text-white flex items-center gap-2 font-display">
                  <Layers className="w-5 h-5 text-blue-400" />
                  Quantidade de Veículos por Categoria
                </h3>
                <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/25">
                  Total Ativos: {totalVehicles}
                </span>
              </div>

              {vehiclesByCategory.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Nenhum veículo ativo cadastrado.
                </div>
              ) : (
                <div className="space-y-3">
                  {vehiclesByCategory.map(item => {
                    const pct = totalVehicles > 0 ? Math.round((item.total / totalVehicles) * 100) : 0;
                    return (
                      <div
                        key={item.category}
                        className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-bold text-white capitalize">
                              {item.category}
                            </span>
                            <span className="ml-2 text-[10px] font-mono text-slate-400">
                              ({pct}% da frota)
                            </span>
                          </div>
                          <span className="text-xl font-black font-mono text-blue-400">
                            {item.total}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-[10px] font-mono text-center">
                          <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                            <span className="text-emerald-400 font-bold block">{item.available}</span>
                            <span className="text-slate-400">Disponíveis</span>
                          </div>
                          <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                            <span className="text-indigo-400 font-bold block">{item.inUse}</span>
                            <span className="text-slate-400">Em Uso</span>
                          </div>
                          <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                            <span className="text-amber-400 font-bold block">{item.maintenance}</span>
                            <span className="text-slate-400">Oficina</span>
                          </div>
                          <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                            <span className="text-sky-400 font-bold block">{item.logistics}</span>
                            <span className="text-slate-400">Logística</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* QTD Maquinários por Tipo + Taxa de Disponibilidade */}
            <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-black text-white flex items-center gap-2 font-display">
                  <Gauge className="w-5 h-5 text-purple-400" />
                  Quantidade de Maquinários por Tipo
                </h3>
                <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/25">
                  Total: {totalEquipments}
                </span>
              </div>

              {equipmentsByType.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Nenhum maquinário cadastrado.
                </div>
              ) : (
                <div className="space-y-3">
                  {equipmentsByType.map(item => (
                    <div
                      key={item.type}
                      className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{item.type}</span>
                        <span className="text-xl font-black font-mono text-purple-400">
                          {item.total}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-center">
                        <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                          <span className="text-emerald-400 font-bold block">{item.available}</span>
                          <span className="text-slate-400">Disponíveis</span>
                        </div>
                        <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                          <span className="text-indigo-400 font-bold block">{item.inUse}</span>
                          <span className="text-slate-400">Em Operação</span>
                        </div>
                        <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                          <span className="text-amber-400 font-bold block">{item.maintenance}</span>
                          <span className="text-slate-400">Manutenção</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          SLIDE 1: CALENDÁRIO MENSAL DE LOGÍSTICA (MÊS ATUAL)
         ======================================================================== */}
      {currentSlide === 1 && (
        <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 animate-fade-in">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2.5 font-display">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <CalendarRange className="w-5 h-5" />
                </div>
                Calendário Mensal de Logística — {MONTH_NAMES[currentMonth]} de {currentYear}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Programações de deslocamentos, permanências em obras/cidades e locações para terceiros no mês atual.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
              <span className="px-3 py-1.5 rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold">
                {monthLogisticsSchedules.length} Programações no Mês
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                {monthLogisticsSchedules.filter(s => s.scheduleStatus === 'em_andamento').length} Em Andamento
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold">
                {monthLogisticsSchedules.filter(s => s.isThirdPartyRental).length} Locados Terceiros
              </span>
            </div>
          </div>

          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60">
            <div className="grid grid-cols-7 bg-slate-900 border-b border-slate-800">
              {WEEKDAY_NAMES.map(wd => (
                <div
                  key={wd}
                  className="py-2 text-center text-xs font-bold text-slate-300 border-r last:border-r-0 border-slate-800 font-mono uppercase"
                >
                  {wd}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: firstWeekday }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="min-h-[105px] bg-slate-950/40 border-r border-b border-slate-800/80"
                />
              ))}
              {currentMonthDays.map(d => {
                const isToday = d.iso === todayStr;
                const daySchedules = monthLogisticsSchedules.filter(
                  s => s.startDate <= d.iso && s.endDate >= d.iso
                );
                return (
                  <div
                    key={d.iso}
                    className={`min-h-[105px] p-1.5 border-r border-b border-slate-800/80 flex flex-col gap-1 ${
                      isToday
                        ? 'bg-blue-950/35 ring-1 ring-inset ring-blue-500/60'
                        : d.isWeekend
                        ? 'bg-slate-900/40'
                        : 'bg-slate-950/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] font-mono font-bold tabular-nums px-1.5 py-0.5 rounded ${
                          isToday ? 'bg-blue-600 text-white' : 'text-slate-300'
                        }`}
                      >
                        {String(d.day).padStart(2, '0')}
                      </span>
                      {daySchedules.length > 0 && (
                        <span className="text-[9px] font-mono font-bold text-slate-400">
                          {daySchedules.length}x
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 overflow-y-auto max-h-[92px]">
                      {daySchedules.map(item => {
                        const plate =
                          item.vehicleModelPlate.match(/\(([^)]+)\)/)?.[1] || item.vehicleId;
                        return (
                          <div
                            key={item.id}
                            className={`px-1.5 py-1 rounded border text-[9px] leading-tight ${getScheduleDarkStyle(
                              item
                            )}`}
                            title={`${plate} | ${item.destinationLabel} (${item.destinationCity}/${item.destinationState})${
                              item.cargoDescription ? ` | Carga: ${item.cargoDescription}` : ''
                            }`}
                          >
                            <div className="font-bold truncate">
                              <span className="font-mono">{plate}</span> · {item.destinationCity}/
                              {item.destinationState}
                            </div>
                            <div className="truncate opacity-85">
                              {item.isThirdPartyRental
                                ? `Locado: ${item.thirdPartyName || item.destinationLabel}`
                                : item.workName || item.programDescription || item.destinationLabel}
                            </div>
                            {item.cargoDescription && (
                              <div className="truncate opacity-75 flex items-center gap-0.5">
                                <Package className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{item.cargoDescription}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-950 border border-blue-500/50 inline-block" />
              Uso Programado (Obra / Destino)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-950 border border-emerald-500/50 inline-block" />
              Em Andamento
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-purple-950 border border-purple-500/50 inline-block" />
              Locado para Terceiros
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700 inline-block" />
              Concluído
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================
          SLIDE 2: QUADRO DE OBRAS — LISTAGEM DE VEÍCULOS POR OBRA
         ======================================================================== */}
      {currentSlide === 2 && (
        <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 animate-fade-in">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2.5 font-display">
                <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
                  <Building2 className="w-5 h-5" />
                </div>
                Quadro de Obras — Listagem de Veículos por Obra
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Distribuição detalhada de todos os veículos alocados em cada canteiro de obras e frota geral.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-bold">
                {works.length} Obras · {vehicles.length} Veículos
              </span>
            </div>
          </div>

          {vehiclesGroupedByWork.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              Nenhuma obra ou veículo cadastrado no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {vehiclesGroupedByWork.map(group => {
                const availCount = group.vehicles.filter(v => v.status === 'available').length;
                const inUseCount = group.vehicles.filter(v => v.status === 'in_use').length;
                const maintCount = group.vehicles.filter(v => v.status === 'maintenance').length;
                return (
                  <div
                    key={group.id}
                    className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md flex flex-col"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-sm truncate" title={group.name}>
                          {group.name}
                        </h4>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          {group.city && (
                            <span>
                              📍 {group.city}/{group.state}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${
                              group.status === 'active'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : group.status === 'completed'
                                ? 'bg-slate-800 text-slate-400 border-slate-700'
                                : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                            }`}
                          >
                            {group.status === 'active'
                              ? 'ATIVA'
                              : group.status === 'completed'
                              ? 'CONCLUÍDA'
                              : 'MATRIZ / GERAL'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-lg font-black font-mono text-sky-400 block leading-none">
                          {group.vehicles.length}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono uppercase">
                          Veículos
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono text-center">
                      <div className="bg-slate-950 py-1 rounded-lg border border-slate-800 text-emerald-400 font-bold">
                        {availCount} Disp.
                      </div>
                      <div className="bg-slate-950 py-1 rounded-lg border border-slate-800 text-indigo-400 font-bold">
                        {inUseCount} Uso
                      </div>
                      <div className="bg-slate-950 py-1 rounded-lg border border-slate-800 text-amber-400 font-bold">
                        {maintCount} Ofic.
                      </div>
                    </div>

                    {group.vehicles.length === 0 ? (
                      <div className="py-6 text-center text-[11px] text-slate-500 italic">
                        Nenhum veículo alocado nesta obra.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                        {group.vehicles.map(v => {
                          const statusBadge =
                            v.status === 'available'
                              ? { label: 'Disponível', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
                              : v.status === 'in_use'
                              ? { label: 'Em Uso', cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' }
                              : v.status === 'maintenance'
                              ? { label: 'Oficina', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
                              : { label: 'Inativo', cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };

                          return (
                            <div
                              key={v.id}
                              className="bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                                    {v.plate}
                                  </span>
                                  <span className="font-semibold text-slate-200 truncate">
                                    {v.brand} {v.model}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                                  <span>{v.category || 'Veículo'}</span>
                                  <span>•</span>
                                  <span>{v.currentKm.toLocaleString('pt-BR')} km</span>
                                  {v.hasLogisticsControl && (
                                    <>
                                      <span>•</span>
                                      <span className="text-sky-400 font-bold">Logística</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border shrink-0 ${statusBadge.cls}`}
                              >
                                {statusBadge.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================
          SLIDE 3: QUADRO DE CUSTOS (SEPARADO DO QUADRO DE COMBUSTÍVEL)
         ======================================================================== */}
      {currentSlide === 3 && (
        <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2.5 font-display">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <DollarSign className="w-5 h-5" />
                </div>
                Quadro Financeiro de Custos — Obras Ativas ({activeWorks.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Consolidado exclusivo em Reais (R$): investimentos em abastecimento, custo médio por litro e manutenções por obra.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 font-mono">
              <div className="bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Custo Combustível (Obras Ativas)</span>
                <span className="text-base font-black text-emerald-400">
                  R$ {totalActiveFuelCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Custo Manutenção (Obras Ativas)</span>
                <span className="text-base font-black text-amber-400">
                  R$ {totalActiveMaintCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {activeWorks.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              Nenhuma obra ativa cadastrada no momento.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Gráfico Comparativo de Custos Totais em R$ */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 font-mono">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Comparativo de Custo Total por Obra (Combustível + Manutenção em R$)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Ordenado por Maior Custo</span>
                </div>

                <div className="space-y-3 pt-1">
                  {activeWorkBalances
                    .map(({ work, balance }) => {
                      const maintCost = workMaintenanceCosts.get(work.id) || 0;
                      const combinedCost = balance.totalCost + maintCost;
                      return { work, balance, maintCost, combinedCost };
                    })
                    .sort((a, b) => b.combinedCost - a.combinedCost)
                    .map((item, _, arr) => {
                      const maxCost = Math.max(...arr.map(x => x.combinedCost), 1);
                      const pct = Math.round((item.combinedCost / maxCost) * 100);
                      return (
                        <div key={item.work.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-white font-bold truncate max-w-[60%]" title={item.work.name}>
                              {item.work.name}
                            </span>
                            <span className="text-emerald-400 font-black">
                              R$ {item.combinedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
                            <div
                              className="bg-gradient-to-r from-emerald-600 to-teal-400 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(pct, 4)}%` }}
                            />
                          </div>
                          <div className="flex flex-wrap justify-between text-[10px] text-slate-400 font-mono gap-2">
                            <span>
                              Combustível: R$ {item.balance.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Média R$ {item.balance.averageCostPerLiter.toFixed(2)}/L)
                            </span>
                            <span>
                              Manutenções: R$ {item.maintCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Cards Financeiros por Obra */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeWorkBalances.map(({ work, balance }) => {
                  const maintCost = workMaintenanceCosts.get(work.id) || 0;
                  const totalCost = balance.totalCost + maintCost;
                  return (
                    <div
                      key={work.id}
                      className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm truncate" title={work.name}>
                          {work.name}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          {work.city}/{work.state}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Custo Total Geral</span>
                          <span className="text-emerald-400 font-black">
                            R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Custo Médio / L</span>
                          <span className="text-amber-400 font-black">
                            R$ {balance.averageCostPerLiter.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-300">
                        <div className="bg-sky-950/40 p-2 rounded-lg border border-sky-900/50">
                          <span className="text-sky-400 font-bold block">Diesel (R$)</span>
                          <span>R$ {balance.diesel.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="bg-amber-950/40 p-2 rounded-lg border border-amber-900/50">
                          <span className="text-amber-400 font-bold block">Gasolina (R$)</span>
                          <span>R$ {balance.gasolina.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="bg-rose-950/40 p-2 rounded-lg border border-rose-900/50">
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            <Wrench className="w-3 h-3" /> Manut.
                          </span>
                          <span>R$ {maintCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalGeneralMaintCost > 0 && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-300 flex items-center justify-between">
                  <span>Manutenções sem obra específica vinculada (Geral):</span>
                  <span className="text-amber-400 font-black">
                    R$ {totalGeneralMaintCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================
          SLIDE 4: QUADRO DE COMBUSTÍVEL (SEPARADO DO QUADRO DE CUSTOS)
         ======================================================================== */}
      {currentSlide === 4 && (
        <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2.5 font-display">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                  <Fuel className="w-5 h-5" />
                </div>
                Quadro de Combustível — Estoque, Entradas e Consumo por Obra
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Visão volumétrica exclusiva em Litros (L): entradas recebidas, litros consumidos e saldo atual dos tanques.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 font-mono">
              <div className="bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Saldo Total nos Tanques</span>
                <span className="text-base font-black text-amber-400">
                  {totalFuelStock.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
                </span>
              </div>
              <div className="bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Total Adquirido / Consumido</span>
                <span className="text-base font-black text-sky-400">
                  {totalFuelInflow.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L / {totalFuelConsumed.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
                </span>
              </div>
            </div>
          </div>

          {works.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              Nenhuma obra cadastrada.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Gráfico Comparativo de Volume em Litros */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 font-mono">
                    <Fuel className="w-4 h-4 text-amber-400" />
                    Volume Adquirido vs Consumido vs Saldo em Tanque (Litros)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Ordenado por Volume Adquirido</span>
                </div>

                <div className="space-y-3 pt-1">
                  {[...workBalances]
                    .sort((a, b) => b.totalInflowLiters - a.totalInflowLiters)
                    .map(wb => {
                      const maxLiters = Math.max(...workBalances.map(x => x.totalInflowLiters), 1);
                      const pct = Math.round((wb.totalInflowLiters / maxLiters) * 100);
                      return (
                        <div key={wb.workId} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-white font-bold truncate max-w-[60%]" title={wb.workName}>
                              {wb.workName}
                            </span>
                            <span className="text-amber-400 font-black">
                              Saldo: {wb.balanceLiters.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
                            </span>
                          </div>
                          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
                            <div
                              className="bg-gradient-to-r from-amber-600 to-yellow-400 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(pct, 4)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                            <span>
                              Entradas: {wb.totalInflowLiters.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
                            </span>
                            <span>
                              Consumido: {wb.totalDispenseLiters.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Cards de Tanques por Obra */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {workBalances.map(wb => (
                  <div
                    key={wb.workId}
                    className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-base truncate" title={wb.workName}>
                        {wb.workName}
                      </span>
                      <span className="font-mono text-sm font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                        {wb.balanceLiters.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-1 text-slate-300">
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-sky-400 block font-bold">🛢️ Diesel</span>
                        <span className="text-white font-black text-sm">
                          {wb.diesel.balanceLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
                        </span>
                        <div className="text-[10px] text-slate-400">
                          Ent: {wb.diesel.inflowLiters.toLocaleString('pt-BR')} L · Sai: {wb.diesel.dispenseLiters.toLocaleString('pt-BR')} L
                        </div>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-amber-400 block font-bold">⛽ Gasolina</span>
                        <span className="text-white font-black text-sm">
                          {wb.gasolina.balanceLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
                        </span>
                        <div className="text-[10px] text-slate-400">
                          Ent: {wb.gasolina.inflowLiters.toLocaleString('pt-BR')} L · Sai: {wb.gasolina.dispenseLiters.toLocaleString('pt-BR')} L
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================
          SLIDE 5: FROTA EM TRÂNSITO / VIAGENS ATIVAS
         ======================================================================== */}
      {currentSlide === 5 && (
        <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 font-display">
              <Activity className="w-5 h-5 text-blue-400" />
              Frota em Trânsito / Viagens Ativas ({activeTrips.length})
            </h3>
            <span className="text-[10px] uppercase font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/25">
              ATUALIZAÇÃO EM TEMPO REAL
            </span>
          </div>

          {activeTrips.length === 0 ? (
            <div className="py-24 text-center text-slate-400 text-sm">
              Nenhum veículo ou motorista em viagem ativa no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTrips.map(trip => (
                <div
                  key={trip.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-blue-600 text-white shadow-xs">
                      {trip.vehicleModelPlate}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Início: {trip.checkIn.time}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-white font-semibold">
                      <User className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{trip.driverName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="truncate">
                        Destino: <strong className="text-white">{trip.checkIn.destination}</strong>
                        {(trip.destinationCity || trip.checkIn.destinationCity) && (
                          <span className="text-amber-300 font-semibold ml-1">
                            ({trip.destinationCity || trip.checkIn.destinationCity}
                            {(trip.destinationState || trip.checkIn.destinationState)
                              ? `/${trip.destinationState || trip.checkIn.destinationState}`
                              : ''}
                            )
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                      <Navigation className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">
                        Origem: {trip.checkIn.origin || 'Escritório Central'} (
                        {trip.originCity || trip.checkIn.originCity || 'Palmas'}/
                        {trip.originState || trip.checkIn.originState || 'TO'})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="truncate">Obra: {trip.workName || 'Geral'}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>Odômetro: {trip.checkIn.km.toLocaleString()} km</span>
                    <span className="text-emerald-400 font-bold animate-pulse">● EM ROTA</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TvDashboard;
