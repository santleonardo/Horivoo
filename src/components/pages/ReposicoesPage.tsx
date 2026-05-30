'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { Plus, CheckCircle, XCircle, Loader2, CalendarX, CalendarCheck } from 'lucide-react'

interface CancelledAppointment {
  id: string
  date: string
  startTime: string
  endTime: string
  classId: string
  teacherId: string
  studentId: string | null
  status: string
  class: { id: string; name: string; subject: string }
  teacher: { id: string; user: { name: string } }
  student: { id: string; user: { name: string } } | null
  makeUpClasses: { id: string }[]
}

interface MakeUpClass {
  id: string
  originalAppointmentId: string
  newDate: string
  newStartTime: string
  newEndTime: string
  status: string
  originalAppointment: {
    id: string
    date: string
    startTime: string
    endTime: string
    class: { id: string; name: string; subject: string }
    teacher: { id: string; user: { name: string } }
    student: { id: string; user: { name: string } } | null
  }
}

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  scheduled: { label: 'Agendada', variant: 'default' },
  completed: { label: 'Concluída', variant: 'secondary' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
}

export default function ReposicoesPage() {
  const { authFetch } = useAppStore()
  const { toast } = useToast()

  const [cancelledAppointments, setCancelledAppointments] = useState<CancelledAppointment[]>([])
  const [makeUpClasses, setMakeUpClasses] = useState<MakeUpClass[]>([])
  const [loading, setLoading] = useState(true)

  // Create makeup dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState('')
  const [createForm, setCreateForm] = useState({ newDate: '', newStartTime: '', newEndTime: '' })
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [cancelledRes, makeupsRes] = await Promise.all([
        authFetch('/api/appointments?status=cancelled'),
        authFetch('/api/makeups'),
      ])

      if (cancelledRes.ok) {
        const cancelled = await cancelledRes.json()
        // Filter: only those without a makeup class
        const withoutMakeup = cancelled.filter(
          (a: CancelledAppointment) => !a.makeUpClasses || a.makeUpClasses.length === 0
        )
        setCancelledAppointments(withoutMakeup)
      }

      if (makeupsRes.ok) {
        setMakeUpClasses(await makeupsRes.json())
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao carregar dados.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [authFetch, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openCreateMakeup = (appointmentId?: string) => {
    setSelectedAppointment(appointmentId || '')
    setCreateForm({ newDate: '', newStartTime: '', newEndTime: '' })
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    if (!selectedAppointment || !createForm.newDate || !createForm.newStartTime || !createForm.newEndTime) {
      toast({ title: 'Erro', description: 'Preencha todos os campos.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await authFetch('/api/makeups', {
        method: 'POST',
        body: JSON.stringify({
          originalAppointmentId: selectedAppointment,
          ...createForm,
        }),
      })
      if (res.ok) {
        toast({ title: 'Sucesso', description: 'Reposição criada com sucesso!' })
        setCreateOpen(false)
        setLoading(true)
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Erro', description: data.error || 'Falha ao criar reposição.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao criar reposição.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const updateMakeupStatus = async (id: string, status: string) => {
    try {
      const res = await authFetch(`/api/makeups/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        const actionLabel = status === 'completed' ? 'concluída' : 'cancelada'
        toast({ title: 'Sucesso', description: `Reposição marcada como ${actionLabel}.` })
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Erro', description: data.error || 'Falha ao atualizar reposição.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao atualizar reposição.', variant: 'destructive' })
    }
  }

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reposições</h2>
          <p className="text-muted-foreground">Gerencie as reposições de aulas canceladas.</p>
        </div>
        <Button onClick={() => openCreateMakeup()}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Reposição
        </Button>
      </div>

      {/* Section 1: Cancelled without makeup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarX className="h-5 w-5 text-destructive" />
            Aulas Canceladas sem Reposição
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cancelledAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma aula cancelada pendente de reposição.
            </p>
          ) : (
            <div className="space-y-3">
              {cancelledAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {formatDate(appt.date)} • {appt.startTime}–{appt.endTime}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {appt.class.name}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Professor: {appt.teacher.user.name}
                      {appt.student && ` • Aluno: ${appt.student.user.name}`}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => openCreateMakeup(appt.id)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Criar Reposição
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Section 2: Scheduled makeups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarCheck className="h-5 w-5 text-emerald-600" />
            Reposições Agendadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {makeUpClasses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma reposição agendada.
            </p>
          ) : (
            <div className="space-y-3">
              {makeUpClasses.map((mu) => {
                const st = statusMap[mu.status] || { label: mu.status, variant: 'outline' as const }
                const original = mu.originalAppointment
                const isScheduled = mu.status === 'scheduled'

                return (
                  <div
                    key={mu.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(original.date)} {original.startTime}–{original.endTime}
                        </span>
                        <span className="text-sm font-medium">→</span>
                        <span className="font-medium text-sm">
                          {formatDate(mu.newDate)} {mu.newStartTime}–{mu.newEndTime}
                        </span>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Professor: {original.teacher.user.name}
                        {original.student && ` • Aluno: ${original.student.user.name}`}
                        {' • '}
                        Turma: {original.class.name}
                      </div>
                    </div>
                    {isScheduled && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateMakeupStatus(mu.id, 'completed')}
                          title="Marcar como concluída"
                        >
                          <CheckCircle className="h-4 w-4 mr-1 text-emerald-600" />
                          Concluir
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateMakeupStatus(mu.id, 'cancelled')}
                          title="Cancelar reposição"
                        >
                          <XCircle className="h-4 w-4 mr-1 text-destructive" />
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Makeup Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Reposição</DialogTitle>
            <DialogDescription>Agende uma reposição para uma aula cancelada.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Aula Cancelada</Label>
              <Select
                value={selectedAppointment}
                onValueChange={setSelectedAppointment}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a aula cancelada" />
                </SelectTrigger>
                <SelectContent>
                  {cancelledAppointments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {formatDate(a.date)} {a.startTime}–{a.endTime} — {a.class.name} — {a.teacher.user.name}
                      {a.student ? ` — ${a.student.user.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="makeup-date">Nova Data</Label>
              <Input
                id="makeup-date"
                type="date"
                value={createForm.newDate}
                onChange={(e) => setCreateForm({ ...createForm, newDate: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="makeup-start">Horário Início</Label>
                <Input
                  id="makeup-start"
                  type="time"
                  value={createForm.newStartTime}
                  onChange={(e) => setCreateForm({ ...createForm, newStartTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="makeup-end">Horário Fim</Label>
                <Input
                  id="makeup-end"
                  type="time"
                  value={createForm.newEndTime}
                  onChange={(e) => setCreateForm({ ...createForm, newEndTime: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Reposição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
