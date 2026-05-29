'use client';

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
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const menuItems: { key: PageKey; label: string; icon: React.ElementType }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: Home },
  { key: 'professores', label: 'Professores', icon: GraduationCap },
  { key: 'alunos', label: 'Alunos', icon: Users },
  { key: 'agenda', label: 'Agenda', icon: Calendar },
  { key: 'calendario', label: 'Calendário', icon: CalendarDays },
  { key: 'feriados', label: 'Feriados', icon: PartyPopper },
  { key: 'recessos', label: 'Recessos', icon: Palmtree },
  { key: 'agendamentos', label: 'Agendamentos', icon: ClipboardList },
  { key: 'reposicoes', label: 'Reposições', icon: RotateCcw },
  { key: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  { key: 'exportar', label: 'Exportar', icon: Download },
  { key: 'configuracoes', label: 'Configurações', icon: Settings },
];

export function AppSidebar() {
  const { user, activePage, setActivePage, logout } = useAuthStore();

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'U';

  return (
    <Sidebar collapsible="icon" className="border-r border-emerald-100">
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

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-emerald-600 font-semibold">Menu</SidebarGroupLabel>
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

      <SidebarFooter>
        <SidebarSeparator />
        <div className="flex items-center gap-3 p-2 group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-8 w-8 border-2 border-emerald-200">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-medium truncate">{user?.name || 'Usuário'}</span>
            <span className="text-xs text-muted-foreground truncate">{user?.email || ''}</span>
          </div>
          <button
            onClick={logout}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors group-data-[collapsible=icon]:hidden"
            title="Sair"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
