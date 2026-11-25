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
  Layers,
  Compass,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { LeafletRouteMap } from './LeafletRouteMap';
import { TvWorkFleetUnifiedView } from './TvWorkFleetUnifiedView';
import { TvMaintenanceSlide } from './TvMaintenanceSlide';
import { exportLogisticsCSV, exportLogisticsPDF } from '../utils/logisticsReports';
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

const SCHEDULE_COLOR_PALETTE = [
  { chip: 'bg-blue-600/30 text-blue-100 border-blue-400/75', dot: 'bg-blue-400' },
  { chip: 'bg-emerald-600/30 text-emerald-100 border-emerald-400/75', dot: 'bg-emerald-400' },
  { chip: 'bg-amber-600/30 text-amber-100 border-amber-400/75', dot: 'bg-amber-400' },
  { chip: 'bg-violet-600/30 text-violet-100 border-violet-400/75', dot: 'bg-violet-400' },
  { chip: 'bg-rose-600/30 text-rose-100 border-rose-400/75', dot: 'bg-rose-400' },
  { chip: 'bg-cyan-600/30 text-cyan-100 border-cyan-400/75', dot: 'bg-cyan-400' },
  { chip: 'bg-orange-600/30 text-orange-100 border-orange-400/75', dot: 'bg-orange-400' },
  { chip: 'bg-fuchsia-600/30 text-fuchsia-100 border-fuchsia-400/75', dot: 'bg-fuchsia-400' },
  { chip: 'bg-lime-600/30 text-lime-100 border-lime-400/75', dot: 'bg-lime-400' },
  { chip: 'bg-indigo-600/30 text-indigo-100 border-indigo-400/75', dot: 'bg-indigo-400' },
  { chip: 'bg-teal-600/30 text-teal-100 border-teal-400/75', dot: 'bg-teal-400' },
  { chip: 'bg-pink-600/30 text-pink-100 border-pink-400/75', dot: 'bg-pink-400' },
  { chip: 'bg-yellow-600/30 text-yellow-100 border-yellow-400/75', dot: 'bg-yellow-400' },
  { chip: 'bg-sky-600/30 text-sky-100 border-sky-400/75', dot: 'bg-sky-400' }
];

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

  const slides = [
    { title: 'QTD de Frotas & Visão Geral', shortLabel: 'QTD Frotas' },
    { title: 'Calendário Mensal de Logística (Mês Atual)', shortLabel: 'Calendário Logística' },
    { title: 'Visão Unificada — Veículos Ativos e Maquinários por Obra', shortLabel: 'Veículos & Maquinários' },
    { title: 'Mapa de Rotas e Itinerários por Cidades (Obras)', shortLabel: 'Mapa de Rotas' },
    { title: 'Central de Manutenções — Oficina, Preventivas e Histórico', shortLabel: 'Manutenções' },
    { title: 'Quadro Financeiro de Custos — Obras Ativas', shortLabel: 'Custos (R$)' },
    { title: 'Quadro de Combustível — Tanques e Consumo', shortLabel: 'Combustível (L)' },
    { title: 'Frota em Trânsito / Viagens Ativas', shortLabel: 'Frota em Trânsito' }
  ];
  const slideTitles = slides.map(s => s.title);
  const totalSlides = slides.length;

  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isAutoplay) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % totalSlides);
    }, 60000);
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
  const activeEquipmentsCount = equipmentUsages.filter(u => u.status === 'active').length;

  const activeFleetVehicles = vehicles.filter(v => v.status !== 'inactive' && v.isActive !== false);
  const totalVehicles = activeFleetVehicles.length;
  const availableVehicles = activeFleetVehicles.filter(v => v.status === 'available').length;
  const inUseVehicles = activeFleetVehicles.filter(v => v.status === 'in_use').length;
  const maintenanceVehicles = activeFleetVehicles.filter(v => v.status === 'maintenance').length;
  const inactiveVehicles = vehicles.filter(v => v.status === 'inactive' || v.isActive === false).length;
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
  const totalKmDriven = useMemo(
    () => trips.reduce((acc, t) => acc + (Number(t.kmDriven) || 0), 0),
    [trips]
  );

  // Current Month Calendar Math (always reflects current month from live clock)
  const currentYear = currentTime.getFullYear();
  const currentMonth = currentTime.getMonth();
  const todayStr = formatDateISO(currentTime);
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstWeekday = new Date(currentYear, currentMonth, 1).getDay();
  const totalCalendarWeeks = Math.ceil((firstWeekday + daysInCurrentMonth) / 7);
  const trailingEmptyCells = totalCalendarWeeks * 7 - (firstWeekday + daysInCurrentMonth);
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

  const scheduleColorMap = useMemo(() => {
    const map = new Map<string, { chip: string; dot: string }>();
    monthLogisticsSchedules.forEach((sched, idx) => {
      map.set(sched.id, SCHEDULE_COLOR_PALETTE[idx % SCHEDULE_COLOR_PALETTE.length]);
    });
    return map;
  }, [monthLogisticsSchedules]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col gap-2 overflow-hidden transition-all duration-200 ${
        isFullscreen
          ? 'fixed inset-0 z-[9999] bg-[#070B14] p-3 text-white w-screen h-screen'
          : 'w-full md:h-[calc(100vh-7.5rem)] md:min-h-[580px]'
      }`}
    >
      {/* Compact TV Top Header Bar */}
      <div className="shrink-0 bg-[#0F172A] border border-slate-800 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-lg">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-blue-600/20 border border-blue-500/40 rounded-lg text-blue-400 shrink-0">
            <Tv className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight font-display truncate">
                Painel Geral de Operações (TV)
              </h2>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 font-mono whitespace-nowrap shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                AO VIVO
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono tabular-nums text-slate-300">
            <span className="text-base font-bold text-white">
              {currentTime.toLocaleTimeString('pt-BR')}
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-[11px] text-slate-400 capitalize">
              {currentTime.toLocaleDateString('pt-BR', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors border border-slate-700 cursor-pointer whitespace-nowrap shrink-0"
            title="Alternar Tela Cheia (Modo TV)"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            {isFullscreen ? 'Sair Tela Cheia' : 'Tela Cheia (TV)'}
          </button>
        </div>
      </div>

      {/* Compact Slideshow Navigation Strip */}
      <div className="shrink-0 bg-[#0F172A] border border-slate-800 rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 shadow-md overflow-x-auto">
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsAutoplay(!isAutoplay)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 border ${
              isAutoplay
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}
          >
            {isAutoplay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {isAutoplay ? 'Auto' : 'Pausado'}
          </button>
          <span className="text-[11px] text-slate-400 font-mono tabular-nums whitespace-nowrap hidden xl:inline">
            {currentSlide + 1}/{totalSlides} · <strong className="text-white">{slideTitles[currentSlide]}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {slides.map((slide, idx) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => {
                setCurrentSlide(idx);
                setIsAutoplay(false);
              }}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer border whitespace-nowrap shrink-0 ${
                currentSlide === idx
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
              }`}
              title={slide.title}
            >
              {idx + 1}. {slide.shortLabel}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setCurrentSlide(prev => (prev - 1 + totalSlides) % totalSlides);
              setIsAutoplay(false);
            }}
            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg ml-1 cursor-pointer shrink-0"
            title="Slide Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setCurrentSlide(prev => (prev + 1) % totalSlides);
              setIsAutoplay(false);
            }}
            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer shrink-0"
            title="Próximo Slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Slide Stage (Viewport-Locked Zero Scroll) */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* SLIDE 0: QTD DE FROTAS & VISÃO GERAL */}
        {currentSlide === 0 && (
          <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden animate-fade-in">
            {/* 4 KPI Cards */}
            <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm lg:text-base font-mono font-bold text-slate-300">
                    Frota de Veículos
                  </span>
                  <Truck className="w-5 h-5 text-blue-400 shrink-0" />
                </div>
                <div className="flex items-baseline justify-between font-mono tabular-nums">
                  <span className="text-3xl sm:text-4xl xl:text-5xl font-black text-white leading-none">{totalVehicles}</span>
                  <span className="text-sm sm:text-base lg:text-lg text-emerald-400 font-bold">
                    {availableVehicles} Disp.
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm font-mono tabular-nums pt-1.5 border-t border-slate-800/80 text-slate-400">
                  <span className="text-indigo-400 font-bold">{inUseVehicles} Uso</span>
                  <span className="text-amber-400 font-bold">{maintenanceVehicles} Ofic.</span>
                  <span className="text-rose-400 font-bold">{inactiveVehicles} Inat.</span>
                </div>
              </div>

              <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm lg:text-base font-mono font-bold text-slate-300">
                    Maquinários & Pesados
                  </span>
                  <Gauge className="w-5 h-5 text-purple-400 shrink-0" />
                </div>
                <div className="flex items-baseline justify-between font-mono tabular-nums">
                  <span className="text-3xl sm:text-4xl xl:text-5xl font-black text-white leading-none">{totalEquipments}</span>
                  <span className="text-sm sm:text-base lg:text-lg text-emerald-400 font-bold">
                    {availableEquipments} Disp.
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm font-mono tabular-nums pt-1.5 border-t border-slate-800/80 text-slate-400">
                  <span className="text-indigo-400 font-bold">
                    {Math.max(inUseEquipments, activeEquipmentsCount)} Oper.
                  </span>
                  <span className="text-amber-400 font-bold">{maintenanceEquipments} Manut.</span>
                </div>
              </div>

              <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm lg:text-base font-mono font-bold text-slate-300">
                    Viagens & Logística
                  </span>
                  <Activity className="w-5 h-5 text-indigo-400 shrink-0" />
                </div>
                <div className="flex items-baseline justify-between font-mono tabular-nums">
                  <span className="text-3xl sm:text-4xl xl:text-5xl font-black text-white leading-none">{activeTrips.length}</span>
                  <span className="text-sm sm:text-base lg:text-lg text-sky-400 font-bold">
                    {logisticsEnabledVehicles} Logística
                  </span>
                </div>
                <div className="pt-1.5 border-t border-slate-800/80 text-xs sm:text-sm font-mono text-slate-300 truncate">
                  {activeTrips.length > 0
                    ? `Em rota: ${activeTrips[0].vehicleModelPlate}`
                    : `${monthLogisticsSchedules.length} agendas em ${MONTH_NAMES[currentMonth]}`}
                </div>
              </div>

              <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm lg:text-base font-mono font-bold text-slate-300">
                    Combustível & Obras
                  </span>
                  <Fuel className="w-5 h-5 text-amber-400 shrink-0" />
                </div>
                <div className="flex items-baseline justify-between font-mono tabular-nums">
                  <span className="text-3xl sm:text-4xl xl:text-5xl font-black text-white leading-none">
                    {totalFuelStock.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
                  </span>
                  <span className="text-sm sm:text-base lg:text-lg text-amber-400 font-bold">
                    {works.length} Obras
                  </span>
                </div>
                <div className="pt-1.5 border-t border-slate-800/80 text-xs sm:text-sm font-mono tabular-nums text-slate-300 truncate">
                  Consumo: {totalFuelConsumed.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
                </div>
              </div>
            </div>

            {/* Tabelas Resumo Lado a Lado */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-2.5 overflow-hidden">
              {/* Veículos por Categoria */}
              <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-3.5 flex flex-col min-h-0 overflow-hidden">
                <div className="shrink-0 flex items-center justify-between border-b border-slate-800 pb-2 mb-1.5">
                  <h3 className="text-base sm:text-lg lg:text-xl font-black text-white flex items-center gap-2 font-display">
                    <Layers className="w-5 h-5 text-blue-400 shrink-0" />
                    Veículos por Categoria
                  </h3>
                  <span className="text-sm sm:text-base font-mono font-bold tabular-nums text-blue-400">
                    Ativos: {totalVehicles}
                  </span>
                </div>

                {vehiclesByCategory.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                    Nenhum veículo ativo cadastrado.
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <table className="w-full text-sm sm:text-base xl:text-lg font-mono tabular-nums">
                      <thead>
                        <tr className="text-xs sm:text-sm text-slate-400 border-b border-slate-800/90">
                          <th className="text-left py-1.5 pr-2 font-bold">Categoria</th>
                          <th className="text-right py-1.5 px-2 font-bold text-blue-400">Qtd</th>
                          <th className="text-right py-1.5 px-2 font-bold text-emerald-400">Disp.</th>
                          <th className="text-right py-1.5 px-2 font-bold text-indigo-400">Uso</th>
                          <th className="text-right py-1.5 px-2 font-bold text-amber-400">Ofic.</th>
                          <th className="text-right py-1.5 pl-2 font-bold text-sky-400">Log.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {vehiclesByCategory.slice(0, 11).map(item => (
                          <tr key={item.category} className="hover:bg-slate-900/60">
                            <td className="py-1 pr-2 font-sans font-bold text-white capitalize truncate max-w-[260px]">
                              {item.category}
                            </td>
                            <td className="py-1 px-2 text-right font-black text-blue-400">
                              {item.total}
                            </td>
                            <td className="py-1 px-2 text-right font-bold text-emerald-400">
                              {item.available}
                            </td>
                            <td className="py-1 px-2 text-right font-bold text-indigo-400">
                              {item.inUse}
                            </td>
                            <td className="py-1 px-2 text-right font-bold text-amber-400">
                              {item.maintenance}
                            </td>
                            <td className="py-1 pl-2 text-right font-bold text-sky-400">
                              {item.logistics}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Maquinários por Tipo */}
              <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-3.5 flex flex-col min-h-0 overflow-hidden">
                <div className="shrink-0 flex items-center justify-between border-b border-slate-800 pb-2 mb-1.5">
                  <h3 className="text-base sm:text-lg lg:text-xl font-black text-white flex items-center gap-2 font-display">
                    <Gauge className="w-5 h-5 text-purple-400 shrink-0" />
                    Maquinários por Tipo
                  </h3>
                  <span className="text-sm sm:text-base font-mono font-bold tabular-nums text-purple-400">
                    Total: {totalEquipments}
                  </span>
                </div>

                {equipmentsByType.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                    Nenhum maquinário cadastrado.
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <table className="w-full text-sm sm:text-base xl:text-lg font-mono tabular-nums">
                      <thead>
                        <tr className="text-xs sm:text-sm text-slate-400 border-b border-slate-800/90">
                          <th className="text-left py-1.5 pr-2 font-bold">Tipo de Equipamento</th>
                          <th className="text-right py-1.5 px-2 font-bold text-purple-400">Qtd</th>
                          <th className="text-right py-1.5 px-2 font-bold text-emerald-400">Disp.</th>
                          <th className="text-right py-1.5 px-2 font-bold text-indigo-400">Oper.</th>
                          <th className="text-right py-1.5 pl-2 font-bold text-amber-400">Manut.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {equipmentsByType.slice(0, 11).map(item => (
                          <tr key={item.type} className="hover:bg-slate-900/60">
                            <td className="py-1 pr-2 font-sans font-bold text-white truncate max-w-[260px]">
                              {item.type}
                            </td>
                            <td className="py-1 px-2 text-right font-black text-purple-400">
                              {item.total}
                            </td>
                            <td className="py-1 px-2 text-right font-bold text-emerald-400">
                              {item.available}
                            </td>
                            <td className="py-1 px-2 text-right font-bold text-indigo-400">
                              {item.inUse}
                            </td>
                            <td className="py-1 pl-2 text-right font-bold text-amber-400">
                              {item.maintenance}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 1: CALENDÁRIO MENSAL DE LOGÍSTICA (MÊS ATUAL) */}
        {currentSlide === 1 && (
          <div className="flex-1 min-h-0 bg-[#0F172A] border border-slate-800 rounded-2xl p-3.5 shadow-xl flex flex-col gap-2 overflow-hidden animate-fade-in">
            <div className="shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 shrink-0">
                  <CalendarRange className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-xl font-black text-white font-display truncate">
                    Calendário Mensal de Logística — {MONTH_NAMES[currentMonth]} de {currentYear}
                  </h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm font-mono tabular-nums shrink-0">
                <span className="text-blue-300 font-bold">
                  {monthLogisticsSchedules.length} Programações
                </span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-emerald-300 font-bold">
                  {monthLogisticsSchedules.filter(s => s.scheduleStatus === 'em_andamento').length} Em Andamento
                </span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-purple-300 font-bold">
                  {monthLogisticsSchedules.filter(s => s.isThirdPartyRental).length} Terceiros
                </span>
                <button
                  type="button"
                  onClick={() =>
                    exportLogisticsCSV({
                      schedules: monthLogisticsSchedules,
                      works,
                      vehicles,
                      monthYearLabel: `${MONTH_NAMES[currentMonth]} de ${currentYear}`,
                      monthStartStr,
                      monthEndStr,
                      scopeDescription: `Painel TV - Agenda de ${MONTH_NAMES[currentMonth]} de ${currentYear}`,
                    })
                  }
                  disabled={monthLogisticsSchedules.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/35 disabled:opacity-40 text-emerald-300 border border-emerald-500/40 font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  title="Exportar Calendário do Mês em CSV (Excel)"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exportLogisticsPDF({
                      schedules: monthLogisticsSchedules,
                      works,
                      vehicles,
                      monthYearLabel: `${MONTH_NAMES[currentMonth]} de ${currentYear}`,
                      monthStartStr,
                      monthEndStr,
                      scopeDescription: `Painel TV - Agenda de ${MONTH_NAMES[currentMonth]} de ${currentYear}`,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/50 font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  title="Exportar Calendário do Mês em PDF (Offline)"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
              <div className="shrink-0 grid grid-cols-7 bg-slate-900 border-b border-slate-800">
                {WEEKDAY_NAMES.map(wd => (
                  <div
                    key={wd}
                    className="py-1.5 text-center text-xs sm:text-sm lg:text-base font-bold text-slate-200 border-r last:border-r-0 border-slate-800 font-mono"
                  >
                    {wd}
                  </div>
                ))}
              </div>
              <div
                className="flex-1 min-h-0 grid grid-cols-7 overflow-hidden"
                style={{ gridTemplateRows: `repeat(${totalCalendarWeeks}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: firstWeekday }).map((_, idx) => (
                  <div
                    key={`empty-start-${idx}`}
                    className="bg-slate-950/40 border-r border-b border-slate-800/80 min-h-0"
                  />
                ))}
                {currentMonthDays.map(d => {
                  const isToday = d.iso === todayStr;
                  const daySchedules = monthLogisticsSchedules.filter(
                    s => s.startDate <= d.iso && s.endDate >= d.iso
                  );
                  const gridLayoutClass =
                    daySchedules.length >= 7
                      ? 'grid grid-cols-3 gap-0.5 content-start'
                      : daySchedules.length >= 4
                      ? 'grid grid-cols-2 gap-0.5 content-start'
                      : 'flex flex-col gap-0.5';

                  const chipSizeClass =
                    daySchedules.length >= 7
                      ? 'text-[10px] sm:text-[11px] px-1 py-[1px]'
                      : daySchedules.length >= 4
                      ? 'text-[11px] sm:text-xs px-1.5 py-0.5'
                      : 'text-xs sm:text-sm px-1.5 py-0.5';

                  return (
                    <div
                      key={d.iso}
                      className={`p-1 border-r border-b border-slate-800/80 flex flex-col gap-0.5 min-h-0 overflow-hidden ${
                        isToday
                          ? 'bg-blue-950/35 ring-1 ring-inset ring-blue-500/60'
                          : d.isWeekend
                          ? 'bg-slate-900/40'
                          : 'bg-slate-950/20'
                      }`}
                    >
                      <div className="shrink-0 flex items-center justify-between">
                        <span
                          className={`text-xs sm:text-sm font-mono font-black tabular-nums px-1.5 py-0 rounded ${
                            isToday ? 'bg-blue-600 text-white' : 'text-slate-200'
                          }`}
                        >
                          {String(d.day).padStart(2, '0')}
                        </span>
                        {daySchedules.length > 0 && (
                          <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-300">
                            {daySchedules.length}x
                          </span>
                        )}
                      </div>

                      <div className={`flex-1 min-h-0 ${gridLayoutClass}`}>
                        {daySchedules.map(item => {
                          const plate =
                            item.vehicleModelPlate.match(/\(([^)]+)\)/)?.[1] || item.vehicleId;
                          const compPlate =
                            item.complementVehicleModelPlate?.match(/\(([^)]+)\)/)?.[1] || item.complementVehicleId;
                          const plateDisplay = compPlate ? `${plate}+${compPlate}` : plate;
                          const colorStyle =
                            scheduleColorMap.get(item.id) || SCHEDULE_COLOR_PALETTE[0];
                          const destText = item.isThirdPartyRental
                            ? item.thirdPartyName || item.destinationCity
                            : item.workName || item.destinationCity;
                          return (
                            <div
                              key={item.id}
                              className={`rounded border leading-[1.2] flex items-center gap-1 min-w-0 ${chipSizeClass} ${colorStyle.chip}`}
                              title={`${plate}${compPlate ? ` + ${compPlate} (Complemento)` : ''} | ${item.destinationLabel} (${item.destinationCity}/${item.destinationState})${
                                item.cargoDescription ? ` | Carga: ${item.cargoDescription}` : ''
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${colorStyle.dot}`}
                              />
                              <span className="truncate">
                                <span className="font-mono font-bold">{plateDisplay}</span>
                                {daySchedules.length < 7 && destText ? ` · ${destText}` : ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {Array.from({ length: trailingEmptyCells }).map((_, idx) => (
                  <div
                    key={`empty-end-${idx}`}
                    className="bg-slate-950/40 border-r border-b border-slate-800/80 min-h-0"
                  />
                ))}
              </div>
            </div>

            {/* Legenda individual de todas as programações do mês por cor */}
            <div className="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-300 font-mono">
              {monthLogisticsSchedules.length === 0 ? (
                <span className="text-slate-500">Nenhuma programação ativa neste mês.</span>
              ) : (
                monthLogisticsSchedules.map(item => {
                  const plate =
                    item.vehicleModelPlate.match(/\(([^)]+)\)/)?.[1] || item.vehicleId;
                  const compPlate =
                    item.complementVehicleModelPlate?.match(/\(([^)]+)\)/)?.[1] || item.complementVehicleId;
                  const plateDisplay = compPlate ? `${plate}+${compPlate}` : plate;
                  const colorStyle =
                    scheduleColorMap.get(item.id) || SCHEDULE_COLOR_PALETTE[0];
                  return (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-1.5 max-w-[340px]"
                      title={`${item.vehicleModelPlate}${item.complementVehicleModelPlate ? ` + Complemento: ${item.complementVehicleModelPlate}` : ''} -> ${item.destinationLabel} (${item.startDate} até ${item.endDate})`}
                    >
                      <span className={`w-3 h-3 rounded-xs shrink-0 ${colorStyle.dot}`} />
                      <span className="truncate">
                        <strong className="text-white">{plateDisplay}</strong> ·{' '}
                        {item.isThirdPartyRental
                          ? item.thirdPartyName || item.destinationLabel
                          : item.workName || item.destinationLabel}
                      </span>
                    </span>
                  );
                })
              )}
              {monthLogisticsSchedules.some(s => Boolean(s.cargoDescription)) && (
                <span className="flex items-center gap-1.5 ml-auto text-slate-400 shrink-0">
                  <Package className="w-3.5 h-3.5" />
                  Cores individuais por programação
                </span>
              )}
            </div>
          </div>
        )}

        {/* SLIDE 2: COMPONENTE UNIFICADO — VEÍCULOS ATIVOS E MAQUINÁRIOS POR OBRA */}
        {currentSlide === 2 && (
          <TvWorkFleetUnifiedView
            works={works}
            vehicles={vehicles}
            equipments={equipments}
          />
        )}

        {/* SLIDE 3: MAPA DE ROTAS E ITINERÁRIOS POR CIDADES (OBRAS) */}
        {currentSlide === 3 && (
          <div className="flex-1 min-h-0 bg-[#0F172A] border border-slate-800 rounded-2xl p-3.5 shadow-xl flex flex-col gap-2.5 overflow-hidden animate-fade-in">
            <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-400 shrink-0">
                  <Compass className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-white font-display truncate">
                  Mapa de Rotas e Itinerários por Cidades (Obras)
                </h3>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums shrink-0 text-slate-300">
                <span className="text-blue-300 font-bold">{works.length} Cidades</span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-emerald-300 font-bold">
                  {totalKmDriven.toLocaleString('pt-BR')} km Mapeados
                </span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-purple-300 font-bold">
                  {monthLogisticsSchedules.length} Rotas no Mês
                </span>
              </div>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 overflow-hidden">
              <div className="lg:col-span-9 min-h-0 h-full">
                <LeafletRouteMap
                  works={works}
                  trips={trips}
                  logisticsSchedules={logisticsSchedules}
                  heightClass="h-full min-h-[260px]"
                />
              </div>

              <div className="lg:col-span-3 min-h-0 flex flex-col gap-2 overflow-hidden">
                <div className="shrink-0 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
                  <span className="text-[10px] font-mono font-bold text-slate-400 block">
                    Legenda do Mapa
                  </span>
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5 text-[11px] font-mono text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border-2 border-sky-400 shrink-0" />
                      <span className="truncate">Matriz (Palmas/TO)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-blue-200 shrink-0" />
                      <span className="truncate">Cidades / Obras</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 border-2 border-emerald-200 shrink-0" />
                      <span className="truncate">Itinerários de Viagens</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-violet-600 border-2 border-violet-200 shrink-0" />
                      <span className="truncate">Rotas de Logística</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-h-0 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col gap-1.5 overflow-hidden">
                  <div className="shrink-0 flex items-center justify-between text-[10px] font-mono">
                    <span className="font-bold text-slate-400">
                      Canteiros Atendidos ({works.length})
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {activeWorks.length} Ativas
                    </span>
                  </div>
                  {works.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
                      Nenhuma obra cadastrada.
                    </div>
                  ) : (
                    <div className="flex-1 min-h-0 flex flex-col gap-1.5 overflow-hidden">
                      {works.slice(0, 8).map(w => {
                        const workVehiclesCount = activeFleetVehicles.filter(v => v.workId === w.id).length;
                        const workTripsCount = trips.filter(t => t.workId === w.id).length;
                        return (
                          <div
                            key={w.id}
                            className="bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-white text-[11px] truncate" title={w.name}>
                                {w.name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono truncate">
                                {w.city}/{w.state}
                              </div>
                            </div>
                            <div className="text-right font-mono tabular-nums text-[10px] shrink-0">
                              <span className="text-sky-400 font-bold block">{workVehiclesCount}V</span>
                              <span className="text-slate-400">{workTripsCount} viag.</span>
                            </div>
                          </div>
                        );
                      })}
                      {works.length > 8 && (
                        <div className="text-[10px] font-mono text-slate-400 text-center">
                          +{works.length - 8} outras obras no mapa
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 4: CENTRAL DE MANUTENÇÕES */}
        {currentSlide === 4 && (
          <TvMaintenanceSlide vehicles={vehicles} equipments={equipments} />
        )}

        {/* SLIDE 5: QUADRO DE CUSTOS (COMPACTO 1 TELA) */}
        {currentSlide === 5 && (
          <div className="flex-1 min-h-0 bg-[#0F172A] border border-slate-800 rounded-2xl p-3.5 shadow-xl flex flex-col gap-2.5 overflow-hidden animate-fade-in">
            <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 shrink-0">
                  <DollarSign className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-white font-display truncate">
                  Quadro Financeiro de Custos — Obras Ativas ({activeWorks.length})
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums text-xs shrink-0">
                <div>
                  <span className="text-slate-400 mr-1.5">Combustível:</span>
                  <span className="font-black text-emerald-400">
                    R$ {totalActiveFuelCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <div>
                  <span className="text-slate-400 mr-1.5">Manutenção:</span>
                  <span className="font-black text-amber-400">
                    R$ {totalActiveMaintCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {activeWorks.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                Nenhuma obra ativa cadastrada no momento.
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 overflow-hidden">
                  {/* Left: Comparativo de Custos Totais em R$ */}
                  <div className="lg:col-span-5 min-h-0 bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 overflow-hidden">
                    <div className="shrink-0 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 font-mono">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        Ranking Custo Total (R$)
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">Maior Custo</span>
                    </div>

                    <div className="flex-1 min-h-0 flex flex-col justify-start gap-2 overflow-hidden">
                      {activeWorkBalances
                        .map(({ work, balance }) => {
                          const maintCost = workMaintenanceCosts.get(work.id) || 0;
                          const combinedCost = balance.totalCost + maintCost;
                          return { work, balance, maintCost, combinedCost };
                        })
                        .sort((a, b) => b.combinedCost - a.combinedCost)
                        .slice(0, 7)
                        .map((item, _, arr) => {
                          const maxCost = Math.max(...arr.map(x => x.combinedCost), 1);
                          const pct = Math.round((item.combinedCost / maxCost) * 100);
                          return (
                            <div key={item.work.id} className="space-y-0.5">
                              <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                                <span className="text-white font-bold truncate max-w-[58%]" title={item.work.name}>
                                  {item.work.name}
                                </span>
                                <span className="text-emerald-400 font-black">
                                  R$ {item.combinedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                                <div
                                  className="bg-gradient-to-r from-emerald-600 to-teal-400 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${Math.max(pct, 4)}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[9.5px] text-slate-400 font-mono tabular-nums">
                                <span>Comb: R$ {item.balance.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                                <span>Média R$ {item.balance.averageCostPerLiter.toFixed(2)}/L</span>
                                <span>Manut: R$ {item.maintCost.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Right: Cards Financeiros por Obra */}
                  <div className="lg:col-span-7 min-h-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 auto-rows-fr gap-2 overflow-hidden">
                    {activeWorkBalances.slice(0, 9).map(({ work, balance }) => {
                      const maintCost = workMaintenanceCosts.get(work.id) || 0;
                      const totalCost = balance.totalCost + maintCost;
                      return (
                        <div
                          key={work.id}
                          className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between gap-1.5 min-h-0 overflow-hidden"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-white text-xs truncate" title={work.name}>
                              {work.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              {work.city}/{work.state}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 font-mono tabular-nums text-[11px]">
                            <div className="bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-800">
                              <span className="text-[9px] text-slate-400 block">Custo Total</span>
                              <span className="text-emerald-400 font-black">
                                R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                            </div>
                            <div className="bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-800">
                              <span className="text-[9px] text-slate-400 block">Média / L</span>
                              <span className="text-amber-400 font-black">
                                R$ {balance.averageCostPerLiter.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-1 text-[9.5px] font-mono tabular-nums text-slate-300">
                            <div className="bg-sky-950/40 px-1.5 py-1 rounded border border-sky-900/50 truncate">
                              <span className="text-sky-400 font-bold block">Diesel</span>
                              <span>R$ {balance.diesel.totalCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="bg-amber-950/40 px-1.5 py-1 rounded border border-amber-900/50 truncate">
                              <span className="text-amber-400 font-bold block">Gasol.</span>
                              <span>R$ {balance.gasolina.totalCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="bg-rose-950/40 px-1.5 py-1 rounded border border-rose-900/50 truncate">
                              <span className="text-rose-400 font-bold flex items-center gap-0.5">
                                <Wrench className="w-2.5 h-2.5" /> Man.
                              </span>
                              <span>R$ {maintCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {totalGeneralMaintCost > 0 && (
                  <div className="shrink-0 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-1 text-[11px] font-mono tabular-nums text-slate-300 flex items-center justify-between">
                    <span>Manutenções Gerais (sem obra vinculada):</span>
                    <span className="text-amber-400 font-black">
                      R$ {totalGeneralMaintCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SLIDE 6: QUADRO DE COMBUSTÍVEL (COMPACTO 1 TELA) */}
        {currentSlide === 6 && (
          <div className="flex-1 min-h-0 bg-[#0F172A] border border-slate-800 rounded-2xl p-3.5 shadow-xl flex flex-col gap-2.5 overflow-hidden animate-fade-in">
            <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 shrink-0">
                  <Fuel className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-white font-display truncate">
                  Quadro de Combustível — Estoque, Entradas e Consumo por Obra
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums text-xs shrink-0">
                <div>
                  <span className="text-slate-400 mr-1.5">Saldo Tanques:</span>
                  <span className="font-black text-amber-400">
                    {totalFuelStock.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
                  </span>
                </div>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <div>
                  <span className="text-slate-400 mr-1.5">Adquirido / Consumido:</span>
                  <span className="font-black text-sky-400">
                    {totalFuelInflow.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L /{' '}
                    {totalFuelConsumed.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
                  </span>
                </div>
              </div>
            </div>

            {works.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                Nenhuma obra cadastrada.
              </div>
            ) : (
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 overflow-hidden">
                {/* Left: Gráfico Comparativo de Volume em Litros */}
                <div className="lg:col-span-5 min-h-0 bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 overflow-hidden">
                  <div className="shrink-0 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 font-mono">
                      <Fuel className="w-3.5 h-3.5 text-amber-400" />
                      Volume Adquirido vs Saldo (L)
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Maior Volume</span>
                  </div>

                  <div className="flex-1 min-h-0 flex flex-col justify-start gap-2 overflow-hidden">
                    {[...workBalances]
                      .sort((a, b) => b.totalInflowLiters - a.totalInflowLiters)
                      .slice(0, 7)
                      .map(wb => {
                        const maxLiters = Math.max(...workBalances.map(x => x.totalInflowLiters), 1);
                        const pct = Math.round((wb.totalInflowLiters / maxLiters) * 100);
                        return (
                          <div key={wb.workId} className="space-y-0.5">
                            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                              <span className="text-white font-bold truncate max-w-[58%]" title={wb.workName}>
                                {wb.workName}
                              </span>
                              <span className="text-amber-400 font-black">
                                {wb.balanceLiters.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
                              </span>
                            </div>
                            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                              <div
                                className="bg-gradient-to-r from-amber-600 to-yellow-400 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(pct, 4)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[9.5px] text-slate-400 font-mono tabular-nums">
                              <span>
                                Entradas: {wb.totalInflowLiters.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
                              </span>
                              <span>
                                Consumo: {wb.totalDispenseLiters.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Right: Cards de Tanques por Obra */}
                <div className="lg:col-span-7 min-h-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 auto-rows-fr gap-2 overflow-hidden">
                  {workBalances.slice(0, 9).map(wb => (
                    <div
                      key={wb.workId}
                      className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between gap-1.5 min-h-0 overflow-hidden"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white text-xs truncate" title={wb.workName}>
                          {wb.workName}
                        </span>
                        <span className="font-mono text-xs font-bold tabular-nums text-amber-400 shrink-0">
                          {wb.balanceLiters.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono tabular-nums text-slate-300">
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 space-y-0.5">
                          <span className="text-sky-400 block font-bold text-[10px]">Diesel</span>
                          <span className="text-white font-black text-xs block">
                            {wb.diesel.balanceLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
                          </span>
                          <div className="text-[9px] text-slate-400 truncate">
                            +{wb.diesel.inflowLiters.toLocaleString('pt-BR')} · -{wb.diesel.dispenseLiters.toLocaleString('pt-BR')}
                          </div>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 space-y-0.5">
                          <span className="text-amber-400 block font-bold text-[10px]">Gasolina</span>
                          <span className="text-white font-black text-xs block">
                            {wb.gasolina.balanceLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
                          </span>
                          <div className="text-[9px] text-slate-400 truncate">
                            +{wb.gasolina.inflowLiters.toLocaleString('pt-BR')} · -{wb.gasolina.dispenseLiters.toLocaleString('pt-BR')}
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

        {/* SLIDE 7: FROTA EM TRÂNSITO / VIAGENS ATIVAS */}
        {currentSlide === 7 && (
          <div className="flex-1 min-h-0 bg-[#0F172A] border border-slate-800 rounded-2xl p-3.5 shadow-xl flex flex-col gap-2.5 overflow-hidden animate-fade-in">
            <div className="shrink-0 flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 font-display">
                <Activity className="w-4 h-4 text-blue-400" />
                Frota em Trânsito / Viagens Ativas ({activeTrips.length})
              </h3>
              <span className="text-[10px] font-mono font-bold text-blue-400">
                Atualização em tempo real
              </span>
            </div>

            {activeTrips.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                Nenhum veículo ou motorista em viagem ativa no momento.
              </div>
            ) : (
              <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 auto-rows-fr gap-2.5 overflow-hidden">
                {activeTrips.slice(0, 12).map(trip => (
                  <div
                    key={trip.id}
                    className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between gap-2 min-h-0 overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-blue-600 text-white block truncate">
                          {trip.vehicleModelPlate}
                        </span>
                        {trip.complementVehicleModelPlate && (
                          <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 block truncate">
                            + Comp.: {trip.complementVehicleModelPlate}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono tabular-nums shrink-0 pt-0.5">
                        {trip.checkIn.time}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs min-w-0">
                      <div className="flex items-center gap-1.5 text-white font-semibold">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{trip.driverName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">
                          <strong className="text-white">{trip.checkIn.destination}</strong>
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
                          {trip.originCity || trip.checkIn.originCity || 'Palmas'}/
                          {trip.originState || trip.checkIn.originState || 'TO'} ·{' '}
                          {trip.workName || 'Geral'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                      <span>{trip.checkIn.km.toLocaleString('pt-BR')} km</span>
                      <span className="text-emerald-400 font-bold">Em Rota</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TvDashboard;
