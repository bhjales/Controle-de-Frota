import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Plus, 
  Trash2, 
  Search, 
  ToggleLeft, 
  ToggleRight, 
  FileText, 
  Calendar,
  Truck,
  Wrench,
  CheckCircle,
  AlertCircle,
  Edit,
  Pencil
} from 'lucide-react';
import { User, ConstructionWork, Vehicle, Equipment, Trip, EquipmentUsage } from '../types';

interface AdminWorksProps {
  currentUser: User | null;
  works: ConstructionWork[];
  vehicles: Vehicle[];
  equipments: Equipment[];
  trips: Trip[];
  equipmentUsages: EquipmentUsage[];
  onCreateWork: (name: string, city: string, state: string, description?: string) => { success: boolean, message: string };
  onToggleWorkStatus: (workId: string) => { success: boolean, message: string };
  onDeleteWork: (workId: string) => { success: boolean, message: string };
  onUpdateWork: (work: ConstructionWork) => { success: boolean, message: string };
}

export function AdminWorks({
  currentUser,
  works,
  vehicles,
  equipments,
  trips,
  equipmentUsages,
  onCreateWork,
  onToggleWorkStatus,
  onDeleteWork,
  onUpdateWork
}: AdminWorksProps) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [description, setDescription] = useState('');
  const [editingWork, setEditingWork] = useState<ConstructionWork | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  const handleStartEdit = (work: ConstructionWork) => {
    setEditingWork(work);
    setName(work.name);
    setCity(work.city);
    setState(work.state);
    setDescription(work.description || '');
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleCancelEdit = () => {
    setEditingWork(null);
    setName('');
    setCity('');
    setState('');
    setDescription('');
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!name.trim() || !city.trim() || !state.trim()) {
      setErrorMsg('Por favor, preencha o nome da obra, município e estado.');
      return;
    }

    if (state.trim().length !== 2) {
      setErrorMsg('O estado deve ser preenchido com a sigla de 2 letras (Ex: SP, SC, MG).');
      return;
    }

    if (editingWork) {
      const updated: ConstructionWork = {
        ...editingWork,
        name: name.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
        description: description.trim()
      };
      const res = onUpdateWork(updated);
      if (res.success) {
        setSuccessMsg(res.message);
        handleCancelEdit();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(res.message);
      }
    } else {
      const res = onCreateWork(name, city, state, description);
      if (res.success) {
        setSuccessMsg(res.message);
        setName('');
        setCity('');
        setState('');
        setDescription('');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(res.message);
      }
    }
  };

  const handleToggle = (id: string) => {
    setSuccessMsg('');
    setErrorMsg('');
    const res = onToggleWorkStatus(id);
    if (res.success) {
      setSuccessMsg(res.message);
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir esta obra?')) return;
    setSuccessMsg('');
    setErrorMsg('');
    const res = onDeleteWork(id);
    if (res.success) {
      setSuccessMsg(res.message);
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setErrorMsg(res.message);
    }
  };

  // Helper to find currently allocated vehicles
  const getAllocatedVehicles = (workId: string) => {
    const activeTripsForWork = trips.filter(t => t.status === 'active' && t.workId === workId);
    return activeTripsForWork.map(t => {
      const veh = vehicles.find(v => v.id === t.vehicleId);
      return veh ? `${veh.brand} ${veh.model} (${veh.plate}) - Motorista: ${t.driverName}` : `Veículo (${t.vehicleModelPlate})`;
    });
  };

  // Helper to find currently allocated machinery
  const getAllocatedEquipments = (workId: string) => {
    const activeUsagesForWork = equipmentUsages.filter(u => u.status === 'active' && u.workId === workId);
    return activeUsagesForWork.map(u => {
      const eq = equipments.find(e => e.id === u.equipmentId);
      return eq ? `${eq.name} (${eq.id}) - Operador: ${u.operatorName}` : `Máquina (${u.equipmentNameModel})`;
    });
  };

  // List filter logic
  const filteredWorks = works.filter(work => {
    const matchesSearch = 
      work.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      work.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      work.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (work.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || 
      work.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div id="obras_control_module" className="space-y-8 text-left">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏗️</span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
              Cadastro & Alocação de Obras
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Gerencie locais de obras e monitore em tempo real frotas e maquinários alocados em cada canteiro de serviço.
          </p>
        </div>
        {!isAdmin && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200/50 px-3.5 py-2 rounded-xl shrink-0 self-start md:self-auto text-xs font-semibold text-amber-800">
            <span>👁️ Apenas Leitura</span>
          </div>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-bold animate-fade-in shadow-xs">
          <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-2 text-xs font-bold animate-fade-in shadow-xs">
          <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid: Registration Form (Only for Admins) & Search / Construction list */}
      <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-3' : 'grid-cols-1'} gap-8`}>
        {/* Form panel */}
        {isAdmin && (
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 font-mono">
                {editingWork ? 'Editar Detalhes da Obra' : 'Registrar Nova Obra'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
                {/* Obra Name */}
                <div className="space-y-1.5">
                  <label htmlFor="work_name_input" className="block text-slate-650 font-extrabold">Nome do Canteiro / Obra *</label>
                  <input
                    id="work_name_input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Ampliação BR-101 Sul Viaduto"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1.5 focus:ring-blue-500 text-slate-800 text-xs transition-all font-medium font-sans"
                  />
                </div>

                {/* City & State (Row) */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label htmlFor="work_city_input" className="block text-slate-650 font-extrabold">Município *</label>
                    <input
                      id="work_city_input"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Ex: Palhoça"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1.5 focus:ring-blue-500 text-slate-800 text-xs transition-all font-medium"
                    />
                  </div>

                  <div className="col-span-1 space-y-1.5">
                    <label htmlFor="work_state_input" className="block text-slate-650 font-extrabold">Estado *</label>
                    <input
                      id="work_state_input"
                      type="text"
                      maxLength={2}
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="SC"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1.5 focus:ring-blue-500 text-slate-800 text-xs transition-all tracking-wider text-center font-bold font-mono"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label htmlFor="work_desc_input" className="block text-slate-650 font-extrabold">Breve Descrição (Opcional)</label>
                  <textarea
                    id="work_desc_input"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Especifique marcos da obra ou detalhes técnicos de alocação..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1.5 focus:ring-blue-500 text-slate-800 text-xs transition-all font-medium resize-none"
                  />
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    id="submit_obra_btn"
                    type="submit"
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-blue-600/10"
                  >
                    {editingWork ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editingWork ? 'Salvar Alterações' : 'Cadastrar Obra'}
                  </button>
                  {editingWork && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-605 font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all text-xs"
                    >
                      Cancelar Edição
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* List panel */}
        <div className={`${isAdmin ? 'lg:col-span-2' : 'col-span-1'} space-y-4`}>
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            
            {/* Filter Tools */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              {/* Search input */}
              <div className="relative w-full sm:max-w-xs font-sans text-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  id="search_obras_input"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar obra, cidade ou UF..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1.5 focus:ring-blue-500 text-slate-800 text-xs transition-all font-medium"
                />
              </div>

              {/* Status Tab buttons */}
              <div className="flex bg-slate-100 p-1 rounded-xl self-stretch sm:self-auto shrink-0 shadow-xs border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-white text-slate-805 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    statusFilter === 'active'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Ativas
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('completed')}
                  className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    statusFilter === 'completed'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Concluídas
                </button>
              </div>
            </div>

            {/* List */}
            {filteredWorks.length === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-2xl py-12 text-center text-slate-450 flex flex-col items-center justify-center space-y-2">
                <Building2 className="w-10 h-10 text-slate-350" />
                <p className="text-xs font-bold text-slate-600">Nenhuma obra localizada</p>
                <p className="text-[10px] text-slate-400">Tente redefinir os filtros de busca ou cadastre uma nova obra para iniciar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredWorks.map((work) => {
                  const allocVehicles = getAllocatedVehicles(work.id);
                  const allocEquip = getAllocatedEquipments(work.id);
                  const totalAllocated = allocVehicles.length + allocEquip.length;

                  return (
                    <div 
                      key={work.id} 
                      className={`border p-5 rounded-2.5xl transition-all shadow-xs ${
                        work.status === 'active'
                          ? 'bg-white border-slate-200 hover:border-blue-200/90 hover:shadow-sm'
                          : 'bg-slate-50/50 border-slate-150 grayscale-20 opacity-75'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 gap-y-1 flex-wrap">
                            <h4 className="text-sm font-black text-slate-900 tracking-tight">{work.name}</h4>
                            <span className={`inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              work.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : 'bg-slate-100 text-slate-500 border border-slate-200/85'
                            }`}>
                              {work.status === 'active' ? 'Ativa' : 'Concluída'}
                            </span>
                            
                            {totalAllocated > 0 && (
                              <span className="bg-indigo-50 border border-indigo-200/50 text-indigo-705 text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                                🛠️ {totalAllocated} Alocado{totalAllocated > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-slate-505 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{work.city}, {work.state}</span>
                          </div>
                        </div>

                        {/* Actions (Only Admin can Toggle or Delete) */}
                        {isAdmin && (
                          <div className="flex items-center gap-1.5">
                            <button
                              id={`toggle_work_status_${work.id}`}
                              type="button"
                              onClick={() => handleToggle(work.id)}
                              className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 transition-all flex items-center gap-1 cursor-pointer"
                              title={work.status === 'active' ? 'Marcar como Concluída' : 'Marcar como Ativa'}
                            >
                              {work.status === 'active' ? 'Concluir' : 'Ativar'}
                            </button>

                            <button
                              id={`edit_work_${work.id}`}
                              type="button"
                              onClick={() => handleStartEdit(work)}
                              className="p-2 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-blue-600 rounded-lg transition-all cursor-pointer"
                              title="Editar detalhes da obra"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <button
                              id={`delete_work_${work.id}`}
                              type="button"
                              onClick={() => handleDelete(work.id)}
                              className="p-2 bg-rose-50 hover:bg-rose-100/80 border border-rose-200 text-rose-600 rounded-lg transition-all cursor-pointer"
                              title="Excluir obra"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      {work.description && (
                        <p className="text-[11px] text-slate-500 mt-2.5 bg-slate-50 border border-slate-150/65 rounded-xl p-3 leading-relaxed">
                          {work.description}
                        </p>
                      )}

                      {/* Live Allocation Monitor */}
                      <div className="mt-4 border-t border-slate-100 pt-3.5 space-y-3 font-sans text-xs">
                        <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">
                          Recursos em Campo Alocados
                        </span>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Vehicles Column */}
                          <div className="bg-slate-50/50 border border-slate-150 p-3 rounded-xl text-left space-y-1.5">
                            <div className="flex items-center gap-1 border-b border-slate-200/60 pb-1">
                              <Truck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="font-bold text-slate-700 text-[11px]">Veículos ({allocVehicles.length})</span>
                            </div>
                            {allocVehicles.length === 0 ? (
                              <span className="text-[10px] text-slate-400 italic block">Nenhum veículo alocado</span>
                            ) : (
                              <ul className="space-y-1 text-[10px] font-semibold text-slate-605">
                                {allocVehicles.map((val, idx) => (
                                  <li key={idx} className="flex items-center gap-1 bg-white border border-slate-150 px-2 py-1 rounded">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0"></span>
                                    <span className="truncate">{val}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {/* Machinery Column */}
                          <div className="bg-slate-50/50 border border-slate-150 p-3 rounded-xl text-left space-y-1.5">
                            <div className="flex items-center gap-1 border-b border-slate-200/60 pb-1">
                              <Wrench className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="font-bold text-slate-700 text-[11px]">Maquinários ({allocEquip.length})</span>
                            </div>
                            {allocEquip.length === 0 ? (
                              <span className="text-[10px] text-slate-400 italic block">Nenhum maquinário alocado</span>
                            ) : (
                              <ul className="space-y-1 text-[10px] font-semibold text-slate-605">
                                {allocEquip.map((val, idx) => (
                                  <li key={idx} className="flex items-center gap-1 bg-white border border-slate-150 px-2 py-1 rounded">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0"></span>
                                    <span className="truncate">{val}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Date metadata footer */}
                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono mt-3 border-t border-slate-100 pt-2 font-medium">
                        <span>OBRA ID: {work.id}</span>
                        <span>Cadastrada em: {new Date(work.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export default AdminWorks;
