/**
 * student.ts — Lógica da agenda do aluno
 */
import { getTeachers, getBlockedSlots, getBookings, createBooking } from './api.js';
import { renderWeekGrid, toast, openBookingModal } from './ui.js';
let currentTeacherId = null;
let currentTeacherName = '';
let blockedSlots = [];
let bookings = [];
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
        if (!select)
            return;
        select.innerHTML = teachers.map(t => `<option value="${t.id}" data-name="${t.name}">${t.name}</option>`).join('');
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
    }
    catch (err) {
        console.error(err);
        toast('Erro ao carregar professores. Verifique a configuração.', 'error');
    }
}
// ================================================================
// CARREGA HORÁRIOS DISPONÍVEIS
// ================================================================
async function loadStudentData(teacherId) {
    currentTeacherId = teacherId;
    const gridEl = document.getElementById('week-grid-student');
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
    }
    catch (err) {
        console.error(err);
        toast('Erro ao carregar horários.', 'error');
    }
}
// ================================================================
// RENDERIZA GRADE DO ALUNO
// ================================================================
function renderStudentGrid() {
    renderWeekGrid('week-grid-student', blockedSlots, bookings, 'student', {
        onSlotClick: handleSlotSelect
    });
    // Conta horários disponíveis
    const container = document.getElementById('week-grid-student');
    if (container) {
        const freeSlots = container.querySelectorAll('.student-available').length;
        const countEl = document.getElementById('available-count');
        if (countEl) {
            countEl.textContent = freeSlots.toString();
            countEl.className = freeSlots > 0 ? 'badge badge-success' : 'badge badge-danger';
        }
    }
}
// ================================================================
// SELECIONA UM SLOT PARA AGENDAR
// ================================================================
function handleSlotSelect({ day, dayFull, hour, status }) {
    // Ignorar cliques em slots ocupados
    if (status === 'booked' || status === 'blocked')
        return;
    // Verifica (novamente) se ainda está disponível (proteção contra race condition)
    const alreadyBooked = bookings.some(b => b.day === day && b.hour === hour);
    const alreadyBlocked = blockedSlots.some(s => s.day === day && s.hour === hour);
    if (alreadyBooked || alreadyBlocked) {
        toast('Este horário acabou de ser ocupado. Escolha outro.', 'error');
        if (currentTeacherId)
            loadStudentData(currentTeacherId);
        return;
    }
    openBookingModal({ day, dayFull, hour, teacherName: currentTeacherName }, ({ studentName, studentEmail, hour: customHour }) => confirmBooking(day, customHour, studentName, studentEmail));
}
// ================================================================
// CONFIRMA O AGENDAMENTO
// ================================================================
async function confirmBooking(day, hour, studentName, studentEmail) {
    try {
        // Verificar se o horário customizado já está ocupado
        const alreadyBooked = bookings.some(b => b.day === day && b.hour === hour);
        const alreadyBlocked = blockedSlots.some(s => s.day === day && s.hour === hour);
        if (alreadyBooked || alreadyBlocked) {
            toast('Este horário já está ocupado. Escolha outro.', 'error');
            if (currentTeacherId)
                loadStudentData(currentTeacherId);
            return;
        }
        const result = await createBooking({
            teacher_id: currentTeacherId,
            student_name: studentName,
            student_email: studentEmail || null,
            day,
            hour
        });
        const newBooking = Array.isArray(result) ? result[0] : result;
        bookings.push(newBooking);
        renderStudentGrid();
        toast(`Agendado com sucesso! ${day.charAt(0).toUpperCase() + day.slice(1)} às ${hour}.`, 'success');
    }
    catch (err) {
        console.error(err);
        const errMsg = err.message || '';
        if (errMsg.includes('duplicate') || errMsg.includes('unique')) {
            toast('Horário já foi preenchido. Escolha outro.', 'error');
            if (currentTeacherId)
                loadStudentData(currentTeacherId);
        }
        else {
            toast('Erro ao agendar. Tente novamente.', 'error');
        }
    }
}
//# sourceMappingURL=student.js.map