/**
 * config.ts — Configuração do Supabase e constantes
 *
 * ⚠️  NUNCA commite credenciais reais aqui.
 *     Deixe os placeholders e use a tela de configuração do app,
 *     ou injete via variável de ambiente no build.
 *
 * INSTRUÇÕES:
 * 1. Crie um projeto em https://supabase.com
 * 2. Vá em Settings → API
 * 3. Cole a URL e a anon key na tela de configuração do app
 *    (primeira abertura) — elas ficam salvas no localStorage.
 */
import type { PeriodKey, ScheduleMap, DayConfig } from './types.js';
declare const SUPABASE_URL: string;
declare const SUPABASE_KEY: string;
declare const SCHEDULE: ScheduleMap;
declare const DAYS: DayConfig[];
declare const TOTAL_HOURS_PER_DAY: number;
declare const TOTAL_SLOTS: number;
/** Classifica um horário (ex: "07:35") em período do dia */
declare function getPeriodForTime(hourStr: string): PeriodKey;
/** Compara dois horários "HH:MM" para ordenação */
declare function compareHours(a: string, b: string): number;
/**
 * Mescla horários fixos do SCHEDULE com horários customizados do banco.
 */
declare function buildMergedSchedule(blocked?: Array<{
    hour: string;
}>, booked?: Array<{
    hour: string;
}>): ScheduleMap;
export { SUPABASE_URL, SUPABASE_KEY, SCHEDULE, DAYS, TOTAL_SLOTS, TOTAL_HOURS_PER_DAY, getPeriodForTime, compareHours, buildMergedSchedule };
//# sourceMappingURL=config.d.ts.map