import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  ToggleLeft, 
  ToggleRight, 
  Phone, 
  Mail, 
  MapPin, 
  CheckCircle, 
  AlertCircle, 
  Wrench, 
  Package, 
  X, 
  Copy, 
  Check, 
  Filter, 
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { User, Supplier, SupplierCategory } from '../types';
import { FleetStore } from '../store/fleetStore';

interface AdminSuppliersProps {
  currentUser: User | null;
  suppliers: Supplier[];
  store: FleetStore;
}

// CNPJ mask helper
export function maskCNPJ(val: string): string {
  const clean = val.replace(/\D/g, '').slice(0, 14);
  return clean
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

// Phone mask helper
export function maskPhone(val: string): string {
  const clean = val.replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 10) {
    return clean
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return clean
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

// Brazilian CNPJ checksum validator
export function validateCNPJ(cnpj: string): boolean {
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false;

  let length = clean.length - 2;
  let numbers = clean.substring(0, length);
  const digits = clean.substring(length);
  let sum = 0;
  let pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += Number(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== Number(digits.charAt(0))) return false;

  length = length + 1;
  numbers = clean.substring(0, length);
  sum = 0;
  pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += Number(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== Number(digits.charAt(1))) return false;

  return true;
}

export function AdminSuppliers({ currentUser, suppliers, store }: AdminSuppliersProps) {
  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form inputs
  const [cnpj, setCnpj] = useState('');
  const [corporateName, setCorporateName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [category, setCategory] = useState<SupplierCategory>('prestador');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [servicesOrProducts, setServicesOrProducts] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Search & Filtering
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'prestador' | 'fornecedor'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Feedback notifications
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Delete modal state
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  // Open modal for creation
  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setCnpj('');
    setCorporateName('');
    setTradeName('');
    setCategory('prestador');
    setContactName('');
    setPhone('');
    setEmail('');
    setCity('');
    setState('');
    setServicesOrProducts('');
    setStatus('active');
    setFeedbackError('');
    setFeedbackSuccess('');
    setIsFormOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setCnpj(sup.cnpj);
    setCorporateName(sup.corporateName);
    setTradeName(sup.tradeName || '');
    setCategory(sup.category);
    setContactName(sup.contactName || '');
    setPhone(sup.phone || '');
    setEmail(sup.email || '');
    setCity(sup.city || '');
    setState(sup.state || '');
    setServicesOrProducts(sup.servicesOrProducts || '');
    setStatus(sup.status);
    setFeedbackError('');
    setFeedbackSuccess('');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingSupplier(null);
    setFeedbackError('');
  };

  // Handle Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError('');
    setFeedbackSuccess('');

    const rawCnpj = cnpj.replace(/\D/g, '');
    if (!rawCnpj) {
      setFeedbackError('Por favor, informe o CNPJ.');
      return;
    }
    if (rawCnpj.length !== 14) {
      setFeedbackError('O CNPJ deve conter exatamente 14 dígitos numéricos.');
      return;
    }

    if (!corporateName.trim()) {
      setFeedbackError('Por favor, preencha o Nome da Razão Social.');
      return;
    }

    if (!category) {
      setFeedbackError('Selecione uma categoria (Prestador de Serviço ou Fornecedor).');
      return;
    }

    if (state.trim() && state.trim().length !== 2) {
      setFeedbackError('A UF do Estado deve conter exatamente 2 letras (Ex: SP, MG, RJ).');
      return;
    }

    if (editingSupplier) {
      const res = store.updateSupplier({
        ...editingSupplier,
        cnpj,
        corporateName: corporateName.trim(),
        tradeName: tradeName.trim() || undefined,
        category,
        contactName: contactName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim().toUpperCase() || undefined,
        servicesOrProducts: servicesOrProducts.trim() || undefined,
        status
      });

      if (res.success) {
        setFeedbackSuccess(res.message);
        setIsFormOpen(false);
        setEditingSupplier(null);
        setTimeout(() => setFeedbackSuccess(''), 4000);
      } else {
        setFeedbackError(res.message);
      }
    } else {
      const res = store.createSupplier({
        cnpj,
        corporateName: corporateName.trim(),
        tradeName: tradeName.trim() || undefined,
        category,
        contactName: contactName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim().toUpperCase() || undefined,
        servicesOrProducts: servicesOrProducts.trim() || undefined,
        status
      });

      if (res.success) {
        setFeedbackSuccess(res.message);
        setIsFormOpen(false);
        setTimeout(() => setFeedbackSuccess(''), 4000);
      } else {
        setFeedbackError(res.message);
      }
    }
  };

  // Toggle status
  const handleToggleStatus = (id: string) => {
    const res = store.toggleSupplierStatus(id);
    if (res.success) {
      setFeedbackSuccess(res.message);
      setTimeout(() => setFeedbackSuccess(''), 3000);
    }
  };

  // Delete handler
  const confirmDelete = () => {
    if (!supplierToDelete) return;
    const res = store.deleteSupplier(supplierToDelete.id);
    if (res.success) {
      setFeedbackSuccess(res.message);
      setSupplierToDelete(null);
      setTimeout(() => setFeedbackSuccess(''), 3000);
    }
  };

  // Copy CNPJ
  const handleCopyCnpj = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(item => {
      // Category filter
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }
      // Search term
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesCorporate = item.corporateName.toLowerCase().includes(query);
        const matchesTrade = item.tradeName?.toLowerCase().includes(query);
        const matchesCnpj = item.cnpj.replace(/\D/g, '').includes(query.replace(/\D/g, ''));
        const matchesCity = item.city?.toLowerCase().includes(query);
        const matchesServices = item.servicesOrProducts?.toLowerCase().includes(query);
        const matchesContact = item.contactName?.toLowerCase().includes(query);

        return matchesCorporate || matchesTrade || matchesCnpj || matchesCity || matchesServices || matchesContact;
      }
      return true;
    });
  }, [suppliers, categoryFilter, statusFilter, search]);

  // Metrics
  const totalCount = suppliers.length;
  const prestadoresCount = suppliers.filter(s => s.category === 'prestador').length;
  const fornecedoresCount = suppliers.filter(s => s.category === 'fornecedor').length;
  const activeCount = suppliers.filter(s => s.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-display">
                  Fornecedores & Prestadores
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Controle cadastral de oficinas, empresas parceiras, autopeças e postos conveniados.
                </p>
              </div>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Novo Cadastro
            </button>
          )}
        </div>

        {/* Global Feedback notification */}
        {feedbackSuccess && (
          <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-semibold animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{feedbackSuccess}</span>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
          <div className="p-4 bg-slate-50/70 border border-slate-150 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Geral</span>
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 font-display">{totalCount}</p>
            <span className="text-[10px] text-slate-500 font-medium">{activeCount} ativos no sistema</span>
          </div>

          <div className="p-4 bg-indigo-50/50 border border-indigo-150 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Prestadores</span>
              <Wrench className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-extrabold text-indigo-900 mt-1 font-display">{prestadoresCount}</p>
            <span className="text-[10px] text-indigo-600 font-medium">Oficinas, mecânicas, serviços</span>
          </div>

          <div className="p-4 bg-emerald-50/50 border border-emerald-150 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Fornecedores</span>
              <Package className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-900 mt-1 font-display">{fornecedoresCount}</p>
            <span className="text-[10px] text-emerald-600 font-medium">Peças, combustíveis, insumos</span>
          </div>

          <div className="p-4 bg-amber-50/50 border border-amber-150 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Taxa de Ativos</span>
              <Layers className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-extrabold text-amber-900 mt-1 font-display">
              {totalCount > 0 ? `${Math.round((activeCount / totalCount) * 100)}%` : '0%'}
            </p>
            <span className="text-[10px] text-amber-600 font-medium">Habilitados para ordens e compras</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por Razão Social, Fantasia, CNPJ, Cidade ou Serviços..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                categoryFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setCategoryFilter('prestador')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                categoryFilter === 'prestador'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Wrench className="w-3 h-3" />
              Prestadores
            </button>
            <button
              onClick={() => setCategoryFilter('fornecedor')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                categoryFilter === 'fornecedor'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Package className="w-3 h-3" />
              Fornecedores
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Status: Todos</option>
            <option value="active">Apenas Ativos</option>
            <option value="inactive">Apenas Inativos</option>
          </select>
        </div>
      </div>

      {/* Main List Table / Cards */}
      {filteredSuppliers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Nenhum cadastro encontrado</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search || categoryFilter !== 'all' || statusFilter !== 'all'
              ? 'Tente ajustar os filtros ou os termos de pesquisa digitados acima.'
              : 'Nenhum fornecedor ou prestador de serviço cadastrado até o momento.'}
          </p>
          {isAdmin && !search && categoryFilter === 'all' && (
            <button
              onClick={handleOpenCreate}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-blue-700 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Primeiro Parceiro
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-150 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th className="py-3.5 px-5">Empresa / Razão Social</th>
                  <th className="py-3.5 px-4">CNPJ</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4">Contato / Localidade</th>
                  <th className="py-3.5 px-4">Serviços / Produtos</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  {isAdmin && <th className="py-3.5 px-5 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.map((sup) => {
                  const isPrestador = sup.category === 'prestador';
                  return (
                    <tr key={sup.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Corporate Name */}
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900 text-sm">{sup.corporateName}</div>
                        {sup.tradeName && (
                          <div className="text-[11px] text-slate-500 font-medium">
                            Fantasia: <span className="text-slate-700">{sup.tradeName}</span>
                          </div>
                        )}
                      </td>

                      {/* CNPJ */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 font-mono text-slate-700 font-semibold bg-slate-100/80 px-2 py-1 rounded-md text-[11px]">
                          <span>{sup.cnpj}</span>
                          <button
                            onClick={() => handleCopyCnpj(sup.cnpj, sup.id)}
                            title="Copiar CNPJ"
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            {copiedId === sup.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {isPrestador ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-display">
                            <Wrench className="w-3 h-3" />
                            PRESTADOR DE SERVIÇO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-display">
                            <Package className="w-3 h-3" />
                            FORNECEDOR
                          </span>
                        )}
                      </td>

                      {/* Contact & Location */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          {sup.contactName && (
                            <div className="font-semibold text-slate-800 text-[11px]">
                              Resp: {sup.contactName}
                            </div>
                          )}
                          {sup.phone && (
                            <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{sup.phone}</span>
                            </div>
                          )}
                          {sup.email && (
                            <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-[160px]">{sup.email}</span>
                            </div>
                          )}
                          {(sup.city || sup.state) && (
                            <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>
                                {sup.city}
                                {sup.city && sup.state ? ' - ' : ''}
                                {sup.state}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Services / Products */}
                      <td className="py-4 px-4 max-w-xs">
                        <p className="text-slate-600 line-clamp-2 text-[11px] leading-relaxed">
                          {sup.servicesOrProducts || <span className="text-slate-400 italic">Nenhum escopo especificado</span>}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-3 text-center whitespace-nowrap">
                        <button
                          disabled={!isAdmin}
                          onClick={() => handleToggleStatus(sup.id)}
                          title={isAdmin ? 'Clique para alternar o status' : undefined}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono transition-all ${
                            sup.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          } ${isAdmin ? 'cursor-pointer hover:opacity-85' : 'cursor-default'}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${sup.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {sup.status === 'active' ? 'ATIVO' : 'INATIVO'}
                        </button>
                      </td>

                      {/* Actions */}
                      {isAdmin && (
                        <td className="py-4 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(sup)}
                              title="Editar Informações"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setSupplierToDelete(sup)}
                              title="Excluir Registro"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet Cards View */}
          <div className="lg:hidden divide-y divide-slate-100">
            {filteredSuppliers.map((sup) => {
              const isPrestador = sup.category === 'prestador';
              return (
                <div key={sup.id} className="p-4 sm:p-5 space-y-3 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{sup.corporateName}</h4>
                      {sup.tradeName && (
                        <p className="text-xs text-slate-500 font-medium">{sup.tradeName}</p>
                      )}
                    </div>
                    {isPrestador ? (
                      <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Wrench className="w-2.5 h-2.5" />
                        PRESTADOR
                      </span>
                    ) : (
                      <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Package className="w-2.5 h-2.5" />
                        FORNECEDOR
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 text-[11px] font-semibold">
                      CNPJ: {sup.cnpj}
                    </span>
                    <button
                      onClick={() => handleToggleStatus(sup.id)}
                      disabled={!isAdmin}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono ${
                        sup.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {sup.status === 'active' ? 'ATIVO' : 'INATIVO'}
                    </button>
                  </div>

                  {sup.servicesOrProducts && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {sup.servicesOrProducts}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                    {sup.contactName && <span>Resp: <strong>{sup.contactName}</strong></span>}
                    {sup.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {sup.phone}
                      </span>
                    )}
                    {sup.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {sup.email}
                      </span>
                    )}
                    {(sup.city || sup.state) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {sup.city}{sup.city && sup.state ? ' - ' : ''}{sup.state}
                      </span>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleOpenEdit(sup)}
                        className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-all flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => setSupplierToDelete(sup)}
                        className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-all flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          CREATE / EDIT MODAL DRAWER
          ======================================================== */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 rounded-xl text-white">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight font-display">
                    {editingSupplier ? 'Editar Fornecedor / Prestador' : 'Novo Cadastro de Parceiro'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Preencha as informações obrigatórias para salvar no sistema
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseForm}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {feedbackError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-semibold animate-fade-in">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                  <span>{feedbackError}</span>
                </div>
              )}

              {/* Category Selector (Prestador vs Fornecedor) */}
              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                  Categoria do Parceiro *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCategory('prestador')}
                    className={`py-3 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      category === 'prestador'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-800 shadow-sm ring-1 ring-indigo-500'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Wrench className="w-4 h-4 text-indigo-600" />
                    <span>Prestador de Serviço</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('fornecedor')}
                    className={`py-3 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      category === 'fornecedor'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm ring-1 ring-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Package className="w-4 h-4 text-emerald-600" />
                    <span>Fornecedor</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Prestador: oficinas, mecânicos, funilaria, guincho. Fornecedor: combustíveis, óleos, insumos e parceiros comerciais.
                </p>
              </div>

              {/* CNPJ & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                    CNPJ *
                  </label>
                  <input
                    type="text"
                    required
                    value={cnpj}
                    onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    className="w-full px-3.5 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  {cnpj && cnpj.replace(/\D/g, '').length === 14 && (
                    <span className={`text-[10px] font-bold block ${validateCNPJ(cnpj) ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {validateCNPJ(cnpj) ? '✓ Formato de CNPJ válido' : '⚠️ Atenção: dígitos verificadores do CNPJ divergentes'}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>

              {/* Razão Social */}
              <div className="space-y-1">
                <label className="block text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  Nome Razão Social *
                </label>
                <input
                  type="text"
                  required
                  value={corporateName}
                  onChange={(e) => setCorporateName(e.target.value)}
                  placeholder="Ex: Auto Mecânica São Cristóvão Ltda"
                  className="w-full px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Nome Fantasia */}
              <div className="space-y-1">
                <label className="block text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  Nome Fantasia <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  placeholder="Ex: Mecânica do Cristóvão"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Contato, Telefone e E-mail */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                    Responsável
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Nome do contato"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                    Telefone / Whats
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(maskPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@empresa.com"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Cidade e UF */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                    Município / Cidade
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: São Paulo"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                    UF (Estado)
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    placeholder="SP"
                    className="w-full px-3 py-2 text-xs uppercase font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none text-center"
                  />
                </div>
              </div>

              {/* Serviços Prestados / Produtos Fornecidos */}
              <div className="space-y-1">
                <label className="block text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  Serviços Prestados / Produtos Fornecidos
                </label>
                <textarea
                  rows={2}
                  value={servicesOrProducts}
                  onChange={(e) => setServicesOrProducts(e.target.value)}
                  placeholder="Ex: Troca de óleo, retífica de motor, injeção eletrônica, fornecimento de baterias..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all cursor-pointer font-display"
                >
                  {editingSupplier ? 'Salvar Alterações' : 'Salvar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          DELETE CONFIRMATION MODAL
          ======================================================== */}
      {supplierToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center animate-scale-in">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-150">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-slate-900 font-display">Confirmar Exclusão</h4>
              <p className="text-xs text-slate-500 mt-1">
                Tem certeza que deseja excluir o cadastro de <strong>{supplierToDelete.corporateName}</strong> (CNPJ: {supplierToDelete.cnpj})?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setSupplierToDelete(null)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default AdminSuppliers;
