import { create } from 'zustand';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  token: string;
  teacherId?: string;
}

export type PageKey = 
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
  | 'configuracoes';

interface AuthStore {
  user: AuthUser | null;
  loading: boolean;
  activePage: PageKey;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role: string) => Promise<void>;
  logout: () => void;
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
    set({ user: { ...data.user, token: data.token }, activePage: 'dashboard' });
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
    set({ user: { ...data.user, token: data.token }, activePage: 'dashboard' });
  },

  logout: () => {
    localStorage.removeItem('horivoo_token');
    localStorage.removeItem('horivoo_user');
    set({ user: null, activePage: 'dashboard' });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('horivoo_token');
    const userStr = localStorage.getItem('horivoo_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user: { ...user, token }, loading: false });
        return;
      } catch {
        /* ignore */
      }
    }
    set({ loading: false });
  },

  setActivePage: (page) => set({ activePage: page }),
}));

// Helper for authenticated fetch
export function authFetch(url: string, options: RequestInit = {}, token?: string) {
  const t = token || localStorage.getItem('horivoo_token');
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      'Content-Type': 'application/json',
    },
  });
}
