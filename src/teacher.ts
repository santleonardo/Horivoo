/**
 * teacher.ts — Lógica do painel do professor
 * Quando logado, carrega automaticamente os dados do professor autenticado
 */

import { getTeachers, getBlockedSlots, getBookings, blockSlot, unblockSlot, cancelBooking, subscribeTable } from './api.js';
import { renderWeekGrid, toast, calcStats, openTeacherSlotModal } from './ui.js';
import { TOTAL_SLOTS } from './config.js';
import { getUserId } from './auth.js';
import type { Teacher, BlockedSlot, Booking, SlotClickInfo, TeacherSlotAction, UnsubscribeFn } from './types.js';

let currentTeacherId: string | null = null;
let currentTeacherName: string = '';
let blockedSlots: BlockedSlot[] = [];
let bookings: Booking[] = [];
let unsubscribeBlocked: UnsubscribeFn | null = null;
let unsubscribeBooked: UnsubscribeFn | null = null;

// ================================================================
// INICIALIZAÇÃO DO PAINEL DO PROFESSOR
// ================================================================

export async function initTeacherPanel(): Promise<void> {
  try {
    // Se há professor logado, usar dados dele diretamente
    const loggedTeacherId: string | undefined = window.__TEACHER_ID;
    const loggedTeacherName: string | undefined = window.__TEACHER_NAME;

    if (loggedTeacherId) {
      currentTeacherId = loggedTeacherId;
      currentTeacherName = loggedTeacherName || '';

      // Ocultar seletor de professor (já está logado)
      const selectorEl: HTMLElement | null = document.querySelector('.teacher-selector');
      if (selectorEl) {
        selectorEl.innerHTML = `
          <label>Professor:</label>
          <span style="font-weight:600; font-size:0.95rem">${currentTeacherName}</span>
        `;
      }

      await loadTeacherData(loggedTeacherId);
      return;
    }

    // Fallback: sem autenticação — mostrar seletor de professores
    const teachers: Teacher[] = await getTeachers();

    if (teachers.length === 0) {
      document.getElementById('teacher-panel')!.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">👨‍🏫</div>
          <p>Nenhum professor cadastrado.<br>Crie uma conta para começar.</p>
        </div>`;
      return;
    }

    const select: HTMLSelectElement | null = document.getElementById('teacher-select') as HTMLSelectElement | null;
    if (select) {
      select.innerHTML = teachers.map(t =>
        `<option value="${t.id}">${t.name}</option>`
      ).join('');

      select.addEventListener('change', () => loadTeacherData(select.value));
      await loadTeacherData(teachers[0].id);
    }

  } catch (err) {
    console.error(err);
    toast('Erro ao carregar professores. Verifique a configuração do Supabase.', 'error');
  }
}

// ================================================================
// CARREGA DADOS DO PROFESSOR SELECIONADO
// ================================================================

async function loadTeacherData(teacherId: string): Promise<void> {
  currentTeacherId = teacherId;

  // Cancela realtime anterior
  if (unsubscribeBlocked) unsubscribeBlocked();
  if (unsubscribeBooked)  unsubscribeBooked();

  // Mostra loading
  const gridEl: HTMLElement | null = document.getElementById('week-grid-teacher');
  if (gridEl) {
    gridEl.innerHTML = `
      <div class="loading-overlay"><div class="spinner"></div><span>Carregando agenda...</span></div>`;
  }

  try {
    [blockedSlots, bookings] = await Promise.all([
      getBlockedSlots(teacherId),
      getBookings(teacherId)
    ]);

    renderTeacherGrid();
    renderStats();
    renderBookingsList();

    // Realtime
    unsubscribeBlocked = subscribeTable('blocked_slots', async () => {
      if (currentTeacherId) {
        blockedSlots = await getBlockedSlots(currentTeacherId);
      }
      renderTeacherGrid();
      renderStats();
    });

    unsubscribeBooked = subscribeTable('bookings', async () => {
      if (currentTeacherId) {
        bookings = await getBookings(currentTeacherId);
      }
      renderTeacherGrid();
      renderStats();
      renderBookingsList();
    });

  } catch (err) {
    console.error(err);
    toast('Erro ao carregar agenda.', 'error');
  }
}

// ================================================================
// RENDERIZA GRADE DO PROFESSOR
// ================================================================

function renderTeacherGrid(): void {
  renderWeekGrid(
    'week-grid-teacher',
    blockedSlots,
    bookings,
    'teacher',
    {
      onSlotClick: handleSlotClick
    }
  );
}

// ================================================================
// CLIQUE EM UM SLOT — abre modal com horário editável
// ================================================================

async function handleSlotClick({ day, hour, status, id }: SlotClickInfo): Promise<void> {
  openTeacherSlotModal(
    { day, hour, status, id },
    async ({ action, hour: customHour, id: slotId }: TeacherSlotAction) => {
      try {
        if (action === 'block') {
          const result = await blockSlot(currentTeacherId!, day, customHour);
          const newSlot: BlockedSlot = Array.isArray(result) ? result[0] : result;
          blockedSlots.push(newSlot);
          toast(`Horário ${customHour} (${day}) bloqueado.`, 'info');
        } else if (action === 'unblock') {
          await unblockSlot(slotId!);
          blockedSlots = blockedSlots.filter(s => s.id !== slotId);
          toast(`Horário ${customHour} (${day}) desbloqueado.`, 'success');
        } else if (action === 'cancel_booking') {
          await cancelBooking(slotId!);
          bookings = bookings.filter(b => b.id !== slotId);
          toast('Agendamento cancelado.', 'success');
        }

        renderTeacherGrid();
        renderStats();
        renderBookingsList();

      } catch (err) {
        console.error(err);
        const errMsg: string = (err as Error).message || '';
        if (errMsg.includes('policy') || errMsg.includes('permission')) {
          toast('Sem permissão. Apenas o professor pode alterar horários.', 'error');
        } else {
          toast('Erro ao atualizar horário. Tente novamente.', 'error');
        }
      }
    }
  );
}

// ================================================================
// ESTATÍSTICAS
// ================================================================

function renderStats(): void {
  const { totalFree, totalBlocked, totalBooked } = calcStats(blockedSlots, bookings, TOTAL_SLOTS);

  const freeEl: HTMLElement | null = document.getElementById('stat-free');
  const blockedEl: HTMLElement | null = document.getElementById('stat-blocked');
  const bookedEl: HTMLElement | null = document.getElementById('stat-booked');

  if (freeEl) freeEl.textContent = totalFree.toString();
  if (blockedEl) blockedEl.textContent = totalBlocked.toString();
  if (bookedEl) bookedEl.textContent = totalBooked.toString();
}

// ================================================================
// LISTA DE AGENDAMENTOS
// ================================================================

function renderBookingsList(): void {
  const container: HTMLElement | null = document.getElementById('bookings-list');
  if (!container) return;

  if (bookings.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:32px 0">
        <div class="empty-icon">📭</div>
        <p>Nenhum aluno agendado ainda.</p>
      </div>`;
    return;
  }

  const sorted: Booking[] = [...bookings].sort((a, b) => {
    const days: string[] = ['segunda','terca','quarta','quinta','sexta','sabado','domingo'];
    return days.indexOf(a.day) - days.indexOf(b.day) || a.hour.localeCompare(b.hour);
  });

  container.innerHTML = sorted.map(b => `
    <div class="booking-item" style="
      display:flex; align-items:center; justify-content:space-between;
      padding: 12px 16px; border-bottom: 1px solid var(--border);
      gap: 12px; flex-wrap: wrap;
    ">
      <div>
        <div style="font-weight:600; font-size:0.9rem">${b.student_name}</div>
        <div style="color:var(--text-muted); font-size:0.8rem">
          ${b.day.charAt(0).toUpperCase() + b.day.slice(1)} às ${b.hour}
          ${b.student_email ? ` &bull; ${b.student_email}` : ''}
        </div>
      </div>
      <button
        class="btn btn-danger"
        style="padding: 6px 12px; font-size:0.8rem"
        onclick="window.cancelBookingUI('${b.id}')"
      >Cancelar</button>
    </div>
  `).join('');
}

// Expõe globalmente para o onclick inline
window.cancelBookingUI = async (id: string): Promise<void> => {
  if (!confirm('Cancelar este agendamento?')) return;
  try {
    await cancelBooking(id);
    bookings = bookings.filter(b => b.id !== id);
    renderTeacherGrid();
    renderStats();
    renderBookingsList();
    toast('Agendamento cancelado.', 'success');
  } catch {
    toast('Erro ao cancelar.', 'error');
  }
};
