/**
 * teacher.js — Lógica do painel do professor
 * Quando logado, carrega automaticamente os dados do professor autenticado
 */

import { getTeachers, getTeacherByUserId, getBlockedSlots, getBookings, blockSlot, unblockSlot, cancelBooking, subscribeTable } from './api.js';
import { renderWeekGrid, toast, calcStats, openTeacherSlotModal } from './ui.js';
import { TOTAL_SLOTS } from './config.js';
import { getUserId } from './auth.js';

let currentTeacherId = null;
let currentTeacherName = '';
let blockedSlots = [];
let bookings     = [];
let unsubscribeBlocked = null;
let unsubscribeBooked  = null;

// ================================================================
// INICIALIZAÇÃO DO PAINEL DO PROFESSOR
// ================================================================

export async function initTeacherPanel() {
  try {
    // Se há professor logado, usar dados dele diretamente
    const loggedTeacherId = window.__TEACHER_ID;
    const loggedTeacherName = window.__TEACHER_NAME;

    if (loggedTeacherId) {
      currentTeacherId = loggedTeacherId;
      currentTeacherName = loggedTeacherName;

      // Ocultar seletor de professor (já está logado)
      const selectorEl = document.querySelector('.teacher-selector');
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
    const teachers = await getTeachers();

    if (teachers.length === 0) {
      document.getElementById('teacher-panel').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">👨‍🏫</div>
          <p>Nenhum professor cadastrado.<br>Crie uma conta para começar.</p>
        </div>`;
      return;
    }

    const select = document.getElementById('teacher-select');
    select.innerHTML = teachers.map(t =>
      `<option value="${t.id}">${t.name}</option>`
    ).join('');

    select.addEventListener('change', () => loadTeacherData(select.value));
    await loadTeacherData(teachers[0].id);

  } catch (err) {
    console.error(err);
    toast('Erro ao carregar professores. Verifique a configuração do Supabase.', 'error');
  }
}

// ================================================================
// CARREGA DADOS DO PROFESSOR SELECIONADO
// ================================================================

async function loadTeacherData(teacherId) {
  currentTeacherId = teacherId;

  // Cancela realtime anterior
  if (unsubscribeBlocked) unsubscribeBlocked();
  if (unsubscribeBooked)  unsubscribeBooked();

  // Mostra loading
  document.getElementById('week-grid-teacher').innerHTML = `
    <div class="loading-overlay"><div class="spinner"></div><span>Carregando agenda...</span></div>`;

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
      blockedSlots = await getBlockedSlots(currentTeacherId);
      renderTeacherGrid();
      renderStats();
    });

    unsubscribeBooked = subscribeTable('bookings', async () => {
      bookings = await getBookings(currentTeacherId);
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

function renderTeacherGrid() {
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

async function handleSlotClick({ day, hour, status, id }) {
  openTeacherSlotModal(
    { day, hour, status, id },
    async ({ action, hour: customHour, id: slotId }) => {
      try {
        if (action === 'block') {
          const result = await blockSlot(currentTeacherId, day, customHour);
          blockedSlots.push(result[0]);
          toast(`Horário ${customHour} (${day}) bloqueado.`, 'info');
        } else if (action === 'unblock') {
          await unblockSlot(slotId);
          blockedSlots = blockedSlots.filter(s => s.id !== slotId);
          toast(`Horário ${customHour} (${day}) desbloqueado.`, 'success');
        } else if (action === 'cancel_booking') {
          await cancelBooking(slotId);
          bookings = bookings.filter(b => b.id !== slotId);
          toast('Agendamento cancelado.', 'success');
        }

        renderTeacherGrid();
        renderStats();
        renderBookingsList();

      } catch (err) {
        console.error(err);
        if (err.message.includes('policy') || err.message.includes('permission')) {
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

function renderStats() {
  const { totalFree, totalBlocked, totalBooked } = calcStats(blockedSlots, bookings, TOTAL_SLOTS);

  document.getElementById('stat-free').textContent    = totalFree;
  document.getElementById('stat-blocked').textContent = totalBlocked;
  document.getElementById('stat-booked').textContent  = totalBooked;
}

// ================================================================
// LISTA DE AGENDAMENTOS
// ================================================================

function renderBookingsList() {
  const container = document.getElementById('bookings-list');
  if (!container) return;

  if (bookings.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:32px 0">
        <div class="empty-icon">📭</div>
        <p>Nenhum aluno agendado ainda.</p>
      </div>`;
    return;
  }

  const sorted = [...bookings].sort((a, b) => {
    const days = ['segunda','terca','quarta','quinta','sexta','sabado','domingo'];
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
        onclick="cancelBookingUI('${b.id}')"
      >Cancelar</button>
    </div>
  `).join('');
}

// Expõe globalmente para o onclick inline
window.cancelBookingUI = async (id) => {
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
