import { create } from 'zustand';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  token: string;
  teacherId?: string;
}

/**
 * Todas as chaves de página do sistema.
 * Coordenador: dashboard, professores, alunos, agenda, calendario, feriados,
 *              recessos, agendamentos, reposicoes, relatorios, exportar,
 *              configuracoes, mensagens
 * Professor:   minha-agenda, disponibilidade, calendario, mensagens, perfil
 * Aluno:       calendario, minhas-aulas, mensagens, perfil
 */
export type PageKey =
  // Coordenador
  | 'dashboard'
  | 'professores'
  | 'alunos'
  | 'agenda'
  | 'calendario'
  | 'feriados'
  | 'recessos'
  | 'agendamentos'
  | 'reposicoes'
  | 'relatorios'
  | 'exportar'
  | 'configuracoes'
  // Compartilhadas / mensagens
  | 'mensagens'
  // Professor
  | 'minha-agenda'
  | 'disponibilidade'
  // Aluno
  | 'minhas-aulas'
  // Todos
  | 'perfil';

/** Página inicial por papel */
const defaultPage: Record<string, PageKey> = {
  coordinator: 'dashboard',
  teacher:     'minha-agenda',
  student:     'minhas-aulas',
};

interface AuthStore {
  user: AuthUser | null;
  loading: boolean;
  activePage: PageKey;
  login:     (email: string, password: string) => Promise<void>;
  signup:    (email: string, password: string, name: string, role: string) => Promise<void>;
  logout:    () => void;
  checkAuth: () => Promise<void>;
  setActivePage: (page: PageKey) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  activePage: 'dashboard',

  login: async (email, password) => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao fazer login');
    }
    const data = await res.json();
    localStorage.setItem('horivoo_token', data.token);
    localStorage.setItem('horivoo_user', JSON.stringify(data.user));
    const startPage: PageKey = defaultPage[data.user.role] ?? 'dashboard';
    set({ user: { ...data.user, token: data.token }, activePage: startPage });
  },

  signup: async (email, password, name, role) => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role, action: 'signup' }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao criar conta');
    }
    const data = await res.json();
    localStorage.setItem('horivoo_token', data.token);
    localStorage.setItem('horivoo_user', JSON.stringify(data.user));
    const startPage: PageKey = defaultPage[data.user.role] ?? 'dashboard';
    set({ user: { ...data.user, token: data.token }, activePage: startPage });
  },

  logout: () => {
    localStorage.removeItem('horivoo_token');
    localStorage.removeItem('horivoo_user');
    set({ user: null, activePage: 'dashboard' });
  },

  checkAuth: async () => {
    const token   = localStorage.getItem('horivoo_token');
    const userStr = localStorage.getItem('horivoo_user');
    if (token && userStr) {
      try {
        const user      = JSON.parse(userStr) as AuthUser;
        const startPage: PageKey = defaultPage[user.role] ?? 'dashboard';
        set({ user: { ...user, token }, loading: false, activePage: startPage });
        return;
      } catch { /* ignore */ }
    }
    set({ loading: false });
  },

  setActivePage: (page) => set({ activePage: page }),
}));

/** Helper para requisições autenticadas */
export function authFetch(url: string, options: RequestInit = {}, token?: string) {
  const t = token || (typeof window !== 'undefined' ? localStorage.getItem('horivoo_token') : null);
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
  });
}
