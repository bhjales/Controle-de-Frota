-- Arquivo: supabase-schema.sql
-- Este script cria todas as tabelas necessárias para o sistema de gestão de frota.

-- 1. Create equipment_types table
CREATE TABLE IF NOT EXISTS public.equipment_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

-- 2. Create vehicle_categories table
CREATE TABLE IF NOT EXISTS public.vehicle_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

-- 3. Create construction_works table
CREATE TABLE IF NOT EXISTS public.construction_works (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT,
    state TEXT,
    description TEXT,
    status TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    "loginId" TEXT,
    name TEXT NOT NULL,
    email TEXT,
    cpf TEXT,
    "licenseNumber" TEXT,
    role TEXT,
    "isActive" BOOLEAN DEFAULT true,
    password TEXT,
    "isApproved" BOOLEAN DEFAULT false,
    "authorizedAssetIds" JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create vehicles table
CREATE TABLE IF NOT EXISTS public.vehicles (
    id TEXT PRIMARY KEY,
    model TEXT NOT NULL,
    plate TEXT NOT NULL,
    brand TEXT NOT NULL,
    year INTEGER,
    color TEXT,
    "currentKm" NUMERIC,
    "lastMaintenanceKm" NUMERIC,
    "maintenanceIntervalKm" NUMERIC,
    "nextOilChangeKm" NUMERIC,
    status TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "workId" TEXT REFERENCES public.construction_works(id) ON DELETE SET NULL,
    "workName" TEXT,
    "maintenanceReason" TEXT,
    "maintenanceSentAt" TEXT,
    "maintenanceHistory" JSONB,
    category TEXT
);

-- 6. Create equipments table
CREATE TABLE IF NOT EXISTS public.equipments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER,
    type TEXT,
    "currentHours" NUMERIC,
    "lastMaintenanceHours" NUMERIC,
    "maintenanceIntervalHours" NUMERIC,
    "nextOilChangeHours" NUMERIC,
    status TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "workId" TEXT REFERENCES public.construction_works(id) ON DELETE SET NULL,
    "workName" TEXT,
    "maintenanceReason" TEXT,
    "maintenanceSentAt" TEXT,
    "maintenanceHistory" JSONB
);

-- 7. Create trips table
CREATE TABLE IF NOT EXISTS public.trips (
    id TEXT PRIMARY KEY,
    "driverId" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    "driverName" TEXT,
    "driverEmail" TEXT,
    "vehicleId" TEXT REFERENCES public.vehicles(id) ON DELETE SET NULL,
    "vehicleModelPlate" TEXT,
    status TEXT,
    "workId" TEXT REFERENCES public.construction_works(id) ON DELETE SET NULL,
    "workName" TEXT,
    "checkIn" JSONB,
    "checkOut" JSONB,
    "kmDriven" NUMERIC,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create equipment_usages table
CREATE TABLE IF NOT EXISTS public.equipment_usages (
    id TEXT PRIMARY KEY,
    "operatorId" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    "operatorName" TEXT,
    "operatorEmail" TEXT,
    "equipmentId" TEXT REFERENCES public.equipments(id) ON DELETE SET NULL,
    "equipmentNameModel" TEXT,
    status TEXT,
    "workId" TEXT REFERENCES public.construction_works(id) ON DELETE SET NULL,
    "workName" TEXT,
    "checkIn" JSONB,
    "checkOut" JSONB,
    "hoursWorked" NUMERIC,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
