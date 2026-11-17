import React, { useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Gauge,
  Truck,
  Wrench
} from 'lucide-react';
import { Equipment, MaintenanceLog, Vehicle } from '../types';

export interface TvMaintenanceSlideProps {
  vehicles: Vehicle[];
  equipments: Equipment[];
}

interface ActiveMaintenanceItem {
  id: string;
  kind: 'vehicle' | 'equipment';
  code: string;
  title: string;
  workName: string;
  reason: string;
  sentAt?: string;
  meterLabel: string;
  providerName?: string;
}

interface PreventiveAlertItem {
  id: string;
  kind: 'vehicle' | 'equipment';
  code: string;
  title: string;
  workName: string;
  alertType: string;
  isOverdue: boolean;
  deltaLabel: string;
}

interface HistoryLogItem {
  id: string;
  kind: 'vehicle' | 'equipment';
  code: string;
  assetName: string;
  workName: string;
  reason: string;
  dateStr: string;
  sortDate: number;
  cost: number;
  providerName?: string;
  fiscalLabel?: string;
  hasFiscalPending?: boolean;
  isOpen: boolean;
}

function parseDateSafe(val?: string): number {
  if (!val) return 0;
  const brMatch = val.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const [, dd, mm, yyyy] = brMatch;
    return new Date(`${yyyy}-${mm}-${dd}`).getTime() || 0;
  }
  return new Date(val).getTime() || 0;
}

function formatDateShort(val?: string): string {
  if (!val) return '-';
  if (/^\d{2}\/\d{2}\/\d{4}/.test(val)) return val.slice(0, 10);
  const isoMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  const dt = new Date(val);
  if (!isNaN(dt.getTime())) return dt.toLocaleDateString('pt-BR');
  return val;
}

export function TvMaintenanceSlide({
  vehicles,
  equipments
}: TvMaintenanceSlideProps) {
  const {
    activeItems,
    preventiveAlerts,
    recentHistory,
    totalSpend,
    pendingFiscalCount,
    vehiclesInMaintCount,
    equipmentsInMaintCount
  } = useMemo(() => {
    const active: ActiveMaintenanceItem[] = [];
    const alerts: PreventiveAlertItem[] = [];
    const history: HistoryLogItem[] = [];
    let spendSum = 0;
    let fiscalPending = 0;

    // 1. Vehicles in maintenance + preventive alerts + history
    const activeVehiclesList = vehicles.filter(
      v => v.status !== 'inactive' && v.isActive !== false
    );

    activeVehiclesList.forEach(v => {
      const logs = v.maintenanceHistory || [];
      const openLog = [...logs].reverse().find(l => !l.resolvedAt);

      if (v.status === 'maintenance') {
        active.push({
          id: `vm-${v.id}`,
          kind: 'vehicle',
          code: v.plate,
          title: `${v.brand} ${v.model}`.trim(),
          workName: v.workName || openLog?.workName || 'Geral / Matriz',
          reason:
            v.maintenanceReason ||
            openLog?.reason ||
            'Em manutenção na oficina',
          sentAt: v.maintenanceSentAt || openLog?.sentAt,
          meterLabel: `${v.currentKm.toLocaleString('pt-BR')} km`,
          providerName: openLog?.providerName
        });
      }

      // Oil change alert
      if (v.nextOilChangeKm && v.nextOilChangeKm > 0) {
        const diff = v.nextOilChangeKm - v.currentKm;
        if (diff <= 500) {
          alerts.push({
            id: `v-oil-${v.id}`,
            kind: 'vehicle',
            code: v.plate,
            title: v.model,
            workName: v.workName || 'Geral / Matriz',
            alertType: 'Troca de Óleo',
            isOverdue: diff <= 0,
            deltaLabel:
              diff <= 0
                ? `${Math.abs(diff).toLocaleString('pt-BR')} km venc.`
                : `em ${diff.toLocaleString('pt-BR')} km`
          });
        }
      }

      // Periodic KM interval alert
      if (
        v.lastMaintenanceKm !== undefined &&
        v.maintenanceIntervalKm &&
        v.maintenanceIntervalKm > 0
      ) {
        const targetKm = v.lastMaintenanceKm + v.maintenanceIntervalKm;
        const diff = targetKm - v.currentKm;
        if (diff <= 500) {
          alerts.push({
            id: `v-rev-${v.id}`,
            kind: 'vehicle',
            code: v.plate,
            title: v.model,
            workName: v.workName || 'Geral / Matriz',
            alertType: 'Revisão Periódica',
            isOverdue: diff <= 0,
            deltaLabel:
              diff <= 0
                ? `${Math.abs(diff).toLocaleString('pt-BR')} km venc.`
                : `em ${diff.toLocaleString('pt-BR')} km`
          });
        }
      }
    });

    // Collect history from all vehicles (including historical logs)
    vehicles.forEach(v => {
      (v.maintenanceHistory || []).forEach((log: MaintenanceLog) => {
        const cost = Number(log.cost) || 0;
        spendSum += cost;
        if (log.hasFiscalPending) fiscalPending += 1;
        const dateRef = log.resolvedAt || log.sentAt;
        history.push({
          id: `vh-${v.id}-${log.id}`,
          kind: 'vehicle',
          code: v.plate,
          assetName: v.model,
          workName: log.workName || v.workName || 'Geral',
          reason: log.reason,
          dateStr: formatDateShort(dateRef),
          sortDate: parseDateSafe(dateRef),
          cost,
          providerName: log.providerName,
          fiscalLabel: log.fiscalDocNumber
            ? `${log.fiscalDocType === 'nf' ? 'NF' : 'Ped.'} ${log.fiscalDocNumber}`
            : undefined,
          hasFiscalPending: log.hasFiscalPending,
          isOpen: !log.resolvedAt
        });
      });
    });

    // 2. Equipments in maintenance + preventive alerts + history
    equipments.forEach(eq => {
      const logs = eq.maintenanceHistory || [];
      const openLog = [...logs].reverse().find(l => !l.resolvedAt);

      if (eq.status === 'maintenance') {
        active.push({
          id: `em-${eq.id}`,
          kind: 'equipment',
          code: 'MAQ',
          title: eq.name,
          workName: eq.workName || openLog?.workName || 'Geral / Matriz',
          reason:
            eq.maintenanceReason ||
            openLog?.reason ||
            'Equipamento em manutenção',
          sentAt: eq.maintenanceSentAt || openLog?.sentAt,
          meterLabel: `${eq.currentHours.toLocaleString('pt-BR')}h`,
          providerName: openLog?.providerName
        });
      }

      if (eq.nextOilChangeHours && eq.nextOilChangeHours > 0) {
        const diff = eq.nextOilChangeHours - eq.currentHours;
        if (diff <= 20) {
          alerts.push({
            id: `e-oil-${eq.id}`,
            kind: 'equipment',
            code: 'MAQ',
            title: eq.name,
            workName: eq.workName || 'Geral / Matriz',
            alertType: 'Óleo Horímetro',
            isOverdue: diff <= 0,
            deltaLabel:
              diff <= 0
                ? `${Math.abs(diff).toLocaleString('pt-BR')}h venc.`
                : `em ${diff.toLocaleString('pt-BR')}h`
          });
        }
      }

      if (
        eq.lastMaintenanceHours !== undefined &&
        eq.maintenanceIntervalHours &&
        eq.maintenanceIntervalHours > 0
      ) {
        const targetH = eq.lastMaintenanceHours + eq.maintenanceIntervalHours;
        const diff = targetH - eq.currentHours;
        if (diff <= 20) {
          alerts.push({
            id: `e-rev-${eq.id}`,
            kind: 'equipment',
            code: 'MAQ',
            title: eq.name,
            workName: eq.workName || 'Geral / Matriz',
            alertType: 'Revisão Horímetro',
            isOverdue: diff <= 0,
            deltaLabel:
              diff <= 0
                ? `${Math.abs(diff).toLocaleString('pt-BR')}h venc.`
                : `em ${diff.toLocaleString('pt-BR')}h`
          });
        }
      }

      logs.forEach((log: MaintenanceLog) => {
        const cost = Number(log.cost) || 0;
        spendSum += cost;
        if (log.hasFiscalPending) fiscalPending += 1;
        const dateRef = log.resolvedAt || log.sentAt;
        history.push({
          id: `eh-${eq.id}-${log.id}`,
          kind: 'equipment',
          code: 'MAQ',
          assetName: eq.name,
          workName: log.workName || eq.workName || 'Geral',
          reason: log.reason,
          dateStr: formatDateShort(dateRef),
          sortDate: parseDateSafe(dateRef),
          cost,
          providerName: log.providerName,
          fiscalLabel: log.fiscalDocNumber
            ? `${log.fiscalDocType === 'nf' ? 'NF' : 'Ped.'} ${log.fiscalDocNumber}`
            : undefined,
          hasFiscalPending: log.hasFiscalPending,
          isOpen: !log.resolvedAt
        });
      });
    });

    alerts.sort((a, b) => Number(b.isOverdue) - Number(a.isOverdue));
    history.sort((a, b) => b.sortDate - a.sortDate);

    return {
      activeItems: active,
      preventiveAlerts: alerts,
      recentHistory: history,
      totalSpend: spendSum,
      pendingFiscalCount: fiscalPending,
      vehiclesInMaintCount: active.filter(i => i.kind === 'vehicle').length,
      equipmentsInMaintCount: active.filter(i => i.kind === 'equipment').length
    };
  }, [vehicles, equipments]);

  const useTwoActiveCols = activeItems.length > 4;

  return (
    <div className="flex-1 min-h-0 bg-[#0F172A] border border-slate-800 rounded-2xl p-3.5 shadow-xl flex flex-col gap-2.5 overflow-hidden animate-fade-in">
      {/* Compact Header */}
      <div className="shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-amber-500/15 text-amber-400 rounded-lg border border-amber-500/30 shrink-0">
            <Wrench className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black text-white font-display leading-tight truncate">
              Central de Manutenções — Oficina, Preventivas e Histórico
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-mono tabular-nums shrink-0">
          <span className="text-amber-300 font-bold">
            {vehiclesInMaintCount} Veículos Oficina
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="text-purple-300 font-bold">
            {equipmentsInMaintCount} Maquinários Manut.
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span
            className={`font-bold ${
              preventiveAlerts.length > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {preventiveAlerts.length} Alertas Preventivos
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="text-emerald-400 font-black">
            R${' '}
            {totalSpend.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </span>
        </div>
      </div>

      {/* 3-Panel Zero-Scroll Body */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 overflow-hidden">
        {/* Panel 1: Ativos em Oficina / Manutenção Atual */}
        <div className="lg:col-span-5 min-h-0 bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 overflow-hidden">
          <div className="shrink-0 flex items-center justify-between border-b border-slate-800/80 pb-1.5">
            <span className="text-xs font-black text-white flex items-center gap-1.5 font-display">
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              Em Oficina Agora ({activeItems.length})
            </span>
            <span className="text-[10px] font-mono text-amber-400 font-bold">
              Veículos & Maquinários
            </span>
          </div>

          {activeItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-1.5 text-slate-400">
              <CheckCircle2 className="w-6 h-6 text-emerald-500/80" />
              <span className="text-xs font-semibold text-emerald-300">
                Nenhum veículo ou maquinário parado em oficina
              </span>
              <span className="text-[11px] text-slate-500">
                Toda a frota está operacional ou disponível.
              </span>
            </div>
          ) : (
            <div
              className={`flex-1 min-h-0 grid gap-1.5 content-start overflow-hidden ${
                useTwoActiveCols ? 'grid-cols-2' : 'grid-cols-1'
              }`}
            >
              {activeItems.slice(0, 10).map(item => (
                <div
                  key={item.id}
                  className={`rounded-lg p-2 border flex flex-col gap-1 min-w-0 overflow-hidden ${
                    item.kind === 'equipment'
                      ? 'bg-purple-950/25 border-purple-500/30'
                      : 'bg-slate-950/90 border-amber-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`font-mono font-bold px-1.5 py-0.5 rounded text-[9.5px] shrink-0 ${
                          item.kind === 'equipment'
                            ? 'bg-purple-900/70 text-purple-200'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {item.kind === 'vehicle' ? (
                          <span className="inline-flex items-center gap-1">
                            <Truck className="w-2.5 h-2.5" />
                            {item.code}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Gauge className="w-2.5 h-2.5" />
                            MAQ
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-white text-[11px] truncate">
                        {item.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono tabular-nums text-slate-400 shrink-0">
                      {item.meterLabel}
                    </span>
                  </div>

                  <div
                    className="text-[10.5px] text-amber-200/90 font-medium truncate"
                    title={item.reason}
                  >
                    Motivo: {item.reason}
                  </div>

                  <div className="flex items-center justify-between gap-1 text-[9.5px] font-mono text-slate-400 truncate">
                    <span className="truncate">{item.workName}</span>
                    <span className="shrink-0">
                      {item.providerName
                        ? item.providerName
                        : item.sentAt
                        ? `Ent.: ${formatDateShort(item.sentAt)}`
                        : 'Em oficina'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel 2: Alertas Preventivos & Troca de Óleo */}
        <div className="lg:col-span-3 min-h-0 bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 overflow-hidden">
          <div className="shrink-0 flex items-center justify-between border-b border-slate-800/80 pb-1.5">
            <span className="text-xs font-black text-white flex items-center gap-1.5 font-display">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Preventivas ({preventiveAlerts.length})
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Óleo / KM / H
            </span>
          </div>

          {preventiveAlerts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-1.5 text-slate-400">
              <CheckCircle2 className="w-6 h-6 text-emerald-500/80" />
              <span className="text-xs font-semibold text-emerald-300">
                Revisões e trocas de óleo em dia
              </span>
              <span className="text-[11px] text-slate-500">
                Sem vencimentos próximos.
              </span>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col gap-1.5 overflow-hidden">
              {preventiveAlerts.slice(0, 9).map(alert => (
                <div
                  key={alert.id}
                  className={`rounded-lg px-2 py-1.5 border flex items-center justify-between gap-2 text-[10.5px] ${
                    alert.isOverdue
                      ? 'bg-rose-950/35 border-rose-500/40'
                      : 'bg-amber-950/25 border-amber-500/30'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-[9.5px] px-1 rounded bg-slate-800 text-white shrink-0">
                        {alert.code}
                      </span>
                      <span className="font-bold text-white truncate">
                        {alert.title}
                      </span>
                    </div>
                    <div className="text-[9.5px] text-slate-400 truncate mt-0.5">
                      {alert.alertType} · {alert.workName}
                    </div>
                  </div>
                  <div className="text-right shrink-0 font-mono tabular-nums">
                    <span
                      className={`text-[9.5px] font-black block ${
                        alert.isOverdue ? 'text-rose-400' : 'text-amber-300'
                      }`}
                    >
                      {alert.isOverdue ? 'VENCIDO' : 'PRÓXIMO'}
                    </span>
                    <span className="text-[9.5px] text-slate-300">
                      {alert.deltaLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel 3: Últimos Registros e Custos de Manutenção */}
        <div className="lg:col-span-4 min-h-0 bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 overflow-hidden">
          <div className="shrink-0 flex items-center justify-between border-b border-slate-800/80 pb-1.5">
            <span className="text-xs font-black text-white flex items-center gap-1.5 font-display">
              <ClipboardList className="w-3.5 h-3.5 text-sky-400" />
              Histórico Recente ({recentHistory.length})
            </span>
            {pendingFiscalCount > 0 ? (
              <span className="text-[10px] font-mono text-amber-400 font-bold">
                {pendingFiscalCount} Pend. Fiscal
              </span>
            ) : (
              <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Fiscais OK
              </span>
            )}
          </div>

          {recentHistory.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
              Nenhum registro de manutenção lançado.
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col gap-1.5 overflow-hidden">
              {recentHistory.slice(0, 9).map(log => (
                <div
                  key={log.id}
                  className="bg-slate-950/85 border border-slate-800 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2 text-[10.5px]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-mono font-bold text-[9px] px-1 rounded shrink-0 ${
                          log.kind === 'equipment'
                            ? 'bg-purple-900/70 text-purple-200'
                            : 'bg-slate-800 text-white'
                        }`}
                      >
                        {log.code}
                      </span>
                      <span className="font-bold text-white truncate">
                        {log.assetName}
                      </span>
                      <span className="text-[9.5px] font-mono text-slate-500 shrink-0">
                        · {log.dateStr}
                      </span>
                    </div>
                    <div
                      className="text-[10px] text-slate-300 truncate mt-0.5"
                      title={log.reason}
                    >
                      {log.reason}
                      {log.providerName ? ` (${log.providerName})` : ''}
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono tabular-nums">
                    <span className="font-black text-emerald-400 block text-[11px]">
                      R${' '}
                      {log.cost.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                    <span
                      className={`text-[9px] ${
                        log.isOpen
                          ? 'text-amber-400 font-bold'
                          : log.hasFiscalPending
                          ? 'text-rose-400 font-bold'
                          : 'text-slate-400'
                      }`}
                    >
                      {log.isOpen
                        ? 'Aberta'
                        : log.hasFiscalPending
                        ? 'Pend. NF'
                        : log.fiscalLabel || log.workName}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TvMaintenanceSlide;
