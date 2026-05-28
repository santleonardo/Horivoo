'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { LoginForm } from '@/components/LoginForm';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardPage } from '@/components/pages/DashboardPage';
import { ProfessoresPage } from '@/components/pages/ProfessoresPage';
import { AlunosPage } from '@/components/pages/AlunosPage';
import { AgendaPage } from '@/components/pages/AgendaPage';
import { CalendarioPage } from '@/components/pages/CalendarioPage';
import { FeriadosPage } from '@/components/pages/FeriadosPage';
import { RecessosPage } from '@/components/pages/RecessosPage';
import { AgendamentosPage } from '@/components/pages/AgendamentosPage';
import { RelatoriosPage } from '@/components/pages/RelatoriosPage';
import { ExportarPage } from '@/components/pages/ExportarPage';
import { ConfiguracoesPage } from '@/components/pages/ConfiguracoesPage';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { PageKey } from '@/lib/store';

const pageLabels: Record<PageKey, string> = {
  dashboard: 'Dashboard',
  professores: 'Professores',
  alunos: 'Alunos',
  agenda: 'Agenda',
  calendario: 'Calendário',
  feriados: 'Feriados',
  recessos: 'Recessos',
  agendamentos: 'Agendamentos',
  relatorios: 'Relatórios',
  exportar: 'Exportar',
  configuracoes: 'Configurações',
};

const pageComponents: Record<PageKey, React.ComponentType> = {
  dashboard: DashboardPage,
  professores: ProfessoresPage,
  alunos: AlunosPage,
  agenda: AgendaPage,
  calendario: CalendarioPage,
  feriados: FeriadosPage,
  recessos: RecessosPage,
  agendamentos: AgendamentosPage,
  relatorios: RelatoriosPage,
  exportar: ExportarPage,
  configuracoes: ConfiguracoesPage,
};

export default function Home() {
  const { user, loading, checkAuth, activePage } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50/30">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-xl animate-pulse">
            H
          </div>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  const PageComponent = pageComponents[activePage] || DashboardPage;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 bg-white">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h2 className="text-sm font-medium text-muted-foreground">
            {pageLabels[activePage]}
          </h2>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-gray-50/50">
          <PageComponent />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
