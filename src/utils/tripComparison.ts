import { LogisticsSchedule, PlannedLogisticsSnapshot, Trip } from '../types';

export interface TripLogisticsComparisonItem {
  key: 'vehicle' | 'complement' | 'origin' | 'destination' | 'period' | 'driver';
  label: string;
  plannedValue: string;
  executedValue: string;
  matches: boolean;
  statusText: string;
}

export interface TripLogisticsComparison {
  planned: PlannedLogisticsSnapshot;
  items: TripLogisticsComparisonItem[];
  divergences: string[];
  isFullyCompliant: boolean;
  timingStatus: 'no_prazo' | 'antecipada' | 'fora_do_prazo';
  timingLabel: string;
  actualStartDate: string;
  actualEndDate: string | null;
}

function normalizeStr(val?: string | null): string {
  return (val || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function formatIsoDateToBR(isoDate?: string | null): string {
  if (!isoDate) return '-';
  const clean = isoDate.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function extractLocalIsoDate(dateInput?: string | null): string {
  if (!dateInput) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) return dateInput.trim();
  const dt = new Date(dateInput);
  if (Number.isNaN(dt.getTime())) return dateInput.slice(0, 10);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function buildSnapshotFromSchedule(sched: LogisticsSchedule): PlannedLogisticsSnapshot {
  return {
    scheduleId: sched.id,
    vehicleId: sched.vehicleId,
    vehicleModelPlate: sched.vehicleModelPlate,
    complementVehicleId: sched.complementVehicleId,
    complementVehicleModelPlate: sched.complementVehicleModelPlate,
    originLabel: sched.originWorkName || sched.originLabel || 'Matriz / Base',
    originCity: sched.originCity || '',
    originState: sched.originState || '',
    destinationLabel: sched.workName || sched.destinationLabel || sched.programDescription || 'Destino',
    destinationCity: sched.destinationCity || '',
    destinationState: sched.destinationState || '',
    workId: sched.workId,
    workName: sched.workName,
    cargoDescription: sched.cargoDescription,
    startDate: sched.startDate,
    endDate: sched.endDate,
    driverId: sched.driverId,
    driverName: sched.driverName,
    isThirdPartyRental: sched.isThirdPartyRental,
    thirdPartyName: sched.thirdPartyName,
    notes: sched.notes,
  };
}

export function resolvePlannedSnapshot(
  trip: Trip,
  schedules?: LogisticsSchedule[]
): PlannedLogisticsSnapshot | null {
  if (trip.plannedSnapshot) return trip.plannedSnapshot;
  if (trip.logisticsScheduleId && schedules && schedules.length > 0) {
    const found = schedules.find(s => s.id === trip.logisticsScheduleId);
    if (found) return buildSnapshotFromSchedule(found);
  }
  return null;
}

export function compareTripWithPlanned(
  trip: Trip,
  schedules?: LogisticsSchedule[]
): TripLogisticsComparison | null {
  const planned = resolvePlannedSnapshot(trip, schedules);
  if (!planned) return null;

  const divergences: string[] = [];

  // 1. Vehicle comparison
  const vehicleMatch = planned.vehicleId === trip.vehicleId;
  if (!vehicleMatch) {
    divergences.push('Veículo diferente do programado');
  }

  // 2. Complement comparison
  const plannedCompId = planned.complementVehicleId || '';
  const executedCompId = trip.complementVehicleId || '';
  const complementMatch = plannedCompId === executedCompId;
  if (!complementMatch) {
    divergences.push('Complemento/carroceria divergente');
  }

  // 3. Origin comparison
  const plannedOrigCity = normalizeStr(planned.originCity);
  const plannedOrigUf = normalizeStr(planned.originState);
  const execOrigCity = normalizeStr(trip.originCity || trip.checkIn.originCity);
  const execOrigUf = normalizeStr(trip.originState || trip.checkIn.originState);
  const originMatch = plannedOrigCity
    ? plannedOrigCity === execOrigCity && (!plannedOrigUf || !execOrigUf || plannedOrigUf === execOrigUf)
    : normalizeStr(planned.originLabel) === normalizeStr(trip.checkIn.origin);
  if (!originMatch) {
    divergences.push('Origem diferente da programada');
  }

  // 4. Destination / Work comparison
  const plannedDestCity = normalizeStr(planned.destinationCity);
  const plannedDestUf = normalizeStr(planned.destinationState);
  const execDestCity = normalizeStr(trip.destinationCity || trip.checkIn.destinationCity);
  const execDestUf = normalizeStr(trip.destinationState || trip.checkIn.destinationState);
  const cityDestMatch = plannedDestCity
    ? plannedDestCity === execDestCity && (!plannedDestUf || !execDestUf || plannedDestUf === execDestUf)
    : true;
  const workDestMatch = planned.workId ? planned.workId === trip.workId : true;
  const labelDestMatch =
    plannedDestCity || planned.workId
      ? true
      : normalizeStr(planned.destinationLabel) === normalizeStr(trip.checkIn.destination);
  const destinationMatch = cityDestMatch && workDestMatch && labelDestMatch;
  if (!destinationMatch) {
    divergences.push('Destino ou obra divergente');
  }

  // 5. Period / Schedule Timing comparison
  const actualStartDate = extractLocalIsoDate(trip.checkIn.time || trip.createdAt);
  const actualEndDate = trip.checkOut?.time ? extractLocalIsoDate(trip.checkOut.time) : null;

  let timingStatus: 'no_prazo' | 'antecipada' | 'fora_do_prazo' = 'no_prazo';
  let timingLabel = 'No período programado';
  let periodMatch = true;

  if (actualStartDate && planned.startDate && actualStartDate < planned.startDate) {
    timingStatus = 'antecipada';
    timingLabel = 'Iniciada antes da data programada';
    periodMatch = false;
    divergences.push('Iniciada antes da data programada');
  } else if (
    (actualStartDate && planned.endDate && actualStartDate > planned.endDate) ||
    (actualEndDate && planned.endDate && actualEndDate > planned.endDate)
  ) {
    timingStatus = 'fora_do_prazo';
    timingLabel = 'Executada além do prazo programado';
    periodMatch = false;
    divergences.push('Executada fora do prazo programado');
  }

  // 6. Driver comparison
  const driverMatch = !planned.driverId || planned.driverId === trip.driverId;
  if (!driverMatch) {
    divergences.push('Motorista diferente do programado');
  }

  const plannedOriginText = `${planned.originLabel || 'Base'}${
    planned.originCity ? ` (${planned.originCity}${planned.originState ? `/${planned.originState}` : ''})` : ''
  }`;
  const executedOriginText = `${trip.checkIn.origin || 'Base'}${
    (trip.originCity || trip.checkIn.originCity)
      ? ` (${trip.originCity || trip.checkIn.originCity}${
          (trip.originState || trip.checkIn.originState) ? `/${trip.originState || trip.checkIn.originState}` : ''
        })`
      : ''
  }`;

  const plannedDestText = `${planned.workName || planned.destinationLabel}${
    planned.destinationCity
      ? ` (${planned.destinationCity}${planned.destinationState ? `/${planned.destinationState}` : ''})`
      : ''
  }`;
  const executedDestText = `${trip.workName ? `${trip.workName} · ` : ''}${trip.checkIn.destination}${
    (trip.destinationCity || trip.checkIn.destinationCity)
      ? ` (${trip.destinationCity || trip.checkIn.destinationCity}${
          (trip.destinationState || trip.checkIn.destinationState)
            ? `/${trip.destinationState || trip.checkIn.destinationState}`
            : ''
        })`
      : ''
  }`;

  const plannedPeriodText = `${formatIsoDateToBR(planned.startDate)} a ${formatIsoDateToBR(planned.endDate)}`;
  const executedPeriodText = actualEndDate
    ? `${formatIsoDateToBR(actualStartDate)} a ${formatIsoDateToBR(actualEndDate)}`
    : `${formatIsoDateToBR(actualStartDate)} (Em andamento)`;

  const items: TripLogisticsComparisonItem[] = [
    {
      key: 'vehicle',
      label: 'Veículo Principal',
      plannedValue: planned.vehicleModelPlate,
      executedValue: trip.vehicleModelPlate,
      matches: vehicleMatch,
      statusText: vehicleMatch ? 'Conforme' : 'Veículo alterado',
    },
    {
      key: 'complement',
      label: 'Complemento / Carroceria',
      plannedValue: planned.complementVehicleModelPlate || 'Sem complemento',
      executedValue: trip.complementVehicleModelPlate || 'Sem complemento',
      matches: complementMatch,
      statusText: complementMatch ? 'Conforme' : 'Complemento alterado',
    },
    {
      key: 'origin',
      label: 'Origem',
      plannedValue: plannedOriginText,
      executedValue: executedOriginText,
      matches: originMatch,
      statusText: originMatch ? 'Conforme' : 'Origem alterada',
    },
    {
      key: 'destination',
      label: 'Destino / Obra',
      plannedValue: plannedDestText,
      executedValue: executedDestText,
      matches: destinationMatch,
      statusText: destinationMatch ? 'Conforme' : 'Destino/Obra alterado',
    },
    {
      key: 'period',
      label: 'Período / Prazo',
      plannedValue: plannedPeriodText,
      executedValue: executedPeriodText,
      matches: periodMatch,
      statusText: timingLabel,
    },
    {
      key: 'driver',
      label: 'Motorista',
      plannedValue: planned.driverName || 'Qualquer motorista',
      executedValue: trip.driverName,
      matches: driverMatch,
      statusText: driverMatch ? 'Conforme' : 'Motorista alterado',
    },
  ];

  return {
    planned,
    items,
    divergences,
    isFullyCompliant: divergences.length === 0,
    timingStatus,
    timingLabel,
    actualStartDate,
    actualEndDate,
  };
}
