'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { SlotInfo } from './WeekGrid';
import { toast } from 'sonner';
import { Clock, User, BookOpen, Calendar, Repeat } from 'lucide-react';

interface AvailableSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  date: string;
  startTime: string;
  endTime: string;
  slot: SlotInfo;
  teacherId: string;
  teacherName?: string;
  mode: 'book' | 'view' | 'block' | 'unblock';
  onBooked?: () => void;
  onCancelled?: () => void;
  onBlocked?: () => void;
  onUnblocked?: () => void;
}

export default function BookingModal({
  open, onClose, date, startTime: initialStartTime, endTime: initialEndTime,
  slot, teacherId, teacherName, mode,
  onBooked, onCancelled, onBlocked, onUnblocked,
}: BookingModalProps) {

  const [studentName, setStudentName]       = useState('');
  const [studentEmail, setStudentEmail]     = useState('');
  const [selectedStartTime, setStart]       = useState(initialStartTime);
  const [selectedEndTime, setEnd]           = useState(initialEndTime);
  const [subject, setSubject]               = useState('');
  const [notes, setNotes]                   = useState('');
  const [isRecurring, setIsRecurring]       = useState(false);
  const [blockReason, setBlockReason]       = useState('');
  const [loading, setLoading]               = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots]     = useState(false);

  const dayOfWeek = new Date(date + 'T12:00:00').getDay();
  const DAY_NAMES = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];

  useEffect(() => {
    if (!open || mode !== 'book' || !teacherId) return;
    setLoadingSlots(true);
    fetch(`/api/teachers/${teacherId}/available-slots`)
      .then(r => r.json())
      .then(data => {
        const slots: AvailableSlot[] = (data.slots || []).filter(
          (s: AvailableSlot) => s.dayOfWeek === dayOfWeek
        );
        setAvailableSlots(slots);
        if (initialStartTime) {
          const m = slots.find(s => s.startTime === initialStartTime);
          if (m) { setStart(m.startTime); setEnd(m.endTime); }
          else if (slots.length > 0) { setStart(slots[0].startTime); setEnd(slots[0].endTime); }
        }
      })
      .catch(() => toast.error('Erro ao carregar horários'))
      .finally(() => setLoadingSlots(false));
  }, [open, mode, teacherId, date, dayOfWeek, initialStartTime]);

  useEffect(() => {
    if (!open) {
      setStudentName(''); setStudentEmail(''); setSubject('');
      setNotes(''); setBlockReason(''); setIsRecurring(false); setAvailableSlots([]);
      setStart(initialStartTime); setEnd(initialEndTime);
    }
  }, [open, initialStartTime, initialEndTime]);

  const formattedDate = (() => {
    try { return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' }); }
    catch { return date; }
  })();

  const handleBook = async () => {
    if (!studentName.trim()) { toast.error('Informe o nome do aluno'); return; }
    if (!selectedStartTime || !selectedEndTime) { toast.error('Selecione o horário'); return; }
    setLoading(true);
    try {
      const fullNotes = [
        subject ? `Matéria/Material: ${subject}` : '',
        notes   ? `Observações: ${notes}` : '',
      ].filter(Boolean).join('\n');

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId, studentName: studentName.trim(),
          studentEmail: studentEmail.trim() || null,
          date, startTime: selectedStartTime, endTime: selectedEndTime,
          notes: fullNotes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erro ao agendar'); return; }

      if (isRecurring) {
        await fetch('/api/recurring-bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teacherId, studentName: studentName.trim(),
            studentEmail: studentEmail.trim() || null,
            dayOfWeek, startTime: selectedStartTime, endTime: selectedEndTime,
          }),
        });
        toast.success(`Aula recorrente criada! Toda ${DAY_NAMES[dayOfWeek]} às ${selectedStartTime}`);
      } else {
        toast.success('Agendamento realizado com sucesso!');
      }
      onBooked?.(); onClose();
    } catch { toast.error('Erro ao agendar'); }
    finally { setLoading(false); }
  };

  const handleCancel = async () => {
    if (!slot.booking?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${slot.booking.id}`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Erro ao cancelar agendamento'); return; }
      toast.success('Agendamento cancelado!'); onCancelled?.(); onClose();
    } catch { toast.error('Erro ao cancelar agendamento'); }
    finally { setLoading(false); }
  };

  const handleBlock = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/blocked-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, date, startTime: selectedStartTime || initialStartTime, endTime: selectedEndTime || initialEndTime, reason: blockReason || null }),
      });
      if (!res.ok) { toast.error('Erro ao bloquear horário'); return; }
      toast.success('Horário bloqueado!'); onBlocked?.(); onClose();
    } catch { toast.error('Erro ao bloquear horário'); }
    finally { setLoading(false); }
  };

  const handleUnblock = async () => {
    if (!slot.blockedSlot?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/blocked-slots/${slot.blockedSlot.id}`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Erro ao desbloquear horário'); return; }
      toast.success('Horário desbloqueado!'); onUnblocked?.(); onClose();
    } catch { toast.error('Erro ao desbloquear horário'); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'book'    && <><Calendar className="size-5 text-emerald-600" />Agendar Aula</>}
            {mode === 'view'    && <><User className="size-5 text-blue-600" />Detalhes do Agendamento</>}
            {mode === 'block'   && <><Clock className="size-5 text-red-500" />Bloquear Horário</>}
            {mode === 'unblock' && <><Clock className="size-5 text-emerald-600" />Desbloquear Horário</>}
          </DialogTitle>
          <DialogDescription className="capitalize">
            {formattedDate}{selectedStartTime && selectedEndTime && ` • ${selectedStartTime} – ${selectedEndTime}`}{teacherName && ` • ${teacherName}`}
          </DialogDescription>
        </DialogHeader>

        {mode === 'book' && (
          <div className="space-y-4">

            {/* Horário */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Clock className="size-3.5" />Horário *</Label>
              {loadingSlots ? (
                <p className="text-sm text-muted-foreground">Carregando horários...</p>
              ) : availableSlots.length === 0 ? (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
                  Nenhum horário cadastrado para este professor neste dia.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.map(s => (
                    <button key={s.id} type="button"
                      onClick={() => { setStart(s.startTime); setEnd(s.endTime); }}
                      className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                        selectedStartTime === s.startTime
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white border-border hover:border-emerald-400 hover:bg-emerald-50'
                      }`}>
                      {s.startTime}<br /><span className="text-xs opacity-75">{s.endTime}</span>
                    </button>
                  ))}
                </div>
              )}
              <details className="mt-1">
                <summary className="text-xs text-muted-foreground cursor-pointer">Inserir horário manualmente</summary>
                <div className="flex gap-2 mt-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Início</Label>
                    <Input type="time" value={selectedStartTime} onChange={e => setStart(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Fim</Label>
                    <Input type="time" value={selectedEndTime} onChange={e => setEnd(e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>
              </details>
              {selectedStartTime && selectedEndTime && (
                <Badge variant="secondary" className="text-emerald-700 bg-emerald-100">
                  <Clock className="size-3 mr-1" />{selectedStartTime} às {selectedEndTime}
                </Badge>
              )}
            </div>

            {/* Aluno */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><User className="size-3.5" />Nome do aluno *</Label>
              <Input placeholder="Ex: Maria da Paz" value={studentName} onChange={e => setStudentName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email do aluno</Label>
              <Input type="email" placeholder="aluno@email.com" value={studentEmail} onChange={e => setStudentEmail(e.target.value)} />
            </div>

            {/* Matéria / Livro / Material */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><BookOpen className="size-3.5" />Matéria / Livro / Material</Label>
              <Input
                placeholder="Ex: Inglês • Livro 1 - Teens"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Disciplina, livro, módulo, unidade, tema — escreva livremente
              </p>
            </div>

            {/* Observações livres */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Ex: Retomada da unidade 3. Aluna precisa trazer dicionário. Foco em listening."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Recorrência */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <Repeat className="size-4 text-blue-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">Aula recorrente</p>
                <p className="text-xs text-blue-600">
                  Repetir toda {DAY_NAMES[dayOfWeek]}{selectedStartTime ? ` às ${selectedStartTime}` : ''}
                </p>
              </div>
              <button type="button" onClick={() => setIsRecurring(!isRecurring)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${isRecurring ? 'bg-blue-600' : 'bg-gray-200'}`}>
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${isRecurring ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        )}

        {mode === 'view' && slot.booking && (
          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Aluno:</span>
              <span className="text-sm font-medium">{slot.booking.studentName}</span>
            </div>
            {slot.booking.studentEmail && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Email:</span>
                <span className="text-sm">{slot.booking.studentEmail}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Horário:</span>
              <span className="text-sm font-medium">{initialStartTime} – {initialEndTime}</span>
            </div>
            {slot.booking.notes && (
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Notas:</span>
                <span className="text-sm whitespace-pre-line">{slot.booking.notes}</span>
              </div>
            )}
            {slot.recurringBooking && (
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <Repeat className="size-3" /> Aula recorrente
              </div>
            )}
          </div>
        )}

        {mode === 'block' && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              O horário <strong>{initialStartTime} – {initialEndTime}</strong> será bloqueado.
            </div>
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Input placeholder="Ex: reunião, recesso..." value={blockReason} onChange={e => setBlockReason(e.target.value)} />
            </div>
          </div>
        )}

        {mode === 'unblock' && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
            <p className="text-sm text-emerald-800">
              Liberar horário <strong>{initialStartTime} – {initialEndTime}</strong>?
            </p>
            {slot.blockedSlot?.reason && (
              <p className="text-xs text-muted-foreground mt-1">Motivo: {slot.blockedSlot.reason}</p>
            )}
          </div>
        )}

        <DialogFooter className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          {mode === 'book' && (
            <Button onClick={handleBook} disabled={loading || !studentName.trim() || !selectedStartTime} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? 'Agendando...' : isRecurring ? 'Agendar (recorrente)' : 'Agendar'}
            </Button>
          )}
          {mode === 'view' && (
            <Button onClick={handleCancel} disabled={loading} variant="destructive">
              {loading ? 'Cancelando...' : 'Cancelar Agendamento'}
            </Button>
          )}
          {mode === 'block' && (
            <Button onClick={handleBlock} disabled={loading} className="bg-red-600 hover:bg-red-700">
              {loading ? 'Bloqueando...' : 'Bloquear'}
            </Button>
          )}
          {mode === 'unblock' && (
            <Button onClick={handleUnblock} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? 'Desbloqueando...' : 'Desbloquear'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
