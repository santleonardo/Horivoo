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
import { Palmtree, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Recess {
  id: string;
  startDate: string;
  endDate: string;
  description: string;
  createdAt: string;
}

export function RecessosPage() {
  const [recesses, setRecesses] = useState<Recess[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ startDate: '', endDate: '', description: '' });

  const loadRecesses = useCallback(async () => {
    try {
      const res = await fetch('/api/recesses');
      const data = await res.json();
      setRecesses(data.recesses || []);
    } catch {
      toast.error('Erro ao carregar recessos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecesses();
  }, [loadRecesses]);

  const handleAdd = async () => {
    if (!form.startDate || !form.endDate || !form.description) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (form.startDate > form.endDate) {
      toast.error('Data início deve ser anterior à data fim');
      return;
    }

    try {
      const res = await fetch('/api/recesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success('Recesso adicionado com sucesso');
      setDialogOpen(false);
      setForm({ startDate: '', endDate: '', description: '' });
      loadRecesses();
    } catch {
      toast.error('Erro ao adicionar recesso');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este recesso?')) return;
    try {
      await fetch(`/api/recesses/${id}`, { method: 'DELETE' });
      toast.success('Recesso excluído');
      loadRecesses();
    } catch {
      toast.error('Erro ao excluir recesso');
    }
  };

  const getDaysCount = (start: string, end: string) => {
    const s = new Date(start + 'T12:00:00');
    const e = new Date(end + 'T12:00:00');
    return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recessos</h1>
          <p className="text-muted-foreground">Gerencie os períodos de recesso escolar</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="size-4 mr-2" />
          Novo Recesso
        </Button>
      </div>

      {loading ? (
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-40 bg-muted rounded" />
          </CardContent>
        </Card>
      ) : recesses.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Palmtree className="size-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum recesso cadastrado</p>
            <p className="text-sm mt-1">Adicione recessos para bloquear períodos no calendário</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recesses.map((recess) => (
                  <TableRow key={recess.id}>
                    <TableCell className="font-medium">{recess.description}</TableCell>
                    <TableCell className="font-mono text-sm">{recess.startDate}</TableCell>
                    <TableCell className="font-mono text-sm">{recess.endDate}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-amber-600 border-amber-200">
                        {getDaysCount(recess.startDate, recess.endDate)} dias
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(recess.id)}
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

      {/* Add Recess Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Recesso</DialogTitle>
            <DialogDescription>Adicione um período de recesso ao calendário escolar</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: Recesso de Inverno"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
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
