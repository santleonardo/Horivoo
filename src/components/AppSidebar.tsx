'use client';

/**
 * AppSidebar.tsx — Sidebar com navegação por papel (role-based).
 *
 * Coordenador: Dashboard, Agenda, Professores, Alunos, Turmas, Provas, Reposições, Calendário, Feriados, Recessos, Mensagens, Relatórios, Exportar, Configurações
 * Professor:   Minha Agenda | Disponibilidade | Turmas | Calendário | Provas | Faltas | Mensagens | Perfil
 * Aluno:       Calendário | Minhas Aulas | Provas | Faltas | Mensagens | Perfil
 */

import { useAuthStore, type PageKey } from '@/lib/store';
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
} from '@/components/ui/sidebar';
import {
  Home,
  GraduationCap,
  Users,
  Calendar,
  CalendarDays,
  PartyPopper,
  Palmtree,
  ClipboardList,
  RotateCcw,
  BarChart3,
  Download,
  Settings,
  LogOut,
  CalendarClock,
  BookOpen,
  MessageSquare,
  User,
  FileText,
  ClipboardCheck,
  Layers,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

/* ------------------------------------------------------------------ */

interface MenuItem {
  key: PageKey;
  label: string;
  icon: React.ElementType;
}

// ── Menus por papel ──────────────────────────────────────────────────

const coordinatorMenu: MenuItem[] = [
  { key: 'dashboard',     label: 'Dashboard',     icon: Home },
  { key: 'agenda',        label: 'Agenda',        icon: Calendar },
  { key: 'professores',   label: 'Professores',   icon: GraduationCap },
  { key: 'alunos',        label: 'Alunos',        icon: Users },
  { key: 'turmas',        label: 'Turmas',        icon: Layers },
  { key: 'provas',        label: 'Provas',        icon: FileText },
  { key: 'reposicoes',    label: 'Reposições',    icon: RotateCcw },
  { key: 'calendario',    label: 'Calendário',    icon: CalendarDays },
  { key: 'feriados',      label: 'Feriados',      icon: PartyPopper },
  { key: 'recessos',      label: 'Recessos',      icon: Palmtree },
  { key: 'mensagens',     label: 'Mensagens',     icon: MessageSquare },
  { key: 'relatorios',    label: 'Relatórios',    icon: BarChart3 },
  { key: 'exportar',      label: 'Exportar',      icon: Download },
  { key: 'configuracoes', label: 'Configurações', icon: Settings },
];

const teacherMenu: MenuItem[] = [
  { key: 'minha-agenda',    label: 'Minha Agenda',    icon: Calendar },
  { key: 'disponibilidade', label: 'Disponibilidade', icon: CalendarClock },
  { key: 'turmas',          label: 'Turmas',          icon: Layers },
  { key: 'calendario',      label: 'Calendário',      icon: CalendarDays },
  { key: 'provas',          label: 'Provas',          icon: FileText },
  { key: 'faltas',          label: 'Faltas',          icon: ClipboardCheck },
  { key: 'mensagens',       label: 'Mensagens',       icon: MessageSquare },
  { key: 'perfil',          label: 'Perfil',          icon: User },
];

const studentMenu: MenuItem[] = [
  { key: 'calendario',   label: 'Calendário',   icon: CalendarDays },
  { key: 'minhas-aulas', label: 'Minhas Aulas', icon: BookOpen },
  { key: 'provas',       label: 'Provas',       icon: FileText },
  { key: 'faltas',       label: 'Faltas',       icon: ClipboardCheck },
  { key: 'mensagens',    label: 'Mensagens',    icon: MessageSquare },
  { key: 'perfil',       label: 'Perfil',       icon: User },
];

const menuByRole: Record<string, MenuItem[]> = {
  coordinator: coordinatorMenu,
  teacher:     teacherMenu,
  student:     studentMenu,
};

const roleBadge: Record<string, { label: string; color: string }> = {
  coordinator: { label: 'Coordenador', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  teacher:     { label: 'Professor',   color: 'bg-blue-100 text-blue-700 border-blue-200' },
  student:     { label: 'Aluno',       color: 'bg-amber-100 text-amber-700 border-amber-200' },
};

/* ------------------------------------------------------------------ */

export function AppSidebar() {
  const { user, activePage, setActivePage, logout } = useAuthStore();

  const role      = user?.role || 'student';
  const menuItems = menuByRole[role] || studentMenu;
  const badge     = roleBadge[role];

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  return (
    <Sidebar collapsible="icon" className="border-r border-emerald-100">
      {/* Logo */}
      <SidebarHeader className="p-4 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-lg">
            H
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-lg font-bold text-emerald-700">Horivoo</span>
            <span className="text-xs text-muted-foreground">Agenda Escolar</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Nav */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-emerald-600 font-semibold">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    isActive={activePage === item.key}
                    onClick={() => setActivePage(item.key)}
                    tooltip={item.label}
                    className={
                      activePage === item.key
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 font-medium'
                        : 'hover:bg-emerald-50/50 hover:text-emerald-700'
                    }
                  >
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: user info + logout */}
      <SidebarFooter>
        <SidebarSeparator />
        <div className="p-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:hidden">
            <Avatar className="h-8 w-8 border-2 border-emerald-200 shrink-0">
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium truncate">{user?.name || 'Usuário'}</span>
              <div className="flex items-center gap-1 mt-0.5">
                {badge && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 h-4 ${badge.color}`}
                  >
                    {badge.label}
                  </Badge>
                )}
              </div>
            </div>
            <button
              onClick={logout}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Sair"
            >
              <LogOut className="size-4" />
            </button>
          </div>

          {/* Collapsed: just avatar */}
          <div className="hidden group-data-[collapsible=icon]:flex flex-col items-center gap-2">
            <Avatar className="h-7 w-7 border-2 border-emerald-200">
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={logout}
              className="rounded-md p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Sair"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
