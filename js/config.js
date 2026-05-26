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
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkZWNycGFuc2pxcHZjeG12cXV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3OTc2MTYsImV4cCI6MjA5NTM3MzYxNn0.3nGPdNGpcJWfnDcHBwMxcGwu_n6QIHWz2NEVb8BuDVE'; // ex: eyJhbGciOiJIUzI1...

// ================================================================
// ESTRUTURA DE HORÁRIOS
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

export {
  SUPABASE_URL,
  SUPABASE_KEY,
  SCHEDULE,
  DAYS,
  TOTAL_SLOTS,
  TOTAL_HOURS_PER_DAY
};
