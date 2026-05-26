/**
 * teacher.js — Lógica do painel do professor
 */

import { getTeachers, getBlockedSlots, getBookings, blockSlot, unblockSlot, cancelBooking, subscribeTable } from './api.js';
import { renderWeekGrid, toast, calcStats } from './ui.js';
import { TOTAL_SLOTS } from './config.js';

let currentTeacherId = null;
let blockedSlots = [];
let bookings     = [];
let unsubscribeBlocked = null;
let unsubscribeBooked  = null;

// ================================================================
// INICIALIZAÇÃO DO PAINEL DO PROFESSOR
// ================================================================

export async function initTeacherPanel() {
  try {
    const teachers = await getTeachers();

    if (teachers.length === 0) {
      document.getElementById('teacher-panel').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">👨‍🏫</div>
          <p>Nenhum professor cadastrado.<br>Adicione um pelo SQL do Supabase.</p>
        </div>`;
      return;
    }

    // Preenche o select de professores
    const select = document.getElementById('teacher-select');
    select.innerHTML = teachers.map(t =>
      `<option value="${t.id}">${t.name}</option>`
    ).join('');

    select.addEventListener('change', () => loadTeacherData(select.value));

    // Carrega o primeiro professor por padrão
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
// CLIQUE EM UM SLOT (bloquear / desbloquear)
// ================================================================

async function handleSlotClick({ day, hour, status, id }) {
  if (status === 'booked') return; // agendado: não faz nada (disabled no HTML)

  try {
    if (status === 'blocked') {
      // Desbloqueia
      await unblockSlot(id);
      blockedSlots = blockedSlots.filter(s => s.id !== id);
      toast(`Horário ${hour} (${day}) desbloqueado.`, 'success');
    } else {
      // Bloqueia
      const result = await blockSlot(currentTeacherId, day, hour);
      blockedSlots.push(result[0]);
      toast(`Horário ${hour} (${day}) bloqueado.`, 'info');
    }

    renderTeacherGrid();
    renderStats();

  } catch (err) {
    console.error(err);
    toast('Erro ao atualizar horário. Tente novamente.', 'error');
  }
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
          ${b.day.charAt(0).toUpperCase() + b.day.slice(1)} • ${b.hour}
          ${b.student_email ? `• ${b.student_email}` : ''}
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
