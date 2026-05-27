'use client';

import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/store';
import { WeekGrid, type SlotInfo, type DaySchedule } from './WeekGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfWeek } from 'date-fns';
import { toast } from 'sonner';



export function StudentPanel() {
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [teacherId, setTeacherId] = useState<string>('');
  const [teachers, setTeachers] = useState<{ id: string; name: string; availableSlots?: any[] }[]>([]);
  const [bookingModal, setBookingModal] = useState<{ day: DaySchedule; slot: SlotInfo } | null>(null);
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');

  useEffect(() => {
    authFetch('/api/teachers').then(r => r.json()).then(data => {
      const t = data.teachers || [];
      setTeachers(t);
      if (t.length > 0) setTeacherId(t[0].id);
    });
  }, []);

  const loadSchedule = useCallback(async () => {
    if (!teacherId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/teachers/${teacherId}/schedule?weekStart=${weekStart}`);
      const data = await res.json();
      setSchedule(data.schedule || []);
    } catch { toast.error('Erro ao carregar horários'); }
    setLoading(false);
  }, [teacherId, weekStart]);

  useEffect(() => {
    let cancelled = false;
    if (!teacherId) return;
    queueMicrotask(() => { if (!cancelled) setLoading(true); });
    authFetch(`/api/teachers/${teacherId}/schedule?weekStart=${weekStart}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) { setSchedule(data.schedule || []); setLoading(false); } })
      .catch(() => { if (!cancelled) { toast.error('Erro ao carregar horários'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [teacherId, weekStart]);

  const totalAvailable = schedule.reduce((acc, d) => acc + d.slots.filter(s => s.status === 'available').length, 0);

  const handleSlotClick = (day: DaySchedule, slot: SlotInfo) => {
    if (slot.status !== 'available') return;
    setBookingModal({ day, slot });
  };

  const confirmBooking = async () => {
    if (!bookingModal || !studentName) { toast.error('Informe seu nome'); return; }
    try {
      const res = await authFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          teacherId,
          studentName,
          studentEmail: studentEmail || undefined,
          date: bookingModal.day.date,
          startTime: bookingModal.slot.startTime,
          endTime: bookingModal.slot.endTime,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Erro ao agendar');
        return;
      }
      toast.success(`Agendado! ${bookingModal.slot.startTime}-${bookingModal.slot.endTime}`);
      setBookingModal(null);
      setStudentName('');
      setStudentEmail('');
      loadSchedule();
    } catch { toast.error('Erro ao agendar'); }
  };

  const prevWeek = () => { const d = new Date(weekStart + 'T12:00:00'); d.setDate(d.getDate() - 7); setWeekStart(format(d, 'yyyy-MM-dd')); };
  const nextWeek = () => { const d = new Date(weekStart + 'T12:00:00'); d.setDate(d.getDate() + 7); setWeekStart(format(d, 'yyyy-MM-dd')); };

  return (
    <div className="space-y-4">
      {/* Available count + Teacher select + Week nav */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Disponíveis:</span>
          <Badge className={totalAvailable > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
            {totalAvailable}
          </Badge>
        </div>
        <Select value={teacherId} onValueChange={setTeacherId}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Selecione o professor" /></SelectTrigger>
          <SelectContent>
            {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="outline" size="sm" onClick={prevWeek}>←</Button>
          <span className="text-sm font-medium px-2">{new Date(weekStart + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
          <Button variant="outline" size="sm" onClick={nextWeek}>→</Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-200 inline-block"></span> Disponível — clique para agendar</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200 inline-block"></span> Agendado</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block"></span> Bloqueado</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Buscando horários disponíveis...</div>
      ) : (
        <WeekGrid schedule={schedule} mode="student" onSlotClick={handleSlotClick} />
      )}

      {/* Booking modal */}
      <Dialog open={!!bookingModal} onOpenChange={() => setBookingModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Agendamento</DialogTitle>
          </DialogHeader>
          {bookingModal && (
            <div className="space-y-4">
              <div className="bg-emerald-50 p-3 rounded-lg text-center">
                <p className="font-semibold text-emerald-800">
                  {new Date(bookingModal.day.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <p className="text-emerald-700">{bookingModal.slot.startTime} — {bookingModal.slot.endTime}</p>
                <p className="text-sm text-emerald-600 mt-1">Professor: {teachers.find(t => t.id === teacherId)?.name}</p>
              </div>
              <div className="space-y-2">
                <Label>Seu nome *</Label>
                <Input value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Ex: Maria Souza" />
              </div>
              <div className="space-y-2">
                <Label>E-mail (opcional)</Label>
                <Input type="email" value={studentEmail} onChange={e => setStudentEmail(e.target.value)} placeholder="maria@email.com" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBookingModal(null)}>Cancelar</Button>
                <Button onClick={confirmBooking} className="bg-emerald-700 hover:bg-emerald-800">Confirmar Agendamento</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
