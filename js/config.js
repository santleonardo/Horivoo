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
const SUPABASE_URL = 'https://adecrpansjqpvcxmvqut.supabase.co';     // ex: https://xyz.supabase.co
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkZWNycGFuc2pxcHZjeG12cXV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3OTc2MTYsImV4cCI6MjA5NTM3MzYxNn0.3nGPdNGpcJWfnDcHBwMxcGwu_n6QIHWz2NEVb8BuDVE'; // ex: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// ================================================================
// ESTRUTURA DE HORÁRIOS (padrão — usada como base da grade)
// ================================================================
const SCHEDULE = {
  manha: {
    label: 'Manhã',
    icon: '☀️',
    hours: ['08:00', '09:00', '10:00', '11:00']
  },
  tarde: {
    label: 'Tarde',
    icon: '🌤️',
    hours: ['13:00', '14:00', '15:00', '16:00', '17:00']
  },
  noite: {
    label: 'Noite',
    icon: '🌙',
    hours: ['18:00', '19:00', '20:00', '21:00']
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
// TOTAL DE HORÁRIOS POSSÍVEIS NA SEMANA
// ================================================================
const TOTAL_HOURS_PER_DAY =
  SCHEDULE.manha.hours.length +
  SCHEDULE.tarde.hours.length +
  SCHEDULE.noite.hours.length;

const TOTAL_SLOTS = DAYS.length * TOTAL_HOURS_PER_DAY;

// ================================================================
// HELPERS PARA HORÁRIOS CUSTOMIZADOS
// ================================================================

/**
 * Classifica um horário (ex: "07:35", "14:20") em um período do dia.
 * @param {string} hourStr - Horário no formato "HH:MM"
 * @returns {'manha'|'tarde'|'noite'} Período do dia
 */
function getPeriodForTime(hourStr) {
  const h = parseInt(hourStr.split(':')[0], 10);
  if (h >= 6 && h < 12) return 'manha';
  if (h >= 12 && h < 18) return 'tarde';
  return 'noite';
}

/**
 * Compara dois horários no formato "HH:MM" para ordenação cronológica.
 * @param {string} a - Horário "HH:MM"
 * @param {string} b - Horário "HH:MM"
 * @returns {number} -1, 0 ou 1
 */
function compareHours(a, b) {
  const [ah, am] = a.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  return (ah * 60 + am) - (bh * 60 + bm);
}

/**
 * Mescla os horários fixos do SCHEDULE com horários customizados do banco,
 * agrupando por período e ordenando cronologicamente.
 * @param {object[]} blocked - Array de { day, hour, ... }
 * @param {object[]} booked  - Array de { day, hour, ... }
 * @returns {object} Mesmo formato do SCHEDULE, mas com horas extras incluídas
 */
function buildMergedSchedule(blocked = [], booked = []) {
  const merged = {
    manha: { label: 'Manhã', icon: '☀️', hours: [...SCHEDULE.manha.hours] },
    tarde: { label: 'Tarde', icon: '🌤️', hours: [...SCHEDULE.tarde.hours] },
    noite: { label: 'Noite', icon: '🌙', hours: [...SCHEDULE.noite.hours] },
  };

  // Coletar todas as horas customizadas do banco
  const allHours = new Set();
  blocked.forEach(s => allHours.add(s.hour));
  booked.forEach(b => allHours.add(b.hour));

  // Adicionar horas que não estão no SCHEDULE padrão
  const scheduleHours = new Set([
    ...SCHEDULE.manha.hours,
    ...SCHEDULE.tarde.hours,
    ...SCHEDULE.noite.hours
  ]);

  allHours.forEach(hour => {
    if (!scheduleHours.has(hour)) {
      const period = getPeriodForTime(hour);
      if (!merged[period].hours.includes(hour)) {
        merged[period].hours.push(hour);
      }
    }
  });

  // Ordenar cada período cronologicamente
  Object.values(merged).forEach(period => {
    period.hours.sort(compareHours);
  });

  return merged;
}

export {
  SUPABASE_URL,
  SUPABASE_KEY,
  SCHEDULE,
  DAYS,
  TOTAL_SLOTS,
  TOTAL_HOURS_PER_DAY,
  getPeriodForTime,
  compareHours,
  buildMergedSchedule
};
