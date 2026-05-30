'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PartyPopper, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Holiday {
  id: string;
  date: string;
  name: string;
  type: string;
  recurring: boolean;
}

const typeLabels: Record<string, string> = {
  nacional: 'Nacional',
  estadual: 'Estadual',
  municipal: 'Municipal',
};

const typeColors: Record<string, string> = {
  nacional: 'bg-emerald-100 text-emerald-700',
  estadual: 'bg-blue-100 text-blue-700',
  municipal: 'bg-amber-100 text-amber-700',
};

export function FeriadosPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ date: '', name: '', type: 'nacional', recurring: false });

  const loadHolidays = useCallback(async () => {
    try {
      const res = await fetch('/api/holidays');
      const data = await res.json();
      setHolidays(data.holidays || []);
    } catch {
      toast.error('Erro ao carregar feriados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHolidays();
  }, [loadHolidays]);

  const handleAdd = async () => {
    if (!form.date || !form.name || !form.type) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success('Feriado adicionado com sucesso');
      setDialogOpen(false);
      setForm({ date: '', name: '', type: 'nacional', recurring: false });
      loadHolidays();
    } catch {
      toast.error('Erro ao adicionar feriado');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este feriado?')) return;
    try {
      await fetch(`/api/holidays/${id}`, { method: 'DELETE' });
      toast.success('Feriado excluído');
      loadHolidays();
    } catch {
      toast.error('Erro ao excluir feriado');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Feriados</h1>
          <p className="text-muted-foreground">Gerencie os feriados do calendário escolar</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="size-4 mr-2" />
          Novo Feriado
        </Button>
      </div>

      {loading ? (
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-40 bg-muted rounded" />
          </CardContent>
        </Card>
      ) : holidays.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <PartyPopper className="size-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum feriado cadastrado</p>
            <p className="text-sm mt-1">Adicione feriados para bloquear datas no calendário</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Recorrente</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((holiday) => (
                  <TableRow key={holiday.id}>
                    <TableCell className="font-mono text-sm">{holiday.date}</TableCell>
                    <TableCell className="font-medium">{holiday.name}</TableCell>
                    <TableCell>
                      <Badge className={typeColors[holiday.type] || 'bg-gray-100 text-gray-700'}>
                        {typeLabels[holiday.type] || holiday.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {holiday.recurring ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                          Sim
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Não</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(holiday.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add Holiday Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Feriado</DialogTitle>
            <DialogDescription>Adicione um feriado ao calendário escolar</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Confraternização Universal"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nacional">Nacional</SelectItem>
                  <SelectItem value="estadual">Estadual</SelectItem>
                  <SelectItem value="municipal">Municipal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="holiday-recurring"
                checked={form.recurring}
                onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
                className="rounded border-input"
              />
              <Label htmlFor="holiday-recurring">Recorrente (todos os anos)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-700">
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
