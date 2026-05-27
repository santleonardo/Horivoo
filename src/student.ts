/**
 * student.ts — Lógica da agenda do aluno
 */

import { getTeachers, getBlockedSlots, getBookings, createBooking } from './api.js';
import { renderWeekGrid, toast, openBookingModal } from './ui.js';
import type { Teacher, BlockedSlot, Booking, SlotClickInfo, BookingConfirmData } from './types.js';

let currentTeacherId: string | null  = null;
let currentTeacherName: string = '';
let blockedSlots: BlockedSlot[] = [];
let bookings: Booking[] = [];

// ================================================================
// INICIALIZAÇÃO DA AGENDA DO ALUNO
// ================================================================

export async function initStudentPanel(): Promise<void> {
  try {
    const teachers: Teacher[] = await getTeachers();

    if (teachers.length === 0) {
      document.getElementById('student-panel')!.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <p>Nenhum professor disponível.</p>
        </div>`;
      return;
    }

    const select: HTMLSelectElement | null = document.getElementById('student-teacher-select') as HTMLSelectElement | null;
    if (!select) return;

    select.innerHTML = teachers.map(t =>
      `<option value="${t.id}" data-name="${t.name}">${t.name}</option>`
    ).join('');

    const updateTeacherName = (): void => {
      const opt: HTMLOptionElement | null = select.options[select.selectedIndex] as HTMLOptionElement | null;
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

async function loadStudentData(teacherId: string): Promise<void> {
  currentTeacherId = teacherId;

  const gridEl: HTMLElement | null = document.getElementById('week-grid-student');
  if (gridEl) {
    gridEl.innerHTML = `
      <div class="loading-overlay"><div class="spinner"></div><span>Buscando horários disponíveis...</span></div>`;
  }

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

function renderStudentGrid(): void {
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
  const container: HTMLElement | null = document.getElementById('week-grid-student');
  if (container) {
    const freeSlots: number = container.querySelectorAll('.student-available').length;
    const countEl: HTMLElement | null = document.getElementById('available-count');
    if (countEl) {
      countEl.textContent = freeSlots.toString();
      countEl.className   = freeSlots > 0 ? 'badge badge-success' : 'badge badge-danger';
    }
  }
}

// ================================================================
// SELECIONA UM SLOT PARA AGENDAR
// ================================================================

function handleSlotSelect({ day, dayFull, hour, status }: SlotClickInfo): void {
  // Ignorar cliques em slots ocupados
  if (status === 'booked' || status === 'blocked') return;

  // Verifica (novamente) se ainda está disponível (proteção contra race condition)
  const alreadyBooked: boolean  = bookings.some(b   => b.day === day && b.hour === hour);
  const alreadyBlocked: boolean = blockedSlots.some(s => s.day === day && s.hour === hour);

  if (alreadyBooked || alreadyBlocked) {
    toast('Este horário acabou de ser ocupado. Escolha outro.', 'error');
    if (currentTeacherId) loadStudentData(currentTeacherId);
    return;
  }

  openBookingModal(
    { day, dayFull, hour, teacherName: currentTeacherName },
    ({ studentName, studentEmail, hour: customHour }: BookingConfirmData) =>
      confirmBooking(day, customHour, studentName, studentEmail)
  );
}

// ================================================================
// CONFIRMA O AGENDAMENTO
// ================================================================

async function confirmBooking(day: string, hour: string, studentName: string, studentEmail: string): Promise<void> {
  try {
    // Verificar se o horário customizado já está ocupado
    const alreadyBooked: boolean  = bookings.some(b   => b.day === day && b.hour === hour);
    const alreadyBlocked: boolean = blockedSlots.some(s => s.day === day && s.hour === hour);

    if (alreadyBooked || alreadyBlocked) {
      toast('Este horário já está ocupado. Escolha outro.', 'error');
      if (currentTeacherId) loadStudentData(currentTeacherId);
      return;
    }

    const result = await createBooking({
      teacher_id:    currentTeacherId!,
      student_name:  studentName,
      student_email: studentEmail || null,
      day,
      hour
    });

    const newBooking: Booking = Array.isArray(result) ? result[0] : result;
    bookings.push(newBooking);
    renderStudentGrid();

    toast(`Agendado com sucesso! ${day.charAt(0).toUpperCase() + day.slice(1)} às ${hour}.`, 'success');

  } catch (err) {
    console.error(err);
    const errMsg: string = (err as Error).message || '';

    if (errMsg.includes('duplicate') || errMsg.includes('unique')) {
      toast('Horário já foi preenchido. Escolha outro.', 'error');
      if (currentTeacherId) loadStudentData(currentTeacherId);
    } else {
      toast('Erro ao agendar. Tente novamente.', 'error');
    }
  }
}
