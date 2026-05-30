'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import {
  ChevronLeft,
  ChevronRight,
  CalendarPlus,
  Loader2,
  BookOpen,
  FileText,
  Flag,
  Coffee,
  RefreshCw,
} from 'lucide-react'

interface CalendarAppointment {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  classId: string
  teacherId: string
  studentId: string | null
  class: { id: string; name: string; subject: string }
  teacher: { id: string; user: { name: string } }
  student: { id: string; user: { name: string } } | null
}

interface CalendarTest {
  id: string
  classId: string
  title: string
  date: string
  class: { id: string; name: string; subject: string }
}

interface CalendarHoliday {
  id: string
  name: string
  date: string
}

interface CalendarRecess {
  id: string
  startDate: string
  endDate: string
  description: string
}

interface CalendarMakeUp {
  id: string
  originalAppointmentId: string
  newDate: string
  newStartTime: string
  newEndTime: string
  status: string
  originalAppointment: {
    id: string
    date: string
    class: { id: string; name: string }
    teacher: { id: string; user: { name: string } }
    student: { id: string; user: { name: string } } | null
  }
}

interface CalendarData {
  appointments: CalendarAppointment[]
  holidays: CalendarHoliday[]
  recesses: CalendarRecess[]
  tests: CalendarTest[]
  makeUpClasses: CalendarMakeUp[]
}

interface DayInfo {
  hasClasses: boolean
  hasTests: boolean
  hasHolidays: boolean
  hasRecesses: boolean
  hasMakeups: boolean
  appointments: CalendarAppointment[]
  tests: CalendarTest[]
  holidays: CalendarHoliday[]
  recesses: CalendarRecess[]
  makeups: CalendarMakeUp[]
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function CalendarioPage() {
  const { user, authFetch, setActivePage } = useAppStore()
  const { toast } = useToast()

  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1) // 1-12
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const isCoordinator = user?.role === 'coordinator'

  const fetchCalendar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch(`/api/calendar?year=${currentYear}&month=${currentMonth}`)
      if (res.ok) {
        setCalendarData(await res.json())
      } else {
        toast({ title: 'Erro', description: 'Falha ao carregar calendário.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao carregar calendário.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [authFetch, currentYear, currentMonth, toast])

  useEffect(() => {
    fetchCalendar()
  }, [fetchCalendar])

  // Build day info map
  const dayMap = new Map<string, DayInfo>()

  if (calendarData) {
    // Process appointments
    calendarData.appointments.forEach((a) => {
      const existing = dayMap.get(a.date) || {
        hasClasses: false, hasTests: false, hasHolidays: false, hasRecesses: false, hasMakeups: false,
        appointments: [], tests: [], holidays: [], recesses: [], makeups: [],
      }
      existing.hasClasses = true
      existing.appointments.push(a)
      dayMap.set(a.date, existing)
    })

    // Process tests
    calendarData.tests.forEach((t) => {
      const existing = dayMap.get(t.date) || {
        hasClasses: false, hasTests: false, hasHolidays: false, hasRecesses: false, hasMakeups: false,
        appointments: [], tests: [], holidays: [], recesses: [], makeups: [],
      }
      existing.hasTests = true
      existing.tests.push(t)
      dayMap.set(t.date, existing)
    })

    // Process holidays
    calendarData.holidays.forEach((h) => {
      const existing = dayMap.get(h.date) || {
        hasClasses: false, hasTests: false, hasHolidays: false, hasRecesses: false, hasMakeups: false,
        appointments: [], tests: [], holidays: [], recesses: [], makeups: [],
      }
      existing.hasHolidays = true
      existing.holidays.push(h)
      dayMap.set(h.date, existing)
    })

    // Process recesses
    calendarData.recesses.forEach((r) => {
      const startDate = new Date(r.startDate + 'T12:00:00')
      const endDate = new Date(r.endDate + 'T12:00:00')
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        const existing = dayMap.get(dateStr) || {
          hasClasses: false, hasTests: false, hasHolidays: false, hasRecesses: false, hasMakeups: false,
          appointments: [], tests: [], holidays: [], recesses: [], makeups: [],
        }
        existing.hasRecesses = true
        existing.recesses.push(r)
        dayMap.set(dateStr, existing)
      }
    })

    // Process make-ups
    calendarData.makeUpClasses.forEach((m) => {
      const existing = dayMap.get(m.newDate) || {
        hasClasses: false, hasTests: false, hasHolidays: false, hasRecesses: false, hasMakeups: false,
        appointments: [], tests: [], holidays: [], recesses: [], makeups: [],
      }
      existing.hasMakeups = true
      existing.makeups.push(m)
      dayMap.set(m.newDate, existing)
    })
  }

  // Calendar grid calculation
  const firstDay = new Date(currentYear, currentMonth - 1, 1)
  const lastDay = new Date(currentYear, currentMonth, 0)
  const daysInMonth = lastDay.getDate()
  const startWeekday = firstDay.getDay() // 0=Sun

  const todayStr = today.toISOString().split('T')[0]

  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
    setSelectedDay(null)
  }

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
    setSelectedDay(null)
  }

  const formatDateFull = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  }

  // Build calendar grid cells
  const calendarCells: (number | null)[] = []
  for (let i = 0; i < startWeekday; i++) {
    calendarCells.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d)
  }

  const selectedDayInfo = selectedDay ? dayMap.get(selectedDay) : null

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Calendário</h2>
          <p className="text-muted-foreground">Visualize aulas, provas, feriados e reposições.</p>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold min-w-48 text-center">
          {MONTH_NAMES[currentMonth - 1]} {currentYear}
        </h3>
        <Button variant="outline" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar grid */}
          <Card className="lg:col-span-2">
            <CardContent className="p-4">
              <div className="grid grid-cols-7 gap-1">
                {/* Weekday headers */}
                {WEEKDAY_NAMES.map((name) => (
                  <div key={name} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {name}
                  </div>
                ))}

                {/* Empty cells for padding */}
                {calendarCells.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="aspect-square" />
                  }

                  const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const info = dayMap.get(dateStr)
                  const isToday = dateStr === todayStr
                  const isSelected = dateStr === selectedDay

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDay(dateStr)}
                      className={`
                        aspect-square flex flex-col items-center justify-center rounded-md text-sm
                        transition-colors hover:bg-accent cursor-pointer
                        ${isSelected ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
                        ${isToday && !isSelected ? 'bg-accent font-bold' : ''}
                      `}
                    >
                      <span className="text-sm">{day}</span>
                      {info && !isSelected && (
                        <div className="flex gap-0.5 mt-0.5">
                          {info.hasClasses && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                          {info.hasTests && <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />}
                          {info.hasHolidays && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
                          {info.hasRecesses && <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />}
                          {info.hasMakeups && <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs text-muted-foreground">Aulas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                  <span className="text-xs text-muted-foreground">Provas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  <span className="text-xs text-muted-foreground">Feriados</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                  <span className="text-xs text-muted-foreground">Recessos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                  <span className="text-xs text-muted-foreground">Reposições</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Day detail panel */}
          <Card>
            <CardContent className="p-4">
              {selectedDay ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{formatDateFull(selectedDay)}</h4>
                    {isCoordinator && (
                      <Button
                        size="sm"
                        onClick={() => setActivePage('agenda')}
                      >
                        <CalendarPlus className="h-4 w-4 mr-1" />
                        Agendar Aula
                      </Button>
                    )}
                  </div>

                  <ScrollArea className="max-h-96">
                    <div className="space-y-4 pr-2">
                      {/* Appointments */}
                      {selectedDayInfo && selectedDayInfo.appointments.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="h-4 w-4 text-emerald-600" />
                            <span className="text-sm font-medium">Aulas</span>
                          </div>
                          <div className="space-y-2">
                            {selectedDayInfo.appointments.map((a) => (
                              <div key={a.id} className="rounded-md border p-2 text-sm">
                                <div className="font-medium">{a.class.name} — {a.class.subject}</div>
                                <div className="text-muted-foreground">
                                  {a.startTime}–{a.endTime} • Prof. {a.teacher.user.name}
                                  {a.student && ` • ${a.student.user.name}`}
                                </div>
                                <Badge
                                  variant={a.status === 'cancelled' ? 'destructive' : a.status === 'completed' ? 'secondary' : 'outline'}
                                  className="mt-1 text-xs"
                                >
                                  {a.status === 'confirmed' ? 'Confirmada' : a.status === 'cancelled' ? 'Cancelada' : a.status === 'completed' ? 'Concluída' : a.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tests */}
                      {selectedDayInfo && selectedDayInfo.tests.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-sky-600" />
                            <span className="text-sm font-medium">Provas</span>
                          </div>
                          <div className="space-y-2">
                            {selectedDayInfo.tests.map((t) => (
                              <div key={t.id} className="rounded-md border p-2 text-sm">
                                <div className="font-medium">{t.title}</div>
                                <div className="text-muted-foreground">{t.class.name}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Holidays */}
                      {selectedDayInfo && selectedDayInfo.holidays.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Flag className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-medium">Feriados</span>
                          </div>
                          <div className="space-y-2">
                            {selectedDayInfo.holidays.map((h) => (
                              <div key={h.id} className="rounded-md border border-red-200 bg-red-50 p-2 text-sm">
                                <div className="font-medium text-red-700">{h.name}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recesses */}
                      {selectedDayInfo && selectedDayInfo.recesses.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Coffee className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-medium">Recessos</span>
                          </div>
                          <div className="space-y-2">
                            {selectedDayInfo.recesses.map((r) => (
                              <div key={r.id} className="rounded-md border border-yellow-200 bg-yellow-50 p-2 text-sm">
                                <div className="font-medium text-yellow-700">
                                  {r.description || 'Recesso'}
                                </div>
                                <div className="text-yellow-600 text-xs">
                                  {formatDateFull(r.startDate)} – {formatDateFull(r.endDate)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Make-ups */}
                      {selectedDayInfo && selectedDayInfo.makeups.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <RefreshCw className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-medium">Reposições</span>
                          </div>
                          <div className="space-y-2">
                            {selectedDayInfo.makeups.map((m) => (
                              <div key={m.id} className="rounded-md border border-purple-200 bg-purple-50 p-2 text-sm">
                                <div className="font-medium text-purple-700">
                                  {m.originalAppointment.class.name}
                                </div>
                                <div className="text-purple-600 text-xs">
                                  {m.newStartTime}–{m.newEndTime} • Prof. {m.originalAppointment.teacher.user.name}
                                </div>
                                <Badge
                                  variant={m.status === 'completed' ? 'secondary' : m.status === 'cancelled' ? 'destructive' : 'default'}
                                  className="mt-1 text-xs"
                                >
                                  {m.status === 'scheduled' ? 'Agendada' : m.status === 'completed' ? 'Concluída' : 'Cancelada'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(!selectedDayInfo ||
                        (selectedDayInfo.appointments.length === 0 &&
                          selectedDayInfo.tests.length === 0 &&
                          selectedDayInfo.holidays.length === 0 &&
                          selectedDayInfo.recesses.length === 0 &&
                          selectedDayInfo.makeups.length === 0)) && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum evento neste dia.
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    Clique em um dia do calendário para ver os detalhes.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
