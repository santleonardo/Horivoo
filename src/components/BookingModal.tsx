'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SlotInfo } from './WeekGrid';
import { toast } from 'sonner';
import { BookOpen } from 'lucide-react';

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
  open,
  onClose,
  date,
  startTime,
  endTime,
  slot,
  teacherId,
  teacherName,
  mode,
  onBooked,
  onCancelled,
  onBlocked,
  onUnblocked,
}: BookingModalProps) {
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBook = async () => {
    if (!studentName) {
      toast.error('Informe o nome do aluno');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId,
          studentName,
          studentEmail: studentEmail || null,
          date,
          startTime,
          endTime,
          notes: notes || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erro ao agendar');
        return;
      }
      toast.success('Agendamento realizado com sucesso!');
      onBooked?.();
      onClose();
    } catch {
      toast.error('Erro ao agendar');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!slot.booking?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${slot.booking.id}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('Erro ao cancelar agendamento');
        return;
      }
      toast.success('Agendamento cancelado!');
      onCancelled?.();
      onClose();
    } catch {
      toast.error('Erro ao cancelar agendamento');
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/blocked-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId,
          date,
          startTime,
          endTime,
          reason: blockReason || null,
        }),
      });
      if (!res.ok) {
        toast.error('Erro ao bloquear horário');
        return;
      }
      toast.success('Horário bloqueado!');
      onBlocked?.();
      onClose();
    } catch {
      toast.error('Erro ao bloquear horário');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async () => {
    if (!slot.blockedSlot?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/blocked-slots/${slot.blockedSlot.id}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('Erro ao desbloquear horário');
        return;
      }
      toast.success('Horário desbloqueado!');
      onUnblocked?.();
      onClose();
    } catch {
      toast.error('Erro ao desbloquear horário');
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = (() => {
    try {
      const d = new Date(date + 'T12:00:00');
      return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return date;
    }
  })();

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'book' && 'Agendar Horário'}
            {mode === 'view' && 'Detalhes do Agendamento'}
            {mode === 'block' && 'Bloquear Horário'}
            {mode === 'unblock' && 'Desbloquear Horário'}
          </DialogTitle>
          <DialogDescription>
            {formattedDate} • {startTime} - {endTime}
            {teacherName && ` • ${teacherName}`}
          </DialogDescription>
        </DialogHeader>

        {mode === 'book' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do aluno *</Label>
              <Input
                placeholder="Nome completo"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email do aluno</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <BookOpen className="size-4" />
                Matéria / Livro / Observações
              </Label>
              <Textarea
                placeholder="Ex: Livro 1 - Teens, Aula de inglês, Capítulo 3..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Campo livre para anotar matéria, livro, capítulo ou outras informações.
              </p>
            </div>
          </div>
        )}

        {mode === 'view' && slot.booking && (
          <div className="space-y-3">
            <div className="bg-indigo-50 dark:bg-indigo-950/30 p-4 rounded-lg space-y-2">
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
                <span className="text-sm">{startTime} - {endTime}</span>
              </div>
            </div>
          </div>
        )}

        {mode === 'block' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo do bloqueio</Label>
              <Input
                placeholder="Ex: feriado, recesso, pessoal..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>
          </div>
        )}

        {mode === 'unblock' && (
          <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg">
            <p className="text-sm">Deseja desbloquear este horário?</p>
            {slot.blockedSlot?.reason && (
              <p className="text-xs text-muted-foreground mt-1">Motivo: {slot.blockedSlot.reason}</p>
            )}
          </div>
        )}

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {mode === 'book' && (
            <Button onClick={handleBook} disabled={loading} className="bg-[#2D6A4F] hover:bg-[#1B4332]">
              {loading ? 'Agendando...' : 'Agendar'}
            </Button>
          )}
          {mode === 'view' && (
            <Button onClick={handleCancel} disabled={loading} variant="destructive">
              {loading ? 'Cancelando...' : 'Cancelar Agendamento'}
            </Button>
          )}
          {mode === 'block' && (
            <Button onClick={handleBlock} disabled={loading} className="bg-[#C1440E] hover:bg-[#9B350C]">
              {loading ? 'Bloqueando...' : 'Bloquear'}
            </Button>
          )}
          {mode === 'unblock' && (
            <Button onClick={handleUnblock} disabled={loading} className="bg-[#2D6A4F] hover:bg-[#1B4332]">
              {loading ? 'Desbloqueando...' : 'Desbloquear'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
