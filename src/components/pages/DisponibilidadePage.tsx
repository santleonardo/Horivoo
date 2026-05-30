'use client'

import { useEffect, useState, useCallback } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  CalendarClock,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  Info,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface AvailabilitySlot {
  id?: string
  weekday: number
  startTime: string
  endTime: string
}

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const DAYS_CONFIG = [
  { weekday: 1, label: 'Segunda-feira' },
  { weekday: 2, label: 'Terça-feira' },
  { weekday: 3, label: 'Quarta-feira' },
  { weekday: 4, label: 'Quinta-feira' },
  { weekday: 5, label: 'Sexta-feira' },
  { weekday: 6, label: 'Sábado' },
]

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export function DisponibilidadePage() {
  const { user, authFetch } = useAppStore()

  // Each day can have multiple time blocks
  const [daySlots, setDaySlots] = useState<Record<number, AvailabilitySlot[]>>(() => {
    const initial: Record<number, AvailabilitySlot[]> = {}
    for (const d of DAYS_CONFIG) {
      initial[d.weekday] = []
    }
    return initial
  })

  // Track which days are active (have at least one slot)
  const [activeDays, setActiveDays] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {}
    for (const d of DAYS_CONFIG) {
      initial[d.weekday] = false
    }
    return initial
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  /* ---- Load current availability ---- */
  const loadAvailability = useCallback(async () => {
    if (!user?.teacherId) return
    setLoading(true)
    try {
      const res = await authFetch(`/api/teachers/${user.teacherId}/availability`)
      if (!res.ok) {
        toast.error('Erro ao carregar disponibilidade')
        return
      }
      const data: AvailabilitySlot[] = await res.json()

      const newDaySlots: Record<number, AvailabilitySlot[]> = {}
      const newActiveDays: Record<number, boolean> = {}

      for (const d of DAYS_CONFIG) {
        newDaySlots[d.weekday] = []
        newActiveDays[d.weekday] = false
      }

      for (const slot of data) {
        const wd = slot.weekday
        if (!newDaySlots[wd]) newDaySlots[wd] = []
        newDaySlots[wd].push({
          id: slot.id,
          weekday: slot.weekday,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })
        newActiveDays[wd] = true
      }

      setDaySlots(newDaySlots)
      setActiveDays(newActiveDays)
    } catch {
      toast.error('Erro ao carregar disponibilidade')
    } finally {
      setLoading(false)
    }
  }, [user?.teacherId, authFetch])

  useEffect(() => {
    loadAvailability()
  }, [loadAvailability])

  /* ---- Toggle day active/inactive ---- */
  const toggleDay = (weekday: number, active: boolean) => {
    setActiveDays(prev => ({ ...prev, [weekday]: active }))
    if (active && daySlots[weekday].length === 0) {
      // Add a default slot when activating a day
      addSlot(weekday)
    }
    if (!active) {
      // Remove all slots when deactivating
      setDaySlots(prev => ({ ...prev, [weekday]: [] }))
    }
  }

  /* ---- Add time block to a day ---- */
  const addSlot = (weekday: number) => {
    setDaySlots(prev => ({
      ...prev,
      [weekday]: [
        ...prev[weekday],
        { weekday, startTime: '08:00', endTime: '12:00' },
      ],
    }))
  }

  /* ---- Remove time block from a day ---- */
  const removeSlot = (weekday: number, index: number) => {
    setDaySlots(prev => {
      const updated = [...prev[weekday]]
      updated.splice(index, 1)
      if (updated.length === 0) {
        setActiveDays(p => ({ ...p, [weekday]: false }))
      }
      return { ...prev, [weekday]: updated }
    })
  }

  /* ---- Update slot time ---- */
  const updateSlot = (weekday: number, index: number, field: 'startTime' | 'endTime', value: string) => {
    setDaySlots(prev => {
      const updated = [...prev[weekday]]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, [weekday]: updated }
    })
  }

  /* ---- Save availability ---- */
  const saveAvailability = async () => {
    if (!user?.teacherId) return

    // Collect all slots from active days
    const slots: { weekday: number; startTime: string; endTime: string }[] = []
    for (const d of DAYS_CONFIG) {
      if (activeDays[d.weekday]) {
        for (const slot of daySlots[d.weekday]) {
          if (slot.startTime && slot.endTime) {
            slots.push({
              weekday: slot.weekday,
              startTime: slot.startTime,
              endTime: slot.endTime,
            })
          }
        }
      }
    }

    // Validate: startTime < endTime for each slot
    for (const slot of slots) {
      if (slot.startTime >= slot.endTime) {
        toast.error(`Horário inválido: início (${slot.startTime}) deve ser anterior ao fim (${slot.endTime})`)
        return
      }
    }

    setSaving(true)
    try {
      const res = await authFetch(`/api/teachers/${user.teacherId}/availability`, {
        method: 'POST',
        body: JSON.stringify({ slots }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Erro ao salvar' }))
        throw new Error(errData.error || 'Erro ao salvar disponibilidade')
      }

      toast.success('Disponibilidade salva com sucesso!')
      // Reload to get the saved slots with IDs
      await loadAvailability()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar disponibilidade')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
          <span>Carregando disponibilidade...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <Card className="border-emerald-100">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-5 text-emerald-600" />
            <CardTitle className="text-lg">Meus Horários Disponíveis</CardTitle>
          </div>
          <CardDescription>
            Defina os dias e horários em que você está disponível para aulas.
            O coordenador só poderá agendar dentro desses horários.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Weekly schedule editor */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {DAYS_CONFIG.map(({ weekday, label }) => {
            const isActive = activeDays[weekday]
            const slots = daySlots[weekday] || []

            return (
              <div key={weekday} className="space-y-3">
                {/* Day header with toggle */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold min-w-[130px]">{label}</span>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={isActive}
                        onCheckedChange={(checked) => toggleDay(weekday, checked)}
                      />
                      <span className={`text-xs font-medium ${isActive ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Time blocks */}
                {isActive && (
                  <div className="pl-4 space-y-2">
                    {slots.map((slot, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Clock className="size-3.5 text-muted-foreground" />
                          <Input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => updateSlot(weekday, idx, 'startTime', e.target.value)}
                            className="w-28 h-8 text-sm"
                          />
                          <span className="text-muted-foreground text-sm">—</span>
                          <Input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => updateSlot(weekday, idx, 'endTime', e.target.value)}
                            className="w-28 h-8 text-sm"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeSlot(weekday, idx)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs mt-1"
                      onClick={() => addSlot(weekday)}
                    >
                      <Plus className="size-3 mr-1" />
                      Adicionar horário
                    </Button>
                  </div>
                )}

                <Separator />
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Visual weekly grid summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resumo da Disponibilidade</CardTitle>
          <CardDescription>Visão geral dos seus horários disponíveis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {DAYS_CONFIG.map(({ weekday, label }) => {
              const isActive = activeDays[weekday]
              const slots = daySlots[weekday] || []

              return (
                <div
                  key={weekday}
                  className={`p-3 rounded-lg border ${
                    isActive
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-muted bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{label}</span>
                    {isActive ? (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-700 border-emerald-200">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-gray-100 text-gray-500 border-gray-200">
                        Inativo
                      </Badge>
                    )}
                  </div>
                  {isActive && slots.length > 0 ? (
                    <div className="space-y-0.5">
                      {slots.map((slot, idx) => (
                        <p key={idx} className="text-sm text-emerald-700 font-medium">
                          {slot.startTime} - {slot.endTime}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sem horários definidos</p>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex items-center gap-4">
        <Button
          onClick={saveAvailability}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {saving ? (
            <>
              <Loader2 className="size-4 mr-1 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4 mr-1" />
              Salvar Disponibilidade
            </>
          )}
        </Button>
      </div>

      {/* Note */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
        <Info className="size-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800">
          O coordenador só pode agendar aulas dentro dos seus horários disponíveis.
          Certifique-se de manter sua disponibilidade atualizada.
        </p>
      </div>
    </div>
  )
}
