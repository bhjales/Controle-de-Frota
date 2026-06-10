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
  category?: 'utilitário' | 'caminhão';
}

export interface CheckInDetails {
  km: number;
  fuel: string; // Vazio, 1/4, 1/2, 3/4, Cheio
  origin?: string; // Trip origin location
  destination: string;
  reason: string;
  observations: string;
  photo: string; // Base64 or sample photo URL
  time: string;
}

export interface CheckOutDetails {
  km: number;
  fuel: string;
  observations: string;
  photo: string; // Base64 or sample photo URL
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
  photo: string;
  time: string;
}

export interface EquipmentCheckOutDetails {
  hours: number;
  observations: string;
  photo: string;
  time: string;
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

