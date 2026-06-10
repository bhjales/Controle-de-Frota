import React, { useState } from 'react';
import { 
  Search, 
  Shield, 
  Ban, 
  Check, 
  Users, 
  Plus, 
  X, 
  Key, 
  UserCheck, 
  Fingerprint, 
  AlertCircle, 
  Sparkles 
} from 'lucide-react';
import { User, Vehicle, Equipment } from '../types';
import { FleetStore } from '../store/fleetStore';

interface AdminDriversProps {
  drivers: User[];
  currentUser: User | null;
  store: FleetStore;
  vehicles: Vehicle[];
  equipments: Equipment[];
}

export function AdminDrivers({ drivers, currentUser, store, vehicles, equipments }: AdminDriversProps) {
  const [search, setSearch] = useState('');
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);

  const handleAuthorize = (driverId: string, assetIds: string[]) => {
    const res = store.authorizeAssetsToDriver(driverId, assetIds);
    if (!res.success) {
      alert(res.message);
    }
  };

  // Slider control for registration form
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [loginId, setLoginId] = useState('');
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'driver'>('driver');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleToggleRole = (id: string, name: string, currentRole: string) => {
    const cargoLabel = currentRole === 'admin' ? 'Motorista Comum' : 'Administrador do Sistema';
    const isConfirmed = window.confirm(`Deseja alterar o cargo de ${name} para ${cargoLabel}?`);
    if (isConfirmed) {
      const res = store.toggleDriverRole(id);
      if (!res.success) {
        alert(res.message);
      }
    }
  };

  const handleToggleStatus = (id: string, name: string, currentActive: boolean) => {
    const actionLabel = currentActive ? 'SUSPENDER' : 'REATIVAR';
    const isConfirmed = window.confirm(`Tem certeza que deseja ${actionLabel} o acesso do motorista ${name}?`);
    if (isConfirmed) {
      const res = store.toggleDriverStatus(id);
      if (!res.success) {
        alert(res.message);
      }
    }
  };

  const handleRegisterDriver = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const formattedLoginId = loginId.trim().toLowerCase();

    if (!formattedLoginId || !name.trim() || !cpf.trim()) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    // Alphabetic + numeric check for loginId (no special characters except dots/underscores)
    if (!/^[a-z0-9._-]+$/.test(formattedLoginId)) {
      setErrorMsg('O Login de Acesso deve conter apenas letras minúsculas, números, pontos (.), hífens (-) ou sublinhados (_).');
      return;
    }

    // CPF validation format
    const cpfClean = cpf.replace(/\D/g, '');
    if (cpfClean.length !== 11) {
      setErrorMsg('O CPF deve conter 11 dígitos numéricos.');
      return;
    }

    // License/CNH format count
    let finalLicense = licenseNumber.trim();
    if (role === 'driver') {
      if (!finalLicense) {
        setErrorMsg('O número de CNH é obrigatório para motoristas.');
        return;
      }
      const cnhClean = finalLicense.replace(/\D/g, '');
      if (cnhClean.length < 9 || cnhClean.length > 11) {
        setErrorMsg('O número de CNH é inválido. Digite entre 9 e 11 dígitos numéricos.');
        return;
      }
    } else {
      if (!finalLicense) {
        finalLicense = 'Não Aplicável';
      }
    }

    const res = store.signup(
      name.trim(),
      formattedLoginId,
      cpf.trim(),
      finalLicense,
      role === 'admin',
      email.trim() || undefined
    );

    if (res.success) {
      setSuccessMsg(`Usuário "${name}" pré-cadastrado com sucesso como ${role === 'admin' ? 'Administrador' : 'Motorista'}!`);
      setLoginId('');
      setName('');
      setCpf('');
      setLicenseNumber('');
      setEmail('');
      setRole('driver');
      setTimeout(() => {
        setSuccessMsg('');
        setShowAddForm(false);
      }, 3500);
    } else {
      setErrorMsg(res.message);
    }
  };

  // Filter list by search terms (supporting ID, loginId, name, email, cpf, cnh)
  const filteredDrivers = drivers.filter((drv) => {
    const term = search.toLowerCase();
    return (
      drv.name.toLowerCase().includes(term) ||
      (drv.loginId && drv.loginId.toLowerCase().includes(term)) ||
      (drv.email && drv.email.toLowerCase().includes(term)) ||
      drv.cpf.includes(term) ||
      drv.licenseNumber.includes(term)
    );
  });

  return (
    <div id="admin_drivers_view" className="space-y-6">
      
      {/* Description Board */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 font-display">
            👥 Controle de Usuários e Motoristas
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Gerencie e cadastre novas contas de Administradores ou Motoristas do sistema. Controle total direto por Nome de Usuário.
          </p>
        </div>
        
        <div className="flex gap-2 shrink-0">
          <button
            id="admin_add_driver_toggle"
            onClick={() => {
              setShowAddForm(!showAddForm);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
              showAddForm 
                ? 'bg-[#0f172a] text-white hover:bg-slate-800' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {showAddForm ? (
              <>
                <X className="w-4 h-4" />
                Fechar Cadastro
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Cadastrar Novo Usuário
              </>
            )}
          </button>
          
          <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl flex items-center gap-2 font-mono text-xs font-semibold text-slate-650">
            <Users className="w-4 h-4 text-slate-550" />
            <span>Cadastrados: {drivers.length}</span>
          </div>
        </div>
      </div>

      {/* EXPANDABLE PRE-REGISTRATION DRIVER FORM */}
      {showAddForm && (
        <form 
          onSubmit={handleRegisterDriver}
          className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in"
        >
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="font-bold text-slate-950 text-base flex items-center gap-2 font-display">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 block animate-pulse"></span>
              Cadastrar Novo Usuário no Sistema
            </h3>
            <span className="text-[10px] bg-amber-50 text-amber-700 font-extrabold px-2.5 py-1 rounded-lg border border-amber-200/55 font-mono">
              CADASTRO EXCLUSIVO ADM
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Login ID */}
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Nome de Usuário / Login de Acesso *
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ex: joao.silva ou joao123"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="w-full text-sm pl-9 pr-4 py-2.5 bg-[#F8FAFC] focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all font-mono font-bold text-blue-900"
                  required
                />
              </div>
              <span className="text-[9px] text-slate-400">
                Usado para fazer login. Letras minúsculas, hífens, pontos e números.
              </span>
            </div>

            {/* Nome Completo */}
            <div className="space-y-1.5 col-span-2">
              <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Nome Completo *
              </label>
              <input
                type="text"
                placeholder="Ex: João da Silva Santos"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm px-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all font-semibold text-slate-705"
                required
              />
            </div>

            {/* CPF */}
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                CPF do Usuário *
              </label>
              <input
                type="text"
                placeholder="Apenas números ex: 11122233344"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="w-full text-sm px-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all font-mono font-bold"
                required
              />
            </div>

            {/* CNH */}
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Número da CNH {role === 'driver' ? '*' : '(Opcional para Admin)'}
              </label>
              <input
                type="text"
                placeholder={role === 'driver' ? "CNH 9 a 11 dígitos" : "N/D (Não Aplicável)"}
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="w-full text-sm px-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all font-mono font-bold"
              />
            </div>

            {/* Nivel de Cargo */}
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Nível de Permissão de Uso
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'driver')}
                className="w-full text-sm bg-[#F8FAFC] border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 outline-none transition-all font-bold text-slate-700"
              >
                <option value="driver">Motorista / Operador (Padrão)</option>
                <option value="admin">Administrador do Sistema (Acesso Total)</option>
              </select>
            </div>

            {/* Email Opcional */}
            <div className="space-y-1.5 md:col-span-3">
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                E-mail Corporativo ou de Backup (Opcional)
              </label>
              <input
                type="email"
                placeholder="Ex: joao@empresa.com.br (Não obrigatório)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm px-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all font-medium"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-150 p-3.5 rounded-xl text-xs font-semibold text-red-650 flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-red-550 shrink-0" />
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="bg-[#EEF2FF] border border-blue-200 p-3.5 rounded-xl text-xs font-semibold text-blue-900 flex items-center gap-1.5 animate-fade-in">
              <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
              {successMsg}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-xs text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              Salvar e Cadastrar Usuário
            </button>
          </div>
        </form>
      )}

      {/* Search Filter */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar motorista por nome, Login de Usuário, CPF, CNH ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 text-sm bg-[#F8FAFC] hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all font-medium"
          />
        </div>
      </div>

      {/* Grid or Table layout */}
      {filteredDrivers.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-2 animate-bounce" />
          <p className="text-slate-700 font-semibold mb-1">Nenhum motorista encontrado</p>
          <p className="text-sm text-slate-400 font-mono text-xs">Verifique a ortografia do termo de busca.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDrivers.map((driver) => {
            const isSelf = currentUser?.id === driver.id;

            return (
              <div
                key={driver.id}
                className={`bg-white border rounded-2xl p-5 hover:shadow-md transition-all flex flex-col justify-between gap-4 ${
                  !driver.isActive
                    ? 'border-red-200 bg-red-50/10'
                    : driver.role === 'admin'
                    ? 'border-emerald-250 bg-emerald-500/5'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Top Role Indicator */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">
                      ID: {driver.id.substring(0, 12)}
                    </span>

                    {/* Status Badge */}
                    <div className="flex gap-1.5 text-xs">
                      {driver.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">
                          <Shield className="w-3 h-3" />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-250 font-mono">
                          Motorista
                        </span>
                      )}

                      {!driver.isActive && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 font-mono">
                          Suspenso
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Profile Name & Contact */}
                  <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-1 leading-snug">
                    {driver.name}
                    {isSelf && <span className="text-[9px] bg-slate-950 text-white rounded px-1.5 py-0.5 ml-1 font-mono uppercase font-bold">Você</span>}
                  </h4>
                  
                  {/* Access Credentials Badge */}
                  <div className="mt-2 text-xs text-slate-550 flex items-center gap-1">
                    <Fingerprint className="w-4 h-4 text-slate-400" />
                    <span>Login: <strong className="text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/50 font-bold">{driver.loginId}</strong></span>
                  </div>

                  {driver.email && (
                    <p className="text-xs text-slate-400 font-mono overflow-ellipsis truncate mt-1">
                      ✉️ {driver.email}
                    </p>
                  )}

                  {/* Document Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">CPF</span>
                      <span className="font-mono text-slate-800 font-semibold">{driver.cpf}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">CNH (Carteira)</span>
                      <span className="font-mono text-slate-800 font-semibold">{driver.licenseNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                  {/* Status Toggle Box */}
                  <button
                    onClick={() => handleToggleStatus(driver.id, driver.name, driver.isActive)}
                    disabled={isSelf}
                    className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition-all cursor-pointer ${
                      !driver.isActive
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-250 animate-pulse'
                        : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200 disabled:opacity-30 disabled:pointer-events-none'
                    }`}
                  >
                    {driver.isActive ? (
                      <>
                        <Ban className="w-3.5 h-3.5" />
                        Suspender Acesso
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Reativar Motorista
                      </>
                    )}
                  </button>

                  {/* Promote/Demote Toggle Box */}
                  <button
                    onClick={() => handleToggleRole(driver.id, driver.name, driver.role)}
                    disabled={isSelf}
                    className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition-all ${
                      driver.role === 'admin'
                        ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800'
                        : 'bg-blue-50 hover:bg-blue-105 border-blue-200 text-blue-800'
                    } disabled:opacity-30 disabled:pointer-events-none cursor-pointer`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    {driver.role === 'admin' ? 'Tornar Motorista' : 'Promover a Admin'}
                  </button>
                  <button
                    onClick={() => setEditingDriverId(driver.id)}
                    className="text-xs font-bold px-2.5 py-1.5 rounded-lg border bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5" />
                    Permissões
                  </button>
                </div>
                
                {editingDriverId === driver.id && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto space-y-4">
                      <h3 className="font-bold text-lg">Permissões de {driver.name}</h3>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-bold text-sm mb-2 text-slate-500">Veículos</h4>
                          {vehicles.map(v => (
                            <label key={v.id} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={driver.authorizedAssetIds?.includes(v.id) || false}
                                onChange={(e) => {
                                  const newAssets = e.target.checked 
                                    ? [...(driver.authorizedAssetIds || []), v.id]
                                    : (driver.authorizedAssetIds || []).filter(id => id !== v.id);
                                  handleAuthorize(driver.id, newAssets);
                                }}
                              />
                              {v.brand} {v.model} ({v.plate})
                            </label>
                          ))}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm mb-2 text-slate-500">Equipamentos</h4>
                          {equipments.map(e => (
                            <label key={e.id} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={driver.authorizedAssetIds?.includes(e.id) || false}
                                onChange={(e_evt) => {
                                  const newAssets = e_evt.target.checked 
                                    ? [...(driver.authorizedAssetIds || []), e.id]
                                    : (driver.authorizedAssetIds || []).filter(id => id !== e.id);
                                  handleAuthorize(driver.id, newAssets);
                                }}
                              />
                              {e.name}
                            </label>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => setEditingDriverId(null)} className="w-full bg-blue-600 text-white rounded-lg py-2 mt-4 font-bold">Fechar</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
export default AdminDrivers;
