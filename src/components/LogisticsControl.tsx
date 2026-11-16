import React, { useState, useMemo } from 'react';
import {
  CalendarRange,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Pencil,
  Trash2,
  X,
  Calendar as CalendarIcon,
  List,
  Columns,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import {
  Vehicle,
  ConstructionWork,
  User,
  LogisticsSchedule,
  LogisticsAllocationType,
  LogisticsScheduleStatus
} from '../types';
import { FleetStore } from '../store/fleetStore';

interface LogisticsControlProps {
  currentUser: User | null;
  vehicles: Vehicle[];
  works: ConstructionWork[];
  users: User[];
  schedules: LogisticsSchedule[];
  store: FleetStore;
  onNavigateToVehicles?: () => void;
}

const BRAZILIAN_UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateBR(isoDate: string): string {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getDaysDiff(start: string, end: string): number {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diff);
}

const ALLOCATION_LABELS: Record<LogisticsAllocationType, string> = {
  uso_programado: 'Uso Programado',
  viagem: 'Uso Programado',
  obra: 'Uso Programado',
  cidade: 'Uso Programado',
  terceiros: 'Uso Programado'
};

const STATUS_LABELS: Record<LogisticsScheduleStatus, string> = {
  programado: 'Programado',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado'
};

export function LogisticsControl({
  currentUser,
  vehicles,
  works,
  users,
  schedules,
  store,
  onNavigateToVehicles
}: LogisticsControlProps) {
  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'gerencial';
  const todayStr = formatDateISO(new Date());

  // Monitored vehicles (with Controle de Logística enabled)
  const logisticsVehicles = useMemo(
    () => vehicles.filter(v => v.hasLogisticsControl && v.status !== 'inactive'),
    [vehicles]
  );

  // View & Calendar Month states
  const [viewMode, setViewMode] = useState<'matrix' | 'month' | 'list'>('matrix');
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Filters
  const [filterVehicleId, setFilterVehicleId] = useState<string>('all');
  const [filterLinkType, setFilterLinkType] = useState<'all' | 'obra' | 'livre'>('all');
  const [filterRental, setFilterRental] = useState<'all' | 'rented' | 'own'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Quick activate panel when no vehicles or admin wants to add more
  const [showEnableVehicles, setShowEnableVehicles] = useState(false);

  // Modal Form states
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<LogisticsSchedule | null>(null);
  const [formVehicleId, setFormVehicleId] = useState('');
  const [formScheduleStatus, setFormScheduleStatus] = useState<LogisticsScheduleStatus>('programado');
  const [formOriginMode, setFormOriginMode] = useState<'obra' | 'livre'>('livre');
  const [formOriginWorkId, setFormOriginWorkId] = useState('');
  const [formOriginLabel, setFormOriginLabel] = useState('');
  const [formOriginCity, setFormOriginCity] = useState('');
  const [formOriginState, setFormOriginState] = useState('');
  const [formDestMode, setFormDestMode] = useState<'obra' | 'livre'>('obra');
  const [formWorkId, setFormWorkId] = useState('');
  const [formDestLabel, setFormDestLabel] = useState('');
  const [formDestCity, setFormDestCity] = useState('');
  const [formDestState, setFormDestState] = useState('');
  const [formIsThirdParty, setFormIsThirdParty] = useState(false);
  const [formThirdPartyName, setFormThirdPartyName] = useState('');
  const [formCargoDescription, setFormCargoDescription] = useState('');
  const [formStartDate, setFormStartDate] = useState(todayStr);
  const [formEndDate, setFormEndDate] = useState(todayStr);
  const [formDriverId, setFormDriverId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const suggestedCities = useMemo(
    () =>
      Array.from(
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
      ),
    [works]
  );

  // Calendar Month Math
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay(); // 0 = Sun
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthStartStr = `${monthPrefix}-01`;
  const monthEndStr = `${monthPrefix}-${String(daysInMonth).padStart(2, '0')}`;

  const monthDays = useMemo(() => {
    const arr: { day: number; iso: string; weekday: number; isWeekend: boolean }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      const wd = dt.getDay();
      arr.push({
        day: d,
        iso: formatDateISO(dt),
        weekday: wd,
        isWeekend: wd === 0 || wd === 6
      });
    }
    return arr;
  }, [year, month, daysInMonth]);

  // Filtered Schedules
  const filteredSchedules = useMemo(() => {
    return schedules
      .filter(s => {
        if (filterVehicleId !== 'all' && s.vehicleId !== filterVehicleId) return false;
        if (filterLinkType === 'obra' && !s.workId) return false;
        if (filterLinkType === 'livre' && Boolean(s.workId)) return false;
        if (filterRental === 'rented' && !s.isThirdPartyRental) return false;
        if (filterRental === 'own' && s.isThirdPartyRental) return false;
        if (filterStatus !== 'all' && s.scheduleStatus !== filterStatus) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const match =
            s.vehicleModelPlate.toLowerCase().includes(q) ||
            s.destinationLabel.toLowerCase().includes(q) ||
            s.destinationCity.toLowerCase().includes(q) ||
            s.destinationState.toLowerCase().includes(q) ||
            (s.originWorkName && s.originWorkName.toLowerCase().includes(q)) ||
            (s.originLabel && s.originLabel.toLowerCase().includes(q)) ||
            (s.originCity && s.originCity.toLowerCase().includes(q)) ||
            (s.originState && s.originState.toLowerCase().includes(q)) ||
            (s.workName && s.workName.toLowerCase().includes(q)) ||
            (s.programDescription && s.programDescription.toLowerCase().includes(q)) ||
            (s.cargoDescription && s.cargoDescription.toLowerCase().includes(q)) ||
            (s.thirdPartyName && s.thirdPartyName.toLowerCase().includes(q)) ||
            (s.driverName && s.driverName.toLowerCase().includes(q));
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [schedules, filterVehicleId, filterLinkType, filterRental, filterStatus, searchQuery]);

  // KPI Metrics
  const kpis = useMemo(() => {
    const activeOrPlanned = schedules.filter(
      s => s.scheduleStatus === 'programado' || s.scheduleStatus === 'em_andamento'
    );
    const inMonth = schedules.filter(
      s => s.scheduleStatus !== 'cancelado' && s.startDate <= monthEndStr && s.endDate >= monthStartStr
    );
    const workLinked = activeOrPlanned.filter(s => Boolean(s.workId));
    const rentedVehicles = new Set(
      activeOrPlanned
        .filter(s => s.isThirdPartyRental || s.allocationType === 'terceiros')
        .map(s => s.vehicleId)
    );
    return {
      monitoredCount: logisticsVehicles.length,
      totalActiveVehicles: vehicles.filter(v => v.status !== 'inactive').length,
      inMonthCount: inMonth.length,
      workLinkedCount: workLinked.length,
      rentedCount: rentedVehicles.size
    };
  }, [schedules, logisticsVehicles, vehicles, monthStartStr, monthEndStr]);

  // Helper: get active/current schedule for a vehicle on a given date
  const getVehicleSchedulesOnDate = (vehicleId: string, dateIso: string) => {
    return filteredSchedules.filter(
      s =>
        s.vehicleId === vehicleId &&
        s.scheduleStatus !== 'cancelado' &&
        s.startDate <= dateIso &&
        s.endDate >= dateIso
    );
  };

  // Modal Openers
  const openCreateModal = (prefillVehicleId?: string, prefillDate?: string) => {
    setEditingSchedule(null);
    setFormVehicleId(prefillVehicleId || logisticsVehicles[0]?.id || '');
    setFormScheduleStatus('programado');
    setFormOriginMode('livre');
    setFormOriginWorkId('');
    setFormOriginLabel('');
    setFormOriginCity('');
    setFormOriginState('');
    setFormDestMode('obra');
    setFormWorkId('');
    setFormDestLabel('');
    setFormDestCity('');
    setFormDestState('');
    setFormIsThirdParty(false);
    setFormThirdPartyName('');
    setFormCargoDescription('');
    setFormStartDate(prefillDate || todayStr);
    setFormEndDate(prefillDate || todayStr);
    setFormDriverId('');
    setFormNotes('');
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (schedule: LogisticsSchedule) => {
    setEditingSchedule(schedule);
    setFormVehicleId(schedule.vehicleId);
    setFormScheduleStatus(schedule.scheduleStatus);
    const hasOriginWork = Boolean(schedule.originWorkId);
    setFormOriginMode(hasOriginWork ? 'obra' : 'livre');
    setFormOriginWorkId(schedule.originWorkId || '');
    setFormOriginLabel(schedule.originWorkName || schedule.originLabel || '');
    setFormOriginCity(schedule.originCity || '');
    setFormOriginState(schedule.originState || '');

    const hasDestWork = Boolean(schedule.workId);
    setFormDestMode(hasDestWork ? 'obra' : 'livre');
    setFormWorkId(schedule.workId || '');
    setFormDestLabel(schedule.workName || schedule.destinationLabel);
    setFormDestCity(schedule.destinationCity);
    setFormDestState(schedule.destinationState);

    setFormIsThirdParty(Boolean(schedule.isThirdPartyRental));
    setFormThirdPartyName(schedule.thirdPartyName || '');
    setFormCargoDescription(schedule.cargoDescription || '');
    setFormStartDate(schedule.startDate);
    setFormEndDate(schedule.endDate);
    setFormDriverId(schedule.driverId || '');
    setFormNotes(schedule.notes || '');
    setFormError('');
    setShowModal(true);
  };

  const handleOriginWorkChange = (workId: string) => {
    setFormOriginWorkId(workId);
    if (workId) {
      const w = works.find(item => item.id === workId);
      if (w) {
        setFormOriginLabel(w.name);
        setFormOriginCity(w.city || '');
        setFormOriginState(w.state || '');
      }
    } else {
      setFormOriginLabel('');
      setFormOriginCity('');
      setFormOriginState('');
    }
  };

  const handleDestWorkChange = (workId: string) => {
    setFormWorkId(workId);
    if (workId) {
      const w = works.find(item => item.id === workId);
      if (w) {
        setFormDestLabel(w.name);
        setFormDestCity(w.city || '');
        setFormDestState(w.state || '');
      }
    } else {
      setFormDestLabel('');
      setFormDestCity('');
      setFormDestState('');
    }
  };

  const autoMatchStateFromCity = (cityName: string, setter: (uf: string) => void) => {
    const clean = cityName.trim().toLowerCase();
    if (!clean) return;
    const matched = works.find(w => w.city?.toLowerCase() === clean);
    if (matched?.state) {
      setter(matched.state);
    } else if (
      [
        'palmas', 'araguaína', 'araguaina', 'gurupi', 'porto nacional',
        'paraíso do tocantins', 'paraiso do tocantins', 'colinas do tocantins',
        'guaraí', 'guarai', 'dianópolis', 'dianopolis', 'miracema do tocantins'
      ].includes(clean)
    ) {
      setter('TO');
    }
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formVehicleId) {
      setFormError('Selecione um veículo habilitado no Controle de Logística.');
      return;
    }
    if (!formStartDate || !formEndDate) {
      setFormError('Informe a data inicial e a data final.');
      return;
    }
    if (formEndDate < formStartDate) {
      setFormError('A data final deve ser igual ou posterior à data inicial.');
      return;
    }

    // Validate Origin
    if (formOriginMode === 'obra' && !formOriginWorkId) {
      setFormError('Selecione a obra cadastrada de origem.');
      return;
    }
    if (formOriginMode === 'livre' && (!formOriginLabel.trim() || !formOriginCity.trim() || !formOriginState.trim())) {
      setFormError('Na origem livre, informe a descrição livre, cidade e estado (UF).');
      return;
    }
    if (!formOriginCity.trim() || !formOriginState.trim()) {
      setFormError('Informe a cidade e o estado (UF) da origem.');
      return;
    }

    // Validate Destination
    if (formDestMode === 'obra' && !formWorkId) {
      setFormError('Selecione a obra cadastrada de destino.');
      return;
    }
    if (formDestMode === 'livre' && (!formDestLabel.trim() || !formDestCity.trim() || !formDestState.trim())) {
      setFormError('No destino livre, informe a descrição do destino, cidade e estado (UF).');
      return;
    }
    if (!formDestCity.trim() || !formDestState.trim()) {
      setFormError('Informe a cidade e o estado (UF) do destino.');
      return;
    }

    if (!formCargoDescription.trim()) {
      setFormError('Informe o que é a carga (ou clique em "Sem carga").');
      return;
    }
    if (formIsThirdParty && !formThirdPartyName.trim()) {
      setFormError('Informe o nome do terceiro/cliente para locação.');
      return;
    }

    if (editingSchedule) {
      const matchedOriginWork = formOriginMode === 'obra' && formOriginWorkId ? works.find(w => w.id === formOriginWorkId) : undefined;
      const matchedDestWork = formDestMode === 'obra' && formWorkId ? works.find(w => w.id === formWorkId) : undefined;
      const matchedDriver = formDriverId ? users.find(u => u.id === formDriverId) : undefined;
      const res = store.updateLogisticsSchedule({
        ...editingSchedule,
        vehicleId: formVehicleId,
        allocationType: 'uso_programado',
        scheduleStatus: formScheduleStatus,
        isThirdPartyRental: Boolean(formIsThirdParty),
        thirdPartyName: formIsThirdParty ? formThirdPartyName.trim() || undefined : undefined,
        workId: matchedDestWork?.id,
        workName: matchedDestWork?.name,
        programDescription: undefined,
        originWorkId: matchedOriginWork?.id,
        originWorkName: matchedOriginWork?.name,
        originLabel: matchedOriginWork ? matchedOriginWork.name : formOriginLabel.trim(),
        originCity: formOriginCity.trim(),
        originState: formOriginState.trim().toUpperCase(),
        destinationLabel: matchedDestWork ? matchedDestWork.name : formDestLabel.trim(),
        destinationCity: formDestCity.trim(),
        destinationState: formDestState.trim().toUpperCase(),
        cargoDescription: formCargoDescription.trim(),
        startDate: formStartDate,
        endDate: formEndDate,
        driverId: matchedDriver?.id,
        driverName: matchedDriver?.name,
        notes: formNotes.trim() || undefined
      });
      if (res.success) {
        setShowModal(false);
        setFeedbackMsg(res.message);
        setTimeout(() => setFeedbackMsg(''), 3500);
      } else {
        setFormError(res.message);
      }
    } else {
      const res = store.addLogisticsSchedule({
        vehicleId: formVehicleId,
        allocationType: 'uso_programado',
        scheduleStatus: formScheduleStatus,
        isThirdPartyRental: Boolean(formIsThirdParty),
        thirdPartyName: formIsThirdParty ? formThirdPartyName.trim() || undefined : undefined,
        workId: formDestMode === 'obra' ? formWorkId || undefined : undefined,
        originWorkId: formOriginMode === 'obra' ? formOriginWorkId || undefined : undefined,
        originLabel: formOriginLabel.trim(),
        originCity: formOriginCity.trim(),
        originState: formOriginState.trim().toUpperCase(),
        destinationLabel: formDestLabel.trim(),
        destinationCity: formDestCity.trim(),
        destinationState: formDestState.trim().toUpperCase(),
        cargoDescription: formCargoDescription.trim(),
        startDate: formStartDate,
        endDate: formEndDate,
        driverId: formDriverId || undefined,
        notes: formNotes.trim() || undefined
      });
      if (res.success) {
        setShowModal(false);
        setFeedbackMsg(res.message);
        setTimeout(() => setFeedbackMsg(''), 3500);
      } else {
        setFormError(res.message);
      }
    }
  };

  const handleDeleteSchedule = (id: string) => {
    const res = store.deleteLogisticsSchedule(id);
    setConfirmDeleteId(null);
    if (res.success) {
      setFeedbackMsg(res.message);
      setTimeout(() => setFeedbackMsg(''), 3000);
    }
  };

  const getScheduleVisualStyle = (s: LogisticsSchedule) => {
    if (s.scheduleStatus === 'cancelado') {
      return {
        bg: 'bg-slate-100 text-slate-500 border-slate-300 line-through',
        tag: 'Cancelado'
      };
    }
    if (s.isThirdPartyRental || s.allocationType === 'terceiros') {
      return {
        bg: 'bg-violet-50 text-violet-900 border-violet-300',
        tag: 'Locado Terceiros'
      };
    }
    if (s.workId) {
      return {
        bg: 'bg-emerald-50 text-emerald-900 border-emerald-300',
        tag: 'Uso Programado · Obra'
      };
    }
    return {
      bg: 'bg-blue-50 text-blue-900 border-blue-300',
      tag: 'Uso Programado'
    };
  };

  const displayedMatrixVehicles = useMemo(() => {
    if (filterVehicleId !== 'all') {
      return logisticsVehicles.filter(v => v.id === filterVehicleId);
    }
    return logisticsVehicles;
  }, [logisticsVehicles, filterVehicleId]);

  const driversList = useMemo(
    () => users.filter(u => u.isActive && u.role !== 'abastecedor'),
    [users]
  );

  return (
    <div id="logistics_control_view" className="space-y-6">
      {/* Header Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>Operações</span>
            <span aria-hidden="true">/</span>
            <span>Programação de Frota</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-display">
            Controle de Logística
          </h2>
          <p className="text-sm text-slate-500">
            Programação de viagens, permanência de veículos em obras ou cidades, status de locação para terceiros e calendário de destinos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {canManage && (
            <button
              type="button"
              onClick={() => setShowEnableVehicles(!showEnableVehicles)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Gerenciar Veículos ({logisticsVehicles.length})
            </button>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => openCreateModal()}
              disabled={logisticsVehicles.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              Nova Programação
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Quick Vehicle Logistics Toggle Panel (Admin / Gerencial) */}
      {showEnableVehicles && canManage && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Veículos Habilitados para Controle de Logística
              </h3>
              <p className="text-xs text-slate-500">
                Ative ou desative quais veículos da frota participam da programação e do quadro calendário.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowEnableVehicles(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {vehicles.filter(v => v.status !== 'inactive').map(v => {
              const enabled = Boolean(v.hasLogisticsControl);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => store.toggleVehicleLogisticsControl(v.id, !enabled)}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    enabled
                      ? 'bg-blue-50/60 border-blue-300 text-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-white'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-bold text-slate-900">{v.plate}</div>
                    <div className="text-xs truncate">{v.brand} {v.model}</div>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded border whitespace-nowrap shrink-0 ${
                    enabled
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-500 border-slate-200'
                  }`}>
                    {enabled ? 'Ativo' : 'Ativar'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
          <span className="text-xs font-medium text-slate-500 block">Veículos Monitorados</span>
          <div className="text-2xl font-bold text-slate-900 tabular-nums font-mono">
            {kpis.monitoredCount} <span className="text-xs font-normal text-slate-400">/ {kpis.totalActiveVehicles}</span>
          </div>
          <span className="text-xs text-slate-500 block">Com controle de logística ativo</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
          <span className="text-xs font-medium text-slate-500 block">Agenda de {MONTH_NAMES[month]}</span>
          <div className="text-2xl font-bold text-blue-700 tabular-nums font-mono">{kpis.inMonthCount}</div>
          <span className="text-xs text-slate-500 block">Destinos programados no mês</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
          <span className="text-xs font-medium text-slate-500 block">Com Obra Vinculada</span>
          <div className="text-2xl font-bold text-emerald-700 tabular-nums font-mono">{kpis.workLinkedCount}</div>
          <span className="text-xs text-slate-500 block">Alocações ativas ou futuras em obras</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
          <span className="text-xs font-medium text-slate-500 block">Locados para Terceiros</span>
          <div className="text-2xl font-bold text-violet-700 tabular-nums font-mono">{kpis.rentedCount}</div>
          <span className="text-xs text-slate-500 block">Veículos em locação externa</span>
        </div>
      </div>

      {/* Empty State if no vehicles have Logistics Control enabled */}
      {logisticsVehicles.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3">
          <CalendarRange className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">
            Nenhum veículo com Controle de Logística habilitado
          </h3>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            No cadastro de veículos, marque a opção <strong className="text-slate-700">"Sim, possui Controle de Logística"</strong> para que os veículos apareçam neste módulo e no quadro calendário.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {canManage && (
              <button
                type="button"
                onClick={() => setShowEnableVehicles(true)}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
              >
                Habilitar Veículos Agora
              </button>
            )}
            {onNavigateToVehicles && currentUser?.role === 'admin' && (
              <button
                type="button"
                onClick={onNavigateToVehicles}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Ir para Cadastro de Veículos
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Current Status Strip per Monitored Vehicle (includes Third-Party Rental Status) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Situação Atual e Locação para Terceiros ({formatDateBR(todayStr)})
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="text-emerald-700 font-medium">Uso Programado · Obra</span>
                <span aria-hidden="true">·</span>
                <span className="text-blue-700 font-medium">Uso Programado · Descrição Livre</span>
                <span aria-hidden="true">·</span>
                <span className="text-violet-700 font-medium">Locado p/ Terceiros</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {logisticsVehicles.map(v => {
                const todaySchedules = schedules.filter(
                  s =>
                    s.vehicleId === v.id &&
                    s.scheduleStatus !== 'cancelado' &&
                    s.scheduleStatus !== 'concluido' &&
                    s.startDate <= todayStr &&
                    s.endDate >= todayStr
                );
                const nextSchedule = schedules
                  .filter(
                    s =>
                      s.vehicleId === v.id &&
                      s.scheduleStatus !== 'cancelado' &&
                      s.scheduleStatus !== 'concluido' &&
                      s.startDate > todayStr
                  )
                  .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

                const activeS = todaySchedules[0];
                const isRented = Boolean(activeS?.isThirdPartyRental || activeS?.allocationType === 'terceiros');

                return (
                  <div
                    key={v.id}
                    className={`border rounded-xl p-3.5 flex flex-col justify-between gap-2.5 ${
                      isRented
                        ? 'bg-violet-50/50 border-violet-200'
                        : activeS
                        ? 'bg-slate-50/70 border-slate-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900">{v.plate}</span>
                          <span className="text-slate-300" aria-hidden="true">·</span>
                          <span className="text-xs font-semibold text-slate-700 truncate">{v.brand} {v.model}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                          {activeS ? (
                            isRented ? (
                              <>
                                <div className="text-violet-800 font-semibold">
                                  Locado para Terceiros: {activeS.thirdPartyName || activeS.destinationLabel} ({activeS.destinationCity}/{activeS.destinationState})
                                </div>
                                {activeS.cargoDescription && (
                                  <div className="text-[11px] text-slate-600">Carga: {activeS.cargoDescription}</div>
                                )}
                              </>
                            ) : (
                              <>
                                <div className="text-slate-700 font-medium">
                                  {ALLOCATION_LABELS[activeS.allocationType]}: {activeS.workName || activeS.programDescription || activeS.destinationLabel} ({activeS.destinationCity}/{activeS.destinationState})
                                </div>
                                {activeS.cargoDescription && (
                                  <div className="text-[11px] text-slate-600">Carga: {activeS.cargoDescription}</div>
                                )}
                              </>
                            )
                          ) : nextSchedule ? (
                            <span>
                              Próximo destino ({formatDateBR(nextSchedule.startDate)}): {nextSchedule.destinationCity}/{nextSchedule.destinationState}
                            </span>
                          ) : (
                            <span>Disponível na base · Sem destino ativo hoje</span>
                          )}
                        </div>
                      </div>

                      {canManage && (
                        <button
                          type="button"
                          onClick={() => openCreateModal(v.id, todayStr)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          Programar
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 tabular-nums">
                      <span>
                        {activeS
                          ? `Período: ${formatDateBR(activeS.startDate)} a ${formatDateBR(activeS.endDate)}`
                          : 'Aguardando programação'}
                      </span>
                      <span className={`font-semibold ${isRented ? 'text-violet-700' : activeS ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {isRented ? 'Terceiros' : activeS ? 'Uso Próprio' : 'Livre'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Toolbar: View Switcher + Month Controls + Filters */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* View Switcher */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start">
                <button
                  type="button"
                  onClick={() => setViewMode('matrix')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    viewMode === 'matrix'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  Quadro por Veículo
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('month')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    viewMode === 'month'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  Calendário Mensal
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    viewMode === 'list'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  Lista ({filteredSchedules.length})
                </button>
              </div>

              {/* Month Navigation */}
              {viewMode !== 'list' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentMonthDate(new Date(year, month - 1, 1))}
                    className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 cursor-pointer"
                    aria-label="Mês anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="min-w-[150px] text-center text-sm font-bold text-slate-900 tabular-nums">
                    {MONTH_NAMES[month]} {year}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentMonthDate(new Date(year, month + 1, 1))}
                    className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 cursor-pointer"
                    aria-label="Próximo mês"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      setCurrentMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    Hoje
                  </button>
                </div>
              )}
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar obra, destino, cidade, carga..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <select
                value={filterVehicleId}
                onChange={(e) => setFilterVehicleId(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 cursor-pointer"
              >
                <option value="all">Todos os Veículos ({logisticsVehicles.length})</option>
                {logisticsVehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.plate} - {v.brand} {v.model}
                  </option>
                ))}
              </select>

              <select
                value={filterLinkType}
                onChange={(e) => setFilterLinkType(e.target.value as 'all' | 'obra' | 'livre')}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 cursor-pointer"
              >
                <option value="all">Vínculo: Todos</option>
                <option value="obra">Somente Obra Vinculada</option>
                <option value="livre">Somente Descrição Livre</option>
              </select>

              <select
                value={filterRental}
                onChange={(e) => setFilterRental(e.target.value as 'all' | 'rented' | 'own')}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 cursor-pointer"
              >
                <option value="all">Locação: Todos</option>
                <option value="rented">Somente Locados p/ Terceiros</option>
                <option value="own">Somente Uso Próprio</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 cursor-pointer"
              >
                <option value="all">Todos os Status</option>
                <option value="programado">Programado</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          {/* VIEW 1: QUADRO CALENDÁRIO POR VEÍCULO (MATRIZ VEÍCULOS × DIAS) */}
          {viewMode === 'matrix' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="sticky left-0 z-10 bg-slate-50 text-left px-4 py-3 font-bold text-slate-700 border-r border-slate-200 min-w-[200px]">
                        Veículo / Frota
                      </th>
                      {monthDays.map(d => {
                        const isToday = d.iso === todayStr;
                        return (
                          <th
                            key={d.iso}
                            className={`px-1 py-2 text-center font-mono border-r border-slate-100 min-w-[78px] ${
                              isToday
                                ? 'bg-blue-50 text-blue-700 font-bold'
                                : d.isWeekend
                                ? 'bg-slate-100/70 text-slate-500'
                                : 'text-slate-600'
                            }`}
                          >
                            <div className="text-[11px] tabular-nums">{String(d.day).padStart(2, '0')}</div>
                            <div className="text-[9px] font-sans font-medium">{WEEKDAY_NAMES[d.weekday]}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {displayedMatrixVehicles.map(vehicle => (
                      <tr key={vehicle.id} className="hover:bg-slate-50/40">
                        <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r border-slate-200 align-top">
                          <div className="font-mono font-bold text-slate-900 text-xs">{vehicle.plate}</div>
                          <div className="text-[11px] text-slate-600 truncate max-w-[170px]">
                            {vehicle.brand} {vehicle.model}
                          </div>
                          {vehicle.workName && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[170px] mt-0.5">
                              Base: {vehicle.workName}
                            </div>
                          )}
                        </td>

                        {monthDays.map(d => {
                          const dayItems = getVehicleSchedulesOnDate(vehicle.id, d.iso);
                          const isToday = d.iso === todayStr;
                          return (
                            <td
                              key={d.iso}
                              onClick={() => {
                                if (dayItems.length === 0 && canManage) {
                                  openCreateModal(vehicle.id, d.iso);
                                }
                              }}
                              className={`p-1 border-r border-slate-100 align-top h-[64px] transition-colors ${
                                isToday ? 'bg-blue-50/30' : d.isWeekend ? 'bg-slate-50/60' : ''
                              } ${dayItems.length === 0 && canManage ? 'hover:bg-blue-50/60 cursor-pointer' : ''}`}
                              title={dayItems.length === 0 && canManage ? `Clique para programar ${vehicle.plate} em ${formatDateBR(d.iso)}` : undefined}
                            >
                              <div className="space-y-1">
                                {dayItems.map(item => {
                                  const st = getScheduleVisualStyle(item);
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (canManage) openEditModal(item);
                                      }}
                                      className={`w-full text-left px-1.5 py-1 rounded border text-[10px] leading-tight transition-opacity hover:opacity-90 ${st.bg} ${canManage ? 'cursor-pointer' : 'cursor-default'}`}
                                      title={`${ALLOCATION_LABELS[item.allocationType]}: ${item.workName || item.programDescription || item.destinationLabel} (${item.destinationCity}/${item.destinationState})${item.cargoDescription ? ` | Carga: ${item.cargoDescription}` : ''}${item.isThirdPartyRental && item.thirdPartyName ? ` | Locado para: ${item.thirdPartyName}` : ''}`}
                                    >
                                      <div className="font-bold truncate">
                                        {item.isThirdPartyRental
                                          ? `Loc: ${item.thirdPartyName || item.destinationLabel}`
                                          : item.workName || item.programDescription || item.destinationLabel}
                                      </div>
                                      <div className="text-[9px] opacity-85 truncate">
                                        {item.destinationCity}/{item.destinationState}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: CALENDÁRIO MENSAL CLÁSSICO (DOM - SÁB) */}
          {viewMode === 'month' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                {WEEKDAY_NAMES.map(wd => (
                  <div key={wd} className="py-2.5 text-center text-xs font-bold text-slate-600 border-r last:border-r-0 border-slate-200">
                    {wd}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: firstWeekday }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="min-h-[120px] bg-slate-50/50 border-r border-b border-slate-100" />
                ))}
                {monthDays.map(d => {
                  const isToday = d.iso === todayStr;
                  const daySchedules = filteredSchedules.filter(
                    s => s.scheduleStatus !== 'cancelado' && s.startDate <= d.iso && s.endDate >= d.iso
                  );
                  return (
                    <div
                      key={d.iso}
                      className={`min-h-[120px] p-2 border-r border-b border-slate-100 flex flex-col gap-1.5 ${
                        isToday ? 'bg-blue-50/35' : d.isWeekend ? 'bg-slate-50/40' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-mono font-bold tabular-nums ${
                          isToday ? 'bg-blue-600 text-white px-1.5 py-0.5 rounded' : 'text-slate-700'
                        }`}>
                          {String(d.day).padStart(2, '0')}
                        </span>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => openCreateModal(undefined, d.iso)}
                            className="text-[11px] font-bold text-slate-400 hover:text-blue-600 px-1 rounded cursor-pointer"
                            title={`Programar em ${formatDateBR(d.iso)}`}
                          >
                            +
                          </button>
                        )}
                      </div>

                      <div className="space-y-1 overflow-y-auto max-h-[115px]">
                        {daySchedules.map(item => {
                          const st = getScheduleVisualStyle(item);
                          const plate = item.vehicleModelPlate.match(/\(([^)]+)\)/)?.[1] || item.vehicleId;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => { if (canManage) openEditModal(item); }}
                              className={`w-full text-left px-2 py-1 rounded border text-[10px] leading-tight ${st.bg} ${canManage ? 'cursor-pointer' : 'cursor-default'}`}
                              title={`${plate} - ${item.workName || item.programDescription || item.destinationLabel} (${item.destinationCity}/${item.destinationState})${item.cargoDescription ? ` | Carga: ${item.cargoDescription}` : ''}`}
                            >
                              <div className="font-bold truncate">
                                <span className="font-mono">{plate}</span> · {item.destinationCity}/{item.destinationState}
                              </div>
                              <div className="text-[9px] truncate opacity-85">
                                {item.isThirdPartyRental
                                  ? `Locado: ${item.thirdPartyName || item.destinationLabel}`
                                  : item.workName || item.programDescription || item.destinationLabel}
                              </div>
                              {item.cargoDescription && (
                                <div className="text-[9px] truncate opacity-75">
                                  Carga: {item.cargoDescription}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 3: LISTA DETALHADA DE PROGRAMAÇÕES */}
          {viewMode === 'list' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              {filteredSchedules.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <CalendarRange className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-800">Nenhuma programação encontrada</p>
                  <p className="text-xs text-slate-500">
                    Ajuste os filtros ou cadastre uma nova programação de viagem, permanência ou locação.
                  </p>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => openCreateModal()}
                      className="mt-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer"
                    >
                      Cadastrar Programação
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="px-4 py-3">Veículo</th>
                        <th className="px-4 py-3">Finalidade & Locação</th>
                        <th className="px-4 py-3">Origem</th>
                        <th className="px-4 py-3">Destino & Carga</th>
                        <th className="px-4 py-3">Período</th>
                        <th className="px-4 py-3">Status</th>
                        {canManage && <th className="px-4 py-3 text-right">Ações</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSchedules.map(item => {
                        const st = getScheduleVisualStyle(item);
                        const daysCount = getDaysDiff(item.startDate, item.endDate);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              <div>{item.vehicleModelPlate}</div>
                              {item.driverName && (
                                <div className="text-[11px] font-normal text-slate-500">
                                  Condutor: {item.driverName}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold ${st.bg}`}>
                                {ALLOCATION_LABELS[item.allocationType]}
                              </span>
                              {item.isThirdPartyRental && (
                                <div className="text-[11px] text-violet-700 font-semibold mt-1">
                                  Locatário: {item.thirdPartyName || 'Terceiros'}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              <div className="font-semibold text-slate-900">
                                {item.originWorkName ? `Obra: ${item.originWorkName}` : (item.originLabel || '-')}
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium">
                                {item.originCity || '-'}/{item.originState || '--'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              <div className="font-semibold text-slate-900">
                                {item.workName ? `Obra: ${item.workName}` : item.destinationLabel}
                              </div>
                              <div className="text-[11px] text-blue-700 font-medium">
                                {item.destinationCity}/{item.destinationState}
                              </div>
                              {item.cargoDescription && (
                                <div className="text-[11px] text-slate-600 mt-0.5">
                                  <span className="font-semibold">Carga:</span> {item.cargoDescription}
                                </div>
                              )}
                              {item.notes && (
                                <div className="text-[11px] text-slate-500 italic mt-0.5 max-w-xs truncate">
                                  {item.notes}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                              <div>{formatDateBR(item.startDate)} → {formatDateBR(item.endDate)}</div>
                              <div className="text-[11px] text-slate-400">
                                {daysCount} {daysCount === 1 ? 'dia' : 'dias'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {canManage ? (
                                <select
                                  value={item.scheduleStatus}
                                  onChange={(e) => store.updateLogisticsScheduleStatus(item.id, e.target.value as LogisticsScheduleStatus)}
                                  className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700 cursor-pointer outline-none"
                                >
                                  {(Object.keys(STATUS_LABELS) as LogisticsScheduleStatus[]).map(key => (
                                    <option key={key} value={key}>{STATUS_LABELS[key]}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="font-semibold text-slate-700">{STATUS_LABELS[item.scheduleStatus]}</span>
                              )}
                            </td>
                            {canManage && (
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(item)}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer mr-1"
                                  title="Editar programação"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                {confirmDeleteId === item.id ? (
                                  <span className="inline-flex items-center gap-1 ml-1">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSchedule(item.id)}
                                      className="px-2 py-1 text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer"
                                    >
                                      Confirmar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                                    >
                                      Não
                                    </button>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(item.id)}
                                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                                    title="Excluir programação"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingSchedule ? 'Editar Programação Logística' : 'Nova Programação Logística'}
                </h3>
                <p className="text-xs text-slate-500">
                  Defina viagem, permanência em obra/cidade ou locação para terceiros.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <datalist id="logistics_cities_list">
                {suggestedCities.map((c, i) => (
                  <option key={i} value={c} />
                ))}
              </datalist>

              {/* Vehicle & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Veículo *</label>
                  <select
                    value={formVehicleId}
                    onChange={(e) => setFormVehicleId(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-800"
                    required
                  >
                    <option value="">Selecione um veículo...</option>
                    {logisticsVehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        [{v.plate}] {v.brand} {v.model}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Status da Programação *</label>
                  <select
                    value={formScheduleStatus}
                    onChange={(e) => setFormScheduleStatus(e.target.value as LogisticsScheduleStatus)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-800"
                  >
                    <option value="programado">Programado</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              {/* Allocation Type — Apenas "Uso Programado" */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Finalidade / Tipo de Programação *</label>
                <div className="px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Uso Programado</span>
                </div>
              </div>

              {/* Dates: Data Inicial e Data Final */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Data Inicial *</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => {
                      setFormStartDate(e.target.value);
                      if (formEndDate < e.target.value) setFormEndDate(e.target.value);
                    }}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-mono"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Data Final *</label>
                  <input
                    type="date"
                    value={formEndDate}
                    min={formStartDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* ORIGEM DA VIAGEM: Obra Cadastrada OU Descrição Livre + Cidade e Estado */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Origem da Viagem *
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Informe uma obra cadastrada ou descrição livre com cidade e estado.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg self-start">
                    <button
                      type="button"
                      onClick={() => {
                        setFormOriginMode('obra');
                        setFormOriginWorkId('');
                        setFormOriginLabel('');
                        setFormOriginCity('');
                        setFormOriginState('');
                      }}
                      className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                        formOriginMode === 'obra' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Obra Cadastrada
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormOriginMode('livre');
                        setFormOriginWorkId('');
                        setFormOriginLabel('');
                        setFormOriginCity('');
                        setFormOriginState('');
                      }}
                      className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                        formOriginMode === 'livre' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Descrição Livre
                    </button>
                  </div>
                </div>

                {formOriginMode === 'obra' ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">Obra de Origem *</label>
                      <select
                        value={formOriginWorkId}
                        onChange={(e) => handleOriginWorkChange(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold text-slate-800"
                        required
                      >
                        <option value="">Selecione a obra de origem...</option>
                        {works.filter(w => w.status === 'active').map(w => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.city}/{w.state})
                          </option>
                        ))}
                      </select>
                    </div>
                    {formOriginWorkId && (
                      <div className="text-[11px] text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2">
                        Cidade/Estado vinculados à obra: <span className="font-bold text-slate-900">{formOriginCity}/{formOriginState}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">Descrição Livre da Origem *</label>
                      <input
                        type="text"
                        value={formOriginLabel}
                        onChange={(e) => setFormOriginLabel(e.target.value)}
                        placeholder="Ex: Escritório Central, Pátio de Máquinas, Fornecedor..."
                        className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700">Cidade de Origem *</label>
                        <input
                          type="text"
                          list="logistics_cities_list"
                          value={formOriginCity}
                          onChange={(e) => {
                            setFormOriginCity(e.target.value);
                            autoMatchStateFromCity(e.target.value, setFormOriginState);
                          }}
                          placeholder="Ex: Palmas"
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700">Estado (UF) *</label>
                        <select
                          value={formOriginState}
                          onChange={(e) => setFormOriginState(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold"
                          required
                        >
                          <option value="">UF</option>
                          {BRAZILIAN_UFS.map(uf => (
                            <option key={uf} value={uf}>{uf}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* DESTINO DA VIAGEM: Obra Cadastrada OU Destino Livre + Cidade e Estado */}
              <div className="bg-blue-50/40 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Destino da Viagem *
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Informe uma obra cadastrada ou destino livre com cidade e estado.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 p-1 bg-white border border-blue-200 rounded-lg self-start">
                    <button
                      type="button"
                      onClick={() => {
                        setFormDestMode('obra');
                        setFormWorkId('');
                        setFormDestLabel('');
                        setFormDestCity('');
                        setFormDestState('');
                      }}
                      className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                        formDestMode === 'obra' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Obra Cadastrada
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormDestMode('livre');
                        setFormWorkId('');
                        setFormDestLabel('');
                        setFormDestCity('');
                        setFormDestState('');
                      }}
                      className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                        formDestMode === 'livre' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Destino Livre
                    </button>
                  </div>
                </div>

                {formDestMode === 'obra' ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">Obra de Destino *</label>
                      <select
                        value={formWorkId}
                        onChange={(e) => handleDestWorkChange(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs bg-white border border-blue-200 rounded-xl outline-none focus:border-blue-500 font-semibold text-slate-800"
                        required
                      >
                        <option value="">Selecione a obra de destino...</option>
                        {works.filter(w => w.status === 'active').map(w => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.city}/{w.state})
                          </option>
                        ))}
                      </select>
                    </div>
                    {formWorkId && (
                      <div className="text-[11px] text-slate-600 bg-white border border-blue-200 rounded-lg px-3 py-2">
                        Cidade/Estado vinculados à obra: <span className="font-bold text-slate-900">{formDestCity}/{formDestState}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">Destino Livre (Descrição) *</label>
                      <input
                        type="text"
                        value={formDestLabel}
                        onChange={(e) => setFormDestLabel(e.target.value)}
                        placeholder="Ex: Filial Araguaína, Oficina Parceira, Cliente..."
                        className="w-full px-3 py-2.5 text-xs bg-white border border-blue-200 rounded-xl outline-none focus:border-blue-500 font-medium"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700">Cidade de Destino *</label>
                        <input
                          type="text"
                          list="logistics_cities_list"
                          value={formDestCity}
                          onChange={(e) => {
                            setFormDestCity(e.target.value);
                            autoMatchStateFromCity(e.target.value, setFormDestState);
                          }}
                          placeholder="Ex: Araguaína"
                          className="w-full px-3 py-2 text-xs bg-white border border-blue-200 rounded-xl outline-none focus:border-blue-500 font-medium"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700">Estado (UF) *</label>
                        <select
                          value={formDestState}
                          onChange={(e) => setFormDestState(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-blue-200 rounded-xl outline-none focus:border-blue-500 font-bold"
                          required
                        >
                          <option value="">UF</option>
                          {BRAZILIAN_UFS.map(uf => (
                            <option key={uf} value={uf}>{uf}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* O que é a carga? */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-slate-700">O que é a carga? *</label>
                  <button
                    type="button"
                    onClick={() => setFormCargoDescription('Sem carga (apenas deslocamento)')}
                    className="text-[11px] font-semibold text-blue-700 hover:underline cursor-pointer"
                  >
                    Sem carga
                  </button>
                </div>
                <input
                  type="text"
                  value={formCargoDescription}
                  onChange={(e) => setFormCargoDescription(e.target.value)}
                  placeholder="Ex: Cimento, ferragens, tubulação, ferramentas, equipamento ou sem carga..."
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-medium"
                  required
                />
              </div>

              {/* Third Party Rental Status */}
              <div className="bg-violet-50/50 border border-violet-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-violet-950">
                      Status de Locação para Terceiros *
                    </label>
                    <p className="text-[11px] text-slate-600">
                      Indique se este veículo será locado para terceiros durante este período.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 p-1 bg-white border border-violet-200 rounded-lg self-start">
                    <button
                      type="button"
                      onClick={() => setFormIsThirdParty(false)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                        !formIsThirdParty ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Uso Próprio
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormIsThirdParty(true)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                        formIsThirdParty ? 'bg-violet-600 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Locado p/ Terceiros
                    </button>
                  </div>
                </div>

                {formIsThirdParty && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-violet-950">
                      Nome da Empresa / Terceiro Locatário *
                    </label>
                    <input
                      type="text"
                      value={formThirdPartyName}
                      onChange={(e) => setFormThirdPartyName(e.target.value)}
                      placeholder="Ex: Construtora Parceira Ltda / Cliente Locatário"
                      className="w-full px-3 py-2 text-xs bg-white border border-violet-300 rounded-xl outline-none focus:border-violet-600 font-medium"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Driver & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Motorista Responsável (Opcional)</label>
                  <select
                    value={formDriverId}
                    onChange={(e) => setFormDriverId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500"
                  >
                    <option value="">Não definido</option>
                    {driversList.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Observações Logísticas</label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Contrato, turno, contato..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                {editingSchedule && (
                  confirmDeleteId === editingSchedule.id ? (
                    <div className="mr-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleDeleteSchedule(editingSchedule.id);
                          setShowModal(false);
                        }}
                        className="px-3 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer"
                      >
                        Confirmar Exclusão
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(editingSchedule.id)}
                      className="mr-auto px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl cursor-pointer"
                    >
                      Excluir
                    </button>
                  )
                )}
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer"
                >
                  {editingSchedule ? 'Salvar Alterações' : 'Confirmar Programação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LogisticsControl;
