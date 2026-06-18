import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Shield, 
  Clock, 
  Plus, 
  Trash2, 
  Camera, 
  Calendar, 
  Play, 
  Search, 
  ArrowRight, 
  User, 
  ClipboardList, 
  AlertCircle, 
  Sparkles, 
  Check,
  X,
  Pencil
} from 'lucide-react';
import { Equipment, EquipmentUsage, User as UserType, ConstructionWork } from '../types';
import { FleetStore } from '../store/fleetStore';
import { CameraModal } from './CameraModal';

interface EquipmentControlProps {
  currentUser: UserType;
  equipments: Equipment[];
  equipmentUsages: EquipmentUsage[];
  store: FleetStore;
  works: ConstructionWork[];
}

export function EquipmentControl({ currentUser, equipments, equipmentUsages, store, works = [] }: EquipmentControlProps) {
  // Navigation internal tabs
  const [internalTab, setInternalTab] = useState<'operation' | 'history' | 'admin'>('operation');

  // Search filter for history & lists
  const [searchHistory, setSearchHistory] = useState('');
  const [searchEquipment, setSearchEquipment] = useState('');

  // Admin states for registering a new heavy machine
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [type, setType] = useState(''); // Default
  const [initialHours, setInitialHours] = useState<number>(0);
  const [adminWorkId, setAdminWorkId] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Operator check-in states
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [checkInHours, setCheckInHours] = useState<number | ''>('');
  const [selectedWorkId, setSelectedWorkId] = useState('');
  const [origin, setOrigin] = useState('Central de Maquinário (Geral)');
  const [reason, setReason] = useState('');
  const [observations, setObservations] = useState('');
  
  // Custom interactive security checklist states
  const [chkOilLevel, setChkOilLevel] = useState<'no_nivel' | 'completado' | ''>('');
  const [chkRadiatorWater, setChkRadiatorWater] = useState<'no_nivel' | 'completado' | ''>('');
  const [chkRaccorDrain, setChkRaccorDrain] = useState<'ok' | 'nao' | ''>('');
  const [chkTires, setChkTires] = useState<'bom' | 'regular' | 'ruim' | ''>('');
  const [chkFuel, setChkFuel] = useState<'vazio' | '1/2' | '3/4' | 'cheio' | ''>('');
  const [chkBrakes, setChkBrakes] = useState<'bom' | 'ruim' | ''>('');

  const [opError, setOpError] = useState('');
  const [opSuccess, setOpSuccess] = useState('');
  const [showCheckInForm, setShowCheckInForm] = useState(false);

  // Operator check-out states
  const [checkOutHours, setCheckOutHours] = useState<number | ''>('');
  const [checkoutObservations, setCheckoutObservations] = useState('');

  // Camera handling
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraPurpose, setCameraPurpose] = useState<'checkin' | 'checkout'>('checkin');
  const [capturedPhoto, setCapturedPhoto] = useState<string>('');

  // Equipment maintenance states
  const [eqMaintModalType, setEqMaintModalType] = useState<'send' | 'release' | null>(null);
  const [activeEqMaintId, setActiveEqMaintId] = useState<string | null>(null);
  const [eqMaintReasonInput, setEqMaintReasonInput] = useState('');
  const [eqMaintResolutionInput, setEqMaintResolutionInput] = useState('');
  const [eqMaintCostInput, setEqMaintCostInput] = useState('');
  const [eqMaintError, setEqMaintError] = useState('');

  // Default mock hour meter base64 picture
  const DEFAULT_HOR_PHOTO = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%230f172a" /><circle cx="200" cy="140" r="85" fill="none" stroke="%23fbbf24" stroke-width="8" stroke-dasharray="320 80" /><circle cx="200" cy="140" r="10" fill="%23fbbf24" /><rect x="130" y="200" width="140" height="32" rx="6" fill="%231e293b" stroke="%234b5563" stroke-width="2" /><text x="200" y="222" font-family="monospace" font-size="16" fill="%23fbbf24" font-weight="bold" text-anchor="middle">HORIMETRO registro</text></svg>';

  // Pre-fill Km, pre-allocation and hours when equipment changes
  useEffect(() => {
    if (selectedEquipmentId) {
      const mach = equipments.find(e => e.id === selectedEquipmentId);
      if (mach) {
        setCheckInHours(mach.currentHours);
        if (mach.workId) {
          setSelectedWorkId(mach.workId);
          const matchedWork = works.find(w => w.id === mach.workId);
          if (matchedWork) {
            setOrigin(`${matchedWork.name} (${matchedWork.city} - ${matchedWork.state})`);
            setReason(`Operação pesada na obra: ${matchedWork.name}`);
          } else {
            setOrigin('Central de Maquinário (Geral)');
            setReason('');
          }
        } else {
          setSelectedWorkId('');
          setOrigin('Central de Maquinário (Geral)');
          setReason('');
        }
      }
    } else {
      setCheckInHours('');
      setSelectedWorkId('');
      setOrigin('Central de Maquinário (Geral)');
      setReason('');
    }
  }, [selectedEquipmentId, equipments, works]);

  // Active usage for the current logged-in driver/operator
  const activeUsage = equipmentUsages.find(
    (u) => u.operatorId === currentUser.id && u.status === 'active'
  );

  const handleStartEdit = (eq: Equipment) => {
    setEditingEquipment(eq);
    setId(eq.id);
    setName(eq.name);
    setBrand(eq.brand);
    setModel(eq.model);
    setYear(eq.year);
    setType(eq.type);
    setInitialHours(eq.currentHours);
    setAdminWorkId(eq.workId || '');
    setAdminError('');
    setAdminSuccess('');
    setShowAddForm(true);
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingEquipment(null);
    setId('');
    setName('');
    setBrand('');
    setModel('');
    setYear(new Date().getFullYear());
    setType('');
    setInitialHours(0);
    setAdminWorkId('');
    setAdminError('');
    setAdminSuccess('');
  };

  // Handle equipment registration
  const handleRegisterEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setAdminSuccess('');

    if (!id.trim() || !name.trim() || !brand.trim() || !model.trim() || year <= 1900) {
      setAdminError('Todos os campos obrigatórios precisam estar corretos.');
      return;
    }

    const formattedId = id.trim().toUpperCase();
    const matchedWork = adminWorkId ? works.find(w => w.id === adminWorkId) : undefined;

    if (editingEquipment) {
      const updatedEquipment: Equipment = {
        ...editingEquipment,
        id: formattedId,
        name: name.trim(),
        brand: brand.trim(),
        model: model.trim(),
        year: year,
        type: type,
        currentHours: Number(initialHours) || 0,
        workId: matchedWork?.id,
        workName: matchedWork?.name
      };

      store.updateEquipment(updatedEquipment);
      setAdminSuccess('Equipamento atualizado com sucesso!');
      setTimeout(() => {
        handleCancelForm();
      }, 1500);
    } else {
      const res = store.addEquipment({
        id: formattedId,
        name: name.trim(),
        brand: brand.trim(),
        model: model.trim(),
        year: year,
        type: type,
        currentHours: Number(initialHours) || 0,
        workId: matchedWork?.id,
        workName: matchedWork?.name
      });

      if (res.success) {
        setAdminSuccess(res.message);
        setId('');
        setName('');
        setBrand('');
        setModel('');
        setYear(new Date().getFullYear());
        setInitialHours(0);
        setAdminWorkId('');
        setTimeout(() => setAdminSuccess(''), 4000);
      } else {
        setAdminError(res.message);
      }
    }
  };

  // Open equipment maintenance modal
  const handleOpenEqMaintenanceModal = (eqId: string, currentStatus: string) => {
    setEqMaintError('');
    setActiveEqMaintId(eqId);
    if (currentStatus === 'maintenance') {
      setEqMaintModalType('release');
      setEqMaintResolutionInput('');
      setEqMaintCostInput('');
    } else {
      setEqMaintModalType('send');
      setEqMaintReasonInput('');
    }
  };

  const handleSaveEqMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    setEqMaintError('');
    if (!activeEqMaintId) return;

    if (eqMaintModalType === 'send') {
      if (!eqMaintReasonInput.trim()) {
        setEqMaintError('Por favor, informe o motivo da manutenção.');
        return;
      }
      const res = store.sendEquipmentToMaintenance(activeEqMaintId, eqMaintReasonInput.trim());
      if (res.success) {
        setEqMaintModalType(null);
        setActiveEqMaintId(null);
      } else {
        setEqMaintError(res.message);
      }
    } else if (eqMaintModalType === 'release') {
      if (!eqMaintResolutionInput.trim()) {
        setEqMaintError('Por favor, descreva a resolução do motivo de manutenção.');
        return;
      }
      const costNum = Number(eqMaintCostInput.replace(',', '.'));
      if (isNaN(costNum) || costNum < 0) {
        setEqMaintError('Por favor, insira um valor de custo válido (maior ou igual a R$ 0).');
        return;
      }
      const res = store.releaseEquipmentFromMaintenance(activeEqMaintId, eqMaintResolutionInput.trim(), costNum);
      if (res.success) {
        setEqMaintModalType(null);
        setActiveEqMaintId(null);
      } else {
        setEqMaintError(res.message);
      }
    }
  };

  // Delete equipment
  const handleDeleteEquipment = (eqId: string) => {
    if (confirm('Tem certeza que deseja excluir permanentemente este maquinário?')) {
      const res = store.deleteEquipment(eqId);
      if (!res.success) {
        alert(res.message);
      }
    }
  };

  // Trigger camera for check-in usage modal
  const triggerCameraCheckIn = () => {
    setCameraPurpose('checkin');
    setCameraOpen(true);
  };

  // Trigger camera for checkout usage modal
  const triggerCameraCheckOut = () => {
    setCameraPurpose('checkout');
    setCameraOpen(true);
  };

  // Handle camera capture callback
  const handleCapturePhoto = (photoData: string) => {
    setCapturedPhoto(photoData);
  };

  // Handle starting a machinery shift (Check-In)
  const handleEquipmentCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    setOpError('');
    setOpSuccess('');

    if (!selectedEquipmentId) {
      setOpError('Selecione primeiro o maquinário para uso.');
      return;
    }

    const selectedMachine = equipments.find(v => v.id === selectedEquipmentId);
    if (!selectedMachine) {
      setOpError('Maquinário não localizado.');
      return;
    }

    const hoursValue = checkInHours === '' ? selectedMachine.currentHours : Number(checkInHours);

    if (hoursValue < selectedMachine.currentHours) {
      setOpError(`Horímetro informado não pode ser menor que o atual do maquinário (${selectedMachine.currentHours} h).`);
      return;
    }

    if (!reason.trim()) {
      setOpError('Informe a justificativa de uso.');
      return;
    }

    if (!chkOilLevel || !chkRadiatorWater || !chkRaccorDrain || !chkTires || !chkFuel || !chkBrakes) {
      setOpError('Por favor, responda a todos os 6 itens do Checklist de Segurança (níveis, pneus, combustível, freios e filtro) antes de ligar o maquinário.');
      return;
    }

    const photoToSave = capturedPhoto || DEFAULT_HOR_PHOTO;

    // Build the formatted check-list items as requested
    const oilValText = `NIVEL DE OLEO NO NIVEL ( ${chkOilLevel === 'no_nivel' ? 'X' : ' ' } ) FOI COMPLETADO ( ${chkOilLevel === 'completado' ? 'X' : ' ' } )`;
    const waterValText = `AGUA DO RADIADOR NO NIVEL ( ${chkRadiatorWater === 'no_nivel' ? 'X' : ' ' } ) FOI COMPLETADO ( ${chkRadiatorWater === 'completado' ? 'X' : ' ' } )`;
    const raccorValText = `DRENAGEM FILTRO RACCOR  OK ( ${chkRaccorDrain === 'ok' ? 'X' : ' ' } ) NÃO ( ${chkRaccorDrain === 'nao' ? 'X' : ' ' } )`;
    const tiresValText = `PNEUS BOM ( ${chkTires === 'bom' ? 'X' : ' ' } ) REGULAR ( ${chkTires === 'regular' ? 'X' : ' ' } ) RUIM ( ${chkTires === 'ruim' ? 'X' : ' ' } )`;
    const fuelValText = `COMBUSTIVEL  VAZIO( ${chkFuel === 'vazio' ? 'X' : ' ' } ) 1/2  ( ${chkFuel === '1/2' ? 'X' : ' ' } ) 3/4 ( ${chkFuel === '3/4' ? 'X' : ' ' } ) CHEIO ( ${chkFuel === 'cheio' ? 'X' : ' ' } )`;
    const brakesValText = `FREIOS BOM ( ${chkBrakes === 'bom' ? 'X' : ' ' } ) RUIM ( ${chkBrakes === 'ruim' ? 'X' : ' ' } )`;

    const finalObservations = [
      '📋 CHECKLIST DE SEGURANÇA:',
      oilValText,
      waterValText,
      raccorValText,
      tiresValText,
      fuelValText,
      brakesValText,
      observations.trim() ? `Observações Adicionais: ${observations.trim()}` : ''
    ].filter(Boolean).join('\n');

    const res = store.checkInEquipment(selectedEquipmentId, {
      hours: hoursValue,
      origin: origin.trim(),
      reason: reason.trim(),
      observations: finalObservations,
      photo: photoToSave
    }, selectedWorkId || undefined);

    if (res.success) {
      setOpSuccess(res.message);
      // Clean up operator check-in forms
      setSelectedEquipmentId('');
      setCheckInHours('');
      setSelectedWorkId('');
      setOrigin('Central de Maquinário (Geral)');
      setReason('');
      setObservations('');
      setCapturedPhoto('');
      
      // Reset checklist states
      setChkOilLevel('');
      setChkRadiatorWater('');
      setChkRaccorDrain('');
      setChkTires('');
      setChkFuel('');
      setChkBrakes('');

      setShowCheckInForm(false);
      setTimeout(() => setOpSuccess(''), 5000);
    } else {
      setOpError(res.message);
    }
  };

  // Handle checkout of operated machinery
  const handleEquipmentCheckOut = (e: React.FormEvent) => {
    e.preventDefault();
    setOpError('');
    setOpSuccess('');

    if (!activeUsage) {
      setOpError('Você não possui registro de maquinário ativo.');
      return;
    }

    if (checkOutHours === '' || Number(checkOutHours) < activeUsage.checkIn.hours) {
      setOpError(
        `O horímetro final deve ser registrado e não pode ser menor que o de entrada (${activeUsage.checkIn.hours} h).`
      );
      return;
    }

    const photoToSave = capturedPhoto || DEFAULT_HOR_PHOTO;

    const res = store.checkOutEquipment(activeUsage.id, {
      hours: Number(checkOutHours),
      observations: checkoutObservations.trim() || 'Operação de maquinário concluída sem avarias detectadas.',
      photo: photoToSave
    });

    if (res.success) {
      setOpSuccess(res.message);
      setCheckOutHours('');
      setCheckoutObservations('');
      setCapturedPhoto('');
      setTimeout(() => setOpSuccess(''), 5000);
    } else {
      setOpError(res.message);
    }
  };

  // Delete usage history row
  const handleDeleteUsageRow = (usageId: string) => {
    if (confirm('Deseja excluir permanentemente este histórico de uso de maquinário?')) {
      store.deleteEquipmentUsage(usageId);
    }
  };

  // Filtered equipment list for active check-in selection
  const availableToOperate = equipments.filter((e) => e.status === 'available' && (currentUser.role === 'admin' || currentUser.authorizedAssetIds?.includes(e.id)));

  // Filtered lists shown in Admin Grid based on search
  const filteredEquipmentsForAdmin = equipments.filter(
    (e) =>
      e.name.toLowerCase().includes(searchEquipment.toLowerCase()) ||
      e.id.toLowerCase().includes(searchEquipment.toLowerCase()) ||
      e.type.toLowerCase().includes(searchEquipment.toLowerCase()) ||
      e.brand.toLowerCase().includes(searchEquipment.toLowerCase())
  );

  // Filtered history listings
  const filteredHistory = equipmentUsages.filter(
    (u) =>
      u.equipmentNameModel.toLowerCase().includes(searchHistory.toLowerCase()) ||
      u.operatorName.toLowerCase().includes(searchHistory.toLowerCase()) ||
      (u.checkIn.origin || '').toLowerCase().includes(searchHistory.toLowerCase()) ||
      u.checkIn.reason.toLowerCase().includes(searchHistory.toLowerCase())
  );

  return (
    <div id="equipment_module_view" className="space-y-6">
      
      {/* Module Title Billboard */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚜</span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight font-display">Controle de Maquinário Pesado</h2>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Registre turnos de operação para Retroescavadeiras, Caminhões Munck e tratores controlados via <span className="font-bold underline text-amber-600">Horímetro h</span>.
          </p>
        </div>
        <div className="bg-amber-50/50 border border-amber-200/60 text-amber-800 px-4 py-2 rounded-2xl flex items-center gap-2 font-mono text-xs font-bold leading-none select-none shrink-0">
          <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
          {equipments.length} MAQUINÁRIOS CADASTRADOS
        </div>
      </div>

      {/* Main Internal Module Toolbar Navigation */}
      <div className="flex flex-wrap bg-white p-1.5 rounded-2xl border border-slate-200 gap-1 shadow-xs">
        <button
          onClick={() => {
            setInternalTab('operation');
            setOpError('');
          }}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            internalTab === 'operation'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          Operação & Check-in
        </button>

        <button
          onClick={() => {
            setInternalTab('history');
            setOpError('');
          }}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            internalTab === 'history'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          Histórico de Uso (Maquinários)
        </button>

        {currentUser.role === 'admin' && (
          <button
            onClick={() => {
              setInternalTab('admin');
              setOpError('');
            }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              internalTab === 'admin'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Gestão de Frota Pesada
          </button>
        )}
      </div>

      {/* Global success notifications inside operational view */}
      {opSuccess && (
        <div className="bg-[#EEF2FF] border border-blue-200 text-blue-900 rounded-2xl p-4 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
          {opSuccess}
        </div>
      )}

      {/* ==================== TAB 1: OPERAÇÃO (DRIVER / OPERATOR CONTROLS) ==================== */}
      {internalTab === 'operation' && (
        <div className="space-y-6">
          {activeUsage ? (
            /* ACTIVE MACHINE DUTY (CHECK-OUT RECLAIM FORM) */
            <div className="bg-white border-2 border-amber-400 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-400 animate-pulse" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-400/10 text-amber-700 border border-amber-400/25 animate-pulse">
                    🚜 OPERAÇÃO ATIVA - EM TURNO
                  </span>
                  <h3 className="text-lg font-bold text-slate-800 tracking-tight font-display mt-1">
                    {activeUsage.equipmentNameModel}
                  </h3>
                </div>
                <div className="text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Operando por: <strong className="text-slate-700 font-bold">{activeUsage.operatorName}</strong>
                </div>
              </div>

              {/* Status Table Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#F8FAFC] border border-slate-150 p-5 rounded-2xl">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Localização / Origem</span>
                  <span className="text-sm font-semibold text-slate-700 block mt-1">{activeUsage.checkIn.origin || 'Central de Maquinários'}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Atividade Informada</span>
                  <span className="text-sm font-semibold text-slate-700">{activeUsage.checkIn.reason}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Horímetro Inicial</span>
                  <span className="text-sm font-bold text-amber-600 font-mono flex items-center gap-1">
                    <Clock className="w-4 h-4 text-amber-500" />
                    {activeUsage.checkIn.hours.toFixed(1)} h
                  </span>
                </div>
              </div>

              {/* CheckOut Input Sheet */}
              <form onSubmit={handleEquipmentCheckOut} className="space-y-6">
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 font-display">Concluir Turno e Registrar Horímetro Final</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        Horímetro Final no Painel (h) *
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder={`Mínimo sugerido: ${activeUsage.checkIn.hours.toFixed(1)} h`}
                        value={checkOutHours}
                        onChange={(e) => setCheckOutHours(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                        className="w-full text-sm font-mono font-bold bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-amber-700"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        Comprovante Ocorrência / Foto Horímetro
                      </label>
                      <div className="flex gap-2">
                        {capturedPhoto ? (
                          <div className="relative w-11 h-11 rounded-lg border border-emerald-400 overflow-hidden shrink-0">
                            <img src={capturedPhoto} alt="Horímetro" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setCapturedPhoto('')}
                              className="absolute inset-0 bg-black/60 flex items-center justify-center text-[9px] text-white font-bold hover:bg-black/80 font-mono"
                            >
                              EXCLUIR
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={triggerCameraCheckOut}
                            className="h-11 px-4 border border-slate-200 rounded-xl flex items-center justify-center gap-1.5 text-xs text-slate-650 font-bold bg-slate-50 hover:bg-slate-100/80 active:scale-95 transition-all text-left cursor-pointer shrink-0"
                          >
                            <Camera className="w-4 h-4 text-slate-500" />
                            Fotografar Painel
                          </button>
                        )}
                        <span className="text-[10px] text-slate-400 leading-snug self-center max-w-xs">
                          {capturedPhoto ? 'Foto capturada com sucesso!' : 'Tire uma foto opcional de comprovação para auditoria.'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Observações de Encerramento (Nível de combustível, avarias registradas, etc.)
                    </label>
                    <textarea
                      placeholder="Identifique problemas ou anote observações do ciclo de trabalho do maquinário..."
                      value={checkoutObservations}
                      onChange={(e) => setCheckoutObservations(e.target.value)}
                      className="w-full text-sm bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-2 outline-none min-h-[70px] resize-none transition-all"
                    />
                  </div>
                </div>

                {opError && (
                  <div className="bg-red-50 border border-red-150 p-3 rounded-xl text-xs font-semibold text-red-650 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-red-550 shrink-0" />
                    {opError}
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-3">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-sm rounded-xl flex items-center gap-2 cursor-pointer text-sm transition-all active:scale-95 select-none"
                  >
                    <Check className="w-4 h-4" />
                    Encerrar Operação e Liberar Maquinário
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* CHECK-IN LAUNCH PAD (NO ACTIVE DUTY ON FILE) */
            <div className="space-y-6">
              
              {/* Launcher Header Form Toggle */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-xs">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl mx-auto flex items-center justify-center text-2xl shadow-inner text-amber-500">
                  ⚡
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="font-extrabold text-slate-900 tracking-tight text-md font-display">Sem Operação de Maquinário Ativa</h3>
                  <p className="text-xs text-slate-550 leading-relaxed font-semibold">
                    Antes de ligar o motor da retroescavadeira ou começar os içamentos do Caminhão Munck, realize o check-in obrigatório registrando o Horímetro inicial da máquina.
                  </p>
                </div>

                {!showCheckInForm ? (
                  <button
                    onClick={() => {
                      setShowCheckInForm(true);
                      setOpError('');
                    }}
                    className="inline-flex items-center gap-1.5 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer text-xs"
                  >
                    <Play className="w-4 h-4" />
                    Iniciar Novo Check-in de Maquinário
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowCheckInForm(false);
                      setOpError('');
                    }}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer text-xs"
                  >
                    <X className="w-4 h-4" />
                    Cancelar Check-in
                  </button>
                )}
              </div>

              {/* DYNAMIC CHECK-IN SLIDER FORM */}
              {showCheckInForm && (
                <form 
                  onSubmit={handleEquipmentCheckIn} 
                  className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm animate-fade-in space-y-6"
                >
                  <h3 className="font-bold text-slate-950 text-md flex items-center gap-2 border-b border-slate-100 pb-3 font-display">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block animate-pulse"></span>
                    Iniciar Operação de Equipamento Pesado
                  </h3>

                  {/* Form fields layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Machine Selector */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        Selecione o Equipamento *
                      </label>
                      <select
                        value={selectedEquipmentId}
                        onChange={(e) => {
                          setSelectedEquipmentId(e.target.value);
                          const mach = equipments.find(m => m.id === e.target.value);
                          setCheckInHours(mach ? mach.currentHours : '');
                        }}
                        className="w-full text-sm bg-[#F8FAFC] border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-2.5 outline-none transition-all font-semibold text-slate-700"
                        required
                      >
                        <option value="">-- Escolha um maquinário disponível --</option>
                        {availableToOperate.map((mach) => (
                          <option key={mach.id} value={mach.id}>
                            {mach.brand} {mach.model} [{mach.id}] (Horímetro: {mach.currentHours.toFixed(1)} h)
                          </option>
                        ))}
                      </select>
                      {availableToOperate.length === 0 && (
                        <p className="text-[10px] text-red-500 font-bold">
                          ⚠️ Não há maquinarias disponíveis para operação no pátio atualmente.
                        </p>
                      )}
                    </div>

                    {/* Checkin Horímetro */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        Confirmar Horímetro Inicial (h) *
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Ex: 1240.5"
                        value={checkInHours}
                        onChange={(e) => setCheckInHours(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                        className="w-full text-sm font-mono font-bold bg-[#F8FAFC] border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-2.5 outline-none transition-all text-amber-700"
                        required
                      />
                      <span className="text-[9px] text-slate-400">
                        O horímetro deve ser igual ou superior ao último registro cadastrado da máquina.
                      </span>
                    </div>

                    {/* Obras Allocation Select Dropdown */}
                    <div className="space-y-1.5 md:col-span-2 bg-amber-50/45 border border-amber-100 p-4 rounded-xl text-left mb-1">
                      <label className="block text-[10px] uppercase font-mono font-black tracking-wider text-amber-850 mb-1">
                        Alocação de Obra (Definida pelo Admin)
                      </label>
                      
                      {selectedEquipmentId && (
                        (() => {
                          const eq = equipments.find(e => e.id === selectedEquipmentId);
                          if (eq && eq.workId) {
                            return (
                              <div className="bg-amber-100/50 border border-amber-200 p-3 rounded-lg text-xs mb-2">
                                <p className="font-extrabold text-amber-950 flex items-center gap-1.5">🏗️ Obra Pré-alocada pelo Gestor:</p>
                                <p className="font-bold text-slate-850 text-[13px] mt-1">{eq.workName}</p>
                                <p className="text-[10px] text-slate-500 font-medium mt-1 leading-normal">Esta máquina está sob alocação dedicada a esta obra. O faturamento e horímetro de trabalho serão creditados nela.</p>
                              </div>
                            );
                          } else if (eq) {
                            return (
                              <div className="bg-slate-100/80 border border-slate-200 p-3 rounded-lg text-xs mb-2">
                                <p className="font-extrabold text-slate-800 flex items-center gap-1.5">⚙️ Alocação Geral (Sem obra dedicada):</p>
                                <p className="font-bold text-slate-800 text-[13px] mt-1">Uso Operacional Geral</p>
                                <p className="text-[10px] text-slate-500 font-medium mt-1 leading-normal">Não há obra específica associada a este maquinário pelo Admin. Ele rodará sob fins/atividades Gerais.</p>
                              </div>
                            );
                          }
                          return null;
                        })()
                      )}

                      <select
                        disabled={true}
                        id="operator_work_select"
                        value={selectedWorkId}
                        className="w-full px-3 py-2.5 text-xs bg-slate-100 border border-slate-200 rounded-xl outline-none font-bold text-slate-500 cursor-not-allowed"
                      >
                        <option value="">⚙️ Geral (Sem alocação única)</option>
                        {works.map(w => (
                          <option key={w.id} value={w.id}>
                            🏗️ {w.name} ({w.city} - {w.state})
                          </option>
                        ))}
                      </select>
                      <p className="text-[9px] text-slate-400 mt-1 font-bold leading-normal uppercase">
                        🔒 Bloqueado: A alocação de maquinários é controlada exclusivamente pelo Administrador na Central de Equipamentos.
                      </p>
                    </div>

                    {/* Origin for Equipment */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        Origem da Operação *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Obra Centro"
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        className="w-full text-sm bg-slate-100 border border-slate-200 outline-none rounded-xl px-4 py-2.5 font-semibold text-slate-600"
                        required
                      />
                      <p className="text-[9px] text-slate-400">Ponto de início de operação pré-alocado, ou ajustável se Geral.</p>
                    </div>

                    {/* Reason de Uso */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        Atividade / Finalidade de Uso *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Escavação para encanamento pluvial ou Transporte de postes"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full text-sm bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-2.5 outline-none transition-all font-medium"
                        required
                      />
                    </div>
                  </div>

                  {/* Photo checklist block */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Comprovante Inicial / Foto do Painel
                      </label>
                      <div className="flex gap-2.5">
                        {capturedPhoto ? (
                          <div className="relative w-12 h-12 rounded-xl border border-emerald-400 overflow-hidden shrink-0 shadow-sm animate-fade-in">
                            <img src={capturedPhoto} alt="Horímetro" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setCapturedPhoto('')}
                              className="absolute inset-0 bg-black/70 flex items-center justify-center text-[9px] text-white font-bold hover:bg-black/90 font-mono transition-colors"
                            >
                              EXCLUIR
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={triggerCameraCheckIn}
                            className="h-12 px-4 border border-slate-200 rounded-xl flex items-center justify-center gap-1.5 text-xs text-slate-650 font-bold bg-slate-50 hover:bg-slate-100/80 active:scale-95 transition-all text-left cursor-pointer shrink-0"
                          >
                            <Camera className="w-4 h-4 text-slate-500" />
                            Fotografar Painel
                          </button>
                        )}
                        <span className="text-[10px] text-slate-400 leading-snug self-center max-w-sm">
                          Capture uma foto real ou fictícia do painel com o valor correspondente do Horímetro.
                        </span>
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-4 pt-2 border-t border-slate-100">
                      <span className="text-[11px] uppercase font-mono font-extrabold tracking-wider text-amber-700 flex items-center gap-1.5">
                        📋 Checklist Inicial de Segurança Obrigatório *
                      </span>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* 1. Nível de Óleo */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                          <span className="block text-[11px] font-bold text-slate-700">Nível de Óleo *</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setChkOilLevel('no_nivel')}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                chkOilLevel === 'no_nivel'
                                  ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              No Nível
                            </button>
                            <button
                              type="button"
                              onClick={() => setChkOilLevel('completado')}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                chkOilLevel === 'completado'
                                  ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              Completado
                            </button>
                          </div>
                        </div>

                        {/* 2. Água do Radiador */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                          <span className="block text-[11px] font-bold text-slate-700">Água do Radiador *</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setChkRadiatorWater('no_nivel')}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                chkRadiatorWater === 'no_nivel'
                                  ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              No Nível
                            </button>
                            <button
                              type="button"
                              onClick={() => setChkRadiatorWater('completado')}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                chkRadiatorWater === 'completado'
                                  ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              Completado
                            </button>
                          </div>
                        </div>

                        {/* 3. Drenagem Filtro Raccor */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                          <span className="block text-[11px] font-bold text-slate-700">Drenagem Filtro Raccor *</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setChkRaccorDrain('ok')}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                chkRaccorDrain === 'ok'
                                  ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              OK
                            </button>
                            <button
                              type="button"
                              onClick={() => setChkRaccorDrain('nao')}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                chkRaccorDrain === 'nao'
                                  ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              NÃO
                            </button>
                          </div>
                        </div>

                        {/* 4. Pneus */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                          <span className="block text-[11px] font-bold text-slate-700">Estado dos Pneus *</span>
                          <div className="flex gap-1.5">
                            {['bom', 'regular', 'ruim'].map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => setChkTires(status as any)}
                                className={`flex-1 py-1.5 text-[10px] font-extrabold uppercase rounded-lg border transition-all cursor-pointer ${
                                  chkTires === status
                                    ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 5. Combustível */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                          <span className="block text-[11px] font-bold text-slate-700">Combustível *</span>
                          <div className="flex gap-1">
                            {['vazio', '1/2', '3/4', 'cheio'].map((lvl) => (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => setChkFuel(lvl as any)}
                                className={`flex-1 py-1.5 text-[9px] font-extrabold uppercase rounded-lg border transition-all cursor-pointer ${
                                  chkFuel === lvl
                                    ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-100'
                                }`}
                              >
                                {lvl === 'vazio' ? 'Vazio' : lvl === 'cheio' ? 'Cheio' : lvl}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 6. Freios */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                          <span className="block text-[11px] font-bold text-slate-700">Freios *</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setChkBrakes('bom')}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                chkBrakes === 'bom'
                                  ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              BOM
                            </button>
                            <button
                              type="button"
                              onClick={() => setChkBrakes('ruim')}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                chkBrakes === 'ruim'
                                  ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              RUIM
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2">
                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                          Observações Adicionais / Justificativa Escrita (Opcional)
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: cabine livre, ar condicionado funcionando, etc..."
                          value={observations}
                          onChange={(e) => setObservations(e.target.value)}
                          className="w-full text-sm bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-2.5 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {opError && (
                    <div className="bg-red-50 border border-red-150 p-3 rounded-xl text-xs font-semibold text-red-650 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 text-red-550 shrink-0" />
                      {opError}
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="submit"
                      className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-xs text-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Registrar Entrada e Ligar Maquinário
                    </button>
                  </div>
                </form>
              )}

              {/* Available Machinery Grid to read quickly */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Disponibilidade Local de Maquinários</h4>
                {equipments.filter((mach) => currentUser.role === 'admin' || currentUser.role === 'gerencial' || currentUser.authorizedAssetIds?.includes(mach.id)).length === 0 ? (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-500 text-xs font-bold">
                    Nenhum maquinário com permissão de acesso vinculado à sua conta.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {equipments
                      .filter((mach) => currentUser.role === 'admin' || currentUser.role === 'gerencial' || currentUser.authorizedAssetIds?.includes(mach.id))
                      .map((mach) => (
                        <div 
                          key={mach.id}
                          className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-2xs hover:shadow-xs transition-shadow"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">🚜</span>
                              <div>
                                <span className="text-xs font-mono font-bold text-slate-450 uppercase">{mach.type}</span>
                                <h5 className="text-sm font-bold text-slate-900 leading-tight">{mach.brand} {mach.model}</h5>
                              </div>
                            </div>
                            <div className="flex gap-4 pt-1 font-mono text-[10px] text-slate-400 font-bold uppercase">
                              <span>PREFIXO: <strong className="text-slate-650 font-mono">{mach.id}</strong></span>
                              <span>•</span>
                              <span>HORAS: <strong className="text-amber-600 font-mono">{mach.currentHours.toFixed(1)} h</strong></span>
                            </div>
                          </div>

                          <div>
                            {mach.status === 'available' ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-700 font-mono">
                                DISPONÍVEL
                              </span>
                            ) : mach.status === 'in_use' ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-700 font-mono animate-pulse">
                                EM OPERAÇÃO
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold bg-red-500/10 text-red-700 font-mono">
                                REPARO
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 2: HISTÓRICO DE USO DE MAQUINÁRIOS ==================== */}
      {internalTab === 'history' && (
        <div className="space-y-4">
          
          {/* History Search Tools */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 flex flex-col md:flex-row gap-3 shadow-2xs">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar operações por modelo de máquina, prefixo ou operador..."
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 text-sm bg-[#F8FAFC] hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl outline-none transition-all font-medium"
              />
            </div>
          </div>

          {/* History Grid Cards */}
          {filteredHistory.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-400 space-y-2">
              <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold">Nenhum registro de maquinário localizado</p>
              <p className="text-xs text-slate-400">Tente modificar seu termo de busca ou realize novos turnos de trabalho.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {filteredHistory.map((row) => (
                <div 
                  key={row.id}
                  className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4 animate-fade-in hover:border-slate-350 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🚜</span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">{row.equipmentNameModel}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[9px] font-bold text-slate-400 uppercase">
                          <span>REG: <strong className="text-slate-650 font-mono">{row.id}</strong></span>
                          <span>•</span>
                          <span>Data: {new Date(row.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {row.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-700 font-mono animate-pulse border border-amber-300/40">
                          EM OPERAÇÃO ATIVA
                        </span>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Tempo Total Faturado</span>
                          <span className="text-xs font-extrabold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/15 font-mono">
                            {row.hoursWorked ? `${row.hoursWorked.toFixed(1)} Horas` : '0 h'}
                          </span>
                        </div>
                      )}

                      {currentUser.role === 'admin' && (
                        <button
                          onClick={() => handleDeleteUsageRow(row.id)}
                          title="Excluir Registro"
                          className="p-1.5 bg-red-10 px-2 hover:bg-red-50 hover:text-red-650 rounded-lg text-slate-400 border border-transparent hover:border-red-200 transition-colors cursor-pointer select-none"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Transaction Steps Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                    {/* Check In Panel */}
                    <div className="bg-[#F8FAFC] border border-slate-150 rounded-2xl p-4 space-y-3.5">
                      <div className="flex items-center justify-between border-b border-slate-200/50 pb-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Entrada (Check-In)</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-200/40 px-2 rounded font-bold">
                          {new Date(row.checkIn.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div 
                          className="w-16 h-12 bg-slate-200 border border-slate-300 rounded overflow-hidden shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => alert(`Foto Comprovada do painel inicial de ${row.equipmentId}`)}
                          title="Clique para obter foto ampliada"
                        >
                          <img src={row.checkIn.photo || DEFAULT_HOR_PHOTO} alt="Horímetro Inicial" className="w-full h-full object-cover" />
                        </div>
                        <div className="space-y-1 overflow-hidden leading-snug">
                          <div className="text-[11px] font-bold text-slate-650 space-y-0.5 mb-1 bg-white border border-slate-200/50 p-1.5 rounded-lg">
                            <p className="flex items-center gap-1.5"><strong className="font-bold text-slate-400 font-mono uppercase text-[9px]">Local / Origem:</strong> <span className="text-slate-700">{row.checkIn.origin || 'Central Maquinários'}</span></p>
                          </div>
                          <p className="font-bold text-slate-650">Motivo: <span className="text-slate-850 font-normal">{row.checkIn.reason}</span></p>
                          <p className="text-[10px] font-bold text-amber-600 font-mono font-medium">Horímetro Inicial: {row.checkIn.hours.toFixed(1)} h</p>
                          {row.checkIn.observations && (
                            <div className="text-[10px] text-slate-600 bg-slate-50 border border-slate-150/60 p-2 rounded-xl whitespace-pre-wrap break-words font-sans max-h-36 overflow-y-auto font-medium mt-1 leading-relaxed">
                              {row.checkIn.observations}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-450 border-t border-slate-200/30 pt-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span>Operador Responsável: <strong className="text-slate-700 font-bold">{row.operatorName}</strong> ({row.operatorEmail})</span>
                      </div>
                    </div>

                    {/* Check Out Panel */}
                    <div className="bg-[#F8FAFC] border border-slate-150 rounded-2xl p-4 space-y-3.5">
                      <div className="flex items-center justify-between border-b border-slate-200/50 pb-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Encerramento (Check-Out)</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-200/40 px-2 rounded font-bold">
                          {row.checkOut ? new Date(row.checkOut.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </span>
                      </div>

                      {row.checkOut ? (
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-16 h-12 bg-slate-200 border border-slate-300 rounded overflow-hidden shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => alert(`Foto Comprovante de checkout: ${row.equipmentId}`)}
                            title="Clique para obter foto ampliada"
                          >
                            <img src={row.checkOut.photo || DEFAULT_HOR_PHOTO} alt="Horímetro Final" className="w-full h-full object-cover" />
                          </div>
                          <div className="space-y-1 overflow-hidden leading-snug">
                            <p className="text-[10px] font-bold text-amber-600 font-mono">Horímetro Final: {row.checkOut.hours.toFixed(1)} h</p>
                            <p className="text-[11px] text-slate-650 font-bold">Consumo de Turno: <strong className="text-slate-800 font-bold">{(row.checkOut.hours - row.checkIn.hours).toFixed(1)} Horas</strong></p>
                            {row.checkOut.observations && (
                              <p className="text-[10px] text-slate-500 italic mt-0.5" title={row.checkOut.observations}>
                                Obs: "{row.checkOut.observations}"
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center pt-2">
                          <span className="text-xs text-slate-400 flex items-center gap-1.5 font-bold italic animate-pulse">
                            <Clock className="w-4 h-4 text-amber-500" />
                            Aguardando conclusão do operador...
                          </span>
                        </div>
                      )}
                      
                      {row.checkOut && (
                        <div className="text-[10px] text-emerald-600 font-bold border-t border-slate-200/30 pt-1.5 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Turno fechado com integridade de dados por horímetros correlatos</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 3: ADMIN MAQUINÁRIO MANAGER (ADMINS ONLY) ==================== */}
      {internalTab === 'admin' && currentUser.role === 'admin' && (
        <div className="space-y-6">
          
          {/* Header trigger Form */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">
                {editingEquipment ? 'Editar Maquinário' : 'Cadastrar Novo Maquinário'}
              </h3>
              <p className="text-xs text-slate-500">
                {editingEquipment ? 'Modifique os detalhes, horímetros e alocação do equipamento selecionado.' : 'Insira escavadeiras, geradores móveis e caminhões de elevação que possuem horímetros.'}
              </p>
            </div>
            <button
              onClick={() => {
                if (showAddForm) {
                  handleCancelForm();
                } else {
                  setShowAddForm(true);
                  setAdminError('');
                  setAdminSuccess('');
                }
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {showAddForm ? 'Fechar Formulário' : 'Novo Maquinário'}
            </button>
          </div>

          {/* ADD NEW MACHINE FORM */}
          {showAddForm && (
            <form 
              onSubmit={handleRegisterEquipment}
              className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm animate-fade-in space-y-6"
            >
              <h3 className="font-bold text-slate-950 text-md flex items-center gap-2 border-b border-slate-100 pb-3 font-display">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 block animate-pulse"></span>
                {editingEquipment ? `Editar Detalhes do Maquinário: ${editingEquipment.id}` : 'Novo Maquinário Pesado da Garagem'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                {/* ID / Prefix */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Prefixo/Serial ID *</label>
                  <input
                    type="text"
                    placeholder="Ex: RET-01 ou MNK-10"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    className="w-full text-sm bg-[#F8FAFC] focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 outline-none transition-all font-mono font-bold"
                    required
                  />
                </div>

                {/* Descrição nome */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Nome Descritivo *</label>
                  <input
                    type="text"
                    placeholder="Ex: Retroescavadeira CAT 416"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-sm bg-[#F8FAFC] focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 outline-none transition-all font-medium"
                    required
                  />
                </div>

                {/* Brand */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Marca Fabricante *</label>
                  <input
                    type="text"
                    placeholder="Ex: Caterpillar, Case, JCB"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full text-sm bg-[#F8FAFC] focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 outline-none transition-all font-medium"
                    required
                  />
                </div>

                {/* Model */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Modelo *</label>
                  <input
                    type="text"
                    placeholder="Ex: Case 580M"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full text-sm bg-[#F8FAFC] focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 outline-none transition-all font-medium"
                    required
                  />
                </div>

                {/* Year */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Ano de Fabricação *</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full text-sm bg-[#F8FAFC] focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 outline-none transition-all font-medium"
                    required
                  />
                </div>

                {/* Type Selection */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Tipo de Maquinário *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full text-sm bg-[#F8FAFC] border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 outline-none transition-all font-semibold"
                    required
                  >
                    <option value="" disabled>Selecione um tipo de maquinário</option>
                    {store.equipmentTypes.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Horómetro Inicial */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Horímetro Inicial (h) *</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 0.0 h ou 1450.3"
                    value={initialHours}
                    onChange={(e) => setInitialHours(Math.max(0, Number(e.target.value)))}
                    className="w-full text-sm bg-[#F8FAFC] focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 outline-none transition-all font-mono"
                    required
                  />
                </div>

                {/* Initial Allocation */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Alocação de Obra Inicial *</label>
                  <select
                    value={adminWorkId}
                    onChange={(e) => setAdminWorkId(e.target.value)}
                    className="w-full text-sm bg-[#F8FAFC] focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 outline-none transition-all font-semibold"
                  >
                    <option value="">⚙️ Geral (Sem alocação única)</option>
                    {works.filter(w => w.status === 'active').map(w => (
                      <option key={w.id} value={w.id}>
                        🏗️ {w.name} ({w.city} - {w.state})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Define a obra vinculada a este equipamento para controle de horímetro, ou escolha Geral.</p>
                </div>
              </div>

              {adminError && (
                <div className="bg-red-50 border border-red-150 p-3 rounded-xl text-xs font-semibold text-red-650 flex items-center gap-1 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-red-550 shrink-0" />
                  {adminError}
                </div>
              )}

              {adminSuccess && (
                <div className="bg-[#EEF2FF] border border-blue-150 p-3 rounded-xl text-xs font-semibold text-blue-900 flex items-center gap-1 animate-fade-in font-display">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" />
                  {adminSuccess}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                {editingEquipment && (
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {editingEquipment ? 'Salvar Alterações' : 'Confirmar Cadastro de Maquinário'}
                </button>
              </div>
            </form>
          )}

          {/* Grid Filters and search machine */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 flex flex-col md:flex-row gap-3 shadow-2xs">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar maquinário cadastrado por marca, modelo, tipo..."
                value={searchEquipment}
                onChange={(e) => setSearchEquipment(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 text-sm bg-[#F8FAFC] hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all font-medium"
              />
            </div>
          </div>

          {/* Equipment Admin Control List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {filteredEquipmentsForAdmin.map((mach) => (
              <div 
                key={mach.id}
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-4 hover:border-slate-350 transition-colors"
              >
                <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🚜</span>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">{mach.type}</span>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">{mach.brand} {mach.model}</h4>
                    </div>
                  </div>
                  
                  {mach.status === 'available' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/15 text-emerald-700 font-mono">
                      ● LIVRE
                    </span>
                  ) : mach.status === 'in_use' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/15 text-amber-700 font-mono">
                      ● EM OPERAÇÃO
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-red-500/15 text-red-700 font-mono">
                      ● MANUTENÇÃO
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 font-mono text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Prefixo ID:</span>
                    <strong className="text-slate-800 font-bold">{mach.id}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Fabricação:</span>
                    <strong className="text-slate-800 font-bold">{mach.year}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Horas Totais:</span>
                    <strong className="text-amber-600 font-bold">{mach.currentHours.toFixed(1)} h</strong>
                  </div>
                </div>

                {/* Administrative Work Allocation Selector */}
                <div className="mt-3 bg-blue-50/45 border border-blue-100 p-3 rounded-xl text-left shadow-2xs">
                  <label className="block text-[9px] uppercase font-mono font-black tracking-wider text-blue-950">
                    Alocação de Obra (Admin)
                  </label>
                  <select
                    value={mach.workId || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      store.allocateEquipmentToWork(mach.id, val || undefined);
                    }}
                    className="w-full mt-1.5 px-3 py-1.5 text-[11px] bg-white border border-slate-200 focus:border-blue-500 rounded-lg outline-none font-semibold text-slate-700 cursor-pointer"
                  >
                    <option value="">⚙️ Geral (Sem alocação única)</option>
                    {works.filter(w => w.status === 'active').map(w => (
                      <option key={w.id} value={w.id}>
                        🏗️ {w.name} ({w.city} - {w.state})
                      </option>
                    ))}
                  </select>
                  <p className="text-[8.5px] text-slate-450 mt-1 font-medium leading-tight">
                    Define a obra padrão que faturará o horímetro deste maquinário.
                  </p>
                </div>

                  {/* Active Maintenance Details */}
                  {mach.status === 'maintenance' && mach.maintenanceReason && (
                    <div className="bg-amber-50/70 border border-amber-200/60 p-3 rounded-xl mt-3 space-y-1">
                      <span className="block text-[9px] uppercase font-bold text-amber-800 tracking-wider">Motivo da Manutenção</span>
                      <p className="text-xs text-slate-750 font-semibold italic">"{mach.maintenanceReason}"</p>
                      {mach.maintenanceSentAt && (
                        <span className="text-[9px] text-amber-600 font-mono font-medium">
                          Enviado em: {new Date(mach.maintenanceSentAt).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Maintenance Records History List */}
                  {mach.maintenanceHistory && mach.maintenanceHistory.length > 0 && (
                    <div className="mt-3 bg-slate-50 border border-slate-150 p-3 rounded-xl space-y-1.5 text-left">
                      <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider font-sans">Histórico de Manutenções ({mach.maintenanceHistory.length})</span>
                      <div className="max-h-24 overflow-y-auto space-y-2 divide-y divide-slate-150/60 pr-1">
                        {mach.maintenanceHistory.map((log) => (
                          <div key={log.id} className="text-[10px] text-slate-600 pt-2 first:pt-0 font-sans">
                            <div className="flex justify-between items-center font-mono font-bold text-slate-800">
                              <span className="text-emerald-700 text-[9px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/40">Resolvido</span>
                              <span className="text-slate-900">Custo: R$ {log.cost?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}</span>
                            </div>
                            <p className="mt-1 leading-normal"><strong className="text-slate-500 font-bold">Problema:</strong> "{log.reason}"</p>
                            <p className="mt-0.5 leading-normal"><strong className="text-slate-500 font-bold">Resolução:</strong> {log.resolution}</p>
                            {log.workName && (
                              <p className="mt-0.5 leading-normal"><strong className="text-slate-500 font-bold">Obra:</strong> {log.workName}</p>
                            )}
                            {log.resolvedAt && (
                              <p className="text-[8px] text-slate-400 italic mt-0.5">
                                Concluído em: {new Date(log.resolvedAt).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                <div className="flex gap-2.5 pt-3 mt-auto border-t border-slate-100">
                  <button
                    onClick={() => handleOpenEqMaintenanceModal(mach.id, mach.status)}
                    disabled={mach.status === 'in_use'}
                    className={`flex-1 py-2 text-center rounded-xl text-[10px] font-bold border transition-all ${
                      mach.status === 'maintenance'
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 hover:bg-amber-105 text-amber-900 border-amber-250/60 shadow-xs'
                    } disabled:opacity-30 disabled:pointer-events-none cursor-pointer`}
                  >
                    {mach.status === 'maintenance' ? 'Liberar da Manutenção' : 'Enviar p/ Manutenção'}
                  </button>

                  <button
                    onClick={() => handleStartEdit(mach)}
                    className="p-2 bg-[#EEF2FF] hover:bg-blue-50 border border-transparent hover:border-blue-200 text-slate-450 hover:text-blue-600 rounded-xl transition-all cursor-pointer"
                    title="Editar Maquinário"
                  >
                    <Pencil className="w-3.5 h-3.5 text-blue-600" />
                  </button>

                  <button
                    onClick={() => handleDeleteEquipment(mach.id)}
                    disabled={mach.status === 'in_use'}
                    className="p-2 bg-red-10/10 hover:bg-red-50 border border-transparent hover:border-red-200 text-slate-450 hover:text-red-600 rounded-xl transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    title="Remover Maquinário"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REUSABLE AUDITING CAMERA MODAL */}
      <CameraModal
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCapturePhoto}
        title={cameraPurpose === 'checkin' ? 'Check-in: Foto do Horímetro' : 'Check-out: Foto do Horímetro Final'}
      />

      {/* Equipment Maintenance Prompt Modal Overlay */}
      {eqMaintModalType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2 font-display text-left">
                <span className="text-xl">🚜</span>
                {eqMaintModalType === 'send' ? 'Encaminhar Maquinário p/ Manutenção' : 'Liberar Maquinário da Manutenção'}
              </h3>
              <button
                type="button"
                onClick={() => { setEqMaintModalType(null); setActiveEqMaintId(null); }}
                className="text-slate-400 hover:text-slate-600 font-bold transition-colors text-sm hover:bg-slate-100 w-8 h-8 flex items-center justify-center rounded-full cursor-pointer"
              >
                ✕
              </button>
            </div>

            {eqMaintError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold leading-relaxed text-left">
                ⚠️ {eqMaintError}
              </div>
            )}

            <form onSubmit={handleSaveEqMaintenance} className="space-y-4 text-left">
              {eqMaintModalType === 'send' ? (
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Motivo da Manutenção *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Vazamento de óleo hidráulico no pistão, barulho estranho no motor, desgaste na lâmina..."
                    value={eqMaintReasonInput}
                    onChange={(e) => setEqMaintReasonInput(e.target.value)}
                    className="w-full text-sm px-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl outline-none transition-all resize-none font-medium text-slate-800"
                    required
                  />
                  <span className="text-[10px] text-slate-400 block font-medium">
                    Por favor especifique detalhadamente o defeito mecânico ou revisão periódica necessária.
                  </span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Resolution Textarea */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Descrição da Resolução do Motivo *
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Ex: Efetuada a troca do retentor hidráulico e do óleo do pistão. Mangueira reforçada instalada..."
                      value={eqMaintResolutionInput}
                      onChange={(e) => setEqMaintResolutionInput(e.target.value)}
                      className="w-full text-sm px-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl outline-none transition-all resize-none font-medium text-slate-800"
                      required
                    />
                  </div>

                  {/* Cost Field */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Custo Total da Manutenção (R$) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                      <input
                        type="text"
                        placeholder="Ex: 1250.00"
                        value={eqMaintCostInput}
                        onChange={(e) => setEqMaintCostInput(e.target.value)}
                        className="w-full text-sm pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl outline-none transition-all font-mono font-bold text-slate-800"
                        required
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 block font-medium">
                      Insira apenas valores numéricos. Use ponto (.) para centavos se necessário (ex: 550 ou 1240.50).
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => { setEqMaintModalType(null); setActiveEqMaintId(null); }}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-grow py-2.5 text-xs font-extrabold text-white rounded-xl transition-all shadow-sm cursor-pointer ${
                    eqMaintModalType === 'send'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {eqMaintModalType === 'send' ? 'Confirmar Envio' : 'Liberar Maquinário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default EquipmentControl;
