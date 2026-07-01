import { User, UserRole, Vehicle, Trip, CheckInDetails, CheckOutDetails, Equipment, EquipmentCheckInDetails, EquipmentCheckOutDetails, EquipmentUsage, ConstructionWork, EquipmentType, VehicleCategory, MaintenanceLog } from '../types';
import { supabase } from '../lib/supabase';

// Simple high-quality odometer and dashboard SVGs represented as base64 or clean dataURI to seed initial photos nicely
const MOCK_ODOMETER_PHOTO = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%231e293b" /><circle cx="200" cy="150" r="100" fill="none" stroke="%2338bdf8" stroke-width="8" stroke-dasharray="300 100" /><path d="M 200 150 L 140 100" stroke="%23ef4444" stroke-width="6" stroke-linecap="round" /><circle cx="200" cy="150" r="12" fill="%23f8fafc" /><rect x="150" y="200" width="100" height="30" rx="4" fill="%230f172a" stroke="%23334155" stroke-width="2" /><text x="200" y="221" font-family="monospace" font-size="16" fill="%2322c55e" font-weight="bold" text-anchor="middle">045230 km</text><text x="200" y="110" font-family="sans-serif" font-size="12" fill="%2394a3b8" text-anchor="middle">HODÔMETRO</text><text x="200" y="270" font-family="sans-serif" font-size="10" fill="%2364748b" text-anchor="middle">FROTA CONTROL - REGISTRO ATIVO</text></svg>';

const MOCK_CHECKOUT_PHOTO = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%230f172a" /><circle cx="200" cy="150" r="90" fill="none" stroke="%2322c55e" stroke-width="6" /><path d="M 120 150 a 80 80 0 0 1 160 0" fill="none" stroke="%23e2e8f0" stroke-width="3" stroke-dasharray="10 5" /><text x="200" y="145" font-family="sans-serif" font-size="14" fill="%23e2e8f0" text-anchor="middle" font-weight="600">CHECKOUT OK</text><rect x="130" y="170" width="140" height="40" rx="6" fill="%231e293b" /><text x="200" y="195" font-family="monospace" font-size="18" fill="%2338bdf8" font-weight="bold" text-anchor="middle">045410 km</text><path d="M 160 240 L 240 240" stroke="%2322c55e" stroke-width="4" stroke-linecap="round" /><circle cx="200" cy="80" r="10" fill="%2322c55e" /><text x="200" y="265" font-family="sans-serif" font-size="10" fill="%2364748b" text-anchor="middle">Retorno sem avarias registradas</text></svg>';

const MOCK_HORIMETRO_PHOTO = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%230f172a" /><circle cx="200" cy="140" r="85" fill="none" stroke="%23fbbf24" stroke-width="8" stroke-dasharray="320 80" /><path d="M 200 140 L 210 85" stroke="%23f3f4f6" stroke-width="5" stroke-linecap="round" /><circle cx="200" cy="140" r="10" fill="%23fbbf24" /><rect x="130" y="200" width="140" height="32" rx="6" fill="%231e293b" stroke="%234b5563" stroke-width="2" /><text x="200" y="222" font-family="monospace" font-size="16" fill="%23fbbf24" font-weight="bold" text-anchor="middle">001240.5 h</text><text x="200" y="105" font-family="sans-serif" font-size="11" fill="%2394a3b8" text-anchor="middle" font-weight="bold">HORÍMETRO</text><text x="200" y="265" font-family="sans-serif" font-size="9" fill="%234b5563" text-anchor="middle">MAQUINÁRIO REGISTRADO</text></svg>';


const INITIAL_EQUIPMENT_TYPES: EquipmentType[] = [
  { id: 'type-1', name: 'Retroescavadeira' },
  { id: 'type-2', name: 'Caminhão Munck' },
  { id: 'type-3', name: 'Trator' }
];

const INITIAL_VEHICLE_CATEGORIES: VehicleCategory[] = [
  { id: 'cat-1', name: 'Utilitário' },
  { id: 'cat-2', name: 'Caminhão' }
];

const INITIAL_VEHICLES: Vehicle[] = [];

const INITIAL_USERS: User[] = [];

const INITIAL_TRIPS: Trip[] = [];

const INITIAL_EQUIPMENTS: Equipment[] = [
  {
    id: 'RET-01',
    name: 'Retroescavadeira Caterpillar 416F',
    brand: 'Caterpillar',
    model: '416F II',
    year: 2021,
    type: 'Retroescavadeira',
    currentHours: 1240.5,
    lastMaintenanceHours: 1000,
    maintenanceIntervalHours: 500,
    status: 'available',
    createdAt: new Date(Date.now() - 250 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'MNK-02',
    name: 'Caminhão Munck Ford Cargo',
    brand: 'Ford / Madal',
    model: 'Cargo 2429',
    year: 2019,
    type: 'Caminhão Munck',
    currentHours: 3450.2,
    lastMaintenanceHours: 3000,
    maintenanceIntervalHours: 500,
    status: 'available',
    createdAt: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'RET-02',
    name: 'Retroescavadeira Case 580N',
    brand: 'Case',
    model: '580N',
    year: 2018,
    type: 'Retroescavadeira',
    currentHours: 4890.0,
    lastMaintenanceHours: 4500,
    maintenanceIntervalHours: 500,
    status: 'maintenance',
    createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const INITIAL_EQUIPMENT_USAGES: EquipmentUsage[] = [];


// Helper to load typed JSON from localstorage
function loadFromStorage<T>(key: string, defaultValue: T): T {
  // Disable all caching as requested
  try {
    localStorage.removeItem(key);
  } catch (e) {
    // Ignore
  }
  return defaultValue;
}

const INITIAL_WORKS: ConstructionWork[] = [];

// Helper to save serializable JSON is safe
function saveToStorage<T>(key: string, data: T): void {
  // Disable all caching as requested
  return;
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
  public currentUser: User | null = null;

  // Snapshot for differential syncing
  private previousState: Record<string, string> = {};

  // Listeners list for component re-renders
  private listeners: (() => void)[] = [];

  private updatePreviousState() {
    this.previousState = {
      users: JSON.stringify(this.users),
      vehicles: JSON.stringify(this.vehicles),
      trips: JSON.stringify(this.trips),
      equipments: JSON.stringify(this.equipments),
      equipmentUsages: JSON.stringify(this.equipmentUsages),
      works: JSON.stringify(this.works),
      equipmentTypes: JSON.stringify(this.equipmentTypes),
      vehicleCategories: JSON.stringify(this.vehicleCategories),
    };
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

  private async loadFromSupabase() {
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
        maintenanceLogs
      ] = await Promise.all([
        fetchTable('users'),
        fetchTable('vehicles'),
        fetchTable('trips'),
        fetchTable('equipments'),
        fetchTable('equipment_usages'),
        fetchTable('construction_works'),
        fetchTable('equipment_types'),
        fetchTable('vehicle_categories'),
        fetchTable('maintenance_logs')
      ]);

      if (users !== null) this.users = users as User[];
      if (works !== null) this.works = works as ConstructionWork[];
      if (equipmentTypes !== null) this.equipmentTypes = equipmentTypes as EquipmentType[];
      if (vehicleCategories !== null) this.vehicleCategories = vehicleCategories as VehicleCategory[];
      if (trips !== null) this.trips = trips as Trip[];
      if (equipmentUsages !== null) this.equipmentUsages = equipmentUsages as EquipmentUsage[];
      
      const vData = vehicles as Vehicle[] | null;
      const eData = equipments as Equipment[] | null;
      const mLogs = maintenanceLogs as any[] | null;

      // Re-attach maintenance logs
      if (mLogs !== null) {
        if (vData !== null) {
          vData.forEach(v => {
            v.maintenanceHistory = mLogs.filter(log => log.assetId === v.id && log.assetType === 'vehicle');
          });
        }
        if (eData !== null) {
          eData.forEach(e => {
            e.maintenanceHistory = mLogs.filter(log => log.assetId === e.id && log.assetType === 'equipment');
          });
        }
      }

      if (vData !== null) this.vehicles = vData;
      if (eData !== null) this.equipments = eData;
      
      this.updatePreviousState();
      this.persistLocalState();
      this.triggerListeners();
    } catch (error) {
      console.warn("Exception during overall Supabase state loader:", error);
    }
  }

  private async syncTable(table: string, items: any[]) {
    if (!items || items.length === 0) return;
    try {
      const userIds = new Set(this.users.map(u => u.id));
      const workIds = new Set(this.works.map(w => w.id));
      const vehicleIds = new Set(this.vehicles.map(v => v.id));
      const equipmentIds = new Set(this.equipments.map(e => e.id));

      const getSanitizedItems = (colsToExclude: string[]) => {
        return items.map(item => {
          const copy = { ...item };
          if (table === 'vehicles' || table === 'equipments') {
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
          }

          // Clean up equipment_usages relation keys
          if (table === 'equipment_usages') {
            if (copy.operatorId && !userIds.has(copy.operatorId)) {
              copy.operatorId = null;
            }
            if (copy.equipmentId && !equipmentIds.has(copy.equipmentId)) {
              copy.equipmentId = null;
            }
          }

          // Apply dynamic column exclusion list
          for (const col of colsToExclude) {
            delete copy[col];
          }

          return copy;
        });
      };

      let columnsToExclude: string[] = [];
      let sanitized = getSanitizedItems(columnsToExclude);
      
      let { error } = await supabase.from(table).upsert(sanitized);

      if (error) {
        // Check if there is a missing column schema error
        const isColumnSchemaError = 
          error.message.includes('schema cache') || 
          error.message.includes('column') || 
          error.message.includes('does not exist');

        if (isColumnSchemaError) {
          // Detect missing columns dynamically if matches
          const match = error.message.match(/Could not find the '([^']+)' column/i);
          if (match && match[1]) {
            columnsToExclude.push(match[1]);
          } else {
            // Under users table, fallback to strip 'isApproved' and 'password' pre-emptively
            if (table === 'users') {
              if (error.message.includes('isApproved')) {
                columnsToExclude.push('isApproved');
              }
              if (error.message.includes('password')) {
                columnsToExclude.push('password');
              }
              if (columnsToExclude.length === 0) {
                columnsToExclude.push('isApproved', 'password');
              }
            }
          }

          if (columnsToExclude.length > 0) {
            sanitized = getSanitizedItems(columnsToExclude);
            const retryRes = await supabase.from(table).upsert(sanitized);
            error = retryRes.error;

            if (error) {
              const match2 = error.message.match(/Could not find the '([^']+)' column/i);
              if (match2 && match2[1] && !columnsToExclude.includes(match2[1])) {
                columnsToExclude.push(match2[1]);
                sanitized = getSanitizedItems(columnsToExclude);
                const retryRes2 = await supabase.from(table).upsert(sanitized);
                error = retryRes2.error;
              }
            }
          }
        }
      }

      if (error) {
        const isSchemaWarning = error.message && (
          error.message.includes('schema cache') || 
          error.message.includes('relation') || 
          error.message.includes('does not exist') ||
          error.message.includes('column')
        );

        // If it's a "Failed to fetch" (network/offline error), log as warning instead of console.error to keep the app functional
        if (error.message && error.message.includes('Failed to fetch')) {
          console.warn(`[Supabase Offline/Blocked] Failed to sync ${table} - local changes are fully preserved locally.`);
        } else if (isSchemaWarning) {
          console.warn(`[Supabase Schema Out of Sync] Table '${table}' could not be synced: ${error.message}. Please run the contents of 'supabase-schema.sql' in your Supabase SQL Editor to make sure all tables exist.`);
        } else {
          console.error(`Error syncing ${table}:`, error.message);
        }
      }
    } catch (e: any) {
      const isSchemaWarning = e && e.message && (
        e.message.includes('schema cache') || 
        e.message.includes('relation') || 
        e.message.includes('does not exist') ||
        e.message.includes('column')
      );

      if (e && e.message && e.message.includes('Failed to fetch')) {
        console.warn(`[Supabase Offline/Blocked] Exception syncing ${table} - connection unavailable.`);
      } else if (isSchemaWarning) {
        console.warn(`[Supabase Schema Out of Sync Exception] Table '${table}' exception during sync: ${e.message}. Please verify Supabase setup.`);
      } else {
        console.error(`Exception syncing ${table}:`, e);
      }
    }
  }

  private async syncMaintenanceLogs() {
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
      // Differential sync for maintenance_logs might be complex without a previousState key, 
      // but let's just push everything as they are small, or use a pseudo changed logic
      // For now, we will push all maintenance logs, they are usually rare.
      await this.syncTable('maintenance_logs', logs);
    }
  }

  private async backgroundSync() {
    try {
      // Find differences using getChangedItems
      const cUsers = this.getChangedItems('users', this.users);
      const cWorks = this.getChangedItems('works', this.works);
      const cEqTypes = this.getChangedItems('equipmentTypes', this.equipmentTypes);
      const cVehCats = this.getChangedItems('vehicleCategories', this.vehicleCategories);
      
      const cVehicles = this.getChangedItems('vehicles', this.vehicles);
      const cEquipments = this.getChangedItems('equipments', this.equipments);
      
      const cTrips = this.getChangedItems('trips', this.trips);
      const cUsages = this.getChangedItems('equipmentUsages', this.equipmentUsages);

      // Sync only changed items
      if (cUsers.length) await this.syncTable('users', cUsers);
      if (cWorks.length) await this.syncTable('construction_works', cWorks);
      if (cEqTypes.length) await this.syncTable('equipment_types', cEqTypes);
      if (cVehCats.length) await this.syncTable('vehicle_categories', cVehCats);

      if (cVehicles.length) await this.syncTable('vehicles', cVehicles);
      if (cEquipments.length) await this.syncTable('equipments', cEquipments);

      if (cTrips.length) await this.syncTable('trips', cTrips);
      if (cUsages.length) await this.syncTable('equipment_usages', cUsages);

      // Sync maintenance logs
      await this.syncMaintenanceLogs();

      // Update the previous state snapshot after successful sync
      this.updatePreviousState();
    } catch (e) {
      console.error("Exception in backgroundSync:", e);
    }
  }

  private constructor() {
    this.loadState();
    this.loadFromSupabase();

    // Listen to changes from other tabs to prevent state skew and re-inserting deleted items
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.startsWith('ff_')) {
        this.loadState();
        this.triggerListeners();
      }
    });

    // Auto-refresh when the app comes back into focus
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.loadFromSupabase();
        }
      });
      window.addEventListener('focus', () => {
        this.loadFromSupabase();
      });
    }
  }

  public static getInstance(): FleetStore {
    if (!FleetStore.instance) {
      FleetStore.instance = new FleetStore();
    }
    return FleetStore.instance;
  }

  private loadState() {
    this.users = loadFromStorage<User[]>('ff_users', INITIAL_USERS);
    this.vehicles = loadFromStorage<Vehicle[]>('ff_vehicles', INITIAL_VEHICLES);
    this.trips = loadFromStorage<Trip[]>('ff_trips', INITIAL_TRIPS);
    this.equipments = loadFromStorage<Equipment[]>('ff_equipments', INITIAL_EQUIPMENTS);
    this.equipmentUsages = loadFromStorage<EquipmentUsage[]>('ff_equipment_usages', INITIAL_EQUIPMENT_USAGES);
    this.works = loadFromStorage<ConstructionWork[]>('ff_works', INITIAL_WORKS);
    this.equipmentTypes = loadFromStorage<EquipmentType[]>('ff_equipment_types', INITIAL_EQUIPMENT_TYPES);
    this.vehicleCategories = loadFromStorage<VehicleCategory[]>('ff_vehicle_categories', INITIAL_VEHICLE_CATEGORIES);
    this.currentUser = loadFromStorage<User | null>('ff_current_user', null);

    // Dynamic backfill migration: ensure all existing users have a valid loginId, password, and isApproved fields
    let migrated = false;
    this.users = this.users.map(u => {
      let changed = false;
      let loginIdValue = u.loginId;
      if (!loginIdValue) {
        let prefix = '';
        if (u.email) {
          prefix = u.email.split('@')[0].trim().toLowerCase();
        } else {
          prefix = u.name.split(' ')[0].trim().toLowerCase() + '-' + u.id.replace('user-', '').substring(0, 4);
        }
        // Cleanup any unexpected characters from migrated loginId
        prefix = prefix.replace(/[^a-z0-9._-]/g, '');
        loginIdValue = prefix || 'user_' + u.id;
        changed = true;
      }

      let passwordValue = u.password;
      if (!passwordValue) {
        passwordValue = '123456';
        changed = true;
      }

      let approvedValue = u.isApproved;
      if (approvedValue === undefined) {
        approvedValue = true;
        changed = true;
      }

      if (changed) {
        migrated = true;
        return { ...u, loginId: loginIdValue, password: passwordValue, isApproved: approvedValue };
      }
      return u;
    });

    // If active current user is loaded but lacks loginId, update them too
    if (this.currentUser && !this.currentUser.loginId) {
      migrated = true;
      const matchedUser = this.users.find(u => u.id === this.currentUser?.id);
      if (matchedUser) {
        this.currentUser = matchedUser;
      }
    }

    if (migrated) {
      this.saveState();
    }
  }

  private persistLocalState() {
    saveToStorage<User[]>('ff_users', this.users);
    saveToStorage<Vehicle[]>('ff_vehicles', this.vehicles);
    saveToStorage<Trip[]>('ff_trips', this.trips);
    saveToStorage<Equipment[]>('ff_equipments', this.equipments);
    saveToStorage<EquipmentUsage[]>('ff_equipment_usages', this.equipmentUsages);
    saveToStorage<ConstructionWork[]>('ff_works', this.works);
    saveToStorage<EquipmentType[]>('ff_equipment_types', this.equipmentTypes);
    saveToStorage<VehicleCategory[]>('ff_vehicle_categories', this.vehicleCategories);
    saveToStorage<User | null>('ff_current_user', this.currentUser);
  }

  private saveState() {
    this.persistLocalState();
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
    this.saveState();
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
    this.saveState();
  }

  public addVehicle(vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'status'>): { success: boolean, message: string } {
    const plateUpper = vehicleData.plate.trim().toUpperCase();
    if (this.vehicles.some(v => v.plate.toUpperCase() === plateUpper)) {
      return { success: false, message: `Já existe um carro registrado com a placa ${plateUpper}.` };
    }

    const newVehicle: Vehicle = {
      ...vehicleData,
      id: plateUpper,
      plate: plateUpper,
      status: 'available',
      createdAt: new Date().toISOString()
    };

    this.vehicles.unshift(newVehicle); // Newest first
    this.saveState();
    return { success: true, message: 'Veículo cadastrado adaptado com sucesso!' };
  }

  public updateVehicle(updatedVehicle: Vehicle) {
    this.vehicles = this.vehicles.map(v => v.id === updatedVehicle.id ? updatedVehicle : v);
    this.saveState();
  }

  public toggleVehicleStatus(vehicleId: string, newStatus: 'available' | 'maintenance') {
    this.vehicles = this.vehicles.map(v => {
      if (v.id === vehicleId) {
        if (v.status === 'in_use') return v;
        return { ...v, status: newStatus };
      }
      return v;
    });
    this.saveState();
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

  public releaseVehicleFromMaintenance(vehicleId: string, resolution: string, cost: number, isOilChange: boolean, nextOilChangeKm?: number): { success: boolean, message: string } {
    let success = false;
    let message = 'Veículo não encontrado.';
    this.vehicles = this.vehicles.map(v => {
      if (v.id === vehicleId) {
        if (v.status !== 'maintenance') {
          message = 'Este veículo não está em manutenção.';
          return v;
        }
        success = true;
        message = 'Veículo liberado da manutenção com sucesso!';
        
        const log: MaintenanceLog = {
          id: 'maint-log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          reason: v.maintenanceReason || 'Manutenção Corretiva/Preventiva Geral',
          sentAt: v.maintenanceSentAt || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          resolvedAt: new Date().toISOString(),
          resolution: resolution,
          cost: Number(cost) || 0,
          workId: v.workId,
          workName: v.workName,
          isOilChange: isOilChange
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
      checkIn: {
        ...details,
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

  public releaseEquipmentFromMaintenance(equipmentId: string, resolution: string, cost: number): { success: boolean, message: string } {
    let success = false;
    let message = 'Equipamento não encontrado.';
    this.equipments = this.equipments.map(e => {
      if (e.id === equipmentId) {
        if (e.status !== 'maintenance') {
          message = 'Este maquinário não está em manutenção.';
          return e;
        }
        success = true;
        message = 'Maquinário liberado da manutenção com sucesso!';
        
        const log: MaintenanceLog = {
          id: 'maint-log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          reason: e.maintenanceReason || 'Manutenção Corretiva/Preventiva Geral',
          sentAt: e.maintenanceSentAt || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          resolvedAt: new Date().toISOString(),
          resolution: resolution,
          cost: Number(cost) || 0,
          workId: e.workId,
          workName: e.workName
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
}
export default FleetStore;
