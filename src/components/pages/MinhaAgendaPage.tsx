'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
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
import { Separator } from '@/components/ui/separator'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  PartyPopper,
  Coffee,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface AppointmentData {
  id: string
  classId: string
  teacherId: string
  studentId: string | null
  date: string
  startTime: string
  endTime: string
  recurringGroupId: string | null
  status: string
  notes: string
  createdAt: string
  class: { id: string; name: string; subject: string }
  teacher: { id: string; userId: string; user: { id: string; name: string; email: string } }
  student: { id: string; userId: string; user: { id: string; name: string; email: string } } | null
}

interface MakeUpClassData {
  id: string
  originalAppointmentId: string
  newDate: string
  newStartTime: string
  newEndTime: string
  status: string
  originalAppointment: AppointmentData
}

interface HolidayData {
  id: string
  name: string
  date: string
}

interface RecessData {
  id: string
  startDate: string
  endDate: string
  description: string
}

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const DAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]

const DAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  confirmed: { label: 'Confirmada', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  completed: { label: 'Concluída', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: CheckCircle2 },
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function getWeekDates(referenceDate: Date): Date[] {
  const d = new Date(referenceDate)
  const day = d.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + mondayOffset)
  return Array.from({ length: 6 }, (_, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    return date
  })
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function isDateInRecess(dateStr: string, recesses: RecessData[]): RecessData | null {
  return recesses.find(r => dateStr >= r.startDate && dateStr <= r.endDate) || null
}

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export function MinhaAgendaPage() {
  const { user, authFetch } = useAppStore()

  const [appointments, setAppointments] = useState<AppointmentData[]>([])
  const [makeUpClasses, setMakeUpClasses] = useState<MakeUpClassData[]>([])
  const [holidays, setHolidays] = useState<HolidayData[]>([])
  const [recesses, setRecesses] = useState<RecessData[]>([])
  const [loading, setLoading] = useState(true)

  const [weekRef, setWeekRef] = useState(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return now
  })

  const weekDates = useMemo(() => getWeekDates(weekRef), [weekRef])
  const weekStart = formatDateKey(weekDates[0])
  const weekEnd = formatDateKey(weekDates[weekDates.length - 1])

  const loadData = useCallback(async () => {
    if (!user?.teacherId) return
    setLoading(true)
    try {
      const [apptsRes, makeupRes, holidayRes, recessRes] = await Promise.all([
        authFetch(`/api/appointments?teacherId=${user.teacherId}&from=${weekStart}&to=${weekEnd}`),
        authFetch('/api/makeups'),
        authFetch('/api/holidays'),
        authFetch('/api/recesses'),
      ])

      if (apptsRes.ok) {
        const apptsData = await apptsRes.json()
        setAppointments(Array.isArray(apptsData) ? apptsData : [])
      }
      if (makeupRes.ok) {
        const makeupData = await makeupRes.json()
        setMakeUpClasses(Array.isArray(makeupData) ? makeupData : [])
      }
      if (holidayRes.ok) {
        const hData = await holidayRes.json()
        setHolidays(Array.isArray(hData) ? hData : [])
      }
      if (recessRes.ok) {
        const rData = await recessRes.json()
        setRecesses(Array.isArray(rData) ? rData : [])
      }
    } catch {
      toast.error('Erro ao carregar agenda')
    } finally {
      setLoading(false)
    }
  }, [user?.teacherId, weekStart, weekEnd, authFetch])

  useEffect(() => {
    loadData()
  }, [loadData])

  /* ---- Filter make-up classes for this teacher ---- */
  const teacherMakeUps = useMemo(() => {
    if (!user?.teacherId) return []
    return makeUpClasses.filter(m => m.originalAppointment.teacherId === user.teacherId)
  }, [makeUpClasses, user?.teacherId])

  /* ---- Next 5 upcoming classes ---- */
  const upcomingClasses = useMemo(() => {
    const today = formatDateKey(new Date())
    return appointments
      .filter(a => a.date >= today && a.status === 'confirmed')
      .sort((a, b) => a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date))
      .slice(0, 5)
  }, [appointments])

  /* ---- Group appointments by date ---- */
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, AppointmentData[]> = {}
    for (const a of appointments) {
      if (!map[a.date]) map[a.date] = []
      map[a.date].push(a)
    }
    // Sort within each day
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.startTime.localeCompare(b.startTime))
    }
    return map
  }, [appointments])

  /* ---- Holiday map ---- */
  const holidayMap = useMemo(() => {
    const map: Record<string, HolidayData> = {}
    for (const h of holidays) {
      map[h.date] = h
    }
    return map
  }, [holidays])

  const goPrevWeek = () => {
    setWeekRef(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 7)
      return d
    })
  }

  const goNextWeek = () => {
    setWeekRef(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 7)
      return d
    })
  }

  const goCurrentWeek = () => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    setWeekRef(now)
  }

  /* ---- Render appointment card ---- */
  const renderAppointment = (appt: AppointmentData, isMakeUp?: boolean) => {
    const cfg = statusConfig[appt.status] || statusConfig.confirmed
    const StatusIcon = cfg.icon
    const holiday = holidayMap[appt.date]
    const recess = isDateInRecess(appt.date, recesses)

    return (
      <div
        key={appt.id}
        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
          appt.status === 'cancelled'
            ? 'border-red-200 bg-red-50/50'
            : appt.status === 'completed'
              ? 'border-gray-200 bg-gray-50/50'
              : 'border-emerald-200 bg-emerald-50/30'
        }`}
      >
        <div className={`mt-0.5 p-1.5 rounded-md ${cfg.color}`}>
          <StatusIcon className="size-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-sm">{appt.class.name}</span>
            {appt.recurringGroupId && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-violet-50 text-violet-700 border-violet-200">
                Recorrente
              </Badge>
            )}
            {isMakeUp && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-50 text-amber-700 border-amber-200">
                <RotateCcw className="size-2.5 mr-0.5" />
                Reposição
              </Badge>
            )}
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${cfg.color}`}>
              {cfg.label}
            </Badge>
            {holiday && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-rose-50 text-rose-700 border-rose-200">
                <PartyPopper className="size-2.5 mr-0.5" />
                Feriado
              </Badge>
            )}
            {recess && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-orange-50 text-orange-700 border-orange-200">
                <Coffee className="size-2.5 mr-0.5" />
                Recesso
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {appt.startTime} - {appt.endTime}
            </span>
            {appt.student?.user?.name && (
              <span className="flex items-center gap-1">
                <User className="size-3" />
                {appt.student.user.name}
              </span>
            )}
          </div>
          {appt.notes && (
            <p className="text-xs text-muted-foreground mt-1 italic">{appt.notes}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minha Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Visualize seus horários de aula
          </p>
        </div>
        <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={goPrevWeek}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-xs" onClick={goCurrentWeek}>
            Hoje
          </Button>
          <span className="text-sm font-medium px-2 min-w-[160px] text-center">
            {formatDateBR(weekStart)} - {formatDateBR(weekEnd)}
          </span>
          <Button variant="ghost" size="icon" className="size-8" onClick={goNextWeek}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Próximas Aulas card */}
      <Card className="border-emerald-100">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5 text-emerald-600" />
            <CardTitle className="text-base">Próximas Aulas</CardTitle>
          </div>
          <CardDescription>Suas 5 próximas aulas confirmadas</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingClasses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma aula agendada para as próximas semanas.
            </p>
          ) : (
            <div className="space-y-2">
              {upcomingClasses.map(appt => (
                <div
                  key={appt.id}
                  className="flex items-center gap-3 p-2.5 rounded-md bg-emerald-50/50 border border-emerald-100"
                >
                  <div className="text-center min-w-[48px]">
                    <p className="text-xs text-emerald-600 font-medium">
                      {DAY_SHORT[new Date(appt.date + 'T12:00:00').getDay()]}
                    </p>
                    <p className="text-lg font-bold text-emerald-700">
                      {appt.date.split('-')[2]}
                    </p>
                  </div>
                  <Separator orientation="vertical" className="h-10" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{appt.class.name}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {appt.startTime} - {appt.endTime}
                      </span>
                      {appt.student?.user?.name && (
                        <span className="flex items-center gap-1">
                          <User className="size-3" />
                          {appt.student.user.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly view */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Visão Semanal</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              <Loader2 className="size-6 animate-spin mr-2" />
              Carregando agenda...
            </div>
          ) : (
            <div className="space-y-4">
              {weekDates.map(date => {
                const dateKey = formatDateKey(date)
                const dayAppts = appointmentsByDate[dateKey] || []
                const holiday = holidayMap[dateKey]
                const recess = isDateInRecess(dateKey, recesses)
                const dayMakeUps = teacherMakeUps.filter(m => m.newDate === dateKey)
                const isToday = dateKey === formatDateKey(new Date())

                return (
                  <div key={dateKey}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${
                        isToday
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-muted text-foreground'
                      }`}>
                        <span>{DAY_NAMES[date.getDay()]}</span>
                        <span className="text-muted-foreground">-</span>
                        <span>{formatDateBR(dateKey)}</span>
                      </div>
                      {holiday && (
                        <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 border-rose-200">
                          <PartyPopper className="size-3 mr-1" />
                          Feriado: {holiday.name}
                        </Badge>
                      )}
                      {recess && (
                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                          <Coffee className="size-3 mr-1" />
                          Recesso: {recess.description}
                        </Badge>
                      )}
                    </div>

                    {dayAppts.length === 0 && dayMakeUps.length === 0 && !holiday && !recess ? (
                      <p className="text-xs text-muted-foreground pl-4 py-2">
                        Nenhuma aula neste dia.
                      </p>
                    ) : (
                      <div className="space-y-2 pl-2">
                        {dayAppts.map(appt => renderAppointment(appt))}
                        {dayMakeUps.map(mu => {
                          const fakeAppt: AppointmentData = {
                            ...mu.originalAppointment,
                            date: mu.newDate,
                            startTime: mu.newStartTime,
                            endTime: mu.newEndTime,
                            status: mu.status === 'completed' ? 'completed' : mu.status === 'cancelled' ? 'cancelled' : 'confirmed',
                          }
                          return renderAppointment(fakeAppt, true)
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-emerald-200" />
              Confirmada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-red-200" />
              Cancelada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-gray-200" />
              Concluída
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-violet-200" />
              Recorrente
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-amber-200" />
              Reposição
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-rose-200" />
              Feriado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-orange-200" />
              Recesso
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
