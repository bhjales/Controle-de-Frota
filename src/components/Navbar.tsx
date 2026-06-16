import React from 'react';
import { Truck, LogOut, User as UserIcon, Shield } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  currentUser: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export function Navbar({ currentUser, activeTab, setActiveTab, onLogout }: NavbarProps) {
  const mobileTabsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (mobileTabsRef.current) {
      const activeEl = mobileTabsRef.current.querySelector('.bg-blue-600') as HTMLElement;
      if (activeEl) {
        const container = mobileTabsRef.current;
        const scrollLeft = activeEl.offsetLeft - (container.clientWidth / 2) + (activeEl.clientWidth / 2);
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [activeTab]);

  return (
    <nav id="app_navbar" className="bg-[#0F172A] border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Branding */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center gap-2.5">
              <div className="bg-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-500/10 flex items-center justify-center">
                <Truck className="w-5.5 h-5.5" />
              </div>
              <div>
                <span className="font-extrabold text-white text-lg tracking-tight block leading-none font-display">FrotaControl</span>
                <span className="text-[9px] text-blue-400 font-mono tracking-wider font-bold">PLATAFORMA INTEGRADA</span>
              </div>
            </div>

            {/* Main Tabs (Visible if logged in) */}
            {currentUser && (
              <div className="hidden md:ml-8 md:flex md:space-x-1.5">
                {currentUser.role !== 'gerencial' && (
                  <button
                    id="tab_my_trip_btn"
                    onClick={() => setActiveTab('my-trips')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'my-trips'
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/10'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    🚙 Minha Viagem
                  </button>
                )}

                {(currentUser.role === 'gerencial' || currentUser.role === 'admin') && (
                  <button
                    id="tab_manager_dashboard_btn"
                    onClick={() => setActiveTab('manager-dashboard')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'manager-dashboard'
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/10'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    📊 Dashboard Resumo
                  </button>
                )}

                {currentUser.role === 'admin' && (
                  <button
                    id="tab_vehicles_btn"
                    onClick={() => setActiveTab('vehicles')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'vehicles'
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/10'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    🚘 Veículos
                  </button>
                )}

                {currentUser.role !== 'gerencial' && (
                  <button
                    id="tab_equipments_btn"
                    onClick={() => setActiveTab('equipments')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'equipments'
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/10'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    🚜 Maquinários / Horímetro
                  </button>
                )}

                {currentUser.role === 'admin' && (
                  <>
                    <button
                      id="tab_drivers_btn"
                      onClick={() => setActiveTab('drivers')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'drivers'
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/10'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                      }`}
                    >
                      👥 Usuários
                    </button>
                    <button
                      id="tab_equipment_types_btn"
                      onClick={() => setActiveTab('categories')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'categories'
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/10'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                      }`}
                    >
                      ⚙️ Categorias
                    </button>
                  </>
                )}

                <button
                  id="tab_history_btn"
                  onClick={() => setActiveTab('history')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'history'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/10'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  📋 Relatórios de Viagens
                </button>

                {currentUser.role !== 'driver' && (
                  <button
                    id="tab_works_btn"
                    onClick={() => setActiveTab('works')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'works'
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/10'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    🏗️ Obras
                  </button>
                )}
              </div>
            )}
          </div>

          {/* User Profile Info & Logout */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="hidden sm:flex flex-col items-end text-right">
                  <span className="text-xs font-bold text-white leading-tight">{currentUser.name}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {currentUser.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                        <Shield className="w-2.5 h-2.5" />
                        ADMINISTRADOR
                      </span>
                    ) : currentUser.role === 'gerencial' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                        <Shield className="w-2.5 h-2.5" />
                        GERENCIAL
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        MOTORISTA
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-2 bg-slate-800 rounded-xl border border-slate-700 text-slate-300 flex items-center justify-center">
                  <UserIcon className="w-4 h-4" />
                </div>

                <button
                  id="logout_btn"
                  onClick={onLogout}
                  title="Sair do Sistema"
                  className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-xl transition-all border border-transparent hover:border-red-500/20 active:scale-95 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/25 px-2.5 py-1 rounded-lg font-bold tracking-wider">
                CONEXÃO OFF-LINE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tabs (Visible if logged in) */}
      {currentUser && (
        <div 
          id="mobile_tabs_bar" 
          ref={mobileTabsRef}
          className="md:hidden border-t border-slate-800 bg-[#0F172A]/90 px-2.5 py-2.5 overflow-x-auto flex gap-1.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent select-none"
        >
          {currentUser.role !== 'gerencial' && (
            <button
              onClick={() => setActiveTab('my-trips')}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'my-trips'
                  ? 'bg-blue-600 text-white shadow-md font-bold'
                  : 'text-slate-300 bg-slate-900/50 hover:bg-slate-800 hover:text-white border border-slate-800/45'
              }`}
            >
              🚙 Minha Viagem
            </button>
          )}

          {(currentUser.role === 'gerencial' || currentUser.role === 'admin') && (
            <button
              onClick={() => setActiveTab('manager-dashboard')}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'manager-dashboard'
                  ? 'bg-blue-600 text-white shadow-md font-bold'
                  : 'text-slate-300 bg-slate-900/50 hover:bg-slate-800 hover:text-white border border-slate-800/45'
              }`}
            >
              📊 Dashboard Resumo
            </button>
          )}
          
          {currentUser.role === 'admin' && (
            <button
              onClick={() => setActiveTab('vehicles')}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'vehicles'
                  ? 'bg-blue-600 text-white shadow-md font-bold'
                  : 'text-slate-300 bg-slate-900/50 hover:bg-slate-800 hover:text-white border border-slate-800/45'
              }`}
            >
              🚘 Veículos
            </button>
          )}

          {currentUser.role !== 'gerencial' && (
            <button
              id="tab_equipments_mobile_btn"
              onClick={() => setActiveTab('equipments')}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'equipments'
                  ? 'bg-blue-600 text-white shadow-md font-bold'
                  : 'text-slate-300 bg-slate-900/50 hover:bg-slate-800 hover:text-white border border-slate-800/45'
              }`}
            >
              🚜 Maquinários
            </button>
          )}

          {currentUser.role === 'admin' && (
            <>
              <button
                onClick={() => setActiveTab('drivers')}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  activeTab === 'drivers'
                    ? 'bg-blue-600 text-white shadow-md font-bold'
                    : 'text-slate-300 bg-slate-900/50 hover:bg-slate-800 hover:text-white border border-slate-800/45'
                }`}
              >
                👥 Usuários
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  activeTab === 'categories'
                    ? 'bg-blue-600 text-white shadow-md font-bold'
                    : 'text-slate-300 bg-slate-900/50 hover:bg-slate-800 hover:text-white border border-slate-800/45'
                }`}
              >
                ⚙️ Categorias
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab('history')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-md font-bold'
                : 'text-slate-300 bg-slate-900/50 hover:bg-slate-800 hover:text-white border border-slate-800/45'
            }`}
          >
            📋 Relatórios
          </button>

          {currentUser.role !== 'driver' && (
            <button
              id="tab_works_mobile_btn"
              onClick={() => setActiveTab('works')}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'works'
                  ? 'bg-blue-600 text-white shadow-md font-bold'
                  : 'text-slate-300 bg-slate-900/50 hover:bg-slate-800 hover:text-white border border-slate-800/45'
              }`}
            >
              🏗️ Obras
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
export default Navbar;
