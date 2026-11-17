import React, { useState, useEffect, useRef } from 'react';
import { Truck, Shield, Key, FileCheck, Check, AlertCircle, HelpCircle, UserCheck } from 'lucide-react';
import { FleetStore } from './store/fleetStore';
import { Sidebar } from './components/Sidebar';
import { AdminVehicles } from './components/AdminVehicles';
import { AdminDrivers } from './components/AdminDrivers';
import { DriverTrips } from './components/DriverTrips';
import { TripHistory } from './components/TripHistory';
import { EquipmentControl } from './components/EquipmentControl';
import { ManagerDashboard } from './components/ManagerDashboard';
import { AdminWorks } from './components/AdminWorks';
import { AdminEquipmentTypes } from './components/AdminEquipmentTypes';
import { AdminSuppliers } from './components/AdminSuppliers';
import { FuelManagement } from './components/FuelManagement';
import { TvDashboard } from './components/TvDashboard';
import { LogisticsControl } from './components/LogisticsControl';

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
  const [vehicleCategories, setVehicleCategories] = useState(store.vehicleCategories);
  const [suppliers, setSuppliers] = useState(store.suppliers);
  const [fuelInflows, setFuelInflows] = useState(store.fuelInflows);
  const [fuelDispenses, setFuelDispenses] = useState(store.fuelDispenses);
  const [logisticsSchedules, setLogisticsSchedules] = useState(store.logisticsSchedules);

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
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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
      setVehicleCategories([...store.vehicleCategories]);
      setSuppliers([...store.suppliers]);
      setFuelInflows([...store.fuelInflows]);
      setFuelDispenses([...store.fuelDispenses]);
      setLogisticsSchedules([...store.logisticsSchedules]);
    });
    return () => unsubscribe();
  }, [store]);

  const lastSessionUserIdRef = useRef<string | null>(null);

  // Set correct active view tab only on session change (login/logout) or if current tab becomes unauthorized
  useEffect(() => {
    if (!currentUser) {
      lastSessionUserIdRef.current = null;
      return;
    }

    const isNewSession = lastSessionUserIdRef.current !== currentUser.id;
    if (isNewSession) {
      lastSessionUserIdRef.current = currentUser.id;
      if (currentUser.role === 'abastecedor') {
        setActiveTab('fuel');
      } else if (currentUser.role === 'gerencial') {
        setActiveTab('manager-dashboard');
      } else if (currentUser.role === 'admin') {
        setActiveTab('drivers');
      } else {
        setActiveTab('my-trips');
      }
      return;
    }

    // If the user's role changed dynamically while logged in and current tab is forbidden, redirect safely
    if (currentUser.role === 'abastecedor' && activeTab !== 'fuel' && activeTab !== 'tv-dashboard') {
      setActiveTab('fuel');
    } else if (
      currentUser.role === 'gerencial' &&
      ['my-trips', 'equipments', 'vehicles', 'drivers', 'categories'].includes(activeTab)
    ) {
      setActiveTab('manager-dashboard');
    } else if (
      currentUser.role === 'driver' &&
      ['vehicles', 'drivers', 'categories', 'works', 'suppliers', 'fuel', 'manager-dashboard'].includes(activeTab)
    ) {
      setActiveTab('my-trips');
    }
  }, [currentUser, activeTab]);

  // Refresh fresh DB data when switching tabs
  useEffect(() => {
    if (currentUser) {
      store.refreshFromDatabase();
    }
  }, [activeTab, currentUser?.id, store]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
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

    setIsLoggingIn(true);
    try {
      const res = await store.loginFromDatabase(formattedLoginId, loginPassword);
      if (res.success) {
        setAuthSuccess('Bem-vindo de volta! Acessando o sistema...');
        setLoginId('');
        setLoginPassword('');
        if (res.user?.role === 'abastecedor') {
          setActiveTab('fuel');
        } else if (res.user?.role === 'admin') {
          setActiveTab('drivers');
        } else if (res.user?.role === 'gerencial') {
          setActiveTab('manager-dashboard');
        } else {
          setActiveTab('my-trips');
        }
      } else {
        setAuthError(res.message);
      }
    } finally {
      setIsLoggingIn(false);
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

  const handleLogout = () => {
    store.logout();
    setAuthError('');
    setAuthSuccess('');
  };

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'my-trips': return 'Minha Viagem';
      case 'manager-dashboard': return 'Dashboard Resumo';
      case 'vehicles': return 'Veículos';
      case 'equipments': return 'Maquinários / Horímetro';
      case 'drivers': return 'Usuários';
      case 'categories': return 'Categorias';
      case 'history': return 'Relatórios de Viagens';
      case 'works': return 'Obras';
      case 'suppliers': return 'Fornecedores';
      case 'fuel': return 'Controle de Combustível';
      case 'logistics': return 'Controle de Logística';
      case 'tv-dashboard': return 'Painel TV (Geral)';
      default: return 'Painel Geral';
    }
  };

  return (
    <div className={`min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans ${currentUser ? 'flex flex-col md:flex-row' : 'flex flex-col justify-between'}`}>
      
      {/* Lateral Menu / Sidebar */}
      <Sidebar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {currentUser && (
          <header className="hidden md:flex items-center justify-between border-b border-slate-200 bg-white/90 backdrop-blur-md px-6 py-3.5 sticky top-0 z-20 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="font-semibold text-slate-700 font-display">FrotaControl</span>
              <span>/</span>
              <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                {getTabLabel(activeTab)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Operacional Ativo
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {new Date().toLocaleDateString('pt-BR')}
              </span>
            </div>
          </header>
        )}

        {/* Main Body */}
        <main className={`flex-1 w-full ${currentUser ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6' : 'max-w-md mx-auto px-4 py-8'}`}>
        
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
              {/* TAB A: LOGIN */}
              <form id="login_form" onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">Usuário ou Login de Acesso</label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ex: admin, abastecedor, joao"
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
                  disabled={isLoggingIn}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-sm transition-all active:scale-98 cursor-pointer text-sm"
                >
                  {isLoggingIn ? 'Consultando banco de dados...' : 'Entrar no Painel'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* ========================================================
             🔒 LOGGED-IN SYSTEM CONTROLS
             ======================================================== */
          <div className="space-y-6 animate-fade-in">
            {/* Conditional Module rendering based on Active Tab */}
            {activeTab === 'my-trips' && currentUser.role !== 'gerencial' && currentUser.role !== 'abastecedor' && (
              <DriverTrips
                vehicles={vehicles}
                trips={trips}
                currentUser={currentUser}
                store={store}
                works={works}
              />
            )}

            {activeTab === 'manager-dashboard' && currentUser.role !== 'abastecedor' && (currentUser.role === 'admin' || currentUser.role === 'gerencial') && (
              <ManagerDashboard
                currentUser={currentUser}
                vehicles={vehicles}
                equipments={equipments}
                trips={trips}
                equipmentUsages={equipmentUsages}
                users={users}
                works={works}
                fuelInflows={fuelInflows}
                fuelDispenses={fuelDispenses}
                store={store}
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

            {activeTab === 'categories' && currentUser.role === 'admin' && (
              <AdminEquipmentTypes
                types={equipmentTypes}
                vehicleCategories={vehicleCategories}
                store={store}
              />
            )}

            {activeTab === 'works' && currentUser?.role !== 'driver' && currentUser?.role !== 'abastecedor' && (
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
                onUpdateWork={(work) => store.updateWork(work)}
              />
            )}

            {activeTab === 'history' && currentUser.role !== 'abastecedor' && (
              <TripHistory
                trips={trips}
                currentUser={currentUser}
                store={store}
              />
            )}

            {activeTab === 'equipments' && currentUser.role !== 'gerencial' && currentUser.role !== 'abastecedor' && (
              <EquipmentControl
                currentUser={currentUser}
                equipments={equipments}
                equipmentUsages={equipmentUsages}
                store={store}
                works={works}
              />
            )}

            {activeTab === 'suppliers' && currentUser?.role !== 'driver' && currentUser?.role !== 'abastecedor' && (
              <AdminSuppliers
                currentUser={currentUser}
                suppliers={suppliers}
                store={store}
              />
            )}

            {activeTab === 'tv-dashboard' && (
              <TvDashboard
                vehicles={vehicles}
                equipments={equipments}
                trips={trips}
                equipmentUsages={equipmentUsages}
                users={users}
                works={works}
                fuelInflows={fuelInflows}
                fuelDispenses={fuelDispenses}
                logisticsSchedules={logisticsSchedules}
                store={store}
              />
            )}

            {activeTab === 'fuel' && currentUser?.role !== 'driver' && (
              <FuelManagement
                currentUser={currentUser}
                works={works}
                vehicles={vehicles}
                suppliers={suppliers}
                fuelInflows={fuelInflows}
                fuelDispenses={fuelDispenses}
                users={users}
                store={store}
              />
            )}

            {activeTab === 'logistics' && currentUser?.role !== 'abastecedor' && (
              <LogisticsControl
                currentUser={currentUser}
                vehicles={vehicles}
                works={works}
                users={users}
                schedules={logisticsSchedules}
                store={store}
                onNavigateToVehicles={() => setActiveTab('vehicles')}
              />
            )}

            {/* Safety Fallback: if user tries to breach restricted tab by state hacking */}
            {(((activeTab === 'vehicles' || activeTab === 'drivers' || activeTab === 'categories') && currentUser.role !== 'admin') ||
              ((activeTab === 'suppliers' || activeTab === 'fuel' || activeTab === 'works') && currentUser.role === 'driver') ||
              ((activeTab === 'my-trips' || activeTab === 'equipments') && currentUser.role === 'gerencial') ||
              (currentUser.role === 'abastecedor' && activeTab !== 'fuel' && activeTab !== 'tv-dashboard')) && (
              <div className="p-8 bg-red-50 border border-red-200 text-red-800 rounded-3xl text-center space-y-2 animate-bounce">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                <h4 className="text-base font-bold">Acesso Restrito</h4>
                <p className="text-xs text-slate-500">
                  {currentUser.role === 'abastecedor'
                    ? 'Usuários com perfil de Controle de Abastecimento possuem acesso exclusivo ao módulo de Combustíveis da frota.'
                    : currentUser.role === 'gerencial'
                    ? 'Usuários com perfil gerencial possuem acesso exclusivo de apenas leitura ao Dashboard Resumo e Relatórios.'
                    : 'Apenas usuários autorizados podem gerenciar estes módulos do pátio.'}
                </p>
                <button
                  onClick={() => {
                    if (currentUser.role === 'abastecedor') {
                      setActiveTab('fuel');
                    } else if (currentUser.role === 'gerencial') {
                      setActiveTab('manager-dashboard');
                    } else if (currentUser.role === 'admin') {
                      setActiveTab('drivers');
                    } else {
                      setActiveTab('my-trips');
                    }
                  }}
                  className="mt-3 text-xs bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-bold"
                >
                  {currentUser.role === 'abastecedor'
                    ? 'Ir para Controle de Combustível'
                    : currentUser.role === 'gerencial'
                    ? 'Ir para Dashboard Resumo'
                    : 'Retornar para Minha Viagem'}
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
    </div>
  );
}
