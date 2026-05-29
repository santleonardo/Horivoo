'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Settings2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface AvailableSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const timeOptions = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00',
];

export default function AvailableSlotsManager({ teacherId, onUpdate }: { teacherId: string; onUpdate?: () => void }) {
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState('1');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) fetchSlots();
  }, [open, teacherId]);

  const fetchSlots = async () => {
    try {
      const res = await fetch(`/api/teachers/${teacherId}/available-slots`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
      }
    } catch {
      toast.error('Erro ao buscar horários');
    }
  };

  const handleAdd = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teachers/${teacherId}/available-slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayOfWeek: parseInt(selectedDay),
          startTime,
          endTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erro ao adicionar horário');
        return;
      }
      toast.success('Horário adicionado!');
      fetchSlots();
      onUpdate?.();
    } catch {
      toast.error('Erro ao adicionar horário');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (slotId: string) => {
    try {
      const res = await fetch(`/api/teachers/${teacherId}/available-slots?slotId=${slotId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        toast.error('Erro ao remover horário');
        return;
      }
      toast.success('Horário removido!');
      fetchSlots();
      onUpdate?.();
    } catch {
      toast.error('Erro ao remover horário');
    }
  };

  const groupedSlots = slots.reduce<Record<number, AvailableSlot[]>>((acc, slot) => {
    if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = [];
    acc[slot.dayOfWeek].push(slot);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Settings2 className="h-4 w-4" />
          Gerenciar Horários
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Horários Disponíveis</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new slot */}
          <Card className="p-4">
            <h4 className="text-sm font-medium mb-3">Adicionar Horário</h4>
            <div className="grid grid-cols-3 gap-2">
              <Select value={selectedDay} onValueChange={setSelectedDay}>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} disabled={loading} size="sm" className="mt-3 bg-[#2D6A4F] hover:bg-[#1B4332] gap-1">
              <Plus className="h-3 w-3" /> Adicionar
            </Button>
          </Card>

          {/* Current slots */}
          <div className="space-y-3">
            {Object.entries(groupedSlots).sort(([a], [b]) => Number(a) - Number(b)).map(([day, daySlots]) => (
              <div key={day}>
                <h4 className="text-sm font-semibold mb-1.5">{dayNames[Number(day)]}</h4>
                <div className="flex flex-wrap gap-2">
                  {daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(slot => (
                    <Badge key={slot.id} variant="secondary" className="gap-1 pr-1">
                      {slot.startTime}-{slot.endTime}
                      <button
                        onClick={() => handleRemove(slot.id)}
                        className="ml-1 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(groupedSlots).length === 0 && (
              <p className="text-sm text-muted-foreground text-center">Nenhum horário cadastrado</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
