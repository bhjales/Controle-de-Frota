import React, { useState } from 'react';
import { Plus, Search, Trash2, Settings, PenTool, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import { Vehicle, ConstructionWork } from '../types';
import { FleetStore } from '../store/fleetStore';

interface AdminVehiclesProps {
  vehicles: Vehicle[];
  store: FleetStore;
  works?: ConstructionWork[];
}

export function AdminVehicles({ vehicles, store, works = [] }: AdminVehiclesProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Registration Form state
  const [showForm, setShowForm] = useState(false);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [color, setColor] = useState('');
  const [initialKm, setInitialKm] = useState(0);
  const [category, setCategory] = useState<'utilitário' | 'caminhão'>('utilitário');
  const [selectedWorkId, setSelectedWorkId] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const handleRegisterVehicles = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!brand.trim() || !model.trim() || !plate.trim() || !color.trim()) {
      setFormError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // Plate validation (Brazilian standard e.g. AAA-1234 or AAA1A23 Mercosul)
    const plateRegex = /^[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}$/i;
    if (!plateRegex.test(plate.trim())) {
      setFormError('Insira uma placa válida padrão brasileiro ou padrão Mercosul (ex: ABC-1234 ou ABC1D23).');
      return;
    }

    if (year < 1920 || year > new Date().getFullYear() + 2) {
      setFormError('Por favor insira um ano de fabricação verídico.');
      return;
    }

    if (initialKm < 0) {
      setFormError('A quilometragem inicial não pode ser negativo.');
      return;
    }

    const matchedWork = selectedWorkId ? works.find(w => w.id === selectedWorkId) : undefined;
    const result = store.addVehicle({
      brand: brand.trim(),
      model: model.trim(),
      plate: plate.trim().toUpperCase(),
      year: Number(year),
      color: color.trim(),
      currentKm: Number(initialKm),
      workId: matchedWork?.id,
      workName: matchedWork?.name,
      category: category
    });

    if (result.success) {
      setFormSuccess(result.message);
      // reset form
      setBrand('');
      setModel('');
      setPlate('');
      setYear(new Date().getFullYear());
      setColor('');
      setInitialKm(0);
      setCategory('utilitário');
      setSelectedWorkId('');
      
      // Auto close form after briefly showing success
      setTimeout(() => {
        setShowForm(false);
        setFormSuccess('');
      }, 1500);
    } else {
      setFormError(result.message);
    }
  };

  const handleDeleteVehicle = (id: string, plate: string) => {
    const isConfirmed = window.confirm(`Deseja realmente excluir o veículo com placa ${plate}? Esta ação é irreversível.`);
    if (isConfirmed) {
      const result = store.deleteVehicle(id);
      if (!result.success) {
        alert(result.message);
      }
    }
  };

  // Maintenance flow states
  const [maintModalType, setMaintModalType] = useState<'send' | 'release' | null>(null);
  const [activeMaintVehicleId, setActiveMaintVehicleId] = useState<string | null>(null);
  const [maintReasonInput, setMaintReasonInput] = useState('');
  const [maintResolutionInput, setMaintResolutionInput] = useState('');
  const [maintCostInput, setMaintCostInput] = useState('');
  const [isOilChange, setIsOilChange] = useState(false);
  const [maintNextOilKm, setMaintNextOilKm] = useState('');
  const [maintError, setMaintError] = useState('');

  const handleOpenMaintenanceModal = (vehicleId: string, currentStatus: string) => {
    setMaintError('');
    setActiveMaintVehicleId(vehicleId);
    if (currentStatus === 'maintenance') {
      setMaintModalType('release');
      setMaintResolutionInput('');
      setMaintCostInput('');
      setIsOilChange(false);
      setMaintNextOilKm('');
    } else {
      setMaintModalType('send');
      setMaintReasonInput('');
    }
  };

  const handleSaveMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    setMaintError('');
    if (!activeMaintVehicleId) return;

    if (maintModalType === 'send') {
      if (!maintReasonInput.trim()) {
        setMaintError('Por favor, informe o motivo da manutenção.');
        return;
      }
      const res = store.sendVehicleToMaintenance(activeMaintVehicleId, maintReasonInput.trim());
      if (res.success) {
        setMaintModalType(null);
        setActiveMaintVehicleId(null);
      } else {
        setMaintError(res.message);
      }
    } else if (maintModalType === 'release') {
      if (!maintResolutionInput.trim()) {
        setMaintError('Por favor, descreva a resolução do motivo de manutenção.');
        return;
      }
      const costNum = Number(maintCostInput.replace(',', '.'));
      if (isNaN(costNum) || costNum < 0) {
        setMaintError('Por favor, insira um valor de custo válido (maior ou igual a R$ 0).');
        return;
      }
      const res = store.releaseVehicleFromMaintenance(
        activeMaintVehicleId, 
        maintResolutionInput.trim(), 
        costNum, 
        isOilChange, 
        isOilChange ? Number(maintNextOilKm) : undefined
      );
      if (res.success) {
        setMaintModalType(null);
        setActiveMaintVehicleId(null);
      } else {
        setMaintError(res.message);
      }
    }
  };

  // Filter and search
  const filteredVehicles = vehicles.filter((v) => {
    const term = search.toLowerCase();
    const matchesSearch =
      v.model.toLowerCase().includes(term) ||
      v.brand.toLowerCase().includes(term) ||
      v.plate.toLowerCase().includes(term) ||
      v.color.toLowerCase().includes(term);

    const matchesStatus = filterStatus === 'all' || v.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div id="admin_vehicles_view" className="space-y-6">
      {/* Module Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight font-display">Frota de Veículos</h2>
          <p className="text-sm text-slate-500 font-medium">Cadastre novos veículos na frota e gerencie o status de manutenção deles.</p>
        </div>
        <button
          id="btn_show_vehicle_form"
          onClick={() => {
            setShowForm(!showForm);
            setFormError('');
            setFormSuccess('');
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm cursor-pointer select-none transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Fechar Formulário' : 'Novo Veículo'}
        </button>
      </div>

      {/* Registration Form Card */}
      {showForm && (
        <form 
          id="vehicle_registration_form"
          onSubmit={handleRegisterVehicles} 
          className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm animate-fade-in space-y-6"
        >
          <h3 className="font-bold text-slate-900 text-md flex items-center gap-2 border-b border-slate-100 pb-3 font-display">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 block animate-pulse"></span>
            Cadastrar Novo Carro na Frota
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">Marca *</label>
              <input
                type="text"
                placeholder="Ex: Chevrolet, Toyota, Volkswagen"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full text-sm bg-[#F8FAFC] focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 outline-none transition-all font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">Modelo *</label>
              <input
                type="text"
                placeholder="Ex: Onix, Corolla, Golf"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full text-sm bg-[#F8FAFC] focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 outline-none transition-all font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">Placa (Br/Mercosul) *</label>
              <input
                type="text"
                placeholder="Ex: ABC-1234 ou ABC1D23"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                className="w-full text-sm font-mono tracking-wider uppercase bg-[#F8FAFC] focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 outline-none transition-all font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">Ano de Fabricação *</label>
              <input
                type="number"
                placeholder="Ex: 2022"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full text-sm bg-[#F8FAFC] focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 outline-none transition-all font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">Cor Predominante *</label>
              <input
                type="text"
                placeholder="Ex: Prata, Cinza, Preto, Vermelho"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full text-sm bg-[#F8FAFC] focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 outline-none transition-all font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">Quilometragem Atual (Km)</label>
              <input
                type="number"
                placeholder="Ex: 45000"
                value={initialKm}
                onChange={(e) => setInitialKm(Math.max(0, Number(e.target.value)))}
                className="w-full text-sm bg-[#F8FAFC] focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 outline-none transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">Categoria *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as 'utilitário' | 'caminhão')}
                className="w-full text-sm bg-[#F8FAFC] focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 outline-none transition-all font-medium"
              >
                <option value="utilitário">Utilitário</option>
                <option value="caminhão">Caminhão</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">Alocação de Obra Inicial *</label>
              <select
                value={selectedWorkId}
                onChange={(e) => setSelectedWorkId(e.target.value)}
                className="w-full text-sm bg-[#F8FAFC] focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 outline-none transition-all font-semibold"
              >
                <option value="">⚙️ Geral (Sem alocação única)</option>
                {works.filter(w => w.status === 'active').map(w => (
                  <option key={w.id} value={w.id}>
                    🏗️ {w.name} ({w.city} - {w.state})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Você pode alocar o veículo a uma obra específica para controle de checkout e roteiro, ou escolher Geral.</p>
            </div>
          </div>

          {/* Feedback Blocks */}
          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 font-medium">
              ⚠️ {formError}
            </div>
          )}

          {formSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700 font-medium animate-fade-in">
              ✅ {formSuccess}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md active:scale-95 transition-all"
            >
              Confirmar Cadastro
            </button>
          </div>
        </form>
      )}

      {/* Grid Filters and Search Tools */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar veículo por modelo, marca, placa ou cor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 text-sm bg-[#F8FAFC] hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status:</span>
          <div className="flex gap-1 bg-[#F8FAFC] p-1 rounded-xl border border-slate-150">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'available', label: 'Disponível' },
              { id: 'in_use', label: 'Em Uso' },
              { id: 'maintenance', label: 'Manutenção' }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setFilterStatus(st.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  filterStatus === st.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/40'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vehicles Cards Grid */}
      {filteredVehicles.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <HelpCircle className="w-12 h-12 text-slate-350 mx-auto mb-3 animate-pulse" />
          <p className="text-slate-700 font-semibold mb-1">Nenhum veículo correspondente</p>
          <p className="text-sm text-slate-400">Tente ajustar seus termos de busca ou mude os filtros de status.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVehicles.map((vehicle) => {
            // Colors for tags
            let statusBg = 'bg-slate-100 text-slate-700 border-slate-250';
            let statusText = 'Carregando';

            if (vehicle.status === 'available') {
              statusBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
              statusText = 'Disponível';
            } else if (vehicle.status === 'in_use') {
              statusBg = 'bg-indigo-50 text-indigo-700 border-indigo-200';
              statusText = 'Em Uso';
            } else if (vehicle.status === 'maintenance') {
              statusBg = 'bg-amber-50 text-amber-700 border-amber-200';
              statusText = 'Manutenção';
            }

            return (
              <div
                key={vehicle.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-all shadow-xs flex flex-col justify-between gap-4 group"
              >
                <div>
                  {/* Top line ID & Action */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 font-mono font-bold text-sm bg-slate-950 text-white rounded-lg shadow-sm">
                      {vehicle.plate}
                    </span>
                    
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold border rounded-full ${statusBg}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current block"></span>
                      {statusText}
                    </span>
                  </div>

                  {/* Brand & Model */}
                  <h4 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {vehicle.brand} <span className="font-semibold text-slate-700">{vehicle.model}</span>
                    <span className="block text-xs font-medium text-slate-500 capitalize">{vehicle.category}</span>
                  </h4>

                  {/* Attributes details */}
                  <div className="grid grid-cols-3 gap-2 mt-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Ano</span>
                      <span className="font-bold text-slate-800">{vehicle.year}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Cor</span>
                      <span className="font-bold text-slate-800">{vehicle.color}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Odômetro</span>
                      <span className="font-bold text-slate-800 font-mono">{vehicle.currentKm.toLocaleString()} km</span>
                    </div>
                  </div>

                  {/* Administrative Work Allocation Selector */}
                  <div className="mt-3 bg-blue-50/45 border border-blue-100 p-3.5 rounded-xl text-left shadow-2xs">
                    <label className="block text-[10px] uppercase font-mono font-black tracking-wider text-blue-950">
                      Alocação de Obra (Admin)
                    </label>
                    <select
                      value={vehicle.workId || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        store.allocateVehicleToWork(vehicle.id, val || undefined);
                      }}
                      className="w-full mt-1.5 px-3 py-2 text-xs bg-white border border-slate-200 focus:border-blue-500 rounded-lg outline-none font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="">⚙️ Geral (Sem alocação única)</option>
                      {works.filter(w => w.status === 'active').map(w => (
                        <option key={w.id} value={w.id}>
                          🏗️ {w.name} ({w.city} - {w.state})
                        </option>
                      ))}
                    </select>
                    <p className="text-[9px] text-slate-450 mt-1 font-medium leading-tight">
                      Administrado por gestor. Os check-ins deste carro serão automaticamente associados a esta obra (ou Geral).
                    </p>
                  </div>

                  {/* Active Maintenance Details */}
                  {vehicle.status === 'maintenance' && vehicle.maintenanceReason && (
                    <div className="bg-amber-50 border border-amber-200/60 p-3 rounded-xl mt-3 space-y-1">
                      <span className="block text-[9px] uppercase font-bold text-amber-800 tracking-wider">Motivo da Manutenção</span>
                      <p className="text-xs text-slate-750 font-semibold italic">"{vehicle.maintenanceReason}"</p>
                      {vehicle.maintenanceSentAt && (
                        <span className="text-[9px] text-amber-600 font-mono">
                          Enviado em: {new Date(vehicle.maintenanceSentAt).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Maintenance Records History List */}
                  {vehicle.maintenanceHistory && vehicle.maintenanceHistory.length > 0 && (
                    <div className="mt-3 bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-2">
                      <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Histórico de Manutenções ({vehicle.maintenanceHistory.length})</span>
                      <div className="max-h-24 overflow-y-auto space-y-2 divide-y divide-slate-150 pr-1">
                        {vehicle.maintenanceHistory.map((log) => (
                          <div key={log.id} className="text-[10px] text-slate-600 pt-2 first:pt-0">
                            <div className="flex justify-between items-center font-mono font-bold text-slate-800">
                              <span className="text-emerald-700 text-[9px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-250/50">Resolvido</span>
                              <span className="text-slate-900">Custo: R$ {log.cost?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}</span>
                            </div>
                            <p className="mt-1"><strong className="text-slate-500 font-bold">Problema:</strong> "{log.reason}"</p>
                            <p className="mt-0.5"><strong className="text-slate-500 font-bold">Resolução:</strong> {log.resolution}</p>
                            {log.workName && (
                              <p className="mt-0.5"><strong className="text-slate-500 font-bold">Obra:</strong> {log.workName}</p>
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
                </div>

                {/* Operations Line */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                  <div className="flex gap-1.5">
                    {vehicle.status !== 'in_use' ? (
                      <button
                        onClick={() => handleOpenMaintenanceModal(vehicle.id, vehicle.status)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                          vehicle.status === 'maintenance'
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                        }`}
                      >
                        <Settings className="w-3.5 h-3.5" />
                        {vehicle.status === 'maintenance' ? 'Liberar da Manutenção' : 'Enviar Manutenção'}
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 bg-slate-50 px-2 py-1.5 rounded">
                        <PenTool className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                        Em trânsito com motorista
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteVehicle(vehicle.id, vehicle.plate)}
                    disabled={vehicle.status === 'in_use'}
                    className="p-2 text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:pointer-events-none hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 cursor-pointer"
                    title="Excluir veículo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Maintenance Prompt Modal Overlay */}
      {maintModalType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-scale-up">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2 font-display">
                <Settings className={`w-5 h-5 ${maintModalType === 'send' ? 'text-amber-500' : 'text-emerald-500'}`} />
                {maintModalType === 'send' ? 'Encaminhar Veículo p/ Manutenção' : 'Liberar Veículo da Manutenção'}
              </h3>
              <button
                type="button"
                onClick={() => { setMaintModalType(null); setActiveMaintVehicleId(null); }}
                className="text-slate-400 hover:text-slate-600 font-bold transition-colors text-sm hover:bg-slate-100 w-8 h-8 flex items-center justify-center rounded-full cursor-pointer"
              >
                ✕
              </button>
            </div>

            {maintError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold leading-relaxed">
                ⚠️ {maintError}
              </div>
            )}

            <form onSubmit={handleSaveMaintenance} className="space-y-4">
              {maintModalType === 'send' ? (
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Motivo da Manutenção *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Troca de pastilhas de freio, revisão de 50.000km, ajuste no câmbio..."
                    value={maintReasonInput}
                    onChange={(e) => setMaintReasonInput(e.target.value)}
                    className="w-full text-sm px-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl outline-none transition-all resize-none font-medium"
                    required
                  />
                  <span className="text-[10px] text-slate-450 block font-medium">
                    Por favor especifique detalhadamente a falha detectada ou o serviço desejado.
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
                      placeholder="Ex: Trocado disco e pastilhas dianteiras, sistema testado e aprovado..."
                      value={maintResolutionInput}
                      onChange={(e) => setMaintResolutionInput(e.target.value)}
                      className="w-full text-sm px-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl outline-none transition-all resize-none font-medium"
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
                        placeholder="Ex: 350.50"
                        value={maintCostInput}
                        onChange={(e) => setMaintCostInput(e.target.value)}
                        className="w-full text-sm pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl outline-none transition-all font-mono font-bold"
                        required
                      />
                    </div>
                    <span className="text-[9px] text-slate-450 block font-medium">
                      Insira apenas números. Use ponto (.) para centavos se necessário (ex: 1540.80 ou 250).
                    </span>
                  </div>

                  {/* Oil Change Checkbox & Next KM */}
                  <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={isOilChange}
                        onChange={(e) => setIsOilChange(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-700">Troca de óleo realizada?</span>
                    </label>

                    {isOilChange && (
                      <div className="space-y-1">
                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                          Próxima troca (KM) *
                        </label>
                        <input
                          type="number"
                          placeholder="Ex: 60000"
                          value={maintNextOilKm}
                          onChange={(e) => setMaintNextOilKm(e.target.value)}
                          className="w-full text-sm px-4 py-2 bg-white border border-slate-200 focus:border-emerald-500 rounded-lg outline-none font-medium"
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => { setMaintModalType(null); setActiveMaintVehicleId(null); }}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-grow py-2.5 text-xs font-extrabold text-white rounded-xl transition-all shadow-sm cursor-pointer ${
                    maintModalType === 'send'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {maintModalType === 'send' ? 'Confirmar Envio' : 'Liberar Veículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default AdminVehicles;
