'use client';

/**
 * MinhaAgendaPage.tsx
 * Página exclusiva do professor: visualiza a própria agenda semanal.
 * Renderiza o TeacherPanel já configurado para o professor logado
 * (ele detecta automaticamente pelo user.role === 'teacher').
 */

import { TeacherPanel } from '@/components/TeacherPanel';

export function MinhaAgendaPage() {
  // TeacherPanel já detecta o professor logado quando role === 'teacher'
  // via: const myTeacher = data.teachers?.find(t => t.name === user.name)
  return <TeacherPanel />;
}
