import React from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Truck, 
  Users, 
  Activity, 
  Clock, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  UserCheck,
  Compass,
  AlertCircle,
  MapPin,
  Briefcase,
  Construction,
  Car
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { User, Vehicle, Equipment, Trip, EquipmentUsage, ConstructionWork } from '../types';

interface ManagerDashboardProps {
  currentUser: User | null;
  vehicles: Vehicle[];
  equipments: Equipment[];
  trips: Trip[];
  equipmentUsages: EquipmentUsage[];
  users: User[];
  works?: ConstructionWork[];
}

export function ManagerDashboard({
  currentUser,
  vehicles,
  equipments,
  trips,
  equipmentUsages,
  users,
  works
}: ManagerDashboardProps) {

  // --- 1. MAINTENANCE COSTS COMPUTATIONS ---
  const vehicleMaintTotal = vehicles.reduce((sum, v) => {
    const historySum = (v.maintenanceHistory || []).reduce((hSum, log) => hSum + (log.cost || 0), 0);
    return sum + historySum;
  }, 0);

  const equipmentMaintTotal = equipments.reduce((sum, eq) => {
    const historySum = (eq.maintenanceHistory || []).reduce((hSum, log) => hSum + (log.cost || 0), 0);
    return sum + historySum;
  }, 0);

  const totalMaintCost = vehicleMaintTotal + equipmentMaintTotal;

  // Gathering all completed maintenance events for chronological dashboard listing
  interface CompiledMaintenanceEvent {
    id: string;
    itemName: string;
    type: 'Veículo' | 'Maquinário';
    reason: string;
    resolution: string;
    cost: number;
    resolvedAt: string;
  }

  const allMaintenanceEvents: CompiledMaintenanceEvent[] = [];

  vehicles.forEach((v) => {
    (v.maintenanceHistory || []).forEach((log) => {
      allMaintenanceEvents.push({
        id: log.id,
        itemName: `${v.brand} ${v.model} (${v.plate})`,
        type: 'Veículo',
        reason: log.reason,
        resolution: log.resolution || 'Concluída',
        cost: log.cost || 0,
        resolvedAt: log.resolvedAt || new Date().toISOString()
      });
    });
  });

  equipments.forEach((e) => {
    (e.maintenanceHistory || []).forEach((log) => {
      allMaintenanceEvents.push({
        id: log.id,
        itemName: `${e.name} (${e.brand} ${e.model})`,
        type: 'Maquinário',
        reason: log.reason,
        resolution: log.resolution || 'Concluída',
        cost: log.cost || 0,
        resolvedAt: log.resolvedAt || new Date().toISOString()
      });
    });
  });

  // Sort events by resolved Date descending
  const recentMaintenances = allMaintenanceEvents
    .sort((a, b) => new Date(b.resolvedAt).getTime() - new Date(a.resolvedAt).getTime())
    .slice(0, 5);

  // --- 1.2 MAINTENANCE COSTS CHART DATA ---
  const lastSixMonths: { name: string; cost: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    lastSixMonths.push({ name: d.toLocaleDateString('pt-BR', { month: 'short' }), cost: 0 });
  }

  allMaintenanceEvents.forEach(evt => {
    const d = new Date(evt.resolvedAt || evt.sentAt);
    const monthKey = d.toLocaleDateString('pt-BR', { month: 'short' });
    const match = lastSixMonths.find(m => m.name === monthKey);
    if (match) match.cost += evt.cost || 0;
  });

  // --- 1.3 MAINTENANCE ALERTS ---
  const alerts = [
    ...vehicles
      .filter(v => v.lastMaintenanceKm !== undefined && v.maintenanceIntervalKm !== undefined && v.currentKm >= (v.lastMaintenanceKm + v.maintenanceIntervalKm))
      .map(v => ({ id: v.id, name: `${v.brand} ${v.model} (${v.plate})`, type: 'km' })),
    ...vehicles
      .filter(v => v.nextOilChangeKm !== undefined && v.currentKm >= v.nextOilChangeKm)
      .map(v => ({ id: `${v.id}-oil`, name: `${v.brand} ${v.model} (${v.plate})`, type: 'oil' })),
    ...equipments
      .filter(e => e.lastMaintenanceHours !== undefined && e.maintenanceIntervalHours !== undefined && e.currentHours >= (e.lastMaintenanceHours + e.maintenanceIntervalHours))
      .map(e => ({ id: e.id, name: e.name, type: 'horas' }))
  ];


  // --- 2. VEHICLE STATUS COUNTS ---
  const vehTotal = vehicles.length;
  const vehAvailable = vehicles.filter(v => v.status === 'available').length;
  const vehInUse = vehicles.filter(v => v.status === 'in_use').length;
  const vehMaintenance = vehicles.filter(v => v.status === 'maintenance').length;

  const vehAvailablePct = vehTotal > 0 ? Math.round((vehAvailable / vehTotal) * 100) : 0;
  const vehInUsePct = vehTotal > 0 ? Math.round((vehInUse / vehTotal) * 100) : 0;
  const vehMaintPct = vehTotal > 0 ? Math.round((vehMaintenance / vehTotal) * 100) : 0;


  // --- 3. MACHINERY STATUS COUNTS ---
  const eqTotal = equipments.length;
  const eqAvailable = equipments.filter(e => e.status === 'available').length;
  const eqInUse = equipments.filter(e => e.status === 'in_use').length;
  const eqMaintenance = equipments.filter(e => e.status === 'maintenance').length;

  const eqAvailablePct = eqTotal > 0 ? Math.round((eqAvailable / eqTotal) * 100) : 0;
  const eqInUsePct = eqTotal > 0 ? Math.round((eqInUse / eqTotal) * 100) : 0;
  const eqMaintPct = eqTotal > 0 ? Math.round((eqMaintenance / eqTotal) * 100) : 0;


  // --- 4. USERS & OPERATIONAL STATUS ---
  const driversOnly = users.filter(u => u.role === 'driver');
  const activeDriversCount = trips.filter(t => t.status === 'active').length;
  const activeOperatorsCount = equipmentUsages.filter(u => u.status === 'active').length;

  const totalDriversOnDuty = activeDriversCount + activeOperatorsCount;


  // --- 5. ITEMS CURRENTLY UNDERGOING ACTIVE REPAIRS ---
  const vehUnderMaint = vehicles.filter(v => v.status === 'maintenance');
  const eqUnderMaint = equipments.filter(e => e.status === 'maintenance');

  const activeMaintCount = vehUnderMaint.length + eqUnderMaint.length;

  // --- 6. VEHICLES BY CONSTRUCTION SITE & MAINTENANCE COSTS ---
  const worksList = works || [];
  const groupingData = [
    ...worksList.map(w => {
      const allocatedVehicles = vehicles.filter(v => v.workId === w.id);
      const maintenanceCost =
        vehicles.reduce((total, v) =>
          total + (v.maintenanceHistory || []).reduce((s, log) => log.workId === w.id ? s + (log.cost || 0) : s, 0),
          0
        ) +
        equipments.reduce((total, e) =>
          total + (e.maintenanceHistory || []).reduce((s, log) => log.workId === w.id ? s + (log.cost || 0) : s, 0),
          0
        );

      return {
        id: w.id,
        name: w.name,
        city: w.city,
        state: w.state,
        status: w.status,
        vehicles: allocatedVehicles,
        maintenanceCost
      };
    }),
    (() => {
      const generalVehicles = vehicles.filter(v => !v.workId);
      const maintenanceCost =
        vehicles.reduce((total, v) =>
          total + (v.maintenanceHistory || []).reduce((s, log) => (!log.workId || log.workId === 'geral') ? s + (log.cost || 0) : s, 0),
          0
        ) +
        equipments.reduce((total, e) =>
          total + (e.maintenanceHistory || []).reduce((s, log) => (!log.workId || log.workId === 'geral') ? s + (log.cost || 0) : s, 0),
          0
        );

      return {
        id: 'geral',
        name: 'Geral (Sem obra vinculada)',
        city: 'Garagem',
        state: 'Central',
        status: 'active' as const,
        vehicles: generalVehicles,
        maintenanceCost
      };
    })()
  ].filter(group => group.id === 'geral' || group.status === 'active' || group.vehicles.length > 0 || group.maintenanceCost > 0);

  // Calculate maximum cost amongst Obras for ratio bar display
  const maxMaintCostAcrossObras = Math.max(...groupingData.map(g => g.maintenanceCost), 1);

  return (
    <div id="manager_dashboard_view" className="space-y-8">
      {/* 👑 Welcome Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="text-left space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-905 tracking-tight font-display">
              Painel de Controle Gerencial
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Bem-vindo, <strong className="text-slate-800">{currentUser?.name || 'Gestor'}</strong>. Abaixo está o demonstrativo consolidado de custos, frotas, equipes e maquinários.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200/60 px-4 py-2.5 rounded-2xl shrink-0 self-start md:self-auto text-left">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          <div>
            <span className="block text-[8px] font-sans font-bold uppercase text-amber-805 tracking-wider font-mono">Modo de Acesso</span>
            <span className="text-xs font-bold text-amber-950">Apenas Leitura & Monitoramento</span>
          </div>
        </div>
      </div>

      {/* 📊 Metrics Bento Grid (Primary Key Indicators) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1: Cost of Maintenances */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start mb-3.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">Gastos com Manutenção</span>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1.5 text-left">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 font-display tracking-tight leading-none">
              R$ {totalMaintCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold border-t border-slate-100 pt-1.5">
              <span>Carros: R$ {vehicleMaintTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
              <span>Maquinários: R$ {equipmentMaintTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Vehicle fleet status summary */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start mb-3.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">Frota de Veículos</span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1.5 text-left">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 font-display tracking-tight leading-none">
              {vehTotal} <span className="text-xs font-semibold text-slate-500 font-sans">Cadastrados</span>
            </p>
            <div className="flex justify-between text-[10px] sm:text-[9px] text-slate-500 font-bold border-t border-slate-100 pt-1.5 font-sans">
              <span className="text-emerald-600">Disp: {vehAvailable}</span>
              <span className="text-blue-600">Em Uso: {vehInUse}</span>
              <span className="text-amber-600">Manut: {vehMaintenance}</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Machinery status summary */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start mb-3.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">Maquinários & Horímetros</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Compass className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
          </div>
          <div className="space-y-1.5 text-left">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 font-display tracking-tight leading-none">
              {eqTotal} <span className="text-xs font-semibold text-slate-500 font-sans">Equipamentos</span>
            </p>
            <div className="flex justify-between text-[10px] sm:text-[9px] text-slate-500 font-bold border-t border-slate-100 pt-1.5 font-sans">
              <span className="text-emerald-600">Disp: {eqAvailable}</span>
              <span className="text-blue-600">Operac: {eqInUse}</span>
              <span className="text-amber-600">Reparo: {eqMaintenance}</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Drivers & On Duty counts */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start mb-3.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">Equipe de Motoristas</span>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1.5 text-left">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 font-display tracking-tight leading-none">
              {users.length} <span className="text-xs font-semibold text-slate-500 font-sans">Membros</span>
            </p>
            <div className="flex justify-between text-[10px] text-slate-500 font-bold border-t border-slate-100 pt-1.5">
              <span>Motoristas: {driversOnly.length}</span>
              <span className="text-indigo-600 font-extrabold flex items-center gap-0.5">
                <Activity className="w-3 h-3 animate-pulse inline" /> Em Campo: {totalDriversOnDuty}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 📈 Graphical Analytics Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Cost Center Analytics & Completed Repairs logs */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="text-left">
            <h3 className="text-base font-bold text-slate-905 flex items-center gap-2 font-display">
              <TrendingUp className="w-5 h-5 text-rose-650" />
              Demonstrativo Financeiro de Manutenções
            </h3>
            <p className="text-xs text-slate-500">Histórico cronológico detalhado das reparações concluídas no pátio.</p>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lastSixMonths}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Line type="monotone" dataKey="cost" stroke="#e11d48" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Maintenance Alerts */}
          {alerts.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-red-800 flex items-center gap-2">
                ⚠️ Revisões Vencidas ({alerts.length})
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {alerts.map(a => (
                  <div key={a.id} className="text-[10px] bg-white border border-red-100 px-2 py-1 rounded text-red-700 font-bold">
                    {a.name} - Atenção: {a.type === 'km' ? 'Km excedida' : a.type === 'oil' ? 'Troca de óleo vencida' : 'Horas excedidas'}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick graphical ratio bars */}
          <div className="space-y-3.5">
            <div className="space-y-1 text-left">
              <div className="flex justify-between text-xs font-semibold text-slate-705">
                <span>Manutenção de Carros e Utilitários</span>
                <span className="font-bold text-rose-750">R$ {vehicleMaintTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-rose-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${totalMaintCost > 0 ? (vehicleMaintTotal / totalMaintCost) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-1 text-left">
              <div className="flex justify-between text-xs font-semibold text-slate-705">
                <span>Manutenção de Maquinários e Tratores</span>
                <span className="font-bold text-amber-750">R$ {equipmentMaintTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${totalMaintCost > 0 ? (equipmentMaintTotal / totalMaintCost) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Logs of finished repairs */}
          <div className="space-y-3 text-left">
            <span className="block text-[10px] uppercase font-bold text-slate-405 tracking-wider font-mono">Últimas Manutenções Resolvidas</span>
            {recentMaintenances.length === 0 ? (
              <div className="border border-slate-150 rounded-2xl p-6 text-center text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 animate-bounce" />
                <p className="text-xs font-bold text-slate-700">Sem registros de gastos</p>
                <p className="text-[10px] mt-0.5">Nenhum veículo ou máquina registrou custo de manutenção em seu histórico de liberação.</p>
              </div>
            ) : (
              <div className="max-h-68 overflow-y-auto pr-1 space-y-2.5 divider-y divide-slate-100">
                {recentMaintenances.map((event) => (
                  <div key={event.id} className="bg-slate-50 border border-slate-200/65 rounded-2xl p-3.5 space-y-2 text-xs font-sans">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className={`inline-block text-[8px] font-extrabold uppercase px-2 py-0.5 rounded border leading-none font-mono ${
                          event.type === 'Veículo' 
                            ? 'bg-blue-50 text-blue-800 border-blue-200' 
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {event.type}
                        </span>
                        <h4 className="text-xs font-extrabold text-slate-805 mt-1">{event.itemName}</h4>
                      </div>
                      <span className="text-slate-900 font-mono font-bold shrink-0 bg-white border border-slate-200/80 px-2 py-0.5 rounded-md">
                        R$ {event.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="text-[11px] leading-relaxed space-y-0.5 text-slate-650">
                      <p><strong className="text-slate-500 font-bold">Problema original:</strong> "{event.reason}"</p>
                      <p><strong className="text-slate-600 font-bold">Resolução técnica:</strong> {event.resolution}</p>
                    </div>

                    <div className="flex justify-between items-center text-[9px] text-slate-400 italic pt-1 border-t border-slate-200/50">
                      <span>Ref Ticket: {event.id.substring(0, 15)}</span>
                      <span>Concluído em: {new Date(event.resolvedAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Fleets Operations & Status Trackers */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="text-left">
            <h3 className="text-base font-bold text-slate-905 flex items-center gap-2 font-display">
              <Activity className="w-5 h-5 text-indigo-650" />
              Monitor de Disponibilidade da Frota
            </h3>
            <p className="text-xs text-slate-500">Acompanhamento e status operacional de todo o patrimônio físico.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Vehicle Status Progress Stack */}
            <div className="border border-slate-150 bg-slate-50/50 p-4.5 rounded-2.5xl space-y-4 text-left">
              <div className="header">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block font-mono">Disponibilidade Veículos</span>
                <p className="text-sm font-black text-slate-800 font-display mt-0.5">Status Veículos ({vehTotal})</p>
              </div>

              <div className="space-y-3 font-sans text-xs">
                {/* Available */}
                <div className="space-y-1">
                  <div className="flex justify-between font-bold text-slate-600 text-[11px]">
                    <span>Disponível</span>
                    <span className="text-emerald-600">{vehAvailable} ({vehAvailablePct}%)</span>
                  </div>
                  <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${vehAvailablePct}%` }} />
                  </div>
                </div>

                {/* In Use */}
                <div className="space-y-1">
                  <div className="flex justify-between font-bold text-slate-600 text-[11px]">
                    <span>Em Operação (Viagem)</span>
                    <span className="text-blue-600">{vehInUse} ({vehInUsePct}%)</span>
                  </div>
                  <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${vehInUsePct}%` }} />
                  </div>
                </div>

                {/* Maintenance */}
                <div className="space-y-1">
                  <div className="flex justify-between font-bold text-slate-600 text-[11px]">
                    <span>Em Manutenção</span>
                    <span className="text-amber-600">{vehMaintenance} ({vehMaintPct}%)</span>
                  </div>
                  <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${vehMaintPct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Machinery Status Progress Stack */}
            <div className="border border-slate-150 bg-slate-50/50 p-4.5 rounded-2.5xl space-y-4 text-left">
              <div className="header">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block font-mono">Disponibilidade Maquinários</span>
                <p className="text-sm font-black text-slate-800 font-display mt-0.5">Status Maquinários ({eqTotal})</p>
              </div>

              <div className="space-y-3 font-sans text-xs">
                {/* Available */}
                <div className="space-y-1">
                  <div className="flex justify-between font-bold text-slate-600 text-[11px]">
                    <span>Disponível</span>
                    <span className="text-emerald-700">{eqAvailable} ({eqAvailablePct}%)</span>
                  </div>
                  <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${eqAvailablePct}%` }} />
                  </div>
                </div>

                {/* In Use */}
                <div className="space-y-1">
                  <div className="flex justify-between font-bold text-slate-600 text-[11px]">
                    <span>Em Uso / Operando</span>
                    <span className="text-indigo-650">{eqInUse} ({eqInUsePct}%)</span>
                  </div>
                  <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${eqInUsePct}%` }} />
                  </div>
                </div>

                {/* Maintenance */}
                <div className="space-y-1">
                  <div className="flex justify-between font-bold text-slate-600 text-[11px]">
                    <span>Em Reparo / Oficina</span>
                    <span className="text-amber-600">{eqMaintenance} ({eqMaintPct}%)</span>
                  </div>
                  <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${eqMaintPct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Core Operations highlights */}
          <div className="bg-slate-50 border border-slate-150 rounded-2.5xl p-4 space-y-4 text-left">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500 text-white rounded-xl">
                  <Clock className="w-5.5 h-5.5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-805">Operação em Tempo Real</h4>
                  <p className="text-[10px] text-slate-500 font-medium">Existem atualmente {totalDriversOnDuty} membros operando nas estradas.</p>
                </div>
              </div>
            </div>

            {/* List of active drivers */}
            {activeDriversCount > 0 && (
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-400">Motoristas em Viagem:</span>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {trips.filter(t => t.status === 'active').map(trip => {
                    const driver = users.find(u => u.id === trip.driverId);
                    if (!driver) return null;
                    return (
                      <div key={trip.id} className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 p-1.5 rounded-md flex justify-between">
                        <span>{driver.name}</span>
                        <span className="text-blue-600 font-mono">ID: {trip.id.substring(0, 4)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🏗️ Section: Operational Layout & Maintenance Cost by Construction Work */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left space-y-6">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 font-display">
            <Construction className="w-5.5 h-5.5 text-blue-650 shrink-0" />
            Controle de Veículos & Custos por Obra
          </h3>
          <p className="text-xs text-slate-500">
            Quadro de veículos alocados e o demonstrativo acumulado de custos de manutenção de veículos por canteiro de obras.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Vehicles by Construction Site (Quadro de Veículos por Obra) */}
          <div className="lg:col-span-2 space-y-4">
            <span className="block text-[10px] uppercase font-black text-slate-400 tracking-wider font-mono">
              Quadro de Veículos por Obra ({groupingData.length})
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupingData.map(group => {
                const availableCount = group.vehicles.filter(v => v.status === 'available').length;
                const inUseCount = group.vehicles.filter(v => v.status === 'in_use').length;
                const maintenanceCount = group.vehicles.filter(v => v.status === 'maintenance').length;

                return (
                  <div 
                    key={group.id} 
                    className="border border-slate-150 rounded-2.5xl bg-slate-50/40 p-4 hover:bg-slate-50 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div className="overflow-hidden">
                          <h4 className="text-sm font-black text-slate-900 leading-tight truncate">
                            {group.id === 'geral' ? '⚙️' : '🏗️'} {group.name}
                          </h4>
                          <span className="text-[10px] text-slate-450 font-semibold flex items-center gap-1 mt-0.5 whitespace-nowrap">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            {group.city} - {group.state}
                          </span>
                        </div>
                        <span className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-[10px] font-bold text-slate-500 shrink-0 whitespace-nowrap">
                          {group.vehicles.length} {group.vehicles.length === 1 ? 'veículo' : 'veículos'}
                        </span>
                      </div>

                      {/* Status Badges summary for this work */}
                      {group.vehicles.length > 0 && (
                        <div className="flex items-center gap-2 mb-3 bg-white/80 border border-slate-100/50 p-1.5 rounded-lg text-[9px] font-bold">
                          <span className="text-emerald-600">Disponível: {availableCount}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-blue-600">Em Uso: {inUseCount}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-amber-500">Oficina: {maintenanceCount}</span>
                        </div>
                      )}

                      {/* List of Vehicles */}
                      {group.vehicles.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic py-3 text-center border border-dashed border-slate-200 rounded-xl bg-white/30">
                          Nenhum veículo alocado a esta obra.
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {group.vehicles.map(v => (
                            <div 
                              key={v.id} 
                              className="bg-white border border-slate-150 rounded-xl p-2.5 flex items-center justify-between text-xs hover:border-slate-300 transition-colors"
                            >
                              <div className="text-left font-sans overflow-hidden mr-1">
                                <p className="font-extrabold text-slate-800 leading-tight truncate">
                                  {v.brand} {v.model}
                                </p>
                                <p className="text-[9px] text-slate-450 font-mono font-bold uppercase shrink-0 whitespace-nowrap">
                                  Placa: {v.plate}
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {v.status === 'available' ? (
                                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[9px] font-bold leading-none">
                                    Disponível
                                  </span>
                                ) : v.status === 'in_use' ? (
                                  <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full text-[9px] font-bold leading-none">
                                    Em Viagem
                                  </span>
                                ) : (
                                  <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full text-[9px] font-extrabold leading-none animate-pulse">
                                    Oficina
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Maintenance Cost associated */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-200/50 flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold font-sans">Custo de Reparos:</span>
                      <strong className={`font-mono text-slate-900 ${group.maintenanceCost > 0 ? 'text-rose-600 font-extrabold' : ''}`}>
                        R$ {group.maintenanceCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Consolidated Maintenance Cost Breakdown */}
          <div className="bg-slate-50 border border-slate-150 rounded-2.5xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="text-left">
                <span className="block text-[10px] uppercase font-black text-slate-400 tracking-wider font-mono">
                  Gasto de Manutenção Acumulado
                </span>
                <p className="text-[11px] text-slate-550 mt-0.5 leading-tight">
                  Comparação financeira de gastos com reformas e manutenção de veículos por canteiro.
                </p>
              </div>

              {/* Aggregated visual graph bars */}
              <div className="space-y-4 text-left max-h-96 overflow-y-auto pr-1">
                {groupingData.map(group => {
                  const percentage = Math.round((group.maintenanceCost / maxMaintCostAcrossObras) * 100);
                  
                  return (
                    <div key={group.id} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700 truncate max-w-[150px]">
                          {group.name}
                        </span>
                        <span className="font-mono font-extrabold text-slate-850 whitespace-nowrap">
                          R$ {group.maintenanceCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200/85 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${Math.max(percentage, group.maintenanceCost > 0 ? 4 : 0)}%`,
                            backgroundColor: group.maintenanceCost > 0 ? '#f43f5e' : '#cbd5e1'
                          }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total recap info info block */}
            <div className="bg-white border border-slate-200/80 p-3.5 rounded-xl text-left text-xs leading-relaxed space-y-1 mt-4">
              <div className="flex font-bold items-center gap-1.5 text-slate-800">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Rateio por Alocação Física</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Os custos de manutenção de veículos são vinculados de acordo com a obra definida na alocação do patrimônio. Obras com frotas de rodagem intensa tendem a acumular maior faturamento na oficina.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ⚠️ Critical Attention Section: Items Undergoing Maintenance */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-905 flex items-center gap-2 font-display">
            <Wrench className="w-5 h-5 text-amber-500" />
            Veículos & Maquinários Atualmente na Oficina ({activeMaintCount})
          </h3>
          <p className="text-xs text-slate-500">Contingenciamento de equipamentos inativos aguardando liberação mecânica técnica.</p>
        </div>

        {activeMaintCount === 0 ? (
          <div className="border border-dashed border-emerald-200 bg-emerald-50/15 rounded-2xl p-6 text-center text-slate-550 flex flex-col items-center justify-center">
            <CheckCircle2 className="w-9 h-9 text-emerald-500 mb-2" />
            <p className="text-xs font-bold text-emerald-950 font-display">Toda a frota está 100% ativa!</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Não há utilitários ou maquinários pendentes em manutenção no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vehUnderMaint.map(veh => (
              <div key={veh.id} className="bg-rose-50/30 border border-rose-200/50 hover:border-rose-200 p-4 rounded-2.5xl space-y-2.5 text-xs font-sans transition-all">
                <div className="flex justify-between items-start gap-2">
                  <div className="text-left font-bold">
                    <span className="text-[8px] uppercase tracking-wider font-mono font-bold text-rose-800 bg-rose-100/60 px-1.5 py-0.5 rounded border border-rose-200/30">VEÍCULO</span>
                    <h4 className="text-sm font-black text-slate-900 mt-1">{veh.brand} {veh.model}</h4>
                    <span className="text-[10px] text-slate-450 font-mono">PLACA: {veh.plate}</span>
                  </div>
                </div>
                <div className="bg-white/80 border border-slate-100 p-3 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Motivo Informado:</span>
                  <p className="text-slate-805 font-medium italic mt-0.5">"{veh.maintenanceReason || 'Não especificado'}"</p>
                  {veh.maintenanceSentAt && (
                    <span className="text-[9px] text-slate-450 block font-mono mt-1">
                      Enviado em: {new Date(veh.maintenanceSentAt).toLocaleDateString('pt-BR')} às {new Date(veh.maintenanceSentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {eqUnderMaint.map(eq => (
              <div key={eq.id} className="bg-amber-50/20 border border-amber-200/40 hover:border-amber-200 p-4 rounded-2.5xl space-y-2.5 text-xs font-sans transition-all">
                <div className="flex justify-between items-start gap-2">
                  <div className="text-left font-bold">
                    <span className="text-[8px] uppercase tracking-wider font-mono font-bold text-amber-800 bg-amber-100/60 px-1.5 py-0.5 rounded border border-amber-200/30">MAQUINÁRIO</span>
                    <h4 className="text-sm font-black text-slate-900 mt-1">{eq.name}</h4>
                    <span className="text-[10px] text-slate-450 font-mono">ID: {eq.id} <span className="text-slate-300">•</span> {eq.brand} {eq.model}</span>
                  </div>
                </div>
                <div className="bg-white/80 border border-slate-100 p-3 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Motivo Informado:</span>
                  <p className="text-slate-805 font-medium italic mt-0.5">"{eq.maintenanceReason || 'Não especificado'}"</p>
                  {eq.maintenanceSentAt && (
                    <span className="text-[9px] text-slate-450 block font-mono mt-1">
                      Enviado em: {new Date(eq.maintenanceSentAt).toLocaleDateString('pt-BR')} às {new Date(eq.maintenanceSentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export default ManagerDashboard;
