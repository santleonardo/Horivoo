'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  BarChart3,
  GraduationCap,
  Users,
  CalendarCheck,
  TrendingUp,
  XCircle,
  RotateCcw,
  Loader2,
  Clock,
  Filter,
} from 'lucide-react'
import { toast } from 'sonner'

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

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
    class: { id: string; name: string; subject: string }
    teacher: { id: string; user: { id: string; name: string } }
    student: { id: string; user: { id: string; name: string } } | null
  }>
}

interface AppointmentData {
  id: string
  status: string
  date: string
  startTime: string
  endTime: string
  recurringGroupId: string | null
  class: { id: string; name: string; subject: string }
  teacher: { id: string; user: { id: string; name: string } }
  student: { id: string; user: { id: string; name: string } } | null
}

interface MakeUpData {
  id: string
  status: string
  newDate: string
  newStartTime: string
  newEndTime: string
  originalAppointment: {
    id: string
    classId: string
    teacherId: string
    class: { id: string; name: string }
    teacher: { id: string; user: { name: string } }
  }
}

interface AttendanceData {
  id: string
  status: string
  studentId: string
  appointmentId: string
}

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export function RelatoriosPage() {
  const { authFetch } = useAppStore()

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [appointments, setAppointments] = useState<AppointmentData[]>([])
  const [makeUps, setMakeUps] = useState<MakeUpData[]>([])
  const [attendance, setAttendance] = useState<AttendanceData[]>([])
  const [loading, setLoading] = useState(true)

  // Date filter
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [dashRes, apptsRes, makeupRes, attRes] = await Promise.all([
        authFetch('/api/dashboard'),
        authFetch('/api/appointments'),
        authFetch('/api/makeups'),
        authFetch('/api/attendance'),
      ])

      if (dashRes.ok) {
        const data = await dashRes.json()
        setDashboardData(data)
      }
      if (apptsRes.ok) {
        const data = await apptsRes.json()
        setAppointments(Array.isArray(data) ? data : [])
      }
      if (makeupRes.ok) {
        const data = await makeupRes.json()
        setMakeUps(Array.isArray(data) ? data : [])
      }
      if (attRes.ok) {
        const data = await attRes.json()
        setAttendance(Array.isArray(data) ? data : [])
      }
    } catch {
      toast.error('Erro ao carregar relatórios')
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    loadData()
  }, [loadData])

  /* ---- Filtered data ---- */
  const filteredAppointments = useMemo(() => {
    let result = appointments
    if (dateFrom) {
      result = result.filter(a => a.date >= dateFrom)
    }
    if (dateTo) {
      result = result.filter(a => a.date <= dateTo)
    }
    return result
  }, [appointments, dateFrom, dateTo])

  const filteredAttendance = useMemo(() => {
    // Attendance doesn't have a date field directly, it's linked to appointments
    // For now, just show all
    return attendance
  }, [attendance])

  /* ---- Stats ---- */
  const totalAulas = filteredAppointments.length
  const aulasConfirmadas = filteredAppointments.filter(a => a.status === 'confirmed').length
  const aulasCanceladas = filteredAppointments.filter(a => a.status === 'cancelled').length
  const aulasConcluidas = filteredAppointments.filter(a => a.status === 'completed').length
  const reposicoes = makeUps.length
  const reposicoesAgendadas = makeUps.filter(m => m.status === 'scheduled').length
  const reposicoesConcluidas = makeUps.filter(m => m.status === 'completed').length

  // Attendance rate
  const presencas = filteredAttendance.filter(a => a.status === 'present').length
  const faltas = filteredAttendance.filter(a => a.status === 'absent').length
  const atrasos = filteredAttendance.filter(a => a.status === 'late').length
  const totalRegistros = presencas + faltas + atrasos
  const taxaPresenca = totalRegistros > 0 ? Math.round((presencas / totalRegistros) * 100) : 0

  /* ---- Aulas por professor ---- */
  const aulasPorProfessor = useMemo(() => {
    const map: Record<string, { name: string; count: number; confirmed: number; cancelled: number; completed: number }> = {}
    for (const a of filteredAppointments) {
      const tId = a.teacher?.id || 'unknown'
      const tName = a.teacher?.user?.name || 'Desconhecido'
      if (!map[tId]) {
        map[tId] = { name: tName, count: 0, confirmed: 0, cancelled: 0, completed: 0 }
      }
      map[tId].count++
      if (a.status === 'confirmed') map[tId].confirmed++
      if (a.status === 'cancelled') map[tId].cancelled++
      if (a.status === 'completed') map[tId].completed++
    }
    return Object.values(map).sort((a, b) => b.count - a.count)
  }, [filteredAppointments])

  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
  }

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-6">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-60 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Visão geral das métricas do sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <TrendingUp className="size-4 mr-1" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Date filter */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs">
                <Filter className="size-3" />
                Data início
              </Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data fim</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Aulas */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <CalendarCheck className="size-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-sm">Total de Aulas</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-700">{totalAulas}</p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Confirmadas: {aulasConfirmadas}</span>
                <span>Concluídas: {aulasConcluidas}</span>
              </div>
              <Progress value={totalAulas > 0 ? (aulasConfirmadas / totalAulas) * 100 : 0} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        {/* Taxa de Presença */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-50">
                <Users className="size-5 text-teal-600" />
              </div>
              <div>
                <CardTitle className="text-sm">Taxa de Presença</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-teal-700">{taxaPresenca}%</p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Presentes: {presencas}</span>
                <span>Faltas: {faltas}</span>
              </div>
              <Progress value={taxaPresenca} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        {/* Aulas Canceladas */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50">
                <XCircle className="size-5 text-red-500" />
              </div>
              <div>
                <CardTitle className="text-sm">Aulas Canceladas</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{aulasCanceladas}</p>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Do total: {totalAulas > 0 ? Math.round((aulasCanceladas / totalAulas) * 100) : 0}%</span>
              </div>
              <Progress value={totalAulas > 0 ? (aulasCanceladas / totalAulas) * 100 : 0} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        {/* Reposições */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <RotateCcw className="size-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-sm">Reposições</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-700">{reposicoes}</p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Agendadas: {reposicoesAgendadas}</span>
                <span>Concluídas: {reposicoesConcluidas}</span>
              </div>
              <Progress value={reposicoes > 0 ? (reposicoesConcluidas / reposicoes) * 100 : 0} className="h-1.5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* General summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resumo Geral */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <BarChart3 className="size-5 text-emerald-600" />
              <div>
                <CardTitle className="text-base">Resumo Geral</CardTitle>
                <CardDescription>Métricas consolidadas do sistema</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{dashboardData?.totalTeachers || 0}</p>
                <p className="text-sm text-muted-foreground">Professores</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{dashboardData?.totalStudents || 0}</p>
                <p className="text-sm text-muted-foreground">Alunos</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{dashboardData?.totalClasses || 0}</p>
                <p className="text-sm text-muted-foreground">Turmas</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{dashboardData?.totalAppointmentsToday || 0}</p>
                <p className="text-sm text-muted-foreground">Aulas Hoje</p>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Attendance breakdown */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Frequência</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-emerald-500" />
                    Presentes
                  </span>
                  <div className="flex items-center gap-2">
                    <Progress value={totalRegistros > 0 ? (presencas / totalRegistros) * 100 : 0} className="w-24 h-2" />
                    <span className="text-sm font-medium w-8 text-right">{presencas}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-red-500" />
                    Faltas
                  </span>
                  <div className="flex items-center gap-2">
                    <Progress value={totalRegistros > 0 ? (faltas / totalRegistros) * 100 : 0} className="w-24 h-2" />
                    <span className="text-sm font-medium w-8 text-right">{faltas}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-amber-500" />
                    Atrasos
                  </span>
                  <div className="flex items-center gap-2">
                    <Progress value={totalRegistros > 0 ? (atrasos / totalRegistros) * 100 : 0} className="w-24 h-2" />
                    <span className="text-sm font-medium w-8 text-right">{atrasos}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Aulas por Professor */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <GraduationCap className="size-5 text-amber-600" />
              <div>
                <CardTitle className="text-base">Aulas por Professor</CardTitle>
                <CardDescription>Distribuição de aulas por docente</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {aulasPorProfessor.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum dado disponível.
              </p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {aulasPorProfessor.map(prof => {
                  const confirmRate = prof.count > 0 ? Math.round((prof.confirmed / prof.count) * 100) : 0
                  return (
                    <div key={prof.name} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{prof.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {prof.count} aula{prof.count > 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span className="text-emerald-600">{prof.confirmed} confirmadas</span>
                        <span className="text-gray-500">{prof.completed} concluídas</span>
                        <span className="text-red-500">{prof.cancelled} canceladas</span>
                      </div>
                      <Progress value={confirmRate} className="h-1.5" />
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
