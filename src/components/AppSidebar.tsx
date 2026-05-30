'use client'

import {
  LayoutDashboard,
  CalendarPlus,
  GraduationCap,
  Users,
  School,
  FileText,
  RotateCcw,
  Calendar,
  Flag,
  Coffee,
  MessageSquare,
  BarChart3,
  Download,
  Settings,
  CalendarDays,
  Clock,
  BookOpen,
  User,
  LogOut,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type NavItem = {
  label: string
  page: string
  icon: React.ComponentType<{ className?: string }>
}

const coordinatorNav: NavItem[] = [
  { label: 'Dashboard', page: 'dashboard', icon: LayoutDashboard },
  { label: 'Agenda', page: 'agenda', icon: CalendarPlus },
  { label: 'Professores', page: 'professores', icon: GraduationCap },
  { label: 'Alunos', page: 'alunos', icon: Users },
  { label: 'Turmas', page: 'turmas', icon: School },
  { label: 'Provas', page: 'provas', icon: FileText },
  { label: 'Reposições', page: 'reposicoes', icon: RotateCcw },
  { label: 'Calendário', page: 'calendario', icon: Calendar },
  { label: 'Feriados', page: 'feriados', icon: Flag },
  { label: 'Recessos', page: 'recessos', icon: Coffee },
  { label: 'Mensagens', page: 'mensagens', icon: MessageSquare },
  { label: 'Relatórios', page: 'relatorios', icon: BarChart3 },
  { label: 'Exportar', page: 'exportar', icon: Download },
  { label: 'Configurações', page: 'configuracoes', icon: Settings },
]

const teacherNav: NavItem[] = [
  { label: 'Minha Agenda', page: 'minha-agenda', icon: CalendarDays },
  { label: 'Disponibilidade', page: 'disponibilidade', icon: Clock },
  { label: 'Turmas', page: 'turmas', icon: School },
  { label: 'Calendário', page: 'calendario', icon: Calendar },
  { label: 'Mensagens', page: 'mensagens', icon: MessageSquare },
  { label: 'Perfil', page: 'perfil', icon: User },
]

const studentNav: NavItem[] = [
  { label: 'Calendário', page: 'calendario', icon: Calendar },
  { label: 'Minhas Aulas', page: 'minhas-aulas', icon: BookOpen },
  { label: 'Provas', page: 'provas', icon: FileText },
  { label: 'Mensagens', page: 'mensagens', icon: MessageSquare },
  { label: 'Perfil', page: 'perfil', icon: User },
]

const roleLabels: Record<string, string> = {
  coordinator: 'Coordenador',
  teacher: 'Professor',
  student: 'Aluno',
}

const roleColors: Record<string, string> = {
  coordinator: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  teacher: 'bg-amber-100 text-amber-800 border-amber-200',
  student: 'bg-sky-100 text-sky-800 border-sky-200',
}

export function AppSidebar() {
  const { user, activePage, setActivePage, logout } = useAppStore()

  if (!user) return null

  const navItems =
    user.role === 'coordinator'
      ? coordinatorNav
      : user.role === 'teacher'
        ? teacherNav
        : studentNav

  const mainItems = navItems.slice(0, -3)
  const commItems = navItems.filter(
    (item) =>
      item.page === 'mensagens' ||
      item.page === 'relatorios' ||
      item.page === 'exportar'
  )
  const settingsItems = navItems.filter(
    (item) =>
      item.page === 'configuracoes' ||
      item.page === 'perfil'
  )

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-4 py-5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="hover:bg-transparent cursor-default"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold text-base tracking-tight">
                  Horivoo
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  Sistema Acadêmico
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.page}>
                  <SidebarMenuButton
                    isActive={activePage === item.page}
                    onClick={() => setActivePage(item.page as never)}
                    tooltip={item.label}
                    className={
                      activePage === item.page
                        ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15 hover:text-primary'
                        : ''
                    }
                  >
                    <item.icon
                      className={
                        activePage === item.page
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }
                    />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {commItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Comunicação
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {commItems.map((item) => (
                  <SidebarMenuItem key={item.page}>
                    <SidebarMenuButton
                      isActive={activePage === item.page}
                      onClick={() => setActivePage(item.page as never)}
                      tooltip={item.label}
                      className={
                        activePage === item.page
                          ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15 hover:text-primary'
                          : ''
                      }
                    >
                      <item.icon
                        className={
                          activePage === item.page
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        }
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {settingsItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Sistema
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsItems.map((item) => (
                  <SidebarMenuItem key={item.page}>
                    <SidebarMenuButton
                      isActive={activePage === item.page}
                      onClick={() => setActivePage(item.page as never)}
                      tooltip={item.label}
                      className={
                        activePage === item.page
                          ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15 hover:text-primary'
                          : ''
                      }
                    >
                      <item.icon
                        className={
                          activePage === item.page
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        }
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <div className="flex items-center gap-3 px-2 py-1">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium truncate leading-tight">
              {user.name}
            </p>
            <Badge
              variant="outline"
              className={`mt-1 text-[10px] px-1.5 py-0 h-4 font-medium ${roleColors[user.role] || ''}`}
            >
              {roleLabels[user.role] || user.role}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 group-data-[collapsible=icon]:hidden"
            onClick={logout}
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
