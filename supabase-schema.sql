-- Script SQL para gerar as tabelas e a estrutura de dados inicial no Supabase

-- Drop tables if they exist to recreate the structure
DROP TABLE IF EXISTS public.equipment_usages CASCADE;
DROP TABLE IF EXISTS public.trips CASCADE;
DROP TABLE IF EXISTS public.maintenance_logs CASCADE;
DROP TABLE IF EXISTS public.equipments CASCADE;
DROP TABLE IF EXISTS public.vehicles CASCADE;
DROP TABLE IF EXISTS public.equipment_types CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.construction_works CASCADE;

-- Obras (Construction Works)
CREATE TABLE public.construction_works (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed')),
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Usuários (Users)
CREATE TABLE public.users (
  id TEXT PRIMARY KEY,
  "loginId" TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  cpf TEXT NOT NULL,
  "licenseNumber" TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'driver', 'gerencial')),
  "isActive" BOOLEAN DEFAULT true,
  "password" TEXT DEFAULT '123456',
  "isApproved" BOOLEAN DEFAULT true,
  "authorizedAssetIds" TEXT[], -- Array de ids para controlar os veículos vinculados
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Tipos de Equipamentos (Equipment Types)
CREATE TABLE public.equipment_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- Veículos (Vehicles)
CREATE TABLE public.vehicles (
  id TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  plate TEXT NOT NULL,
  brand TEXT NOT NULL,
  year INTEGER NOT NULL,
  color TEXT NOT NULL,
  "currentKm" NUMERIC NOT NULL DEFAULT 0,
  "lastMaintenanceKm" NUMERIC,
  "maintenanceIntervalKm" NUMERIC,
  "nextOilChangeKm" NUMERIC,
  status TEXT NOT NULL CHECK (status IN ('available', 'in_use', 'maintenance')),
  "workId" TEXT REFERENCES public.construction_works(id) ON DELETE SET NULL,
  "workName" TEXT,
  "maintenanceReason" TEXT,
  "maintenanceSentAt" TIMESTAMPTZ,
  category TEXT CHECK (category IN ('utilitário', 'caminhão')),
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Equipamentos / Maquinário (Equipments)
CREATE TABLE public.equipments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  type TEXT NOT NULL,
  "currentHours" NUMERIC NOT NULL DEFAULT 0,
  "lastMaintenanceHours" NUMERIC,
  "maintenanceIntervalHours" NUMERIC,
  "nextOilChangeHours" NUMERIC,
  status TEXT NOT NULL CHECK (status IN ('available', 'in_use', 'maintenance')),
  "workId" TEXT REFERENCES public.construction_works(id) ON DELETE SET NULL,
  "workName" TEXT,
  "maintenanceReason" TEXT,
  "maintenanceSentAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Histórico de Manutenções (Maintenance Logs)
CREATE TABLE public.maintenance_logs (
  id TEXT PRIMARY KEY,
  "assetId" TEXT NOT NULL, -- Pode referenciar vehicle(id) ou equipment(id)
  "assetType" TEXT NOT NULL CHECK ("assetType" IN ('vehicle', 'equipment')),
  reason TEXT NOT NULL,
  "sentAt" TIMESTAMPTZ NOT NULL,
  "resolvedAt" TIMESTAMPTZ,
  resolution TEXT,
  cost NUMERIC,
  "workId" TEXT,
  "workName" TEXT,
  "triggeredAtKm" NUMERIC,
  "triggeredAtHours" NUMERIC,
  "isOilChange" BOOLEAN DEFAULT false
);

-- Viagens / Checkouts de Veículos (Trips)
CREATE TABLE public.trips (
  id TEXT PRIMARY KEY,
  "driverId" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  "driverName" TEXT NOT NULL,
  "driverEmail" TEXT,
  "vehicleId" TEXT REFERENCES public.vehicles(id) ON DELETE SET NULL,
  "vehicleModelPlate" TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed')),
  "workId" TEXT REFERENCES public.construction_works(id) ON DELETE SET NULL,
  "workName" TEXT,
  "checkIn" JSONB NOT NULL,
  "checkOut" JSONB,
  "kmDriven" NUMERIC,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Uso de Equipamentos / Checkouts de Máquinas (Equipment Usages)
CREATE TABLE public.equipment_usages (
  id TEXT PRIMARY KEY,
  "operatorId" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  "operatorName" TEXT NOT NULL,
  "operatorEmail" TEXT,
  "equipmentId" TEXT REFERENCES public.equipments(id) ON DELETE SET NULL,
  "equipmentNameModel" TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed')),
  "workId" TEXT REFERENCES public.construction_works(id) ON DELETE SET NULL,
  "workName" TEXT,
  "checkIn" JSONB NOT NULL,
  "checkOut" JSONB,
  "hoursWorked" NUMERIC,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Regras de Segurança (Row Level Security) - Políticas abertas como padrão para uso no painel e no app

ALTER TABLE public.construction_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access" ON public.construction_works FOR ALL USING (true);
CREATE POLICY "Enable all access" ON public.users FOR ALL USING (true);
CREATE POLICY "Enable all access" ON public.equipment_types FOR ALL USING (true);
CREATE POLICY "Enable all access" ON public.vehicles FOR ALL USING (true);
CREATE POLICY "Enable all access" ON public.equipments FOR ALL USING (true);
CREATE POLICY "Enable all access" ON public.maintenance_logs FOR ALL USING (true);
CREATE POLICY "Enable all access" ON public.trips FOR ALL USING (true);
CREATE POLICY "Enable all access" ON public.equipment_usages FOR ALL USING (true);
