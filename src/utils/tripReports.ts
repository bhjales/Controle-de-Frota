import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Trip, 
  ConstructionWork, 
  Vehicle, 
  User 
} from '../types';

export interface TripReportOptions {
  trips: Trip[];
  works: ConstructionWork[];
  vehicles: Vehicle[];
  currentUser?: User | null;
  selectedVehicleId?: string; // 'all' or vehicleId
  selectedWorkId?: string;    // 'all' or workId
  startDate?: string;         // YYYY-MM-DD
  endDate?: string;           // YYYY-MM-DD
  statusFilter?: 'all' | 'completed' | 'active';
  searchQuery?: string;
}

/**
 * Filter trip data based on vehicle, work, period and search criteria
 */
export function getFilteredTripData(options: TripReportOptions): Trip[] {
  const { 
    trips, 
    selectedVehicleId, 
    selectedWorkId, 
    startDate, 
    endDate, 
    statusFilter, 
    searchQuery 
  } = options;

  let filtered = [...trips];

  // Filter by Vehicle
  if (selectedVehicleId && selectedVehicleId !== 'all') {
    filtered = filtered.filter(t => t.vehicleId === selectedVehicleId);
  }

  // Filter by Construction Work (Obra)
  if (selectedWorkId && selectedWorkId !== 'all') {
    filtered = filtered.filter(t => t.workId === selectedWorkId);
  }

  // Filter by Period (Start Date)
  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`).getTime();
    filtered = filtered.filter(t => new Date(t.createdAt).getTime() >= start);
  }

  // Filter by Period (End Date)
  if (endDate) {
    const end = new Date(`${endDate}T23:59:59`).getTime();
    filtered = filtered.filter(t => new Date(t.createdAt).getTime() <= end);
  }

  // Filter by Status
  if (statusFilter && statusFilter !== 'all') {
    filtered = filtered.filter(t => t.status === statusFilter);
  }

  // Filter by search query
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(t => 
      t.driverName.toLowerCase().includes(q) ||
      t.vehicleModelPlate.toLowerCase().includes(q) ||
      t.checkIn.destination.toLowerCase().includes(q) ||
      t.checkIn.reason.toLowerCase().includes(q) ||
      (t.workName && t.workName.toLowerCase().includes(q))
    );
  }

  // Sort descending by date
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return filtered;
}

/**
 * Generates an executive, publication-grade Trip Report in PDF format
 */
export function exportTripReportPDF(options: TripReportOptions) {
  const { 
    works, 
    vehicles, 
    currentUser, 
    selectedVehicleId, 
    selectedWorkId, 
    startDate, 
    endDate,
    statusFilter 
  } = options;

  const filteredTrips = getFilteredTripData(options);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;

  // Header & Footer decorator function
  const drawDecorations = (pageNum: number) => {
    // Header Top Bar
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 15, 'F');
    doc.setFillColor(37, 99, 235); // blue-600 accent line
    doc.rect(0, 15, pageWidth, 2.5, 'F');

    // Corporate Brand and Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('ADM-FROTA • RELATÓRIO OPERACIONAL DE VIAGENS E DESLOCAMENTOS', 12, 10);

    // Timestamp
    doc.setTextColor(203, 213, 225); // slate-300
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const dateFormatted = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Emissão: ${dateFormatted}`, pageWidth - 12, 10, { align: 'right' });

    // Footer divider and texts
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(12, pageHeight - 12, pageWidth - 12, pageHeight - 12);

    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Documento Corporativo Oficial de Rastreamento de Frota e Deslocamentos Operacionais • Dados Auditáveis', 12, pageHeight - 7);
    doc.text(`Página ${pageNum}`, pageWidth - 12, pageHeight - 7, { align: 'right' });
  };

  // Draw Page 1 Decorator
  drawDecorations(1);

  // Main Report Title
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Relatório de Viagens e Controle de Deslocamento', 12, 25);

  // Scopes & Filters labels
  const selectedVehicleObj = selectedVehicleId && selectedVehicleId !== 'all' ? vehicles.find(v => v.id === selectedVehicleId) : null;
  const selectedWorkObj = selectedWorkId && selectedWorkId !== 'all' ? works.find(w => w.id === selectedWorkId) : null;

  const vehicleScope = selectedVehicleObj 
    ? `Veículo: ${selectedVehicleObj.brand} ${selectedVehicleObj.model} (${selectedVehicleObj.plate})` 
    : 'Veículos: Toda a Frota Cadastrada';
    
  const workScope = selectedWorkObj 
    ? `Obra: ${selectedWorkObj.name} (${selectedWorkObj.city}/${selectedWorkObj.state})` 
    : 'Obras: Todas as Obras / Geral';

  let periodScope = 'Período: Histórico Completo';
  if (startDate && endDate) {
    periodScope = `Período: ${new Date(`${startDate}T00:00:00`).toLocaleDateString('pt-BR')} a ${new Date(`${endDate}T00:00:00`).toLocaleDateString('pt-BR')}`;
  } else if (startDate) {
    periodScope = `Período: A partir de ${new Date(`${startDate}T00:00:00`).toLocaleDateString('pt-BR')}`;
  } else if (endDate) {
    periodScope = `Período: Até ${new Date(`${endDate}T00:00:00`).toLocaleDateString('pt-BR')}`;
  }

  const statusScope = statusFilter === 'completed' ? 'Status: Concluídas' : statusFilter === 'active' ? 'Status: Em Trânsito' : 'Status: Todas';

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `${vehicleScope}  •  ${workScope}  •  ${periodScope}  •  ${statusScope}  |  Emitido por: ${currentUser?.name || 'Administrador'}`,
    12,
    30
  );

  // Calculate Primary Metrics
  const completedTrips = filteredTrips.filter(t => t.status === 'completed');
  const activeTrips = filteredTrips.filter(t => t.status === 'active');
  const totalKmDriven = completedTrips.reduce((acc, t) => acc + (t.kmDriven || 0), 0);
  const avgKmPerTrip = completedTrips.length > 0 ? Math.round(totalKmDriven / completedTrips.length) : 0;
  
  const uniqueVehicles = new Set(filteredTrips.map(t => t.vehicleId)).size;
  const uniqueDrivers = new Set(filteredTrips.map(t => t.driverName)).size;
  const uniqueWorks = new Set(filteredTrips.map(t => t.workId || 'geral')).size;

  // KPI Summary Bento Cards (4 cards side-by-side)
  const cardWidth = 64;
  const cardHeight = 20;
  const cardY = 34;
  const cardSpacing = 6;

  // Card 1: Total de Viagens
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('TOTAL DE VIAGENS REGISTRADAS', 16, cardY + 4.5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(`${filteredTrips.length} viagens`, 16, cardY + 10.5);
  doc.setTextColor(16, 185, 129);
  doc.setFontSize(6.5);
  doc.text(`Finalizadas: ${completedTrips.length}`, 16, cardY + 15);
  doc.setTextColor(37, 99, 235);
  doc.text(`Em Trânsito: ${activeTrips.length}`, 16, cardY + 18.5);

  // Card 2: Quilometragem Total
  const c2X = 12 + cardWidth + cardSpacing;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(c2X, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.text('QUILOMETRAGEM TOTAL CONSOLIDADA', c2X + 4, cardY + 4.5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(`${totalKmDriven.toLocaleString('pt-BR')} km`, c2X + 4, cardY + 10.5);
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.text('Soma das rotas finalizadas', c2X + 4, cardY + 15);
  doc.setTextColor(16, 185, 129);
  doc.text('Odômetro auditado', c2X + 4, cardY + 18.5);

  // Card 3: Média por Viagem
  const c3X = c2X + cardWidth + cardSpacing;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(c3X, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.text('MÉDIA DE KM POR PERCURSO', c3X + 4, cardY + 4.5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(`${avgKmPerTrip.toLocaleString('pt-BR')} km / viagem`, c3X + 4, cardY + 10.5);
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.text(`Base de cálculo: ${completedTrips.length} rotas`, c3X + 4, cardY + 15);
  doc.setTextColor(37, 99, 235);
  doc.text('Eficiência e autonomia de frota', c3X + 4, cardY + 18.5);

  // Card 4: Cobertura Operacional
  const c4X = c3X + cardWidth + cardSpacing;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(c4X, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.text('COBERTURA E RECURSOS ENVOLVIDOS', c4X + 4, cardY + 4.5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(`${uniqueVehicles} Veículos • ${uniqueDrivers} Motoristas`, c4X + 4, cardY + 10.5);
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.text(`${uniqueWorks} Obras / Canteiros atendidos`, c4X + 4, cardY + 15);
  doc.setTextColor(100, 116, 139);
  doc.text('Gestão de rotas centralizada', c4X + 4, cardY + 18.5);

  // SECTION 1: Resumo Consolidado por Veículo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('1. Resumo Operacional por Veículo', 12, 59);

  // Group trips by vehicle
  const vehicleStatsMap = new Map<string, {
    plate: string;
    model: string;
    category?: string;
    tripCount: number;
    activeCount: number;
    completedCount: number;
    totalKm: number;
  }>();

  filteredTrips.forEach(t => {
    const existing = vehicleStatsMap.get(t.vehicleId) || {
      plate: t.vehicleModelPlate,
      model: t.vehicleModelPlate,
      category: 'Geral',
      tripCount: 0,
      activeCount: 0,
      completedCount: 0,
      totalKm: 0,
    };

    const matchedVeh = vehicles.find(v => v.id === t.vehicleId);
    if (matchedVeh) {
      existing.plate = matchedVeh.plate;
      existing.model = `${matchedVeh.brand} ${matchedVeh.model}`;
      existing.category = matchedVeh.category || 'Geral';
    }

    existing.tripCount += 1;
    if (t.status === 'active') existing.activeCount += 1;
    if (t.status === 'completed') {
      existing.completedCount += 1;
      existing.totalKm += (t.kmDriven || 0);
    }

    vehicleStatsMap.set(t.vehicleId, existing);
  });

  const vehicleRows = Array.from(vehicleStatsMap.values())
    .sort((a, b) => b.totalKm - a.totalKm)
    .map(v => {
      const avgKm = v.completedCount > 0 ? Math.round(v.totalKm / v.completedCount) : 0;
      const sharePct = totalKmDriven > 0 ? ((v.totalKm / totalKmDriven) * 100).toFixed(1) : '0.0';
      return [
        v.plate,
        v.model,
        v.category || 'Geral',
        v.tripCount.toString(),
        v.completedCount.toString(),
        v.activeCount.toString(),
        `${v.totalKm.toLocaleString('pt-BR')} km`,
        `${avgKm.toLocaleString('pt-BR')} km`,
        `${sharePct}%`
      ];
    });

  autoTable(doc, {
    startY: 63,
    head: [['PLACA', 'VEÍCULO (MARCA / MODELO)', 'CATEGORIA', 'TOTAL VIAGENS', 'CONCLUÍDAS', 'EM TRÂNSITO', 'TOTAL KM', 'MÉDIA KM', 'PARTICIPAÇÃO']],
    body: vehicleRows.length > 0 ? vehicleRows : [['Nenhum registro encontrado para os filtros selecionados', '', '', '', '', '', '', '', '']],
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 6.5,
      cellPadding: 2,
      font: 'helvetica'
    },
    columnStyles: {
      0: { cellWidth: 26, fontStyle: 'bold' },
      1: { cellWidth: 54 },
      2: { cellWidth: 30 },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 24, halign: 'center' },
      5: { cellWidth: 24, halign: 'center' },
      6: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 30, halign: 'right' },
      8: { cellWidth: 31, halign: 'right' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawDecorations(data.pageNumber);
      }
    },
    margin: { top: 22, left: 12, right: 12, bottom: 18 }
  });

  // SECTION 2: Resumo Consolidado por Canteiro de Obra
  const finalYSection1 = (doc as any).lastAutoTable.finalY + 8;
  const startYWorks = finalYSection1 < 170 ? finalYSection1 : (() => {
    doc.addPage();
    drawDecorations(doc.getNumberOfPages());
    return 24;
  })();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('2. Resumo Operacional por Canteiro de Obra', 12, startYWorks);

  // Group trips by work
  const workStatsMap = new Map<string, {
    name: string;
    location: string;
    tripCount: number;
    completedCount: number;
    activeCount: number;
    totalKm: number;
  }>();

  filteredTrips.forEach(t => {
    const key = t.workId || 'sem_obra';
    const existing = workStatsMap.get(key) || {
      name: t.workName || 'Geral / Não Vinculado',
      location: 'Sede Central',
      tripCount: 0,
      completedCount: 0,
      activeCount: 0,
      totalKm: 0,
    };

    if (t.workId) {
      const matchedWork = works.find(w => w.id === t.workId);
      if (matchedWork) {
        existing.name = matchedWork.name;
        existing.location = `${matchedWork.city}/${matchedWork.state}`;
      }
    }

    existing.tripCount += 1;
    if (t.status === 'completed') {
      existing.completedCount += 1;
      existing.totalKm += (t.kmDriven || 0);
    }
    if (t.status === 'active') {
      existing.activeCount += 1;
    }

    workStatsMap.set(key, existing);
  });

  const workRows = Array.from(workStatsMap.values())
    .sort((a, b) => b.totalKm - a.totalKm)
    .map(w => {
      const sharePct = totalKmDriven > 0 ? ((w.totalKm / totalKmDriven) * 100).toFixed(1) : '0.0';
      return [
        w.name,
        w.location,
        w.tripCount.toString(),
        w.completedCount.toString(),
        w.activeCount.toString(),
        `${w.totalKm.toLocaleString('pt-BR')} km`,
        `${sharePct}%`
      ];
    });

  autoTable(doc, {
    startY: startYWorks + 4,
    head: [['CANTEIRO / OBRA', 'CIDADE / UF', 'TOTAL VIAGENS', 'CONCLUÍDAS', 'EM TRÂNSITO', 'TOTAL KM RODADOS', 'PARTICIPAÇÃO']],
    body: workRows.length > 0 ? workRows : [['Nenhum registro para o período e filtros', '', '', '', '', '', '']],
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 6.5,
      cellPadding: 2,
      font: 'helvetica'
    },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: 'bold' },
      1: { cellWidth: 50 },
      2: { cellWidth: 35, halign: 'center' },
      3: { cellWidth: 35, halign: 'center' },
      4: { cellWidth: 35, halign: 'center' },
      5: { cellWidth: 48, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 0, halign: 'right' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawDecorations(data.pageNumber);
      }
    },
    margin: { top: 22, left: 12, right: 12, bottom: 18 }
  });

  // SECTION 3: Registro Detalhado de Viagens e Itinerários
  const finalYSection2 = (doc as any).lastAutoTable.finalY + 8;
  const startYDetail = finalYSection2 < 170 ? finalYSection2 : (() => {
    doc.addPage();
    drawDecorations(doc.getNumberOfPages());
    return 24;
  })();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('3. Relação Detalhada de Viagens e Deslocamentos Individuais', 12, startYDetail);

  const detailRows = filteredTrips.map(trip => {
    const isCompleted = trip.status === 'completed';
    const dtInicio = new Date(trip.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const dtFim = trip.checkOut?.time 
      ? new Date(trip.checkOut.time).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) 
      : 'Em trânsito';

    const origin = trip.checkIn.origin || 'Base / Sede Central (Palmas/TO)';
    const destination = trip.checkIn.destination || 'Não especificado';
    const route = `${origin} -> ${destination}`;

    const kmInitial = trip.checkIn.km.toLocaleString('pt-BR');
    const kmFinal = trip.checkOut?.km ? trip.checkOut.km.toLocaleString('pt-BR') : '-';
    const kmDrivenStr = isCompleted && trip.kmDriven !== undefined ? `${trip.kmDriven.toLocaleString('pt-BR')} km` : 'Em curso';
    const statusText = isCompleted ? 'Finalizada' : 'Em Rota';

    return [
      trip.id.replace('trip-', '').substring(0, 8).toUpperCase(),
      dtInicio,
      trip.driverName,
      trip.vehicleModelPlate,
      trip.workName || 'Geral',
      route,
      `${kmInitial} / ${kmFinal}`,
      kmDrivenStr,
      statusText,
      trip.checkIn.reason || '-'
    ];
  });

  autoTable(doc, {
    startY: startYDetail + 4,
    head: [['ID / TICKET', 'DATA / HORA', 'CONDUTOR', 'VEÍCULO / PLACA', 'OBRA', 'ROTA (ORIGEM -> DESTINO)', 'KM INÍCIO/FIM', 'DISTÂNCIA', 'STATUS', 'MOTIVO / FINALIDADE']],
    body: detailRows.length > 0 ? detailRows : [['Nenhuma viagem encontrada para os filtros aplicados', '', '', '', '', '', '', '', '', '']],
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 6.8,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 6.2,
      cellPadding: 2,
      font: 'helvetica'
    },
    columnStyles: {
      0: { cellWidth: 20, fontStyle: 'bold' },
      1: { cellWidth: 24 },
      2: { cellWidth: 32 },
      3: { cellWidth: 34 },
      4: { cellWidth: 28 },
      5: { cellWidth: 50 },
      6: { cellWidth: 24, halign: 'center' },
      7: { cellWidth: 18, halign: 'right', fontStyle: 'bold' },
      8: { cellWidth: 18, halign: 'center' },
      9: { cellWidth: 25 }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawDecorations(data.pageNumber);
      }
    },
    margin: { top: 22, left: 12, right: 12, bottom: 18 }
  });

  // Filename generation
  const fileDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const vehicleTag = selectedVehicleObj ? `_veiculo_${selectedVehicleObj.plate.replace(/[^a-zA-Z0-9]/g, '')}` : '';
  const workTag = selectedWorkObj ? `_obra_${selectedWorkObj.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : '';
  
  doc.save(`relatorio_viagens${vehicleTag}${workTag}_${fileDate}.pdf`);
}

/**
 * Escapes CSV values with quotes and sanitizes semicolons
 */
function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Downloads a CSV string as a downloadable file with UTF-8 BOM
 */
function downloadCSVFile(csvContent: string, filename: string) {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports a comprehensive CSV spreadsheet containing Trips
 */
export function exportTripsConsolidatedCSV(options: TripReportOptions) {
  const { works, vehicles } = options;
  const filteredTrips = getFilteredTripData(options);

  const lines: string[] = [];

  // Metadata Header
  lines.push('RELATORIO CONSOLIDADO DE VIAGENS E DESLOCAMENTOS - ADM FROTA');
  lines.push(`Gerado em:;${new Date().toLocaleString('pt-BR')}`);
  lines.push(`Total de Viagens Filtradas:;${filteredTrips.length}`);
  lines.push('');

  // Column Headers
  lines.push([
    'ID Viagem',
    'Data Criacao',
    'Horario CheckIn',
    'Horario CheckOut',
    'Condutor / Motorista',
    'Email Condutor',
    'Veiculo Modelo',
    'Placa',
    'Canteiro Obra',
    'Origem',
    'Destino',
    'KM Inicial',
    'KM Final',
    'Distancia Percorrida (KM)',
    'Status',
    'Nivel Combustivel Partida',
    'Nivel Combustivel Chegada',
    'Finalidade / Motivo',
    'Observacoes'
  ].map(escapeCSV).join(';'));

  filteredTrips.forEach(t => {
    const veh = vehicles.find(v => v.id === t.vehicleId);
    lines.push([
      t.id,
      t.createdAt,
      t.checkIn.time,
      t.checkOut?.time || 'Em trânsito',
      t.driverName,
      t.driverEmail || '',
      veh?.model || t.vehicleModelPlate,
      veh?.plate || '',
      t.workName || 'Geral',
      t.checkIn.origin || 'Base / Sede Central',
      t.checkIn.destination,
      t.checkIn.km,
      t.checkOut?.km || '',
      t.kmDriven !== undefined ? t.kmDriven : '',
      t.status === 'completed' ? 'Finalizada' : 'Em Trânsito',
      t.checkIn.fuel,
      t.checkOut?.fuel || '',
      t.checkIn.reason,
      t.checkIn.observations || ''
    ].map(escapeCSV).join(';'));
  });

  const fileDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  downloadCSVFile(lines.join('\r\n'), `relatorio_viagens_${fileDate}.csv`);
}
