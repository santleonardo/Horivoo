'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Settings,
  User,
  Shield,
  Info,
  Clock,
  Globe,
  Calendar,
  Database,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface ProfileData {
  id: string
  name: string
  email: string
  phone: string
  role: string
  teacherId: string | null
  studentId: string | null
}

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const roleLabel: Record<string, string> = {
  coordinator: 'Coordenador',
  teacher: 'Professor',
  student: 'Aluno',
}

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export function ConfiguracoesPage() {
  const { user, authFetch } = useAppStore()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await authFetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setProfile(data)
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [authFetch])

  const initials = (profile?.name || user?.name || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie as configurações do sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <User className="size-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">Perfil do Coordenador</CardTitle>
                <CardDescription>Informações da sua conta</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="size-14 border-2 border-emerald-200">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-lg">{profile?.name || user?.name}</p>
                <p className="text-sm text-muted-foreground">{profile?.email || user?.email}</p>
                <Badge
                  variant="outline"
                  className="mt-1 bg-emerald-100 text-emerald-700 border-emerald-200"
                >
                  {roleLabel[profile?.role || user?.role || 'coordinator']}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">ID da Conta</span>
                <span className="text-sm font-mono">{profile?.id || user?.id || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Telefone</span>
                <span className="text-sm">{profile?.phone || user?.phone || 'Não informado'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Papel</span>
                <span className="text-sm font-medium">Coordenador</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <Settings className="size-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-base">Preferências do Sistema</CardTitle>
                <CardDescription>Configurações gerais da plataforma</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
              <Info className="size-4 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium text-sm">Horivoo — Sistema de Agenda Escolar</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Versão 2.0 — Plataforma completa de agendamento acadêmico
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
              <Globe className="size-4 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium text-sm">Idioma</p>
                <p className="text-xs text-muted-foreground mt-0.5">Português (Brasil)</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
              <Clock className="size-4 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium text-sm">Fuso Horário</p>
                <p className="text-xs text-muted-foreground mt-0.5">América/São_Paulo (BRT)</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
              <Calendar className="size-4 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium text-sm">Formato de Data</p>
                <p className="text-xs text-muted-foreground mt-0.5">DD/MM/AAAA</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
              <Database className="size-4 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium text-sm">Banco de Dados</p>
                <p className="text-xs text-muted-foreground mt-0.5">SQLite (local)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account & Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50">
              <Shield className="size-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-base">Conta e Segurança</CardTitle>
              <CardDescription>Informações de acesso e segurança da conta do coordenador</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border">
              <p className="text-sm font-medium">Tipo de Conta</p>
              <p className="text-xs text-muted-foreground mt-1">Conta de coordenador com acesso total ao sistema</p>
              <Badge variant="outline" className="mt-2 bg-emerald-50 text-emerald-700 border-emerald-200">
                Administrador
              </Badge>
            </div>
            <div className="p-4 rounded-lg border">
              <p className="text-sm font-medium">Permissões</p>
              <p className="text-xs text-muted-foreground mt-1">Criar, editar e excluir todos os registros do sistema</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {['Agendamentos', 'Professores', 'Alunos', 'Turmas', 'Feriados', 'Recessos'].map(p => (
                  <Badge key={p} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-lg border">
              <p className="text-sm font-medium">Segurança</p>
              <p className="text-xs text-muted-foreground mt-1">Senha armazenada com hash seguro (bcrypt)</p>
              <Badge variant="outline" className="mt-2 bg-green-50 text-green-700 border-green-200">
                Protegido
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* School Settings Placeholder */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-50">
              <Settings className="size-5 text-sky-600" />
            </div>
            <div>
              <CardTitle className="text-base">Configurações da Escola</CardTitle>
              <CardDescription>Configurações específicas da instituição</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-dashed">
              <p className="text-sm font-medium text-muted-foreground">Nome da Escola</p>
              <p className="text-lg font-semibold mt-1">Horivoo Academy</p>
            </div>
            <div className="p-4 rounded-lg border border-dashed">
              <p className="text-sm font-medium text-muted-foreground">Ano Letivo</p>
              <p className="text-lg font-semibold mt-1">{new Date().getFullYear()}</p>
            </div>
            <div className="p-4 rounded-lg border border-dashed">
              <p className="text-sm font-medium text-muted-foreground">Dias de Aula</p>
              <p className="text-lg font-semibold mt-1">Segunda a Sábado</p>
            </div>
            <div className="p-4 rounded-lg border border-dashed">
              <p className="text-sm font-medium text-muted-foreground">Horário de Funcionamento</p>
              <p className="text-lg font-semibold mt-1">08:00 - 22:00</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 italic">
            Estas configurações são placeholders e serão personalizáveis em futuras versões do sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
