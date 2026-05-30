'use client'

import { create } from 'zustand'

// Types
type Role = 'coordinator' | 'teacher' | 'student'

interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
  phone: string
  teacherId?: string
  studentId?: string
  token: string
}

type PageKey =
  // Coordinator pages
  | 'dashboard'
  | 'agenda'
  | 'professores'
  | 'alunos'
  | 'turmas'
  | 'provas'
  | 'reposicoes'
  | 'calendario'
  | 'feriados'
  | 'recessos'
  | 'mensagens'
  | 'relatorios'
  | 'exportar'
  | 'configuracoes'
  // Teacher pages
  | 'minha-agenda'
  | 'disponibilidade'
  // Student pages
  | 'minhas-aulas'
  // Shared
  | 'perfil'

// LocalStorage keys
const TOKEN_KEY = 'horivoo_token'
const USER_KEY = 'horivoo_user'

interface AppStore {
  user: AuthUser | null
  loading: boolean
  activePage: PageKey
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  setActivePage: (page: PageKey) => void
  authFetch: (url: string, options?: RequestInit) => Promise<Response>
}

export const useAppStore = create<AppStore>((set, get) => ({
  user: null,
  loading: true,
  activePage: 'dashboard',

  login: async (email: string, password: string) => {
    set({ loading: true })
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Login failed' }))
        throw new Error(errorData.message || 'Login failed')
      }

      const data = await res.json()
      const user: AuthUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        phone: data.user.phone,
        teacherId: data.user.teacherId,
        studentId: data.user.studentId,
        token: data.token,
      }

      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))

      // Set default page based on role
      let defaultPage: PageKey = 'dashboard'
      if (user.role === 'teacher') defaultPage = 'minha-agenda'
      if (user.role === 'student') defaultPage = 'minhas-aulas'

      set({ user, loading: false, activePage: defaultPage })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    set({ user: null, loading: false, activePage: 'dashboard' })
  },

  checkAuth: async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      set({ user: null, loading: false })
      return
    }

    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        set({ user: null, loading: false })
        return
      }

      const data = await res.json()
      const user: AuthUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        phone: data.user.phone,
        teacherId: data.user.teacherId,
        studentId: data.user.studentId,
        token,
      }

      localStorage.setItem(USER_KEY, JSON.stringify(user))

      // Restore active page or set default based on role
      let defaultPage: PageKey = 'dashboard'
      if (user.role === 'teacher') defaultPage = 'minha-agenda'
      if (user.role === 'student') defaultPage = 'minhas-aulas'

      const currentState = get()
      set({
        user,
        loading: false,
        activePage: currentState.activePage || defaultPage,
      })
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      set({ user: null, loading: false })
    }
  },

  setActivePage: (page: PageKey) => {
    set({ activePage: page })
  },

  authFetch: async (url: string, options?: RequestInit) => {
    const { user } = get()
    const token = user?.token || localStorage.getItem(TOKEN_KEY)

    const headers = new Headers(options?.headers)
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    if (!headers.has('Content-Type') && options?.body && typeof options.body === 'string') {
      headers.set('Content-Type', 'application/json')
    }

    return fetch(url, {
      ...options,
      headers,
    })
  },
}))
