import React from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  Car,
  Download,
  FileText,
  Filter
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { User, Vehicle, Equipment, Trip, EquipmentUsage, ConstructionWork } from '../types';
import { FleetStore } from '../store/fleetStore';

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
  vehicles: rawVehicles,
  equipments: rawEquipments,
  trips: rawTrips,
  equipmentUsages: rawEquipmentUsages,
  users,
  works: inputWorks
}: ManagerDashboardProps) {

  const store = FleetStore.getInstance();
  const works = inputWorks || store.works;

  // --- FILTER STATES ---
  const [filterAssetType, setFilterAssetType] = React.useState('all'); // 'all', 'vehicles', 'equipments'
  const [filterVehCategory, setFilterVehCategory] = React.useState('');
  const [filterEqType, setFilterEqType] = React.useState('');
  const [filterWorkId, setFilterWorkId] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');
  const [filterDateStart, setFilterDateStart] = React.useState('');
  const [filterDateEnd, setFilterDateEnd] = React.useState('');
  const [showFilters, setShowFilters] = React.useState(false);

  const isWithinDateRange = (dateStr: string | undefined | null) => {
    if (!dateStr) return true;
    const d = new Date(dateStr).getTime();
    if (filterDateStart && d < new Date(filterDateStart).getTime()) return false;
    
    if (filterDateEnd) {
      const endD = new Date(filterDateEnd);
      endD.setHours(23, 59, 59, 999);
      if (d > endD.getTime()) return false;
    }
    
    return true;
  };

  const vehicles = rawVehicles.filter(v => {
    if (filterAssetType === 'equipments') return false;
    if (filterVehCategory && v.category !== filterVehCategory) return false;
    if (filterStatus && v.status !== filterStatus) return false;
    if (filterWorkId && v.workId !== filterWorkId) return false;
    return true;
  });

  const equipments = rawEquipments.filter(e => {
    if (filterAssetType === 'vehicles') return false;
    if (filterEqType && e.type !== filterEqType) return false;
    if (filterStatus && e.status !== filterStatus) return false;
    if (filterWorkId && e.workId !== filterWorkId) return false;
    return true;
  });

  const trips = rawTrips.filter(t => {
    if (!isWithinDateRange(t.startTime)) return false;
    if (filterWorkId && t.workId !== filterWorkId) return false;
    if (filterAssetType === 'equipments') return false;
    if (filterVehCategory) {
      const v = rawVehicles.find(vh => vh.id === t.vehicleId);
      if (!v || v.category !== filterVehCategory) return false;
    }
    return true;
  });

  const equipmentUsages = rawEquipmentUsages.filter(u => {
    if (!isWithinDateRange(u.startTime)) return false;
    if (filterWorkId && u.workId !== filterWorkId) return false;
    if (filterAssetType === 'vehicles') return false;
    if (filterEqType) {
      const eq = rawEquipments.find(e => e.id === u.equipmentId);
      if (!eq || eq.type !== filterEqType) return false;
    }
    return true;
  });

  // --- 1. MAINTENANCE COSTS COMPUTATIONS ---
  const vehicleMaintTotal = vehicles.reduce((sum, v) => {
    const historySum = (v.maintenanceHistory || []).reduce((hSum, log) => {
      if (!isWithinDateRange(log.resolvedAt || log.sentAt)) return hSum;
      return hSum + (log.cost || 0);
    }, 0);
    return sum + historySum;
  }, 0);

  const equipmentMaintTotal = equipments.reduce((sum, eq) => {
    const historySum = (eq.maintenanceHistory || []).reduce((hSum, log) => {
      if (!isWithinDateRange(log.resolvedAt || log.sentAt)) return hSum;
      return hSum + (log.cost || 0);
    }, 0);
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
    sentAt: string;
  }

  const allMaintenanceEvents: CompiledMaintenanceEvent[] = [];

  vehicles.forEach((v) => {
    (v.maintenanceHistory || []).forEach((log) => {
      if (!isWithinDateRange(log.resolvedAt || log.sentAt)) return;
      allMaintenanceEvents.push({
        id: log.id,
        itemName: `${v.brand} ${v.model} (${v.plate})`,
        type: 'Veículo',
        reason: log.reason,
        resolution: log.resolution || 'Concluída',
        cost: log.cost || 0,
        resolvedAt: log.resolvedAt || new Date().toISOString(),
        sentAt: log.sentAt
      });
    });
  });

  equipments.forEach((e) => {
    (e.maintenanceHistory || []).forEach((log) => {
      if (!isWithinDateRange(log.resolvedAt || log.sentAt)) return;
      allMaintenanceEvents.push({
        id: log.id,
        itemName: `${e.name} (${e.brand} ${e.model})`,
        type: 'Maquinário',
        reason: log.reason,
        resolution: log.resolution || 'Concluída',
        cost: log.cost || 0,
        resolvedAt: log.resolvedAt || new Date().toISOString(),
        sentAt: log.sentAt
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
          total + (v.maintenanceHistory || []).reduce((s, log) => {
            if (!isWithinDateRange(log.resolvedAt || log.sentAt)) return s;
            return log.workId === w.id ? s + (log.cost || 0) : s;
          }, 0),
          0
        ) +
        equipments.reduce((total, e) =>
          total + (e.maintenanceHistory || []).reduce((s, log) => {
            if (!isWithinDateRange(log.resolvedAt || log.sentAt)) return s;
            return log.workId === w.id ? s + (log.cost || 0) : s;
          }, 0),
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
          total + (v.maintenanceHistory || []).reduce((s, log) => {
            if (!isWithinDateRange(log.resolvedAt || log.sentAt)) return s;
            return (!log.workId || log.workId === 'geral') ? s + (log.cost || 0) : s;
          }, 0),
          0
        ) +
        equipments.reduce((total, e) =>
          total + (e.maintenanceHistory || []).reduce((s, log) => {
            if (!isWithinDateRange(log.resolvedAt || log.sentAt)) return s;
            return (!log.workId || log.workId === 'geral') ? s + (log.cost || 0) : s;
          }, 0),
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
  ].filter(group => {
    if (filterWorkId && group.id !== filterWorkId) return false;
    return group.id === 'geral' || group.status === 'active' || group.vehicles.length > 0 || group.maintenanceCost > 0;
  });

  // Calculate maximum cost amongst Obras for ratio bar display
  const maxMaintCostAcrossObras = Math.max(...groupingData.map(g => g.maintenanceCost), 1);

  // --- 7. EXPORT REPORTS FUNCTIONS (PDF IMPLEMENTATION) ---
  const exportMaintenance = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const drawDecorations = (pageNum: number) => {
      // Header Band
      doc.setFillColor(30, 41, 59); // Slate-800
      doc.rect(0, 0, 210, 15, 'F');
      doc.setFillColor(16, 185, 129); // Emerald-500
      doc.rect(0, 15, 210, 2, 'F');

      // Header Brand Stamp
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('ADM-FROTA • CENTRAL DE CONTROLE DE MANUTENÇÕES', 12, 10);

      // Current Date
      doc.setTextColor(200, 200, 200);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(new Date().toLocaleDateString('pt-BR'), 198, 10, { align: 'right' });

      // Footer
      doc.setTextColor(115, 115, 115);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Relatório Gerencial de Manutenções Operacionais', 12, 287);
      doc.text(`Página ${pageNum}`, 198, 287, { align: 'right' });
      doc.setDrawColor(226, 232, 240);
      doc.line(12, 282, 198, 282);
    };

    // First page decoration
    drawDecorations(1);

    // Document Title Section
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Histórico Financeiro e Técnico de Manutenções', 12, 28);

    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Solicitado por: ${currentUser?.name || 'Gestor'} | Perfil: ${currentUser?.role || 'gerencial'} | Sincronizado em tempo real`, 12, 33);

    // Summary Box Rows (KPI stats)
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(12, 38, 186, 22, 3, 3, 'FD');

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('CUSTO OPERACIONAL TOTAL', 20, 44);
    doc.text('MANUTENÇÃO DE VEÍCULOS', 82, 44);
    doc.text('MANUTENÇÃO DE MAQUINÁRIO', 142, 44);

    doc.setTextColor(15, 23, 42); // Slate-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`R$ ${totalMaintCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 52);
    doc.text(`R$ ${vehicleMaintTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 82, 52);
    doc.text(`R$ ${equipmentMaintTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 142, 52);

    // Sift & Prepare Rows
    const rows: any[] = [];
    vehicles.forEach(v => {
      (v.maintenanceHistory || []).forEach(log => {
        rows.push([
          log.id.toUpperCase().substring(0, 8),
          `${v.brand} ${v.model} (${v.plate})`,
          'Veículo',
          log.workName || 'Geral/Central',
          log.reason || 'Sinalizado preventiva',
          log.resolution || 'Concluída',
          `R$ ${log.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          log.resolvedAt ? new Date(log.resolvedAt).toLocaleDateString('pt-BR') : ''
        ]);
      });
    });

    equipments.forEach(e => {
      (e.maintenanceHistory || []).forEach(log => {
        rows.push([
          log.id.toUpperCase().substring(0, 8),
          `${e.name} (${e.brand} ${e.model})`,
          'Equipamento',
          log.workName || 'Geral/Central',
          log.reason || 'Sinalizado preventiva',
          log.resolution || 'Concluída',
          `R$ ${log.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          log.resolvedAt ? new Date(log.resolvedAt).toLocaleDateString('pt-BR') : ''
        ]);
      });
    });

    autoTable(doc, {
      startY: 66,
      head: [['ID ATIVO', 'NOME / CATEGORIA DO REPARO', 'TIPO ATIVO', 'CANTEIRO', 'CHAMADO / MOTIVO', 'AÇÃO / RESOLUÇÃO TÉCNICA', 'CUSTO ATIVO', 'CONCLUÍDO']],
      body: rows,
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        font: 'helvetica'
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 35 },
        2: { cellWidth: 18 },
        3: { cellWidth: 20 },
        4: { cellWidth: 32 },
        5: { cellWidth: 32 },
        6: { cellWidth: 18, halign: 'right' },
        7: { cellWidth: 16 }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          drawDecorations(data.pageNumber);
        }
      },
      margin: { top: 25, bottom: 20, left: 12, right: 12 }
    });

    doc.save('relatorio_gerencial_manutencoes.pdf');
  };

  const exportFleetAndWorks = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const drawDecorations = (pageNum: number) => {
      doc.setFillColor(30, 41, 59); // Slate-800
      doc.rect(0, 0, 297, 15, 'F');
      doc.setFillColor(14, 165, 233); // Sky-500
      doc.rect(0, 15, 297, 2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('ADM-FROTA • INVENTÁRIO COMPLETO DE FROTA E CANTEIROS DE OBRAS', 12, 10);

      doc.setTextColor(200, 200, 200);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(new Date().toLocaleDateString('pt-BR'), 285, 10, { align: 'right' });

      doc.setTextColor(115, 115, 115);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Inventário Patrimonial e Relação de Obras Ativas', 12, 200);
      doc.text(`Página ${pageNum}`, 285, 200, { align: 'right' });
      doc.setDrawColor(226, 232, 240);
      doc.line(12, 195, 285, 195);
    };

    drawDecorations(1);

    // Title Section
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Inventário Geral de Ativos, Frota e Canteiros de Obra', 12, 26);

    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Gerado por: ${currentUser?.name || 'Gestor'} | Total Veículos: ${vehTotal} | Total Máquinas Pesadas: ${eqTotal}`, 12, 31);

    // Tables of vehicles
    const sortedVehicles = [...vehicles].sort((a, b) => {
      const workA = a.workName || 'Garagem Central';
      const workB = b.workName || 'Garagem Central';
      return workA.localeCompare(workB);
    });

    const vehRows: any[] = [];
    sortedVehicles.forEach(v => {
      const nextMaint = (v.lastMaintenanceKm && v.maintenanceIntervalKm) ? (v.lastMaintenanceKm + v.maintenanceIntervalKm) : null;
      const nextMaintLabel = nextMaint ? `${nextMaint} KM` : 'Não config.';
      const nextOilLabel = v.nextOilChangeKm ? `${v.nextOilChangeKm} KM` : 'Não config.';
      const statusLabel = v.status === 'available' ? 'Disponível' : v.status === 'in_use' ? 'Em Uso' : 'Oficina';
      const wName = v.workName || 'Garagem Central';

      vehRows.push([
        v.id.toUpperCase().substring(0, 8),
        `${v.brand} ${v.model}`,
        v.category === 'caminhão' ? 'Caminhão' : 'Utilitário',
        v.plate,
        v.color,
        `${v.currentKm} KM`,
        nextMaintLabel,
        nextOilLabel,
        statusLabel,
        wName
      ]);
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('1. Veículos e Utilitários de Logística (Agrupados por Obra)', 12, 40);

    autoTable(doc, {
      startY: 44,
      head: [['ID ATIVO', 'VEÍCULO', 'CATEGORIA', 'PLACA', 'COR', 'KM ATUAL', 'PRÓX. REVISÃO', 'PRÓX. MUDANÇA ÓLEO', 'STATUS', 'VINCULAÇÃO CANTEIRO OBRA']],
      body: vehRows,
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        font: 'helvetica'
      },
      columnStyles: {
        5: { minCellWidth: 18, cellWidth: 'wrap' } // KM ATUAL
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          drawDecorations(data.pageNumber);
        }
      },
      margin: { top: 25, left: 12, right: 12 }
    });

    // Equipment analysis
    const eqRows: any[] = [];
    equipments.forEach(e => {
      const nextMaint = (e.lastMaintenanceHours && e.maintenanceIntervalHours) ? (e.lastMaintenanceHours + e.maintenanceIntervalHours) : null;
      const nextMaintLabel = nextMaint ? `${nextMaint} hrs` : 'Não config.';
      const statusLabel = e.status === 'available' ? 'Disponível' : e.status === 'in_use' ? 'Em Uso' : 'Oficina';
      const wName = e.workName || 'Garagem Central';

      eqRows.push([
        e.id.toUpperCase().substring(0, 8),
        e.name,
        e.type || 'Equipamento',
        e.brand,
        e.model,
        e.year.toString(),
        `${e.currentHours} hrs`,
        nextMaintLabel,
        statusLabel,
        wName
      ]);
    });

    const finalY = (doc as any).lastAutoTable.finalY + 12;

    if (finalY < 180) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text('2. Tratores, Máquinas e Equipamentos Pesados', 12, finalY);

      autoTable(doc, {
        startY: finalY + 4,
        head: [['CÓDIGO', 'MAQUINÁRIO', 'CATEGORIA TRABALHO', 'MARCA', 'MODELO', 'ANO', 'HORÍMETRO', 'PRÓX. PREVENTIVA', 'STATUS', 'CANTEIRO DESTINO']],
        body: eqRows,
        headStyles: {
          fillColor: [71, 85, 105],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2.5,
          font: 'helvetica'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            drawDecorations(data.pageNumber);
          }
        },
        margin: { top: 25, left: 12, right: 12, bottom: 20 }
      });
    } else {
      doc.addPage();
      drawDecorations(2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('2. Tratores, Máquinas e Equipamentos Pesados', 12, 26);

      autoTable(doc, {
        startY: 31,
        head: [['CÓDIGO', 'MAQUINÁRIO', 'CATEGORIA TRABALHO', 'MARCA', 'MODELO', 'ANO', 'HORÍMETRO', 'PRÓX. PREVENTIVA', 'STATUS', 'CANTEIRO DESTINO']],
        body: eqRows,
        headStyles: {
          fillColor: [71, 85, 105],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2.5,
          font: 'helvetica'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            drawDecorations(data.pageNumber);
          }
        },
        margin: { top: 25, left: 12, right: 12, bottom: 20 }
      });
    }

    doc.save('inventario_frotas_e_obras.pdf');
  };

  const exportTripsAndOperations = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const drawDecorations = (pageNum: number) => {
      doc.setFillColor(30, 41, 59); // Slate-800
      doc.rect(0, 0, 297, 15, 'F');
      doc.setFillColor(79, 70, 229); // Indigo-600
      doc.rect(0, 15, 297, 2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('ADM-FROTA • ATIVIDADE DIÁRIA E CONTROLE DE OPERAÇÕES EM CAMPO', 12, 10);

      doc.setTextColor(200, 200, 200);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(new Date().toLocaleDateString('pt-BR'), 285, 10, { align: 'right' });

      doc.setTextColor(115, 115, 115);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Registro Rodoviário diário e Atividades Operacionais de Maquinário', 12, 200);
      doc.text(`Página ${pageNum}`, 285, 200, { align: 'right' });
      doc.setDrawColor(226, 232, 240);
      doc.line(12, 195, 285, 195);
    };

    drawDecorations(1);

    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Registro Diário Completo de Viagens e Maquinários Ativos', 12, 26);

    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Planilha operacional sincronizada do Banco de Dados | Gerado por: ${currentUser?.name || 'Gestor'}`, 12, 31);

    // Trips logic
    const tripRows: any[] = [];
    trips.forEach(t => {
      const dtInicio = new Date(t.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      const dtFim = t.checkOut?.time ? new Date(t.checkOut.time).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Ativo em Campo';
      const kmDrivenLabel = t.kmDriven ? `${t.kmDriven} KM` : 'Pendente';
      const statusLabel = t.status === 'active' ? 'Rodando' : 'Finalizado';

      tripRows.push([
        t.id.toUpperCase().substring(0, 8),
        t.driverName,
        t.vehicleModelPlate,
        t.workName || 'N/A',
        t.checkIn.origin || 'Base',
        t.checkIn.destination,
        `${t.checkIn.km} KM`,
        t.checkOut?.km ? `${t.checkOut.km} KM` : 'N/A',
        kmDrivenLabel,
        dtInicio,
        dtFim,
        statusLabel
      ]);
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('1. Atividades Rodoviárias (Histórico de Viagens)', 12, 40);

    autoTable(doc, {
      startY: 44,
      head: [['ID VIAGEM', 'CONDUTOR / CARGO', 'PLACA / VEÍCULO', 'CANT. OBRA', 'PONTO INICIAL', 'DESTINO FINAL', 'KM SAÍDA', 'KM FINAL', 'REDE KM', 'INÍCIO ROTA', 'FIM ROTA', 'ESTADO']],
      body: tripRows,
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 7.2,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
        font: 'helvetica'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          drawDecorations(data.pageNumber);
        }
      },
      margin: { top: 25, left: 12, right: 12 }
    });

    // Machine usages analysis
    const usageRows: any[] = [];
    equipmentUsages.forEach(eu => {
      const dtInicio = new Date(eu.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      const dtFim = eu.checkOut?.time ? new Date(eu.checkOut.time).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Em Operação';
      const hrWorkedLabel = eu.hoursWorked ? `${eu.hoursWorked} hrs` : 'Em Operação';
      const statusLabel = eu.status === 'active' ? 'Rodando' : 'Finalizado';

      usageRows.push([
        eu.id.toUpperCase().substring(0, 8),
        eu.operatorName,
        eu.equipmentNameModel,
        eu.workName || 'N/A',
        eu.checkIn.origin || 'Canteiro',
        eu.checkIn.reason,
        `${eu.checkIn.hours} hrs`,
        eu.checkOut?.hours ? `${eu.checkOut.hours} hrs` : 'N/A',
        hrWorkedLabel,
        dtInicio,
        dtFim,
        statusLabel
      ]);
    });

    const finalY = (doc as any).lastAutoTable.finalY + 12;

    if (finalY < 180) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text('2. Diário de Uso e Alocação de Maquinário Pesado', 12, finalY);

      autoTable(doc, {
        startY: finalY + 4,
        head: [['ID ATIVIDADE', 'OPERADOR TÉCNICO', 'MÁQUINA TRATADA', 'CANT. OBRA', 'PONTO TRABALHO', 'ATIVIDADE EXECUTADA', 'HRS INICIAIS', 'HRS FINAIS', 'TEMPO GASTO', 'ENTRADA', 'SAÍDA', 'ESTADO']],
        body: usageRows,
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontSize: 7.2,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 7,
          cellPadding: 2,
          font: 'helvetica'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            drawDecorations(data.pageNumber);
          }
        },
        margin: { top: 25, left: 12, right: 12, bottom: 20 }
      });
    } else {
      doc.addPage();
      drawDecorations(2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('2. Diário de Uso e Alocação de Maquinário Pesado', 12, 26);

      autoTable(doc, {
        startY: 31,
        head: [['ID ATIVIDADE', 'OPERADOR TÉCNICO', 'MÁQUINA TRATADA', 'CANT. OBRA', 'PONTO TRABALHO', 'ATIVIDADE EXECUTADA', 'HRS INICIAIS', 'HRS FINAIS', 'TEMPO GASTO', 'ENTRADA', 'SAÍDA', 'ESTADO']],
        body: usageRows,
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontSize: 7.2,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 7,
          cellPadding: 2,
          font: 'helvetica'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            drawDecorations(data.pageNumber);
          }
        },
        margin: { top: 25, left: 12, right: 12, bottom: 20 }
      });
    }

    doc.save('registro_viagens_e_maquinas.pdf');
  };

  const exportExecutiveMemo = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const drawDecorations = (pageNum: number) => {
      doc.setFillColor(30, 41, 59); // Slate-800
      doc.rect(0, 0, 210, 15, 'F');
      doc.setFillColor(245, 158, 11); // Amber-500
      doc.rect(0, 15, 210, 2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('ADM-FROTA • MEMORANDO EXECUTIVO DE AUDITORIA E KPIS GERAIS', 12, 10);

      doc.setTextColor(200, 200, 200);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(new Date().toLocaleDateString('pt-BR'), 198, 10, { align: 'right' });

      doc.setTextColor(115, 115, 115);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Sumário Executivo e Consolidado Geral de Fluxos de Trabalho', 12, 287);
      doc.text(`Página ${pageNum}`, 198, 287, { align: 'right' });
      doc.setDrawColor(226, 232, 240);
      doc.line(12, 282, 198, 282);
    };

    drawDecorations(1);

    // Header segment
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Relatório Executivo e KPIs de Desempenho', 12, 28);

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 12, 33);
    doc.text(`Solicitado por: ${currentUser?.name || 'Gestor'} (Função: ${currentUser?.role || 'gerencial'})`, 12, 38);

    // Box de KPIs 1: Oficina e Financeiro
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(12, 44, 90, 48, 3, 3, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('FINANCEIRO & OFICINAS', 18, 51);

    doc.setDrawColor(239, 68, 68); // Red
    doc.line(18, 54, 94, 54);

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Custos Totais de Manutenção:', 18, 60);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);
    doc.setFontSize(11);
    doc.text(`R$ ${totalMaintCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 18, 65);

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('- Frota Rodoviária:', 18, 71);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`R$ ${vehicleMaintTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 58, 71);

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('- Parque Tratores/Maq:', 18, 77);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`R$ ${equipmentMaintTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 58, 77);

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('- Unidades Paradas hoje:', 18, 83);
    doc.setTextColor(245, 158, 11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${activeMaintCount} na oficina`, 58, 83);


    // Box de KPIs 2: Status Geral de Ativos
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(108, 44, 90, 48, 3, 3, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('FROTA FISICA & ALOCAÇÃO', 114, 51);

    doc.setDrawColor(16, 185, 129); // Emerald accent
    doc.line(114, 54, 190, 54);

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Parque Rodoviário: ${vehTotal} veículos`, 114, 60);
    doc.text(`- Fração Disponível:`, 114, 65);
    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.text(`${vehAvailable} (${vehAvailablePct}%)`, 160, 65);

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(`- Em Viagem Ativa:`, 114, 71);
    doc.setTextColor(79, 70, 229);
    doc.setFont('helvetica', 'bold');
    doc.text(`${vehInUse} (${vehInUsePct}%)`, 160, 71);

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(`Ativos de Canteiro: ${eqTotal} equipamentos`, 114, 77);
    doc.text(`- Tratores Prontos:`, 114, 82);
    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.text(`${eqAvailable} (${eqAvailablePct}%)`, 160, 82);

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(`- Operando no Solo:`, 114, 87);
    doc.setTextColor(79, 70, 229);
    doc.setFont('helvetica', 'bold');
    doc.text(`${eqInUse} (${eqInUsePct}%)`, 160, 87);


    // SECTION: ALERTAS E PENDÊNCIAS PREVENTIVAS
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Diagnósticos de Conformidade Preventiva', 12, 100);

    if (alerts.length === 0) {
      autoTable(doc, {
        startY: 104,
        head: [],
        body: [[
          'CONFORMIDADE OPERACIONAL REGULAMENTAR INTEGRAL\n\nTodos os veículos, utilitários e maquinários leves/pesados encontram-se em perfeita conformidade com as regras de quilometragem, horímetro e cronogramas de troca de lubrificantes. Nenhuma pendência de revisão preventiva foi detectada nesta apuração.'
        ]],
        styles: {
          fillColor: [240, 253, 250],
          textColor: [13, 148, 136],
          fontSize: 8.5,
          fontStyle: 'bold',
          cellPadding: 4,
          font: 'helvetica'
        },
        theme: 'plain',
        tableLineColor: [204, 251, 241],
        tableLineWidth: 1,
        margin: { top: 25, left: 12, right: 12 },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            drawDecorations(data.pageNumber);
          }
        }
      });
    } else {
      autoTable(doc, {
        startY: 104,
        head: [['ATIVO AFETADO / EQUIPAMENTO', 'SINALIZAÇÃO / ALERTA DE RISCO', 'AÇÃO PREVENTIVA RECOMENDADA']],
        body: alerts.map(al => [
          al.name,
          al.type === 'km' ? 'Quilometragem Excedida' : al.type === 'oil' ? 'Substituição de Óleo/Filtro' : 'Horas de Trabalho Excedidas',
          al.type === 'km' ? 'Agendar Revisão de KM Preventiva Geral na Oficina' : al.type === 'oil' ? 'Substituir Lubrificante e Filtro de Óleo na Garagem' : 'Revisão Sistemática de Horas e Filtros Regulamentares'
        ]),
        headStyles: {
          fillColor: [220, 38, 38],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2.5,
          font: 'helvetica'
        },
        alternateRowStyles: {
          fillColor: [254, 242, 242]
        },
        margin: { top: 25, left: 12, right: 12 },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            drawDecorations(data.pageNumber);
          }
        }
      });
    }

    // SECTION: CUSTOS POR CANTEIRO
    const complianceFinalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Alocação de Recursos e Desempenho por Canteiro Obras', 12, complianceFinalY);

    const obraRows: any[] = groupingData.map(group => [
      group.name,
      `${group.city}/${group.state}`,
      `${group.vehicles.length} Veículos`,
      `R$ ${group.maintenanceCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: complianceFinalY + 4,
      head: [['CANTEIRO OPERACIONAL / SITE', 'LOCALIDADE', 'VEÍCULOS ALOCADOS', 'CUSTO DE MANUTENÇÃO ACUMULADO (R$)']],
      body: obraRows,
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        font: 'helvetica'
      },
      columnStyles: {
        0: { cellWidth: 72 },
        1: { cellWidth: 38 },
        2: { cellWidth: 36 },
        3: { cellWidth: 40, halign: 'right' }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { top: 25, left: 12, right: 12 },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          drawDecorations(data.pageNumber);
        }
      }
    });

    const maintY = (doc as any).lastAutoTable.finalY + 10;
    const recentRows = recentMaintenances.map(m => [
      m.itemName,
      m.type,
      m.reason,
      m.resolution,
      `R$ ${m.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ]);

    if (maintY < 235) {
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Últimos Eventos de Manutenção Finalizados no Canteiro', 12, maintY);

      autoTable(doc, {
        startY: maintY + 4,
        head: [['SÉRIE / ATIVO AFETADO', 'CATEGORIA', 'RELATO DO OCORRIDO', 'LAUDO MESTRE / CONSERTOS', 'CUSTO DO TICKET']],
        body: recentRows,
        headStyles: {
          fillColor: [71, 85, 105],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2.5,
          font: 'helvetica'
        },
        columnStyles: {
          0: { cellWidth: 42 },
          1: { cellWidth: 20 },
          2: { cellWidth: 42 },
          3: { cellWidth: 46 },
          4: { cellWidth: 36, halign: 'right' }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            drawDecorations(data.pageNumber);
          }
        },
        margin: { top: 25, left: 12, right: 12, bottom: 20 }
      });
    } else {
      doc.addPage();
      drawDecorations(2);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Últimos Eventos de Manutenção Finalizados no Canteiro', 12, 28);

      autoTable(doc, {
        startY: 32,
        head: [['SÉRIE / ATIVO AFETADO', 'CATEGORIA', 'RELATO DO OCORRIDO', 'LAUDO MESTRE / CONSERTOS', 'CUSTO DO TICKET']],
        body: recentRows,
        headStyles: {
          fillColor: [71, 85, 105],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2.5,
          font: 'helvetica'
        },
        columnStyles: {
          0: { cellWidth: 42 },
          1: { cellWidth: 20 },
          2: { cellWidth: 42 },
          3: { cellWidth: 46 },
          4: { cellWidth: 36, halign: 'right' }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            drawDecorations(data.pageNumber);
          }
        },
        margin: { top: 25, left: 12, right: 12, bottom: 20 }
      });
    }

    doc.save('memorando_gerencial_indicadores.pdf');
  };

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
        <div className="flex items-center gap-4 self-start md:self-auto">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border ${showFilters ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
          >
            <Filter className="w-4 h-4" />
            Filtros Avançados
          </button>
          
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200/60 px-4 py-2.5 rounded-2xl shrink-0 text-left hidden sm:flex">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <div>
              <span className="block text-[8px] font-sans font-bold uppercase text-amber-805 tracking-wider font-mono">Modo de Acesso</span>
              <span className="text-xs font-bold text-amber-950">Apenas Leitura</span>
            </div>
          </div>
        </div>
      </div>

      {/* FILTERS PANEL */}
      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm animate-fade-in text-left space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2 font-display">
              <Filter className="w-4 h-4 text-blue-600" />
              Critérios de Filtragem de Dados
            </h3>
            <button 
              onClick={() => {
                setFilterAssetType('all');
                setFilterVehCategory('');
                setFilterEqType('');
                setFilterWorkId('');
                setFilterStatus('');
                setFilterDateStart('');
                setFilterDateEnd('');
              }}
              className="text-[10px] text-blue-600 font-bold uppercase hover:underline"
            >
              Limpar Filtros
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold text-slate-500">Tipo de Ativo</label>
              <select value={filterAssetType} onChange={(e) => setFilterAssetType(e.target.value)} className="w-full text-xs bg-[#F8FAFC] border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 outline-none">
                <option value="all">Ambos (Veículos e Maquinários)</option>
                <option value="vehicles">Apenas Veículos</option>
                <option value="equipments">Apenas Maquinários</option>
              </select>
            </div>

            {filterAssetType !== 'equipments' && (
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold text-slate-500">Categoria de Veículo</label>
                <select value={filterVehCategory} onChange={(e) => setFilterVehCategory(e.target.value)} className="w-full text-xs bg-[#F8FAFC] border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 outline-none">
                  <option value="">Todas</option>
                  {store.vehicleCategories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {filterAssetType !== 'vehicles' && (
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold text-slate-500">Tipo de Maquinário</label>
                <select value={filterEqType} onChange={(e) => setFilterEqType(e.target.value)} className="w-full text-xs bg-[#F8FAFC] border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 outline-none">
                  <option value="">Todos</option>
                  {store.equipmentTypes.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold text-slate-500">Obra/Canteiro</label>
              <select value={filterWorkId} onChange={(e) => setFilterWorkId(e.target.value)} className="w-full text-xs bg-[#F8FAFC] border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 outline-none">
                <option value="">Todas as Obras</option>
                {works.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.city})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold text-slate-500">Status Operacional</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full text-xs bg-[#F8FAFC] border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 outline-none">
                <option value="">Todos</option>
                <option value="available">Disponível</option>
                <option value="in_use">Em Uso</option>
                <option value="maintenance">Em Manutenção</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold text-slate-500">Data Inicial (Manutenções/Viagens)</label>
              <input type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} className="w-full text-xs bg-[#F8FAFC] border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold text-slate-500">Data Final (Manutenções/Viagens)</label>
              <input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} className="w-full text-xs bg-[#F8FAFC] border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 outline-none" />
            </div>
          </div>
        </div>
      )}

      {/* 📥 Central de Exportação de Relatórios */}
      <div id="management_reports_exporter_panel" className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-800 text-left relative overflow-hidden">
        {/* Glow circles behind for high contrast visual elegance */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -ml-16 -mb-16" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide font-mono">
              Central de Exportação
            </span>
            <h3 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white flex items-center gap-2">
              <Download className="w-6 h-6 text-emerald-400 shrink-0" />
              Download de Relatórios Gerenciais em PDF
            </h3>
            <p className="text-slate-350 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Exporte relatórios consolidados em formato PDF com layout intuitivo de alta resolução, prontos para impressão ou apresentação para acionistas e diretoria fiscal.
            </p>
          </div>
        </div>

        {/* Export options grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 relative z-10">
          
          {/* Card 1: Financeiro Manutenções */}
          <button 
            type="button"
            id="export_maintenance_button"
            onClick={exportMaintenance}
            className="flex flex-col items-start p-4 bg-slate-850/60 hover:bg-slate-800/90 border border-slate-705/80 hover:border-emerald-500/50 rounded-2xl text-left transition-all group focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl mb-3.5 group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-extrabold text-white group-hover:text-emerald-300 transition-colors">
              Gastos com Manutenção
            </h4>
            <p className="text-[11px] text-slate-400 mt-1 flex-1 leading-normal">
              Histórico detalhado de custos, peças substituídas e resoluções técnicas por veículo e canteiro.
            </p>
            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 mt-4 font-mono">
              Exportar PDF <Download className="w-3.5 h-3.5" />
            </span>
          </button>

          {/* Card 2: Alocação Imobiliária & Quadro de Obras */}
          <button 
            type="button"
            id="export_fleet_allocated_button"
            onClick={exportFleetAndWorks}
            className="flex flex-col items-start p-4 bg-slate-850/60 hover:bg-slate-800/90 border border-slate-705/80 hover:border-sky-500/50 rounded-2xl text-left transition-all group focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl mb-3.5 group-hover:scale-110 transition-transform">
              <Construction className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-extrabold text-white group-hover:text-sky-300 transition-colors">
              Inventário de Ativos por Obra
            </h4>
            <p className="text-[11px] text-slate-400 mt-1 flex-1 leading-normal">
              Controle físico, quilometragem, horímetros atuais e canteiros de obras vinculados a cada frota.
            </p>
            <span className="text-[10px] font-bold text-sky-400 flex items-center gap-1 mt-4 font-mono">
              Exportar PDF <Download className="w-3.5 h-3.5" />
            </span>
          </button>

          {/* Card 3: Viagens, RDO e Combustível (RDO Log) */}
          <button 
            type="button"
            id="export_trips_history_button"
            onClick={exportTripsAndOperations}
            className="flex flex-col items-start p-4 bg-slate-850/60 hover:bg-slate-800/90 border border-slate-705/80 hover:border-indigo-500/50 rounded-2xl text-left transition-all group focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl mb-3.5 group-hover:scale-110 transition-transform">
              <Truck className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-extrabold text-white group-hover:text-indigo-300 transition-colors">
              Atividade diária da Frota
            </h4>
            <p className="text-[11px] text-slate-400 mt-1 flex-1 leading-normal">
              Consolidado de quilômetros percorríveis, combustível abastecido e finalidades logísticas.
            </p>
            <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1 mt-4 font-mono">
              Exportar PDF <Download className="w-3.5 h-3.5" />
            </span>
          </button>

          {/* Card 4: Memorando Executivo KPIs de Negócio */}
          <button 
            type="button"
            id="export_executive_summary_button"
            onClick={exportExecutiveMemo}
            className="flex flex-col items-start p-4 bg-slate-850/60 hover:bg-slate-800/90 border border-slate-705/80 hover:border-amber-500/50 rounded-2xl text-left transition-all group focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl mb-3.5 group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-extrabold text-white group-hover:text-amber-300 transition-colors">
              Sumário de Desempenho
            </h4>
            <p className="text-[11px] text-slate-400 mt-1 flex-1 leading-normal">
              Relatório consolidado de todos os KPIs principais, saúde da frota e alertas em um memorando visual.
            </p>
            <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1 mt-4 font-mono">
              Exportar PDF <Download className="w-3.5 h-3.5" />
            </span>
          </button>

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
