/**
 * coordinator.js — Painel do Coordenador
 * Consulta, edita, bloqueia, remove e compartilha horários de todos os professores
 */

import { getTeachers, getBlockedSlots, getBookings, blockSlot, unblockSlot, createBooking, cancelBooking } from './api.js';
import { renderWeekGrid, toast, calcStats, closeModal } from './ui.js';
import { SCHEDULE, DAYS, TOTAL_SLOTS, buildScheduleWithData } from './config.js';

let teachers        = [];
let currentTeacherId = null;
let currentTeacherName = '';
let blockedSlots    = [];
let bookings        = [];
let searchFilter    = '';
let filterType      = 'all'; // 'all' | 'hour' | 'teacher' | 'student'

// ================================================================
// INICIALIZAÇÃO
// ================================================================

export async function initCoordinatorPanel() {
  try {
    teachers = await getTeachers();

    if (teachers.length === 0) {
      document.getElementById('coordinator-panel').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <p>Nenhum professor cadastrado.</p>
        </div>`;
      return;
    }

    const select = document.getElementById('coord-teacher-select');
    select.innerHTML = `<option value="__all__">Todos os professores</option>` +
      teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

    const updateTeacher = () => {
      const val = select.value;
      if (val === '__all__') {
        currentTeacherId = null;
        currentTeacherName = 'Todos';
      } else {
        currentTeacherId = val;
        const opt = select.options[select.selectedIndex];
        currentTeacherName = opt?.textContent || '';
      }
    };

    updateTeacher();

    select.addEventListener('change', () => {
      updateTeacher();
      loadCoordinatorData();
    });

    // Barra de pesquisa
    const searchInput = document.getElementById('coord-search');
    searchInput?.addEventListener('input', (e) => {
      searchFilter = e.target.value.trim().toLowerCase();
      renderCoordinatorGrid();
      renderCoordinatorTable();
    });

    // Filtro tipo
    document.querySelectorAll('.coord-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.coord-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filterType = btn.dataset.filter;
        renderCoordinatorGrid();
        renderCoordinatorTable();
      });
    });

    // Botão compartilhar
    document.getElementById('coord-share-btn')?.addEventListener('click', shareSchedule);

    await loadCoordinatorData();

  } catch (err) {
    console.error(err);
    toast('Erro ao carregar dados. Verifique a configuração.', 'error');
  }
}

// ================================================================
// CARREGAR DADOS
// ================================================================

async function loadCoordinatorData() {
  const gridEl = document.getElementById('coord-week-grid');
  gridEl.innerHTML = `<div class="loading-overlay"><div class="spinner"></div><span>Carregando horários...</span></div>`;

  try {
    if (currentTeacherId) {
      [blockedSlots, bookings] = await Promise.all([
        getBlockedSlots(currentTeacherId),
        getBookings(currentTeacherId)
      ]);
    } else {
      const allBlocked = [];
      const allBooked  = [];
      for (const t of teachers) {
        const [b, bk] = await Promise.all([
          getBlockedSlots(t.id),
          getBookings(t.id)
        ]);
        b.forEach(s => { s.teacher_name = t.name; s.teacher_id = t.id; allBlocked.push(s); });
        bk.forEach(s => { s.teacher_name = t.name; s.teacher_id = t.id; allBooked.push(s); });
      }
      blockedSlots = allBlocked;
      bookings = allBooked;
    }

    renderCoordinatorGrid();
    renderCoordinatorStats();
    renderCoordinatorTable();

  } catch (err) {
    console.error(err);
    toast('Erro ao carregar horários.', 'error');
  }
}

// ================================================================
// RENDERIZAR GRADE
// ================================================================

function renderCoordinatorGrid() {
  renderWeekGrid(
    'coord-week-grid',
    blockedSlots,
    bookings,
    'coordinator',
    {
      onSlotClick: handleCoordSlotClick,
      teacherName: currentTeacherName,
      teacherId: currentTeacherId
    }
  );
}

// ================================================================
// ESTATÍSTICAS GLOBAIS
// ================================================================

function renderCoordinatorStats() {
  const schedule = buildScheduleWithData(blockedSlots, bookings);
  const slotsPerTeacher = Object.values(schedule).reduce((acc, p) => acc + p.hours.length, 0) * DAYS.length;
  const totalFree    = slotsPerTeacher * (currentTeacherId ? 1 : teachers.length) - blockedSlots.length - bookings.length;
  const totalBlocked = blockedSlots.length;
  const totalBooked  = bookings.length;

  const el = document.getElementById('coord-stats');
  if (!el) return;

  el.innerHTML = `
    <div class="summary-card green">
      <div>
        <div class="summary-value">${totalFree}</div>
        <div class="summary-label">Disponíveis</div>
      </div>
    </div>
    <div class="summary-card red">
      <div>
        <div class="summary-value">${totalBlocked}</div>
        <div class="summary-label">Bloqueados</div>
      </div>
    </div>
    <div class="summary-card blue">
      <div>
        <div class="summary-value">${totalBooked}</div>
        <div class="summary-label">Agendados</div>
      </div>
    </div>
  `;
}

// ================================================================
// TABELA DETALHADA COM FILTRO
// ================================================================

function renderCoordinatorTable() {
  const container = document.getElementById('coord-table-body');
  if (!container) return;

  const items = [];

  blockedSlots.forEach(s => {
    items.push({
      type: 'blocked',
      teacher_id: s.teacher_id || currentTeacherId,
      teacher_name: s.teacher_name || currentTeacherName,
      day: s.day,
      hour: s.hour,
      student_name: '',
      student_email: '',
      id: s.id
    });
  });

  bookings.forEach(b => {
    items.push({
      type: 'booked',
      teacher_id: b.teacher_id || currentTeacherId,
      teacher_name: b.teacher_name || currentTeacherName,
      day: b.day,
      hour: b.hour,
      student_name: b.student_name,
      student_email: b.student_email || '',
      id: b.id
    });
  });

  const filtered = items.filter(item => {
    if (!searchFilter) return true;

    switch (filterType) {
      case 'hour':
        return item.hour.includes(searchFilter);
      case 'teacher':
        return item.teacher_name.toLowerCase().includes(searchFilter);
      case 'student':
        return item.student_name.toLowerCase().includes(searchFilter);
      default:
        return item.hour.includes(searchFilter) ||
               item.teacher_name.toLowerCase().includes(searchFilter) ||
               item.student_name.toLowerCase().includes(searchFilter) ||
               item.day.toLowerCase().includes(searchFilter);
    }
  });

  const dayOrder = ['segunda','terca','quarta','quinta','sexta','sabado','domingo'];
  filtered.sort((a, b) => {
    const tc = a.teacher_name.localeCompare(b.teacher_name);
    if (tc !== 0) return tc;
    const dc = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
    if (dc !== 0) return dc;
    return a.hour.localeCompare(b.hour);
  });

  if (filtered.length === 0) {
    container.innerHTML = `<tr><td colspan="6" class="empty-state" style="padding:32px 0">Nenhum resultado encontrado.</td></tr>`;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const typeBadge = item.type === 'blocked'
      ? '<span class="badge badge-danger">Bloqueado</span>'
      : '<span class="badge badge-booked">Agendado</span>';

    const dayLabel = item.day.charAt(0).toUpperCase() + item.day.slice(1);

    return `<tr data-id="${item.id}" data-type="${item.type}" data-teacher-id="${item.teacher_id}" data-day="${item.day}" data-hour="${item.hour}">
      <td>${item.teacher_name}</td>
      <td>${dayLabel}</td>
      <td>${item.hour}</td>
      <td>${item.student_name || '—'}</td>
      <td>${typeBadge}</td>
      <td class="coord-actions">
        <button class="btn btn-outline btn-sm coord-edit-btn" title="Editar">✏️</button>
        <button class="btn btn-danger btn-sm coord-delete-btn" title="Remover">✕</button>
      </td>
    </tr>`;
  }).join('');

  container.querySelectorAll('.coord-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('tr');
      openEditModal(row.dataset);
    });
  });

  container.querySelectorAll('.coord-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('tr');
      handleDelete(row.dataset);
    });
  });
}

// ================================================================
// CLIQUE EM SLOT DA GRADE
// ================================================================

function handleCoordSlotClick({ day, hour, status, id, teacherId, teacherName }) {
  const tid = teacherId || currentTeacherId;
  const tname = teacherName || currentTeacherName;

  openEditModal({
    type: status === 'available' ? 'available' : status,
    id: id || '',
    teacherId: tid,
    teacherName: tname,
    day,
    hour
  });
}

// ================================================================
// MODAL DE EDIÇÃO — com campo de horário editável (type="time")
// ================================================================

function openEditModal(data) {
  const overlay = document.getElementById('coord-edit-overlay');
  const title   = document.getElementById('coord-edit-title');
  const info    = document.getElementById('coord-edit-info');

  const dayLabel = (data.day || '').charAt(0).toUpperCase() + (data.day || '').slice(1);
  const tname = data.teacherName || 'Professor';

  title.textContent = data.type === 'available' ? 'Adicionar horário' : 'Editar horário';
  info.textContent = `${tname} — ${dayLabel}`;

  // Preencher campos
  document.getElementById('coord-edit-teacher').value = data.teacherId || '';
  document.getElementById('coord-edit-day').value = data.day || '';
  document.getElementById('coord-edit-hour').value = data.hour || '';
  document.getElementById('coord-edit-student-name').value = '';
  document.getElementById('coord-edit-student-email').value = '';

  // Mostrar/esconder campos conforme tipo
  const studentFields = document.getElementById('coord-edit-student-fields');
  const actionBtns = document.getElementById('coord-edit-actions');

  if (data.type === 'booked') {
    const booking = bookings.find(b => b.id === data.id);
    if (booking) {
      document.getElementById('coord-edit-student-name').value = booking.student_name || '';
      document.getElementById('coord-edit-student-email').value = booking.student_email || '';
    }
    studentFields.style.display = '';
    actionBtns.innerHTML = `
      <button class="btn btn-success" id="coord-save-btn" style="flex:1">Salvar</button>
      <button class="btn btn-outline" id="coord-unbook-btn">Cancelar agendamento</button>
      <button class="btn btn-outline" id="coord-cancel-btn">Fechar</button>
    `;
  } else if (data.type === 'blocked') {
    studentFields.style.display = 'none';
    actionBtns.innerHTML = `
      <button class="btn btn-success" id="coord-save-btn" style="flex:1">Salvar</button>
      <button class="btn btn-outline" id="coord-unblock-btn">Desbloquear</button>
      <button class="btn btn-outline" id="coord-cancel-btn">Fechar</button>
    `;
  } else {
    studentFields.style.display = '';
    actionBtns.innerHTML = `
      <button class="btn btn-success" id="coord-save-btn" style="flex:1">Salvar agendamento</button>
      <button class="btn btn-danger" id="coord-block-btn">Bloquear horário</button>
      <button class="btn btn-outline" id="coord-cancel-btn">Fechar</button>
    `;
  }

  overlay.classList.add('open');

  document.getElementById('coord-cancel-btn')?.addEventListener('click', () => {
    overlay.classList.remove('open');
  });

  document.getElementById('coord-save-btn')?.addEventListener('click', async () => {
    await handleSave(data);
    overlay.classList.remove('open');
  });

  document.getElementById('coord-unblock-btn')?.addEventListener('click', async () => {
    await handleUnblock(data);
    overlay.classList.remove('open');
  });

  document.getElementById('coord-unbook-btn')?.addEventListener('click', async () => {
    await handleCancelBooking(data);
    overlay.classList.remove('open');
  });

  document.getElementById('coord-block-btn')?.addEventListener('click', async () => {
    await handleBlock(data);
    overlay.classList.remove('open');
  });

  overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.remove('open'); };
}

// ================================================================
// AÇÕES DO COORDENADOR
// ================================================================

async function handleSave(data) {
  const teacherId   = data.teacherId || document.getElementById('coord-edit-teacher').value;
  const day         = document.getElementById('coord-edit-day').value;
  const hour        = document.getElementById('coord-edit-hour').value;
  const studentName = document.getElementById('coord-edit-student-name').value.trim();
  const studentEmail = document.getElementById('coord-edit-student-email').value.trim();

  // Validar horário
  if (!hour || !/^\d{2}:\d{2}$/.test(hour)) {
    toast('Informe um horário válido (ex: 07:35).', 'error');
    return;
  }

  if (data.type === 'booked') {
    try {
      await cancelBooking(data.id);
      await createBooking({
        teacher_id: teacherId,
        student_name: studentName || 'Aluno',
        student_email: studentEmail || null,
        day, hour
      });
      toast('Agendamento atualizado!', 'success');
      await loadCoordinatorData();
    } catch (err) {
      toast('Erro ao atualizar: ' + err.message, 'error');
    }
  } else if (data.type === 'available') {
    if (!studentName) {
      toast('Informe o nome do aluno.', 'error');
      return;
    }
    try {
      await createBooking({
        teacher_id: teacherId,
        student_name: studentName,
        student_email: studentEmail || null,
        day, hour
      });
      toast('Agendamento criado!', 'success');
      await loadCoordinatorData();
    } catch (err) {
      toast('Erro ao agendar: ' + err.message, 'error');
    }
  } else if (data.type === 'blocked') {
    toast('Horário já está bloqueado.', 'info');
  }
}

async function handleBlock(data) {
  const teacherId = data.teacherId || currentTeacherId;
  const day       = document.getElementById('coord-edit-day').value;
  const hour      = document.getElementById('coord-edit-hour').value;

  if (!hour || !/^\d{2}:\d{2}$/.test(hour)) {
    toast('Informe um horário válido (ex: 07:35).', 'error');
    return;
  }

  try {
    await blockSlot(teacherId, day, hour);
    toast('Horário bloqueado!', 'success');
    await loadCoordinatorData();
  } catch (err) {
    toast('Erro ao bloquear: ' + err.message, 'error');
  }
}

async function handleUnblock(data) {
  try {
    await unblockSlot(data.id);
    toast('Horário desbloqueado!', 'success');
    await loadCoordinatorData();
  } catch (err) {
    toast('Erro ao desbloquear: ' + err.message, 'error');
  }
}

async function handleCancelBooking(data) {
  if (!confirm('Cancelar este agendamento?')) return;
  try {
    await cancelBooking(data.id);
    toast('Agendamento cancelado!', 'success');
    await loadCoordinatorData();
  } catch (err) {
    toast('Erro ao cancelar: ' + err.message, 'error');
  }
}

async function handleDelete(data) {
  if (!confirm('Remover este horário?')) return;

  try {
    if (data.type === 'blocked') {
      await unblockSlot(data.id);
    } else if (data.type === 'booked') {
      await cancelBooking(data.id);
    }
    toast('Horário removido!', 'success');
    await loadCoordinatorData();
  } catch (err) {
    toast('Erro ao remover: ' + err.message, 'error');
  }
}

// ================================================================
// COMPARTILHAR COMO IMAGEM
// ================================================================

async function shareSchedule() {
  toast('Gerando imagem...', 'info', 2000);

  try {
    const gridEl = document.getElementById('coord-week-grid');
    if (!gridEl) {
      toast('Grade não encontrada.', 'error');
      return;
    }

    const canvas = await htmlToCanvas(gridEl);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        toast('Erro ao gerar imagem.', 'error');
        return;
      }

      if (navigator.share && navigator.canShare) {
        try {
          const file = new File([blob], 'horivoo-grade.png', { type: 'image/png' });
          const shareData = { files: [file], title: 'Horivoo - Grade de Horários' };

          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return;
          }
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `horivoo-grade-${new Date().toISOString().slice(0,10)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Imagem salva!', 'success');
    }, 'image/png');

  } catch (err) {
    console.error(err);
    toast('Erro ao gerar imagem. Tente novamente.', 'error');
  }
}

// ================================================================
// HTML → CANVAS (renderização manual com horários customizados)
// ================================================================

async function htmlToCanvas(gridEl) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Construir schedule com dados customizados
  const schedule = buildScheduleWithData(blockedSlots, bookings);
  const totalHours = Object.values(schedule).reduce((acc, p) => acc + p.hours.length, 0);

  const dayWidth = 140;
  const hourHeight = 28;
  const headerHeight = 50;
  const teacherHeaderHeight = 32;
  const margin = 20;

  const canvasWidth = margin * 2 + DAYS.length * dayWidth;
  const canvasHeight = margin + headerHeight + teacherHeaderHeight + totalHours * hourHeight + margin;

  canvas.width = canvasWidth * 2;
  canvas.height = canvasHeight * 2;
  ctx.scale(2, 2);

  ctx.fillStyle = '#F7F5F0';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.fillStyle = '#1A1714';
  ctx.font = 'bold 16px DM Sans, sans-serif';
  ctx.fillText(`Horivoo — Grade de Horários${currentTeacherName !== 'Todos' ? ' — ' + currentTeacherName : ''}`, margin, margin + 16);

  ctx.fillStyle = '#8A8178';
  ctx.font = '11px DM Sans, sans-serif';
  ctx.fillText(new Date().toLocaleDateString('pt-BR'), margin, margin + 32);

  ctx.font = 'bold 11px DM Sans, sans-serif';
  DAYS.forEach((day, i) => {
    const x = margin + i * dayWidth;
    const y = margin + headerHeight;

    ctx.fillStyle = '#F0EDE7';
    ctx.fillRect(x, y, dayWidth - 4, teacherHeaderHeight);
    ctx.fillStyle = '#1A1714';
    ctx.textAlign = 'center';
    ctx.fillText(day.full, x + dayWidth / 2 - 2, y + 20);
  });

  ctx.textAlign = 'center';
  ctx.font = '10px DM Sans, sans-serif';

  const blockedMap = {};
  const bookedMap = {};
  blockedSlots.forEach(s => { blockedMap[`${s.teacher_name || currentTeacherName}:${s.day}:${s.hour}`] = s; });
  bookings.forEach(b => { bookedMap[`${b.teacher_name || currentTeacherName}:${b.day}:${b.hour}`] = b; });

  let rowIdx = 0;
  Object.entries(schedule).forEach(([periodKey, period]) => {
    period.hours.forEach(hour => {
      const y = margin + headerHeight + teacherHeaderHeight + rowIdx * hourHeight;

      DAYS.forEach((day, i) => {
        const x = margin + i * dayWidth;
        const key = `${currentTeacherName}:${day.key}:${hour}`;
        const isBlocked = key in blockedMap;
        const isBooked = key in bookedMap;

        let bg, fg, label;

        if (isBooked) {
          bg = '#EAE9F7'; fg = '#5B5EA6'; label = `${hour} 👤`;
        } else if (isBlocked) {
          bg = '#FDE8DF'; fg = '#C1440E'; label = `${hour} ✕`;
        } else {
          bg = '#D8F3DC'; fg = '#2D6A4F'; label = hour;
        }

        ctx.fillStyle = bg;
        ctx.fillRect(x + 1, y + 1, dayWidth - 6, hourHeight - 4);
        ctx.fillStyle = fg;
        ctx.fillText(label, x + dayWidth / 2 - 2, y + hourHeight / 2 + 3);
      });

      rowIdx++;
    });
  });

  const legendY = canvasHeight - margin - 8;
  ctx.font = '9px DM Sans, sans-serif';
  ctx.textAlign = 'left';

  const legends = [
    { bg: '#D8F3DC', fg: '#2D6A4F', label: 'Disponível' },
    { bg: '#FDE8DF', fg: '#C1440E', label: 'Bloqueado' },
    { bg: '#EAE9F7', fg: '#5B5EA6', label: 'Agendado' }
  ];

  let lx = margin;
  legends.forEach(l => {
    ctx.fillStyle = l.bg;
    ctx.fillRect(lx, legendY - 8, 12, 12);
    ctx.fillStyle = l.fg;
    ctx.fillText(l.label, lx + 16, legendY + 2);
    lx += 90;
  });

  return canvas;
}
