import React, { useMemo } from 'react';
import { Building2, Gauge, Truck } from 'lucide-react';
import { ConstructionWork, Equipment, Vehicle } from '../types';

export interface TvWorkFleetUnifiedViewProps {
  works: ConstructionWork[];
  vehicles: Vehicle[];
  equipments: Equipment[];
}

interface UnifiedAssetItem {
  id: string;
  kind: 'vehicle' | 'equipment';
  code: string;
  name: string;
  statusLabel: string;
  statusCls: string;
  tooltip: string;
}

interface WorkFleetGroup {
  id: string;
  name: string;
  city?: string;
  state?: string;
  status: 'active' | 'completed' | 'geral';
  vehicles: Vehicle[];
  equipments: Equipment[];
  assets: UnifiedAssetItem[];
  availVehicles: number;
  inUseVehicles: number;
  maintVehicles: number;
}

export function TvWorkFleetUnifiedView({
  works,
  vehicles,
  equipments
}: TvWorkFleetUnifiedViewProps) {
  const {
    groups,
    otherWorkEquipments,
    totalVehicles,
    totalEquipments
  } = useMemo(() => {
    const activeVehicles = vehicles.filter(
      v => v.status !== 'inactive' && v.isActive !== false
    );
    const sortedEquipments = [...equipments].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    const buildAssets = (
      workVehicles: Vehicle[],
      workEquipments: Equipment[]
    ): UnifiedAssetItem[] => {
      const vItems: UnifiedAssetItem[] = workVehicles.map(v => {
        const st =
          v.status === 'available'
            ? {
                label: 'Disp.',
                cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }
            : v.status === 'in_use'
            ? {
                label: 'Uso',
                cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
              }
            : {
                label: 'Ofic.',
                cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              };
        return {
          id: `v-${v.id}`,
          kind: 'vehicle',
          code: v.isComplement ? `COMP·${v.plate}` : v.plate,
          name: v.model,
          statusLabel: st.label,
          statusCls: st.cls,
          tooltip: `${v.plate}${v.isComplement ? ' [Complemento / Carroceria]' : ''} - ${v.brand} ${v.model} (${v.currentKm.toLocaleString('pt-BR')} km)`
        };
      });

      const eItems: UnifiedAssetItem[] = workEquipments.map(eq => {
        const st =
          eq.status === 'available'
            ? {
                label: 'Disp.',
                cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }
            : eq.status === 'in_use'
            ? {
                label: 'Oper.',
                cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
              }
            : {
                label: 'Manut.',
                cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              };
        return {
          id: `e-${eq.id}`,
          kind: 'equipment',
          code: 'MAQ',
          name: eq.name,
          statusLabel: st.label,
          statusCls: st.cls,
          tooltip: `${eq.name} (${eq.brand} ${eq.model}) - ${eq.currentHours.toLocaleString('pt-BR')}h`
        };
      });

      return [...vItems, ...eItems];
    };

    const resultGroups: WorkFleetGroup[] = [];
    const includedEqIds = new Set<string>();

    works.forEach(w => {
      const workVehicles = activeVehicles
        .filter(v => v.workId === w.id)
        .sort((a, b) => a.plate.localeCompare(b.plate));

      if (workVehicles.length === 0) return;

      const workEquipments = sortedEquipments.filter(e => e.workId === w.id);
      workEquipments.forEach(e => includedEqIds.add(e.id));

      resultGroups.push({
        id: w.id,
        name: w.name,
        city: w.city,
        state: w.state,
        status: w.status,
        vehicles: workVehicles,
        equipments: workEquipments,
        assets: buildAssets(workVehicles, workEquipments),
        availVehicles: workVehicles.filter(v => v.status === 'available').length,
        inUseVehicles: workVehicles.filter(v => v.status === 'in_use').length,
        maintVehicles: workVehicles.filter(v => v.status === 'maintenance').length
      });
    });

    const unallocatedVehicles = activeVehicles
      .filter(v => !v.workId || !works.some(w => w.id === v.workId))
      .sort((a, b) => a.plate.localeCompare(b.plate));

    const unallocatedEquipments = sortedEquipments.filter(
      e => !e.workId || !works.some(w => w.id === e.workId)
    );

    if (unallocatedVehicles.length > 0) {
      unallocatedEquipments.forEach(e => includedEqIds.add(e.id));
      resultGroups.push({
        id: 'geral',
        name: 'Geral / Matriz (Sem Obra Fixa)',
        status: 'geral',
        vehicles: unallocatedVehicles,
        equipments: unallocatedEquipments,
        assets: buildAssets(unallocatedVehicles, unallocatedEquipments),
        availVehicles: unallocatedVehicles.filter(v => v.status === 'available')
          .length,
        inUseVehicles: unallocatedVehicles.filter(v => v.status === 'in_use')
          .length,
        maintVehicles: unallocatedVehicles.filter(
          v => v.status === 'maintenance'
        ).length
      });
    }

    const remainingEquipments = sortedEquipments.filter(
      e => !includedEqIds.has(e.id)
    );

    return {
      groups: resultGroups,
      otherWorkEquipments: remainingEquipments,
      totalVehicles: activeVehicles.length,
      totalEquipments: sortedEquipments.length
    };
  }, [works, vehicles, equipments]);

  const gridColsClass = useMemo(() => {
    const count = groups.length;
    if (count <= 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    if (count === 3) return 'grid-cols-1 md:grid-cols-3';
    if (count === 4) return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';
    if (count <= 6) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    if (count <= 8) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
    return 'grid-cols-1 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';
  }, [groups.length]);

  const isDenseMode = groups.length > 6;

  return (
    <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-3.5 shadow-xl flex flex-col gap-2.5 flex-1 min-h-0 overflow-hidden animate-fade-in">
      {/* Compact Header */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20 shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black text-white font-display leading-tight truncate">
              Visão Unificada — Veículos Ativos e Maquinários por Obra
            </h3>
            <p className="text-[11px] text-slate-400 truncate">
              Apenas obras com veículos alocados (ativos ou em manutenção) e seus maquinários vinculados.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums shrink-0 text-slate-300">
          <span className="flex items-center gap-1 font-bold text-sky-400">
            <Building2 className="w-3.5 h-3.5" />
            {groups.length} Obras
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="flex items-center gap-1 font-bold text-emerald-400">
            <Truck className="w-3.5 h-3.5" />
            {totalVehicles} Veículos
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="flex items-center gap-1 font-bold text-purple-300">
            <Gauge className="w-3.5 h-3.5" />
            {totalEquipments} Maquinários
          </span>
        </div>
      </div>

      {groups.length === 0 && otherWorkEquipments.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          Nenhuma obra com veículos ativos ou em manutenção no momento.
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden">
          {groups.length > 0 && (
            <div
              className={`flex-1 min-h-0 grid ${gridColsClass} auto-rows-fr gap-2.5 overflow-hidden`}
            >
              {groups.map(group => {
                const useTwoAssetCols = group.assets.length > (isDenseMode ? 4 : 6);
                const maxVisibleAssets = isDenseMode ? 10 : 14;
                const visibleAssets = group.assets.slice(0, maxVisibleAssets);
                const hiddenCount = group.assets.length - visibleAssets.length;

                return (
                  <div
                    key={group.id}
                    className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col min-h-0 overflow-hidden"
                  >
                    {/* Card Header */}
                    <div className="shrink-0 flex items-start justify-between gap-2 border-b border-slate-800/80 pb-1.5 mb-1.5">
                      <div className="min-w-0">
                        <h4
                          className="font-bold text-white text-xs leading-tight truncate"
                          title={group.name}
                        >
                          {group.name}
                        </h4>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5 truncate font-mono tabular-nums">
                          {group.city && (
                            <span className="truncate">
                              {group.city}/{group.state}
                            </span>
                          )}
                          {group.city && (
                            <span aria-hidden="true" className="text-slate-600">
                              ·
                            </span>
                          )}
                          <span
                            className={
                              group.status === 'active'
                                ? 'text-emerald-400 font-bold'
                                : group.status === 'completed'
                                ? 'text-slate-400 font-bold'
                                : 'text-blue-400 font-bold'
                            }
                          >
                            {group.status === 'active'
                              ? 'Ativa'
                              : group.status === 'completed'
                              ? 'Concluída'
                              : 'Matriz'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 font-mono tabular-nums text-[10px] leading-tight">
                        <div className="font-black text-sky-400">
                          {group.vehicles.length}V
                          {group.equipments.length > 0 && (
                            <span className="text-purple-300 ml-1">
                              · {group.equipments.length}M
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          <span className="text-emerald-400">{group.availVehicles}D</span>
                          {' / '}
                          <span className="text-indigo-400">{group.inUseVehicles}U</span>
                          {' / '}
                          <span className="text-amber-400">{group.maintVehicles}O</span>
                        </div>
                      </div>
                    </div>

                    {/* Unified Vehicles + Machinery Compact Grid/List */}
                    <div
                      className={`flex-1 min-h-0 overflow-hidden grid content-start gap-1 ${
                        useTwoAssetCols ? 'grid-cols-2' : 'grid-cols-1'
                      }`}
                    >
                      {visibleAssets.map(asset => (
                        <div
                          key={asset.id}
                          title={asset.tooltip}
                          className={`rounded-lg px-1.5 py-1 flex items-center justify-between gap-1 text-[10px] border min-w-0 ${
                            asset.kind === 'equipment'
                              ? 'bg-purple-950/25 border-purple-500/25'
                              : 'bg-slate-950/90 border-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center gap-1 min-w-0">
                            <span
                              className={`font-mono font-bold px-1 py-0 rounded text-[9px] shrink-0 ${
                                asset.kind === 'equipment'
                                  ? 'text-purple-200 bg-purple-900/60'
                                  : 'text-white bg-slate-800'
                              }`}
                            >
                              {asset.code}
                            </span>
                            <span
                              className={`font-medium truncate ${
                                asset.kind === 'equipment'
                                  ? 'text-purple-100'
                                  : 'text-slate-200'
                              }`}
                            >
                              {asset.name}
                            </span>
                          </div>
                          <span
                            className={`px-1 py-0 rounded text-[8.5px] font-mono font-bold border shrink-0 ${asset.statusCls}`}
                          >
                            {asset.statusLabel}
                          </span>
                        </div>
                      ))}

                      {hiddenCount > 0 && (
                        <div className="col-span-full text-center text-[9.5px] font-mono text-slate-400 pt-0.5">
                          +{hiddenCount} ativos vinculados nesta obra
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Compact strip for machinery allocated on works without vehicles */}
          {otherWorkEquipments.length > 0 && (
            <div className="shrink-0 bg-slate-900/90 border border-purple-500/30 rounded-xl px-3 py-2 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="font-bold text-purple-300 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-purple-400" />
                  Maquinários em Obras Sem Veículos ({otherWorkEquipments.length})
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-1.5">
                {otherWorkEquipments.slice(0, 12).map(eq => {
                  const eqStatus =
                    eq.status === 'available'
                      ? {
                          label: 'Disp.',
                          cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        }
                      : eq.status === 'in_use'
                      ? {
                          label: 'Oper.',
                          cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                        }
                      : {
                          label: 'Manut.',
                          cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        };
                  return (
                    <div
                      key={eq.id}
                      className="bg-slate-950/90 border border-slate-800 rounded-lg px-2 py-1 flex items-center justify-between gap-1.5 text-[10px] min-w-0"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-purple-100 truncate">
                          {eq.name}
                        </div>
                        <div className="text-[9px] text-slate-400 truncate">
                          {eq.workName || 'Geral / Matriz'}
                        </div>
                      </div>
                      <span
                        className={`px-1 py-0 rounded text-[8.5px] font-mono font-bold border shrink-0 ${eqStatus.cls}`}
                      >
                        {eqStatus.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TvWorkFleetUnifiedView;
