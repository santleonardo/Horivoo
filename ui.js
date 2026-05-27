/**
 * ui.js — Utilitários de interface reutilizáveis
 */

// ================================================================
// TOAST (notificações flutuantes)
// ================================================================

let toastContainer = null;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function toast(message, type = 'info', duration = 3200) {
  const container = getToastContainer();
  const el = document.createElement('div');
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

export function openBookingModal(slotInfo, onConfirm) {
  const overlay = document.getElementById('modal-overlay');
  const title   = document.getElementById('modal-slot-info');

  const dayFull = slotInfo.dayFull || slotInfo.day;
  title.textContent = `${dayFull} — ${slotInfo.teacherName || 'Professor'}`;

  document.getElementById('input-student-name').value  = '';
  document.getElementById('input-student-email').value = '';

  // Preencher o campo de horário com o horário clicado
  const timeInput = document.getElementById('input-booking-time');
  if (timeInput) {
    timeInput.value = slotInfo.hour || '';
  }

  overlay.classList.add('open');

  const confirmBtn = document.getElementById('modal-confirm-btn');
  const cancelBtn  = document.getElementById('modal-cancel-btn');

  const newConfirm = confirmBtn.cloneNode(true);
  confirmBtn.replaceWith(newConfirm);

  newConfirm.addEventListener('click', () => {
    const name  = document.getElementById('input-student-name').value.trim();
    const email = document.getElementById('input-student-email').value.trim();
    const hour  = timeInput ? timeInput.value : slotInfo.hour;

    if (!name) {
      toast('Por favor, informe seu nome.', 'error');
      return;
    }

    if (!hour || !/^\d{2}:\d{2}$/.test(hour)) {
      toast('Informe um horário válido (ex: 07:35).', 'error');
      return;
    }

    closeModal();
    onConfirm({ studentName: name, studentEmail: email, hour });
  });

  cancelBtn.onclick = closeModal;
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
}

export function closeModal() {
  document.getElementById('modal-overlay')?.classList.remove('open');
  document.getElementById('coord-edit-overlay')?.classList.remove('open');
}

// ================================================================
// LOADING STATE
// ================================================================

export function setLoading(containerId, isLoading, message = 'Carregando...') {
  const container = document.getElementById(containerId);
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
// RENDERIZAÇÃO DA GRADE SEMANAL
// ================================================================

import { SCHEDULE, DAYS, buildScheduleWithData } from './config.js';

/**
 * Renderiza a grade semanal.
 * Mescla horários customizados dos dados com os horários padrão.
 * 
 * @param {string} containerId
 * @param {object[]} blocked - array de { id, day, hour, teacher_name?, teacher_id? }
 * @param {object[]} booked  - array de { id, day, hour, student_name, teacher_name?, teacher_id? }
 * @param {string} mode - 'teacher' | 'student' | 'coordinator'
 * @param {object} callbacks - { onSlotClick, teacherName, teacherId }
 */
export function renderWeekGrid(containerId, blocked, booked, mode, callbacks = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Construir SCHEDULE mesclando horários customizados dos dados
  const schedule = buildScheduleWithData(blocked, booked);

  // Índices para lookup rápido O(1)
  const blockedMap = {};
  const bookedMap  = {};

  blocked.forEach(s => {
    const key = mode === 'coordinator' && s.teacher_name
      ? `${s.teacher_name}:${s.day}:${s.hour}`
      : `${s.day}:${s.hour}`;
    blockedMap[key] = s;
  });

  booked.forEach(b => {
    const key = mode === 'coordinator' && b.teacher_name
      ? `${b.teacher_name}:${b.day}:${b.hour}`
      : `${b.day}:${b.hour}`;
    bookedMap[key] = b;
  });

  let html = '';

  if (mode === 'coordinator' && !callbacks.teacherName) {
    // Visão "todos os professores"
    const teacherNames = [...new Set([
      ...blocked.map(s => s.teacher_name || callbacks.teacherName),
      ...booked.map(b => b.teacher_name || callbacks.teacherName)
    ])].filter(Boolean);

    // Se não há dados, mostrar todos os professores
    if (teacherNames.length === 0) {
      teacherNames.push('Professor');
    }

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

        Object.entries(schedule).forEach(([periodKey, period]) => {
          html += `<div class="period-section period-${periodKey}">
            <div class="period-label">${period.label}</div>`;

          period.hours.forEach(hour => {
            const key = `${tname}:${day.key}:${hour}`;
            const blockData = blockedMap[key];
            const bookData  = bookedMap[key];
            const isBlocked = !!blockData;
            const isBooked  = !!bookData;
            const slotId    = isBlocked ? blockData.id : (isBooked ? bookData.id : null);

            let cls, label, title;
            if (isBooked) {
              cls   = 'booked';
              label = `${hour} 👤 ${bookData.student_name}`;
              title = `Agendado: ${bookData.student_name} — clique para editar`;
            } else if (isBlocked) {
              cls   = 'blocked';
              label = `${hour} ✕`;
              title = 'Bloqueado — clique para editar';
            } else {
              cls   = 'available';
              label = hour;
              title = 'Disponível — clique para agendar ou bloquear';
            }

            const tid = (isBlocked ? blockData.teacher_id : (isBooked ? bookData.teacher_id : null)) || '';

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
    // Visão de um professor ou aluno
    DAYS.forEach(day => {
      html += `<div class="day-column">
        <div class="day-header">
          <div class="day-name">${day.label}</div>
          <div class="day-label">${day.full}</div>
        </div>`;

      Object.entries(schedule).forEach(([periodKey, period]) => {
        html += `<div class="period-section period-${periodKey}">
          <div class="period-label">${period.label}</div>`;

        period.hours.forEach(hour => {
          const key       = `${day.key}:${hour}`;
          const isBlocked = key in blockedMap;
          const isBooked  = key in bookedMap;
          const slotId    = isBlocked ? blockedMap[key].id : (isBooked ? bookedMap[key].id : null);
          const booking   = isBooked ? bookedMap[key] : null;

          if (mode === 'teacher') {
            let cls, label, title;

            if (isBooked) {
              cls   = 'booked';
              label = `${hour} 👤`;
              title = `Agendado: ${booking.student_name}`;
            } else if (isBlocked) {
              cls   = 'blocked';
              label = `${hour} ✕`;
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
              ${isBooked ? 'disabled' : ''}
            >${label}</button>`;

          } else if (mode === 'coordinator') {
            let cls, label, title;

            if (isBooked) {
              cls   = 'booked';
              label = `${hour} 👤 ${booking.student_name}`;
              title = `Agendado: ${booking.student_name} — clique para editar`;
            } else if (isBlocked) {
              cls   = 'blocked';
              label = `${hour} ✕`;
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
            // Modo aluno: só renderiza se disponível
            if (!isBlocked && !isBooked) {
              html += `<button
                class="slot student-available"
                data-day="${day.key}"
                data-day-full="${day.full}"
                data-hour="${hour}"
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
        callbacks.onSlotClick({
          day:     btn.dataset.day,
          dayFull: btn.dataset.dayFull,
          hour:    btn.dataset.hour,
          status:  btn.dataset.status,
          id:      btn.dataset.id || null,
          teacherId:   btn.dataset.teacherId || null,
          teacherName: btn.dataset.teacherName || null
        });
      }
    });
  });
}

// ================================================================
// CONTADORES DE RESUMO
// ================================================================

export function calcStats(blocked, booked, totalSlots) {
  const totalBlocked = blocked.length;
  const totalBooked  = booked.length;
  const totalFree    = totalSlots - totalBlocked - totalBooked;
  return { totalBlocked, totalBooked, totalFree };
}
