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
    { title: 'Calendário de Logística — Próxima Semana (7 Dias)', shortLabel: 'Calendário Logística' },
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

  // Current Month & Rolling 1-Week Calendar Math (7 days from current date)
  const currentYear = currentTime.getFullYear();
  const currentMonth = currentTime.getMonth();
  const currentDay = currentTime.getDate();
  const todayStr = formatDateISO(currentTime);
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const monthStartStr = `${monthPrefix}-01`;
  const monthEndStr = `${monthPrefix}-${String(daysInCurrentMonth).padStart(2, '0')}`;

  const oneWeekDays = useMemo(() => {
    const arr: {
      day: number;
      month: number;
      year: number;
      iso: string;
      dateLabel: string;
      weekday: number;
      weekdayLabel: string;
      isWeekend: boolean;
      isToday: boolean;
    }[] = [];
    for (let offset = 0; offset < 7; offset++) {
      const dt = new Date(currentYear, currentMonth, currentDay + offset);
      const wd = dt.getDay();
      const dd = String(dt.getDate()).padStart(2, '0');
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      arr.push({
        day: dt.getDate(),
        month: dt.getMonth(),
        year: dt.getFullYear(),
        iso: formatDateISO(dt),
        dateLabel: `${dd}/${mm}`,
        weekday: wd,
        weekdayLabel: WEEKDAY_NAMES[wd],
        isWeekend: wd === 0 || wd === 6,
        isToday: offset === 0,
      });
    }
    return arr;
  }, [currentYear, currentMonth, currentDay]);

  const oneWeekStartStr = oneWeekDays[0]?.iso || todayStr;
  const oneWeekEndStr = oneWeekDays[oneWeekDays.length - 1]?.iso || todayStr;
  const oneWeekRangeLabel =
    oneWeekDays.length === 7
      ? `${oneWeekDays[0].dateLabel} a ${oneWeekDays[6].dateLabel}/${oneWeekDays[6].year}`
      : `${MONTH_NAMES[currentMonth]} de ${currentYear}`;

  const monthLogisticsSchedules = useMemo(() => {
    return logisticsSchedules
      .filter(
        s => s.scheduleStatus !== 'cancelado' && s.startDate <= monthEndStr && s.endDate >= monthStartStr
      )
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [logisticsSchedules, monthStartStr, monthEndStr]);

  const oneWeekLogisticsSchedules = useMemo(() => {
    return logisticsSchedules
      .filter(
        s => s.scheduleStatus !== 'cancelado' && s.startDate <= oneWeekEndStr && s.endDate >= oneWeekStartStr
      )
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [logisticsSchedules, oneWeekStartStr, oneWeekEndStr]);

  const scheduleColorMap = useMemo(() => {
    const map = new Map<string, { chip: string; dot: string }>();
    oneWeekLogisticsSchedules.forEach((sched, idx) => {
      map.set(sched.id, SCHEDULE_COLOR_PALETTE[idx % SCHEDULE_COLOR_PALETTE.length]);
    });
    return map;
  }, [oneWeekLogisticsSchedules]);

  const oneWeekScheduleLanes = useMemo(() => {
    if (oneWeekDays.length !== 7) return [];
    type WeekScheduleSegment = {
      item: LogisticsSchedule;
      startIdx: number;
      endIdx: number;
      span: number;
      continuesBefore: boolean;
      continuesAfter: boolean;
    };

    const segments: WeekScheduleSegment[] = [];
    oneWeekLogisticsSchedules.forEach(item => {
      let startIdx = -1;
      let endIdx = -1;
      for (let i = 0; i < 7; i++) {
        const iso = oneWeekDays[i].iso;
        if (item.startDate <= iso && item.endDate >= iso) {
          if (startIdx === -1) startIdx = i;
          endIdx = i;
        }
      }
      if (startIdx !== -1 && endIdx !== -1) {
        segments.push({
          item,
          startIdx,
          endIdx,
          span: endIdx - startIdx + 1,
          continuesBefore: item.startDate < oneWeekStartStr,
          continuesAfter: item.endDate > oneWeekEndStr,
        });
      }
    });

    segments.sort((a, b) => a.startIdx - b.startIdx || b.span - a.span);

    const lanes: { lastEndIdx: number; segments: WeekScheduleSegment[] }[] = [];
    segments.forEach(seg => {
      const targetLane = lanes.find(lane => lane.lastEndIdx < seg.startIdx);
      if (targetLane) {
        targetLane.segments.push(seg);
        targetLane.lastEndIdx = seg.endIdx;
      } else {
        lanes.push({ lastEndIdx: seg.endIdx, segments: [seg] });
      }
    });

    return lanes.map(l => l.segments);
  }, [oneWeekDays, oneWeekLogisticsSchedules, oneWeekStartStr, oneWeekEndStr]);

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
                    Frota Ativa de Veículos
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

        {/* SLIDE 1: CALENDÁRIO DE LOGÍSTICA (PRÓXIMA SEMANA - 7 DIAS) */}
        {currentSlide === 1 && (
          <div className="flex-1 min-h-0 bg-[#0F172A] border border-slate-800 rounded-2xl p-3.5 shadow-xl flex flex-col gap-2.5 overflow-hidden animate-fade-in">
            <div className="shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 shrink-0">
                  <CalendarRange className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-xl font-black text-white font-display truncate">
                    Calendário de Logística (Semana Atual) — {oneWeekRangeLabel}
                  </h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm font-mono tabular-nums shrink-0">
                <span className="text-blue-300 font-bold">
                  {oneWeekLogisticsSchedules.length} Programações
                </span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-emerald-300 font-bold">
                  {oneWeekLogisticsSchedules.filter(s => s.scheduleStatus === 'em_andamento').length} Em Andamento
                </span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-purple-300 font-bold">
                  {oneWeekLogisticsSchedules.filter(s => s.isThirdPartyRental).length} Terceiros
                </span>
                <button
                  type="button"
                  onClick={() =>
                    exportLogisticsCSV({
                      schedules: oneWeekLogisticsSchedules,
                      works,
                      vehicles,
                      monthYearLabel: oneWeekRangeLabel,
                      monthStartStr: oneWeekStartStr,
                      monthEndStr: oneWeekEndStr,
                      scopeDescription: `Painel TV - Agenda Semanal (${oneWeekRangeLabel})`,
                    })
                  }
                  disabled={oneWeekLogisticsSchedules.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/35 disabled:opacity-40 text-emerald-300 border border-emerald-500/40 font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  title="Exportar Calendário da Semana em CSV (Excel)"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exportLogisticsPDF({
                      schedules: oneWeekLogisticsSchedules,
                      works,
                      vehicles,
                      monthYearLabel: oneWeekRangeLabel,
                      monthStartStr: oneWeekStartStr,
                      monthEndStr: oneWeekEndStr,
                      scopeDescription: `Painel TV - Agenda Semanal (${oneWeekRangeLabel})`,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/50 font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  title="Exportar Calendário da Semana em PDF (Offline)"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
              {/* Cabeçalho dos 7 dias (Dia da semana + Data + Qtd) */}
              <div className="shrink-0 grid grid-cols-7 bg-slate-900 border-b border-slate-800">
                {oneWeekDays.map(d => {
                  const dayCount = oneWeekLogisticsSchedules.filter(
                    s => s.startDate <= d.iso && s.endDate >= d.iso
                  ).length;
                  return (
                    <div
                      key={d.iso}
                      className={`py-2 px-2 border-r last:border-r-0 border-slate-800 flex flex-col gap-1 ${
                        d.isToday ? 'bg-blue-950/50' : d.isWeekend ? 'bg-slate-900/80' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 font-mono">
                        <span
                          className={`text-xs sm:text-sm lg:text-base font-bold uppercase ${
                            d.isToday ? 'text-blue-300' : 'text-slate-300'
                          }`}
                        >
                          {d.weekdayLabel}
                        </span>
                        {dayCount > 0 && (
                          <span className="text-xs sm:text-sm font-mono font-bold text-slate-300">
                            {dayCount}x
                          </span>
                        )}
                      </div>
                      <div>
                        <span
                          className={`inline-block text-sm sm:text-base lg:text-lg font-mono font-black tabular-nums px-2 py-0.5 rounded ${
                            d.isToday ? 'bg-blue-600 text-white' : 'text-white'
                          }`}
                        >
                          {d.isToday ? `HOJE · ${d.dateLabel}` : d.dateLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Corpo em linha do tempo contínua alinhada entre os 7 dias */}
              <div className="relative flex-1 min-h-0 overflow-hidden">
                {/* Colunas verticais de fundo alinhadas com o cabeçalho */}
                <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                  {oneWeekDays.map(d => (
                    <div
                      key={d.iso}
                      className={`border-r last:border-r-0 border-slate-800/80 h-full ${
                        d.isToday
                          ? 'bg-blue-950/30 ring-1 ring-inset ring-blue-500/40'
                          : d.isWeekend
                          ? 'bg-slate-900/35'
                          : 'bg-slate-950/15'
                      }`}
                    />
                  ))}
                </div>

                {/* Faixas contínuas das viagens */}
                <div className="relative z-10 h-full py-2 flex flex-col gap-1.5 overflow-hidden">
                  {oneWeekScheduleLanes.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-sm sm:text-base text-slate-500 font-mono">
                      Nenhuma programação ativa para os próximos 7 dias.
                    </div>
                  ) : (
                    oneWeekScheduleLanes.map((laneSegments, laneIdx) => {
                      const isDense = oneWeekScheduleLanes.length >= 9;
                      const isCompact = oneWeekScheduleLanes.length >= 6;
                      return (
                        <div
                          key={`lane-${laneIdx}`}
                          className={`grid grid-cols-7 items-stretch min-h-0 flex-1 ${
                            isDense ? 'max-h-[44px]' : isCompact ? 'max-h-[62px]' : 'max-h-[84px]'
                          }`}
                        >
                          {laneSegments.map(seg => {
                            const { item, startIdx, span, continuesBefore, continuesAfter } = seg;
                            const plate =
                              item.vehicleModelPlate.match(/\(([^)]+)\)/)?.[1] || item.vehicleId;
                            const compPlate =
                              item.complementVehicleModelPlate?.match(/\(([^)]+)\)/)?.[1] ||
                              item.complementVehicleId;
                            const plateDisplay = compPlate ? `${plate}+${compPlate}` : plate;
                            const colorStyle =
                              scheduleColorMap.get(item.id) || SCHEDULE_COLOR_PALETTE[0];
                            const destText = item.isThirdPartyRental
                              ? item.thirdPartyName || item.destinationLabel || item.destinationCity
                              : item.workName || item.destinationLabel || item.destinationCity;
                            const detailText =
                              item.driverName || item.cargoDescription || item.destinationCity;
                            const periodBadge = `${item.startDate.slice(8, 10)}/${item.startDate.slice(5, 7)}→${item.endDate.slice(8, 10)}/${item.endDate.slice(5, 7)}`;

                            return (
                              <div
                                key={item.id}
                                style={{ gridColumn: `${startIdx + 1} / span ${span}` }}
                                className={`border flex flex-col justify-center min-w-0 overflow-hidden shadow-sm ${
                                  continuesBefore ? 'ml-0 rounded-l-none border-l-4' : 'ml-1.5 rounded-l-lg'
                                } ${
                                  continuesAfter ? 'mr-0 rounded-r-none border-r-4' : 'mr-1.5 rounded-r-lg'
                                } ${isDense ? 'px-2 py-0.5' : 'px-3 py-1.5'} ${colorStyle.chip}`}
                                title={`${plate}${compPlate ? ` + ${compPlate} (Complemento)` : ''} | ${item.destinationLabel} (${item.destinationCity}/${item.destinationState}) | ${periodBadge}${
                                  item.cargoDescription ? ` | Carga: ${item.cargoDescription}` : ''
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 min-w-0">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {continuesBefore && (
                                      <span className="text-[11px] font-mono font-black opacity-80 shrink-0">
                                        ◀
                                      </span>
                                    )}
                                    <span
                                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${colorStyle.dot}`}
                                    />
                                    <span
                                      className={`font-mono font-black text-white truncate ${
                                        isDense ? 'text-xs sm:text-sm' : 'text-sm sm:text-base lg:text-lg'
                                      }`}
                                    >
                                      {plateDisplay}
                                    </span>
                                    {destText && (
                                      <span
                                        className={`font-bold truncate ${
                                          isDense ? 'text-xs' : 'text-xs sm:text-sm lg:text-base'
                                        }`}
                                      >
                                        · {destText}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {span >= 2 && (
                                      <span className="hidden sm:inline text-[11px] font-mono font-bold opacity-85 tabular-nums">
                                        {periodBadge}
                                      </span>
                                    )}
                                    {continuesAfter && (
                                      <span className="text-[11px] font-mono font-black opacity-80">
                                        ▶
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {!isDense && detailText && detailText !== destText && (
                                  <div className="text-xs sm:text-sm opacity-90 truncate leading-tight pl-4">
                                    {detailText}
                                    {item.cargoDescription && item.driverName
                                      ? ` · ${item.cargoDescription}`
                                      : ''}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Legenda individual de todas as programações da semana por cor */}
            <div className="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-300 font-mono">
              {oneWeekLogisticsSchedules.length === 0 ? (
                <span className="text-slate-500">Nenhuma programação ativa para os próximos 7 dias.</span>
              ) : (
                oneWeekLogisticsSchedules.map(item => {
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
              {oneWeekLogisticsSchedules.some(s => Boolean(s.cargoDescription)) && (
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
