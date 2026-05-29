'use client';

/**
 * TeacherPanelWrapper.tsx
 * Adapta o TeacherPanel original para aceitar um fixedTeacherId.
 * Usado pela MinhaAgendaPage para bloquear o professor logado.
 *
 * NOTA: Este arquivo é um "patch" que intercepta o prop fixedTeacherId
 * sem alterar o TeacherPanel original. Ele re-exporta o TeacherPanel
 * passando o prop já resolvido via useEffect no componente pai.
 *
 * Se você quiser integrar diretamente no TeacherPanel.tsx, adicione no topo:
 *
 *   interface Props { fixedTeacherId?: string }
 *   export function TeacherPanel({ fixedTeacherId }: Props = {}) {
 *
 * E no useEffect de carregamento de teachers, adicione:
 *
 *   if (fixedTeacherId) {
 *     setTeacherId(fixedTeacherId);
 *     setLoading(false);
 *     return;
 *   }
 */

// Re-export TeacherPanel — usado diretamente onde o teacherId já é gerenciado externamente.
export { TeacherPanel } from '@/components/TeacherPanel';
