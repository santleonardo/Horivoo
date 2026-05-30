'use client';

import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';

export function Header({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  const { user, logout } = useAuthStore();
  const tabs = [
    { id: 'teacher', label: 'Professor', roles: ['teacher', 'coordinator'] },
    { id: 'student', label: 'Aluno', roles: ['teacher', 'coordinator', 'student'] },
    { id: 'coordinator', label: 'Coordenador', roles: ['coordinator'] },
    { id: 'calendar', label: 'Calendário', roles: ['teacher', 'coordinator', 'student'] },
  ];

  const visibleTabs = tabs.filter(t => user && t.roles.includes(user.role));

  return (
    <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="text-xl font-bold text-emerald-800">
          Hori<span className="text-emerald-600">voo</span>
        </div>
        <nav className="flex gap-1">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 hidden sm:inline">{user?.name}</span>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full hidden sm:inline">
            {user?.role === 'teacher' ? 'Professor' : user?.role === 'coordinator' ? 'Coordenador' : 'Aluno'}
          </span>
          <Button variant="outline" size="sm" onClick={logout}>Sair</Button>
        </div>
      </div>
    </header>
  );
}
