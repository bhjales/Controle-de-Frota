-- ==============================================================================
-- SCHEMA COMPLETO E ATUALIZADO PARA SUPABASE (POSTGRESQL)
-- SISTEMA DE GESTÃO DE FROTAS, MAQUINÁRIOS, ABASTECIMENTO E MANUTENÇÃO
-- ==============================================================================

-- Habilita extensão para geração de UUID caso necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. TABELA: equipment_types (Tipos de Equipamentos/Maquinários)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.equipment_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

-- ------------------------------------------------------------------------------
-- 2. TABELA: vehicle_categories (Categorias de Veículos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

-- ------------------------------------------------------------------------------
-- 3. TABELA: construction_works (Obras de Construção)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.construction_works (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT,
    state TEXT,
    description TEXT,
    status TEXT DEFAULT 'active',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. TABELA: users (Motoristas, Operadores, Administradores e Gestores)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    "loginId" TEXT,
    name TEXT NOT NULL,
    email TEXT,
    cpf TEXT,
    "licenseNumber" TEXT,
    role TEXT, -- 'admin', 'driver', 'gerencial'
    "isActive" BOOLEAN DEFAULT true,
    password TEXT,
    "isApproved" BOOLEAN DEFAULT true,
    "authorizedAssetIds" JSONB DEFAULT '[]'::jsonb,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. TABELA: suppliers (Fornecedores e Prestadores de Serviços de Manutenção)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY,
    cnpj TEXT NOT NULL,
    "corporateName" TEXT NOT NULL,
    "tradeName" TEXT,
    category TEXT NOT NULL DEFAULT 'fornecedor', -- 'fornecedor' ou 'prestador'
    "contactName" TEXT,
    phone TEXT,
    email TEXT,
    city TEXT,
    state TEXT,
    "servicesOrProducts" TEXT,
    status TEXT DEFAULT 'active', -- 'active' ou 'inactive'
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. TABELA: vehicles (Veículos da Frota)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicles (
    id TEXT PRIMARY KEY,
    model TEXT NOT NULL,
    plate TEXT NOT NULL,
    brand TEXT NOT NULL,
    year INTEGER,
    color TEXT,
    "currentKm" NUMERIC DEFAULT 0,
    "lastMaintenanceKm" NUMERIC DEFAULT 0,
    "maintenanceIntervalKm" NUMERIC DEFAULT 10000,
    "nextOilChangeKm" NUMERIC,
    status TEXT DEFAULT 'available', -- 'available', 'in_use', 'maintenance'
    category TEXT,
    "workId" TEXT REFERENCES public.construction_works(id) ON DELETE SET NULL,
    "workName" TEXT,
    "maintenanceReason" TEXT,
    "maintenanceSentAt" TEXT,
    "maintenanceHistory" JSONB DEFAULT '[]'::jsonb,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. TABELA: equipments (Maquinários e Equipamentos Pesados)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.equipments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER,
    type TEXT,
    "currentHours" NUMERIC DEFAULT 0,
    "lastMaintenanceHours" NUMERIC DEFAULT 0,
    "maintenanceIntervalHours" NUMERIC DEFAULT 250,
    "nextOilChangeHours" NUMERIC,
    status TEXT DEFAULT 'available', -- 'available', 'in_use', 'maintenance'
    "workId" TEXT REFERENCES public.construction_works(id) ON DELETE SET NULL,
    "workName" TEXT,
    "maintenanceReason" TEXT,
    "maintenanceSentAt" TEXT,
    "maintenanceHistory" JSONB DEFAULT '[]'::jsonb,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. TABELA: trips (Viagens e Check-in / Check-out de Veículos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trips (
    id TEXT PRIMARY KEY,
    "driverId" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    "driverName" TEXT,
    "driverEmail" TEXT,
    "vehicleId" TEXT REFERENCES public.vehicles(id) ON DELETE SET NULL,
    "vehicleModelPlate" TEXT,
    status TEXT DEFAULT 'active', -- 'active' ou 'completed'
    "workId" TEXT REFERENCES public.construction_works(id) ON DELETE SET NULL,
    "workName" TEXT,
    "checkIn" JSONB,
    "checkOut" JSONB,
    "kmDriven" NUMERIC DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 9. TABELA: equipment_usages (Registros de Uso e Operação de Maquinários)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.equipment_usages (
    id TEXT PRIMARY KEY,
    "operatorId" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    "operatorName" TEXT,
    "operatorEmail" TEXT,
    "equipmentId" TEXT REFERENCES public.equipments(id) ON DELETE SET NULL,
    "equipmentNameModel" TEXT,
    status TEXT DEFAULT 'active', -- 'active' ou 'completed'
    "workId" TEXT REFERENCES public.construction_works(id) ON DELETE SET NULL,
    "workName" TEXT,
    "checkIn" JSONB,
    "checkOut" JSONB,
    "hoursWorked" NUMERIC DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 10. TABELA: maintenance_logs (Histórico de Manutenções com Controle Fiscal e Prestador)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
    id TEXT PRIMARY KEY,
    "assetId" TEXT,
    "assetType" TEXT, -- 'vehicle' ou 'equipment'
    reason TEXT NOT NULL,
    "sentAt" TEXT NOT NULL,
    "resolvedAt" TEXT,
    resolution TEXT,
    cost NUMERIC DEFAULT 0,
    "workId" TEXT REFERENCES public.construction_works(id) ON DELETE SET NULL,
    "workName" TEXT,
    "triggeredAtKm" NUMERIC,
    "triggeredAtHours" NUMERIC,
    "isOilChange" BOOLEAN DEFAULT false,
    -- Dados de Controle Fiscal e Prestador do Serviço
    "fiscalDocType" TEXT, -- 'nf', 'pedido_compra', 'outro'
    "fiscalDocNumber" TEXT, -- Número da Nota Fiscal ou Pedido de Compra
    "providerId" TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL, -- Oficina/Prestador cadastrado
    "providerName" TEXT, -- Nome da Oficina ou Prestador
    "hasFiscalPending" BOOLEAN DEFAULT false, -- True se faltou informar NF/PC ou prestador
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 11. TABELA: fuel_inflows (Entradas/Compras de Combustível por Obra)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fuel_inflows (
    id TEXT PRIMARY KEY,
    "workId" TEXT REFERENCES public.construction_works(id) ON DELETE CASCADE,
    "workName" TEXT NOT NULL,
    "supplierId" TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    "supplierName" TEXT NOT NULL,
    "supplierCnpj" TEXT,
    "fiscalDocType" TEXT NOT NULL, -- 'nf', 'pedido_compra', 'outro'
    "fiscalDocNumber" TEXT NOT NULL, -- Número da NF ou Pedido
    "fuelType" TEXT NOT NULL, -- 'Diesel' ou 'Gasolina'
    liters NUMERIC NOT NULL,
    "totalCost" NUMERIC NOT NULL,
    "unitCost" NUMERIC NOT NULL,
    date TEXT NOT NULL,
    "receivedBy" TEXT,
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 12. TABELA: fuel_dispenses (Abastecimentos: Consumo de Obra OU Direto de Fornecedor)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fuel_dispenses (
    id TEXT PRIMARY KEY,
    "dispenseType" TEXT DEFAULT 'obra', -- 'obra' (estoque) ou 'fornecedor_direto' (posto/fornecedor)
    "workId" TEXT REFERENCES public.construction_works(id) ON DELETE SET NULL,
    "workName" TEXT,
    "supplierId" TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    "supplierName" TEXT,
    "supplierCnpj" TEXT,
    "fiscalDocType" TEXT, -- 'nf', 'pedido_compra', 'outro'
    "fiscalDocNumber" TEXT,
    "vehicleId" TEXT REFERENCES public.vehicles(id) ON DELETE SET NULL,
    "vehiclePlate" TEXT NOT NULL,
    "vehicleModel" TEXT NOT NULL,
    "fuelType" TEXT NOT NULL, -- 'Diesel' ou 'Gasolina'
    liters NUMERIC NOT NULL,
    "currentKmOrHours" NUMERIC,
    "driverId" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    "driverName" TEXT,
    date TEXT NOT NULL,
    "unitCost" NUMERIC,
    "totalCost" NUMERIC,
    "calculatedCost" NUMERIC,
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- SCRIPT DE ATUALIZAÇÃO / MIGRAÇÃO INCREMENTAL (CASO AS TABELAS JÁ EXISTAM)
-- Executar este bloco garante que colunas adicionadas recentemente passem a existir
-- ==============================================================================

-- Atualização na tabela users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "loginId" TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "isApproved" BOOLEAN DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "authorizedAssetIds" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password TEXT;

-- Atualização na tabela vehicles
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS "workId" TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS "workName" TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS "maintenanceReason" TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS "maintenanceSentAt" TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS "maintenanceHistory" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS "nextOilChangeKm" NUMERIC;

-- Atualização na tabela equipments
ALTER TABLE public.equipments ADD COLUMN IF NOT EXISTS "workId" TEXT;
ALTER TABLE public.equipments ADD COLUMN IF NOT EXISTS "workName" TEXT;
ALTER TABLE public.equipments ADD COLUMN IF NOT EXISTS "maintenanceReason" TEXT;
ALTER TABLE public.equipments ADD COLUMN IF NOT EXISTS "maintenanceSentAt" TEXT;
ALTER TABLE public.equipments ADD COLUMN IF NOT EXISTS "maintenanceHistory" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.equipments ADD COLUMN IF NOT EXISTS "nextOilChangeHours" NUMERIC;

-- Atualização na tabela maintenance_logs (Novos campos de Controle Fiscal e Prestador)
ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS "fiscalDocType" TEXT;
ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS "fiscalDocNumber" TEXT;
ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS "providerId" TEXT;
ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS "providerName" TEXT;
ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS "hasFiscalPending" BOOLEAN DEFAULT false;
ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS "workId" TEXT;
ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS "workName" TEXT;
ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS "triggeredAtKm" NUMERIC;
ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS "triggeredAtHours" NUMERIC;
ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS "isOilChange" BOOLEAN DEFAULT false;
ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Atualização na tabela fuel_dispenses (Suporte a Abastecimento Direto de Fornecedor)
ALTER TABLE public.fuel_dispenses ADD COLUMN IF NOT EXISTS "dispenseType" TEXT DEFAULT 'obra';
ALTER TABLE public.fuel_dispenses ADD COLUMN IF NOT EXISTS "supplierId" TEXT;
ALTER TABLE public.fuel_dispenses ADD COLUMN IF NOT EXISTS "supplierName" TEXT;
ALTER TABLE public.fuel_dispenses ADD COLUMN IF NOT EXISTS "supplierCnpj" TEXT;
ALTER TABLE public.fuel_dispenses ADD COLUMN IF NOT EXISTS "fiscalDocType" TEXT;
ALTER TABLE public.fuel_dispenses ADD COLUMN IF NOT EXISTS "fiscalDocNumber" TEXT;
ALTER TABLE public.fuel_dispenses ADD COLUMN IF NOT EXISTS "unitCost" NUMERIC;
ALTER TABLE public.fuel_dispenses ADD COLUMN IF NOT EXISTS "totalCost" NUMERIC;
ALTER TABLE public.fuel_dispenses ADD COLUMN IF NOT EXISTS "calculatedCost" NUMERIC;

-- ==============================================================================
-- CRIAÇÃO DE ÍNDICES PARA PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON public.vehicles(plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);
CREATE INDEX IF NOT EXISTS idx_equipments_status ON public.equipments(status);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON public.trips("driverId");
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_asset ON public.maintenance_logs("assetId");
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_pending ON public.maintenance_logs("hasFiscalPending");
CREATE INDEX IF NOT EXISTS idx_fuel_inflows_work ON public.fuel_inflows("workId");
CREATE INDEX IF NOT EXISTS idx_fuel_dispenses_vehicle ON public.fuel_dispenses("vehicleId");
CREATE INDEX IF NOT EXISTS idx_fuel_dispenses_type ON public.fuel_dispenses("dispenseType");
CREATE INDEX IF NOT EXISTS idx_suppliers_cnpj ON public.suppliers(cnpj);

-- ==============================================================================
-- HABILITAÇÃO DE ROW LEVEL SECURITY (RLS) E POLÍTICAS DE ACESSO
-- Permite leitura e escrita pelo client anônimo da aplicação
-- ==============================================================================
DO $$ 
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
        AND tablename IN (
            'equipment_types', 'vehicle_categories', 'construction_works', 
            'users', 'suppliers', 'vehicles', 'equipments', 'trips', 
            'equipment_usages', 'maintenance_logs', 'fuel_inflows', 'fuel_dispenses'
        )
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Public access policy" ON public.%I;', tbl);
        EXECUTE format('CREATE POLICY "Public access policy" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl);
    END LOOP;
END $$;
