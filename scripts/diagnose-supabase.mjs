import 'dotenv/config';

const rawEnvUrl = process.env.VITE_SUPABASE_URL || '';
const rawEnvKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const cleanUrl = (url) => url.replace(/\/rest\/v1\/?$/, '');
const supabaseUrl = rawEnvUrl.startsWith('http')
  ? cleanUrl(rawEnvUrl)
  : 'https://xiusucnttvtmwmshgdhh.supabase.co';

const fallbackKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpdXN1Y250dHZ0bXdtc2hnZGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNzgxNzAsImV4cCI6MjEwMTk1NDE3MH0.LQ5db6CJCrBDk3NO107le43rXWbahGfatzpKnwX3Wlc';
const supabaseAnonKey = rawEnvKey.length > 20 ? rawEnvKey : fallbackKey;

const EXPECTED_VEHICLE_COLUMNS = [
  'id',
  'model',
  'plate',
  'brand',
  'year',
  'color',
  'currentKm',
  'lastMaintenanceKm',
  'maintenanceIntervalKm',
  'nextOilChangeKm',
  'status',
  'isActive',
  'category',
  'tankCapacityLiters',
  'workId',
  'workName',
  'maintenanceReason',
  'maintenanceSentAt',
  'maintenanceHistory',
  'hasLogisticsControl',
  'createdAt',
];

const headers = {
  apikey: supabaseAnonKey,
  Authorization: `Bearer ${supabaseAnonKey}`,
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  Pragma: 'no-cache',
};

async function probeVehicleColumn(columnName) {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/vehicles?select=${encodeURIComponent(columnName)}&limit=1`,
    { headers }
  );

  if (res.ok) {
    return { column: columnName, exists: true, detail: 'OK' };
  }

  const bodyText = await res.text();
  return { column: columnName, exists: false, detail: bodyText };
}

async function checkLogisticsSchedulesTable() {
  const res = await fetch(`${supabaseUrl}/rest/v1/logistics_schedules?select=id&limit=1`, {
    headers,
  });

  if (res.ok) {
    return { exists: true, detail: 'OK' };
  }

  return { exists: false, detail: await res.text() };
}

async function main() {
  console.log('====================================================================');
  console.log('DIAGNÓSTICO DE SCHEMA SUPABASE - TABELA vehicles');
  console.log('====================================================================');
  console.log(`Projeto URL : ${supabaseUrl}`);
  console.log(
    `Origem      : ${rawEnvUrl.startsWith('http') ? 'Variável VITE_SUPABASE_URL' : 'Fallback padrão (src/lib/supabase.ts)'}`
  );
  console.log('');

  let schemaColumns = [];
  let hasOpenApiVehicles = false;
  let hasOpenApiLogistics = false;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (serviceRoleKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Accept: 'application/openapi+json',
        },
      });
      if (res.ok) {
        const openapi = await res.json();
        const definitions = openapi.definitions || openapi.components?.schemas || {};
        if (definitions.vehicles?.properties) {
          hasOpenApiVehicles = true;
          schemaColumns = Object.keys(definitions.vehicles.properties);
        }
        hasOpenApiLogistics = Boolean(definitions.logistics_schedules?.properties);
      }
    } catch {
      // Fallback para sondagem direta de colunas via anon key
    }
  }

  if (!hasOpenApiVehicles) {
    const sampleRes = await fetch(`${supabaseUrl}/rest/v1/vehicles?select=*&limit=1`, { headers });
    if (sampleRes.ok) {
      const rows = await sampleRes.json();
      if (Array.isArray(rows) && rows.length > 0) {
        schemaColumns = Object.keys(rows[0]);
      }
    }
  }

  // Probe individual para garantir detecção precisa inclusive com tabela vazia ou cache desatualizado
  const probeResults = await Promise.all(
    EXPECTED_VEHICLE_COLUMNS.map((col) => probeVehicleColumn(col))
  );
  const lowercaseLogisticsProbe = await probeVehicleColumn('haslogisticscontrol');
  const logisticsTableStatus = await checkLogisticsSchedulesTable();

  const existingFromProbes = probeResults.filter((r) => r.exists).map((r) => r.column);
  const mergedColumns = Array.from(new Set([...schemaColumns, ...existingFromProbes]));

  console.log(`Colunas encontradas no schema cache de 'public.vehicles' (${mergedColumns.length}):`);
  if (mergedColumns.length === 0) {
    console.log('  (Nenhuma coluna detectada — verifique conexão, RLS ou existência da tabela)');
  } else {
    mergedColumns.forEach((col, idx) => {
      const marker = col === 'hasLogisticsControl' ? '  <-- [OK: Logística]' : '';
      console.log(`  ${String(idx + 1).padStart(2, '0')}. ${col}${marker}`);
    });
  }

  console.log('');
  console.log('Verificação específica de Logística:');

  const hasExactLogisticsCol = probeResults.find((r) => r.column === 'hasLogisticsControl')?.exists;
  const missingColumns = probeResults.filter((r) => !r.exists).map((r) => r.column);

  if (hasExactLogisticsCol) {
    console.log('  [OK] Coluna "hasLogisticsControl" existe e está ativa no schema cache.');
  } else {
    console.log('  [ERRO] Coluna "hasLogisticsControl" NÃO encontrada no schema cache da tabela vehicles.');
    if (lowercaseLogisticsProbe.exists) {
      console.log(
        '  [ALERTA] Foi encontrada a coluna "haslogisticscontrol" (tudo minúsculo)! Ela provavelmente foi criada sem aspas duplas.'
      );
    }
  }

  if (missingColumns.length > 0) {
    console.log(`  [FALTANDO em vehicles]: ${missingColumns.join(', ')}`);
  } else {
    console.log('  [OK] Todas as 21 colunas esperadas de vehicles estão presentes.');
  }

  if (logisticsTableStatus.exists || hasOpenApiLogistics) {
    console.log('  [OK] Tabela "public.logistics_schedules" acessível no schema cache.');
  } else {
    console.log('  [ERRO] Tabela "public.logistics_schedules" NÃO encontrada no schema cache.');
  }

  if (missingColumns.length > 0 || !logisticsTableStatus.exists) {
    console.log('');
    console.log('--------------------------------------------------------------------');
    console.log('SQL RECOMENDADO PARA CORREÇÃO NO SUPABASE SQL EDITOR:');
    console.log('--------------------------------------------------------------------');
    if (lowercaseLogisticsProbe.exists && !hasExactLogisticsCol) {
      console.log('ALTER TABLE public.vehicles RENAME COLUMN haslogisticscontrol TO "hasLogisticsControl";');
    }
    if (missingColumns.includes('isActive')) {
      console.log('ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;');
    }
    if (missingColumns.includes('tankCapacityLiters')) {
      console.log('ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS "tankCapacityLiters" NUMERIC;');
    }
    if (missingColumns.includes('hasLogisticsControl') && !lowercaseLogisticsProbe.exists) {
      console.log('ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS "hasLogisticsControl" BOOLEAN DEFAULT false;');
    }
    const otherMissing = missingColumns.filter(
      (c) => !['isActive', 'tankCapacityLiters', 'hasLogisticsControl'].includes(c)
    );
    if (otherMissing.length > 0) {
      console.log(`-- Outras colunas ausentes detectadas: ${otherMissing.join(', ')} (consulte supabase-schema.sql)`);
    }
    if (!logisticsTableStatus.exists) {
      console.log('-- Execute também a criação da tabela public.logistics_schedules do arquivo supabase-schema.sql');
    }
    console.log("NOTIFY pgrst, 'reload schema';");
    console.log('--------------------------------------------------------------------');
    process.exitCode = 1;
  } else {
    console.log('');
    console.log('Resultado: Schema 100% compatível com o aplicativo.');
    process.exitCode = 0;
  }
}

main().catch((err) => {
  console.error('Falha ao executar diagnóstico:', err);
  process.exit(1);
});
