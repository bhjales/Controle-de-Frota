import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  FuelInflow, 
  FuelDispense, 
  ConstructionWork, 
  Vehicle, 
  Supplier, 
  User, 
  WorkFuelBalance 
} from '../types';

export interface FuelReportOptions {
  fuelInflows: FuelInflow[];
  fuelDispenses: FuelDispense[];
  works: ConstructionWork[];
  vehicles: Vehicle[];
  suppliers: Supplier[];
  currentUser?: User | null;
  selectedWorkId?: string; // Optional filter
  startDate?: string;
  endDate?: string;
}

/**
 * Filter fuel data based on user criteria
 */
export function getFilteredFuelData(options: FuelReportOptions) {
  const { fuelInflows, fuelDispenses, selectedWorkId, startDate, endDate } = options;

  let filteredInflows = [...fuelInflows];
  let filteredDispenses = [...fuelDispenses];

  if (selectedWorkId && selectedWorkId !== 'all') {
    filteredInflows = filteredInflows.filter(i => i.workId === selectedWorkId);
    filteredDispenses = filteredDispenses.filter(d => d.workId === selectedWorkId);
  }

  if (startDate) {
    const start = new Date(startDate).getTime();
    filteredInflows = filteredInflows.filter(i => new Date(i.date).getTime() >= start);
    filteredDispenses = filteredDispenses.filter(d => new Date(d.date).getTime() >= start);
  }

  if (endDate) {
    const end = new Date(`${endDate}T23:59:59`).getTime();
    filteredInflows = filteredInflows.filter(i => new Date(i.date).getTime() <= end);
    filteredDispenses = filteredDispenses.filter(d => new Date(d.date).getTime() <= end);
  }

  return { filteredInflows, filteredDispenses };
}

/**
 * Generates an executive, publication-grade Fuel Report in PDF format
 */
export function exportFuelReportPDF(options: FuelReportOptions) {
  const { works, vehicles, suppliers, currentUser, selectedWorkId } = options;
  const { filteredInflows, filteredDispenses } = getFilteredFuelData(options);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;

  // Header & Footer decorator function
  const drawDecorations = (pageNum: number) => {
    // Header Bar
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 15, 'F');
    doc.setFillColor(16, 185, 129); // emerald-500 accent line
    doc.rect(0, 15, pageWidth, 2.5, 'F');

    // Brand and Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('ADM-FROTA • RELATÓRIO AUDITADO DE COMBUSTÍVEIS E ABASTECIMENTOS', 12, 10);

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
    doc.text('Documento Corporativo Oficial de Gestão de Frotas e Canteiros de Obras • Dados Auditáveis', 12, pageHeight - 7);
    doc.text(`Página ${pageNum}`, pageWidth - 12, pageHeight - 7, { align: 'right' });
  };

  // Draw Page 1 Decorator
  drawDecorations(1);

  // Main Report Title
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Relatório Consolidado de Combustíveis e Abastecimento', 12, 25);

  const selectedWorkObj = selectedWorkId && selectedWorkId !== 'all' ? works.find(w => w.id === selectedWorkId) : null;
  const workScopeLabel = selectedWorkObj ? `Obra: ${selectedWorkObj.name} (${selectedWorkObj.city}/${selectedWorkObj.state})` : 'Escopo: Todas as Obras e Canteiros Cadastrados';

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `${workScopeLabel} | Gerado por: ${currentUser?.name || 'Gestor do Sistema'} (${currentUser?.role || 'Diretoria'}) | ${filteredInflows.length} Entradas fiscais | ${filteredDispenses.length} Abastecimentos`,
    12,
    30
  );

  // Calculate Primary Metrics
  const totalInflowLiters = filteredInflows.reduce((s, i) => s + (Number(i.liters) || 0), 0);
  const totalInflowCost = filteredInflows.reduce((s, i) => s + (Number(i.totalCost) || 0), 0);
  const totalDispenseLiters = filteredDispenses.reduce((s, d) => s + (Number(d.liters) || 0), 0);
  const totalDispenseCost = filteredDispenses.reduce((s, d) => s + (Number(d.totalCost || d.calculatedCost) || 0), 0);
  const balanceLiters = Math.max(0, totalInflowLiters - totalDispenseLiters);
  const avgCostPerLiter = totalInflowLiters > 0 ? (totalInflowCost / totalInflowLiters) : 0;
  const estimatedStockValue = balanceLiters * avgCostPerLiter;

  // KPI Summary Boxes (4 cards side-by-side)
  const cardWidth = 64;
  const cardHeight = 18;
  const cardY = 34;
  const cardSpacing = 6;

  // Card 1: Total Adquirido (Entradas)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('TOTAL ADQUIRIDO (ENTRADAS FISCAIS)', 16, cardY + 5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10.5);
  doc.text(`${totalInflowLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L`, 16, cardY + 11);
  doc.setTextColor(16, 185, 129);
  doc.setFontSize(7.5);
  doc.text(`R$ ${totalInflowCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 16, cardY + 15.5);

  // Card 2: Total Abastecido (Saídas)
  const c2X = 12 + cardWidth + cardSpacing;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(c2X, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7);
  doc.text('TOTAL CONSUMIDO NA FROTA', c2X + 4, cardY + 5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10.5);
  doc.text(`${totalDispenseLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L`, c2X + 4, cardY + 11);
  doc.setTextColor(239, 68, 68);
  doc.setFontSize(7.5);
  doc.text(`R$ ${totalDispenseCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} gasto`, c2X + 4, cardY + 15.5);

  // Card 3: Saldo em Tanques
  const c3X = c2X + cardWidth + cardSpacing;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(c3X, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7);
  doc.text('SALDO DISPONÍVEL EM TANQUE', c3X + 4, cardY + 5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10.5);
  doc.text(`${balanceLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L`, c3X + 4, cardY + 11);
  doc.setTextColor(14, 165, 233);
  doc.setFontSize(7.5);
  doc.text(`Valor Est.: R$ ${estimatedStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, c3X + 4, cardY + 15.5);

  // Card 4: Custo Médio por Litro
  const c4X = c3X + cardWidth + cardSpacing;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(c4X, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7);
  doc.text('PREÇO MÉDIO / LITRO', c4X + 4, cardY + 5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10.5);
  doc.text(`R$ ${avgCostPerLiter.toFixed(3)}`, c4X + 4, cardY + 11);
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.text(`${works.length} obras cadastradas`, c4X + 4, cardY + 15.5);

  // SECTION 1: Balanço de Combustível por Obra
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('1. Balanço de Estoque e Consumo Consolidado por Canteiro de Obra', 12, 57);

  const worksToInclude = selectedWorkObj ? [selectedWorkObj] : works;
  const workRows = worksToInclude.map(w => {
    const inflowsForWork = filteredInflows.filter(i => i.workId === w.id);
    const dispensesForWork = filteredDispenses.filter(d => d.workId === w.id);

    const inLiters = inflowsForWork.reduce((s, i) => s + (Number(i.liters) || 0), 0);
    const inCost = inflowsForWork.reduce((s, i) => s + (Number(i.totalCost) || 0), 0);
    const outLiters = dispensesForWork.reduce((s, d) => s + (Number(d.liters) || 0), 0);
    const balLiters = Math.max(0, inLiters - outLiters);
    const unitPrice = inLiters > 0 ? (inCost / inLiters) : 0;
    const workVehCount = vehicles.filter(v => v.workId === w.id).length;
    const statusText = balLiters <= 0 && inLiters > 0 ? 'Crítico (Zerado)' : balLiters < 200 && inLiters > 0 ? 'Atenção (Baixo)' : 'Normal';

    return [
      w.name,
      `${w.city} - ${w.state}`,
      `${workVehCount} ativos`,
      `${inLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L`,
      `R$ ${inCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `${outLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L`,
      `${balLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L`,
      unitPrice > 0 ? `R$ ${unitPrice.toFixed(3)}` : 'R$ 0,000',
      statusText
    ];
  });

  autoTable(doc, {
    startY: 61,
    head: [['CANTEIRO / OBRA', 'CIDADE/UF', 'FROTA VINC.', 'ENTRADAS (L)', 'TOTAL COMPRAS (R$)', 'CONSUMO (L)', 'SALDO DISP. (L)', 'MÉDIA R$/L', 'STATUS ESTOQUE']],
    body: workRows,
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      font: 'helvetica'
    },
    columnStyles: {
      0: { cellWidth: 44 },
      1: { cellWidth: 26 },
      2: { cellWidth: 20 },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 32, halign: 'right' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 26, halign: 'right' },
      7: { cellWidth: 24, halign: 'right' },
      8: { cellWidth: 28, halign: 'center' }
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

  // SECTION 2: Entradas Fiscais (NFs / Fornecedores)
  const finalYSection1 = (doc as any).lastAutoTable.finalY + 8;
  const startYInflows = finalYSection1 < 170 ? finalYSection1 : (() => {
    doc.addPage();
    drawDecorations(doc.getNumberOfPages());
    return 24;
  })();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('2. Registro Fiscal de Entradas e Recebimentos (NFs e Pedidos de Compra)', 12, startYInflows);

  const sortedInflows = [...filteredInflows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const inflowRows = sortedInflows.map(i => {
    const dateFormatted = new Date(i.date).toLocaleDateString('pt-BR');
    const docLabel = `${i.fiscalDocType === 'nf' ? 'NF' : i.fiscalDocType === 'pedido_compra' ? 'PC' : 'Doc'}: ${i.fiscalDocNumber || 'S/N'}`;
    const supplier = suppliers.find(s => s.id === i.supplierId);
    const suppLabel = i.supplierName || supplier?.tradeName || supplier?.corporateName || 'Fornecedor';

    return [
      dateFormatted,
      docLabel,
      i.workName || 'Canteiro',
      suppLabel,
      i.fuelType || 'Diesel',
      `${(Number(i.liters) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L`,
      `R$ ${(Number(i.unitCost) || 0).toFixed(3)}`,
      `R$ ${(Number(i.totalCost) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      i.receivedBy || 'Almoxarifado'
    ];
  });

  autoTable(doc, {
    startY: startYInflows + 4,
    head: [['DATA ENTRADA', 'DOC. FISCAL', 'CANTEIRO DESTINO', 'FORNECEDOR', 'COMBUSTÍVEL', 'VOLUME (L)', 'PREÇO UNIT. (R$/L)', 'VALOR TOTAL (R$)', 'RECEBIDO POR']],
    body: inflowRows.length > 0 ? inflowRows : [['Nenhum registro de entrada cadastrado para os filtros selecionados.', '', '', '', '', '', '', '', '']],
    headStyles: {
      fillColor: [5, 150, 105], // emerald-600
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      font: 'helvetica'
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 28 },
      2: { cellWidth: 36 },
      3: { cellWidth: 46 },
      4: { cellWidth: 24 },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 26, halign: 'right' },
      7: { cellWidth: 32, halign: 'right' },
      8: { cellWidth: 34 }
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

  // SECTION 3: Histórico de Abastecimentos da Frota
  const finalYSection2 = (doc as any).lastAutoTable.finalY + 8;
  const startYDispenses = finalYSection2 < 170 ? finalYSection2 : (() => {
    doc.addPage();
    drawDecorations(doc.getNumberOfPages());
    return 24;
  })();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('3. Diário de Abastecimentos da Frota e Maquinários em Campo', 12, startYDispenses);

  const sortedDispenses = [...filteredDispenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const dispenseRows = sortedDispenses.map(d => {
    const dDate = new Date(d.date);
    const dateFormatted = !isNaN(dDate.getTime()) ? dDate.toLocaleDateString('pt-BR') : d.date;
    const veh = vehicles.find(v => v.id === d.vehicleId);
    const vehLabel = d.vehiclePlate ? `${d.vehiclePlate} (${d.vehicleModel || veh?.model || ''})` : (veh ? `${veh.plate} (${veh.model})` : 'Veículo');
    const typeLabel = d.dispenseType === 'fornecedor_direto' ? 'Posto Direto' : 'Tanque Obra';
    const kmHours = d.currentKmOrHours ? `${d.currentKmOrHours} km/h` : 'N/I';
    const totalCostVal = d.totalCost || d.calculatedCost || ((d.liters || 0) * (d.unitCost || avgCostPerLiter));
    const fiscal = d.fiscalDocNumber ? `${d.fiscalDocType === 'nf' ? 'NF' : 'PC'}: ${d.fiscalDocNumber}` : '-';

    return [
      dateFormatted,
      vehLabel,
      d.workName || 'Geral/Obra',
      typeLabel,
      d.fuelType || 'Diesel',
      `${(Number(d.liters) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L`,
      kmHours,
      `R$ ${(Number(totalCostVal) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      d.driverName || 'Motorista',
      fiscal
    ];
  });

  autoTable(doc, {
    startY: startYDispenses + 4,
    head: [['DATA', 'VEÍCULO / ATIVO', 'CANTEIRO / ORIGEM', 'MODALIDADE', 'TIPO', 'VOLUME (L)', 'KM/HORAS', 'CUSTO (R$)', 'CONDUTOR/OPERADOR', 'DOC. FISCAL']],
    body: dispenseRows.length > 0 ? dispenseRows : [['Nenhum abastecimento registrado para os filtros selecionados.', '', '', '', '', '', '', '', '', '']],
    headStyles: {
      fillColor: [217, 119, 6], // amber-600
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      font: 'helvetica'
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 42 },
      2: { cellWidth: 32 },
      3: { cellWidth: 22 },
      4: { cellWidth: 20 },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 22, halign: 'center' },
      7: { cellWidth: 26, halign: 'right' },
      8: { cellWidth: 36 },
      9: { cellWidth: 24 }
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

  const fileDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  doc.save(`relatorio_combustiveis_consolidado_${fileDate}.pdf`);
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
 * Exports a comprehensive CSV spreadsheet containing Fuel Inflows and Dispenses
 */
export function exportFuelConsolidatedCSV(options: FuelReportOptions) {
  const { works, vehicles, suppliers } = options;
  const { filteredInflows, filteredDispenses } = getFilteredFuelData(options);

  const lines: string[] = [];

  // Metadata Header
  lines.push('RELATORIO CONSOLIDADO DE COMBUSTIVEIS E ABASTECIMENTO - ADM FROTA');
  lines.push(`Gerado em:;${new Date().toLocaleString('pt-BR')}`);
  lines.push(`Total de Entradas Fiscais:;${filteredInflows.length}`);
  lines.push(`Total de Abastecimentos:;${filteredDispenses.length}`);
  lines.push('');

  // 1. BALANÇO POR OBRA
  lines.push('--- 1. BALANCO POR CANTEIRO DE OBRA ---');
  lines.push([
    'Obra/Canteiro',
    'Cidade',
    'Estado',
    'Litros Recebidos (L)',
    'Valor Total Compras (R$)',
    'Litros Abastecidos (L)',
    'Saldo Disponivel (L)',
    'Custo Medio (R$/L)'
  ].map(escapeCSV).join(';'));

  works.forEach(w => {
    const inflowsForWork = filteredInflows.filter(i => i.workId === w.id);
    const dispensesForWork = filteredDispenses.filter(d => d.workId === w.id);
    const inLiters = inflowsForWork.reduce((s, i) => s + (Number(i.liters) || 0), 0);
    const inCost = inflowsForWork.reduce((s, i) => s + (Number(i.totalCost) || 0), 0);
    const outLiters = dispensesForWork.reduce((s, d) => s + (Number(d.liters) || 0), 0);
    const balLiters = Math.max(0, inLiters - outLiters);
    const unitPrice = inLiters > 0 ? (inCost / inLiters) : 0;

    lines.push([
      w.name,
      w.city,
      w.state,
      inLiters.toFixed(2),
      inCost.toFixed(2),
      outLiters.toFixed(2),
      balLiters.toFixed(2),
      unitPrice.toFixed(3)
    ].map(escapeCSV).join(';'));
  });

  lines.push('');

  // 2. ENTRADAS FISCAIS (NOTAS FISCAIS / PEDIDOS)
  lines.push('--- 2. ENTRADAS FISCAIS DE COMBUSTIVEL ---');
  lines.push([
    'ID Entrada',
    'Data Recebimento',
    'Tipo Documento',
    'Numero Fiscal',
    'Canteiro Destino',
    'Fornecedor Razao Social',
    'CNPJ Fornecedor',
    'Tipo Combustivel',
    'Volume (Litros)',
    'Preco Unitario (R$/L)',
    'Custo Total (R$)',
    'Recebido Por',
    'Observacoes'
  ].map(escapeCSV).join(';'));

  filteredInflows.forEach(i => {
    const supplier = suppliers.find(s => s.id === i.supplierId);
    lines.push([
      i.id,
      i.date,
      i.fiscalDocType === 'nf' ? 'Nota Fiscal' : i.fiscalDocType === 'pedido_compra' ? 'Pedido Compra' : 'Outro',
      i.fiscalDocNumber,
      i.workName,
      i.supplierName || supplier?.tradeName || supplier?.corporateName || '',
      i.supplierCnpj || supplier?.cnpj || '',
      i.fuelType,
      (Number(i.liters) || 0).toFixed(2),
      (Number(i.unitCost) || 0).toFixed(3),
      (Number(i.totalCost) || 0).toFixed(2),
      i.receivedBy || '',
      i.notes || ''
    ].map(escapeCSV).join(';'));
  });

  lines.push('');

  // 3. ABASTECIMENTOS DA FROTA
  lines.push('--- 3. HISTORICO DE ABASTECIMENTOS DA FROTA ---');
  lines.push([
    'ID Abastecimento',
    'Data e Hora',
    'Modalidade',
    'Canteiro Alocado',
    'Placa Veiculo',
    'Modelo Veiculo',
    'Tipo Combustivel',
    'Volume Consumido (Litros)',
    'KM ou Horimetro',
    'Custo Unitario (R$/L)',
    'Custo Total (R$)',
    'Motorista/Operador',
    'Fornecedor / Posto',
    'Tipo Doc Fiscal',
    'Numero Fiscal',
    'Observacoes'
  ].map(escapeCSV).join(';'));

  filteredDispenses.forEach(d => {
    const veh = vehicles.find(v => v.id === d.vehicleId);
    lines.push([
      d.id,
      d.date,
      d.dispenseType === 'fornecedor_direto' ? 'Posto Fornecedor Direto' : 'Tanque Obra',
      d.workName || '',
      d.vehiclePlate || veh?.plate || '',
      d.vehicleModel || veh?.model || '',
      d.fuelType,
      (Number(d.liters) || 0).toFixed(2),
      d.currentKmOrHours || '',
      (Number(d.unitCost) || 0).toFixed(3),
      (Number(d.totalCost || d.calculatedCost) || 0).toFixed(2),
      d.driverName || '',
      d.supplierName || '',
      d.fiscalDocType || '',
      d.fiscalDocNumber || '',
      d.notes || ''
    ].map(escapeCSV).join(';'));
  });

  const fileDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  downloadCSVFile(lines.join('\r\n'), `relatorio_combustiveis_${fileDate}.csv`);
}
