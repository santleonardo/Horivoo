'use client'

import { Bell, PanelLeft } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { useSidebar } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const pageTitles: Record<string, string> = {
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

export function Header() {
  const { user, activePage } = useAppStore()
  const { toggleSidebar } = useSidebar()

  const title = pageTitles[activePage] || 'Horivoo'

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 md:hidden"
        onClick={toggleSidebar}
      >
        <PanelLeft className="h-4 w-4" />
        <span className="sr-only">Alternar menu</span>
      </Button>

      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 relative text-muted-foreground hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        <span className="sr-only">Notificações</span>
      </Button>

      <Separator orientation="vertical" className="h-6" />

      <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">
        {user?.name}
      </span>
    </header>
  )
}
