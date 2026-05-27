/**
 * config.js — Configuração do Supabase e constantes
 * 
 * INSTRUÇÕES:
 * 1. Crie um projeto em https://supabase.com
 * 2. Vá em Settings > API
 * 3. Copie a URL e a anon key para as variáveis abaixo
 */

// ================================================================
// CONFIGURAÇÃO — preencha com seus dados do Supabase
// ================================================================
const SUPABASE_URL = 'https://adecrpansjqpvcxmvqut.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkZWNycGFuc2pxcHZjeG12cXV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3OTc2MTYsImV4cCI6MjA5NTM3MzYxNn0.3nGPdNGpcJWfnDcHBwMxcGwu_n6QIHWz2NEVb8BuDVE';

// ================================================================
// ESTRUTURA DE HORÁRIOS (padrão — pode ser personalizado)
// Agora com intervalos de 30 minutos + suporte a horários livres
// ================================================================
const SCHEDULE = {
  manha: {
    label: 'Manhã',
    icon: '☀️',
    hours: ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30']
  },
  tarde: {
    label: 'Tarde',
    icon: '🌤️',
    hours: ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30']
  },
  noite: {
    label: 'Noite',
    icon: '🌙',
    hours: ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30']
  }
};

// ================================================================
// DIAS DA SEMANA
// ================================================================
const DAYS = [
  { key: 'segunda',  label: 'Seg', full: 'Segunda' },
  { key: 'terca',    label: 'Ter', full: 'Terça'   },
  { key: 'quarta',   label: 'Qua', full: 'Quarta'  },
  { key: 'quinta',   label: 'Qui', full: 'Quinta'  },
  { key: 'sexta',    label: 'Sex', full: 'Sexta'   },
  { key: 'sabado',   label: 'Sáb', full: 'Sábado'  },
  { key: 'domingo',  label: 'Dom', full: 'Domingo'  },
];

// ================================================================
// HELPERS PARA HORÁRIOS CUSTOMIZADOS
// ================================================================

/**
 * Determina o período (manhã/tarde/noite) de qualquer horário HH:MM
 */
function getPeriodForHour(hour) {
  const h = parseInt(hour.split(':')[0], 10);
  if (h < 12) return 'manha';
  if (h < 18) return 'tarde';
  return 'noite';
}

/**
 * Mescla horários customizados dos dados com os horários padrão do SCHEDULE.
 * Garante que horários como 07:35, 19:45 etc. apareçam na grade.
 */
function buildScheduleWithData(blocked = [], booked = []) {
  const merged = {};
  for (const key of Object.keys(SCHEDULE)) {
    merged[key] = { ...SCHEDULE[key], hours: [...SCHEDULE[key].hours] };
  }

  const allHours = [
    ...blocked.map(s => s.hour),
    ...booked.map(b => b.hour)
  ];

  const uniqueCustom = [...new Set(allHours)].filter(
    h => !Object.values(SCHEDULE).some(p => p.hours.includes(h))
  );

  for (const hour of uniqueCustom) {
    const period = getPeriodForHour(hour);
    if (!merged[period].hours.includes(hour)) {
      merged[period].hours.push(hour);
    }
  }

  for (const key of Object.keys(merged)) {
    merged[key].hours.sort((a, b) => a.localeCompare(b));
  }

  return merged;
}

// ================================================================
// TOTAL DE HORÁRIOS POSSÍVEIS NA SEMANA
// ================================================================
const TOTAL_HOURS_PER_DAY =
  SCHEDULE.manha.hours.length +
  SCHEDULE.tarde.hours.length +
  SCHEDULE.noite.hours.length;

const TOTAL_SLOTS = DAYS.length * TOTAL_HOURS_PER_DAY;

export {
  SUPABASE_URL,
  SUPABASE_KEY,
  SCHEDULE,
  DAYS,
  TOTAL_SLOTS,
  TOTAL_HOURS_PER_DAY,
  getPeriodForHour,
  buildScheduleWithData
};
