import { User, UserRole, Vehicle, Trip, CheckInDetails, CheckOutDetails, Equipment, EquipmentCheckInDetails, EquipmentCheckOutDetails, EquipmentUsage, ConstructionWork, EquipmentType, VehicleCategory, MaintenanceLog, Supplier, SupplierCategory, FuelInflow, FuelDispense, FuelDispenseType, FiscalDocType, WorkFuelBalance, LogisticsSchedule, LogisticsAllocationType, LogisticsScheduleStatus } from '../types';
import { supabase } from '../lib/supabase';

// Limpa qualquer resquício antigo em armazenamento do navegador (nenhum dado é salvo localmente)
function clearLegacyBrowserStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith('ff_')) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => window.localStorage.removeItem(k));
  } catch {
    // Ignore storage access restrictions
  }
  try {
    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith('ff_')) sessionKeysToRemove.push(k);
    }
    sessionKeysToRemove.forEach(k => window.sessionStorage.removeItem(k));
  } catch {
    // Ignore storage access restrictions
  }
}

export class FleetStore {
  private static instance: FleetStore;

  public users: User[] = [];
  public vehicles: Vehicle[] = [];
  public trips: Trip[] = [];
  public equipments: Equipment[] = [];
  public equipmentUsages: EquipmentUsage[] = [];
  public works: ConstructionWork[] = [];
  public equipmentTypes: EquipmentType[] = [];
  public vehicleCategories: VehicleCategory[] = [];
  public suppliers: Supplier[] = [];
  public fuelInflows: FuelInflow[] = [];
  public fuelDispenses: FuelDispense[] = [];
  public logisticsSchedules: LogisticsSchedule[] = [];
  public currentUser: User | null = null;

  public isLoadingFromDb = false;
  public lastSyncError: string | null = null;

  // Snapshot for differential syncing
  private previousState: Record<string, string> = {};
  private isSyncing = false;
  private syncQueued = false;
  private hasLoadedInitial = false;
  private realtimeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  // Listeners list for component re-renders
  private listeners: (() => void)[] = [];

  private updatePreviousState(tableKey?: string) {
    const map: Record<string, string> = {
      users: JSON.stringify(this.users),
      vehicles: JSON.stringify(this.vehicles),
      trips: JSON.stringify(this.trips),
      equipments: JSON.stringify(this.equipments),
      equipmentUsages: JSON.stringify(this.equipmentUsages),
      works: JSON.stringify(this.works),
      equipmentTypes: JSON.stringify(this.equipmentTypes),
      vehicleCategories: JSON.stringify(this.vehicleCategories),
      suppliers: JSON.stringify(this.suppliers),
      fuelInflows: JSON.stringify(this.fuelInflows),
      fuelDispenses: JSON.stringify(this.fuelDispenses),
      logisticsSchedules: JSON.stringify(this.logisticsSchedules),
    };
    if (tableKey) {
      this.previousState[tableKey] = map[tableKey];
    } else {
      this.previousState = map;
    }
  }

  private getChangedItems(tableName: string, currentArray: any[]) {
    const prevStateStr = this.previousState[tableName];
    if (!prevStateStr) return currentArray; // First time sync, push everything (shouldn't happen)
    
    try {
      const prevArray = JSON.parse(prevStateStr) as any[];
      const prevMap = new Map(prevArray.map(item => [item.id, JSON.stringify(item)]));
      
      const changed: any[] = [];
      for (const item of currentArray) {
        const itemStr = JSON.stringify(item);
        if (prevMap.get(item.id) !== itemStr) {
          changed.push(item);
        }
      }
      return changed;
    } catch (e) {
      return currentArray; // Fallback to all if error
    }
  }

  public async refreshFromDatabase() {
    await this.loadFromSupabase();
  }

  private async loadFromSupabase() {
    if (this.isLoadingFromDb) return;
    if (this.hasLoadedInitial && (this.isSyncing || this.syncQueued)) {
      return; // Never overwrite pending local changes while sync is in flight
    }
    this.isLoadingFromDb = true;
    try {
      const fetchTable = async (tableName: string) => {
        try {
          const { data, error } = await supabase.from(tableName).select('*');
          if (error) {
            console.warn(`Error loading table '${tableName}' from Supabase:`, error.message);
            return null; // Return null on error so we don't overwrite with empty
          }
          return data || []; // Return empty array on success if no data
        } catch (e: any) {
          console.warn(`Exception loading table '${tableName}' from Supabase:`, e?.message || e);
          return null; // Return null on error
        }
      };

      const [
        users,
        vehicles,
        trips,
        equipments,
        equipmentUsages,
        works,
        equipmentTypes,
        vehicleCategories,
        maintenanceLogs,
        suppliers,
        fuelInflows,
        fuelDispenses,
        logisticsSchedules
      ] = await Promise.all([
        fetchTable('users'),
        fetchTable('vehicles'),
        fetchTable('trips'),
        fetchTable('equipments'),
        fetchTable('equipment_usages'),
        fetchTable('construction_works'),
        fetchTable('equipment_types'),
        fetchTable('vehicle_categories'),
        fetchTable('maintenance_logs'),
        fetchTable('suppliers'),
        fetchTable('fuel_inflows'),
        fetchTable('fuel_dispenses'),
        fetchTable('logistics_schedules')
      ]);

      if (users !== null) {
        this.users = (users as User[]).map(u => ({
          ...u,
          authorizedAssetIds: Array.isArray(u.authorizedAssetIds) ? u.authorizedAssetIds : []
        }));
        if (!this.users.some(u => u.loginId === 'admin' || u.role === 'admin')) {
          this.users.unshift({
            id: 'user-admin-default',
            loginId: 'admin',
            name: 'Administrador Geral',
            email: 'admin@frota.com.br',
            cpf: '111.111.111-11',
            licenseNumber: 'Não Aplicável',
            role: 'admin',
            isActive: true,
            password: '123456',
            isApproved: true,
            createdAt: '2025-01-01T00:00:00.000Z'
          });
        }
        if (!this.users.some(u => u.loginId === 'abastecedor' || u.role === 'abastecedor')) {
          this.users.push({
            id: 'user-abastecedor-demo',
            loginId: 'abastecedor',
            name: 'Operador de Abastecimento',
            email: 'abastecedor@frota.com.br',
            cpf: '000.000.000-00',
            licenseNumber: 'Não Aplicável',
            role: 'abastecedor',
            isActive: true,
            password: '123456',
            isApproved: true,
            createdAt: '2025-01-01T00:00:00.000Z'
          });
        }
        if (this.currentUser) {
          const freshCurrent = this.users.find(u => u.id === this.currentUser?.id);
          if (freshCurrent) {
            this.currentUser = freshCurrent;
          }
        }
      }
      if (works !== null) this.works = works as ConstructionWork[];
      if (equipmentTypes !== null) this.equipmentTypes = equipmentTypes as EquipmentType[];
      if (vehicleCategories !== null) this.vehicleCategories = vehicleCategories as VehicleCategory[];
      if (trips !== null) this.trips = trips as Trip[];
      if (equipmentUsages !== null) this.equipmentUsages = equipmentUsages as EquipmentUsage[];
      if (suppliers !== null) this.suppliers = suppliers as Supplier[];
      if (fuelInflows !== null) this.fuelInflows = fuelInflows as FuelInflow[];
      if (fuelDispenses !== null) this.fuelDispenses = fuelDispenses as FuelDispense[];
      if (logisticsSchedules !== null) this.logisticsSchedules = logisticsSchedules as LogisticsSchedule[];
      
      const vData = vehicles as Vehicle[] | null;
      const eData = equipments as Equipment[] | null;
      const mLogs = maintenanceLogs as any[] | null;

      // Re-attach maintenance logs
      if (mLogs !== null) {
        if (vData !== null) {
          vData.forEach(v => {
            const logsFromTable = mLogs.filter(log => log.assetId === v.id && log.assetType === 'vehicle');
            if (logsFromTable.length > 0) {
              v.maintenanceHistory = logsFromTable;
            } else if (!Array.isArray(v.maintenanceHistory)) {
              v.maintenanceHistory = [];
            }
          });
        }
        if (eData !== null) {
          eData.forEach(e => {
            const logsFromTable = mLogs.filter(log => log.assetId === e.id && log.assetType === 'equipment');
            if (logsFromTable.length > 0) {
              e.maintenanceHistory = logsFromTable;
            } else if (!Array.isArray(e.maintenanceHistory)) {
              e.maintenanceHistory = [];
            }
          });
        }
      }

      if (vData !== null) {
        this.vehicles = vData.map(v => {
          const isActive = v.isActive !== false;
          const mappedStatus = !isActive && v.status !== 'in_use' ? 'inactive' : v.status;
          return {
            ...v,
            isActive,
            hasLogisticsControl: Boolean(v.hasLogisticsControl),
            status: mappedStatus,
          };
        });
      }
      if (eData !== null) this.equipments = eData;

      // Consistency check: ensure only assets in active trips/usages are marked as in_use
      let needsSync = false;
      
      this.vehicles.forEach(v => {
        const isInActiveTrip = this.trips.some(t => t.status === 'active' && t.vehicleId === v.id);
        if (isInActiveTrip && v.status !== 'in_use') {
          v.status = 'in_use';
          needsSync = true;
        } else if (!isInActiveTrip && v.status === 'in_use') {
          v.status = v.isActive === false ? 'inactive' : 'available';
          needsSync = true;
        }
      });
      
      this.equipments.forEach(e => {
        const isInActiveUsage = this.equipmentUsages.some(u => u.status === 'active' && u.equipmentId === e.id);
        if (isInActiveUsage && e.status !== 'in_use') {
          e.status = 'in_use';
          needsSync = true;
        } else if (!isInActiveUsage && e.status === 'in_use') {
          e.status = 'available';
          needsSync = true;
        }
      });
      
      this.hasLoadedInitial = true;
      this.updatePreviousState();
      this.persistLocalState();
      this.triggerListeners();
      
      if (needsSync) {
        this.backgroundSync();
      }
    } catch (error) {
      console.warn("Exception during overall Supabase state loader:", error);
    } finally {
      this.isLoadingFromDb = false;
    }
  }

  private async syncTable(table: string, items: any[]): Promise<boolean> {
    if (!items || items.length === 0) return true;
    try {
      const userIds = new Set(this.users.map(u => u.id));
      const workIds = new Set(this.works.map(w => w.id));
      const vehicleIds = new Set(this.vehicles.map(v => v.id));
      const equipmentIds = new Set(this.equipments.map(e => e.id));

      const getSanitizedItems = (colsToExclude: string[]) => {
        return items.map(item => {
          if (table === 'vehicles') {
            const copy: Record<string, any> = this.sanitizeVehicleForSupabase(item as Vehicle);
            for (const col of colsToExclude) {
              delete copy[col];
            }
            return copy;
          }

          if (table === 'users') {
            const copy: Record<string, any> = this.sanitizeUserForSupabase(item as User);
            for (const col of colsToExclude) {
              delete copy[col];
            }
            return copy;
          }

          const copy = { ...item };
          if (table === 'equipments') {
            delete copy.maintenanceHistory;
          }

          // Clean up workId foreign key
          if ('workId' in copy && copy.workId && !workIds.has(copy.workId)) {
            copy.workId = null;
          }

          // Clean up trips relation keys
          if (table === 'trips') {
            if (copy.driverId && !userIds.has(copy.driverId)) {
              copy.driverId = null;
            }
            if (copy.vehicleId && !vehicleIds.has(copy.vehicleId)) {
              copy.vehicleId = null;
            }
            if (copy.checkIn && copy.checkIn.photo) {
              copy.checkIn.photo = '';
            }
            if (copy.checkOut && copy.checkOut.photo) {
              copy.checkOut.photo = '';
            }
          }

          // Clean up equipment_usages relation keys
          if (table === 'equipment_usages') {
            if (copy.operatorId && !userIds.has(copy.operatorId)) {
              copy.operatorId = null;
            }
            if (copy.equipmentId && !equipmentIds.has(copy.equipmentId)) {
              copy.equipmentId = null;
            }
            if (copy.checkIn && copy.checkIn.photo) {
              copy.checkIn.photo = '';
            }
            if (copy.checkOut && copy.checkOut.photo) {
              copy.checkOut.photo = '';
            }
          }

          // Clean up logistics_schedules relation keys
          if (table === 'logistics_schedules') {
            if (copy.driverId && !userIds.has(copy.driverId)) {
              copy.driverId = null;
            }
            if (copy.vehicleId && !vehicleIds.has(copy.vehicleId)) {
              copy.vehicleId = null;
            }
            if (copy.originWorkId && !workIds.has(copy.originWorkId)) {
              copy.originWorkId = null;
            }
          }

          // Apply dynamic column exclusion list
          for (const col of colsToExclude) {
            delete copy[col];
          }

          return copy;
        });
      };

      let sanitized = getSanitizedItems([]);
      let { error } =
        table === 'vehicles'
          ? await this.upsertVehicleWithColumnFallback(sanitized, false)
          : await supabase.from(table).upsert(sanitized);

      if (error) {
        this.lastSyncError = `[${table}] ${error.message}`;
        const isRoleConstraintError =
          table === 'users' && error.message && error.message.includes('users_role_check');
        const isSchemaWarning = error.message && (
          error.message.includes('schema cache') || 
          error.message.includes('relation') || 
          error.message.includes('does not exist') ||
          error.message.includes('column')
        );

        if (isRoleConstraintError) {
          console.warn(
            `[Supabase Schema] Tabela 'users' rejeitou o perfil selecionado pela constraint "users_role_check". Execute o bloco de atualização da tabela 'users' em 'supabase-schema.sql' no Supabase SQL Editor para liberar o perfil 'abastecedor'.`
          );
        } else if (error.message && error.message.includes('Failed to fetch')) {
          console.warn(`[Supabase Offline/Blocked] Falha ao sincronizar ${table}.`);
        } else if (isSchemaWarning) {
          console.warn(`[Supabase Schema] Tabela '${table}' rejeitou envio: ${error.message}. Verifique 'supabase-schema.sql'.`);
        } else {
          console.error(`Error syncing ${table}:`, error.message);
        }
        return false;
      }

      this.lastSyncError = null;
      return true;
    } catch (e: any) {
      this.lastSyncError = `[${table}] ${e?.message || e}`;
      if (e && e.message && e.message.includes('Failed to fetch')) {
        console.warn(`[Supabase Offline/Blocked] Exception syncing ${table} - connection unavailable.`);
      } else {
        console.error(`Exception syncing ${table}:`, e);
      }
      return false;
    }
  }

  private async syncMaintenanceLogs(): Promise<boolean> {
    const logs: any[] = [];
    this.vehicles.forEach(v => {
      if (v.maintenanceHistory) {
        v.maintenanceHistory.forEach(log => {
          logs.push({ ...log, assetId: v.id, assetType: 'vehicle' });
        });
      }
    });
    this.equipments.forEach(e => {
      if (e.maintenanceHistory) {
        e.maintenanceHistory.forEach(log => {
          logs.push({ ...log, assetId: e.id, assetType: 'equipment' });
        });
      }
    });
    if (logs.length > 0) {
      return await this.syncTable('maintenance_logs', logs);
    }
    return true;
  }

  private async backgroundSync() {
    if (this.isSyncing) {
      this.syncQueued = true;
      return;
    }
    this.isSyncing = true;
    try {
      const cUsers = this.getChangedItems('users', this.users).filter(
        u => u.id !== 'user-admin-default' && u.id !== 'user-abastecedor-demo'
      );
      const cWorks = this.getChangedItems('works', this.works);
      const cEqTypes = this.getChangedItems('equipmentTypes', this.equipmentTypes);
      const cVehCats = this.getChangedItems('vehicleCategories', this.vehicleCategories);
      const cVehicles = this.getChangedItems('vehicles', this.vehicles);
      const cEquipments = this.getChangedItems('equipments', this.equipments);
      const cTrips = this.getChangedItems('trips', this.trips);
      const cUsages = this.getChangedItems('equipmentUsages', this.equipmentUsages);
      const cSuppliers = this.getChangedItems('suppliers', this.suppliers);
      const cFuelInflows = this.getChangedItems('fuelInflows', this.fuelInflows);
      const cFuelDispenses = this.getChangedItems('fuelDispenses', this.fuelDispenses);
      const cLogistics = this.getChangedItems('logisticsSchedules', this.logisticsSchedules);

      if (!cUsers.length || await this.syncTable('users', cUsers)) this.updatePreviousState('users');
      if (!cWorks.length || await this.syncTable('construction_works', cWorks)) this.updatePreviousState('works');
      if (!cEqTypes.length || await this.syncTable('equipment_types', cEqTypes)) this.updatePreviousState('equipmentTypes');
      if (!cVehCats.length || await this.syncTable('vehicle_categories', cVehCats)) this.updatePreviousState('vehicleCategories');
      if (!cSuppliers.length || await this.syncTable('suppliers', cSuppliers)) this.updatePreviousState('suppliers');
      if (!cFuelInflows.length || await this.syncTable('fuel_inflows', cFuelInflows)) this.updatePreviousState('fuelInflows');
      if (!cFuelDispenses.length || await this.syncTable('fuel_dispenses', cFuelDispenses)) this.updatePreviousState('fuelDispenses');
      if (!cVehicles.length || await this.syncTable('vehicles', cVehicles)) this.updatePreviousState('vehicles');
      if (!cEquipments.length || await this.syncTable('equipments', cEquipments)) this.updatePreviousState('equipments');
      if (!cTrips.length || await this.syncTable('trips', cTrips)) this.updatePreviousState('trips');
      if (!cUsages.length || await this.syncTable('equipment_usages', cUsages)) this.updatePreviousState('equipmentUsages');
      if (!cLogistics.length || await this.syncTable('logistics_schedules', cLogistics)) this.updatePreviousState('logisticsSchedules');

      await this.syncMaintenanceLogs();
    } catch (e) {
      console.error("Exception in backgroundSync:", e);
    } finally {
      this.isSyncing = false;
      if (this.syncQueued) {
        this.syncQueued = false;
        this.backgroundSync();
      }
    }
  }

  private constructor() {
    clearLegacyBrowserStorage();
    this.loadFromSupabase();
    this.setupRealtimeAndPolling();
  }

  private setupRealtimeAndPolling() {
    if (typeof window === 'undefined') return;

    // 1. Consulta imediata ao retornar foco/visibilidade à aba
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.loadFromSupabase();
      }
    });
    window.addEventListener('focus', () => {
      this.loadFromSupabase();
    });

    // 2. Atualização constante via Supabase Realtime (postgres_changes em todas as tabelas)
    try {
      supabase
        .channel('frotacontrol-db-realtime')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {
          if (this.realtimeDebounceTimer) {
            clearTimeout(this.realtimeDebounceTimer);
          }
          this.realtimeDebounceTimer = setTimeout(() => {
            this.loadFromSupabase();
          }, 350);
        })
        .subscribe();
    } catch (e) {
      console.warn('Supabase Realtime channel unavailable:', e);
    }

    // 3. Polling periódico de garantia (a cada 20s) enquanto a página estiver visível
    this.pollingInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && !this.isSyncing && !this.syncQueued) {
        this.loadFromSupabase();
      }
    }, 20000);
  }

  public static getInstance(): FleetStore {
    if (!FleetStore.instance) {
      FleetStore.instance = new FleetStore();
    }
    return FleetStore.instance;
  }

  private persistLocalState() {
    // Nenhuma gravação em localStorage/sessionStorage: estado vive apenas em memória espelhando o Supabase.
  }

  private saveState() {
    this.triggerListeners();
    this.backgroundSync();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private triggerListeners() {
    this.listeners.forEach(listener => listener());
  }

  // --- ACTIONS ---

  public signup(
    name: string, 
    loginId: string, 
    cpf: string, 
    licenseNumber: string, 
    isDefaultAdminOrRole: boolean | UserRole = false, 
    email?: string,
    password?: string,
    isApproved?: boolean
  ): { success: boolean, message: string } {
    const normalizedLogin = loginId.trim().toLowerCase();
    
    // Check duplicates
    if (this.users.some(u => (u.loginId || '').toLowerCase() === normalizedLogin)) {
      return { success: false, message: 'Este usuário / login já está cadastrado no sistema.' };
    }
    if (this.users.some(u => u.cpf.replace(/\D/g, '') === cpf.replace(/\D/g, ''))) {
      return { success: false, message: 'Este CPF já está cadastrado.' };
    }

    // Determine authorization status
    // If an Admin creates a user within the dashboard, authorize immediately.
    // Else, it starts as pending (isApproved = false) and needs ADM review.
    const hasAdminSession = this.currentUser && this.currentUser.role === 'admin';
    const determinedApproved = isApproved !== undefined ? isApproved : hasAdminSession;

    let determinedRole: UserRole = 'driver';
    if (typeof isDefaultAdminOrRole === 'string') {
      determinedRole = isDefaultAdminOrRole;
    } else if (isDefaultAdminOrRole === true) {
      determinedRole = 'admin';
    } else if (normalizedLogin.includes('admin')) {
      determinedRole = 'admin';
    } else if (normalizedLogin.includes('abastec') || normalizedLogin.includes('frentista')) {
      determinedRole = 'abastecedor';
    }

    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      loginId: normalizedLogin,
      name: name.trim(),
      email: email ? email.trim() : undefined,
      cpf: cpf.trim(),
      licenseNumber: licenseNumber.trim(),
      role: determinedRole,
      isActive: true,
      password: password || '123456',
      isApproved: !!determinedApproved,
      createdAt: new Date().toISOString()
    };

    this.users.push(newUser);
    
    // Only auto-login if they are immediately approved AND we aren't in an active admin session
    if (!!determinedApproved && !hasAdminSession) {
      this.currentUser = newUser;
    }
    
    this.saveState();
    return { 
      success: true, 
      message: determinedApproved 
        ? 'Usuário cadastrado com sucesso!' 
        : 'Sua solicitação de cadastro foi realizada! Aguarde a autorização de um Administrador (ADM) antes de fazer login.'
    };
  }

  public async loginFromDatabase(loginId: string, password?: string): Promise<{ success: boolean; user?: User; message: string }> {
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (!error && data) {
        this.users = (data as User[]).map(u => ({
          ...u,
          authorizedAssetIds: Array.isArray(u.authorizedAssetIds) ? u.authorizedAssetIds : []
        }));
        if (!this.users.some(u => u.loginId === 'admin' || u.role === 'admin')) {
          this.users.unshift({
            id: 'user-admin-default',
            loginId: 'admin',
            name: 'Administrador Geral',
            email: 'admin@frota.com.br',
            cpf: '111.111.111-11',
            licenseNumber: 'Não Aplicável',
            role: 'admin',
            isActive: true,
            password: '123456',
            isApproved: true,
            createdAt: '2025-01-01T00:00:00.000Z'
          });
        }
        if (!this.users.some(u => u.loginId === 'abastecedor' || u.role === 'abastecedor')) {
          this.users.push({
            id: 'user-abastecedor-demo',
            loginId: 'abastecedor',
            name: 'Operador de Abastecimento',
            email: 'abastecedor@frota.com.br',
            cpf: '000.000.000-00',
            licenseNumber: 'Não Aplicável',
            role: 'abastecedor',
            isActive: true,
            password: '123456',
            isApproved: true,
            createdAt: '2025-01-01T00:00:00.000Z'
          });
        }
        this.updatePreviousState('users');
      }
    } catch (e) {
      console.warn('Falha ao consultar usuários no Supabase durante login:', e);
    }

    const result = this.login(loginId, password);
    if (result.success) {
      this.loadFromSupabase();
    }
    return result;
  }

  public login(loginId: string, password?: string): { success: boolean, user?: User, message: string } {
    const normalizedLogin = loginId.trim().toLowerCase();
    const user = this.users.find(u => (u.loginId || '').toLowerCase() === normalizedLogin || (u.email && u.email.toLowerCase() === normalizedLogin));

    if (!user) {
      return { success: false, message: 'Usuário de acesso não encontrado. Certifique-se com o Administrador se seu login foi cadastrado.' };
    }

    if (user.isApproved === false) {
      return { 
        success: false, 
        message: 'Acesso recusado. Seu cadastro está pendente de aprovação por um Administrador (ADM).' 
      };
    }

    if (!user.isActive) {
      return { success: false, message: 'Este cadastro foi suspenso pelo administrador.' };
    }

    const userPassword = user.password || '123456';
    if (password !== undefined) {
      if (password !== userPassword) {
        return { success: false, message: 'Senha inválida de acesso. Por favor, digite novamente.' };
      }
    } else {
      return { success: false, message: 'Senha requerida.' };
    }

    this.currentUser = user;
    this.triggerListeners();
    return { success: true, user, message: 'Login efetuado com sucesso.' };
  }

  public approveUser(userId: string): { success: boolean, message: string } {
    const user = this.users.find(u => u.id === userId);
    if (!user) {
      return { success: false, message: 'Usuário não localizado.' };
    }
    user.isApproved = true;
    this.users = this.users.map(u => u.id === userId ? { ...u, isApproved: true } : u);
    this.saveState();
    return { success: true, message: `O usuário "${user.name}" foi aprovado com sucesso!` };
  }

  public rejectUser(userId: string): { success: boolean, message: string } {
    const user = this.users.find(u => u.id === userId);
    if (!user) {
      return { success: false, message: 'Usuário não localizado.' };
    }
    this.users = this.users.filter(u => u.id !== userId);
    this.saveState();
    return { success: true, message: `A solicitação de "${user.name}" foi rejeitada e removida.` };
  }

  public logout() {
    this.currentUser = null;
    this.triggerListeners();
  }

  private sanitizeUserForSupabase(user: User) {
    const validRoles: UserRole[] = ['admin', 'driver', 'gerencial', 'abastecedor'];
    const normalizedRole: UserRole = validRoles.includes(user.role) ? user.role : 'driver';

    return {
      id: String(user.id).trim(),
      loginId: user.loginId ? String(user.loginId).trim().toLowerCase() : null,
      name: String(user.name || '').trim(),
      email: user.email ? String(user.email).trim() : null,
      cpf: user.cpf ? String(user.cpf).trim() : null,
      licenseNumber: user.licenseNumber ? String(user.licenseNumber).trim() : null,
      role: normalizedRole,
      isActive: user.isActive !== false,
      password: user.password || '123456',
      isApproved: user.isApproved !== false,
      authorizedAssetIds: Array.isArray(user.authorizedAssetIds) ? user.authorizedAssetIds : [],
      createdAt: user.createdAt || new Date().toISOString(),
    };
  }

  private sanitizeVehicleForSupabase(vehicle: Vehicle) {
    const workIds = new Set(this.works.map(w => w.id));
    const isActive =
      vehicle.isActive !== undefined
        ? Boolean(vehicle.isActive) && vehicle.status !== 'inactive'
        : vehicle.status !== 'inactive';
    const dbStatus: 'available' | 'in_use' | 'maintenance' =
      vehicle.status === 'in_use'
        ? 'in_use'
        : vehicle.status === 'maintenance'
        ? 'maintenance'
        : 'available';
    const validWorkId = vehicle.workId && workIds.has(vehicle.workId) ? vehicle.workId : null;

    return {
      id: String(vehicle.id).trim(),
      model: String(vehicle.model || '').trim(),
      plate: String(vehicle.plate || vehicle.id || '').trim().toUpperCase(),
      brand: String(vehicle.brand || '').trim(),
      year: Math.trunc(Number(vehicle.year)) || new Date().getFullYear(),
      color: String(vehicle.color || '').trim() || 'Não informada',
      currentKm: Number(vehicle.currentKm) || 0,
      lastMaintenanceKm:
        vehicle.lastMaintenanceKm !== undefined && vehicle.lastMaintenanceKm !== null
          ? Number(vehicle.lastMaintenanceKm)
          : null,
      maintenanceIntervalKm:
        vehicle.maintenanceIntervalKm !== undefined && vehicle.maintenanceIntervalKm !== null
          ? Number(vehicle.maintenanceIntervalKm)
          : null,
      nextOilChangeKm:
        vehicle.nextOilChangeKm !== undefined && vehicle.nextOilChangeKm !== null
          ? Number(vehicle.nextOilChangeKm)
          : null,
      status: dbStatus,
      workId: validWorkId,
      workName: validWorkId ? vehicle.workName || null : null,
      maintenanceReason: vehicle.maintenanceReason ? String(vehicle.maintenanceReason) : null,
      maintenanceSentAt: vehicle.maintenanceSentAt ? String(vehicle.maintenanceSentAt) : null,
      category: vehicle.category ? String(vehicle.category) : null,
      createdAt: vehicle.createdAt || new Date().toISOString(),
      maintenanceHistory: Array.isArray(vehicle.maintenanceHistory) ? vehicle.maintenanceHistory : [],
      isActive,
      tankCapacityLiters:
        vehicle.tankCapacityLiters !== undefined && vehicle.tankCapacityLiters !== null
          ? Number(vehicle.tankCapacityLiters)
          : null,
      hasLogisticsControl: Boolean(vehicle.hasLogisticsControl),
    };
  }

  private async upsertVehicleWithColumnFallback(
    payloads: Record<string, any>[],
    requireLogisticsColumn: boolean
  ): Promise<{ error: any; excludedColumns: string[] }> {
    const excludedColumns: string[] = [];
    let currentPayloads = payloads.map(p => ({ ...p }));
    let { error } = await supabase.from('vehicles').upsert(currentPayloads);

    let attempts = 0;
    while (error && attempts < 6) {
      attempts++;
      const msg = error.message || '';
      const match = msg.match(/Could not find the '([^']+)' column/i);
      const missingCol = match?.[1];

      if (!missingCol || excludedColumns.includes(missingCol)) {
        break;
      }

      if (missingCol === 'hasLogisticsControl' && requireLogisticsColumn) {
        break;
      }

      const safeOptionalCols = ['isActive', 'tankCapacityLiters', 'hasLogisticsControl'];
      if (!safeOptionalCols.includes(missingCol)) {
        break;
      }

      excludedColumns.push(missingCol);
      currentPayloads = currentPayloads.map(p => {
        const copy = { ...p };
        delete copy[missingCol];
        return copy;
      });
      const retry = await supabase.from('vehicles').upsert(currentPayloads);
      error = retry.error;
    }

    if (excludedColumns.length > 0 && !error) {
      console.warn(
        `[Supabase] Veículo salvo em 'public.vehicles' omitindo colunas ainda não criadas no banco: ${excludedColumns.join(', ')}.`
      );
    }

    return { error, excludedColumns };
  }

  public async addVehicle(vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'status'>): Promise<{ success: boolean; synced: boolean; message: string }> {
    const plateUpper = vehicleData.plate.trim().toUpperCase();
    if (this.vehicles.some(v => v.plate.toUpperCase() === plateUpper)) {
      return { success: false, synced: false, message: `Já existe um carro registrado com a placa ${plateUpper}.` };
    }

    const newVehicle: Vehicle = {
      ...vehicleData,
      isActive: vehicleData.isActive !== undefined ? Boolean(vehicleData.isActive) : true,
      hasLogisticsControl: Boolean(vehicleData.hasLogisticsControl),
      id: plateUpper,
      plate: plateUpper,
      status: 'available',
      createdAt: new Date().toISOString()
    };

    this.vehicles.unshift(newVehicle); // Newest first
    this.persistLocalState();
    this.triggerListeners();

    try {
      const payload = this.sanitizeVehicleForSupabase(newVehicle);
      const { error, excludedColumns } = await this.upsertVehicleWithColumnFallback(
        [payload],
        Boolean(newVehicle.hasLogisticsControl)
      );
      if (error) {
        console.warn('Supabase addVehicle error:', error.message);
        return {
          success: true,
          synced: false,
          message: `Veículo cadastrado localmente, mas falhou ao salvar no Supabase: ${error.message}`
        };
      }
      this.updatePreviousState('vehicles');
      if (excludedColumns.length > 0) {
        return {
          success: true,
          synced: true,
          message: `Veículo cadastrado no Supabase! (Obs.: adicione as colunas ${excludedColumns.join(', ')} em public.vehicles quando desejar usá-las.)`
        };
      }
      return { success: true, synced: true, message: 'Veículo cadastrado e sincronizado no Supabase com sucesso!' };
    } catch (e: any) {
      return {
        success: true,
        synced: false,
        message: `Veículo cadastrado localmente, mas erro de rede ao sincronizar no Supabase: ${e?.message || e}`
      };
    }
  }

  public async updateVehicle(updatedVehicle: Vehicle): Promise<{ success: boolean; synced: boolean; message: string }> {
    const normalized: Vehicle = {
      ...updatedVehicle,
      isActive: updatedVehicle.isActive !== undefined ? Boolean(updatedVehicle.isActive) : updatedVehicle.status !== 'inactive',
      hasLogisticsControl: Boolean(updatedVehicle.hasLogisticsControl)
    };
    this.vehicles = this.vehicles.map(v => v.id === normalized.id ? normalized : v);
    this.persistLocalState();
    this.triggerListeners();

    try {
      const payload = this.sanitizeVehicleForSupabase(normalized);
      const { error, excludedColumns } = await this.upsertVehicleWithColumnFallback(
        [payload],
        Boolean(normalized.hasLogisticsControl)
      );
      if (error) {
        console.warn('Supabase updateVehicle error:', error.message);
        return {
          success: false,
          synced: false,
          message: `Falha ao atualizar veículo no Supabase (${normalized.plate}): ${error.message}`
        };
      }
      this.updatePreviousState('vehicles');
      if (excludedColumns.length > 0) {
        return {
          success: true,
          synced: true,
          message: `Veículo atualizado no Supabase! (Colunas ausentes no banco: ${excludedColumns.join(', ')}.)`
        };
      }
      return { success: true, synced: true, message: 'Veículo atualizado no Supabase com sucesso!' };
    } catch (e: any) {
      return {
        success: false,
        synced: false,
        message: `Erro ao conectar com o Supabase: ${e?.message || e}`
      };
    }
  }

  public toggleVehicleStatus(vehicleId: string, newStatus: 'available' | 'maintenance' | 'inactive') {
    this.vehicles = this.vehicles.map(v => {
      if (v.id === vehicleId) {
        if (v.status === 'in_use') return v;
        return { 
          ...v, 
          status: newStatus,
          isActive: newStatus !== 'inactive'
        };
      }
      return v;
    });
    this.saveState();
  }

  public toggleVehicleActive(vehicleId: string): { success: boolean, message: string } {
    const vehicle = this.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
      return { success: false, message: 'Veículo não encontrado.' };
    }
    if (vehicle.status === 'in_use') {
      return { success: false, message: 'Não é possível inativar um veículo em viagem ativa.' };
    }
    const newStatus = vehicle.status === 'inactive' ? 'available' : 'inactive';
    this.vehicles = this.vehicles.map(v => {
      if (v.id === vehicleId) {
        return {
          ...v,
          status: newStatus,
          isActive: newStatus !== 'inactive'
        };
      }
      return v;
    });
    this.saveState();
    return {
      success: true,
      message: `Veículo ${vehicle.plate} ${newStatus === 'inactive' ? 'inativado' : 'reativado'} com sucesso!`
    };
  }

  public sendVehicleToMaintenance(vehicleId: string, reason: string): { success: boolean, message: string } {
    let success = false;
    let message = 'Veículo não encontrado.';
    this.vehicles = this.vehicles.map(v => {
      if (v.id === vehicleId) {
        if (v.status === 'in_use') {
          message = 'Não é possível enviar para manutenção um veículo que está em trânsito.';
          return v;
        }
        success = true;
        message = 'Veículo encaminhado para manutenção!';
        return {
          ...v,
          status: 'maintenance',
          maintenanceReason: reason,
          maintenanceSentAt: new Date().toISOString()
        };
      }
      return v;
    });
    if (success) {
      this.saveState();
    }
    return { success, message };
  }

  public releaseVehicleFromMaintenance(
    vehicleId: string, 
    resolution: string, 
    cost: number, 
    isOilChange: boolean, 
    nextOilChangeKm?: number,
    fiscalInfo?: {
      fiscalDocType?: FiscalDocType;
      fiscalDocNumber?: string;
      providerId?: string;
      providerName?: string;
    }
  ): { success: boolean, message: string } {
    let success = false;
    let message = 'Veículo não encontrado.';
    this.vehicles = this.vehicles.map(v => {
      if (v.id === vehicleId) {
        if (v.status !== 'maintenance') {
          message = 'Este veículo não está em manutenção.';
          return v;
        }
        success = true;

        const docNumTrimmed = fiscalInfo?.fiscalDocNumber?.trim() || '';
        const providerTrimmed = fiscalInfo?.providerName?.trim() || '';
        const hasFiscalPending = !docNumTrimmed || !providerTrimmed;

        message = hasFiscalPending
          ? 'Veículo liberado da manutenção com pendência de informações fiscais (NF/Pedido ou Prestador ausente).'
          : 'Veículo liberado da manutenção com sucesso!';
        
        const log: MaintenanceLog = {
          id: 'maint-log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          reason: v.maintenanceReason || 'Manutenção Corretiva/Preventiva Geral',
          sentAt: v.maintenanceSentAt || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          resolvedAt: new Date().toISOString(),
          resolution: resolution,
          cost: Number(cost) || 0,
          workId: v.workId,
          workName: v.workName,
          isOilChange: isOilChange,
          fiscalDocType: fiscalInfo?.fiscalDocType || 'nf',
          fiscalDocNumber: docNumTrimmed || undefined,
          providerId: fiscalInfo?.providerId || undefined,
          providerName: providerTrimmed || undefined,
          hasFiscalPending: hasFiscalPending
        };

        const history = v.maintenanceHistory || [];
        return {
          ...v,
          status: 'available',
          maintenanceReason: undefined,
          maintenanceSentAt: undefined,
          lastMaintenanceKm: v.currentKm,
          nextOilChangeKm: isOilChange ? nextOilChangeKm : v.nextOilChangeKm,
          maintenanceHistory: [log, ...history]
        };
      }
      return v;
    });
    if (success) {
      this.saveState();
    }
    return { success, message };
  }

  public deleteVehicle(vehicleId: string): { success: boolean, message: string } {
    const vehicle = this.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
      return { success: false, message: 'Veículo não encontrado.' };
    }
    if (vehicle.status === 'in_use') {
      return { success: false, message: 'Não é possível remover um veículo em uso atualmente.' };
    }

    this.vehicles = this.vehicles.filter(v => v.id !== vehicleId);
    this.saveState();
    supabase.from('vehicles').delete().eq('id', vehicleId).then(({ error }) => {
      if (error) console.warn('Supabase delete failed for vehicle:', error);
    });
    return { success: true, message: 'Veículo excluído com sucesso.' };
  }

  public toggleDriverRole(driverId: string): { success: boolean, message: string } {
    const driver = this.users.find(u => u.id === driverId);
    if (!driver) {
      return { success: false, message: 'Motorista não encontrado.' };
    }

    // Safety: don't let admin demote themselves to avoid losing admin lock
    if (this.currentUser && this.currentUser.id === driverId && driver.role === 'admin') {
      return { success: false, message: 'Você não pode rebaixar a si mesmo para manter integridade da conta.' };
    }

    const newRole = driver.role === 'admin' ? 'driver' : 'admin';
    driver.role = newRole;

    this.users = this.users.map(u => u.id === driverId ? { ...u, role: newRole } : u);
    
    // If we edited current logged user, sync it
    if (this.currentUser && this.currentUser.id === driverId) {
      this.currentUser.role = newRole;
    }

    this.saveState();
    return { success: true, message: `O cargo de ${driver.name} foi atualizado para ${newRole === 'admin' ? 'Administrador' : 'Motorista'}.` };
  }

  public changeDriverRole(driverId: string, newRole: UserRole): { success: boolean, message: string } {
    const driver = this.users.find(u => u.id === driverId);
    if (!driver) {
      return { success: false, message: 'Usuário não encontrado.' };
    }

    // Safety: don't let admin demote themselves from admin to avoid losing admin lock
    if (this.currentUser && this.currentUser.id === driverId && driver.role === 'admin' && newRole !== 'admin') {
      return { success: false, message: 'Você não pode alterar seu próprio perfil de cargo para evitar a perda do seu perfil de administrador.' };
    }

    driver.role = newRole;
    this.users = this.users.map(u => u.id === driverId ? { ...u, role: newRole } : u);

    // If we edited current logged user, sync it
    if (this.currentUser && this.currentUser.id === driverId) {
      this.currentUser.role = newRole;
    }

    this.saveState();
    
    let cargoNome = 'Motorista';
    if (newRole === 'admin') cargoNome = 'Administrador';
    if (newRole === 'gerencial') cargoNome = 'Gerencial (Coordenador)';
    if (newRole === 'abastecedor') cargoNome = 'Controle de Abastecimento';
    
    return { success: true, message: `O cargo de ${driver.name} foi atualizado para ${cargoNome} com sucesso.` };
  }

  public toggleDriverStatus(driverId: string): { success: boolean, message: string } {
    const driver = this.users.find(u => u.id === driverId);
    if (!driver) {
      return { success: false, message: 'Motorista não encontrado.' };
    }

    if (this.currentUser && this.currentUser.id === driverId) {
      return { success: false, message: 'Não é seguro desativar sua própria conta adminsitrativa.' };
    }

    const newStatus = !driver.isActive;
    this.users = this.users.map(u => u.id === driverId ? { ...u, isActive: newStatus } : u);

    this.saveState();
    return { success: true, message: `Status de ${driver.name} alterado para ${newStatus ? 'Ativo' : 'Suspenso'}.` };
  }

  public updateUserDetails(
    id: string,
    details: {
      name: string;
      loginId: string;
      cpf: string;
      licenseNumber: string;
      email?: string;
      password?: string;
      role: UserRole;
    }
  ): { success: boolean, message: string } {
    const userIndex = this.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return { success: false, message: 'Usuário não encontrado.' };
    }

    const current = this.users[userIndex];
    if (this.currentUser && this.currentUser.id === id && current.role === 'admin' && details.role !== 'admin') {
      return { success: false, message: 'Você não pode rebaixar seu próprio perfil de administrador para evitar o bloqueio de acesso.' };
    }

    const normalizedLogin = details.loginId.trim().toLowerCase();
    const duplicateLogin = this.users.find(u => u.id !== id && (u.loginId || '').toLowerCase() === normalizedLogin);
    if (duplicateLogin) {
      return { success: false, message: 'Este Login de Usuário já está sendo utilizado por outro cadastro.' };
    }

    const duplicateCpf = this.users.find(u => u.id !== id && u.cpf === details.cpf.trim());
    if (duplicateCpf) {
      return { success: false, message: 'Este CPF já está sendo utilizado por outro usuário.' };
    }

    const updatedUser: User = {
      ...current,
      name: details.name.trim(),
      loginId: normalizedLogin,
      cpf: details.cpf.trim(),
      licenseNumber: details.licenseNumber.trim(),
      email: details.email ? details.email.trim() : undefined,
      password: details.password ? details.password.trim() : current.password,
      role: details.role,
    };

    this.users[userIndex] = updatedUser;

    if (this.currentUser && this.currentUser.id === id) {
      this.currentUser = updatedUser;
    }

    this.saveState();
    return { success: true, message: 'Cadastro do usuário atualizado com sucesso!' };
  }

  public checkInTrip(vehicleId: string, details: Omit<CheckInDetails, 'time'>, workId?: string): { success: boolean, message: string } {
    if (!this.currentUser) {
      return { success: false, message: 'É necessário estar autenticado para abrir viagem.' };
    }

    // Check if driver has an active trip already
    const hasActiveTrip = this.trips.some(t => t.driverId === this.currentUser?.id && t.status === 'active');
    if (hasActiveTrip) {
      return { success: false, message: 'Você já possui uma viagem iniciada ativa. Realize o checkout primeiro.' };
    }

    const vehicle = this.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
      return { success: false, message: 'Veículo selecionado não existe.' };
    }

    if (vehicle.status !== 'available') {
      return { success: false, message: `Este veículo está atualmente ${vehicle.status === 'in_use' ? 'em uso' : 'em manutenção'}.` };
    }

    // Update vehicle state
    vehicle.status = 'in_use';
    vehicle.currentKm = details.km;

    const finalWorkId = vehicle.workId || workId;
    const matchedWork = finalWorkId ? this.works.find(w => w.id === finalWorkId) : undefined;

    const newTrip: Trip = {
      id: `trip-${Date.now()}`,
      driverId: this.currentUser.id,
      driverName: this.currentUser.name,
      driverEmail: this.currentUser.email,
      vehicleId: vehicle.id,
      vehicleModelPlate: `${vehicle.brand} ${vehicle.model} (${vehicle.plate})`,
      status: 'active',
      workId: matchedWork?.id,
      workName: matchedWork?.name,
      originCity: details.originCity || (matchedWork ? matchedWork.city : 'Palmas'),
      originState: (details.originState || (matchedWork ? matchedWork.state : 'TO')).toUpperCase(),
      destinationCity: details.destinationCity,
      destinationState: details.destinationState ? details.destinationState.toUpperCase() : undefined,
      checkIn: {
        ...details,
        originCity: details.originCity || (matchedWork ? matchedWork.city : 'Palmas'),
        originState: (details.originState || (matchedWork ? matchedWork.state : 'TO')).toUpperCase(),
        destinationState: details.destinationState ? details.destinationState.toUpperCase() : undefined,
        time: new Date().toISOString()
      },
      createdAt: new Date().toISOString()
    };

    this.trips.unshift(newTrip); // Newest first
    
    // update vehicles list
    this.vehicles = this.vehicles.map(v => v.id === vehicleId ? vehicle : v);
    
    this.saveState();
    return { success: true, message: 'Check-in realizado! Viagem iniciada com sucesso.' };
  }

  public checkOutTrip(tripId: string, details: Omit<CheckOutDetails, 'time'>): { success: boolean, message: string } {
    const tripIndex = this.trips.findIndex(t => t.id === tripId);
    if (tripIndex === -1) {
      return { success: false, message: 'Viagem de destino não foi localizada.' };
    }

    const trip = this.trips[tripIndex];
    if (trip.status === 'completed') {
      return { success: false, message: 'Esta viagem já foi finalizada anteriormente.' };
    }

    if (details.km < trip.checkIn.km) {
      return { success: false, message: `Quilometragem final (${details.km} km) não pode ser menor que a inicial (${trip.checkIn.km} km).` };
    }

    const vehicle = this.vehicles.find(v => v.id === trip.vehicleId);
    if (vehicle) {
      vehicle.status = 'available';
      vehicle.currentKm = details.km;
      this.vehicles = this.vehicles.map(v => v.id === vehicle.id ? vehicle : v);
    }

    const kmDriven = details.km - trip.checkIn.km;

    // finalize trip
    const updatedTrip: Trip = {
      ...trip,
      status: 'completed',
      checkOut: {
        ...details,
        time: new Date().toISOString()
      },
      kmDriven
    };

    this.trips[tripIndex] = updatedTrip;
    this.saveState();

    return { success: true, message: `Check-out concluído! Total rodado: ${kmDriven} km.` };
  }

  public deleteTrip(tripId: string): { success: boolean, message: string } {
    const trip = this.trips.find(t => t.id === tripId);
    if (!trip) return { success: false, message: 'Viagem não encontrada.' };

    if (trip.status === 'active') {
      // Free the vehicle status
      const vehicle = this.vehicles.find(v => v.id === trip.vehicleId);
      if (vehicle) {
        vehicle.status = 'available';
        this.vehicles = this.vehicles.map(v => v.id === vehicle.id ? vehicle : v);
      }
    }

    this.trips = this.trips.filter(t => t.id !== tripId);
    this.saveState();
    supabase.from('trips').delete().eq('id', tripId).then(({ error }) => {
      if (error) console.warn('Supabase delete failed for trip:', error);
    });
    return { success: true, message: 'Viagem excluída do histórico.' };
  }

  // --- EQUIPMENT ACTIONS ---

  public addEquipment(equipmentData: Omit<Equipment, 'createdAt' | 'status'>): { success: boolean, message: string } {
    const idUpper = equipmentData.id.trim().toUpperCase();
    if (this.equipments.some(e => e.id.toUpperCase() === idUpper)) {
      return { success: false, message: `Já existe um equipamento registrado com o prefixo/id ${idUpper}.` };
    }

    const newEquipment: Equipment = {
      ...equipmentData,
      id: idUpper,
      status: 'available',
      createdAt: new Date().toISOString()
    };

    this.equipments.unshift(newEquipment); // newest first
    this.saveState();
    return { success: true, message: 'Equipamento registrado com sucesso!' };
  }

  public updateEquipment(updatedEquipment: Equipment) {
    this.equipments = this.equipments.map(e => e.id === updatedEquipment.id ? updatedEquipment : e);
    this.saveState();
  }

  public toggleEquipmentStatus(equipmentId: string, newStatus: 'available' | 'maintenance') {
    this.equipments = this.equipments.map(e => {
      if (e.id === equipmentId) {
        if (e.status === 'in_use') return e; // safe lock
        return { ...e, status: newStatus };
      }
      return e;
    });
    this.saveState();
  }

  public sendEquipmentToMaintenance(equipmentId: string, reason: string): { success: boolean, message: string } {
    let success = false;
    let message = 'Equipamento não encontrado.';
    this.equipments = this.equipments.map(e => {
      if (e.id === equipmentId) {
        if (e.status === 'in_use') {
          message = 'Não é possível enviar para manutenção um maquinário que está em operação.';
          return e;
        }
        success = true;
        message = 'Maquinário encaminhado para manutenção!';
        return {
          ...e,
          status: 'maintenance',
          maintenanceReason: reason,
          maintenanceSentAt: new Date().toISOString()
        };
      }
      return e;
    });
    if (success) {
      this.saveState();
    }
    return { success, message };
  }

  public releaseEquipmentFromMaintenance(
    equipmentId: string, 
    resolution: string, 
    cost: number,
    fiscalInfo?: {
      fiscalDocType?: FiscalDocType;
      fiscalDocNumber?: string;
      providerId?: string;
      providerName?: string;
    }
  ): { success: boolean, message: string } {
    let success = false;
    let message = 'Equipamento não encontrado.';
    this.equipments = this.equipments.map(e => {
      if (e.id === equipmentId) {
        if (e.status !== 'maintenance') {
          message = 'Este maquinário não está em manutenção.';
          return e;
        }
        success = true;

        const docNumTrimmed = fiscalInfo?.fiscalDocNumber?.trim() || '';
        const providerTrimmed = fiscalInfo?.providerName?.trim() || '';
        const hasFiscalPending = !docNumTrimmed || !providerTrimmed;

        message = hasFiscalPending
          ? 'Maquinário liberado da manutenção com pendência de informações fiscais (NF/Pedido ou Prestador ausente).'
          : 'Maquinário liberado da manutenção com sucesso!';
        
        const log: MaintenanceLog = {
          id: 'maint-log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          reason: e.maintenanceReason || 'Manutenção Corretiva/Preventiva Geral',
          sentAt: e.maintenanceSentAt || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          resolvedAt: new Date().toISOString(),
          resolution: resolution,
          cost: Number(cost) || 0,
          workId: e.workId,
          workName: e.workName,
          fiscalDocType: fiscalInfo?.fiscalDocType || 'nf',
          fiscalDocNumber: docNumTrimmed || undefined,
          providerId: fiscalInfo?.providerId || undefined,
          providerName: providerTrimmed || undefined,
          hasFiscalPending: hasFiscalPending
        };

        const history = e.maintenanceHistory || [];
        return {
          ...e,
          status: 'available',
          maintenanceReason: undefined,
          maintenanceSentAt: undefined,
          maintenanceHistory: [log, ...history]
        };
      }
      return e;
    });
    if (success) {
      this.saveState();
    }
    return { success, message };
  }

  public deleteEquipment(equipmentId: string): { success: boolean, message: string } {
    const equipment = this.equipments.find(e => e.id === equipmentId);
    if (!equipment) {
      return { success: false, message: 'Equipamento não encontrado.' };
    }
    if (equipment.status === 'in_use') {
      return { success: false, message: 'Não é possível remover equipamento em operação ativa.' };
    }

    this.equipments = this.equipments.filter(e => e.id !== equipmentId);
    this.saveState();
    supabase.from('equipments').delete().eq('id', equipmentId).then(({ error }) => {
      if (error) console.warn('Supabase delete failed for equipment:', error);
    });
    return { success: true, message: 'Equipamento excluído com sucesso.' };
  }

  public checkInEquipment(equipmentId: string, details: Omit<EquipmentCheckInDetails, 'time'>, workId?: string): { success: boolean, message: string } {
    if (!this.currentUser) {
      return { success: false, message: 'É necessário estar autenticado para operar equipamentos.' };
    }

    // Check if operator already holds an active machinery operation or active trip
    const hasActiveUsage = this.equipmentUsages.some(u => u.operatorId === this.currentUser?.id && u.status === 'active');
    if (hasActiveUsage) {
      return { success: false, message: 'Você já possui um equipamento em operação no momento. Conclua o turno dele primeiro.' };
    }

    const equipment = this.equipments.find(e => e.id === equipmentId);
    if (!equipment) {
      return { success: false, message: 'Equipamento selecionado não existe.' };
    }

    if (equipment.status !== 'available') {
      return { success: false, message: `Este equipamento está atualmente ${equipment.status === 'in_use' ? 'em operação' : 'em manutenção'}.` };
    }

    equipment.status = 'in_use';
    equipment.currentHours = details.hours;

    const finalWorkId = equipment.workId || workId;
    const matchedWork = finalWorkId ? this.works.find(w => w.id === finalWorkId) : undefined;

    const newUsage: EquipmentUsage = {
      id: `eq-usage-${Date.now()}`,
      operatorId: this.currentUser.id,
      operatorName: this.currentUser.name,
      operatorEmail: this.currentUser.email,
      equipmentId: equipment.id,
      equipmentNameModel: `${equipment.brand} ${equipment.model} (${equipment.id})`,
      status: 'active',
      workId: matchedWork?.id,
      workName: matchedWork?.name,
      checkIn: {
        ...details,
        time: new Date().toISOString()
      },
      createdAt: new Date().toISOString()
    };

    this.equipmentUsages.unshift(newUsage);
    this.equipments = this.equipments.map(e => e.id === equipmentId ? equipment : e);
    this.saveState();
    return { success: true, message: 'Operação de maquinário registrada! Checklist inicial OK.' };
  }

  public checkOutEquipment(usageId: string, details: Omit<EquipmentCheckOutDetails, 'time'>): { success: boolean, message: string } {
    const usageIndex = this.equipmentUsages.findIndex(u => u.id === usageId);
    if (usageIndex === -1) {
      return { success: false, message: 'Registro de uso não foi localizado.' };
    }

    const usage = this.equipmentUsages[usageIndex];
    if (usage.status === 'completed') {
      return { success: false, message: 'Esta operação já foi finalizada anteriormente.' };
    }

    if (details.hours < usage.checkIn.hours) {
      return { success: false, message: `Horímetro final (${details.hours} h) não pode ser menor do que o inicial (${usage.checkIn.hours} h).` };
    }

    const equipment = this.equipments.find(e => e.id === usage.equipmentId);
    if (equipment) {
      equipment.status = 'available';
      equipment.currentHours = details.hours;
      this.equipments = this.equipments.map(e => e.id === equipment.id ? equipment : e);
    }

    const hoursWorked = Number((details.hours - usage.checkIn.hours).toFixed(2));

    const updatedUsage: EquipmentUsage = {
      ...usage,
      status: 'completed',
      checkOut: {
        ...details,
        time: new Date().toISOString()
      },
      hoursWorked
    };

    this.equipmentUsages[usageIndex] = updatedUsage;
    this.saveState();
    return { success: true, message: `Check-out de maquinário concluído! Total: ${hoursWorked} horas trabalhadas.` };
  }

  public deleteEquipmentUsage(usageId: string): { success: boolean, message: string } {
    const usage = this.equipmentUsages.find(u => u.id === usageId);
    if (!usage) return { success: false, message: 'Operação não encontrada.' };

    if (usage.status === 'active') {
      const equipment = this.equipments.find(e => e.id === usage.equipmentId);
      if (equipment) {
        equipment.status = 'available';
        this.equipments = this.equipments.map(e => e.id === equipment.id ? equipment : e);
      }
    }

    this.equipmentUsages = this.equipmentUsages.filter(u => u.id !== usageId);
    this.saveState();
    supabase.from('equipment_usages').delete().eq('id', usageId).then(({ error }) => {
      if (error) console.warn('Supabase delete failed for equipment_usage:', error);
    });
    return { success: true, message: 'Registro removido do histórico.' };
  }

  public allocateVehicleToWork(vehicleId: string, workId?: string): { success: boolean, message: string } {
    const vehicle = this.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return { success: false, message: 'Veículo não encontrado.' };

    if (workId) {
      const work = this.works.find(w => w.id === workId);
      if (!work) return { success: false, message: 'Obra não encontrada.' };
      vehicle.workId = work.id;
      vehicle.workName = work.name;
    } else {
      vehicle.workId = undefined;
      vehicle.workName = undefined;
    }
    this.vehicles = this.vehicles.map(v => v.id === vehicleId ? vehicle : v);
    this.saveState();
    return { success: true, message: `Veículo alocado com sucesso!` };
  }

  public allocateEquipmentToWork(equipmentId: string, workId?: string): { success: boolean, message: string } {
    const equipment = this.equipments.find(e => e.id === equipmentId);
    if (!equipment) return { success: false, message: 'Equipamento não encontrado.' };

    if (workId) {
      const work = this.works.find(w => w.id === workId);
      if (!work) return { success: false, message: 'Obra não encontrada.' };
      equipment.workId = work.id;
      equipment.workName = work.name;
    } else {
      equipment.workId = undefined;
      equipment.workName = undefined;
    }
    this.equipments = this.equipments.map(e => e.id === equipmentId ? equipment : e);
    this.saveState();
    return { success: true, message: `Equipamento alocado com sucesso!` };
  }

  public createWork(name: string, city: string, state: string, description?: string): { success: boolean, message: string } {
    if (!name.trim() || !city.trim() || !state.trim()) {
      return { success: false, message: 'Nome, município e estado são obrigatórios.' };
    }
    const newWork: ConstructionWork = {
      id: `work-${Date.now()}`,
      name: name.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
      description: description?.trim(),
      status: 'active',
      createdAt: new Date().toISOString()
    };
    this.works.unshift(newWork);
    this.saveState();
    return { success: true, message: 'Obra cadastrada com sucesso!' };
  }

  public updateWork(updatedWork: ConstructionWork): { success: boolean, message: string } {
    if (!updatedWork.name.trim() || !updatedWork.city.trim() || !updatedWork.state.trim()) {
      return { success: false, message: 'Nome, município e estado são obrigatórios.' };
    }
    const index = this.works.findIndex(w => w.id === updatedWork.id);
    if (index === -1) return { success: false, message: 'Obra não encontrada.' };

    this.works = this.works.map(w => w.id === updatedWork.id ? {
      ...w,
      name: updatedWork.name.trim(),
      city: updatedWork.city.trim(),
      state: updatedWork.state.trim().toUpperCase(),
      description: updatedWork.description?.trim()
    } : w);

    // If name changed, sync allocation workName in vehicles and equipments
    this.vehicles = this.vehicles.map(v => v.workId === updatedWork.id ? { ...v, workName: updatedWork.name.trim() } : v);
    this.equipments = this.equipments.map(e => e.workId === updatedWork.id ? { ...e, workName: updatedWork.name.trim() } : e);

    this.saveState();
    return { success: true, message: 'Obra atualizada com sucesso!' };
  }

  public toggleWorkStatus(workId: string): { success: boolean, message: string } {
    const work = this.works.find(w => w.id === workId);
    if (!work) return { success: false, message: 'Obra não encontrada.' };
    
    work.status = work.status === 'active' ? 'completed' : 'active';
    this.works = this.works.map(w => w.id === workId ? work : w);
    this.saveState();
    return { success: true, message: `Status da obra alterado para ${work.status === 'active' ? 'Ativa' : 'Concluída'}.` };
  }

  public deleteWork(workId: string): { success: boolean, message: string } {
    const exists = this.works.some(w => w.id === workId);
    if (!exists) return { success: false, message: 'Obra não encontrada.' };

    this.works = this.works.filter(w => w.id !== workId);
    this.saveState();
    supabase.from('construction_works').delete().eq('id', workId).then(({ error }) => {
      if (error) console.warn('Supabase delete failed for construction_works:', error);
    });
    return { success: true, message: 'Obra excluída do sistema com sucesso.' };
  }

  public addEquipmentType(name: string): { success: boolean, message: string } {
    if (!name.trim()) return { success: false, message: 'Nome do tipo é obrigatório.' };
    const newType: EquipmentType = {
      id: `type-${Date.now()}`,
      name: name.trim()
    };
    this.equipmentTypes.unshift(newType);
    this.saveState();
    return { success: true, message: 'Tipo adicionado com sucesso!' };
  }

  public deleteEquipmentType(id: string): { success: boolean, message: string } {
    this.equipmentTypes = this.equipmentTypes.filter(t => t.id !== id);
    this.saveState();
    supabase.from('equipment_types').delete().eq('id', id).then(({ error }) => {
      if (error) console.warn('Supabase delete failed for equipment_type:', error);
    });
    return { success: true, message: 'Tipo removido.' };
  }

  public addVehicleCategory(name: string): { success: boolean, message: string } {
    if (!name.trim()) return { success: false, message: 'Nome da categoria é obrigatório.' };
    const newCat: VehicleCategory = {
      id: `cat-${Date.now()}`,
      name: name.trim()
    };
    this.vehicleCategories.unshift(newCat);
    this.saveState();
    return { success: true, message: 'Categoria de veículo adicionada!' };
  }

  public deleteVehicleCategory(id: string): { success: boolean, message: string } {
    this.vehicleCategories = this.vehicleCategories.filter(c => c.id !== id);
    this.saveState();
    supabase.from('vehicle_categories').delete().eq('id', id).then(({ error }) => {
      if (error) console.warn('Supabase delete failed for vehicle_category:', error);
    });
    return { success: true, message: 'Categoria de veículo removida.' };
  }

  public authorizeAssetsToDriver(driverId: string, assetIds: string[]): { success: boolean, message: string } {
    const driver = this.users.find(u => u.id === driverId);
    if (!driver) return { success: false, message: 'Motorista não encontrado.' };

    driver.authorizedAssetIds = assetIds;
    this.users = this.users.map(u => u.id === driverId ? driver : u);
    
    // Sync current user if it is the one being updated
    if (this.currentUser && this.currentUser.id === driverId) {
      this.currentUser.authorizedAssetIds = assetIds;
    }

    this.saveState();
    return { success: true, message: 'Autorizações atualizadas com sucesso!' };
  }

  public createSupplier(data: {
    cnpj: string;
    corporateName: string;
    tradeName?: string;
    category: SupplierCategory;
    contactName?: string;
    phone?: string;
    email?: string;
    city?: string;
    state?: string;
    servicesOrProducts?: string;
    status?: 'active' | 'inactive';
  }): { success: boolean, message: string, supplier?: Supplier } {
    const rawCnpj = data.cnpj.replace(/\D/g, '');
    if (!rawCnpj) {
      return { success: false, message: 'O CNPJ é obrigatório.' };
    }
    if (rawCnpj.length !== 14) {
      return { success: false, message: 'O CNPJ deve conter exatamente 14 dígitos numéricos.' };
    }

    if (!data.corporateName.trim()) {
      return { success: false, message: 'O Nome da Razão Social é obrigatório.' };
    }

    if (!data.category || (data.category !== 'fornecedor' && data.category !== 'prestador')) {
      return { success: false, message: 'A categoria deve ser "Fornecedor" ou "Prestador".' };
    }

    // Format CNPJ as XX.XXX.XXX/XXXX-XX
    const formattedCnpj = rawCnpj.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    );

    // Check if CNPJ already registered
    const exists = this.suppliers.some(s => s.cnpj.replace(/\D/g, '') === rawCnpj);
    if (exists) {
      return { success: false, message: 'Já existe um fornecedor ou prestador cadastrado com este CNPJ.' };
    }

    const newSupplier: Supplier = {
      id: `sup-${Date.now()}`,
      cnpj: formattedCnpj,
      corporateName: data.corporateName.trim(),
      tradeName: data.tradeName?.trim() || undefined,
      category: data.category,
      contactName: data.contactName?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      email: data.email?.trim() || undefined,
      city: data.city?.trim() || undefined,
      state: data.state?.trim().toUpperCase() || undefined,
      servicesOrProducts: data.servicesOrProducts?.trim() || undefined,
      status: data.status || 'active',
      createdAt: new Date().toISOString()
    };

    this.suppliers.unshift(newSupplier);
    this.saveState();
    return { success: true, message: `${data.category === 'prestador' ? 'Prestador' : 'Fornecedor'} cadastrado com sucesso!`, supplier: newSupplier };
  }

  public updateSupplier(supplier: Supplier): { success: boolean, message: string } {
    const rawCnpj = supplier.cnpj.replace(/\D/g, '');
    if (!rawCnpj || rawCnpj.length !== 14) {
      return { success: false, message: 'O CNPJ deve conter 14 dígitos numéricos.' };
    }
    if (!supplier.corporateName.trim()) {
      return { success: false, message: 'O Nome da Razão Social é obrigatório.' };
    }
    if (supplier.category !== 'fornecedor' && supplier.category !== 'prestador') {
      return { success: false, message: 'A categoria deve ser "Fornecedor" ou "Prestador".' };
    }

    const index = this.suppliers.findIndex(s => s.id === supplier.id);
    if (index === -1) {
      return { success: false, message: 'Fornecedor/Prestador não encontrado no sistema.' };
    }

    // Check if CNPJ is used by another supplier
    const duplicate = this.suppliers.some(s => s.id !== supplier.id && s.cnpj.replace(/\D/g, '') === rawCnpj);
    if (duplicate) {
      return { success: false, message: 'Este CNPJ já está sendo utilizado por outro cadastro.' };
    }

    const formattedCnpj = rawCnpj.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    );

    this.suppliers = this.suppliers.map(s => s.id === supplier.id ? {
      ...s,
      cnpj: formattedCnpj,
      corporateName: supplier.corporateName.trim(),
      tradeName: supplier.tradeName?.trim() || undefined,
      category: supplier.category,
      contactName: supplier.contactName?.trim() || undefined,
      phone: supplier.phone?.trim() || undefined,
      email: supplier.email?.trim() || undefined,
      city: supplier.city?.trim() || undefined,
      state: supplier.state?.trim().toUpperCase() || undefined,
      servicesOrProducts: supplier.servicesOrProducts?.trim() || undefined,
      status: supplier.status || 'active'
    } : s);

    this.saveState();
    return { success: true, message: 'Cadastro atualizado com sucesso!' };
  }

  public toggleSupplierStatus(supplierId: string): { success: boolean, message: string } {
    const supplier = this.suppliers.find(s => s.id === supplierId);
    if (!supplier) return { success: false, message: 'Fornecedor/Prestador não encontrado.' };

    supplier.status = supplier.status === 'active' ? 'inactive' : 'active';
    this.suppliers = this.suppliers.map(s => s.id === supplierId ? supplier : s);
    this.saveState();
    return { success: true, message: `Status alterado para ${supplier.status === 'active' ? 'Ativo' : 'Inativo'}.` };
  }

  public deleteSupplier(supplierId: string): { success: boolean, message: string } {
    const exists = this.suppliers.some(s => s.id === supplierId);
    if (!exists) return { success: false, message: 'Fornecedor/Prestador não encontrado.' };

    this.suppliers = this.suppliers.filter(s => s.id !== supplierId);
    this.saveState();
    supabase.from('suppliers').delete().eq('id', supplierId).then(({ error }) => {
      if (error) console.warn('Supabase delete failed for suppliers:', error);
    });
    return { success: true, message: 'Cadastro excluído com sucesso.' };
  }

  // --- CONTROLE DE COMBUSTÍVEL ---

  public getWorkFuelBalance(workId: string): WorkFuelBalance {
    const work = this.works.find(w => w.id === workId);
    const workName = work?.name || 'Obra não identificada';

    const inflows = this.fuelInflows.filter(i => i.workId === workId);
    // Apenas abastecimentos consumindo o estoque da obra (dispenseType !== 'fornecedor_direto') abatem do saldo da obra
    const dispenses = this.fuelDispenses.filter(d => d.workId === workId && d.dispenseType !== 'fornecedor_direto');

    const totalInflowLiters = inflows.reduce((sum, item) => sum + (Number(item.liters) || 0), 0);
    const totalCost = inflows.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
    const averageCostPerLiter = totalInflowLiters > 0 ? (totalCost / totalInflowLiters) : 0;

    const totalDispenseLiters = dispenses.reduce((sum, item) => sum + (Number(item.liters) || 0), 0);
    const balanceLiters = Math.max(0, totalInflowLiters - totalDispenseLiters);

    // Differentiate by fuel type: Diesel vs Gasolina
    const isDiesel = (t?: string) => (t || '').toLowerCase().includes('diesel');
    const isGasolina = (t?: string) => (t || '').toLowerCase().includes('gasolina');

    // Diesel metrics
    const dieselInflows = inflows.filter(i => isDiesel(i.fuelType));
    const dieselDispenses = dispenses.filter(d => isDiesel(d.fuelType));
    const dieselInflowLiters = dieselInflows.reduce((sum, item) => sum + (Number(item.liters) || 0), 0);
    const dieselTotalCost = dieselInflows.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
    const dieselDispenseLiters = dieselDispenses.reduce((sum, item) => sum + (Number(item.liters) || 0), 0);
    const dieselBalanceLiters = Math.max(0, dieselInflowLiters - dieselDispenseLiters);
    const dieselAvgCost = dieselInflowLiters > 0 ? (dieselTotalCost / dieselInflowLiters) : 0;

    // Gasolina metrics
    const gasolinaInflows = inflows.filter(i => isGasolina(i.fuelType));
    const gasolinaDispenses = dispenses.filter(d => isGasolina(d.fuelType));
    const gasolinaInflowLiters = gasolinaInflows.reduce((sum, item) => sum + (Number(item.liters) || 0), 0);
    const gasolinaTotalCost = gasolinaInflows.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
    const gasolinaDispenseLiters = gasolinaDispenses.reduce((sum, item) => sum + (Number(item.liters) || 0), 0);
    const gasolinaBalanceLiters = Math.max(0, gasolinaInflowLiters - gasolinaDispenseLiters);
    const gasolinaAvgCost = gasolinaInflowLiters > 0 ? (gasolinaTotalCost / gasolinaInflowLiters) : 0;

    return {
      workId,
      workName,
      totalInflowLiters: Math.round(totalInflowLiters * 100) / 100,
      totalDispenseLiters: Math.round(totalDispenseLiters * 100) / 100,
      balanceLiters: Math.round(balanceLiters * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      averageCostPerLiter: Math.round(averageCostPerLiter * 100) / 100,
      inflowCount: inflows.length,
      dispenseCount: dispenses.length,
      diesel: {
        fuelType: 'Diesel',
        inflowLiters: Math.round(dieselInflowLiters * 100) / 100,
        dispenseLiters: Math.round(dieselDispenseLiters * 100) / 100,
        balanceLiters: Math.round(dieselBalanceLiters * 100) / 100,
        totalCost: Math.round(dieselTotalCost * 100) / 100,
        averageCostPerLiter: Math.round(dieselAvgCost * 100) / 100,
        inflowCount: dieselInflows.length,
        dispenseCount: dieselDispenses.length,
      },
      gasolina: {
        fuelType: 'Gasolina',
        inflowLiters: Math.round(gasolinaInflowLiters * 100) / 100,
        dispenseLiters: Math.round(gasolinaDispenseLiters * 100) / 100,
        balanceLiters: Math.round(gasolinaBalanceLiters * 100) / 100,
        totalCost: Math.round(gasolinaTotalCost * 100) / 100,
        averageCostPerLiter: Math.round(gasolinaAvgCost * 100) / 100,
        inflowCount: gasolinaInflows.length,
        dispenseCount: gasolinaDispenses.length,
      }
    };
  }

  public getAllWorksFuelBalances(): WorkFuelBalance[] {
    return this.works.map(work => this.getWorkFuelBalance(work.id));
  }

  public createFuelInflow(data: {
    workId: string;
    workName: string;
    supplierId: string;
    supplierName: string;
    supplierCnpj?: string;
    fiscalDocType: FiscalDocType;
    fiscalDocNumber: string;
    fuelType: string;
    liters: number;
    totalCost: number;
    unitCost?: number;
    date: string;
    receivedBy?: string;
    notes?: string;
  }): { success: boolean; message: string; inflow?: FuelInflow } {
    if (!data.workId) return { success: false, message: 'Selecione a Obra de destino do combustível.' };
    if (!data.supplierId) return { success: false, message: 'Selecione o Fornecedor credenciado.' };
    if (!data.fiscalDocNumber || !data.fiscalDocNumber.trim()) {
      return { success: false, message: 'Informe o número do controle fiscal (Nota Fiscal ou Pedido de Compra).' };
    }
    if (!data.liters || data.liters <= 0) return { success: false, message: 'Informe uma quantidade de litros válida maior que zero.' };
    if (data.totalCost < 0) return { success: false, message: 'O custo total não pode ser negativo.' };

    const calculatedUnitCost = data.unitCost && data.unitCost > 0
      ? data.unitCost
      : data.liters > 0 ? (data.totalCost / data.liters) : 0;

    const newInflow: FuelInflow = {
      id: `fuel-inflow-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      workId: data.workId,
      workName: data.workName,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      supplierCnpj: data.supplierCnpj,
      fiscalDocType: data.fiscalDocType || 'nf',
      fiscalDocNumber: data.fiscalDocNumber.trim(),
      fuelType: data.fuelType || 'Diesel',
      liters: Number(data.liters),
      totalCost: Number(data.totalCost),
      unitCost: Math.round(calculatedUnitCost * 1000) / 1000,
      date: data.date || new Date().toISOString().split('T')[0],
      receivedBy: data.receivedBy?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    this.fuelInflows = [newInflow, ...this.fuelInflows];
    this.saveState();
    return { success: true, message: 'Entrada de combustível cadastrada com sucesso!', inflow: newInflow };
  }

  public deleteFuelInflow(inflowId: string): { success: boolean; message: string } {
    const exists = this.fuelInflows.some(i => i.id === inflowId);
    if (!exists) return { success: false, message: 'Entrada não encontrada.' };

    this.fuelInflows = this.fuelInflows.filter(i => i.id !== inflowId);
    this.saveState();
    supabase.from('fuel_inflows').delete().eq('id', inflowId).then(({ error }) => {
      if (error) console.warn('Supabase delete failed for fuel_inflows:', error);
    });
    return { success: true, message: 'Entrada de combustível excluída com sucesso.' };
  }

  public createFuelDispense(data: {
    dispenseType?: FuelDispenseType;
    workId?: string;
    workName?: string;
    supplierId?: string;
    supplierName?: string;
    supplierCnpj?: string;
    fiscalDocType?: FiscalDocType;
    fiscalDocNumber?: string;
    vehicleId: string;
    vehiclePlate: string;
    vehicleModel: string;
    fuelType: string;
    liters: number;
    currentKmOrHours?: number;
    unitCost?: number;
    totalCost?: number;
    driverId?: string;
    driverName?: string;
    date: string;
    notes?: string;
  }): { success: boolean; message: string; dispense?: FuelDispense } {
    const isDirectSupplier = data.dispenseType === 'fornecedor_direto';

    if (isDirectSupplier) {
      if (!data.supplierId) return { success: false, message: 'Selecione o Fornecedor/Posto para o abastecimento direto.' };
    } else {
      if (!data.workId) return { success: false, message: 'Selecione a Obra de origem para debitar o combustível.' };
    }

    if (!data.vehicleId) return { success: false, message: 'Selecione o veículo a ser abastecido.' };
    if (!data.liters || data.liters <= 0) return { success: false, message: 'Informe a quantidade em litros abastecida.' };

    const targetVehicle = this.vehicles.find(v => v.id === data.vehicleId);
    if (targetVehicle && targetVehicle.tankCapacityLiters && targetVehicle.tankCapacityLiters > 0) {
      if (Number(data.liters) > targetVehicle.tankCapacityLiters) {
        return {
          success: false,
          message: `A quantidade informada (${data.liters} L) excede a capacidade máxima do tanque do veículo ${targetVehicle.plate} (${targetVehicle.tankCapacityLiters} Litros).`
        };
      }
    }

    let calculatedCost = 0;
    let finalUnitCost = data.unitCost;
    let finalTotalCost = data.totalCost;

    if (isDirectSupplier) {
      if (finalTotalCost && finalTotalCost > 0) {
        finalUnitCost = data.liters > 0 ? (finalTotalCost / data.liters) : 0;
        calculatedCost = finalTotalCost;
      } else if (finalUnitCost && finalUnitCost > 0) {
        finalTotalCost = Math.round((finalUnitCost * data.liters) * 100) / 100;
        calculatedCost = finalTotalCost;
      }
    } else if (data.workId) {
      const balance = this.getWorkFuelBalance(data.workId);
      const isGas = (data.fuelType || '').toLowerCase().includes('gasolina');
      const fuelMetric = isGas ? balance.gasolina : balance.diesel;
      finalUnitCost = fuelMetric.averageCostPerLiter > 0 
        ? fuelMetric.averageCostPerLiter 
        : balance.averageCostPerLiter > 0 ? balance.averageCostPerLiter : (isGas ? 5.89 : 6.15);
      calculatedCost = Math.round((finalUnitCost * data.liters) * 100) / 100;
      finalTotalCost = calculatedCost;
    }

    const newDispense: FuelDispense = {
      id: `fuel-dispense-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      dispenseType: data.dispenseType || 'obra',
      workId: data.workId || undefined,
      workName: data.workName || (isDirectSupplier ? 'Abastecimento Externo' : undefined),
      supplierId: data.supplierId || undefined,
      supplierName: data.supplierName || undefined,
      supplierCnpj: data.supplierCnpj || undefined,
      fiscalDocType: data.fiscalDocType || undefined,
      fiscalDocNumber: data.fiscalDocNumber?.trim() || undefined,
      vehicleId: data.vehicleId,
      vehiclePlate: data.vehiclePlate,
      vehicleModel: data.vehicleModel,
      fuelType: data.fuelType || 'Diesel',
      liters: Number(data.liters),
      currentKmOrHours: data.currentKmOrHours ? Number(data.currentKmOrHours) : undefined,
      unitCost: finalUnitCost ? Math.round(Number(finalUnitCost) * 1000) / 1000 : undefined,
      totalCost: finalTotalCost ? Math.round(Number(finalTotalCost) * 100) / 100 : undefined,
      calculatedCost: Math.round(calculatedCost * 100) / 100,
      driverId: data.driverId,
      driverName: data.driverName?.trim() || undefined,
      date: data.date || new Date().toISOString(),
      notes: data.notes?.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    // Update vehicle current KM if provided and higher
    const vehicle = this.vehicles.find(v => v.id === data.vehicleId);
    if (vehicle) {
      if (data.currentKmOrHours && data.currentKmOrHours > vehicle.currentKm) {
        vehicle.currentKm = Number(data.currentKmOrHours);
      }
      // Ensure vehicle has work association if missing and workId was provided
      if (!vehicle.workId && data.workId && data.workName) {
        vehicle.workId = data.workId;
        vehicle.workName = data.workName;
      }
    }

    this.fuelDispenses = [newDispense, ...this.fuelDispenses];
    this.saveState();

    let warningText = '';
    if (!isDirectSupplier && data.workId) {
      const balance = this.getWorkFuelBalance(data.workId);
      if (data.liters > balance.balanceLiters) {
        warningText = ` (Atenção: abastecimento excedeu o saldo prévio de estoque da obra)`;
      }
    }

    const typeDesc = isDirectSupplier
      ? `diretamente no fornecedor ${data.supplierName || ''}`
      : `com estoque da obra ${data.workName || ''}`;

    return { 
      success: true, 
      message: `Abastecimento de ${data.liters} L registrado com sucesso (${typeDesc})!${warningText}`, 
      dispense: newDispense 
    };
  }

  public deleteFuelDispense(dispenseId: string): { success: boolean; message: string } {
    const exists = this.fuelDispenses.some(d => d.id === dispenseId);
    if (!exists) return { success: false, message: 'Abastecimento não encontrado.' };

    this.fuelDispenses = this.fuelDispenses.filter(d => d.id !== dispenseId);
    this.saveState();
    supabase.from('fuel_dispenses').delete().eq('id', dispenseId).then(({ error }) => {
      if (error) console.warn('Supabase delete failed for fuel_dispenses:', error);
    });
    return { success: true, message: 'Abastecimento excluído com sucesso.' };
  }

  // ============================================================================
  // CONTROLE DE LOGÍSTICA (PROGRAMAÇÃO DE VIAGENS, PERMANÊNCIAS E LOCAÇÃO)
  // ============================================================================

  public async toggleVehicleLogisticsControl(vehicleId: string, enabled: boolean): Promise<{ success: boolean; synced: boolean; message: string }> {
    const vehicle = this.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return { success: false, synced: false, message: 'Veículo não encontrado.' };

    const previousFlag = Boolean(vehicle.hasLogisticsControl);
    const flag = Boolean(enabled);
    const updatedVehicle: Vehicle = { ...vehicle, hasLogisticsControl: flag };
    this.vehicles = this.vehicles.map(v => (v.id === vehicleId ? updatedVehicle : v));
    this.persistLocalState();
    this.triggerListeners();

    try {
      const { data, error } = await supabase
        .from('vehicles')
        .update({ hasLogisticsControl: flag })
        .eq('id', vehicleId)
        .select('id');

      let finalError = error;
      if (!finalError && (!data || data.length === 0)) {
        const upsertRes = await supabase
          .from('vehicles')
          .upsert(this.sanitizeVehicleForSupabase(updatedVehicle));
        finalError = upsertRes.error;
      }

      if (finalError) {
        this.vehicles = this.vehicles.map(v =>
          v.id === vehicleId ? { ...v, hasLogisticsControl: previousFlag } : v
        );
        this.persistLocalState();
        this.triggerListeners();
        return {
          success: false,
          synced: false,
          message: `Falha ao atualizar Controle de Logística no Supabase (${vehicle.plate}): ${finalError.message}. Execute o SQL da coluna "hasLogisticsControl" e "NOTIFY pgrst, 'reload schema';" no SQL Editor do Supabase.`
        };
      }

      this.updatePreviousState();
      return {
        success: true,
        synced: true,
        message: flag
          ? `Controle de Logística ativado para ${vehicle.plate} e salvo no Supabase.`
          : `Controle de Logística desativado para ${vehicle.plate} e salvo no Supabase.`
      };
    } catch (e: any) {
      this.vehicles = this.vehicles.map(v =>
        v.id === vehicleId ? { ...v, hasLogisticsControl: previousFlag } : v
      );
      this.persistLocalState();
      this.triggerListeners();
      return {
        success: false,
        synced: false,
        message: `Erro ao sincronizar Controle de Logística com o Supabase (${vehicle.plate}): ${e?.message || e}`
      };
    }
  }

  public addLogisticsSchedule(data: {
    vehicleId: string;
    allocationType?: LogisticsAllocationType;
    scheduleStatus?: LogisticsScheduleStatus;
    isThirdPartyRental: boolean;
    thirdPartyName?: string;
    workId?: string;
    programDescription?: string;
    originWorkId?: string;
    originLabel?: string;
    originCity?: string;
    originState?: string;
    destinationLabel: string;
    destinationCity: string;
    destinationState: string;
    cargoDescription?: string;
    startDate: string;
    endDate: string;
    driverId?: string;
    notes?: string;
  }): { success: boolean; message: string; schedule?: LogisticsSchedule } {
    const vehicle = this.vehicles.find(v => v.id === data.vehicleId);
    if (!vehicle) {
      return { success: false, message: 'Veículo selecionado não encontrado.' };
    }
    if (!data.startDate || !data.endDate) {
      return { success: false, message: 'Informe as datas inicial e final da programação.' };
    }
    if (data.endDate < data.startDate) {
      return { success: false, message: 'A data final não pode ser anterior à data inicial.' };
    }
    if (!data.originLabel?.trim() || !data.originCity?.trim() || !data.originState?.trim()) {
      return { success: false, message: 'Informe a origem (obra ou descrição livre), cidade e estado (UF).' };
    }
    if (!data.destinationLabel.trim() || !data.destinationCity.trim() || !data.destinationState.trim()) {
      return { success: false, message: 'Informe o destino (obra ou destino livre), cidade e estado (UF).' };
    }
    if ((data.isThirdPartyRental || data.allocationType === 'terceiros') && !data.thirdPartyName?.trim()) {
      return { success: false, message: 'Informe o nome do terceiro/cliente locatário.' };
    }

    const matchedOriginWork = data.originWorkId ? this.works.find(w => w.id === data.originWorkId) : undefined;
    const matchedDestWork = data.workId ? this.works.find(w => w.id === data.workId) : undefined;
    const matchedDriver = data.driverId ? this.users.find(u => u.id === data.driverId) : undefined;

    const newSchedule: LogisticsSchedule = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      vehicleId: vehicle.id,
      vehicleModelPlate: `${vehicle.brand} ${vehicle.model} (${vehicle.plate})`,
      allocationType: data.allocationType || 'uso_programado',
      scheduleStatus: data.scheduleStatus || 'programado',
      isThirdPartyRental: Boolean(data.isThirdPartyRental || data.allocationType === 'terceiros'),
      thirdPartyName: data.thirdPartyName?.trim() || undefined,
      workId: matchedDestWork?.id,
      workName: matchedDestWork?.name,
      programDescription: matchedDestWork ? undefined : (data.programDescription?.trim() || undefined),
      originWorkId: matchedOriginWork?.id,
      originWorkName: matchedOriginWork?.name,
      originLabel: matchedOriginWork ? matchedOriginWork.name : data.originLabel.trim(),
      originCity: data.originCity.trim(),
      originState: data.originState.trim().toUpperCase(),
      destinationLabel: matchedDestWork ? matchedDestWork.name : data.destinationLabel.trim(),
      destinationCity: data.destinationCity.trim(),
      destinationState: data.destinationState.trim().toUpperCase(),
      cargoDescription: data.cargoDescription?.trim() || undefined,
      startDate: data.startDate,
      endDate: data.endDate,
      driverId: matchedDriver?.id,
      driverName: matchedDriver?.name,
      notes: data.notes?.trim() || undefined,
      createdBy: this.currentUser?.name,
      createdAt: new Date().toISOString()
    };

    this.logisticsSchedules = [newSchedule, ...this.logisticsSchedules];
    this.saveState();
    return {
      success: true,
      message: `Programação logística registrada para ${vehicle.plate}!`,
      schedule: newSchedule
    };
  }

  public updateLogisticsSchedule(updated: LogisticsSchedule): { success: boolean; message: string } {
    const exists = this.logisticsSchedules.some(s => s.id === updated.id);
    if (!exists) return { success: false, message: 'Programação não encontrada.' };
    if (updated.endDate < updated.startDate) {
      return { success: false, message: 'A data final não pode ser anterior à data inicial.' };
    }

    const vehicle = this.vehicles.find(v => v.id === updated.vehicleId);
    const matchedOriginWork = updated.originWorkId ? this.works.find(w => w.id === updated.originWorkId) : undefined;
    const matchedDestWork = updated.workId ? this.works.find(w => w.id === updated.workId) : undefined;
    const matchedDriver = updated.driverId ? this.users.find(u => u.id === updated.driverId) : undefined;

    const sanitized: LogisticsSchedule = {
      ...updated,
      allocationType: updated.allocationType || 'uso_programado',
      vehicleModelPlate: vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.plate})` : updated.vehicleModelPlate,
      isThirdPartyRental: Boolean(updated.isThirdPartyRental || updated.allocationType === 'terceiros'),
      thirdPartyName: (updated.isThirdPartyRental || updated.allocationType === 'terceiros') ? updated.thirdPartyName?.trim() : undefined,
      workId: matchedDestWork?.id,
      workName: matchedDestWork?.name,
      programDescription: matchedDestWork ? undefined : (updated.programDescription?.trim() || undefined),
      originWorkId: matchedOriginWork?.id,
      originWorkName: matchedOriginWork?.name,
      originLabel: matchedOriginWork ? matchedOriginWork.name : (updated.originLabel?.trim() || ''),
      originCity: updated.originCity?.trim() || '',
      originState: (updated.originState || '').toUpperCase(),
      destinationLabel: matchedDestWork ? matchedDestWork.name : updated.destinationLabel.trim(),
      destinationCity: updated.destinationCity.trim(),
      destinationState: updated.destinationState.toUpperCase(),
      cargoDescription: updated.cargoDescription?.trim() || undefined,
      driverName: matchedDriver?.name || (updated.driverId ? updated.driverName : undefined)
    };

    this.logisticsSchedules = this.logisticsSchedules.map(s => s.id === updated.id ? sanitized : s);
    this.saveState();
    return { success: true, message: 'Programação logística atualizada com sucesso!' };
  }

  public updateLogisticsScheduleStatus(id: string, scheduleStatus: LogisticsScheduleStatus): { success: boolean; message: string } {
    const exists = this.logisticsSchedules.some(s => s.id === id);
    if (!exists) return { success: false, message: 'Programação não encontrada.' };

    this.logisticsSchedules = this.logisticsSchedules.map(s =>
      s.id === id ? { ...s, scheduleStatus } : s
    );
    this.saveState();
    return { success: true, message: 'Status atualizado com sucesso!' };
  }

  public deleteLogisticsSchedule(id: string): { success: boolean; message: string } {
    const exists = this.logisticsSchedules.some(s => s.id === id);
    if (!exists) return { success: false, message: 'Programação não encontrada.' };

    this.logisticsSchedules = this.logisticsSchedules.filter(s => s.id !== id);
    this.saveState();
    supabase.from('logistics_schedules').delete().eq('id', id).then(({ error }) => {
      if (error) console.warn('Supabase delete failed for logistics_schedules:', error);
    });
    return { success: true, message: 'Programação removida com sucesso.' };
  }
}
export default FleetStore;
