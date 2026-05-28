'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore, authFetch } from '@/lib/store';
import { WeekGrid, type SlotInfo, type DaySchedule } from './WeekGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { format, startOfWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';



const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function TeacherPanel() {
  const { user } = useAuthStore();
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);
  const [slotModal, setSlotModal] = useState<{ day: DaySchedule; slot: SlotInfo } | null>(null);
  const [manageSlotsOpen, setManageSlotsOpen] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<{ id: string; dayOfWeek: number; startTime: string; endTime: string }[]>([]);
  const [newSlotDay, setNewSlotDay] = useState('1');
  const [newSlotStart, setNewSlotStart] = useState('08:00');
  const [newSlotEnd, setNewSlotEnd] = useState('09:00');
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [recurringBookings, setRecurringBookings] = useState<any[]>([]);
  const [newRecurring, setNewRecurring] = useState({ studentName: '', studentEmail: '', dayOfWeek: '1', startTime: '14:00', endTime: '15:00' });

  // Load teachers
  useEffect(() => {
    authFetch('/api/teachers').then(r => r.json()).then(data => {
      setTeachers(data.teachers || []);
      if (user?.role === 'teacher') {
        const myTeacher = data.teachers?.find((t: any) => t.name === user.name);
        if (myTeacher) setTeacherId(myTeacher.id);
      } else if (data.teachers?.length > 0) {
        setTeacherId(data.teachers[0].id);
      }
    });
  }, [user]);

  // Load schedule when teacher or week changes
  const loadSchedule = useCallback(async () => {
    if (!teacherId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/teachers/${teacherId}/schedule?weekStart=${weekStart}`);
      const data = await res.json();
      setSchedule(data.schedule || []);
    } catch { toast.error('Erro ao carregar agenda'); }
    setLoading(false);
  }, [teacherId, weekStart]);

  useEffect(() => {
    let cancelled = false;
    if (!teacherId) return;
    queueMicrotask(() => { if (!cancelled) setLoading(true); });
    authFetch(`/api/teachers/${teacherId}/schedule?weekStart=${weekStart}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) { setSchedule(data.schedule || []); setLoading(false); } })
      .catch(() => { if (!cancelled) { toast.error('Erro ao carregar agenda'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [teacherId, weekStart]);

  // Load available slots for management
  const loadAvailableSlots = useCallback(async () => {
    if (!teacherId) return;
    const res = await authFetch(`/api/teachers/${teacherId}/available-slots`);
    const data = await res.json();
    setAvailableSlots(data.slots || []);
  }, [teacherId]);

  // Load recurring bookings
  const loadRecurring = useCallback(async () => {
    if (!teacherId) return;
    const res = await authFetch(`/api/recurring-bookings?teacherId=${teacherId}`);
    const data = await res.json();
    setRecurringBookings(data.recurringBookings || []);
  }, [teacherId]);

  // Stats
  const totalAvailable = schedule.reduce((acc, d) => acc + d.slots.filter(s => s.status === 'available').length, 0);
  const totalBooked = schedule.reduce((acc, d) => acc + d.slots.filter(s => s.status === 'booked').length, 0);
  const totalBlocked = schedule.reduce((acc, d) => acc + d.slots.filter(s => s.status === 'blocked' || s.status === 'non_class_day').length, 0);

  // Handle slot click
  const handleSlotClick = async (day: DaySchedule, slot: SlotInfo) => {
    if (slot.status === 'available') {
      // Block the slot
      try {
        await authFetch('/api/blocked-slots', {
          method: 'POST',
          body: JSON.stringify({ teacherId, date: day.date, startTime: slot.startTime, endTime: slot.endTime, reason: 'pessoal' }),
        });
        toast.success(`Horário ${slot.startTime}-${slot.endTime} bloqueado`);
        loadSchedule();
      } catch { toast.error('Erro ao bloquear horário'); }
    } else if (slot.status === 'booked') {
      setSlotModal({ day, slot });
    } else if (slot.status === 'blocked') {
      // Find and unblock
      const res = await authFetch(`/api/blocked-slots?teacherId=${teacherId}&date=${day.date}`);
      const data = await res.json();
      const blocked = data.blockedSlots?.find((b: any) => b.startTime === slot.startTime && b.endTime === slot.endTime);
      if (blocked) {
        await authFetch(`/api/blocked-slots/${blocked.id}`, { method: 'DELETE' });
        toast.success('Horário desbloqueado');
        loadSchedule();
      }
    }
  };

  // Cancel booking
  const cancelBooking = async (bookingId: string) => {
    if (!confirm('Cancelar este agendamento?')) return;
    try {
      await authFetch(`/api/bookings/${bookingId}`, { method: 'DELETE' });
      toast.success('Agendamento cancelado');
      setSlotModal(null);
      loadSchedule();
    } catch { toast.error('Erro ao cancelar'); }
  };

  // Add available slot
  const addAvailableSlot = async () => {
    try {
      await authFetch(`/api/teachers/${teacherId}/available-slots`, {
        method: 'POST',
        body: JSON.stringify({ dayOfWeek: parseInt(newSlotDay), startTime: newSlotStart, endTime: newSlotEnd }),
      });
      toast.success('Horário adicionado');
      loadAvailableSlots();
      loadSchedule();
    } catch (err: any) { toast.error('Erro ao adicionar horário'); }
  };

  // Remove available slot
  const removeAvailableSlot = async (slotId: string) => {
    try {
      await authFetch(`/api/teachers/${teacherId}/available-slots`, {
        method: 'DELETE',
        body: JSON.stringify({ slotId }),
      });
      toast.success('Horário removido');
      loadAvailableSlots();
      loadSchedule();
    } catch { toast.error('Erro ao remover horário'); }
  };

  // Create recurring booking
  const createRecurring = async () => {
    try {
      await authFetch('/api/recurring-bookings', {
        method: 'POST',
        body: JSON.stringify({ teacherId, ...newRecurring, dayOfWeek: parseInt(newRecurring.dayOfWeek) }),
      });
      toast.success('Agendamento recorrente criado');
      setRecurringOpen(false);
      loadRecurring();
      loadSchedule();
    } catch { toast.error('Erro ao criar recorrente'); }
  };

  // Deactivate recurring
  const deactivateRecurring = async (id: string) => {
    await authFetch(`/api/recurring-bookings/${id}`, { method: 'DELETE' });
    toast.success('Agendamento recorrente desativado');
    loadRecurring();
    loadSchedule();
  };

  // Week navigation
  const prevWeek = () => {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() - 7);
    setWeekStart(format(d, 'yyyy-MM-dd'));
  };
  const nextWeek = () => {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() + 7);
    setWeekStart(format(d, 'yyyy-MM-dd'));
  };

  // Group available slots by day
  const slotsByDay = availableSlots.reduce((acc, s) => {
    if (!acc[s.dayOfWeek]) acc[s.dayOfWeek] = [];
    acc[s.dayOfWeek].push(s);
    return acc;
  }, {} as Record<number, typeof availableSlots>);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-700">{totalAvailable}</div>
            <div className="text-xs text-emerald-600">Disponíveis</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">{totalBooked}</div>
            <div className="text-xs text-blue-600">Agendados</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-700">{totalBlocked}</div>
            <div className="text-xs text-red-600">Bloqueados</div>
          </CardContent>
        </Card>
      </div>

      {/* Teacher selector + Week nav + Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {user?.role === 'coordinator' && (
          <Select value={teacherId || ''} onValueChange={setTeacherId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Professor" /></SelectTrigger>
            <SelectContent>
              {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={prevWeek}>←</Button>
          <span className="text-sm font-medium px-2">
            Semana de {new Date(weekStart + 'T12:00:00').toLocaleDateString('pt-BR')}
          </span>
          <Button variant="outline" size="sm" onClick={nextWeek}>→</Button>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={() => { loadAvailableSlots(); setManageSlotsOpen(true); }}>
            Gerenciar Horários
          </Button>
          <Button variant="outline" size="sm" onClick={() => { loadRecurring(); setRecurringOpen(true); }}>
            Recorrentes
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-200 inline-block"></span> Disponível</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200 inline-block"></span> Agendado</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block"></span> Bloqueado</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200 inline-block"></span> Sem aula</span>
      </div>

      {/* Week Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando agenda...</div>
      ) : (
        <WeekGrid schedule={schedule} mode="teacher" onSlotClick={handleSlotClick} />
      )}

      {/* Booking detail modal */}
      <Dialog open={!!slotModal} onOpenChange={() => setSlotModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendamento</DialogTitle>
          </DialogHeader>
          {slotModal && (
            <div className="space-y-3">
              <p className="text-sm"><strong>Data:</strong> {slotModal.day.date ? new Date(slotModal.day.date + 'T12:00:00').toLocaleDateString('pt-BR') : ''}</p>
              <p className="text-sm"><strong>Horário:</strong> {slotModal.slot.startTime}-{slotModal.slot.endTime}</p>
              <p className="text-sm"><strong>Aluno:</strong> {slotModal.slot.booking?.studentName || slotModal.slot.recurringBooking?.studentName || ''}</p>
              {slotModal.slot.booking?.studentEmail && (
                <p className="text-sm"><strong>E-mail:</strong> {slotModal.slot.booking.studentEmail}</p>
              )}
              {slotModal.slot.booking?.id && (
                <Button variant="destructive" onClick={() => cancelBooking(slotModal.slot.booking!.id)}>Cancelar agendamento</Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Available Slots Dialog */}
      <Dialog open={manageSlotsOpen} onOpenChange={setManageSlotsOpen}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Gerenciar Horários Disponíveis</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Defina os horários em que você atende. Apenas estes horários aparecerão como disponíveis para agendamento.</p>

            {/* Add new slot */}
            <div className="flex flex-wrap gap-2 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Dia</Label>
                <Select value={newSlotDay} onValueChange={setNewSlotDay}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAY_NAMES.map((d, i) => i > 0 && i < 6 ? <SelectItem key={i} value={String(i)}>{d}</SelectItem> : null)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Início</Label>
                <Input type="time" value={newSlotStart} onChange={e => setNewSlotStart(e.target.value)} className="w-28" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fim</Label>
                <Input type="time" value={newSlotEnd} onChange={e => setNewSlotEnd(e.target.value)} className="w-28" />
              </div>
              <Button size="sm" onClick={addAvailableSlot} className="bg-emerald-700 hover:bg-emerald-800">Adicionar</Button>
            </div>

            {/* Current slots by day */}
            <ScrollArea className="max-h-60">
              {[1,2,3,4,5].map(day => slotsByDay[day]?.length ? (
                <div key={day} className="mb-3">
                  <h4 className="text-sm font-semibold mb-1">{DAY_NAMES[day]}</h4>
                  <div className="flex flex-wrap gap-1">
                    {slotsByDay[day].map(s => (
                      <Badge key={s.id} variant="outline" className="gap-1">
                        {s.startTime}-{s.endTime}
                        <button onClick={() => removeAvailableSlot(s.id)} className="text-red-500 hover:text-red-700 ml-1">×</button>
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null)}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recurring Bookings Dialog */}
      <Dialog open={recurringOpen} onOpenChange={setRecurringOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Agendamentos Recorrentes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Novo agendamento recorrente</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Nome do aluno</Label>
                  <Input value={newRecurring.studentName} onChange={e => setNewRecurring({...newRecurring, studentName: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">E-mail (opcional)</Label>
                  <Input value={newRecurring.studentEmail} onChange={e => setNewRecurring({...newRecurring, studentEmail: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Dia da semana</Label>
                  <Select value={newRecurring.dayOfWeek} onValueChange={v => setNewRecurring({...newRecurring, dayOfWeek: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAY_NAMES.map((d, i) => i > 0 ? <SelectItem key={i} value={String(i)}>{d}</SelectItem> : null)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Horário</Label>
                  <div className="flex gap-1">
                    <Input type="time" value={newRecurring.startTime} onChange={e => setNewRecurring({...newRecurring, startTime: e.target.value})} className="w-24" />
                    <span className="self-center text-xs">-</span>
                    <Input type="time" value={newRecurring.endTime} onChange={e => setNewRecurring({...newRecurring, endTime: e.target.value})} className="w-24" />
                  </div>
                </div>
              </div>
              <Button size="sm" onClick={createRecurring} className="bg-emerald-700 hover:bg-emerald-800">Criar recorrente</Button>
            </div>
            <Separator />
            <div>
              <Label className="text-sm font-semibold">Recorrentes ativos</Label>
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {recurringBookings.filter(r => r.active).length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum agendamento recorrente.</p>
                )}
                {recurringBookings.filter(r => r.active).map(r => (
                  <div key={r.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                    <span>{r.studentName} — {DAY_NAMES[r.dayOfWeek]} {r.startTime}-{r.endTime}</span>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deactivateRecurring(r.id)}>Desativar</Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
