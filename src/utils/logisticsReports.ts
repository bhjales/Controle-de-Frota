import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  LogisticsSchedule,
  LogisticsScheduleStatus,
  ConstructionWork,
  Vehicle,
  User
} from '../types';

export interface LogisticsReportOptions {
  schedules: LogisticsSchedule[];
  works: ConstructionWork[];
  vehicles: Vehicle[];
  currentUser?: User | null;
  monthYearLabel?: string;
  monthStartStr?: string;
  monthEndStr?: string;
  scopeDescription?: string;
}

const STATUS_LABELS: Record<LogisticsScheduleStatus, string> = {
  programado: 'Programado',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

function formatDateBR(isoDate?: string): string {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getDaysDiff(start: string, end: string): number {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 1;
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diff);
}

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

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

function formatOriginText(s: LogisticsSchedule): string {
  const label = s.originWorkName || s.originLabel || 'Matriz / Base';
  if (s.originCity) {
    return `${label} (${s.originCity}${s.originState ? `/${s.originState}` : ''})`;
  }
  return label;
}

function formatDestText(s: LogisticsSchedule): string {
  const label = s.workName || s.destinationLabel || s.programDescription || 'Destino';
  if (s.destinationCity) {
    return `${label} (${s.destinationCity}${s.destinationState ? `/${s.destinationState}` : ''})`;
  }
  return label;
}

/**
 * Generates an executive offline PDF report of the Logistics Calendar
 */
export function exportLogisticsPDF(options: LogisticsReportOptions) {
  const {
    schedules,
    works,
    currentUser,
    monthYearLabel,
    monthStartStr,
    monthEndStr,
    scopeDescription,
  } = options;

  const sortedSchedules = [...schedules].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const activeSchedules = sortedSchedules.filter(s => s.scheduleStatus !== 'cancelado');

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;

  const drawDecorations = (pageNum: number) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 15, 'F');
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 15, pageWidth, 2.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('FROTACONTROL • CALENDÁRIO DE LOGÍSTICA — PROGRAMAÇÃO DE VIAGENS E OBRAS (OFFLINE)', 12, 10);

    doc.setTextColor(203, 213, 225);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const dateFormatted = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    doc.text(`Emissão: ${dateFormatted}`, pageWidth - 12, 10, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.line(12, pageHeight - 12, pageWidth - 12, pageHeight - 12);

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(
      'Relatório Gerencial Offline de Logística, Alocação de Veículos, Obras Programadas e Cargas',
      12,
      pageHeight - 7
    );
    doc.text(`Página ${pageNum}`, pageWidth - 12, pageHeight - 7, { align: 'right' });
  };

  drawDecorations(1);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(
    monthYearLabel
      ? `Calendário de Logística — ${monthYearLabel}`
      : 'Calendário de Logística — Programação Geral',
    12,
    25
  );

  const periodScope = scopeDescription || (monthYearLabel ? `Mês de Referência: ${monthYearLabel}` : 'Escopo: Todas as Programações Filtradas');
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `${periodScope}  |  Emitido por: ${currentUser?.name || 'Gerência / Administração'}`,
    12,
    30
  );

  // KPIs
  const plannedCount = sortedSchedules.filter(s => s.scheduleStatus === 'programado').length;
  const ongoingCount = sortedSchedules.filter(s => s.scheduleStatus === 'em_andamento').length;
  const completedCount = sortedSchedules.filter(s => s.scheduleStatus === 'concluido').length;
  const thirdPartyCount = activeSchedules.filter(
    s => s.isThirdPartyRental || s.allocationType === 'terceiros'
  ).length;
  const uniqueVehicles = new Set(activeSchedules.map(s => s.vehicleId)).size;
  const uniqueWorks = new Set(activeSchedules.filter(s => Boolean(s.workId)).map(s => s.workId)).size;
  const totalDays = activeSchedules.reduce((acc, s) => acc + getDaysDiff(s.startDate, s.endDate), 0);

  const cardWidth = 64;
  const cardHeight = 20;
  const cardY = 34;
  const cardSpacing = 6;

  // Card 1
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('PROGRAMAÇÕES LISTADAS', 16, cardY + 4.5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(`${sortedSchedules.length} agendamentos`, 16, cardY + 10.5);
  doc.setTextColor(16, 185, 129);
  doc.setFontSize(6.5);
  doc.text(`Em Andamento: ${ongoingCount}  •  Programados: ${plannedCount}`, 16, cardY + 15);
  doc.setTextColor(100, 116, 139);
  doc.text(`Concluídos: ${completedCount}`, 16, cardY + 18.5);

  // Card 2
  const c2X = 12 + cardWidth + cardSpacing;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(c2X, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.text('VEÍCULOS & LOCAÇÕES', c2X + 4, cardY + 4.5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(`${uniqueVehicles} veículos mobilizados`, c2X + 4, cardY + 10.5);
  doc.setTextColor(124, 58, 237);
  doc.setFontSize(6.5);
  doc.text(`Locados p/ Terceiros: ${thirdPartyCount}`, c2X + 4, cardY + 15);
  doc.setTextColor(100, 116, 139);
  doc.text('Uso próprio e externo', c2X + 4, cardY + 18.5);

  // Card 3
  const c3X = c2X + cardWidth + cardSpacing;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(c3X, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.text('OBRAS & CANTEIROS ATENDIDOS', c3X + 4, cardY + 4.5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(`${uniqueWorks} obras vinculadas`, c3X + 4, cardY + 10.5);
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(6.5);
  doc.text(`Base ativa: ${works.filter(w => w.status === 'active').length} obras`, c3X + 4, cardY + 15);
  doc.setTextColor(100, 116, 139);
  doc.text('Inclui destinos livres e cidades', c3X + 4, cardY + 18.5);

  // Card 4
  const c4X = c3X + cardWidth + cardSpacing;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(c4X, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.text('DIÁRIAS PROGRAMADAS', c4X + 4, cardY + 4.5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(`${totalDays} dias alocados`, c4X + 4, cardY + 10.5);
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.text('Somatório de permanência em rota', c4X + 4, cardY + 15);
  doc.text('Consulta offline pronta p/ impressão', c4X + 4, cardY + 18.5);

  // SECTION 1: Programações Detalhadas (Cronograma Completo)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('1. Cronograma Detalhado de Viagens, Obras e Cargas', 12, 60);

  const scheduleRows = sortedSchedules.map(s => {
    const days = getDaysDiff(s.startDate, s.endDate);
    const tipoStr = s.isThirdPartyRental
      ? `Terceiros: ${s.thirdPartyName || '-'}`
      : s.workId
      ? 'Obra Vinculada'
      : 'Destino Livre';
    const vehicleFullStr = s.complementVehicleModelPlate
      ? `${s.vehicleModelPlate}\n+ Comp.: ${s.complementVehicleModelPlate}`
      : s.vehicleModelPlate;
    return [
      `${formatDateBR(s.startDate)} a\n${formatDateBR(s.endDate)}`,
      `${days}d`,
      vehicleFullStr,
      formatOriginText(s),
      formatDestText(s),
      tipoStr,
      s.cargoDescription || '-',
      s.driverName || 'Sem motorista',
      STATUS_LABELS[s.scheduleStatus] || s.scheduleStatus,
      s.notes || '-',
    ];
  });

  autoTable(doc, {
    startY: 63,
    head: [[
      'PERÍODO',
      'DIAS',
      'VEÍCULO / PLACA',
      'ORIGEM',
      'DESTINO / OBRA',
      'VÍNCULO / TERCEIRO',
      'CARGA',
      'MOTORISTA',
      'STATUS',
      'OBS.',
    ]],
    body:
      scheduleRows.length > 0
        ? scheduleRows
        : [['Nenhuma programação encontrada para os filtros selecionados', '', '', '', '', '', '', '', '', '']],
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 6.8,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 6.2,
      cellPadding: 1.8,
      font: 'helvetica',
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 23, fontStyle: 'bold' },
      1: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 32, fontStyle: 'bold' },
      3: { cellWidth: 36 },
      4: { cellWidth: 42 },
      5: { cellWidth: 28 },
      6: { cellWidth: 32 },
      7: { cellWidth: 25 },
      8: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      9: { cellWidth: 25 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: data => {
      if (data.pageNumber > 1) {
        drawDecorations(data.pageNumber);
      }
    },
    margin: { top: 22, left: 12, right: 12, bottom: 18 },
  });

  // SECTION 2: Resumo por Obra / Destino
  const afterSec1 = (doc as any).lastAutoTable.finalY + 8;
  const startYSec2 =
    afterSec1 < 168
      ? afterSec1
      : (() => {
          doc.addPage();
          drawDecorations(doc.getNumberOfPages());
          return 24;
        })();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('2. Consolidação por Obra / Destino Programado', 12, startYSec2);

  const destSummaryMap = new Map<
    string,
    {
      label: string;
      cityUf: string;
      count: number;
      vehicles: Set<string>;
      days: number;
    }
  >();

  activeSchedules.forEach(s => {
    const label = s.workName || s.destinationLabel || 'Sem Destino';
    const cityUf = `${s.destinationCity || '-'}${s.destinationState ? `/${s.destinationState}` : ''}`;
    const key = `${label}__${cityUf}`;
    const entry = destSummaryMap.get(key) || {
      label,
      cityUf,
      count: 0,
      vehicles: new Set<string>(),
      days: 0,
    };
    entry.count += 1;
    entry.vehicles.add(
      s.complementVehicleModelPlate
        ? `${s.vehicleModelPlate} + ${s.complementVehicleModelPlate}`
        : s.vehicleModelPlate
    );
    entry.days += getDaysDiff(s.startDate, s.endDate);
    destSummaryMap.set(key, entry);
  });

  const destRows = Array.from(destSummaryMap.values())
    .sort((a, b) => b.days - a.days)
    .map(d => [
      d.label,
      d.cityUf,
      d.count.toString(),
      d.vehicles.size.toString(),
      `${d.days} dias`,
      Array.from(d.vehicles).join(', '),
    ]);

  autoTable(doc, {
    startY: startYSec2 + 4,
    head: [['OBRA / DESTINO', 'CIDADE / UF', 'PROGRAMAÇÕES', 'QTD VEÍCULOS', 'DIAS ALOCADOS', 'VEÍCULOS DESIGNADOS']],
    body: destRows.length > 0 ? destRows : [['Sem alocações ativas no recorte selecionado', '', '', '', '', '']],
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 6.5,
      cellPadding: 2,
      font: 'helvetica',
    },
    columnStyles: {
      0: { cellWidth: 62, fontStyle: 'bold' },
      1: { cellWidth: 38 },
      2: { cellWidth: 26, halign: 'center' },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 97 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: data => {
      if (data.pageNumber > 1) {
        drawDecorations(data.pageNumber);
      }
    },
    margin: { top: 22, left: 12, right: 12, bottom: 18 },
  });

  // SECTION 3: Visão Diária do Calendário (quando há intervalo mensal definido)
  if (monthStartStr && monthEndStr) {
    const startParts = monthStartStr.split('-').map(Number);
    const endParts = monthEndStr.split('-').map(Number);
    if (startParts.length === 3 && endParts.length === 3) {
      const monthSchedules = activeSchedules.filter(
        s => s.startDate <= monthEndStr && s.endDate >= monthStartStr
      );

      const dailyRows: string[][] = [];
      const cur = new Date(startParts[0], startParts[1] - 1, startParts[2]);
      const last = new Date(endParts[0], endParts[1] - 1, endParts[2]);
      const wdShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

      while (cur <= last) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const iso = `${y}-${m}-${d}`;
        const dayMatches = monthSchedules.filter(s => s.startDate <= iso && s.endDate >= iso);
        if (dayMatches.length > 0) {
          const summary = dayMatches
            .map(item => {
              const plate = item.vehicleModelPlate.match(/\(([^)]+)\)/)?.[1] || item.vehicleModelPlate;
              const compPlate = item.complementVehicleModelPlate?.match(/\(([^)]+)\)/)?.[1] || item.complementVehicleModelPlate;
              const fullPlate = compPlate ? `${plate}+${compPlate}` : plate;
              const dest = item.isThirdPartyRental
                ? `Locado: ${item.thirdPartyName || item.destinationLabel}`
                : item.workName || item.destinationLabel;
              const cargo = item.cargoDescription ? ` [Carga: ${item.cargoDescription}]` : '';
              return `${fullPlate} -> ${dest} (${item.destinationCity}/${item.destinationState})${cargo}`;
            })
            .join(' | ');
          dailyRows.push([
            `${d}/${m}/${y} (${wdShort[cur.getDay()]})`,
            dayMatches.length.toString(),
            summary,
          ]);
        }
        cur.setDate(cur.getDate() + 1);
      }

      const afterSec2 = (doc as any).lastAutoTable.finalY + 8;
      const startYSec3 =
        afterSec2 < 168
          ? afterSec2
          : (() => {
              doc.addPage();
              drawDecorations(doc.getNumberOfPages());
              return 24;
            })();

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(`3. Agenda Dia a Dia — ${monthYearLabel || 'Mês Selecionado'}`, 12, startYSec3);

      autoTable(doc, {
        startY: startYSec3 + 4,
        head: [['DATA', 'QTD VEÍCULOS', 'MOVIMENTAÇÃO E OBRAS PROGRAMADAS NO DIA']],
        body:
          dailyRows.length > 0
            ? dailyRows
            : [['Nenhuma movimentação programada para os dias deste mês', '', '']],
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontSize: 7,
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 6.4,
          cellPadding: 2,
          font: 'helvetica',
        },
        columnStyles: {
          0: { cellWidth: 38, fontStyle: 'bold' },
          1: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 210 },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        didDrawPage: data => {
          if (data.pageNumber > 1) {
            drawDecorations(data.pageNumber);
          }
        },
        margin: { top: 22, left: 12, right: 12, bottom: 18 },
      });
    }
  }

  const fileDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const monthTag = monthStartStr ? `_${monthStartStr.slice(0, 7).replace('-', '')}` : '';
  doc.save(`calendario_logistica${monthTag}_${fileDate}.pdf`);
}

/**
 * Exports a readable UTF-8 BOM CSV spreadsheet of the Logistics Calendar
 */
export function exportLogisticsCSV(options: LogisticsReportOptions) {
  const { schedules, monthYearLabel, monthStartStr, scopeDescription } = options;
  const sortedSchedules = [...schedules].sort((a, b) => a.startDate.localeCompare(b.startDate));

  const lines: string[] = [];
  lines.push('CALENDARIO DE LOGISTICA - PROGRAMACAO DE VIAGENS E OBRAS - FROTACONTROL');
  lines.push(`Gerado em:;${new Date().toLocaleString('pt-BR')}`);
  if (monthYearLabel) {
    lines.push(`Mes de Referencia:;${monthYearLabel}`);
  }
  if (scopeDescription) {
    lines.push(`Filtro / Escopo:;${scopeDescription}`);
  }
  lines.push(`Total de Programacoes:;${sortedSchedules.length}`);
  lines.push('');

  lines.push(
    [
      'ID Programacao',
      'Data Inicio',
      'Data Fim',
      'Duracao (Dias)',
      'Status',
      'Veiculo / Placa',
      'Complemento / Carroceria',
      'Origem (Obra / Local)',
      'Municipio Origem',
      'UF Origem',
      'Destino / Obra',
      'Municipio Destino',
      'UF Destino',
      'Tipo Vinculo',
      'Locado para Terceiros',
      'Empresa / Terceiro',
      'Descricao da Carga',
      'Motorista Designado',
      'Observacoes',
      'Criado Por',
      'Data Cadastro',
    ]
      .map(escapeCSV)
      .join(';')
  );

  sortedSchedules.forEach(s => {
    const days = getDaysDiff(s.startDate, s.endDate);
    const linkType = s.isThirdPartyRental
      ? 'Locação Terceiros'
      : s.workId
      ? 'Obra Vinculada'
      : 'Destino Livre';
    lines.push(
      [
        s.id,
        formatDateBR(s.startDate),
        formatDateBR(s.endDate),
        days,
        STATUS_LABELS[s.scheduleStatus] || s.scheduleStatus,
        s.vehicleModelPlate,
        s.complementVehicleModelPlate || '',
        s.originWorkName || s.originLabel || 'Matriz / Base',
        s.originCity || '',
        s.originState || '',
        s.workName || s.destinationLabel || s.programDescription || '',
        s.destinationCity || '',
        s.destinationState || '',
        linkType,
        s.isThirdPartyRental ? 'Sim' : 'Não',
        s.thirdPartyName || '',
        s.cargoDescription || '',
        s.driverName || '',
        s.notes || '',
        s.createdBy || '',
        s.createdAt ? new Date(s.createdAt).toLocaleString('pt-BR') : '',
      ]
        .map(escapeCSV)
        .join(';')
    );
  });

  const fileDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const monthTag = monthStartStr ? `_${monthStartStr.slice(0, 7).replace('-', '')}` : '';
  downloadCSVFile(lines.join('\r\n'), `calendario_logistica${monthTag}_${fileDate}.csv`);
}
