/**
 * ui.ts — Utilitários de interface reutilizáveis
 */

import { SCHEDULE, DAYS, buildMergedSchedule } from './config.js';
import type {
  ToastType,
  SlotStatus,
  BookingSlotInfo,
  BookingConfirmData,
  TeacherSlotInfo,
  TeacherSlotAction,
  GridMode,
  GridCallbacks,
  WeekStats,
  BlockedSlot,
  Booking,
  SlotClickInfo
} from './types.js';

// ================================================================
// TOAST (notificações flutuantes)
// ================================================================

let toastContainer: HTMLDivElement | null = null;

function getToastContainer(): HTMLDivElement {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

/**
 * Exibe um toast
 */
export function toast(message: string, type: ToastType = 'info', duration: number = 3200): void {
  const container: HTMLDivElement = getToastContainer();
  const el: HTMLDivElement = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => { el.classList.add('show'); });
  });

  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, duration);
}

// ================================================================
// MODAL
// ================================================================

/**
 * Abre o modal de agendamento
 */
export function openBookingModal(slotInfo: BookingSlotInfo, onConfirm: (data: BookingConfirmData) => void): void {
  const overlay: HTMLElement | null = document.getElementById('modal-overlay');
  const title: HTMLElement | null   = document.getElementById('modal-slot-info');

  const dayFull: string = slotInfo.dayFull || slotInfo.day;
  if (title) {
    title.textContent = `${dayFull} às ${slotInfo.hour} — ${slotInfo.teacherName || 'Professor'}`;
  }

  const nameInput: HTMLInputElement | null = document.getElementById('input-student-name') as HTMLInputElement | null;
  const emailInput: HTMLInputElement | null = document.getElementById('input-student-email') as HTMLInputElement | null;

  if (nameInput) nameInput.value = '';
  if (emailInput) emailInput.value = '';

  const timeInput: HTMLInputElement | null = document.getElementById('input-booking-time') as HTMLInputElement | null;
  if (timeInput) {
    timeInput.value = slotInfo.hour || '';
  }

  overlay?.classList.add('open');

  const confirmBtn: HTMLElement | null = document.getElementById('modal-confirm-btn');
  const cancelBtn: HTMLElement | null  = document.getElementById('modal-cancel-btn');

  // Limpa listeners antigos clonando o botão
  const newConfirm: Node | null = confirmBtn?.cloneNode(true) ?? null;
  if (confirmBtn && newConfirm) {
    confirmBtn.replaceWith(newConfirm as HTMLElement);
  }

  (newConfirm as HTMLElement)?.addEventListener('click', () => {
    const nameEl: HTMLInputElement | null = document.getElementById('input-student-name') as HTMLInputElement | null;
    const emailEl: HTMLInputElement | null = document.getElementById('input-student-email') as HTMLInputElement | null;

    const name: string  = nameEl?.value.trim() || '';
    const email: string = emailEl?.value.trim() || '';
    const customHour: string = timeInput?.value || slotInfo.hour;

    if (!name) {
      toast('Por favor, informe seu nome.', 'error');
      return;
    }

    if (!customHour) {
      toast('Por favor, informe o horário.', 'error');
      return;
    }

    closeModal();
    onConfirm({ studentName: name, studentEmail: email, hour: customHour });
  });

  if (cancelBtn) {
    cancelBtn.onclick = closeModal;
  }
  if (overlay) {
    overlay.onclick = (e: MouseEvent) => { if (e.target === overlay) closeModal(); };
  }
}

/**
 * Abre o modal do professor para bloquear/desbloquear horário
 */
export function openTeacherSlotModal(slotInfo: TeacherSlotInfo, onConfirm: (action: TeacherSlotAction) => void): void {
  const overlay: HTMLElement | null = document.getElementById('teacher-slot-overlay');
  if (!overlay) return;

  const title: HTMLElement | null = document.getElementById('teacher-slot-title');
  const info: HTMLElement | null  = document.getElementById('teacher-slot-info');
  const timeInput: HTMLInputElement | null = document.getElementById('teacher-slot-time') as HTMLInputElement | null;
  const actionsEl: HTMLElement | null = document.getElementById('teacher-slot-actions');

  const dayFull: string = slotInfo.dayFull || slotInfo.day;

  if (slotInfo.status === 'booked') {
    if (title) title.textContent = 'Agendamento recebido';
    if (info) info.textContent = `${dayFull} às ${slotInfo.hour}`;
    if (timeInput) timeInput.value = slotInfo.hour;
    if (actionsEl) actionsEl.innerHTML = `
      <button class="btn btn-outline" id="teacher-slot-cancel-booking" style="flex:1">Cancelar agendamento</button>
      <button class="btn btn-outline" id="teacher-slot-close">Fechar</button>
    `;
  } else if (slotInfo.status === 'blocked') {
    if (title) title.textContent = 'Horário bloqueado';
    if (info) info.textContent = `${dayFull} às ${slotInfo.hour}`;
    if (timeInput) timeInput.value = slotInfo.hour;
    if (actionsEl) actionsEl.innerHTML = `
      <button class="btn btn-success" id="teacher-slot-unblock" style="flex:1">Desbloquear</button>
      <button class="btn btn-outline" id="teacher-slot-close">Fechar</button>
    `;
  } else {
    if (title) title.textContent = 'Bloquear horário';
    if (info) info.textContent = dayFull;
    if (timeInput) timeInput.value = slotInfo.hour;
    if (actionsEl) actionsEl.innerHTML = `
      <button class="btn btn-danger" id="teacher-slot-block" style="flex:1">Bloquear</button>
      <button class="btn btn-outline" id="teacher-slot-close">Fechar</button>
    `;
  }

  overlay.classList.add('open');

  // Bind close
  document.getElementById('teacher-slot-close')?.addEventListener('click', () => {
    overlay.classList.remove('open');
  });

  // Bind block
  document.getElementById('teacher-slot-block')?.addEventListener('click', () => {
    const customHour: string = timeInput?.value || slotInfo.hour;
    if (!customHour) {
      toast('Informe o horário.', 'error');
      return;
    }
    overlay.classList.remove('open');
    onConfirm({ action: 'block', hour: customHour, id: null });
  });

  // Bind unblock
  document.getElementById('teacher-slot-unblock')?.addEventListener('click', () => {
    overlay.classList.remove('open');
    onConfirm({ action: 'unblock', hour: slotInfo.hour, id: slotInfo.id });
  });

  // Bind cancel booking
  document.getElementById('teacher-slot-cancel-booking')?.addEventListener('click', () => {
    if (!confirm('Cancelar este agendamento?')) return;
    overlay.classList.remove('open');
    onConfirm({ action: 'cancel_booking', hour: slotInfo.hour, id: slotInfo.id });
  });

  overlay.onclick = (e: MouseEvent) => { if (e.target === overlay) overlay.classList.remove('open'); };
}

export function closeModal(): void {
  document.getElementById('modal-overlay')?.classList.remove('open');
  document.getElementById('coord-edit-overlay')?.classList.remove('open');
  document.getElementById('teacher-slot-overlay')?.classList.remove('open');
}

// ================================================================
// LOADING STATE
// ================================================================

/**
 * Mostra/oculta estado de carregamento num container
 */
export function setLoading(containerId: string, isLoading: boolean, message: string = 'Carregando...'): void {
  const container: HTMLElement | null = document.getElementById(containerId);
  if (!container) return;

  if (isLoading) {
    container.innerHTML = `
      <div class="loading-overlay">
        <div class="spinner"></div>
        <span>${message}</span>
      </div>`;
  }
}

// ================================================================
// RENDERIZAÇÃO DA GRADE SEMANAL (DINÂMICA)
// ================================================================

/**
 * Renderiza a grade semanal com horários dinâmicos.
 */
export function renderWeekGrid(
  containerId: string,
  blocked: BlockedSlot[],
  booked: Booking[],
  mode: GridMode,
  callbacks: GridCallbacks = {}
): void {
  const container: HTMLElement | null = document.getElementById(containerId);
  if (!container) return;

  // Índices para lookup rápido O(1)
  const blockedMap: Record<string, BlockedSlot> = {};
  const bookedMap: Record<string, Booking> = {};

  blocked.forEach(s => {
    const key: string = mode === 'coordinator' && s.teacher_name
      ? `${s.teacher_name}:${s.day}:${s.hour}`
      : `${s.day}:${s.hour}`;
    blockedMap[key] = s;
  });

  booked.forEach(b => {
    const key: string = mode === 'coordinator' && b.teacher_name
      ? `${b.teacher_name}:${b.day}:${b.hour}`
      : `${b.day}:${b.hour}`;
    bookedMap[key] = b;
  });

  const mergedSchedule = buildMergedSchedule(blocked, booked);

  let html: string = '';

  if (mode === 'coordinator' && !callbacks.teacherName) {
    // Visão "todos os professores" — grade por professor
    const teacherNames: string[] = [...new Set([
      ...blocked.map(s => s.teacher_name || callbacks.teacherName || ''),
      ...booked.map(b => b.teacher_name || callbacks.teacherName || '')
    ])].filter(Boolean);

    teacherNames.forEach(tname => {
      html += `<div class="coord-teacher-section">
        <div class="coord-teacher-label">${tname}</div>
        <div class="week-grid">`;

      DAYS.forEach(day => {
        html += `<div class="day-column">
          <div class="day-header">
            <div class="day-name">${day.label}</div>
            <div class="day-label">${day.full}</div>
          </div>`;

        Object.entries(mergedSchedule).forEach(([periodKey, period]) => {
          html += `<div class="period-section period-${periodKey}">
            <div class="period-label">${period.label}</div>`;

          period.hours.forEach(hour => {
            const key: string = `${tname}:${day.key}:${hour}`;
            const blockData: BlockedSlot | undefined = blockedMap[key];
            const bookData: Booking | undefined  = bookedMap[key];
            const isBlocked: boolean = !!blockData;
            const isBooked: boolean  = !!bookData;
            const slotId: string | null = isBlocked ? blockData.id : (isBooked ? bookData.id : null);

            let cls: string, label: string, title: string;
            if (isBooked) {
              cls   = 'booked';
              label = `${hour} \u{1F464} ${bookData.student_name}`;
              title = `Agendado: ${bookData.student_name} — clique para editar`;
            } else if (isBlocked) {
              cls   = 'blocked';
              label = `${hour} \u2715`;
              title = 'Bloqueado — clique para editar';
            } else {
              cls   = 'available';
              label = hour;
              title = 'Disponível — clique para agendar ou bloquear';
            }

            const tid: string = (isBlocked ? blockData.teacher_id : (isBooked ? bookData.teacher_id : null)) || '';

            html += `<button
              class="slot ${cls}"
              data-day="${day.key}"
              data-hour="${hour}"
              data-status="${isBooked ? 'booked' : (isBlocked ? 'blocked' : 'available')}"
              data-id="${slotId || ''}"
              data-teacher-id="${tid}"
              data-teacher-name="${tname}"
              title="${title}"
            >${label}</button>`;
          });

          html += `</div>`;
        });

        html += `</div>`;
      });

      html += `</div></div>`;
    });

  } else {
    // Visão de um professor ou professor/aluno
    DAYS.forEach(day => {
      html += `<div class="day-column">
        <div class="day-header">
          <div class="day-name">${day.label}</div>
          <div class="day-label">${day.full}</div>
        </div>`;

      Object.entries(mergedSchedule).forEach(([periodKey, period]) => {
        html += `<div class="period-section period-${periodKey}">
          <div class="period-label">${period.label}</div>`;

        period.hours.forEach(hour => {
          const key: string       = `${day.key}:${hour}`;
          const isBlocked: boolean = key in blockedMap;
          const isBooked: boolean  = key in bookedMap;
          const slotId: string | null = isBlocked ? blockedMap[key].id : (isBooked ? bookedMap[key].id : null);
          const booking: Booking | null = isBooked ? bookedMap[key] : null;

          if (mode === 'teacher') {
            let cls: string, label: string, title: string;

            if (isBooked) {
              cls   = 'booked';
              label = `${hour} \u{1F464}`;
              title = `Agendado: ${booking!.student_name}`;
            } else if (isBlocked) {
              cls   = 'blocked';
              label = `${hour} \u2715`;
              title = 'Clique para desbloquear';
            } else {
              cls   = 'available';
              label = `${hour}`;
              title = 'Clique para bloquear';
            }

            html += `<button
              class="slot ${cls}"
              data-day="${day.key}"
              data-hour="${hour}"
              data-status="${isBooked ? 'booked' : (isBlocked ? 'blocked' : 'available')}"
              data-id="${slotId || ''}"
              title="${title}"
            >${label}</button>`;

          } else if (mode === 'coordinator') {
            let cls: string, label: string, title: string;

            if (isBooked) {
              cls   = 'booked';
              label = `${hour} \u{1F464} ${booking!.student_name}`;
              title = `Agendado: ${booking!.student_name} — clique para editar`;
            } else if (isBlocked) {
              cls   = 'blocked';
              label = `${hour} \u2715`;
              title = 'Bloqueado — clique para editar';
            } else {
              cls   = 'available';
              label = hour;
              title = 'Disponível — clique para agendar ou bloquear';
            }

            html += `<button
              class="slot ${cls}"
              data-day="${day.key}"
              data-hour="${hour}"
              data-status="${isBooked ? 'booked' : (isBlocked ? 'blocked' : 'available')}"
              data-id="${slotId || ''}"
              data-teacher-id="${callbacks.teacherId || ''}"
              data-teacher-name="${callbacks.teacherName || ''}"
              title="${title}"
            >${label}</button>`;

          } else {
            // Modo aluno: mostra disponíveis (clicáveis) e ocupados (somente leitura)
            const scheduleHours: Set<string> = new Set([
              ...SCHEDULE.manha.hours,
              ...SCHEDULE.tarde.hours,
              ...SCHEDULE.noite.hours
            ]);
            const isCustom: boolean = !scheduleHours.has(hour);
            const customCls: string = isCustom ? ' custom-time' : '';

            if (isBooked) {
              html += `<button
                class="slot booked${customCls}"
                data-day="${day.key}"
                data-day-full="${day.full}"
                data-hour="${hour}"
                data-status="booked"
                disabled
                title="Agendado: ${booking!.student_name}"
              >${hour} \u{1F464} ${booking!.student_name}</button>`;
            } else if (isBlocked) {
              html += `<button
                class="slot blocked${customCls}"
                data-day="${day.key}"
                data-day-full="${day.full}"
                data-hour="${hour}"
                data-status="blocked"
                disabled
                title="Horário bloqueado"
              >${hour} \u2715</button>`;
            } else {
              html += `<button
                class="slot student-available${customCls}"
                data-day="${day.key}"
                data-day-full="${day.full}"
                data-hour="${hour}"
                data-status="available"
                title="Clique para agendar"
              >${hour}</button>`;
            }
          }
        });

        html += `</div>`;
      });

      html += `</div>`;
    });
  }

  container.innerHTML = html;

  // Bind de eventos
  container.querySelectorAll('.slot').forEach(btn => {
    btn.addEventListener('click', () => {
      if (callbacks.onSlotClick) {
        const info: SlotClickInfo = {
          day:     (btn as HTMLElement).dataset.day || '',
          dayFull: (btn as HTMLElement).dataset.dayFull,
          hour:    (btn as HTMLElement).dataset.hour || '',
          status:  ((btn as HTMLElement).dataset.status as SlotStatus) || 'available',
          id:      (btn as HTMLElement).dataset.id || null,
          teacherId:   (btn as HTMLElement).dataset.teacherId || null,
          teacherName: (btn as HTMLElement).dataset.teacherName || null
        };
        callbacks.onSlotClick(info);
      }
    });
  });
}

// ================================================================
// CONTADORES DE RESUMO
// ================================================================

/**
 * Calcula estatísticas da semana
 */
export function calcStats(blocked: BlockedSlot[], booked: Booking[], totalSlots: number): WeekStats {
  const totalBlocked: number = blocked.length;
  const totalBooked: number  = booked.length;
  const totalFree: number    = Math.max(0, totalSlots - totalBlocked - totalBooked);
  return { totalFree, totalBlocked, totalBooked };
}
