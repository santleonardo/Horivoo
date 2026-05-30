'use client';

/**
 * DisponibilidadePage.tsx
 * Módulo principal do professor: "Meus Horários Disponíveis"
 * Gerencia disponibilidade semanal e bloqueios temporários.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore, authFetch } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CalendarClock,
  Plus,
  Trash2,
  Loader2,
  Info,
  ShieldOff,
  Clock,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/* ------------------------------------------------------------------ */

interface AvailableSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface BlockedSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  teacherId: string;
}

const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/* ------------------------------------------------------------------ */

export function DisponibilidadePage() {
  const { user } = useAuthStore();
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Available slots
  const [slots, setSlots] = useState<AvailableSlot[]>([]);

  // Blocked slots
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);

  // Add availability dialog
  const [addSlotOpen, setAddSlotOpen] = useState(false);
  const [slotDay, setSlotDay] = useState('1');
  const [slotStart, setSlotStart] = useState('08:00');
  const [slotEnd, setSlotEnd] = useState('09:00');
  const [slotSubmitting, setSlotSubmitting] = useState(false);

  // Add blocked slot dialog
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [blockDate, setBlockDate] = useState('');
  const [blockStart, setBlockStart] = useState('08:00');
  const [blockEnd, setBlockEnd] = useState('09:00');
  const [blockReason, setBlockReason] = useState('');
  const [blockSubmitting, setBlockSubmitting] = useState(false);

  /* ---- Find teacher profile ---- */
  useEffect(() => {
    if (!user) return;

    if (user.teacherId) {
      setTeacherId(user.teacherId);
      return;
    }

    authFetch('/api/teachers')
      .then(r => r.json())
      .then(data => {
        const teachers: Array<{ id: string; name: string; email: string }> = data.teachers || [];
        const mine = teachers.find(t => t.email === user.email || t.name === user.name);
        if (mine) {
          setTeacherId(mine.id);
        } else {
          setError('Perfil de professor não encontrado. Contate o coordenador.');
        }
      })
      .catch(() => setError('Erro ao carregar perfil de professor.'))
      .finally(() => setLoading(false));
  }, [user]);

  /* ---- Load available slots ---- */
  const loadSlots = useCallback(async () => {
    if (!teacherId) return;
    try {
      const res = await authFetch(`/api/teachers/${teacherId}/available-slots`);
      const data = await res.json();
      setSlots(data.slots || []);
    } catch {
      toast.error('Erro ao carregar horários disponíveis');
    }
  }, [teacherId]);

  /* ---- Load blocked slots ---- */
  const loadBlocked = useCallback(async () => {
    if (!teacherId) return;
    try {
      const res = await authFetch(`/api/blocked-slots?teacherId=${teacherId}`);
      const data = await res.json();
      setBlockedSlots(data.blockedSlots || []);
    } catch {
      toast.error('Erro ao carregar bloqueios');
    }
  }, [teacherId]);

  useEffect(() => {
    if (teacherId) {
      Promise.all([loadSlots(), loadBlocked()]).finally(() => setLoading(false));
    }
  }, [teacherId, loadSlots, loadBlocked]);

  /* ---- Group slots by day ---- */
  const slotsByDay = slots.reduce<Record<number, AvailableSlot[]>>((acc, s) => {
    if (!acc[s.dayOfWeek]) acc[s.dayOfWeek] = [];
    acc[s.dayOfWeek].push(s);
    return acc;
  }, {});

  /* ---- Add availability ---- */
  const handleAddSlot = async () => {
    if (!teacherId) return;
    if (!slotStart || !slotEnd) {
      toast.error('Preencha os horários');
      return;
    }
    if (slotStart >= slotEnd) {
      toast.error('Horário de início deve ser anterior ao de fim');
      return;
    }

    setSlotSubmitting(true);
    try {
      const res = await authFetch(`/api/teachers/${teacherId}/available-slots`, {
        method: 'POST',
        body: JSON.stringify({ dayOfWeek: parseInt(slotDay), startTime: slotStart, endTime: slotEnd }),
      });
      if (!res.ok) throw new Error();
      toast.success('Horário adicionado com sucesso');
      setAddSlotOpen(false);
      loadSlots();
    } catch {
      toast.error('Erro ao adicionar horário');
    } finally {
      setSlotSubmitting(false);
    }
  };

  /* ---- Remove availability ---- */
  const handleRemoveSlot = async (slotId: string) => {
    if (!teacherId) return;
    if (!confirm('Remover este horário disponível?')) return;
    try {
      const res = await authFetch(`/api/teachers/${teacherId}/available-slots?slotId=${slotId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      toast.success('Horário removido');
      loadSlots();
    } catch {
      toast.error('Erro ao remover horário');
    }
  };

  /* ---- Add blocked slot ---- */
  const handleAddBlock = async () => {
    if (!teacherId) return;
    if (!blockDate || !blockStart || !blockEnd) {
      toast.error('Preencha todos os campos');
      return;
    }

    setBlockSubmitting(true);
    try {
      const res = await authFetch('/api/blocked-slots', {
        method: 'POST',
        body: JSON.stringify({
          teacherId,
          date: blockDate,
          startTime: blockStart,
          endTime: blockEnd,
          reason: blockReason || 'Indisponível',
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Período bloqueado com sucesso');
      setAddBlockOpen(false);
      setBlockDate('');
      setBlockStart('08:00');
      setBlockEnd('09:00');
      setBlockReason('');
      loadBlocked();
    } catch {
      toast.error('Erro ao bloquear período');
    } finally {
      setBlockSubmitting(false);
    }
  };

  /* ---- Remove blocked slot ---- */
  const handleRemoveBlock = async (blockId: string) => {
    if (!confirm('Desbloquear este período?')) return;
    try {
      const res = await authFetch(`/api/blocked-slots/${blockId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Período desbloqueado');
      loadBlocked();
    } catch {
      toast.error('Erro ao desbloquear período');
    }
  };

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-60 text-muted-foreground">
        <Loader2 className="size-6 animate-spin mr-2" />
        Carregando disponibilidade...
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Info className="size-12 mx-auto mb-3 text-amber-500" />
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  /* ---- Upcoming blocks (future only) ---- */
  const today = format(new Date(), 'yyyy-MM-dd');
  const upcomingBlocks = blockedSlots.filter(b => b.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const pastBlocks = blockedSlots.filter(b => b.date < today).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-emerald-100">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="size-5 text-emerald-600" />
              <CardTitle className="text-lg">Meus Horários Disponíveis</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setAddSlotOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="size-4 mr-1" />
                Adicionar Horário
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAddBlockOpen(true)}>
                <ShieldOff className="size-4 mr-1" />
                Bloquear Período
              </Button>
            </div>
          </div>
          <CardDescription>
            Defina os dias e horários em que você está disponível para aulas.
            O coordenador só poderá agendar dentro desses horários.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Availability by day */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="size-4 text-emerald-600" />
            Disponibilidade Semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(slotsByDay).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarClock className="size-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum horário disponível cadastrado</p>
              <p className="text-xs mt-1">Clique em "Adicionar Horário" para começar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(day => slotsByDay[day] && (
                <div key={day} className="p-4 rounded-lg bg-muted/30 border">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-emerald-700">{dayNames[day]}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {slotsByDay[day].length} horário{slotsByDay[day].length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {slotsByDay[day]
                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                      .map(slot => (
                        <Badge key={slot.id} variant="outline" className="text-sm py-1 px-3 gap-1 border-emerald-200 bg-emerald-50/50">
                          <Clock className="size-3 text-emerald-600" />
                          {slot.startTime} - {slot.endTime}
                          <button
                            onClick={() => handleRemoveSlot(slot.id)}
                            className="ml-1 hover:text-red-600 transition-colors"
                            title="Remover horário"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </Badge>
                      ))}
                  </div>
                </div>
              ))}
              {/* Saturday and Sunday if present */}
              {[0, 6].map(day => slotsByDay[day] && (
                <div key={day} className="p-4 rounded-lg bg-muted/30 border">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-emerald-700">{dayNames[day]}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {slotsByDay[day].length} horário{slotsByDay[day].length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {slotsByDay[day]
                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                      .map(slot => (
                        <Badge key={slot.id} variant="outline" className="text-sm py-1 px-3 gap-1 border-emerald-200 bg-emerald-50/50">
                          <Clock className="size-3 text-emerald-600" />
                          {slot.startTime} - {slot.endTime}
                          <button
                            onClick={() => handleRemoveSlot(slot.id)}
                            className="ml-1 hover:text-red-600 transition-colors"
                            title="Remover horário"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </Badge>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blocked periods */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldOff className="size-4 text-red-600" />
            Períodos Bloqueados
          </CardTitle>
          <CardDescription>Indisponibilidades temporárias (feriados pessoais, compromissos, etc.)</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingBlocks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum período bloqueado
            </p>
          ) : (
            <div className="space-y-2">
              {upcomingBlocks.map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50/50 border border-red-100 text-sm">
                  <div className="flex items-center gap-3">
                    <ShieldOff className="size-4 text-red-500 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {format(parseISO(b.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                        <Badge variant="outline" className="text-xs">{b.startTime} - {b.endTime}</Badge>
                      </div>
                      {b.reason && (
                        <p className="text-xs text-muted-foreground mt-0.5">{b.reason}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleRemoveBlock(b.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {pastBlocks.length > 0 && (
            <details className="mt-4">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Bloqueios passados ({pastBlocks.length})
              </summary>
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {pastBlocks.map(b => (
                  <div key={b.id} className="flex items-center gap-2 p-2 rounded text-xs text-muted-foreground">
                    <span>{format(parseISO(b.date), 'dd/MM/yyyy')}</span>
                    <span>{b.startTime}-{b.endTime}</span>
                    {b.reason && <span>• {b.reason}</span>}
                  </div>
                ))}
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      {/* Add Availability Dialog */}
      <Dialog open={addSlotOpen} onOpenChange={setAddSlotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-emerald-600" />
              Adicionar Horário Disponível
            </DialogTitle>
            <DialogDescription>Defina um novo horário em que você estará disponível para aulas</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Dia da Semana *</Label>
              <Select value={slotDay} onValueChange={setSlotDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayNames.map((name, i) => (
                    <SelectItem key={i} value={String(i)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Horário Início *</Label>
                <Input type="time" value={slotStart} onChange={e => setSlotStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Horário Fim *</Label>
                <Input type="time" value={slotEnd} onChange={e => setSlotEnd(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSlotOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleAddSlot}
              disabled={slotSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {slotSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Blocked Period Dialog */}
      <Dialog open={addBlockOpen} onOpenChange={setAddBlockOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldOff className="size-5 text-red-600" />
              Bloquear Período
            </DialogTitle>
            <DialogDescription>Adicione uma indisponibilidade temporária</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                type="date"
                value={blockDate}
                onChange={e => setBlockDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Horário Início *</Label>
                <Input type="time" value={blockStart} onChange={e => setBlockStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Horário Fim *</Label>
                <Input type="time" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input
                placeholder="Ex: Compromisso pessoal, consulta médica..."
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddBlockOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleAddBlock}
              disabled={blockSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {blockSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
              Bloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
