'use client';

/**
 * TeacherPanel.tsx — COMPONENTE LEGADO (não utilizado na navegação principal)
 *
 * Mantido apenas para compatibilidade. A tela do professor é gerenciada por:
 * - MinhaAgendaPage (Minha Agenda — somente leitura)
 * - DisponibilidadePage (Disponibilidade — gerenciamento de horários)
 * - TurmasPage (Turmas)
 * - CalendarioPage (Calendário)
 * - FaltasPage (Faltas)
 * - MessagesPage (Mensagens)
 * - PerfilPage (Perfil)
 *
 * REGRA DE NEGÓCIO: Professores não podem criar agendamentos,
 * recorrências, reposições ou cancelar aulas.
 * Apenas o coordenador realiza essas operações.
 */

export function TeacherPanel() {
  return (
    <div className="p-8 text-center text-muted-foreground">
      <p className="text-sm">Componente legado. Use a navegação principal.</p>
    </div>
  );
}
