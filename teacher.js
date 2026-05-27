/**
 * teacher.js — Lógica do painel do professor
 * Quando logado, carrega automaticamente os dados do professor autenticado
 */

import { getTeachers, getTeacherByUserId, getBlockedSlots, getBookings, blockSlot, unblockSlot, cancelBooking, subscribeTable } from './api.js';
import { renderWeekGrid, toast, calcStats } from './ui.js';
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
    const loggedTeacherId = window.__TEACHER_ID;
    const loggedTeacherName = window.__TEACHER_NAME;

    if (loggedTeacherId) {
      currentTeacherId = loggedTeacherId;
      currentTeacherName = loggedTeacherName;

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

  if (unsubscribeBlocked) unsubscribeBlocked();
  if (unsubscribeBooked)  unsubscribeBooked();

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
// Agora permite editar o horário antes de bloquear
// ================================================================

async function handleSlotClick({ day, hour, status, id }) {
  if (status === 'booked') return;

  try {
    if (status === 'blocked') {
      // Desbloquear diretamente
      await unblockSlot(id);
      blockedSlots = blockedSlots.filter(s => s.id !== id);
      toast(`Horário ${hour} (${day}) desbloqueado.`, 'success');
    } else {
      // Disponível — perguntar horário customizado
      const customHour = prompt(`Bloquear horário em ${day}:\nHorário padrão: ${hour}\n\nDeixe como está ou digite outro (ex: 07:35, 19:45):`, hour);

      if (customHour === null) return; // cancelou

      const finalHour = customHour.trim();
      if (!/^\d{2}:\d{2}$/.test(finalHour)) {
        toast('Formato inválido. Use HH:MM (ex: 07:35).', 'error');
        return;
      }

      const result = await blockSlot(currentTeacherId, day, finalHour);
      blockedSlots.push(Array.isArray(result) ? result[0] : result);
      toast(`Horário ${finalHour} (${day}) bloqueado.`, 'info');
    }

    renderTeacherGrid();
    renderStats();

  } catch (err) {
    console.error(err);
    if (err.message.includes('policy') || err.message.includes('permission')) {
      toast('Sem permissão. Apenas o professor pode alterar horários.', 'error');
    } else {
      toast('Erro ao atualizar horário. Tente novamente.', 'error');
    }
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
