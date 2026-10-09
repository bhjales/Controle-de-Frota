import React, { useState, useMemo } from 'react';
import { 
  Fuel, 
  Droplet, 
  Building2, 
  Truck, 
  Plus, 
  Trash2, 
  Search, 
  Calendar, 
  FileText, 
  DollarSign, 
  AlertCircle, 
  CheckCircle, 
  X, 
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Clock,
  Sparkles,
  Info,
  Store,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { 
  User, 
  ConstructionWork, 
  Vehicle, 
  Supplier, 
  FuelInflow, 
  FuelDispense, 
  FuelDispenseType,
  FiscalDocType, 
  WorkFuelBalance 
} from '../types';
import { FleetStore } from '../store/fleetStore';
import { exportFuelReportPDF, exportFuelConsolidatedCSV } from '../utils/fuelReports';

interface FuelManagementProps {
  currentUser: User | null;
  works: ConstructionWork[];
  vehicles: Vehicle[];
  suppliers: Supplier[];
  fuelInflows: FuelInflow[];
  fuelDispenses: FuelDispense[];
  users: User[];
  store: FleetStore;
}

const COMMON_FUEL_TYPES = [
  'Diesel',
  'Gasolina'
];

export function FuelManagement({
  currentUser,
  works,
  vehicles,
  suppliers,
  fuelInflows,
  fuelDispenses,
  users,
  store
}: FuelManagementProps) {
  const [activeTab, setActiveTab] = useState<'works' | 'inflows' | 'dispenses'>('works');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkFilter, setSelectedWorkFilter] = useState<string>('all');
  const [selectedFuelTypeFilter, setSelectedFuelTypeFilter] = useState<string>('all');

  // Modals state
  const [showInflowModal, setShowInflowModal] = useState(false);
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [selectedWorkForStatement, setSelectedWorkForStatement] = useState<ConstructionWork | null>(null);

  // Inflow Form State
  const [inflowWorkId, setInflowWorkId] = useState('');
  const [inflowSupplierId, setInflowSupplierId] = useState('');
  const [inflowFiscalType, setInflowFiscalType] = useState<FiscalDocType>('nf');
  const [inflowFiscalNumber, setInflowFiscalNumber] = useState('');
  const [inflowFuelType, setInflowFuelType] = useState('Diesel');
  const [inflowLiters, setInflowLiters] = useState<string>('');
  const [inflowTotalCost, setInflowTotalCost] = useState<string>('');
  const [inflowDate, setInflowDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [inflowReceivedBy, setInflowReceivedBy] = useState<string>(currentUser?.name || '');
  const [inflowNotes, setInflowNotes] = useState<string>('');

  // Dispense Form State
  const [dispenseType, setDispenseType] = useState<FuelDispenseType>('obra');
  const [dispenseWorkId, setDispenseWorkId] = useState('');
  const [dispenseSupplierId, setDispenseSupplierId] = useState('');
  const [dispenseFiscalType, setDispenseFiscalType] = useState<FiscalDocType>('nf');
  const [dispenseFiscalNumber, setDispenseFiscalNumber] = useState('');
  const [dispenseVehicleId, setDispenseVehicleId] = useState('');
  const [dispenseShowAllVehicles, setDispenseShowAllVehicles] = useState(false);
  const [dispenseFuelType, setDispenseFuelType] = useState('Diesel');
  const [dispenseLiters, setDispenseLiters] = useState<string>('');
  const [dispenseUnitCost, setDispenseUnitCost] = useState<string>('');
  const [dispenseTotalCost, setDispenseTotalCost] = useState<string>('');
  const [dispenseKmOrHours, setDispenseKmOrHours] = useState<string>('');
  const [dispenseDriverName, setDispenseDriverName] = useState<string>(currentUser?.name || '');
  const [dispenseDate, setDispenseDate] = useState<string>(new Date().toISOString().slice(0, 16));
  const [dispenseNotes, setDispenseNotes] = useState<string>('');

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 5000);
  };

  const handleExportPDF = () => {
    try {
      exportFuelReportPDF({
        fuelInflows,
        fuelDispenses,
        works,
        vehicles,
        suppliers,
        currentUser,
        selectedWorkId: selectedWorkFilter === 'all' ? undefined : selectedWorkFilter
      });
      showNotification('success', 'Relatório gerencial de combustíveis em PDF gerado com sucesso!');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Erro ao gerar relatório em PDF.');
    }
  };

  const handleExportCSV = () => {
    try {
      exportFuelConsolidatedCSV({
        fuelInflows,
        fuelDispenses,
        works,
        vehicles,
        suppliers,
        currentUser,
        selectedWorkId: selectedWorkFilter === 'all' ? undefined : selectedWorkFilter
      });
      showNotification('success', 'Planilha detalhada de combustíveis exportada com sucesso!');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Erro ao exportar planilha CSV.');
    }
  };

  // Pre-calculated metrics for all works
  const workBalances = useMemo<WorkFuelBalance[]>(() => {
    return works.map(w => store.getWorkFuelBalance(w.id));
  }, [works, fuelInflows, fuelDispenses]);

  // Overall KPIs
  const overallKPIs = useMemo(() => {
    const isDiesel = (t?: string) => (t || '').toLowerCase().includes('diesel');
    const isGasolina = (t?: string) => (t || '').toLowerCase().includes('gasolina');

    const totalInflowLiters = fuelInflows.reduce((sum, item) => sum + (Number(item.liters) || 0), 0);
    const totalInflowCost = fuelInflows.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
    const totalDispenseLiters = fuelDispenses.reduce((sum, item) => sum + (Number(item.liters) || 0), 0);
    const totalRemainingLiters = Math.max(0, totalInflowLiters - totalDispenseLiters);
    const avgCostPerLiter = totalInflowLiters > 0 ? totalInflowCost / totalInflowLiters : 0;
    const remainingEstimatedValue = totalRemainingLiters * avgCostPerLiter;

    // Diesel breakdown
    const dieselInflows = fuelInflows.filter(i => isDiesel(i.fuelType));
    const dieselDispenses = fuelDispenses.filter(d => isDiesel(d.fuelType));
    const dieselInflowLiters = dieselInflows.reduce((s, i) => s + (Number(i.liters) || 0), 0);
    const dieselInflowCost = dieselInflows.reduce((s, i) => s + (Number(i.totalCost) || 0), 0);
    const dieselDispenseLiters = dieselDispenses.reduce((s, d) => s + (Number(d.liters) || 0), 0);
    const dieselRemainingLiters = Math.max(0, dieselInflowLiters - dieselDispenseLiters);
    const dieselAvgCost = dieselInflowLiters > 0 ? dieselInflowCost / dieselInflowLiters : 0;

    // Gasolina breakdown
    const gasolinaInflows = fuelInflows.filter(i => isGasolina(i.fuelType));
    const gasolinaDispenses = fuelDispenses.filter(d => isGasolina(d.fuelType));
    const gasolinaInflowLiters = gasolinaInflows.reduce((s, i) => s + (Number(i.liters) || 0), 0);
    const gasolinaInflowCost = gasolinaInflows.reduce((s, i) => s + (Number(i.totalCost) || 0), 0);
    const gasolinaDispenseLiters = gasolinaDispenses.reduce((s, d) => s + (Number(d.liters) || 0), 0);
    const gasolinaRemainingLiters = Math.max(0, gasolinaInflowLiters - gasolinaDispenseLiters);
    const gasolinaAvgCost = gasolinaInflowLiters > 0 ? gasolinaInflowCost / gasolinaInflowLiters : 0;

    return {
      totalInflowLiters,
      totalInflowCost,
      totalDispenseLiters,
      totalRemainingLiters,
      avgCostPerLiter,
      remainingEstimatedValue,
      inflowsCount: fuelInflows.length,
      dispensesCount: fuelDispenses.length,
      activeWorksCount: works.filter(w => w.status === 'active').length,
      diesel: {
        inflowLiters: dieselInflowLiters,
        inflowCost: dieselInflowCost,
        dispenseLiters: dieselDispenseLiters,
        remainingLiters: dieselRemainingLiters,
        avgCostPerLiter: dieselAvgCost,
      },
      gasolina: {
        inflowLiters: gasolinaInflowLiters,
        inflowCost: gasolinaInflowCost,
        dispenseLiters: gasolinaDispenseLiters,
        remainingLiters: gasolinaRemainingLiters,
        avgCostPerLiter: gasolinaAvgCost,
      }
    };
  }, [fuelInflows, fuelDispenses, works]);

  // Handlers for opening modals with presets
  const handleOpenInflowModal = (preselectedWorkId?: string) => {
    if (preselectedWorkId) {
      setInflowWorkId(preselectedWorkId);
    } else if (works.length > 0 && !inflowWorkId) {
      setInflowWorkId(works[0].id);
    }
    
    if (suppliers.length > 0 && !inflowSupplierId) {
      // Prefer suppliers categorized as 'fornecedor'
      const defaultSupplier = suppliers.find(s => s.category === 'fornecedor') || suppliers[0];
      setInflowSupplierId(defaultSupplier.id);
    }
    
    setInflowFiscalType('nf');
    setInflowFiscalNumber('');
    setInflowFuelType('Diesel');
    setInflowLiters('');
    setInflowTotalCost('');
    setInflowDate(new Date().toISOString().split('T')[0]);
    setInflowReceivedBy(currentUser?.name || '');
    setInflowNotes('');
    setShowInflowModal(true);
  };

  const handleOpenDispenseModal = (preselectedWorkId?: string, mode: FuelDispenseType = 'obra') => {
    setDispenseType(mode);
    const targetWorkId = preselectedWorkId || dispenseWorkId || (works.length > 0 ? works[0].id : '');
    setDispenseWorkId(targetWorkId);

    if (suppliers.length > 0 && !dispenseSupplierId) {
      const defaultSupplier = suppliers.find(s => s.category === 'fornecedor') || suppliers[0];
      setDispenseSupplierId(defaultSupplier.id);
    }
    
    // Auto-select vehicle associated to this work if any
    const associatedVehicles = targetWorkId ? vehicles.filter(v => v.workId === targetWorkId) : vehicles;
    if (associatedVehicles.length > 0) {
      setDispenseVehicleId(associatedVehicles[0].id);
      setDispenseKmOrHours(associatedVehicles[0].currentKm?.toString() || '');
      setDispenseFuelType(associatedVehicles[0].category === 'Caminhão' ? 'Diesel' : 'Gasolina');
    } else if (vehicles.length > 0) {
      setDispenseVehicleId(vehicles[0].id);
      setDispenseKmOrHours(vehicles[0].currentKm?.toString() || '');
      setDispenseFuelType(vehicles[0].category === 'Caminhão' ? 'Diesel' : 'Gasolina');
    } else {
      setDispenseVehicleId('');
      setDispenseKmOrHours('');
      setDispenseFuelType('Diesel');
    }

    setDispenseFiscalType('nf');
    setDispenseFiscalNumber('');
    setDispenseLiters('');
    setDispenseUnitCost('');
    setDispenseTotalCost('');
    setDispenseDriverName(currentUser?.name || '');
    setDispenseDate(new Date().toISOString().slice(0, 16));
    setDispenseNotes('');
    setDispenseShowAllVehicles(false);
    setShowDispenseModal(true);
  };

  // Vehicles available for selected obra in dispense modal
  const eligibleVehicles = useMemo(() => {
    if (dispenseShowAllVehicles || dispenseType === 'fornecedor_direto' || !dispenseWorkId) {
      return vehicles;
    }
    const filtered = vehicles.filter(v => v.workId === dispenseWorkId);
    return filtered.length > 0 ? filtered : vehicles;
  }, [vehicles, dispenseWorkId, dispenseShowAllVehicles, dispenseType]);

  // Handle selected vehicle change to prefill current KM
  const handleVehicleChange = (vId: string) => {
    setDispenseVehicleId(vId);
    const vehicle = vehicles.find(v => v.id === vId);
    if (vehicle) {
      if (vehicle.currentKm) {
        setDispenseKmOrHours(vehicle.currentKm.toString());
      }
      setDispenseFuelType(vehicle.category === 'Caminhão' ? 'Diesel' : 'Gasolina');
      if (dispenseType === 'fornecedor_direto' && vehicle.workId && !dispenseWorkId) {
        setDispenseWorkId(vehicle.workId);
      }
    }
  };

  // Inflow submission
  const handleSubmitInflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inflowWorkId) {
      showNotification('error', 'Selecione a Obra de destino.');
      return;
    }
    if (!inflowSupplierId) {
      showNotification('error', 'Selecione o Fornecedor.');
      return;
    }
    if (!inflowFiscalNumber.trim()) {
      showNotification('error', 'Informe o número do controle fiscal (NF ou Pedido de Compra).');
      return;
    }

    const litersNum = parseFloat(inflowLiters);
    if (isNaN(litersNum) || litersNum <= 0) {
      showNotification('error', 'Informe uma quantidade válida em Litros.');
      return;
    }

    const totalCostNum = parseFloat(inflowTotalCost);
    if (isNaN(totalCostNum) || totalCostNum < 0) {
      showNotification('error', 'Informe o custo total válido.');
      return;
    }

    const targetWork = works.find(w => w.id === inflowWorkId);
    const targetSupplier = suppliers.find(s => s.id === inflowSupplierId);

    const res = store.createFuelInflow({
      workId: inflowWorkId,
      workName: targetWork?.name || 'Obra',
      supplierId: inflowSupplierId,
      supplierName: targetSupplier?.tradeName || targetSupplier?.corporateName || 'Fornecedor',
      supplierCnpj: targetSupplier?.cnpj,
      fiscalDocType: inflowFiscalType,
      fiscalDocNumber: inflowFiscalNumber.trim(),
      fuelType: inflowFuelType,
      liters: litersNum,
      totalCost: totalCostNum,
      date: inflowDate,
      receivedBy: inflowReceivedBy.trim() || undefined,
      notes: inflowNotes.trim() || undefined
    });

    if (res.success) {
      showNotification('success', res.message);
      setShowInflowModal(false);
    } else {
      showNotification('error', res.message);
    }
  };

  // Dispense submission
  const handleSubmitDispense = (e: React.FormEvent) => {
    e.preventDefault();
    const isDirectSupplier = dispenseType === 'fornecedor_direto';

    if (!isDirectSupplier && !dispenseWorkId) {
      showNotification('error', 'Selecione a Obra de origem para debitar do saldo.');
      return;
    }
    if (isDirectSupplier && !dispenseSupplierId) {
      showNotification('error', 'Selecione o Fornecedor/Posto de combustível.');
      return;
    }
    if (!dispenseVehicleId) {
      showNotification('error', 'Selecione o veículo abastecido.');
      return;
    }

    const litersNum = parseFloat(dispenseLiters);
    if (isNaN(litersNum) || litersNum <= 0) {
      showNotification('error', 'Informe uma quantidade válida em Litros.');
      return;
    }

    const targetWork = works.find(w => w.id === dispenseWorkId);
    const targetVehicle = vehicles.find(v => v.id === dispenseVehicleId);
    const targetSupplier = suppliers.find(s => s.id === dispenseSupplierId);

    const currentKmNum = dispenseKmOrHours ? parseFloat(dispenseKmOrHours) : undefined;
    const unitCostNum = dispenseUnitCost ? parseFloat(dispenseUnitCost) : undefined;
    const totalCostNum = dispenseTotalCost ? parseFloat(dispenseTotalCost) : undefined;

    const res = store.createFuelDispense({
      dispenseType,
      workId: dispenseWorkId || undefined,
      workName: targetWork?.name,
      supplierId: isDirectSupplier ? dispenseSupplierId : undefined,
      supplierName: isDirectSupplier ? (targetSupplier?.tradeName || targetSupplier?.corporateName) : undefined,
      supplierCnpj: isDirectSupplier ? targetSupplier?.cnpj : undefined,
      fiscalDocType: isDirectSupplier ? dispenseFiscalType : undefined,
      fiscalDocNumber: isDirectSupplier ? dispenseFiscalNumber.trim() : undefined,
      vehicleId: dispenseVehicleId,
      vehiclePlate: targetVehicle?.plate || 'S/ PLACA',
      vehicleModel: targetVehicle?.model || 'Veículo',
      fuelType: dispenseFuelType || (targetVehicle?.category === 'Caminhão' ? 'Diesel' : 'Gasolina'),
      liters: litersNum,
      unitCost: unitCostNum,
      totalCost: totalCostNum,
      currentKmOrHours: currentKmNum,
      driverName: dispenseDriverName.trim() || currentUser?.name || undefined,
      driverId: currentUser?.id,
      date: dispenseDate,
      notes: dispenseNotes.trim() || undefined
    });

    if (res.success) {
      showNotification('success', res.message);
      setShowDispenseModal(false);
    } else {
      showNotification('error', res.message);
    }
  };

  // Inflow unit cost calculation in real time for modal
  const computedUnitCost = useMemo(() => {
    const l = parseFloat(inflowLiters);
    const c = parseFloat(inflowTotalCost);
    if (!isNaN(l) && !isNaN(c) && l > 0) {
      return (c / l).toFixed(3);
    }
    return '0.000';
  }, [inflowLiters, inflowTotalCost]);

  // Selected work balance for dispense modal
  const currentDispenseWorkBalance = useMemo(() => {
    if (!dispenseWorkId) return null;
    return store.getWorkFuelBalance(dispenseWorkId);
  }, [dispenseWorkId, fuelInflows, fuelDispenses]);

  // Filtered Inflows list
  const filteredInflows = useMemo(() => {
    return fuelInflows.filter(inflow => {
      const matchSearch = searchTerm === '' || 
        inflow.fiscalDocNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inflow.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inflow.workName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inflow.supplierCnpj && inflow.supplierCnpj.includes(searchTerm));
      
      const matchWork = selectedWorkFilter === 'all' || inflow.workId === selectedWorkFilter;
      const matchFuel = selectedFuelTypeFilter === 'all' || inflow.fuelType === selectedFuelTypeFilter;

      return matchSearch && matchWork && matchFuel;
    });
  }, [fuelInflows, searchTerm, selectedWorkFilter, selectedFuelTypeFilter]);

  // Filtered Dispenses list
  const filteredDispenses = useMemo(() => {
    return fuelDispenses.filter(dispense => {
      const matchSearch = searchTerm === '' ||
        dispense.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dispense.vehicleModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dispense.workName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (dispense.driverName && dispense.driverName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchWork = selectedWorkFilter === 'all' || dispense.workId === selectedWorkFilter;
      const matchFuel = selectedFuelTypeFilter === 'all' || dispense.fuelType === selectedFuelTypeFilter;

      return matchSearch && matchWork && matchFuel;
    });
  }, [fuelDispenses, searchTerm, selectedWorkFilter, selectedFuelTypeFilter]);

  // Filtered Works list
  const filteredWorks = useMemo(() => {
    return works.filter(work => {
      const matchSearch = searchTerm === '' || 
        work.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        work.city.toLowerCase().includes(searchTerm.toLowerCase());
      const matchWork = selectedWorkFilter === 'all' || work.id === selectedWorkFilter;
      return matchSearch && matchWork;
    });
  }, [works, searchTerm, selectedWorkFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {feedback && (
        <div 
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            feedback.type === 'success' 
              ? 'bg-emerald-600 text-white shadow-emerald-900/40' 
              : 'bg-rose-600 text-white shadow-rose-900/40'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{feedback.message}</span>
          <button 
            onClick={() => setFeedback(null)} 
            className="ml-2 hover:opacity-75 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wide uppercase">
              <Fuel className="w-3.5 h-3.5 text-amber-400" />
              Módulo de Combustível & Abastecimento
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Controle de Combustível por Obra
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Gestão integrada de entradas de combustível vinculadas a fornecedores e notas fiscais, controle de saldo em tanques por obra e registro de abastecimento da frota.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleOpenInflowModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-950/40 hover:shadow-emerald-900/60 transition-all duration-200 cursor-pointer active:scale-95"
            >
              <ArrowDownLeft className="w-4 h-4" />
              Entrada Fiscal (NF/PC)
            </button>
            <button
              onClick={() => handleOpenDispenseModal(undefined, 'obra')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-950/40 hover:shadow-blue-900/60 transition-all duration-200 cursor-pointer active:scale-95"
            >
              <Building2 className="w-4 h-4" />
              Abastecer na Obra
            </button>
            <button
              onClick={() => handleOpenDispenseModal(undefined, 'fornecedor_direto')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-sm shadow-lg shadow-amber-950/40 hover:shadow-amber-900/60 transition-all duration-200 cursor-pointer active:scale-95"
            >
              <Store className="w-4 h-4" />
              Abastecer no Fornecedor
            </button>

            {/* Export Actions */}
            <div className="flex items-center gap-2">
              <button
                id="btn_export_fuel_mgmt_pdf"
                onClick={handleExportPDF}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 hover:text-white font-semibold text-sm shadow-md transition-all duration-200 cursor-pointer active:scale-95"
                title="Exportar Relatório Consolidado de Combustíveis em PDF"
              >
                <Download className="w-4 h-4 text-amber-400" />
                Relatório PDF
              </button>
              <button
                id="btn_export_fuel_mgmt_csv"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 hover:text-white font-semibold text-sm shadow-md transition-all duration-200 cursor-pointer active:scale-95"
                title="Exportar Planilha Excel / CSV com Balanço e Histórico"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Planilha CSV
              </button>
            </div>
          </div>
        </div>

        {/* Top KPIs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-800/80">
          {/* Card 1: Saldo Restante */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 sm:p-4 hover:border-slate-600 transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-1">
                <span>Saldo Total em Tanque</span>
                <Droplet className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-400">
                {overallKPIs.totalRemainingLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} <span className="text-sm font-normal text-emerald-300">L</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Estoque avaliado em ~ R$ {overallKPIs.remainingEstimatedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Differentiated balance pills */}
            <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-700/60 text-[11px]">
              <div className="flex-1 flex items-center justify-between px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800/40 text-sky-300">
                <span>🛢️ Diesel:</span>
                <strong className="font-mono">{overallKPIs.diesel.remainingLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L</strong>
              </div>
              <div className="flex-1 flex items-center justify-between px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/40 text-amber-300">
                <span>⛽ Gasol.:</span>
                <strong className="font-mono">{overallKPIs.gasolina.remainingLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L</strong>
              </div>
            </div>
          </div>

          {/* Card 2: Total Entradas */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 sm:p-4 hover:border-slate-600 transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-1">
                <span>Total Comprado (Entradas)</span>
                <ArrowDownLeft className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white">
                {overallKPIs.totalInflowLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} <span className="text-sm font-normal text-slate-400">L</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {overallKPIs.inflowsCount} registro(s) (R$ {overallKPIs.totalInflowCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
              </div>
            </div>

            {/* Differentiated inflow pills */}
            <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-700/60 text-[11px]">
              <div className="flex-1 flex items-center justify-between px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800/40 text-sky-300">
                <span>🛢️ Diesel:</span>
                <strong className="font-mono">{overallKPIs.diesel.inflowLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L</strong>
              </div>
              <div className="flex-1 flex items-center justify-between px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/40 text-amber-300">
                <span>⛽ Gasol.:</span>
                <strong className="font-mono">{overallKPIs.gasolina.inflowLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L</strong>
              </div>
            </div>
          </div>

          {/* Card 3: Total Consumido */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 sm:p-4 hover:border-slate-600 transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-1">
                <span>Consumo da Frota</span>
                <Fuel className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white">
                {overallKPIs.totalDispenseLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} <span className="text-sm font-normal text-slate-400">L</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {overallKPIs.dispensesCount} abastecimento(s) realizados
              </div>
            </div>

            {/* Differentiated consumption pills */}
            <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-700/60 text-[11px]">
              <div className="flex-1 flex items-center justify-between px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800/40 text-sky-300">
                <span>🛢️ Diesel:</span>
                <strong className="font-mono">{overallKPIs.diesel.dispenseLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L</strong>
              </div>
              <div className="flex-1 flex items-center justify-between px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/40 text-amber-300">
                <span>⛽ Gasol.:</span>
                <strong className="font-mono">{overallKPIs.gasolina.dispenseLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L</strong>
              </div>
            </div>
          </div>

          {/* Card 4: Custo Médio */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 sm:p-4 hover:border-slate-600 transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-1">
                <span>Custo Médio / Litro</span>
                <DollarSign className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white">
                R$ {overallKPIs.avgCostPerLiter > 0 ? overallKPIs.avgCostPerLiter.toFixed(3) : '0,000'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {overallKPIs.activeWorksCount} obra(s) monitoradas
              </div>
            </div>

            {/* Differentiated unit price pills */}
            <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-700/60 text-[11px]">
              <div className="flex-1 flex items-center justify-between px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800/40 text-sky-300">
                <span>🛢️ Diesel:</span>
                <strong className="font-mono">R$ {overallKPIs.diesel.avgCostPerLiter > 0 ? overallKPIs.diesel.avgCostPerLiter.toFixed(2) : '-'}</strong>
              </div>
              <div className="flex-1 flex items-center justify-between px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/40 text-amber-300">
                <span>⛽ Gasol.:</span>
                <strong className="font-mono">R$ {overallKPIs.gasolina.avgCostPerLiter > 0 ? overallKPIs.gasolina.avgCostPerLiter.toFixed(2) : '-'}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nav Tabs & Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
        {/* Module Sub-tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('works')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'works'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            🏗️ Saldos por Obra ({works.length})
          </button>
          <button
            onClick={() => setActiveTab('inflows')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'inflows'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            📥 Entradas & NFs ({fuelInflows.length})
          </button>
          <button
            onClick={() => setActiveTab('dispenses')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'dispenses'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-900/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            ⛽ Abastecimentos ({fuelDispenses.length})
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Search box */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={
                activeTab === 'works' 
                  ? 'Buscar obra...' 
                  : activeTab === 'inflows' 
                  ? 'NF, fornecedor, obra...' 
                  : 'Placa, motorista, obra...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Work filter dropdown */}
          <select
            value={selectedWorkFilter}
            onChange={(e) => setSelectedWorkFilter(e.target.value)}
            className="py-1.5 px-3 text-xs rounded-xl bg-slate-950/70 border border-slate-700/80 text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">Todas as Obras</option>
            {works.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          {/* Filtro por Combustível (Diesel ou Gasolina) */}
          <select
            value={selectedFuelTypeFilter}
            onChange={(e) => setSelectedFuelTypeFilter(e.target.value)}
            className="py-1.5 px-3 text-xs rounded-xl bg-slate-950/70 border border-slate-700/80 text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">Todos os Combustíveis</option>
            {COMMON_FUEL_TYPES.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ============================================================ */}
      {/* VIEW 1: SALDOS POR OBRA (Cards detalhados com tanque e extrato) */}
      {/* ============================================================ */}
      {activeTab === 'works' && (
        <div className="space-y-4">
          {filteredWorks.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-semibold text-white">Nenhuma obra encontrada</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {works.length === 0 
                  ? 'Cadastre obras no módulo de Obras para iniciar o gerenciamento de estoque de combustível por canteiro.'
                  : 'Nenhuma obra corresponde aos filtros de busca aplicados.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredWorks.map((work) => {
                const balance = store.getWorkFuelBalance(work.id);
                const assignedVehicles = vehicles.filter(v => v.workId === work.id);
                
                // Calculate tank percentage (balance vs total inflow)
                const percentage = balance.totalInflowLiters > 0 
                  ? Math.min(100, Math.round((balance.balanceLiters / balance.totalInflowLiters) * 100))
                  : 0;

                const isLow = balance.balanceLiters > 0 && percentage < 20;
                const isZero = balance.balanceLiters <= 0 && balance.totalInflowLiters > 0;
                const isEmptyNeverStocked = balance.totalInflowLiters === 0;

                return (
                  <div 
                    key={work.id}
                    className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-lg transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Obra Header */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white text-base tracking-tight hover:text-blue-400 transition-colors">
                              {work.name}
                            </h3>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              work.status === 'active' 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {work.status === 'active' ? 'Ativa' : 'Concluída'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>📍 {work.city} - {work.state}</span>
                          </div>
                        </div>

                        {/* Status chip */}
                        {isEmptyNeverStocked ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
                            Sem estoque
                          </span>
                        ) : isZero ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold animate-pulse">
                            Zerado!
                          </span>
                        ) : isLow ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold">
                            Estoque Baixo
                          </span>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                            Estoque Regular
                          </span>
                        )}
                      </div>

                      {/* Main Balance Summary Header */}
                      <div className="flex items-center justify-between text-xs px-1 text-slate-400">
                        <span>Saldo Total em Tanque:</span>
                        <span className="font-bold text-white font-mono">
                          {balance.balanceLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
                        </span>
                      </div>

                      {/* Dual Tanks: Diesel & Gasolina */}
                      <div className="space-y-2.5 my-2.5">
                        {/* Tanque 1: Diesel */}
                        {(() => {
                          const dieselPct = balance.diesel.inflowLiters > 0 
                            ? Math.min(100, Math.round((balance.diesel.balanceLiters / balance.diesel.inflowLiters) * 100))
                            : 0;
                          return (
                            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 font-bold text-sky-300">
                                  <Droplet className="w-3.5 h-3.5 text-sky-400" />
                                  <span>Tanque Diesel</span>
                                </div>
                                <span className="text-[11px] font-mono font-semibold text-slate-400">
                                  {balance.diesel.inflowLiters > 0 ? `${dieselPct}% do estoque` : 'Sem entradas'}
                                </span>
                              </div>

                              <div className="flex items-baseline justify-between mt-1.5">
                                <div className="flex items-baseline gap-1.5">
                                  <span className={`text-xl font-black font-mono tracking-tight ${
                                    balance.diesel.balanceLiters <= 0 && balance.diesel.inflowLiters > 0 
                                      ? 'text-rose-400' 
                                      : dieselPct < 20 && balance.diesel.balanceLiters > 0 
                                      ? 'text-amber-400' 
                                      : 'text-sky-300'
                                  }`}>
                                    {balance.diesel.balanceLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                                  </span>
                                  <span className="text-[10px] uppercase font-bold text-slate-400">L disp.</span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400">
                                  R$ {balance.diesel.averageCostPerLiter > 0 ? balance.diesel.averageCostPerLiter.toFixed(2) : '0,00'}/L
                                </span>
                              </div>

                              {/* Progress Bar Diesel */}
                              <div className="w-full bg-slate-800/90 rounded-full h-1.5 mt-2 overflow-hidden">
                                <div 
                                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-500 transition-all duration-500"
                                  style={{ width: `${Math.max(dieselPct, balance.diesel.balanceLiters > 0 ? 3 : 0)}%` }}
                                />
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 pt-1 border-t border-slate-850 font-mono">
                                <span>Entradas: {balance.diesel.inflowLiters.toLocaleString('pt-BR')} L</span>
                                <span className="text-amber-300/90">Consumo: {balance.diesel.dispenseLiters.toLocaleString('pt-BR')} L</span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Tanque 2: Gasolina */}
                        {(() => {
                          const gasolinaPct = balance.gasolina.inflowLiters > 0 
                            ? Math.min(100, Math.round((balance.gasolina.balanceLiters / balance.gasolina.inflowLiters) * 100))
                            : 0;
                          return (
                            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                                  <Fuel className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Tanque Gasolina</span>
                                </div>
                                <span className="text-[11px] font-mono font-semibold text-slate-400">
                                  {balance.gasolina.inflowLiters > 0 ? `${gasolinaPct}% do estoque` : 'Sem entradas'}
                                </span>
                              </div>

                              <div className="flex items-baseline justify-between mt-1.5">
                                <div className="flex items-baseline gap-1.5">
                                  <span className={`text-xl font-black font-mono tracking-tight ${
                                    balance.gasolina.balanceLiters <= 0 && balance.gasolina.inflowLiters > 0 
                                      ? 'text-rose-400' 
                                      : gasolinaPct < 20 && balance.gasolina.balanceLiters > 0 
                                      ? 'text-amber-400' 
                                      : 'text-amber-300'
                                  }`}>
                                    {balance.gasolina.balanceLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                                  </span>
                                  <span className="text-[10px] uppercase font-bold text-slate-400">L disp.</span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400">
                                  R$ {balance.gasolina.averageCostPerLiter > 0 ? balance.gasolina.averageCostPerLiter.toFixed(2) : '0,00'}/L
                                </span>
                              </div>

                              {/* Progress Bar Gasolina */}
                              <div className="w-full bg-slate-800/90 rounded-full h-1.5 mt-2 overflow-hidden">
                                <div 
                                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                                  style={{ width: `${Math.max(gasolinaPct, balance.gasolina.balanceLiters > 0 ? 3 : 0)}%` }}
                                />
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 pt-1 border-t border-slate-850 font-mono">
                                <span>Entradas: {balance.gasolina.inflowLiters.toLocaleString('pt-BR')} L</span>
                                <span className="text-amber-300/90">Consumo: {balance.gasolina.dispenseLiters.toLocaleString('pt-BR')} L</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Assigned vehicles indicator */}
                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 px-1">
                        <span className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-blue-400" />
                          Veículos alocados nesta obra:
                        </span>
                        <span className="font-semibold text-slate-200">
                          {assignedVehicles.length} veículo(s)
                        </span>
                      </div>
                    </div>

                    {/* Action buttons on work card */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
                      <button
                        onClick={() => handleOpenDispenseModal(work.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold transition-all cursor-pointer"
                        title="Abastecer veículo com o combustível desta obra"
                      >
                        <Fuel className="w-3.5 h-3.5" />
                        Abastecer
                      </button>

                      <button
                        onClick={() => handleOpenInflowModal(work.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer"
                        title="Registrar nova entrada com NF para esta obra"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        Nova Entrada
                      </button>

                      <button
                        onClick={() => setSelectedWorkForStatement(work)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
                        title="Ver extrato completo de entradas e saídas desta obra"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 2: ENTRADAS DE COMBUSTÍVEL (Notas Fiscais / Pedidos) */}
      {/* ============================================================ */}
      {activeTab === 'inflows' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/40">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                Histórico de Entradas de Combustível (Compras Fiscais)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Entradas de combustível vinculadas a fornecedores cadastrados, número de controle fiscal (NF ou Pedido) e obra de destino.
              </p>
            </div>
            <button
              onClick={() => handleOpenInflowModal()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nova Entrada Fiscal
            </button>
          </div>

          {/* Subtotal bar differentiated by fuel type */}
          <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Total Filtrado:</span>
              <span className="font-black text-white font-mono">
                {filteredInflows.reduce((s, i) => s + (Number(i.liters) || 0), 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
              </span>
              <span className="text-slate-500 font-mono text-[11px]">
                (R$ {filteredInflows.reduce((s, i) => s + (Number(i.totalCost) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-950/60 border border-sky-800/40 text-sky-300 font-semibold text-[11px]">
                <span>🛢️ Entradas Diesel:</span>
                <strong className="font-mono text-white">
                  {filteredInflows.filter(i => (i.fuelType || '').toLowerCase().includes('diesel')).reduce((s, i) => s + (Number(i.liters) || 0), 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
                </strong>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-800/40 text-amber-300 font-semibold text-[11px]">
                <span>⛽ Entradas Gasolina:</span>
                <strong className="font-mono text-white">
                  {filteredInflows.filter(i => (i.fuelType || '').toLowerCase().includes('gasolina')).reduce((s, i) => s + (Number(i.liters) || 0), 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
                </strong>
              </div>
            </div>
          </div>

          {filteredInflows.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="text-sm font-semibold text-white">Nenhuma entrada cadastrada</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Registre uma entrada de combustível informando a obra, fornecedor e o número da Nota Fiscal ou Pedido de Compra.
              </p>
              <button
                onClick={() => handleOpenInflowModal()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Cadastrar Primeira Entrada
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Obra Destino</th>
                    <th className="py-3 px-4">Fornecedor</th>
                    <th className="py-3 px-4">Doc. Fiscal</th>
                    <th className="py-3 px-4">Combustível</th>
                    <th className="py-3 px-4 text-right">Litros</th>
                    <th className="py-3 px-4 text-right">R$ / Litro</th>
                    <th className="py-3 px-4 text-right">Total (R$)</th>
                    <th className="py-3 px-4">Responsável</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredInflows.map((inflow) => (
                    <tr key={inflow.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-300 font-medium">
                        {inflow.date ? new Date(inflow.date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-white flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                          {inflow.workName}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{inflow.supplierName}</div>
                        {inflow.supplierCnpj && (
                          <div className="text-[10px] text-slate-400 font-mono">{inflow.supplierCnpj}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                          inflow.fiscalDocType === 'nf'
                            ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                            : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                        }`}>
                          <FileText className="w-3 h-3" />
                          {inflow.fiscalDocType === 'nf' ? 'NF: ' : 'PC: '} {inflow.fiscalDocNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                          inflow.fuelType?.toLowerCase().includes('diesel')
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : inflow.fuelType?.toLowerCase().includes('gasolina')
                            ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {inflow.fuelType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-emerald-400">
                        {Number(inflow.liters).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap text-slate-300">
                        R$ {Number(inflow.unitCost).toFixed(3)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-white">
                        R$ {Number(inflow.totalCost).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {inflow.receivedBy || '-'}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            if (window.confirm(`Deseja excluir a entrada fiscal ${inflow.fiscalDocNumber} da obra ${inflow.workName}?`)) {
                              const res = store.deleteFuelInflow(inflow.id);
                              if (res.success) showNotification('success', res.message);
                              else showNotification('error', res.message);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Excluir entrada"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 3: ABASTECIMENTOS DA FROTA (Saídas / Consumo de veículos) */}
      {/* ============================================================ */}
      {activeTab === 'dispenses' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/40">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Fuel className="w-5 h-5 text-amber-400" />
                Histórico de Abastecimentos dos Veículos nas Obras
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Consumo de combustível da frota registrado por canteiro de obra com atualização de odômetro/horímetro.
              </p>
            </div>
            <button
              onClick={() => handleOpenDispenseModal()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Novo Abastecimento
            </button>
          </div>

          {/* Subtotal bar differentiated by fuel type */}
          <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Consumo Total Filtrado:</span>
              <span className="font-black text-white font-mono">
                {filteredDispenses.reduce((s, d) => s + (Number(d.liters) || 0), 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
              </span>
              <span className="text-slate-500 font-mono text-[11px]">
                (R$ {filteredDispenses.reduce((s, d) => s + (Number(d.totalCost || d.calculatedCost) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-950/60 border border-sky-800/40 text-sky-300 font-semibold text-[11px]">
                <span>🛢️ Consumo Diesel:</span>
                <strong className="font-mono text-white">
                  {filteredDispenses.filter(d => (d.fuelType || '').toLowerCase().includes('diesel')).reduce((s, d) => s + (Number(d.liters) || 0), 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
                </strong>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-800/40 text-amber-300 font-semibold text-[11px]">
                <span>⛽ Consumo Gasolina:</span>
                <strong className="font-mono text-white">
                  {filteredDispenses.filter(d => (d.fuelType || '').toLowerCase().includes('gasolina')).reduce((s, d) => s + (Number(d.liters) || 0), 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
                </strong>
              </div>
            </div>
          </div>

          {filteredDispenses.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Truck className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="text-sm font-semibold text-white">Nenhum abastecimento registrado</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Registre os abastecimentos de caminhões e veículos da obra para abater do saldo do canteiro.
              </p>
              <button
                onClick={() => handleOpenDispenseModal()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Registrar Primeiro Abastecimento
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Data/Hora</th>
                    <th className="py-3 px-4">Modalidade / Origem</th>
                    <th className="py-3 px-4">Veículo</th>
                    <th className="py-3 px-4">Motorista / Operador</th>
                    <th className="py-3 px-4">Combustível</th>
                    <th className="py-3 px-4 text-right">Qtd (Litros)</th>
                    <th className="py-3 px-4 text-right">KM / Horímetro</th>
                    <th className="py-3 px-4 text-right">Custo</th>
                    <th className="py-3 px-4">Observações</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredDispenses.map((dispense) => {
                    const isDirect = dispense.dispenseType === 'fornecedor_direto';
                    return (
                      <tr key={dispense.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-300 font-medium">
                          {dispense.date ? new Date(dispense.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                        </td>
                        <td className="py-3 px-4">
                          {isDirect ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                <Store className="w-3 h-3" />
                                DIRETO NO FORNECEDOR
                              </span>
                              <div className="text-white font-semibold text-xs flex items-center gap-1">
                                {dispense.supplierName || 'Fornecedor'}
                              </div>
                              {dispense.fiscalDocNumber && (
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Doc: {dispense.fiscalDocNumber}
                                </div>
                              )}
                              {dispense.workName && (
                                <div className="text-[10px] text-blue-400">
                                  Obra: {dispense.workName}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                <Building2 className="w-3 h-3" />
                                ESTOQUE DA OBRA
                              </span>
                              <div className="font-semibold text-white text-xs">
                                {dispense.workName || 'Obra'}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-slate-400" />
                            {dispense.vehiclePlate}
                          </div>
                          <div className="text-[11px] text-slate-400">{dispense.vehicleModel}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-medium whitespace-nowrap">
                          {dispense.driverName || 'Não especificado'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                            dispense.fuelType?.toLowerCase().includes('diesel')
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : dispense.fuelType?.toLowerCase().includes('gasolina')
                              ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            {dispense.fuelType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-amber-400">
                          {Number(dispense.liters).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap text-slate-300 font-mono">
                          {dispense.currentKmOrHours ? `${dispense.currentKmOrHours} km` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap font-semibold text-slate-200">
                          R$ {Number(dispense.totalCost || dispense.calculatedCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px] max-w-xs truncate">
                          {dispense.notes || '-'}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => {
                              if (window.confirm(`Deseja excluir o abastecimento de ${dispense.liters} L do veículo ${dispense.vehiclePlate}?`)) {
                                const res = store.deleteFuelDispense(dispense.id);
                                if (res.success) showNotification('success', res.message);
                                else showNotification('error', res.message);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Excluir abastecimento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: NOVA ENTRADA DE COMBUSTÍVEL */}
      {/* ============================================================ */}
      {showInflowModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-8">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Nova Entrada de Combustível</h3>
                  <p className="text-xs text-slate-400">
                    Entrada fiscal em canteiro de obra vinculado ao fornecedor credenciado
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInflowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitInflow} className="p-6 space-y-4">
              {/* Row 1: Obra Destino & Fornecedor Credenciado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Obra de Destino <span className="text-emerald-400">*</span>
                  </label>
                  <select
                    value={inflowWorkId}
                    onChange={(e) => setInflowWorkId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="">Selecione a Obra...</option>
                    {works.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.city} - {w.state})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Fornecedor Credenciado <span className="text-emerald-400">*</span>
                  </label>
                  <select
                    value={inflowSupplierId}
                    onChange={(e) => setInflowSupplierId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="">Selecione o Fornecedor...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.tradeName || s.corporateName} - {s.category === 'fornecedor' ? '🏷️ Fornecedor' : '🔧 Prestador'} ({s.cnpj})
                      </option>
                    ))}
                  </select>
                  {suppliers.length === 0 && (
                    <p className="text-[11px] text-amber-400 mt-1">
                      Nenhum fornecedor cadastrado. Cadastre primeiro na aba "Fornecedores".
                    </p>
                  )}
                </div>
              </div>

              {/* Row 2: Controle Fiscal (Tipo de Doc e Número) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tipo de Doc. Fiscal <span className="text-emerald-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setInflowFiscalType('nf')}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        inflowFiscalType === 'nf'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Nota Fiscal (NF)
                    </button>
                    <button
                      type="button"
                      onClick={() => setInflowFiscalType('pedido_compra')}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        inflowFiscalType === 'pedido_compra'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Pedido Compra
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Número do Controle Fiscal (NF / Pedido) <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: NF-e 004821 / PC-2026-088"
                    value={inflowFiscalNumber}
                    onChange={(e) => setInflowFiscalNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Identificador fiscal obrigatório para rastreabilidade e auditoria financeira
                  </span>
                </div>
              </div>

              {/* Row 3: Combustível, Litros e Valores */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tipo de Combustível
                  </label>
                  <select
                    value={inflowFuelType}
                    onChange={(e) => setInflowFuelType(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {COMMON_FUEL_TYPES.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Quantidade em Litros <span className="text-emerald-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      required
                      placeholder="Ex: 2000"
                      value={inflowLiters}
                      onChange={(e) => setInflowLiters(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 pr-10 font-bold"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                      L
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Custo Total (R$) <span className="text-emerald-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="Ex: 11980.00"
                      value={inflowTotalCost}
                      onChange={(e) => setInflowTotalCost(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>
                  <span className="text-[11px] text-emerald-400 mt-1 block font-mono">
                    ~ R$ {computedUnitCost} / Litro
                  </span>
                </div>
              </div>

              {/* Row 4: Data & Responsável */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Data do Recebimento
                  </label>
                  <input
                    type="date"
                    required
                    value={inflowDate}
                    onChange={(e) => setInflowDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Responsável pelo Recebimento
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Encarregado Carlos"
                    value={inflowReceivedBy}
                    onChange={(e) => setInflowReceivedBy(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Row 5: Observações */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Observações / Dados Adicionais (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Abastecido no tanque móvel nº 2 da obra, lacre verificado nº 48921"
                  value={inflowNotes}
                  onChange={(e) => setInflowNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInflowModal(false)}
                  className="px-4 py-2 text-sm rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
                >
                  Confirmar Entrada de Combustível
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: ABASTECER VEÍCULO NA OBRA */}
      {/* ============================================================ */}
      {showDispenseModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-8">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  dispenseType === 'fornecedor_direto'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                }`}>
                  {dispenseType === 'fornecedor_direto' ? <Store className="w-5 h-5" /> : <Fuel className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {dispenseType === 'fornecedor_direto' ? 'Abastecer Direto no Fornecedor' : 'Abastecer com Estoque da Obra'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {dispenseType === 'fornecedor_direto'
                      ? 'Abastecimento externo em posto conveniado/fornecedor com NF ou comprovante'
                      : 'Consumo do combustível adquirido e estocado no tanque da obra'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDispenseModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDispense} className="p-6 space-y-4">
              {/* Seletor do Modo de Abastecimento */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Origem do Abastecimento <span className="text-blue-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDispenseType('obra')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      dispenseType === 'obra'
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-950/50 ring-1 ring-blue-500'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <div className={`p-2 rounded-lg mt-0.5 ${dispenseType === 'obra' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">1. Estoque da Obra</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Consome o combustível já adquirido no canteiro
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDispenseType('fornecedor_direto')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      dispenseType === 'fornecedor_direto'
                        ? 'bg-amber-600/20 border-amber-500 text-white shadow-lg shadow-amber-950/50 ring-1 ring-amber-500'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <div className={`p-2 rounded-lg mt-0.5 ${dispenseType === 'fornecedor_direto' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">2. Direto no Fornecedor</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Posto credenciado, bomba externa ou fornecedor
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* MODO 1: CONSUMINDO DA OBRA */}
              {dispenseType === 'obra' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Obra de Origem (Tanque / Canteiro) <span className="text-blue-400">*</span>
                  </label>
                  <select
                    value={dispenseWorkId}
                    onChange={(e) => {
                      setDispenseWorkId(e.target.value);
                      const associated = vehicles.filter(v => v.workId === e.target.value);
                      if (associated.length > 0) {
                        setDispenseVehicleId(associated[0].id);
                        setDispenseKmOrHours(associated[0].currentKm?.toString() || '');
                      }
                    }}
                    required
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">Selecione a Obra...</option>
                    {works.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.city})
                      </option>
                    ))}
                  </select>

                  {/* Saldo visual da Obra selecionada diferenciado por combustível */}
                  {currentDispenseWorkBalance && (
                    <div className="mt-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300">Estoque no Tanque da Obra:</span>
                        <span className="font-mono">Total: {currentDispenseWorkBalance.balanceLiters.toLocaleString('pt-BR')} L</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {/* Box Diesel */}
                        <div className={`p-2.5 rounded-lg border transition-all ${
                          dispenseFuelType.toLowerCase().includes('diesel')
                            ? 'bg-sky-950/70 border-sky-500 text-sky-200 ring-1 ring-sky-500'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400'
                        }`}>
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span>🛢️ Saldo Diesel</span>
                            <span className="font-mono text-slate-400">
                              R$ {currentDispenseWorkBalance.diesel.averageCostPerLiter.toFixed(2)}/L
                            </span>
                          </div>
                          <div className="text-base font-black text-white mt-0.5 font-mono">
                            {currentDispenseWorkBalance.diesel.balanceLiters.toLocaleString('pt-BR')} <span className="text-[10px] font-normal text-slate-400">L</span>
                          </div>
                          <div className="text-[9px] text-slate-500 mt-0.5">
                            {currentDispenseWorkBalance.diesel.dispenseLiters} L já consumidos
                          </div>
                        </div>

                        {/* Box Gasolina */}
                        <div className={`p-2.5 rounded-lg border transition-all ${
                          dispenseFuelType.toLowerCase().includes('gasolina')
                            ? 'bg-amber-950/70 border-amber-500 text-amber-200 ring-1 ring-amber-500'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400'
                        }`}>
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span>⛽ Saldo Gasolina</span>
                            <span className="font-mono text-slate-400">
                              R$ {currentDispenseWorkBalance.gasolina.averageCostPerLiter.toFixed(2)}/L
                            </span>
                          </div>
                          <div className="text-base font-black text-white mt-0.5 font-mono">
                            {currentDispenseWorkBalance.gasolina.balanceLiters.toLocaleString('pt-BR')} <span className="text-[10px] font-normal text-slate-400">L</span>
                          </div>
                          <div className="text-[9px] text-slate-500 mt-0.5">
                            {currentDispenseWorkBalance.gasolina.dispenseLiters} L já consumidos
                          </div>
                        </div>
                      </div>

                      {/* Warning if requested exceeds specific fuel balance */}
                      {(() => {
                        const isGas = dispenseFuelType.toLowerCase().includes('gasolina');
                        const targetStock = isGas ? currentDispenseWorkBalance.gasolina : currentDispenseWorkBalance.diesel;
                        const reqLiters = parseFloat(dispenseLiters);
                        if (!isNaN(reqLiters) && reqLiters > targetStock.balanceLiters) {
                          return (
                            <div className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-1.5 font-medium">
                              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-400" />
                              <span>
                                Quantidade informada ({reqLiters} L) supera o saldo de {dispenseFuelType} desta obra ({targetStock.balanceLiters.toLocaleString('pt-BR')} L).
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* MODO 2: DIRETO NO FORNECEDOR / POSTO */}
              {dispenseType === 'fornecedor_direto' && (
                <div className="space-y-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Fornecedor / Posto Credenciado <span className="text-amber-400">*</span>
                      </label>
                      <select
                        value={dispenseSupplierId}
                        onChange={(e) => setDispenseSupplierId(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-sm rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                      >
                        <option value="">Selecione o Fornecedor...</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.tradeName || s.corporateName} ({s.cnpj})
                          </option>
                        ))}
                      </select>
                      {suppliers.length === 0 && (
                        <p className="text-[11px] text-amber-400 mt-1">
                          Nenhum fornecedor cadastrado. Cadastre primeiro na aba Fornecedores.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Obra para Alocação de Custo <span className="text-slate-400 font-normal">(Opcional)</span>
                      </label>
                      <select
                        value={dispenseWorkId}
                        onChange={(e) => setDispenseWorkId(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                      >
                        <option value="">Sem vínculo / Custo Geral da Frota</option>
                        {works.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.city})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Controle fiscal do abastecimento externo */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Tipo Doc. Fiscal
                      </label>
                      <select
                        value={dispenseFiscalType}
                        onChange={(e) => setDispenseFiscalType(e.target.value as FiscalDocType)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="nf">Nota Fiscal (NF-e/NFC-e)</option>
                        <option value="pedido_compra">Cupom / Pedido</option>
                        <option value="outro">Outro Comprovante</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Nº Documento / Cupom
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: NFC-e 45209"
                        value={dispenseFiscalNumber}
                        onChange={(e) => setDispenseFiscalNumber(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Valor Total (R$)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          value={dispenseTotalCost}
                          onChange={(e) => setDispenseTotalCost(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white font-bold focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Veículo Selecionado */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">
                    Veículo a Abastecer <span className="text-blue-400">*</span>
                  </label>
                  {dispenseType === 'obra' && (
                    <button
                      type="button"
                      onClick={() => setDispenseShowAllVehicles(!dispenseShowAllVehicles)}
                      className="text-[11px] text-blue-400 hover:text-blue-300 underline cursor-pointer"
                    >
                      {dispenseShowAllVehicles ? 'Filtrar apenas veículos da obra' : 'Mostrar todos os veículos da frota'}
                    </button>
                  )}
                </div>

                <select
                  value={dispenseVehicleId}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Selecione o Veículo...</option>
                  {eligibleVehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.plate} - {v.brand} {v.model} ({v.category || 'Veículo'}) {v.workName ? `[${v.workName}]` : '[Sem obra fixa]'}
                    </option>
                  ))}
                </select>
                {dispenseType === 'obra' && eligibleVehicles.length === 0 && (
                  <p className="text-[11px] text-amber-400">
                    Nenhum veículo vinculado a esta obra ainda. Clique em "Mostrar todos os veículos da frota" para selecionar.
                  </p>
                )}
              </div>

              {/* Combustível, Litros, KM Atual e Data */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Combustível <span className="text-blue-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1 mb-1.5">
                    <button
                      type="button"
                      onClick={() => setDispenseFuelType('Diesel')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        dispenseFuelType.toLowerCase().includes('diesel')
                          ? 'bg-sky-600 text-white shadow-sm ring-1 ring-sky-400 font-black'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-700/60'
                      }`}
                    >
                      🛢️ Diesel
                    </button>
                    <button
                      type="button"
                      onClick={() => setDispenseFuelType('Gasolina')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        dispenseFuelType.toLowerCase().includes('gasolina')
                          ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400 font-black'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-700/60'
                      }`}
                    >
                      ⛽ Gasolina
                    </button>
                  </div>
                  <select
                    value={dispenseFuelType}
                    onChange={(e) => setDispenseFuelType(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {COMMON_FUEL_TYPES.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Quantidade (Litros) <span className="text-blue-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      required
                      placeholder="Ex: 85"
                      value={dispenseLiters}
                      onChange={(e) => setDispenseLiters(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 pr-8 font-bold"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                      L
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Odômetro (KM)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="Ex: 48200"
                    value={dispenseKmOrHours}
                    onChange={(e) => setDispenseKmOrHours(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Data e Hora
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={dispenseDate}
                    onChange={(e) => setDispenseDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Motorista / Operador */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Motorista / Operador Responsável
                </label>
                <input
                  type="text"
                  placeholder="Nome do motorista ou operador que recebeu o combustível"
                  value={dispenseDriverName}
                  onChange={(e) => setDispenseDriverName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Observações (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Abastecimento de rotina, bomba externa ou canteiro"
                  value={dispenseNotes}
                  onChange={(e) => setDispenseNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDispenseModal(false)}
                  className="px-4 py-2 text-sm rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-sm rounded-xl text-white font-semibold shadow-lg transition-all cursor-pointer flex items-center gap-2 ${
                    dispenseType === 'fornecedor_direto'
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-950/40'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-950/40'
                  }`}
                >
                  <Fuel className="w-4 h-4" />
                  {dispenseType === 'fornecedor_direto' ? 'Registrar Abastecimento no Fornecedor' : 'Confirmar Saída do Estoque da Obra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: EXTRATO COMPLETO DE COMBUSTÍVEL DA OBRA */}
      {/* ============================================================ */}
      {selectedWorkForStatement && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-8">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Extrato de Combustível da Obra</h3>
                  <p className="text-xs text-slate-400">
                    {selectedWorkForStatement.name} ({selectedWorkForStatement.city} - {selectedWorkForStatement.state})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedWorkForStatement(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Resumo da Obra */}
              {(() => {
                const b = store.getWorkFuelBalance(selectedWorkForStatement.id);
                return (
                  <div className="grid grid-cols-3 gap-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-center">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Total Recebido</span>
                      <span className="text-base sm:text-lg font-bold text-emerald-400">
                        {b.totalInflowLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
                      </span>
                      <span className="text-[10px] text-slate-500 block">R$ {b.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Total Consumido</span>
                      <span className="text-base sm:text-lg font-bold text-amber-400">
                        {b.totalDispenseLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
                      </span>
                      <span className="text-[10px] text-slate-500 block">{b.dispenseCount} abastecimentos</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Saldo Restante</span>
                      <span className="text-base sm:text-lg font-bold text-white">
                        {b.balanceLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
                      </span>
                      <span className="text-[10px] text-emerald-400 block">Custo Médio: R$ {b.averageCostPerLiter.toFixed(3)}/L</span>
                    </div>
                  </div>
                );
              })()}

              {/* Linha do tempo unificada de entradas e saídas */}
              {(() => {
                const workInflows = fuelInflows
                  .filter(i => i.workId === selectedWorkForStatement.id)
                  .map(i => ({ ...i, itemType: 'inflow' as const, sortDate: i.date }));

                const workDispenses = fuelDispenses
                  .filter(d => d.workId === selectedWorkForStatement.id)
                  .map(d => ({ ...d, itemType: 'dispense' as const, sortDate: d.date }));

                const timeline = [...workInflows, ...workDispenses].sort((a, b) => 
                  new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime()
                );

                if (timeline.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Nenhuma movimentação de combustível registrada nesta obra.
                    </div>
                  );
                }

                return (
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Movimentações Cronológicas ({timeline.length})
                    </h4>
                    {timeline.map((item) => {
                      if (item.itemType === 'inflow') {
                        return (
                          <div 
                            key={item.id} 
                            className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                                <ArrowDownLeft className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-semibold text-white flex items-center gap-2">
                                  <span>Entrada Fiscal ({item.fiscalDocType === 'nf' ? 'NF' : 'PC'}: {item.fiscalDocNumber})</span>
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    {item.date}
                                  </span>
                                </div>
                                <div className="text-slate-400 text-[11px]">
                                  Fornecedor: <strong className="text-slate-300">{item.supplierName}</strong> ({item.fuelType})
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="font-bold text-emerald-400 text-sm">
                                + {Number(item.liters).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
                              </div>
                              <div className="text-[10px] text-slate-400">
                                R$ {Number(item.totalCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        const isDirectSupplier = item.dispenseType === 'fornecedor_direto';
                        return (
                          <div 
                            key={item.id} 
                            className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                              isDirectSupplier
                                ? 'bg-amber-500/10 border-amber-500/20'
                                : 'bg-blue-500/10 border-blue-500/20'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                isDirectSupplier ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                              }`}>
                                {isDirectSupplier ? <Store className="w-4 h-4" /> : <Fuel className="w-4 h-4" />}
                              </div>
                              <div>
                                <div className="font-semibold text-white flex items-center gap-2">
                                  <span>
                                    {isDirectSupplier ? 'Abastecimento em Posto/Fornecedor' : 'Abastecimento da Frota'}: {item.vehiclePlate} ({item.vehicleModel})
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    {item.date ? new Date(item.date).toLocaleDateString('pt-BR') : ''}
                                  </span>
                                </div>
                                <div className="text-slate-400 text-[11px]">
                                  {isDirectSupplier && item.supplierName && (
                                    <span className="text-amber-300 font-medium">Posto: {item.supplierName} • </span>
                                  )}
                                  Motorista: <strong className="text-slate-300">{item.driverName || 'Operador'}</strong>
                                  {item.fuelType && <span className="text-slate-300"> • {item.fuelType}</span>}
                                  {item.currentKmOrHours ? ` • Odômetro: ${item.currentKmOrHours} km` : ''}
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className={`font-bold text-sm ${isDirectSupplier ? 'text-amber-300' : 'text-amber-400'}`}>
                                {isDirectSupplier ? '' : '- '}{Number(item.liters).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {isDirectSupplier ? '(Direto Posto) ' : ''}R$ {Number(item.totalCost || item.calculatedCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                );
              })()}

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setSelectedWorkForStatement(null)}
                  className="px-4 py-2 text-sm rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors cursor-pointer"
                >
                  Fechar Extrato
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default FuelManagement;
