'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, CalendarOff } from 'lucide-react';
import { toast } from 'sonner';

interface NonClassDay {
  id: string;
  date: string;
  reason: string;
}

export default function NonClassDaysManager({ onUpdate }: { onUpdate?: () => void }) {
  const [days, setDays] = useState<NonClassDay[]>([]);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDays();
  }, []);

  const fetchDays = async () => {
    try {
      const res = await fetch('/api/non-class-days');
      if (res.ok) setDays(await res.json());
    } catch {
      toast.error('Erro ao buscar dias sem aula');
    }
  };

  const handleAdd = async () => {
    if (!date || !reason) {
      toast.error('Preencha a data e o motivo');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/non-class-days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erro ao adicionar dia sem aula');
        return;
      }
      toast.success('Dia sem aula adicionado!');
      setDate('');
      setReason('');
      fetchDays();
      onUpdate?.();
    } catch {
      toast.error('Erro ao adicionar dia sem aula');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const res = await fetch(`/api/non-class-days/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('Erro ao remover dia sem aula');
        return;
      }
      toast.success('Dia sem aula removido!');
      fetchDays();
      onUpdate?.();
    } catch {
      toast.error('Erro ao remover dia sem aula');
    }
  };

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <CalendarOff className="h-4 w-4 text-[#C1440E]" />
        Dias sem Aula
      </h3>

      <div className="flex gap-2 mb-3">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1"
        />
        <Input
          placeholder="Motivo"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleAdd} disabled={loading} size="sm" className="bg-[#C1440E] hover:bg-[#9B350C] gap-1">
          <Plus className="h-3 w-3" /> Adicionar
        </Button>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {days.map(day => (
          <div key={day.id} className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
            <div>
              <span className="text-sm font-medium">{new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
              <span className="text-xs text-muted-foreground ml-2">— {day.reason}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => handleRemove(day.id)} className="h-7 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {days.length === 0 && (
          <p className="text-xs text-muted-foreground text-center">Nenhum dia sem aula cadastrado</p>
        )}
      </div>
    </Card>
  );
}
