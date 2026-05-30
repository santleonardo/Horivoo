'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  GraduationCap,
  Users,
  BookOpen,
  CalendarCheck,
  Plus,
  Clock,
  MapPin,
  User,
} from 'lucide-react'

interface DashboardData {
  totalTeachers: number
  totalStudents: number
  totalClasses: number
  totalAppointmentsToday: number
  upcomingAppointments: Array<{
    id: string
    date: string
    startTime: string
    endTime: string
    status: string
    notes: string
    class: { id: string; name: string; subject: string }
    teacher: { id: string; user: { name: string } }
    student: { id: string; user: { name: string } } | null
  }>
}

const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${d.getDate()} de ${monthNames[d.getMonth()]} de ${d.getFullYear()}`
}

function getWeekdayName(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return weekdayNames[d.getDay()]
}

export default function DashboardPage() {
  const { user, setActivePage, authFetch } = useAppStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await authFetch('/api/dashboard')
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [authFetch])

  const today = new Date()
  const todayFormatted = `${today.getDate()} de ${monthNames[today.getMonth()]} de ${today.getFullYear()}`

  const statCards = [
    {
      label: 'Total Professores',
      value: data?.totalTeachers ?? 0,
      icon: GraduationCap,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      label: 'Total Alunos',
      value: data?.totalStudents ?? 0,
      icon: Users,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
    },
    {
      label: 'Total Turmas',
      value: data?.totalClasses ?? 0,
      icon: BookOpen,
      color: 'text-rose-600',
      bg: 'bg-rose-50 dark:bg-rose-950/40',
    },
    {
      label: 'Aulas Hoje',
      value: data?.totalAppointmentsToday ?? 0,
      icon: CalendarCheck,
      color: 'text-sky-600',
      bg: 'bg-sky-50 dark:bg-sky-950/40',
    },
  ]

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6">
      {/* Welcome Card */}
      <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-background">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-bold text-emerald-800 dark:text-emerald-200">
            Olá, {user?.name?.split(' ')[0]}! 👋
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-emerald-600 dark:text-emerald-400 text-sm md:text-base">
            {todayFormatted} — Bem-vindo ao painel de controle do Horivoo
          </p>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {card.label}
                    </p>
                    <p className={`text-3xl font-bold mt-1 ${card.color}`}>
                      {loading ? '—' : card.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${card.bg}`}>
                    <Icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Ações Rápidas</h3>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setActivePage('agenda')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Agendamento
          </Button>
          <Button
            onClick={() => setActivePage('turmas')}
            variant="outline"
            className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
          >
            <BookOpen className="h-4 w-4" />
            Nova Turma
          </Button>
          <Button
            onClick={() => setActivePage('alunos')}
            variant="outline"
            className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/40"
          >
            <Users className="h-4 w-4" />
            Novo Aluno
          </Button>
        </div>
      </div>

      {/* Próximas Aulas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-600" />
            Próximas Aulas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : data?.upcomingAppointments && data.upcomingAppointments.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {data.upcomingAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors gap-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 mt-0.5">
                      <CalendarCheck className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-sm">
                        {apt.class.name} — {apt.class.subject}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {apt.teacher.user.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {getWeekdayName(apt.date)}, {apt.startTime} - {apt.endTime}
                        </span>
                        <span>{formatDate(apt.date)}</span>
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={
                      apt.status === 'confirmed'
                        ? 'default'
                        : apt.status === 'completed'
                        ? 'secondary'
                        : 'destructive'
                    }
                    className="text-xs w-fit"
                  >
                    {apt.status === 'confirmed'
                      ? 'Confirmada'
                      : apt.status === 'completed'
                      ? 'Concluída'
                      : 'Cancelada'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma aula agendada para os próximos 7 dias.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
