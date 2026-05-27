/**
 * student.js — Lógica da agenda do aluno
 */

import { getTeachers, getBlockedSlots, getBookings, createBooking } from './api.js';
import { renderWeekGrid, toast, openBookingModal } from './ui.js';

let currentTeacherId  = null;
let currentTeacherName = '';
let blockedSlots = [];
let bookings     = [];

// ================================================================
// INICIALIZAÇÃO DA AGENDA DO ALUNO
// ================================================================

export async function initStudentPanel() {
  try {
    const teachers = await getTeachers();

    if (teachers.length === 0) {
      document.getElementById('student-panel').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <p>Nenhum professor disponível.</p>
        </div>`;
      return;
    }

    const select = document.getElementById('student-teacher-select');
    select.innerHTML = teachers.map(t =>
      `<option value="${t.id}" data-name="${t.name}">${t.name}</option>`
    ).join('');

    // Captura nome do professor selecionado
    const updateTeacherName = () => {
      const opt = select.options[select.selectedIndex];
      currentTeacherName = opt?.dataset.name || '';
    };

    updateTeacherName();

    select.addEventListener('change', () => {
      updateTeacherName();
      loadStudentData(select.value);
    });

    await loadStudentData(teachers[0].id);

  } catch (err) {
    console.error(err);
    toast('Erro ao carregar professores. Verifique a configuração.', 'error');
  }
}

// ================================================================
// CARREGA HORÁRIOS DISPONÍVEIS
// ================================================================

async function loadStudentData(teacherId) {
  currentTeacherId = teacherId;

  document.getElementById('week-grid-student').innerHTML = `
    <div class="loading-overlay"><div class="spinner"></div><span>Buscando horários disponíveis...</span></div>`;

  try {
    [blockedSlots, bookings] = await Promise.all([
      getBlockedSlots(teacherId),
      getBookings(teacherId)
    ]);

    renderStudentGrid();

  } catch (err) {
    console.error(err);
    toast('Erro ao carregar horários.', 'error');
  }
}

// ================================================================
// RENDERIZA GRADE DO ALUNO
// ================================================================

function renderStudentGrid() {
  renderWeekGrid(
    'week-grid-student',
    blockedSlots,
    bookings,
    'student',
    {
      onSlotClick: handleSlotSelect
    }
  );

  // Conta horários disponíveis
  const container  = document.getElementById('week-grid-student');
  const freeSlots  = container.querySelectorAll('.student-available').length;
  const countEl    = document.getElementById('available-count');
  if (countEl) {
    countEl.textContent = freeSlots;
    countEl.className   = freeSlots > 0 ? 'badge badge-success' : 'badge badge-danger';
  }

  // Se não há nenhum slot disponível
  if (freeSlots === 0) {
    container.innerHTML += `
      <div class="empty-state" style="grid-column:1/-1; padding: 48px 0;">
        <div class="empty-icon">😔</div>
        <p>Não há horários disponíveis esta semana.<br>Tente novamente mais tarde.</p>
      </div>`;
  }
}

// ================================================================
// SELECIONA UM SLOT PARA AGENDAR
// ================================================================

function handleSlotSelect({ day, dayFull, hour }) {
  // Verifica (novamente) se ainda está disponível (proteção contra race condition)
  const alreadyBooked  = bookings.some(b   => b.day === day && b.hour === hour);
  const alreadyBlocked = blockedSlots.some(s => s.day === day && s.hour === hour);

  if (alreadyBooked || alreadyBlocked) {
    toast('Este horário acabou de ser ocupado. Escolha outro.', 'error');
    loadStudentData(currentTeacherId); // recarrega
    return;
  }

  openBookingModal(
    { day, dayFull, hour, teacherName: currentTeacherName },
    ({ studentName, studentEmail }) => confirmBooking(day, hour, studentName, studentEmail)
  );
}

// ================================================================
// CONFIRMA O AGENDAMENTO
// ================================================================

async function confirmBooking(day, hour, studentName, studentEmail) {
  try {
    const result = await createBooking({
      teacher_id:    currentTeacherId,
      student_name:  studentName,
      student_email: studentEmail || null,
      day,
      hour
    });

    bookings.push(result[0]);
    renderStudentGrid();

    toast(`Agendado com sucesso! ${day.charAt(0).toUpperCase() + day.slice(1)} às ${hour}.`, 'success');

  } catch (err) {
    console.error(err);

    if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
      toast('Horário já foi preenchido. Escolha outro.', 'error');
      loadStudentData(currentTeacherId);
    } else {
      toast('Erro ao agendar. Tente novamente.', 'error');
    }
  }
}
