import React, { useState, useEffect } from 'react';
import { Truck, Shield, Key, FileCheck, Check, AlertCircle, HelpCircle, UserCheck } from 'lucide-react';
import { FleetStore } from './store/fleetStore';
import { Navbar } from './components/Navbar';
import { AdminVehicles } from './components/AdminVehicles';
import { AdminDrivers } from './components/AdminDrivers';
import { DriverTrips } from './components/DriverTrips';
import { TripHistory } from './components/TripHistory';
import { EquipmentControl } from './components/EquipmentControl';
import { ManagerDashboard } from './components/ManagerDashboard';
import { AdminWorks } from './components/AdminWorks';
import { AdminEquipmentTypes } from './components/AdminEquipmentTypes';

export default function App() {
  const store = FleetStore.getInstance();

  // State proxies representing our store values
  const [currentUser, setCurrentUser] = useState(store.currentUser);
  const [users, setUsers] = useState(store.users);
  const [vehicles, setVehicles] = useState(store.vehicles);
  const [trips, setTrips] = useState(store.trips);
  const [equipments, setEquipments] = useState(store.equipments);
  const [equipmentUsages, setEquipmentUsages] = useState(store.equipmentUsages);
  const [works, setWorks] = useState(store.works);
  const [equipmentTypes, setEquipmentTypes] = useState(store.equipmentTypes);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('my-trips');

  // Login page variables
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup state variables
  const [signupName, setSignupName] = useState('');
  const [signupLoginId, setSignupLoginId] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupCpf, setSignupCpf] = useState('');
  const [signupLicense, setSignupLicense] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  // Feedback notifications
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Subscribe state updates to automatically handle triggers across components
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setCurrentUser(store.currentUser);
      setUsers([...store.users]);
      setVehicles([...store.vehicles]);
      setTrips([...store.trips]);
      setEquipments([...store.equipments]);
      setEquipmentUsages([...store.equipmentUsages]);
      setWorks([...store.works]);
      setEquipmentTypes([...store.equipmentTypes]);
    });
    return () => unsubscribe();
  }, [store]);

  // Set correct active view tab on loading / change session
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'gerencial') {
        setActiveTab('manager-dashboard');
      } else if (currentUser.role === 'admin' && activeTab === 'my-trips') {
        setActiveTab('drivers');
      }
    }
  }, [currentUser]);

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const formattedLoginId = loginId.trim().toLowerCase();

    if (!formattedLoginId) {
      setAuthError('Por favor, informe seu usuário ou login de acesso.');
      return;
    }

    if (!loginPassword) {
      setAuthError('Por favor, informe sua senha de acesso.');
      return;
    }

    const res = store.login(formattedLoginId, loginPassword);
    if (res.success) {
      setAuthSuccess('Bem-vindo de volta! Acessando o sistema...');
      setLoginId('');
      setLoginPassword('');
      if (res.user?.role === 'admin') {
        setActiveTab('drivers');
      } else if (res.user?.role === 'gerencial') {
        setActiveTab('manager-dashboard');
      } else {
        setActiveTab('my-trips');
      }
    } else {
      setAuthError(res.message);
    }
  };

  // Handle Signup
  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const formattedSignupLoginId = signupLoginId.trim().toLowerCase();

    if (!signupName.trim() || !formattedSignupLoginId || !signupCpf.trim()) {
      setAuthError('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    if (!signupPassword) {
      setAuthError('Por favor, defina uma senha para sua conta administrativa.');
      return;
    }

    if (!/^[a-z0-9._-]+$/.test(formattedSignupLoginId)) {
      setAuthError('O Login de Acesso deve conter apenas letras minúsculas, números, pontos (.), hífens (-) ou sublinhados (_).');
      return;
    }

    // CPF validation format (simple regex check)
    const cpfClean = signupCpf.replace(/\D/g, '');
    if (cpfClean.length !== 11) {
      setAuthError('O CPF inserido deve conter 11 dígitos numéricos.');
      return;
    }

    // License/CNH format count (only validate if provided)
    const finalLicense = signupLicense.trim() || 'Não Aplicável';
    if (signupLicense.trim()) {
      const cnhClean = signupLicense.replace(/\D/g, '');
      if (cnhClean.length < 9 || cnhClean.length > 11) {
        setAuthError('O número de CNH informado é inválido. Recomenda-se entre 9 e 11 dígitos.');
        return;
      }
    }

    // Since driver registrations are done by Admins, self-signup on the landing page is restricted to Admin registration
    const res = store.signup(
      signupName, 
      formattedSignupLoginId, 
      signupCpf, 
      finalLicense, 
      true, // Forces Admin role
      signupEmail.trim() || undefined,
      signupPassword,
      false // Starts as pending admin approval
    );

    if (res.success) {
      setAuthSuccess('Sua solicitação de cadastro foi registrada com sucesso! Aguarde a liberação por um Administrador (ADM) ativo antes de acessar.');
      // Reset forms
      setSignupName('');
      setSignupLoginId('');
      setSignupEmail('');
      setSignupCpf('');
      setSignupLicense('');
      setSignupPassword('');
      setTimeout(() => {
        setAuthMode('login');
      }, 5000);
    } else {
      setAuthError(res.message);
    }
  };

  // Handle preset clicks for quick testing
  const handleQuickAccess = (id: string) => {
    setAuthError('');
    setAuthSuccess('');
    // Use the default password '123456' for predefined accounts
    const res = store.login(id, '123456');
    if (res.success) {
      setAuthSuccess(`Logado com sucesso como: ${id}`);
      if (res.user?.role === 'admin') {
        setActiveTab('drivers');
      } else if (res.user?.role === 'gerencial') {
        setActiveTab('manager-dashboard');
      } else {
        setActiveTab('my-trips');
      }
    } else {
      setAuthError(res.message);
    }
  };

  const handleLogout = () => {
    store.logout();
    setAuthError('');
    setAuthSuccess('');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans flex flex-col justify-between">
      
      {/* Top Banner & Navigation */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {!currentUser ? (
          /* ========================================================
             🔓 LANDING / LOGIN / SIGNUP SCREEN
             ======================================================== */
          <div className="max-w-md mx-auto space-y-6 py-6 animate-fade-in">
            {/* Greeting Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex p-3.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/15 mb-2">
                <Truck className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">Controle de Frota Integrado</h1>
              <p className="text-sm text-slate-550 max-w-xs mx-auto font-medium">Monitore saídas, faturamento de rotas e vistorias em tempo real.</p>
            </div>

            {/* Form Board (Bento Style Card) */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 sm:p-8 space-y-6">
              {/* Tabs selector */}
              <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-150">
                <button
                  id="toggle_login_mode"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    authMode === 'login'
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Entrar no Painel
                </button>
                <button
                  id="toggle_signup_mode"
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthError('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    authMode === 'signup'
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Criar Conta Admin
                </button>
              </div>

              {/* TAB A: LOGIN */}
              {authMode === 'login' ? (
                <form id="login_form" onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">Usuário ou Login de Acesso</label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Ex: joao, maria, admin"
                        value={loginId}
                        onChange={(e) => setLoginId(e.target.value)}
                        className="w-full text-sm pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all font-bold font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.55">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">Senha de Acesso</label>
                    <div className="relative">
                      <Shield className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        placeholder="Sua senha secreta"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full text-sm pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all font-bold font-mono"
                        required
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">Padrão p/ contas pré-cadastradas: <strong className="font-mono text-slate-600">123456</strong></span>
                  </div>

                  {authError && (
                    <div className="bg-red-50 border border-red-150 rounded-xl p-3 text-xs text-red-650 font-medium">
                      ⚠️ {authError}
                    </div>
                  )}

                  {authSuccess && (
                    <div className="bg-[#EEF2FF] border border-blue-100 rounded-xl p-3 text-xs text-blue-900 font-medium animate-fade-in">
                      ✅ {authSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-all active:scale-98 cursor-pointer text-sm"
                  >
                    Entrar no Painel
                  </button>
                </form>
              ) : (
                /* TAB B: ADMIN SIGNUP */
                <form id="signup_form" onSubmit={handleSignup} className="space-y-4">
                  <div className="bg-blue-50/50 border border-blue-200/55 p-3 rounded-xl">
                    <p className="text-[11px] text-blue-800 leading-relaxed font-semibold">
                      ℹ️ <strong>Restrição de Cadastro:</strong> O cadastro de novos motoristas comuns é realizado exclusivamente por um Admin logado através do menu de motoristas. Registre-se abaixo para obter uma nova conta de <strong>Administrador do Sistema</strong>.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">Nome Completo *</label>
                    <input
                      type="text"
                      placeholder="Ex: Administrador Geral"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      className="w-full text-sm px-4 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all font-semibold"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">Usuário / Login de Acesso *</label>
                    <input
                      type="text"
                      placeholder="Ex: admin.geral"
                      value={signupLoginId}
                      onChange={(e) => setSignupLoginId(e.target.value)}
                      className="w-full text-sm px-4 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all font-bold font-mono text-blue-900"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">CPF *</label>
                    <input
                      type="text"
                      placeholder="Identificação ex: 111.111.111-11"
                      value={signupCpf}
                      onChange={(e) => setSignupCpf(e.target.value)}
                      className="w-full text-sm px-4 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-550">Número da CNH (Habilitação - Opcional para Admins)</label>
                    <input
                      type="text"
                      placeholder="Ex: 11 dígitos numéricos (Opcional)"
                      value={signupLicense}
                      onChange={(e) => setSignupLicense(e.target.value)}
                      className="w-full text-sm px-4 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.55">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-405">E-mail de Backup (Opcional)</label>
                    <input
                      type="email"
                      placeholder="Ex: admin@frota.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="w-full text-sm px-4 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.55">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-[#0F172A] font-extrabold">Senha de Acesso *</label>
                    <div className="relative">
                      <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        placeholder="Mínimo 4 caracteres obrigatório"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="w-full text-sm pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all font-bold font-mono text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                    <p className="text-[10px] text-amber-800 leading-relaxed font-semibold">
                      ⚠️ <strong>Aprovação Obrigatória:</strong> Seu cadastro não será habilitado de imediato. Um administrador ativo precisará aprovar sua conta na guia "Controle de Usuários" para liberar seu acesso físico ao painel.
                    </p>
                  </div>

                  {authError && (
                    <div className="bg-red-50 border border-red-150 rounded-xl p-3 text-xs text-red-650 font-medium">
                      ⚠️ {authError}
                    </div>
                  )}

                  {authSuccess && (
                    <div className="bg-[#EEF2FF] border border-blue-100 rounded-xl p-3 text-xs text-blue-900 font-medium animate-fade-in">
                      ✅ {authSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#0F172A] hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-all active:scale-98 cursor-pointer text-sm font-display tracking-wide"
                  >
                    Registrar Novo Administrador
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================
             🔒 LOGGED-IN SYSTEM CONTROLS
             ======================================================== */
          <div className="space-y-6 animate-fade-in">
            {/* Conditional Module rendering based on Active Tab */}
            {activeTab === 'my-trips' && currentUser.role !== 'gerencial' && (
              <DriverTrips
                vehicles={vehicles}
                trips={trips}
                currentUser={currentUser}
                store={store}
                works={works}
              />
            )}

            {activeTab === 'manager-dashboard' && (
              <ManagerDashboard
                currentUser={currentUser}
                vehicles={vehicles}
                equipments={equipments}
                trips={trips}
                equipmentUsages={equipmentUsages}
                users={users}
                works={works}
              />
            )}

            {activeTab === 'vehicles' && currentUser.role === 'admin' && (
              <AdminVehicles
                vehicles={vehicles}
                store={store}
                works={works}
              />
            )}

            {activeTab === 'drivers' && currentUser.role === 'admin' && (
              <AdminDrivers
                drivers={users}
                currentUser={currentUser}
                store={store}
                vehicles={vehicles}
                equipments={equipments}
              />
            )}

            {activeTab === 'equipment-types' && currentUser.role === 'admin' && (
              <AdminEquipmentTypes
                types={equipmentTypes}
                store={store}
              />
            )}

            {activeTab === 'works' && currentUser?.role !== 'driver' && (
              <AdminWorks
                currentUser={currentUser}
                works={works}
                vehicles={vehicles}
                equipments={equipments}
                trips={trips}
                equipmentUsages={equipmentUsages}
                onCreateWork={(name, city, state, description) => store.createWork(name, city, state, description)}
                onToggleWorkStatus={(id) => store.toggleWorkStatus(id)}
                onDeleteWork={(id) => store.deleteWork(id)}
              />
            )}

            {activeTab === 'history' && (
              <TripHistory
                trips={trips}
                currentUser={currentUser}
                store={store}
              />
            )}

            {activeTab === 'equipments' && currentUser.role !== 'gerencial' && (
              <EquipmentControl
                currentUser={currentUser}
                equipments={equipments}
                equipmentUsages={equipmentUsages}
                store={store}
                works={works}
              />
            )}

            {/* Safety Fallback: if user tries to breach restricted tab by state hacking */}
            {(((activeTab === 'vehicles' || activeTab === 'drivers') && currentUser.role !== 'admin') ||
              ((activeTab === 'my-trips' || activeTab === 'equipments') && currentUser.role === 'gerencial')) && (
              <div className="p-8 bg-red-50 border border-red-200 text-red-800 rounded-3xl text-center space-y-2 animate-bounce">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                <h4 className="text-base font-bold">Acesso Restrito</h4>
                <p className="text-xs text-slate-500">
                  {currentUser.role === 'gerencial'
                    ? 'Usuários com perfil gerencial possuem acesso exclusivo de apenas leitura ao Dashboard Resumo e Relatórios de Viagens.'
                    : 'Apenas usuários administradores cadastrados podem gerenciar a frota de veículos e motoristas do pátio.'}
                </p>
                <button
                  onClick={() => {
                    if (currentUser.role === 'gerencial') {
                      setActiveTab('manager-dashboard');
                    } else {
                      setActiveTab('my-trips');
                    }
                  }}
                  className="mt-3 text-xs bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-bold"
                >
                  {currentUser.role === 'gerencial' ? 'Ir para Dashboard Resumo' : 'Retornar para Minha Viagem'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer System Branding */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-400 select-none">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400">
          <p className="font-medium">© {new Date().getFullYear()} FrotaControl Ltda. Todos os direitos reservados.</p>
          <div className="flex gap-4 font-mono text-[10px] font-semibold text-slate-400 leading-none">
            <span>PLATAFORMA PRIVADA</span>
            <span>•</span>
            <span>INTEGRIDADE VERIFICADA</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
