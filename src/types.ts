export type UserRole = 'admin' | 'driver' | 'gerencial';

export interface User {
  id: string;
  loginId: string; // Pre-registered login identifier
  name: string;
  email?: string;
  cpf: string;
  licenseNumber: string; // CNH
  role: UserRole;
  isActive: boolean;
  password?: string; // Password for authentication
  isApproved?: boolean; // Admin approval level
  authorizedAssetIds?: string[]; // IDs of vehicles or equipment
  createdAt: string;
}

export interface MaintenanceLog {
  id: string;
  reason: string;
  sentAt: string;
  resolvedAt?: string;
  resolution?: string;
  cost?: number;
  workId?: string; // Associated construction work (Obra)
  workName?: string;
  triggeredAtKm?: number;    // KM/Hours when maintenance was requested
  triggeredAtHours?: number; // Hours when maintenance was requested
  isOilChange?: boolean;
  // Fiscal control and maintenance provider
  fiscalDocType?: FiscalDocType; // 'nf' | 'pedido_compra' | 'outro'
  fiscalDocNumber?: string;      // Número do documento fiscal (NF ou Pedido de Compra)
  providerId?: string;           // Prestador/Fornecedor da manutenção cadastrado
  providerName?: string;         // Nome do prestador do serviço/oficina
  hasFiscalPending?: boolean;    // Indica se possui pendência de informações fiscais
}

export interface Vehicle {
  id: string; // Often matches plate for uniqueness
  model: string;
  plate: string;
  brand: string;
  year: number;
  color: string;
  currentKm: number;
  lastMaintenanceKm?: number; // KM of last maintenance
  maintenanceIntervalKm?: number; // Interval for maintenance
  nextOilChangeKm?: number; // Next Oil Change KM
  status: 'available' | 'in_use' | 'maintenance';
  createdAt: string;
  workId?: string; // Associated construction work (Obra) preallocated by Admin
  workName?: string;
  maintenanceReason?: string;
  maintenanceSentAt?: string;
  maintenanceHistory?: MaintenanceLog[];
  category?: string;
}

export interface VehicleCategory {
  id: string;
  name: string;
}

export interface CheckInDetails {
  km: number;
  fuel: string; // Vazio, 1/4, 1/2, 3/4, Cheio
  origin?: string; // Trip origin location
  destination: string;
  reason: string;
  observations: string;
  photo?: string; // Optional photo
  time: string;
}

export interface CheckOutDetails {
  km: number;
  fuel: string;
  observations: string;
  photo?: string; // Optional photo
  time: string;
}

export interface Trip {
  id: string;
  driverId: string;
  driverName: string;
  driverEmail?: string;
  vehicleId: string;
  vehicleModelPlate: string;
  status: 'active' | 'completed';
  workId?: string; // Associated construction work (Obra)
  workName?: string;
  checkIn: CheckInDetails;
  checkOut?: CheckOutDetails;
  kmDriven?: number;
  createdAt: string;
}

export interface Equipment {
  id: string; // Serial / prefix identifier
  name: string; // User-facing description e.g. "Retroescavadeira CAT 416"
  brand: string;
  model: string;
  year: number;
  type: string; // Retroescavadeira, Caminhão Munck, Trator, etc.
  currentHours: number; // Hour meter tracking (Horímetro)
  lastMaintenanceHours?: number; // Hours of last maintenance
  maintenanceIntervalHours?: number; // Interval for maintenance
  nextOilChangeHours?: number; // Next Oil Change Hours
  status: 'available' | 'in_use' | 'maintenance';
  createdAt: string;
  workId?: string; // Associated construction work (Obra) preallocated by Admin
  workName?: string;
  maintenanceReason?: string;
  maintenanceSentAt?: string;
  maintenanceHistory?: MaintenanceLog[];
}

export interface EquipmentCheckInDetails {
  hours: number;
  origin?: string; // Machinery operation origin
  reason: string;
  observations: string;
  photo?: string;
  time: string;
}

export interface EquipmentCheckOutDetails {
  hours: number;
  observations: string;
  photo?: string;
  time: string;
  refueled?: boolean;
  fuelLiters?: number;
}

export interface EquipmentUsage {
  id: string;
  operatorId: string;
  operatorName: string;
  operatorEmail?: string;
  equipmentId: string;
  equipmentNameModel: string;
  status: 'active' | 'completed';
  workId?: string; // Associated construction work (Obra)
  workName?: string;
  checkIn: EquipmentCheckInDetails;
  checkOut?: EquipmentCheckOutDetails;
  hoursWorked?: number;
  createdAt: string;
}

export interface ConstructionWork {
  id: string;
  name: string;      // Nome da Obra
  city: string;      // Município
  state: string;     // Estado
  description?: string;
  status: 'active' | 'completed';
  createdAt: string;
}

export interface EquipmentType {
  id: string;
  name: string;
}

export type SupplierCategory = 'fornecedor' | 'prestador';

export interface Supplier {
  id: string;
  cnpj: string;              // CNPJ (14 dígitos, formato: 00.000.000/0000-00)
  corporateName: string;     // Nome Razão Social
  tradeName?: string;        // Nome Fantasia
  category: SupplierCategory; // 'fornecedor' ou 'prestador'
  contactName?: string;      // Nome do Responsável / Contato
  phone?: string;            // Telefone / WhatsApp
  email?: string;            // E-mail
  city?: string;             // Município
  state?: string;            // UF (2 letras)
  servicesOrProducts?: string; // Descrição de serviços prestados ou materiais fornecidos
  status: 'active' | 'inactive';
  createdAt: string;
}

export type FiscalDocType = 'nf' | 'pedido_compra' | 'outro';

export interface FuelInflow {
  id: string;
  workId: string;
  workName: string;
  supplierId: string;
  supplierName: string;
  supplierCnpj?: string;
  fiscalDocType: FiscalDocType;
  fiscalDocNumber: string; // Número de controle fiscal (NF ou Pedido de Compra)
  fuelType: string; // Diesel ou Gasolina
  liters: number; // Quantidade em Litros recebida
  totalCost: number; // Custo total da entrada (R$)
  unitCost: number; // Custo unitário por litro (R$/L)
  date: string; // Data do recebimento
  receivedBy?: string; // Responsável pelo recebimento
  notes?: string;
  createdAt: string;
}

export type FuelDispenseType = 'obra' | 'fornecedor_direto';

export interface FuelDispense {
  id: string;
  dispenseType?: FuelDispenseType; // 'obra' (consumindo estoque da obra) ou 'fornecedor_direto' (abastecendo direto de fornecedor)
  workId?: string; // Opcional se for direto em fornecedor sem obra vinculada, ou obra de rateio
  workName?: string;
  supplierId?: string; // Obrigatório se dispenseType === 'fornecedor_direto'
  supplierName?: string;
  supplierCnpj?: string;
  fiscalDocType?: FiscalDocType; // NF ou Pedido quando abastecido direto no posto/fornecedor
  fiscalDocNumber?: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleModel: string;
  fuelType: string;
  liters: number; // Quantidade em Litros consumida
  currentKmOrHours?: number; // KM ou Horímetro registrado no abastecimento
  driverId?: string;
  driverName?: string;
  date: string; // Data do abastecimento
  unitCost?: number; // Preço do litro no fornecedor ou custo médio
  totalCost?: number; // Custo total do abastecimento
  calculatedCost?: number; // Compatibilidade retroativa
  notes?: string;
  createdAt: string;
}

export interface FuelTypeMetric {
  fuelType: string;
  inflowLiters: number;
  dispenseLiters: number;
  balanceLiters: number;
  totalCost: number;
  averageCostPerLiter: number;
  inflowCount: number;
  dispenseCount: number;
}

export interface WorkFuelBalance {
  workId: string;
  workName: string;
  totalInflowLiters: number;
  totalDispenseLiters: number;
  balanceLiters: number;
  totalCost: number;
  averageCostPerLiter: number;
  inflowCount: number;
  dispenseCount: number;
  diesel: FuelTypeMetric;
  gasolina: FuelTypeMetric;
  byFuelType?: Record<string, FuelTypeMetric>;
}

