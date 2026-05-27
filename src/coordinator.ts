/**
 * coordinator.ts — Painel do Coordenador
 * Consulta, edita, bloqueia, remove e compartilha horários de todos os professores
 */

import { getTeachers, getBlockedSlots, getBookings, blockSlot, unblockSlot, createBooking, cancelBooking } from './api.js';
import { renderWeekGrid, toast, calcStats, closeModal } from './ui.js';
import { SCHEDULE, DAYS, TOTAL_SLOTS } from './config.js';
import type {
  Teacher,
  BlockedSlot,
  Booking,
  SlotClickInfo,
  CoordFilterType,
  CoordTableItem
} from './types.js';

let teachers: Teacher[] = [];
let currentTeacherId: string | null = null;
let currentTeacherName: string = '';
let blockedSlots: BlockedSlot[] = [];
let bookingsList: Booking[] = [];
let searchFilter: string = '';
let filterType: CoordFilterType = 'all';

// ================================================================
// INICIALIZAÇÃO
// ================================================================

export async function initCoordinatorPanel(): Promise<void> {
  try {
    teachers = await getTeachers();

    if (teachers.length === 0) {
      document.getElementById('coordinator-panel')!.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <p>Nenhum professor cadastrado.</p>
        </div>`;
      return;
    }

    const select: HTMLSelectElement | null = document.getElementById('coord-teacher-select') as HTMLSelectElement | null;
    if (!select) return;

    select.innerHTML = `<option value="__all__">Todos os professores</option>` +
      teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

    const updateTeacher = (): void => {
      const val: string = select.value;
      if (val === '__all__') {
        currentTeacherId = null;
        currentTeacherName = 'Todos';
      } else {
        currentTeacherId = val;
        const opt: HTMLOptionElement | null = select.options[select.selectedIndex] as HTMLOptionElement | null;
        currentTeacherName = opt?.textContent || '';
      }
    };

    updateTeacher();

    select.addEventListener('change', () => {
      updateTeacher();
      loadCoordinatorData();
    });

    // Barra de pesquisa
    const searchInput: HTMLInputElement | null = document.getElementById('coord-search') as HTMLInputElement | null;
    searchInput?.addEventListener('input', (e: Event) => {
      searchFilter = (e.target as HTMLInputElement).value.trim().toLowerCase();
      renderCoordinatorGrid();
      renderCoordinatorTable();
    });

    // Filtro tipo
    document.querySelectorAll('.coord-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.coord-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filterType = (btn as HTMLElement).dataset.filter as CoordFilterType;
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

async function loadCoordinatorData(): Promise<void> {
  const gridEl: HTMLElement | null = document.getElementById('coord-week-grid');
  if (gridEl) {
    gridEl.innerHTML = `<div class="loading-overlay"><div class="spinner"></div><span>Carregando horários...</span></div>`;
  }

  try {
    if (currentTeacherId) {
      [blockedSlots, bookingsList] = await Promise.all([
        getBlockedSlots(currentTeacherId),
        getBookings(currentTeacherId)
      ]);
    } else {
      // Carregar de todos os professores
      const allBlocked: BlockedSlot[] = [];
      const allBooked: Booking[]  = [];
      for (const t of teachers) {
        const [b, bk] = await Promise.all([
          getBlockedSlots(t.id),
          getBookings(t.id)
        ]);
        b.forEach(s => { s.teacher_name = t.name; s.teacher_id = t.id; allBlocked.push(s); });
        bk.forEach(s => { s.teacher_name = t.name; s.teacher_id = t.id; allBooked.push(s); });
      }
      blockedSlots = allBlocked;
      bookingsList = allBooked;
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
// RENDERIZAR GRADE (visão semanal por professor)
// ================================================================

function renderCoordinatorGrid(): void {
  renderWeekGrid(
    'coord-week-grid',
    blockedSlots,
    bookingsList,
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

function renderCoordinatorStats(): void {
  const totalFree: number    = Math.max(0, TOTAL_SLOTS * (currentTeacherId ? 1 : teachers.length) - blockedSlots.length - bookingsList.length);
  const totalBlocked: number = blockedSlots.length;
  const totalBooked: number  = bookingsList.length;

  const el: HTMLElement | null = document.getElementById('coord-stats');
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

function renderCoordinatorTable(): void {
  const container: HTMLElement | null = document.getElementById('coord-table-body');
  if (!container) return;

  // Montar lista combinada
  const items: CoordTableItem[] = [];

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

  bookingsList.forEach(b => {
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

  // Filtrar
  const filtered: CoordTableItem[] = items.filter(item => {
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

  // Ordenar
  const dayOrder: string[] = ['segunda','terca','quarta','quinta','sexta','sabado','domingo'];
  filtered.sort((a, b) => {
    const tc: number = a.teacher_name.localeCompare(b.teacher_name);
    if (tc !== 0) return tc;
    const dc: number = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
    if (dc !== 0) return dc;
    return a.hour.localeCompare(b.hour);
  });

  if (filtered.length === 0) {
    container.innerHTML = `<tr><td colspan="6" class="empty-state" style="padding:32px 0">Nenhum resultado encontrado.</td></tr>`;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const typeBadge: string = item.type === 'blocked'
      ? '<span class="badge badge-danger">Bloqueado</span>'
      : '<span class="badge badge-booked">Agendado</span>';

    const dayLabel: string = item.day.charAt(0).toUpperCase() + item.day.slice(1);

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

  // Bind ações
  container.querySelectorAll('.coord-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row: HTMLElement = btn.closest('tr') as HTMLElement;
      const ds: DOMStringMap = row.dataset;
      openEditModal({
        type: ds.type || 'available',
        id: ds.id || '',
        teacherId: ds.teacherId || '',
        teacherName: ds.teacherName || currentTeacherName,
        day: ds.day || '',
        hour: ds.hour || ''
      });
    });
  });

  container.querySelectorAll('.coord-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row: HTMLElement = btn.closest('tr') as HTMLElement;
      const ds: DOMStringMap = row.dataset;
      handleDelete({
        type: ds.type || '',
        id: ds.id || '',
        teacherId: ds.teacherId || '',
        teacherName: ds.teacherName || '',
        day: ds.day || '',
        hour: ds.hour || ''
      });
    });
  });
}

// ================================================================
// CLIQUE EM SLOT DA GRADE
// ================================================================

function handleCoordSlotClick({ day, hour, status, id, teacherId, teacherName }: SlotClickInfo): void {
  const tid: string | null = teacherId || currentTeacherId;
  const tname: string = teacherName || currentTeacherName;

  openEditModal({
    type: status === 'available' ? 'available' : status,
    id: id || '',
    teacherId: tid || '',
    teacherName: tname,
    day,
    hour
  });
}

// ================================================================
// MODAL DE EDIÇÃO
// ================================================================

interface EditModalData {
  type: string;
  id: string;
  teacherId: string;
  teacherName: string;
  day: string;
  hour: string;
}

function openEditModal(data: EditModalData): void {
  const overlay: HTMLElement | null = document.getElementById('coord-edit-overlay');
  const title: HTMLElement | null   = document.getElementById('coord-edit-title');
  const info: HTMLElement | null    = document.getElementById('coord-edit-info');

  const dayLabel: string = (data.day || '').charAt(0).toUpperCase() + (data.day || '').slice(1);
  const tname: string = data.teacherName || 'Professor';

  if (title) title.textContent = data.type === 'available' ? 'Adicionar horário' : 'Editar horário';
  if (info) info.textContent = `${tname} — ${dayLabel} às ${data.hour}`;

  // Campos
  const teacherInput: HTMLInputElement | null = document.getElementById('coord-edit-teacher') as HTMLInputElement | null;
  const dayInput: HTMLInputElement | null = document.getElementById('coord-edit-day') as HTMLInputElement | null;

  if (teacherInput) teacherInput.value = data.teacherId || '';
  if (dayInput) dayInput.value = data.day || '';

  const hourInput: HTMLInputElement | null = document.getElementById('coord-edit-hour') as HTMLInputElement | null;
  if (hourInput) hourInput.value = data.hour || '';

  const studentNameInput: HTMLInputElement | null = document.getElementById('coord-edit-student-name') as HTMLInputElement | null;
  const studentEmailInput: HTMLInputElement | null = document.getElementById('coord-edit-student-email') as HTMLInputElement | null;
  if (studentNameInput) studentNameInput.value = '';
  if (studentEmailInput) studentEmailInput.value = '';

  const studentFields: HTMLElement | null = document.getElementById('coord-edit-student-fields');
  const actionBtns: HTMLElement | null = document.getElementById('coord-edit-actions');

  if (data.type === 'booked') {
    const booking: Booking | undefined = bookingsList.find(b => b.id === data.id);
    if (booking && studentNameInput) studentNameInput.value = booking.student_name || '';
    if (booking && studentEmailInput) studentEmailInput.value = booking.student_email || '';
    if (studentFields) studentFields.style.display = '';
    if (actionBtns) actionBtns.innerHTML = `
      <button class="btn btn-success" id="coord-save-btn" style="flex:1">Salvar</button>
      <button class="btn btn-outline" id="coord-unbook-btn">Cancelar agendamento</button>
      <button class="btn btn-outline" id="coord-cancel-btn">Fechar</button>
    `;
  } else if (data.type === 'blocked') {
    if (studentFields) studentFields.style.display = 'none';
    if (actionBtns) actionBtns.innerHTML = `
      <button class="btn btn-success" id="coord-save-btn" style="flex:1">Salvar</button>
      <button class="btn btn-outline" id="coord-unblock-btn">Desbloquear</button>
      <button class="btn btn-outline" id="coord-cancel-btn">Fechar</button>
    `;
  } else {
    if (studentFields) studentFields.style.display = '';
    if (actionBtns) actionBtns.innerHTML = `
      <button class="btn btn-success" id="coord-save-btn" style="flex:1">Salvar agendamento</button>
      <button class="btn btn-danger" id="coord-block-btn">Bloquear horário</button>
      <button class="btn btn-outline" id="coord-cancel-btn">Fechar</button>
    `;
  }

  overlay?.classList.add('open');

  document.getElementById('coord-cancel-btn')?.addEventListener('click', () => {
    overlay?.classList.remove('open');
  });

  document.getElementById('coord-save-btn')?.addEventListener('click', async () => {
    await handleSave(data);
    overlay?.classList.remove('open');
  });

  document.getElementById('coord-unblock-btn')?.addEventListener('click', async () => {
    await handleUnblock(data);
    overlay?.classList.remove('open');
  });

  document.getElementById('coord-unbook-btn')?.addEventListener('click', async () => {
    await handleCancelBooking(data);
    overlay?.classList.remove('open');
  });

  document.getElementById('coord-block-btn')?.addEventListener('click', async () => {
    await handleBlock(data);
    overlay?.classList.remove('open');
  });

  if (overlay) {
    overlay.onclick = (e: MouseEvent) => { if (e.target === overlay) overlay.classList.remove('open'); };
  }
}

// ================================================================
// AÇÕES DO COORDENADOR
// ================================================================

async function handleSave(data: EditModalData): Promise<void> {
  const teacherId: string   = data.teacherId || (document.getElementById('coord-edit-teacher') as HTMLInputElement)?.value || '';
  const day: string         = (document.getElementById('coord-edit-day') as HTMLInputElement)?.value || '';
  const hour: string        = (document.getElementById('coord-edit-hour') as HTMLInputElement)?.value || '';
  const studentName: string = (document.getElementById('coord-edit-student-name') as HTMLInputElement)?.value.trim() || '';
  const studentEmail: string = (document.getElementById('coord-edit-student-email') as HTMLInputElement)?.value.trim() || '';

  if (!hour) {
    toast('Informe o horário.', 'error');
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
      toast('Erro ao atualizar: ' + (err as Error).message, 'error');
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
      toast('Erro ao agendar: ' + (err as Error).message, 'error');
    }
  } else if (data.type === 'blocked') {
    toast('Horário já está bloqueado.', 'info');
  }
}

async function handleBlock(data: EditModalData): Promise<void> {
  const teacherId: string | null = data.teacherId || currentTeacherId;
  const hour: string = (document.getElementById('coord-edit-hour') as HTMLInputElement)?.value || '';

  if (!hour) {
    toast('Informe o horário.', 'error');
    return;
  }

  try {
    await blockSlot(teacherId!, data.day, hour);
    toast('Horário bloqueado!', 'success');
    await loadCoordinatorData();
  } catch (err) {
    toast('Erro ao bloquear: ' + (err as Error).message, 'error');
  }
}

async function handleUnblock(data: EditModalData): Promise<void> {
  try {
    await unblockSlot(data.id);
    toast('Horário desbloqueado!', 'success');
    await loadCoordinatorData();
  } catch (err) {
    toast('Erro ao desbloquear: ' + (err as Error).message, 'error');
  }
}

async function handleCancelBooking(data: EditModalData): Promise<void> {
  if (!confirm('Cancelar este agendamento?')) return;
  try {
    await cancelBooking(data.id);
    toast('Agendamento cancelado!', 'success');
    await loadCoordinatorData();
  } catch (err) {
    toast('Erro ao cancelar: ' + (err as Error).message, 'error');
  }
}

async function handleDelete(data: EditModalData): Promise<void> {
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
    toast('Erro ao remover: ' + (err as Error).message, 'error');
  }
}

// ================================================================
// COMPARTILHAR COMO IMAGEM
// ================================================================

async function shareSchedule(): Promise<void> {
  toast('Gerando imagem...', 'info', 2000);

  try {
    const gridEl: HTMLElement | null = document.getElementById('coord-week-grid');
    if (!gridEl) {
      toast('Grade não encontrada.', 'error');
      return;
    }

    const canvas: HTMLCanvasElement = await htmlToCanvas(gridEl);

    canvas.toBlob(async (blob: Blob | null) => {
      if (!blob) {
        toast('Erro ao gerar imagem.', 'error');
        return;
      }

      // Tentar Web Share API (mobile)
      if (navigator.share && navigator.canShare) {
        try {
          const file: File = new File([blob], 'horivoo-grade.png', { type: 'image/png' });
          const shareData: ShareData = { files: [file], title: 'Horivoo - Grade de Horários' };

          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return;
          }
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
        }
      }

      // Fallback: download direto
      const url: string = URL.createObjectURL(blob);
      const a: HTMLAnchorElement = document.createElement('a');
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
// HTML → CANVAS (renderização manual)
// ================================================================

async function htmlToCanvas(_gridEl: HTMLElement): Promise<HTMLCanvasElement> {
  const canvas: HTMLCanvasElement = document.createElement('canvas');
  const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Não foi possível obter contexto 2D do canvas');
  }

  // Dimensões
  const dayWidth: number = 140;
  const hourHeight: number = 28;
  const headerHeight: number = 50;
  const teacherHeaderHeight: number = 32;
  const margin: number = 20;

  // Contar horas dinamicamente
  const allHoursSet: Set<string> = new Set();
  blockedSlots.forEach(s => allHoursSet.add(s.hour));
  bookingsList.forEach(b => allHoursSet.add(b.hour));
  Object.values(SCHEDULE).forEach(p => p.hours.forEach(h => allHoursSet.add(h)));
  const totalHours: number = allHoursSet.size;

  const canvasWidth: number = margin * 2 + DAYS.length * dayWidth;
  const canvasHeight: number = margin + headerHeight + teacherHeaderHeight + totalHours * hourHeight + margin;

  canvas.width = canvasWidth * 2;
  canvas.height = canvasHeight * 2;
  ctx.scale(2, 2);

  // Fundo
  ctx.fillStyle = '#F7F5F0';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Título
  ctx.fillStyle = '#1A1714';
  ctx.font = 'bold 16px DM Sans, sans-serif';
  ctx.fillText(`Horivoo — Grade de Horários${currentTeacherName !== 'Todos' ? ' — ' + currentTeacherName : ''}`, margin, margin + 16);

  // Data
  ctx.fillStyle = '#8A8178';
  ctx.font = '11px DM Sans, sans-serif';
  ctx.fillText(new Date().toLocaleDateString('pt-BR'), margin, margin + 32);

  // Cabeçalhos dos dias
  ctx.font = 'bold 11px DM Sans, sans-serif';
  DAYS.forEach((day, i) => {
    const x: number = margin + i * dayWidth;
    const y: number = margin + headerHeight;

    ctx.fillStyle = '#F0EDE7';
    ctx.fillRect(x, y, dayWidth - 4, teacherHeaderHeight);
    ctx.fillStyle = '#1A1714';
    ctx.textAlign = 'center';
    ctx.fillText(day.full, x + dayWidth / 2 - 2, y + 20);
  });

  // Slots — ordenar horas cronologicamente
  const sortedHours: string[] = [...allHoursSet].sort((a, b) => {
    const [ah, am]: number[] = a.split(':').map(Number);
    const [bh, bm]: number[] = b.split(':').map(Number);
    return (ah * 60 + am) - (bh * 60 + bm);
  });

  const blockedMap: Record<string, BlockedSlot> = {};
  const bookedMap: Record<string, Booking> = {};
  blockedSlots.forEach(s => { blockedMap[`${s.teacher_name || currentTeacherName}:${s.day}:${s.hour}`] = s; });
  bookingsList.forEach(b => { bookedMap[`${b.teacher_name || currentTeacherName}:${b.day}:${b.hour}`] = b; });

  ctx.textAlign = 'center';
  ctx.font = '10px DM Sans, sans-serif';

  sortedHours.forEach((hour, rowIdx) => {
    const y: number = margin + headerHeight + teacherHeaderHeight + rowIdx * hourHeight;

    DAYS.forEach((day, i) => {
      const x: number = margin + i * dayWidth;
      const key: string = `${currentTeacherName}:${day.key}:${hour}`;
      const isBlocked: boolean = key in blockedMap;
      const isBooked: boolean = key in bookedMap;

      let bg: string, fg: string, label: string;

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
  });

  // Legenda
  const legendY: number = canvasHeight - margin - 8;
  ctx.font = '9px DM Sans, sans-serif';
  ctx.textAlign = 'left';

  const legends: Array<{ bg: string; fg: string; label: string }> = [
    { bg: '#D8F3DC', fg: '#2D6A4F', label: 'Disponível' },
    { bg: '#FDE8DF', fg: '#C1440E', label: 'Bloqueado' },
    { bg: '#EAE9F7', fg: '#5B5EA6', label: 'Agendado' }
  ];

  let lx: number = margin;
  legends.forEach(l => {
    ctx.fillStyle = l.bg;
    ctx.fillRect(lx, legendY - 8, 12, 12);
    ctx.fillStyle = l.fg;
    ctx.fillText(l.label, lx + 16, legendY + 2);
    lx += 90;
  });

  return canvas;
}
