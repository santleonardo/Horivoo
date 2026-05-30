'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/AppSidebar'
import { Header } from '@/components/Header'
import { LoginForm } from '@/components/LoginForm'
import DashboardPage from '@/components/pages/DashboardPage'
import ProfessoresPage from '@/components/pages/ProfessoresPage'
import AlunosPage from '@/components/pages/AlunosPage'
import AgendaPage from '@/components/pages/AgendaPage'
import TurmasPage from '@/components/pages/TurmasPage'
import ProvasPage from '@/components/pages/ProvasPage'
import ReposicoesPage from '@/components/pages/ReposicoesPage'
import CalendarioPage from '@/components/pages/CalendarioPage'
import FeriadosPage from '@/components/pages/FeriadosPage'
import RecessosPage from '@/components/pages/RecessosPage'
import { MinhaAgendaPage } from '@/components/pages/MinhaAgendaPage'
import { DisponibilidadePage } from '@/components/pages/DisponibilidadePage'
import { MinhasAulasPage } from '@/components/pages/MinhasAulasPage'
import { MessagesPage } from '@/components/pages/MessagesPage'
import { PerfilPage } from '@/components/pages/PerfilPage'
import { RelatoriosPage } from '@/components/pages/RelatoriosPage'
import { ExportarPage } from '@/components/pages/ExportarPage'
import { ConfiguracoesPage } from '@/components/pages/ConfiguracoesPage'

// Page title map for placeholder pages
const pageLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  agenda: 'Agenda',
  professores: 'Professores',
  alunos: 'Alunos',
  turmas: 'Turmas',
  provas: 'Provas',
  reposicoes: 'Reposições',
  calendario: 'Calendário',
  feriados: 'Feriados',
  recessos: 'Recessos',
  mensagens: 'Mensagens',
  relatorios: 'Relatórios',
  exportar: 'Exportar',
  configuracoes: 'Configurações',
  'minha-agenda': 'Minha Agenda',
  disponibilidade: 'Disponibilidade',
  'minhas-aulas': 'Minhas Aulas',
  perfil: 'Perfil',
}

const pageIcons: Record<string, string> = {
  dashboard: '📊',
  agenda: '📅',
  professores: '🎓',
  alunos: '👥',
  turmas: '🏫',
  provas: '📝',
  reposicoes: '🔄',
  calendario: '🗓️',
  feriados: '🚩',
  recessos: '☕',
  mensagens: '💬',
  relatorios: '📈',
  exportar: '⬇️',
  configuracoes: '⚙️',
  'minha-agenda': '📅',
  disponibilidade: '🕐',
  'minhas-aulas': '📖',
  perfil: '👤',
}

function PlaceholderPage({ pageKey }: { pageKey: string }) {
  const label = pageLabels[pageKey] || pageKey
  const icon = pageIcons[pageKey] || '📄'

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-6xl">{icon}</div>
        <h2 className="text-2xl font-bold tracking-tight">{label}</h2>
        <p className="text-muted-foreground">
          Esta página será implementada em breve.
        </p>
        <div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          Em desenvolvimento
        </div>
      </div>
    </div>
  )
}

function PageRenderer({ pageKey }: { pageKey: string }) {
  switch (pageKey) {
    case 'dashboard':
      return <DashboardPage />
    case 'agenda':
      return <AgendaPage />
    case 'professores':
      return <ProfessoresPage />
    case 'alunos':
      return <AlunosPage />
    case 'turmas':
      return <TurmasPage />
    case 'provas':
      return <ProvasPage />
    case 'reposicoes':
      return <ReposicoesPage />
    case 'calendario':
      return <CalendarioPage />
    case 'feriados':
      return <FeriadosPage />
    case 'recessos':
      return <RecessosPage />
    case 'mensagens':
      return <MessagesPage />
    case 'relatorios':
      return <RelatoriosPage />
    case 'exportar':
      return <ExportarPage />
    case 'configuracoes':
      return <ConfiguracoesPage />
    case 'minha-agenda':
      return <MinhaAgendaPage />
    case 'disponibilidade':
      return <DisponibilidadePage />
    case 'minhas-aulas':
      return <MinhasAulasPage />
    case 'perfil':
      return <PerfilPage />
    default:
      return <PlaceholderPage pageKey={pageKey} />
  }
}

export default function Home() {
  const { user, loading, activePage, checkAuth } = useAppStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center animate-pulse">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
          </div>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <PageRenderer pageKey={activePage} />
      </SidebarInset>
    </SidebarProvider>
  )
}
