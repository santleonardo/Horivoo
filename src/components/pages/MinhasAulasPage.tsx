'use client'

import { useEffect, useState, useMemo } from 'react'
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
import {
  CalendarDays,
  Clock,
  User,
  BookOpen,
  FileText,
  XCircle,
  CheckCircle2,
  Loader2,
  GraduationCap,
  AlertTriangle,
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

interface ClassData {
  id: string
  name: string
  subject: string
  teacherId: string
  teacher: { id: string; userId: string; user: { id: string; name: string; email: string } }
  classStudents: { id: string; classId: string; studentId: string; student: { id: string; userId: string; user: { id: string; name: string; email: string } } }[]
}

interface TestData {
  id: string
  classId: string
  title: string
  date: string
  class: { id: string; name: string; subject: string }
}

interface AttendanceData {
  id: string
  studentId: string
  appointmentId: string
  status: string
  appointment: {
    id: string
    date: string
    startTime: string
    endTime: string
    class: { id: string; name: string; subject: string }
    teacher: { id: string; user: { id: string; name: string } }
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

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

function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  return formatDateKey(monday)
}

function getWeekEnd(): string {
  const now = new Date()
  const day = now.getDay()
  const saturdayOffset = day === 0 ? 0 : 6 - day
  const saturday = new Date(now)
  saturday.setDate(now.getDate() + saturdayOffset)
  return formatDateKey(saturday)
}

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export function MinhasAulasPage() {
  const { user, authFetch } = useAppStore()

  const [appointments, setAppointments] = useState<AppointmentData[]>([])
  const [classes, setClasses] = useState<ClassData[]>([])
  const [tests, setTests] = useState<TestData[]>([])
  const [attendance, setAttendance] = useState<AttendanceData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.studentId) return
    setLoading(true)

    async function loadData() {
      try {
        // Fetch appointments for this student (future ones)
        const today = formatDateKey(new Date())
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + 90)
        const future = formatDateKey(futureDate)

        const [apptsRes, classesRes, attendanceRes] = await Promise.all([
          authFetch(`/api/appointments?studentId=${user.studentId}&from=${today}&to=${future}`),
          authFetch('/api/classes'),
          authFetch(`/api/attendance?studentId=${user.studentId}`),
        ])

        if (apptsRes.ok) {
          const data = await apptsRes.json()
          setAppointments(Array.isArray(data) ? data : [])
        }
        if (classesRes.ok) {
          const data = await classesRes.json()
          setClasses(Array.isArray(data) ? data : [])
        }
        if (attendanceRes.ok) {
          const data = await attendanceRes.json()
          setAttendance(Array.isArray(data) ? data : [])
        }

        // Fetch tests for student's classes (after classes are loaded)
        // We need to get the classIds first
        const classData: ClassData[] = classesRes.ok ? await classesRes.json() : []
        const studentClassIds = classData
          .filter((cls: ClassData) =>
            cls.classStudents?.some(cs => cs.studentId === user.studentId)
          )
          .map((cls: ClassData) => cls.id)

        if (studentClassIds.length > 0) {
          // Fetch tests for each class
          const testPromises = studentClassIds.map(classId =>
            authFetch(`/api/tests?classId=${classId}`).then(r => r.ok ? r.json() : [])
          )
          const testResults = await Promise.all(testPromises)
          const allTests = testResults.flat()
          // Filter upcoming tests
          const todayStr = formatDateKey(new Date())
          setTests(allTests.filter((t: TestData) => t.date >= todayStr))
        }
      } catch {
        toast.error('Erro ao carregar suas aulas')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user?.studentId, authFetch])

  /* ---- Student's enrolled classes ---- */
  const myClasses = useMemo(() => {
    if (!user?.studentId) return []
    return classes.filter(cls =>
      cls.classStudents?.some(cs => cs.studentId === user.studentId)
    )
  }, [classes, user?.studentId])

  /* ---- Group appointments ---- */
  const today = formatDateKey(new Date())
  const weekStart = getWeekStart()
  const weekEnd = getWeekEnd()

  const todayAppointments = useMemo(() =>
    appointments.filter(a => a.date === today && a.status !== 'cancelled')
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [appointments, today]
  )

  const thisWeekAppointments = useMemo(() =>
    appointments.filter(a =>
      a.date > today &&
      a.date >= weekStart &&
      a.date <= weekEnd &&
      a.status !== 'cancelled'
    ).sort((a, b) => a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)),
    [appointments, today, weekStart, weekEnd]
  )

  const futureAppointments = useMemo(() =>
    appointments.filter(a =>
      a.date > weekEnd &&
      a.status !== 'cancelled'
    ).sort((a, b) => a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)),
    [appointments, weekEnd]
  )

  /* ---- Absence count ---- */
  const absenceCount = useMemo(() =>
    attendance.filter(a => a.status === 'absent').length,
    [attendance]
  )

  /* ---- Upcoming tests sorted ---- */
  const upcomingTests = useMemo(() =>
    [...tests].sort((a, b) => a.date.localeCompare(b.date)),
    [tests]
  )

  /* ---- Render appointment item ---- */
  const renderAppointmentItem = (appt: AppointmentData, showDate?: boolean) => {
    const isToday = appt.date === today

    return (
      <div
        key={appt.id}
        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
          isToday
            ? 'border-emerald-200 bg-emerald-50/40'
            : 'border-border hover:bg-muted/30'
        }`}
      >
        <div className="mt-0.5 p-1.5 rounded-md bg-emerald-100 text-emerald-700">
          <BookOpen className="size-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-sm">{appt.class.name}</span>
            {isToday && (
              <Badge className="text-[10px] px-1.5 py-0 h-4 bg-emerald-600 text-white">
                Hoje
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
            {showDate && (
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3" />
                {formatDateBR(appt.date)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {appt.startTime} - {appt.endTime}
            </span>
            <span className="flex items-center gap-1">
              <User className="size-3" />
              Prof. {appt.teacher?.user?.name || '—'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
          <span>Carregando suas aulas...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Minhas Aulas</h1>
        <p className="text-sm text-muted-foreground">Acompanhe suas aulas e informações acadêmicas</p>
      </div>

      {/* Minhas Próximas Aulas card */}
      <Card className="border-emerald-100">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5 text-emerald-600" />
            <CardTitle className="text-base">Minhas Próximas Aulas</CardTitle>
          </div>
          <CardDescription>
            {todayAppointments.length > 0
              ? `Você tem ${todayAppointments.length} aula${todayAppointments.length > 1 ? 's' : ''} hoje!`
              : 'Nenhuma aula hoje'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hoje */}
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-700 uppercase tracking-wide">
              <CalendarDays className="size-4" />
              Hoje
              <Badge variant="secondary" className="ml-1 text-xs">{todayAppointments.length}</Badge>
            </h3>
            {todayAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 pl-6">Nenhuma aula hoje.</p>
            ) : (
              <div className="space-y-2">
                {todayAppointments.map(appt => renderAppointmentItem(appt))}
              </div>
            )}
          </div>

          <Separator />

          {/* Esta Semana */}
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-700 uppercase tracking-wide">
              <Clock className="size-4" />
              Esta Semana
              <Badge variant="secondary" className="ml-1 text-xs">{thisWeekAppointments.length}</Badge>
            </h3>
            {thisWeekAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 pl-6">Nenhuma aula esta semana.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {thisWeekAppointments.map(appt => renderAppointmentItem(appt, true))}
              </div>
            )}
          </div>

          <Separator />

          {/* Próximas */}
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              <BookOpen className="size-4" />
              Próximas
              <Badge variant="secondary" className="ml-1 text-xs">{futureAppointments.length}</Badge>
            </h3>
            {futureAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 pl-6">Nenhuma aula futura além desta semana.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {futureAppointments.map(appt => renderAppointmentItem(appt, true))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Minha Turma */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-5 text-emerald-600" />
            <CardTitle className="text-base">Minha Turma</CardTitle>
          </div>
          <CardDescription>Informações das turmas em que você está matriculado</CardDescription>
        </CardHeader>
        <CardContent>
          {myClasses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Você ainda não está matriculado em nenhuma turma.
            </p>
          ) : (
            <div className="space-y-3">
              {myClasses.map(cls => (
                <div key={cls.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="mt-0.5 p-1.5 rounded-md bg-emerald-100 text-emerald-700">
                    <School className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{cls.name}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="size-3" />
                        {cls.subject}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="size-3" />
                        Prof. {cls.teacher?.user?.name || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agenda de Provas */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-amber-600" />
            <CardTitle className="text-base">Agenda de Provas</CardTitle>
          </div>
          <CardDescription>Próximas provas agendadas</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingTests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma prova agendada.
            </p>
          ) : (
            <div className="space-y-2">
              {upcomingTests.map(test => (
                <div key={test.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="mt-0.5 p-1.5 rounded-md bg-amber-100 text-amber-700">
                    <FileText className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{test.title}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="size-3" />
                        {formatDateBR(test.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="size-3" />
                        {test.class?.name || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Minhas Faltas */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <XCircle className="size-5 text-red-500" />
            <CardTitle className="text-base">Minhas Faltas</CardTitle>
          </div>
          <CardDescription>Contagem de faltas registradas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center size-16 rounded-full bg-red-50 border-2 border-red-200">
              <span className="text-2xl font-bold text-red-600">{absenceCount}</span>
            </div>
            <div>
              <p className="text-sm font-medium">
                {absenceCount === 0
                  ? 'Nenhuma falta registrada'
                  : `${absenceCount} falta${absenceCount > 1 ? 's' : ''} registrada${absenceCount > 1 ? 's' : ''}`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Total de presenças: {attendance.filter(a => a.status === 'present').length} |
                Atrasos: {attendance.filter(a => a.status === 'late').length}
              </p>
            </div>
          </div>

          {absenceCount > 0 && (
            <div className="mt-4 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Últimas faltas</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {attendance
                  .filter(a => a.status === 'absent')
                  .slice(0, 5)
                  .map(a => (
                    <div key={a.id} className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                      <XCircle className="size-3 text-red-400" />
                      <span>{formatDateBR(a.appointment.date)}</span>
                      <span>-</span>
                      <span>{a.appointment.class?.name || '—'}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Extra icon (not in lucide main import)                               */
/* ------------------------------------------------------------------ */
function School({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  )
}
