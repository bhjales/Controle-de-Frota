import React, { useState } from 'react';
import {
  Truck,
  LogOut,
  User as UserIcon,
  Shield,
  Menu,
  X,
  Gauge,
  ClipboardList,
  Building2,
  Building,
  Fuel,
  Users,
  Settings,
  CarFront,
  LayoutDashboard,
  Compass
} from 'lucide-react';
import { User } from '../types';

export interface SidebarProps {
  currentUser: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

interface NavItem {
  id: string;
  htmlId: string;
  mobileHtmlId?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roleAllowed: (role?: string) => boolean;
  section: 'operacao' | 'gestao' | 'admin';
}

export function Sidebar({ currentUser, activeTab, setActiveTab, onLogout }: SidebarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    // Operação
    {
      id: 'my-trips',
      htmlId: 'tab_my_trip_btn',
      mobileHtmlId: 'tab_my_trip_mobile_btn',
      label: 'Minha Viagem',
      icon: Compass,
      roleAllowed: (role) => role !== 'gerencial',
      section: 'operacao',
    },
    {
      id: 'equipments',
      htmlId: 'tab_equipments_btn',
      mobileHtmlId: 'tab_equipments_mobile_btn',
      label: 'Maquinários / Horímetro',
      icon: Gauge,
      roleAllowed: (role) => role !== 'gerencial',
      section: 'operacao',
    },
    {
      id: 'history',
      htmlId: 'tab_history_btn',
      mobileHtmlId: 'tab_history_mobile_btn',
      label: 'Relatórios de Viagens',
      icon: ClipboardList,
      roleAllowed: () => true,
      section: 'operacao',
    },

    // Gestão & Obras
    {
      id: 'manager-dashboard',
      htmlId: 'tab_manager_dashboard_btn',
      mobileHtmlId: 'tab_manager_dashboard_mobile_btn',
      label: 'Dashboard Resumo',
      icon: LayoutDashboard,
      roleAllowed: (role) => role === 'gerencial' || role === 'admin',
      section: 'gestao',
    },
    {
      id: 'works',
      htmlId: 'tab_works_btn',
      mobileHtmlId: 'tab_works_mobile_btn',
      label: 'Obras',
      icon: Building2,
      roleAllowed: (role) => role !== 'driver',
      section: 'gestao',
    },
    {
      id: 'fuel',
      htmlId: 'tab_fuel_btn',
      mobileHtmlId: 'tab_fuel_mobile_btn',
      label: 'Combustível',
      icon: Fuel,
      roleAllowed: (role) => role !== 'driver',
      section: 'gestao',
    },
    {
      id: 'suppliers',
      htmlId: 'tab_suppliers_btn',
      mobileHtmlId: 'tab_suppliers_mobile_btn',
      label: 'Fornecedores',
      icon: Building,
      roleAllowed: (role) => role !== 'driver',
      section: 'gestao',
    },

    // Administração
    {
      id: 'vehicles',
      htmlId: 'tab_vehicles_btn',
      mobileHtmlId: 'tab_vehicles_mobile_btn',
      label: 'Veículos',
      icon: CarFront,
      roleAllowed: (role) => role === 'admin',
      section: 'admin',
    },
    {
      id: 'drivers',
      htmlId: 'tab_drivers_btn',
      mobileHtmlId: 'tab_drivers_mobile_btn',
      label: 'Usuários',
      icon: Users,
      roleAllowed: (role) => role === 'admin',
      section: 'admin',
    },
    {
      id: 'categories',
      htmlId: 'tab_equipment_types_btn',
      mobileHtmlId: 'tab_categories_mobile_btn',
      label: 'Categorias',
      icon: Settings,
      roleAllowed: (role) => role === 'admin',
      section: 'admin',
    },
  ];

  if (!currentUser) {
    return (
      <header className="bg-[#0F172A] border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-500/10 flex items-center justify-center">
              <Truck className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="font-extrabold text-white text-lg tracking-tight block leading-none font-display">FrotaControl</span>
              <span className="text-[9px] text-blue-400 font-mono tracking-wider font-bold">PLATAFORMA INTEGRADA</span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/25 px-2.5 py-1 rounded-lg font-bold tracking-wider">
            CONEXÃO OFF-LINE
          </span>
        </div>
      </header>
    );
  }

  const renderNavSection = (sectionKey: 'operacao' | 'gestao' | 'admin', title: string) => {
    const items = navItems.filter(
      (item) => item.section === sectionKey && item.roleAllowed(currentUser.role)
    );

    if (items.length === 0) return null;

    return (
      <div className="mb-4">
        <div className="px-3 mb-1 text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
          {title}
        </div>
        <div className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={item.htmlId}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group text-left ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <div
                  className={`p-1 rounded-lg transition-colors ${
                    isActive ? 'bg-white/20 text-white' : 'text-slate-400 group-hover:text-blue-400 group-hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-[#0F172A] border-b border-slate-800 sticky top-0 z-30 px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Abrir menu de navegação"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm">
              <Truck className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-white text-base tracking-tight font-display">FrotaControl</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-xs font-bold text-white block max-w-[120px] truncate">{currentUser.name}</span>
            <span className="text-[9px] text-blue-400 font-mono uppercase font-bold">{currentUser.role}</span>
          </div>
          <button
            onClick={onLogout}
            title="Sair do Sistema"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Backdrop & Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-fade-in">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[85%] bg-[#0F172A] border-r border-slate-800 h-full flex flex-col justify-between p-4 z-10 shadow-2xl overflow-y-auto">
            <div>
              {/* Header inside drawer */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="bg-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-500/10 flex items-center justify-center">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-white text-base tracking-tight block leading-none font-display">FrotaControl</span>
                    <span className="text-[9px] text-blue-400 font-mono tracking-wider font-bold">MENU PRINCIPAL</span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                  aria-label="Fechar menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Sections */}
              <nav className="space-y-2">
                {renderNavSection('operacao', 'Operação')}
                {renderNavSection('gestao', 'Gestão & Obras')}
                {renderNavSection('admin', 'Administração')}
              </nav>
            </div>

            {/* Bottom User Area inside drawer */}
            <div className="pt-4 border-t border-slate-800 mt-4">
              <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 bg-slate-800 rounded-lg text-slate-300 shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{currentUser.role.toUpperCase()}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  title="Sair do Sistema"
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Lateral Menu) */}
      <aside
        id="app_sidebar"
        className="hidden md:flex flex-col justify-between w-64 bg-[#0F172A] border-r border-slate-800 min-h-screen sticky top-0 shrink-0 z-30 shadow-xl"
      >
        {/* Brand & Navigation */}
        <div className="flex-1 flex flex-col p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3 px-2 py-3 mb-4 border-b border-slate-800/80">
            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-500/10 flex items-center justify-center shrink-0">
              <Truck className="w-5.5 h-5.5" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-white text-lg tracking-tight block leading-none font-display">FrotaControl</span>
              <span className="text-[9px] text-blue-400 font-mono tracking-wider font-bold">PLATAFORMA INTEGRADA</span>
            </div>
          </div>

          {/* Navigation Links grouped by categories */}
          <nav className="flex-1 space-y-1">
            {renderNavSection('operacao', 'Operação')}
            {renderNavSection('gestao', 'Gestão & Obras')}
            {renderNavSection('admin', 'Administração')}
          </nav>
        </div>

        {/* User Card & Logout at bottom */}
        <div className="p-4 border-t border-slate-800/80 bg-[#0B1120]/70">
          <div className="flex items-center justify-between gap-2 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3 shadow-inner">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-slate-800 rounded-xl text-slate-300 border border-slate-700 shrink-0">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate leading-tight">{currentUser.name}</span>
                <div className="mt-1">
                  {currentUser.role === 'admin' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono leading-none">
                      <Shield className="w-2.5 h-2.5" />
                      ADMIN
                    </span>
                  ) : currentUser.role === 'gerencial' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono leading-none">
                      <Shield className="w-2.5 h-2.5" />
                      GERENCIAL
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700 font-mono leading-none">
                      MOTORISTA
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              id="logout_btn"
              onClick={onLogout}
              title="Sair do Sistema"
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20 active:scale-95 cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
