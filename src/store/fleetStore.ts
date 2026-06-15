import { User, Vehicle, Trip, CheckInDetails, CheckOutDetails, Equipment, EquipmentCheckInDetails, EquipmentCheckOutDetails, EquipmentUsage, ConstructionWork, EquipmentType, MaintenanceLog } from '../types';
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

const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: 'ABC-1234',
    model: 'Onix Hatch LTZ',
    plate: 'ABC-1234',
    brand: 'Chevrolet',
    year: 2022,
    color: 'Prata',
    currentKm: 45230,
    lastMaintenanceKm: 40000,
    maintenanceIntervalKm: 10000,
    status: 'available',
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'XYZ-9876',
    model: 'Corolla XEi 2.0',
    plate: 'XYZ-9876',
    brand: 'Toyota',
    year: 2023,
    color: 'Preto Metálico',
    currentKm: 18450,
    lastMaintenanceKm: 15000,
    maintenanceIntervalKm: 10000,
    status: 'in_use',
    createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'MNO-5555',
    model: 'Uno Attractive 1.0',
    plate: 'MNO-5555',
    brand: 'Fiat',
    year: 2018,
    color: 'Branco',
    currentKm: 123800,
    lastMaintenanceKm: 120000,
    maintenanceIntervalKm: 10000,
    status: 'available',
    createdAt: new Date(Date.now() - 1000 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'QWE-4422',
    model: 'HB20 Vision 1.6',
    plate: 'QWE-4422',
    brand: 'Hyundai',
    year: 2021,
    color: 'Vermelho',
    currentKm: 35600,
    lastMaintenanceKm: 30000,
    maintenanceIntervalKm: 10000,
    status: 'maintenance',
    createdAt: new Date(Date.now() - 250 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const INITIAL_USERS: User[] = [
  {
    id: 'admin-1',
    loginId: 'admin',
    name: 'Admin Principal',
    email: 'admin@frota.com',
    cpf: '111.111.111-11',
    licenseNumber: '12345678901',
    role: 'admin',
    isActive: true,
    createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'driver-1',
    loginId: 'joao',
    name: 'João Silva',
    email: 'joao@motorista.com',
    cpf: '222.222.222-22',
    licenseNumber: '98765432100',
    role: 'driver',
    isActive: true,
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'driver-2',
    loginId: 'maria',
    name: 'Maria Souza',
    email: 'maria@motorista.com',
    cpf: '333.333.333-33',
    licenseNumber: '55544433322',
    role: 'driver',
    isActive: true,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'manager-1',
    loginId: 'gerente',
    name: 'Gerente Geral',
    email: 'gerente@frota.com',
    cpf: '444.444.444-44',
    licenseNumber: '00000000000',
    role: 'gerencial',
    isActive: true,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const INITIAL_TRIPS: Trip[] = [
  {
    id: 'trip-completed-1',
    driverId: 'driver-2',
    driverName: 'Maria Souza',
    driverEmail: 'maria@motorista.com',
    vehicleId: 'ABC-1234',
    vehicleModelPlate: 'Chevrolet Onix Hatch LTZ (ABC-1234)',
    status: 'completed',
    checkIn: {
      km: 45050,
      fuel: 'Cheio',
      destination: 'Cliente Primário BH',
      reason: 'Visita Comercial / Demonstração do Produto',
      observations: 'Veículo em perfeito estado, tanque cheio.',
      photo: MOCK_ODOMETER_PHOTO,
      time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000).toISOString()
    },
    checkOut: {
      km: 45230,
      fuel: '3/4',
      observations: 'Viagem tranquila, o carro foi abastecido no retorno. Nenhuma ocorrência.',
      photo: MOCK_CHECKOUT_PHOTO,
      time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    kmDriven: 180,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'trip-active-1',
    driverId: 'driver-1',
    driverName: 'João Silva',
    driverEmail: 'joao@motorista.com',
    vehicleId: 'XYZ-9876',
    vehicleModelPlate: 'Toyota Corolla XEi 2.0 (XYZ-9876)',
    status: 'active',
    checkIn: {
      km: 18200,
      fuel: '1/2',
      destination: 'Filial Campinas SP',
      reason: 'Entrega de lote de documentos fiscais físicos',
      observations: 'Ar condicionado funcionando bem, pneu reserva verificado.',
      photo: MOCK_ODOMETER_PHOTO,
      time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    },
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  }
];

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

const INITIAL_EQUIPMENT_USAGES: EquipmentUsage[] = [
  {
    id: 'eq-usage-1',
    operatorId: 'driver-1',
    operatorName: 'João Silva',
    operatorEmail: 'joao@motorista.com',
    equipmentId: 'RET-01',
    equipmentNameModel: 'Retroescavadeira Caterpillar 416F (RET-01)',
    status: 'completed',
    checkIn: {
      hours: 1235.0,
      origin: 'Setor de Obras Central',
      reason: 'Abertura de canaletas e valas',
      observations: 'Checklist inicial 100% OK, níveis de óleo hidráulico normais.',
      photo: MOCK_HORIMETRO_PHOTO,
      time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 8 * 60 * 60 * 1000).toISOString()
    },
    checkOut: {
      hours: 1240.5,
      observations: 'Trabalho finalizado, equipamento limpo e em prefeito estado.',
      photo: MOCK_HORIMETRO_PHOTO,
      time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000).toISOString()
    },
    hoursWorked: 5.5,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 8 * 60 * 60 * 1000).toISOString()
  }
];


// Helper to load typed JSON from localstorage
function loadFromStorage<T>(key: string, defaultValue: T): T {
  const data = localStorage.getItem(key);
  if (!data) return defaultValue;
  try {
    return JSON.parse(data) as T;
  } catch (e) {
    return defaultValue;
  }
}

const INITIAL_WORKS: ConstructionWork[] = [
  {
    id: 'work-1',
    name: 'Duplicação da Rodovia BR-101',
    city: 'Palhoça',
    state: 'SC',
    description: 'Obras de ampliação de faixas e vias marginais na BR-101 Sul.',
    status: 'active',
    createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'work-2',
    name: 'Construção de Viaduto Central',
    city: 'Belo Horizonte',
    state: 'MG',
    description: 'Edificação de viaduto de concreto armado para melhoria de tráfego urbano.',
    status: 'active',
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'work-3',
    name: 'Reforma do Terminal Portuário',
    city: 'Santos',
    state: 'SP',
    description: 'Manutenção estrutural e ampliação de pátio logístico costeiro.',
    status: 'completed',
    createdAt: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Helper to save serializable JSON is safe
function saveToStorage<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
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
  public currentUser: User | null = null;

  // Listeners list for component re-renders
  private listeners: (() => void)[] = [];

  private async loadFromSupabase() {
    try {
      const [
        { data: users },
        { data: vehicles },
        { data: trips },
        { data: equipments },
        { data: equipmentUsages },
        { data: works },
        { data: equipmentTypes },
        { data: maintenanceLogs }
      ] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('vehicles').select('*'),
        supabase.from('trips').select('*'),
        supabase.from('equipments').select('*'),
        supabase.from('equipment_usages').select('*'),
        supabase.from('construction_works').select('*'),
        supabase.from('equipment_types').select('*'),
        supabase.from('maintenance_logs').select('*')
      ]);

      if (users && users.length > 0) this.users = users as User[];
      if (works && works.length > 0) this.works = works as ConstructionWork[];
      if (equipmentTypes && equipmentTypes.length > 0) this.equipmentTypes = equipmentTypes as EquipmentType[];
      if (trips && trips.length > 0) this.trips = trips as Trip[];
      if (equipmentUsages && equipmentUsages.length > 0) this.equipmentUsages = equipmentUsages as EquipmentUsage[];
      
      const vData = (vehicles || []) as Vehicle[];
      const eData = (equipments || []) as Equipment[];
      const mLogs = (maintenanceLogs || []) as any[];

      // Re-attach maintenance logs
      if (mLogs.length > 0) {
        vData.forEach(v => {
          v.maintenanceHistory = mLogs.filter(log => log.assetId === v.id && log.assetType === 'vehicle');
        });
        eData.forEach(e => {
          e.maintenanceHistory = mLogs.filter(log => log.assetId === e.id && log.assetType === 'equipment');
        });
      }

      if (vData.length > 0) this.vehicles = vData;
      if (eData.length > 0) this.equipments = eData;
      
      this.triggerListeners();
    } catch (error) {
      console.error("Error loading data from Supabase:", error);
    }
  }

  private async syncTable(table: string, items: any[]) {
    if (!items || items.length === 0) return;
    try {
      // Remove any local-only or unexpected properties for Supabase
      const sanitizedItems = items.map(item => {
        const copy = { ...item };
        if (table === 'vehicles' || table === 'equipments') {
          delete copy.maintenanceHistory;
        }
        return copy;
      });
      const { error } = await supabase.from(table).upsert(sanitizedItems);
      if (error) console.error(`Error syncing ${table}:`, error.message);
    } catch (e) {
      console.error(`Exception syncing ${table}:`, e);
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
      this.syncTable('maintenance_logs', logs);
    }
  }

  private backgroundSync() {
    this.syncTable('users', this.users);
    this.syncTable('vehicles', this.vehicles);
    this.syncTable('trips', this.trips);
    this.syncTable('equipments', this.equipments);
    this.syncTable('equipment_usages', this.equipmentUsages);
    this.syncTable('construction_works', this.works);
    this.syncTable('equipment_types', this.equipmentTypes);
    this.syncMaintenanceLogs();
  }

  private constructor() {
    this.loadState();
    this.loadFromSupabase();
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
    this.currentUser = loadFromStorage<User | null>('ff_current_user', null);

    // Dynamic backfill migration: ensure all existing users have a valid loginId
    let migrated = false;
    this.users = this.users.map(u => {
      if (!u.loginId) {
        migrated = true;
        let prefix = '';
        if (u.id === 'admin-1') {
          prefix = 'admin';
        } else if (u.id === 'driver-1') {
          prefix = 'joao';
        } else if (u.id === 'driver-2') {
          prefix = 'maria';
        } else if (u.email) {
          prefix = u.email.split('@')[0].trim().toLowerCase();
        } else {
          prefix = u.name.split(' ')[0].trim().toLowerCase() + '-' + u.id.replace('user-', '').substring(0, 4);
        }
        // Cleanup any unexpected characters from migrated loginId
        prefix = prefix.replace(/[^a-z0-9._-]/g, '');
        return { ...u, loginId: prefix || 'user_' + u.id };
      }
      return u;
    });

    // If gerente is missing in this.users (e.g. if loaded from existing storage), backfill them
    if (!this.users.some(u => u.loginId === 'gerente' || u.role === 'gerencial')) {
      this.users.push({
        id: 'manager-1',
        loginId: 'gerente',
        name: 'Gerente Geral',
        email: 'gerente@frota.com',
        cpf: '444.444.444-44',
        licenseNumber: '00000000000',
        role: 'gerencial',
        isActive: true,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      });
      migrated = true;
    }

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

  private saveState() {
    saveToStorage<User[]>('ff_users', this.users);
    saveToStorage<Vehicle[]>('ff_vehicles', this.vehicles);
    saveToStorage<Trip[]>('ff_trips', this.trips);
    saveToStorage<Equipment[]>('ff_equipments', this.equipments);
    saveToStorage<EquipmentUsage[]>('ff_equipment_usages', this.equipmentUsages);
    saveToStorage<ConstructionWork[]>('ff_works', this.works);
    saveToStorage<EquipmentType[]>('ff_equipment_types', this.equipmentTypes);
    saveToStorage<User | null>('ff_current_user', this.currentUser);
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

  public signup(name: string, loginId: string, cpf: string, licenseNumber: string, isDefaultAdmin: boolean = false, email?: string): { success: boolean, message: string } {
    const normalizedLogin = loginId.trim().toLowerCase();
    
    // Check duplicates
    if (this.users.some(u => (u.loginId || '').toLowerCase() === normalizedLogin)) {
      return { success: false, message: 'Este usuário / login já está cadastrado no sistema.' };
    }
    if (this.users.some(u => u.cpf.replace(/\D/g, '') === cpf.replace(/\D/g, ''))) {
      return { success: false, message: 'Este CPF já está cadastrado.' };
    }

    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      loginId: normalizedLogin,
      name: name.trim(),
      email: email ? email.trim() : undefined,
      cpf: cpf.trim(),
      licenseNumber: licenseNumber.trim(),
      role: isDefaultAdmin || normalizedLogin.includes('admin') ? 'admin' : 'driver',
      isActive: true,
      createdAt: new Date().toISOString()
    };

    this.users.push(newUser);
    // Only auto-login if the action wasn't triggered by an active Admin in control
    if (!this.currentUser || this.currentUser.role !== 'admin') {
      this.currentUser = newUser;
    }
    this.saveState();
    return { success: true, message: 'Motorista cadastrado com sucesso!' };
  }

  public login(loginId: string): { success: boolean, user?: User, message: string } {
    const normalizedLogin = loginId.trim().toLowerCase();
    const user = this.users.find(u => (u.loginId || '').toLowerCase() === normalizedLogin || (u.email && u.email.toLowerCase() === normalizedLogin));

    if (!user) {
      return { success: false, message: 'Usuário de acesso não encontrado. Certifique-se com o Administrador se seu login foi pré-cadastrado.' };
    }

    if (!user.isActive) {
      return { success: false, message: 'Este cadastro foi suspenso pelo administrador.' };
    }

    this.currentUser = user;
    this.saveState();
    return { success: true, user, message: 'Login efetuado com sucesso.' };
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
    return { success: true, message: 'Tipo removido.' };
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
