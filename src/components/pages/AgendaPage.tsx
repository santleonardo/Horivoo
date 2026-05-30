'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  GraduationCap,
  Users,
  BookOpen,
  AlertTriangle,
  Plus,
  Calendar as CalendarIcon,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

// Types
interface ClassItem {
  id: string
  name: string
  subject: string
  teacherId: string
  teacher: {
    id: string
    user: { name: string; email: string }
  }
  classStudents: Array<{
    id: string
    student: { id: string; user: { name: string } }
  }>
}

interface AvailabilitySlot {
  id: string
  weekday: number
  startTime: string
  endTime: string
}

interface AppointmentItem {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  notes: string
  recurringGroupId: string | null
  class: { id: string; name: string; subject: string }
  teacher: { id: string; user: { name: string } }
  student: { id: string; user: { name: string } } | null
}

interface HolidayItem {
  id: string
  name: string
  date: string
}

interface RecessItem {
  id: string
  startDate: string
  endDate: string
  description: string
}

type WizardStep = 1 | 2 | 3 | 4 | 5

const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const weekdayFullNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${d.getDate()} de ${monthNames[d.getMonth()]} de ${d.getFullYear()}`
}

function dateToString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function AgendaPage() {
  const { authFetch } = useAppStore()

  // Data
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [holidays, setHolidays] = useState<HolidayItem[]>([])
  const [recesses, setRecesses] = useState<RecessItem[]>([])
  const [appointments, setAppointments] = useState<AppointmentItem[]>([])
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([])
  const [loading, setLoading] = useState(true)

  // Wizard state
  const [step, setStep] = useState<WizardStep>(1)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ startTime: string; endTime: string } | null>(null)
  const [notes, setNotes] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringEndDate, setRecurringEndDate] = useState<Date | undefined>(undefined)
  const [creating, setCreating] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelAppointmentId, setCancelAppointmentId] = useState<string | null>(null)

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      const [classesRes, appointmentsRes, holidaysRes, recessesRes] = await Promise.all([
        authFetch('/api/classes'),
        authFetch('/api/appointments?from=' + dateToString(new Date())),
        authFetch('/api/holidays'),
        authFetch('/api/recesses'),
      ])

      if (classesRes.ok) setClasses(await classesRes.json())
      if (appointmentsRes.ok) setAppointments(await appointmentsRes.json())
      if (holidaysRes.ok) setHolidays(await holidaysRes.json())
      if (recessesRes.ok) setRecesses(await recessesRes.json())
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Derived state
  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId),
    [classes, selectedClassId]
  )

  const selectedTeacher = useMemo(
    () => selectedClass?.teacher ?? null,
    [selectedClass]
  )

  // Load teacher availability when class/teacher is selected
  useEffect(() => {
    if (selectedTeacher) {
      authFetch(`/api/teachers/${selectedTeacher.id}/availability`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setAvailability(data))
        .catch(() => setAvailability([]))
    } else {
      setAvailability([])
    }
  }, [selectedTeacher, authFetch])

  // Get available slots for the selected date
  const availableSlotsForDate = useMemo(() => {
    if (!selectedDate || availability.length === 0) return []

    const dayOfWeek = selectedDate.getDay()
    const dayAvailability = availability.filter((a) => a.weekday === dayOfWeek)

    if (dayAvailability.length === 0) return []

    const dateStr = dateToString(selectedDate)

    // Get booked slots for this teacher on this date
    const bookedSlots = appointments
      .filter(
        (apt) =>
          apt.teacher.id === selectedTeacher?.id &&
          apt.date === dateStr &&
          apt.status !== 'cancelled'
      )
      .map((apt) => ({ startTime: apt.startTime, endTime: apt.endTime }))

    // Generate 1-hour time slots from availability
    const slots: Array<{
      startTime: string
      endTime: string
      available: boolean
    }> = []

    dayAvailability.forEach((avail) => {
      const [startH, startM] = avail.startTime.split(':').map(Number)
      const [endH, endM] = avail.endTime.split(':').map(Number)

      const startMinutes = startH * 60 + startM
      const endMinutes = endH * 60 + endM

      // Generate 1-hour slots
      for (let mins = startMinutes; mins + 60 <= endMinutes; mins += 60) {
        const h = Math.floor(mins / 60)
        const m = mins % 60
        const slotStart = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        const slotEndH = Math.floor((mins + 60) / 60)
        const slotEndM = (mins + 60) % 60
        const slotEnd = `${String(slotEndH).padStart(2, '0')}:${String(slotEndM).padStart(2, '0')}`

        const isBooked = bookedSlots.some(
          (b) => b.startTime < slotEnd && b.endTime > slotStart
        )

        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          available: !isBooked,
        })
      }
    })

    return slots
  }, [selectedDate, availability, appointments, selectedTeacher])

  // Check if date is holiday or recess
  const getDateWarning = (date: Date): { type: 'holiday' | 'recess'; message: string } | null => {
    const dateStr = dateToString(date)

    const holiday = holidays.find((h) => h.date === dateStr)
    if (holiday) {
      return { type: 'holiday', message: `Feriado: ${holiday.name}` }
    }

    const recess = recesses.find(
      (r) => r.startDate <= dateStr && r.endDate >= dateStr
    )
    if (recess) {
      return { type: 'recess', message: `Recesso: ${recess.description}` }
    }

    return null
  }

  // Check if teacher is available on a given date
  const isTeacherAvailableOnDate = (date: Date): boolean => {
    const dayOfWeek = date.getDay()
    return availability.some((a) => a.weekday === dayOfWeek)
  }

  // Step navigation
  const canGoNext = (): boolean => {
    switch (step) {
      case 1:
        return !!selectedClassId
      case 2:
        return !!selectedTeacher
      case 3:
        return !!selectedDate && !getDateWarning(selectedDate)
      case 4:
        return !!selectedTimeSlot
      case 5:
        if (isRecurring && !recurringEndDate) return false
        return true
      default:
        return false
    }
  }

  const goNext = () => {
    if (step < 5 && canGoNext()) {
      setStep((step + 1) as WizardStep)
    }
  }

  const goBack = () => {
    if (step > 1) {
      setStep((step - 1) as WizardStep)
      if (step === 3) {
        setSelectedDate(undefined)
        setSelectedTimeSlot(null)
      }
      if (step === 4) {
        setSelectedTimeSlot(null)
      }
    }
  }

  const resetWizard = () => {
    setStep(1)
    setSelectedClassId('')
    setSelectedDate(undefined)
    setSelectedTimeSlot(null)
    setNotes('')
    setIsRecurring(false)
    setRecurringEndDate(undefined)
  }

  // Create appointment
  const handleCreateAppointment = async () => {
    if (!selectedClassId || !selectedTeacher || !selectedDate || !selectedTimeSlot) {
      toast.error('Preencha todos os campos obrigatórios.')
      return
    }

    setCreating(true)
    const dateStr = dateToString(selectedDate)

    try {
      if (isRecurring && recurringEndDate) {
        // Create recurring appointment
        const endDateStr = dateToString(recurringEndDate)
        const dayOfWeek = selectedDate.getDay()

        const res = await authFetch('/api/appointments/recurring', {
          method: 'POST',
          body: JSON.stringify({
            classId: selectedClassId,
            teacherId: selectedTeacher.id,
            dayOfWeek,
            startTime: selectedTimeSlot.startTime,
            endTime: selectedTimeSlot.endTime,
            startDate: dateStr,
            endDate: endDateStr,
            notes,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          toast.success(
            `Agendamento recorrente criado! ${data.created} aulas criadas${
              data.skipped > 0 ? `, ${data.skipped} datas puladas` : ''
            }.`
          )
          resetWizard()
          loadData()
        } else {
          const data = await res.json()
          toast.error(data.error || 'Erro ao criar agendamento recorrente.')
        }
      } else {
        // Create single appointment
        const res = await authFetch('/api/appointments', {
          method: 'POST',
          body: JSON.stringify({
            classId: selectedClassId,
            teacherId: selectedTeacher.id,
            date: dateStr,
            startTime: selectedTimeSlot.startTime,
            endTime: selectedTimeSlot.endTime,
            notes,
          }),
        })

        if (res.ok) {
          toast.success('Agendamento criado com sucesso!')
          resetWizard()
          loadData()
        } else {
          const data = await res.json()
          toast.error(data.error || 'Erro ao criar agendamento.')
        }
      }
    } catch {
      toast.error('Erro de conexão ao criar agendamento.')
    } finally {
      setCreating(false)
    }
  }

  // Cancel appointment
  const handleCancelAppointment = async () => {
    if (!cancelAppointmentId) return

    try {
      const res = await authFetch(`/api/appointments/${cancelAppointmentId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'cancelled' }),
      })
      if (res.ok) {
        toast.success('Agendamento cancelado com sucesso.')
        setCancelAppointmentId(null)
        setCancelOpen(false)
        loadData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao cancelar agendamento.')
      }
    } catch {
      toast.error('Erro de conexão ao cancelar agendamento.')
    }
  }

  // Today and this week's appointments
  const today = dateToString(new Date())
  const todayAppointments = appointments.filter((a) => a.date === today && a.status !== 'cancelled')

  const weekEnd = new Date()
  weekEnd.setDate(weekEnd.getDate() + 7)
  const weekEndStr = dateToString(weekEnd)
  const weekAppointments = appointments
    .filter((a) => a.date >= today && a.date <= weekEndStr && a.status !== 'cancelled')
    .sort((a, b) => a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date))

  // Step labels
  const stepLabels = [
    { num: 1, label: 'Turma' },
    { num: 2, label: 'Professor' },
    { num: 3, label: 'Data' },
    { num: 4, label: 'Horário' },
    { num: 5, label: 'Confirmar' },
  ]

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-emerald-600" />
            Agenda
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Crie e gerencie agendamentos de aulas
          </p>
        </div>
        <Button
          onClick={resetWizard}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Agendamento
        </Button>
      </div>

      {/* Wizard */}
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardHeader>
          <CardTitle className="text-lg">Novo Agendamento</CardTitle>
          <CardDescription>Siga os passos para criar um novo agendamento</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step Indicator */}
          <div className="flex items-center justify-between mb-8 px-2">
            {stepLabels.map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      step > s.num
                        ? 'bg-emerald-600 text-white'
                        : step === s.num
                        ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-600'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step > s.num ? <CheckCircle2 className="h-4 w-4" /> : s.num}
                  </div>
                  <span className="text-xs mt-1 text-muted-foreground hidden sm:block">
                    {s.label}
                  </span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div
                    className={`h-0.5 w-8 sm:w-16 mx-2 transition-colors ${
                      step > s.num ? 'bg-emerald-600' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1 - Selecionar Turma */}
          {step === 1 && (
            <div className="space-y-4 max-w-md">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                <BookOpen className="h-4 w-4" />
                Passo 1 — Selecionar Turma
              </div>
              <div className="grid gap-2">
                <Label>Turma</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} — {cls.subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedClass && (
                <div className="p-3 rounded-lg border bg-card space-y-1">
                  <p className="text-sm font-medium">{selectedClass.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Matéria: {selectedClass.subject}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Professor: {selectedClass.teacher.user.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Alunos: {selectedClass.classStudents.length}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2 - Selecionar Professor (auto-filled) */}
          {step === 2 && (
            <div className="space-y-4 max-w-md">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                <GraduationCap className="h-4 w-4" />
                Passo 2 — Selecionar Professor
              </div>
              {selectedTeacher ? (
                <div className="p-4 rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900">
                      <GraduationCap className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedTeacher.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedTeacher.user.email}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Professor definido automaticamente pela turma selecionada.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum professor associado à turma.
                </p>
              )}
            </div>
          )}

          {/* Step 3 - Selecionar Data */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                <CalendarIcon className="h-4 w-4" />
                Passo 3 — Selecionar Data
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-[280px] justify-start text-left font-normal gap-2"
                    >
                      <CalendarIcon className="h-4 w-4" />
                      {selectedDate
                        ? formatDateLong(dateToString(selectedDate))
                        : 'Selecione uma data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date)
                        setSelectedTimeSlot(null)
                      }}
                      disabled={(date) => {
                        const d = dateToString(date)
                        // Disable past dates
                        if (d < today) return true
                        // Disable if no availability on that day
                        if (!isTeacherAvailableOnDate(date)) return true
                        return false
                      }}
                      modifiers={{
                        holiday: (date) => {
                          const d = dateToString(date)
                          return holidays.some((h) => h.date === d)
                        },
                        recess: (date) => {
                          const d = dateToString(date)
                          return recesses.some(
                            (r) => r.startDate <= d && r.endDate >= d
                          )
                        },
                      }}
                    />
                  </PopoverContent>
                </Popover>

                {selectedDate && getDateWarning(selectedDate) && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 max-w-md">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        {getDateWarning(selectedDate)?.message}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Não é possível agendar nesta data.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {selectedDate && !getDateWarning(selectedDate) && (
                <div className="p-3 rounded-lg border bg-card space-y-1">
                  <p className="text-sm font-medium">
                    {weekdayFullNames[selectedDate.getDay()]},{' '}
                    {formatDateLong(dateToString(selectedDate))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {availableSlotsForDate.length > 0
                      ? `${availableSlotsForDate.filter((s) => s.available).length} horário(s) disponível(is)`
                      : 'Nenhum horário disponível nesta data'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4 - Selecionar Horário */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                <Clock className="h-4 w-4" />
                Passo 4 — Selecionar Horário
              </div>
              <p className="text-sm text-muted-foreground">
                Selecione um horário disponível para{' '}
                <strong>
                  {selectedDate && weekdayFullNames[selectedDate.getDay()]},{' '}
                  {selectedDate && formatDateLong(dateToString(selectedDate))}
                </strong>
              </p>

              {availableSlotsForDate.length === 0 ? (
                <div className="p-4 rounded-lg border bg-card text-center">
                  <p className="text-sm text-muted-foreground">
                    Nenhum horário disponível nesta data. O professor pode não ter
                    disponibilidade para este dia da semana.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {availableSlotsForDate.map((slot) => {
                    const isSelected =
                      selectedTimeSlot?.startTime === slot.startTime &&
                      selectedTimeSlot?.endTime === slot.endTime

                    return (
                      <button
                        key={slot.startTime}
                        onClick={() => {
                          if (slot.available) {
                            setSelectedTimeSlot({
                              startTime: slot.startTime,
                              endTime: slot.endTime,
                            })
                          }
                        }}
                        disabled={!slot.available}
                        className={`p-3 rounded-lg border text-center transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-500'
                            : slot.available
                            ? 'border-border hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 cursor-pointer'
                            : 'border-muted bg-muted/50 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <p className={`text-sm font-medium ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>
                          {slot.startTime} - {slot.endTime}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {slot.available ? 'Disponível' : 'Indisponível'}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 5 - Confirmar */}
          {step === 5 && (
            <div className="space-y-4 max-w-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                Passo 5 — Confirmar Agendamento
              </div>

              <div className="p-4 rounded-lg border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Turma</span>
                  <span className="text-sm font-medium">{selectedClass?.name}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Matéria</span>
                  <span className="text-sm font-medium">{selectedClass?.subject}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Professor</span>
                  <span className="text-sm font-medium">{selectedTeacher?.user.name}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Data</span>
                  <span className="text-sm font-medium">
                    {selectedDate && weekdayFullNames[selectedDate.getDay()]},{' '}
                    {selectedDate && formatDateLong(dateToString(selectedDate))}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Horário</span>
                  <span className="text-sm font-medium">
                    {selectedTimeSlot?.startTime} - {selectedTimeSlot?.endTime}
                  </span>
                </div>
                {isRecurring && recurringEndDate && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Recorrente até</span>
                      <span className="text-sm font-medium">
                        {formatDateLong(dateToString(recurringEndDate))}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Notes */}
              <div className="grid gap-2">
                <Label htmlFor="apt-notes">Observações</Label>
                <Textarea
                  id="apt-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações sobre o agendamento (opcional)"
                  rows={2}
                />
              </div>

              {/* Recurring option */}
              <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <Checkbox
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={(checked) => {
                    setIsRecurring(checked as boolean)
                    if (!checked) setRecurringEndDate(undefined)
                  }}
                />
                <div className="space-y-1">
                  <Label htmlFor="recurring" className="cursor-pointer">
                    Recorrente
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Criar agendamento semanal recorrente no mesmo dia e horário
                  </p>
                </div>
              </div>

              {isRecurring && (
                <div className="grid gap-2">
                  <Label>Data final da recorrência</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-[280px] justify-start text-left font-normal gap-2"
                      >
                        <CalendarIcon className="h-4 w-4" />
                        {recurringEndDate
                          ? formatDateLong(dateToString(recurringEndDate))
                          : 'Selecione a data final'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={recurringEndDate}
                        onSelect={setRecurringEndDate}
                        disabled={(date) => {
                          const d = dateToString(date)
                          if (d <= (selectedDate ? dateToString(selectedDate) : '')) return true
                          return false
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-4 border-t">
            <Button
              variant="outline"
              onClick={goBack}
              disabled={step === 1}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>

            <div className="flex items-center gap-2">
              {step < 5 ? (
                <Button
                  onClick={goNext}
                  disabled={!canGoNext()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreateAppointment}
                  disabled={creating || !canGoNext()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                  {creating ? 'Criando...' : 'Criar Agendamento'}
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-emerald-600" />
            Aulas de Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : todayAppointments.length > 0 ? (
            <div className="space-y-3">
              {todayAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors gap-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
                      <Clock className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-sm">
                        {apt.class.name} — {apt.class.subject}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>Prof. {apt.teacher.user.name}</span>
                        <span>{apt.startTime} - {apt.endTime}</span>
                        {apt.student && <span>Aluno: {apt.student.user.name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        apt.status === 'confirmed'
                          ? 'default'
                          : apt.status === 'completed'
                          ? 'secondary'
                          : 'destructive'
                      }
                      className="text-xs"
                    >
                      {apt.status === 'confirmed'
                        ? 'Confirmada'
                        : apt.status === 'completed'
                        ? 'Concluída'
                        : 'Cancelada'}
                    </Badge>
                    {apt.status === 'confirmed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCancelAppointmentId(apt.id)
                          setCancelOpen(true)
                        }}
                        className="text-destructive hover:text-destructive text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma aula agendada para hoje.
            </p>
          )}
        </CardContent>
      </Card>

      {/* This Week's Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-amber-600" />
            Próximos 7 Dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : weekAppointments.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {weekAppointments.map((apt) => {
                const aptDate = new Date(apt.date + 'T12:00:00')
                const isToday = apt.date === today

                return (
                  <div
                    key={apt.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border transition-colors gap-2 ${
                      isToday
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                        : 'bg-card hover:bg-accent/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          isToday
                            ? 'bg-emerald-100 dark:bg-emerald-900'
                            : 'bg-muted'
                        }`}
                      >
                        <CalendarDays
                          className={`h-4 w-4 ${
                            isToday ? 'text-emerald-600' : 'text-muted-foreground'
                          }`}
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">
                          {apt.class.name} — {apt.class.subject}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            {weekdayNames[aptDate.getDay()]}, {aptDate.getDate()}/{aptDate.getMonth() + 1}
                          </span>
                          <span>Prof. {apt.teacher.user.name}</span>
                          <span>{apt.startTime} - {apt.endTime}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          apt.status === 'confirmed'
                            ? 'default'
                            : apt.status === 'completed'
                            ? 'secondary'
                            : 'destructive'
                        }
                        className="text-xs"
                      >
                        {apt.status === 'confirmed'
                          ? 'Confirmada'
                          : apt.status === 'completed'
                          ? 'Concluída'
                          : 'Cancelada'}
                      </Badge>
                      {apt.recurringGroupId && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Users className="h-3 w-3" />
                          Recorrente
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma aula agendada para os próximos 7 dias.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Agendamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este agendamento? Esta ação pode ser
              revertida posteriormente alterando o status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelAppointmentId(null)}>
              Manter
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelAppointment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar Agendamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
