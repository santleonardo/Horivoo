'use client';

/**
 * page.tsx — Roteador principal com role guard.
 * activePage é validado contra as páginas permitidas para o papel do usuário.
 * Manipulação de store no cliente não concede acesso a páginas de outro papel.
 */

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { LoginForm }    from '@/components/LoginForm';
import { AppSidebar }   from '@/components/AppSidebar';

import { DashboardPage }    from '@/components/pages/DashboardPage';
import { ProfessoresPage }  from '@/components/pages/ProfessoresPage';
import { AlunosPage }       from '@/components/pages/AlunosPage';
import { AgendaPage }       from '@/components/pages/AgendaPage';
import { TurmasPage }       from '@/components/pages/TurmasPage';
import { ProvasPage }       from '@/components/pages/ProvasPage';
import { FaltasPage }       from '@/components/pages/FaltasPage';
import { CalendarioPage }   from '@/components/pages/CalendarioPage';
import { FeriadosPage }     from '@/components/pages/FeriadosPage';
import { RecessosPage }     from '@/components/pages/RecessosPage';
import { AgendamentosPage } from '@/components/pages/AgendamentosPage';
import { ReposicoesPage }   from '@/components/pages/ReposicoesPage';
import { RelatoriosPage }   from '@/components/pages/RelatoriosPage';
import { ExportarPage }     from '@/components/pages/ExportarPage';
import { ConfiguracoesPage } from '@/components/pages/ConfiguracoesPage';
import { MessagesPage }     from '@/components/pages/MessagesPage';
import { PerfilPage }       from '@/components/pages/PerfilPage';
import { MinhaAgendaPage }  from '@/components/pages/MinhaAgendaPage';
import { DisponibilidadePage } from '@/components/pages/DisponibilidadePage';
import { MinhasAulasPage }  from '@/components/pages/MinhasAulasPage';

import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { type PageKey } from '@/lib/store';

const pageLabels: Record<PageKey, string> = {
  dashboard: 'Dashboard', professores: 'Professores', alunos: 'Alunos',
  agenda: 'Agenda', turmas: 'Turmas', provas: 'Provas', faltas: 'Faltas',
  calendario: 'Calendário', feriados: 'Feriados', recessos: 'Recessos',
  agendamentos: 'Agendamentos', reposicoes: 'Reposições', relatorios: 'Relatórios',
  exportar: 'Exportar', configuracoes: 'Configurações',
  mensagens: 'Mensagens', perfil: 'Perfil',
  'minha-agenda': 'Minha Agenda', disponibilidade: 'Disponibilidade',
  'minhas-aulas': 'Minhas Aulas',
};

const pageComponents: Record<PageKey, React.ComponentType> = {
  dashboard: DashboardPage, professores: ProfessoresPage, alunos: AlunosPage,
  agenda: AgendaPage, turmas: TurmasPage, provas: ProvasPage, faltas: FaltasPage,
  calendario: CalendarioPage, feriados: FeriadosPage, recessos: RecessosPage,
  agendamentos: AgendamentosPage, reposicoes: ReposicoesPage, relatorios: RelatoriosPage,
  exportar: ExportarPage, configuracoes: ConfiguracoesPage,
  mensagens: MessagesPage, perfil: PerfilPage,
  'minha-agenda': MinhaAgendaPage, disponibilidade: DisponibilidadePage,
  'minhas-aulas': MinhasAulasPage,
};

const shared: PageKey[] = ['mensagens', 'perfil'];

const allowedPages: Record<string, PageKey[]> = {
  coordinator: [
    'dashboard', 'professores', 'alunos', 'agenda', 'turmas', 'provas', 'faltas',
    'calendario', 'feriados', 'recessos', 'agendamentos', 'reposicoes', 'relatorios',
    'exportar', 'configuracoes', ...shared,
  ],
  teacher: ['minha-agenda', 'disponibilidade', 'turmas', 'calendario', 'provas', 'faltas', ...shared],
  student: ['calendario', 'minhas-aulas', 'provas', 'faltas', ...shared],
};

const defaultPage: Record<string, PageKey> = {
  coordinator: 'dashboard',
  teacher:     'minha-agenda',
  student:     'minhas-aulas',
};

export default function Home() {
  const { user, loading, checkAuth, activePage, setActivePage } = useAuthStore();

  useEffect(() => { checkAuth(); }, [checkAuth]);

  // Role guard: redireciona para página padrão se activePage não for permitida
  useEffect(() => {
    if (!user) return;
    const permitted = allowedPages[user.role] ?? [];
    if (!permitted.includes(activePage)) {
      setActivePage(defaultPage[user.role] ?? 'mensagens');
    }
  }, [user, activePage, setActivePage]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50/30">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-xl animate-pulse">H</div>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600" />
        </div>
      </div>
    );
  }

  if (!user) return <LoginForm />;

  // Double-check: segurança na camada de renderização
  const permitted  = allowedPages[user.role] ?? [];
  const safePage   = permitted.includes(activePage) ? activePage : (defaultPage[user.role] ?? 'mensagens') as PageKey;
  const PageComponent = pageComponents[safePage] ?? DashboardPage;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 bg-white">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h2 className="text-sm font-medium text-muted-foreground">{pageLabels[safePage] ?? safePage}</h2>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-gray-50/50">
          <PageComponent />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
