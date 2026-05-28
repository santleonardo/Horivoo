'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Repeat, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface RecurringBooking {
  id: string;
  teacherId: string;
  studentName: string;
  studentEmail?: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
  teacher?: { name: string };
}

const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const timeOptions = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00',
];

interface Teacher {
  id: string;
  name: string;
}

export default function RecurringBookingsManager({
  teacherId,
  teachers,
  onUpdate,
}: {
  teacherId?: string;
  teachers?: Teacher[];
  onUpdate?: () => void;
}) {
  const [bookings, setBookings] = useState<RecurringBooking[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(teacherId || '');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('15:00');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [teacherId]);

  const fetchBookings = async () => {
    try {
      const params = teacherId ? `?teacherId=${teacherId}` : '';
      const res = await fetch(`/api/recurring-bookings${params}`);
      if (res.ok) setBookings(await res.json());
    } catch {
      toast.error('Erro ao buscar agendamentos recorrentes');
    }
  };

  const handleAdd = async () => {
    if (!selectedTeacher || !studentName) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/recurring-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: selectedTeacher,
          studentName,
          studentEmail: studentEmail || null,
          dayOfWeek: parseInt(dayOfWeek),
          startTime,
          endTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erro ao criar agendamento recorrente');
        return;
      }
      toast.success('Agendamento recorrente criado!');
      setStudentName('');
      setStudentEmail('');
      setShowForm(false);
      fetchBookings();
      onUpdate?.();
    } catch {
      toast.error('Erro ao criar agendamento recorrente');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      const res = await fetch(`/api/recurring-bookings/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('Erro ao desativar agendamento');
        return;
      }
      toast.success('Agendamento recorrente desativado!');
      fetchBookings();
      onUpdate?.();
    } catch {
      toast.error('Erro ao desativar agendamento');
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Repeat className="h-4 w-4 text-[#5B5EA6]" />
          Agendamentos Recorrentes
        </h3>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)} className="gap-1">
          <Plus className="h-3 w-3" /> Novo
        </Button>
      </div>

      {showForm && (
        <div className="space-y-2 mb-3 p-3 bg-muted/50 rounded-lg">
          {teachers && teachers.length > 0 && !teacherId && (
            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger>
                <SelectValue placeholder="Professor" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Nome do aluno" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
            <Input placeholder="Email do aluno" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dayNames.map((name, i) => (
                  <SelectItem key={i} value={String(i)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={startTime} onValueChange={setStartTime}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={endTime} onValueChange={setEndTime}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={loading} size="sm" className="bg-[#2D6A4F] hover:bg-[#1B4332]">
              {loading ? 'Criando...' : 'Criar Recorrente'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {bookings.filter(b => b.active).map(booking => (
          <div key={booking.id} className="flex items-center justify-between p-2 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg">
            <div className="flex-1">
              <span className="text-sm font-medium">{booking.studentName}</span>
              <span className="text-xs text-muted-foreground ml-2">
                — {dayNames[booking.dayOfWeek]} {booking.startTime}-{booking.endTime}
              </span>
              {booking.teacher && (
                <span className="text-xs text-muted-foreground ml-1">({booking.teacher.name})</span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => handleDeactivate(booking.id)} className="h-7 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {bookings.filter(b => b.active).length === 0 && (
          <p className="text-xs text-muted-foreground text-center">Nenhum agendamento recorrente ativo</p>
        )}
      </div>
    </Card>
  );
}
