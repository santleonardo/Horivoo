'use client';

/**
 * StudentPanel.tsx — COMPONENTE LEGADO (não utilizado na navegação principal)
 *
 * Mantido apenas para compatibilidade. A tela do aluno é gerenciada por:
 * - MinhasAulasPage (Minhas Aulas)
 * - CalendarioPage (Calendário)
 * - ProvasPage (Provas)
 * - FaltasPage (Faltas)
 * - MessagesPage (Mensagens)
 * - PerfilPage (Perfil)
 *
 * REGRA DE NEGÓCIO: Alunos não podem criar agendamentos.
 * Todo agendamento é exclusivo do coordenador.
 */

export function StudentPanel() {
  return (
    <div className="p-8 text-center text-muted-foreground">
      <p className="text-sm">Componente legado. Use a navegação principal.</p>
    </div>
  );
}
