'use client';

/**
 * DisponibilidadePage.tsx
 * Página do professor para gerenciar sua disponibilidade semanal.
 * Wraps AvailableSlotsManager com o teacherId do usuário logado.
 */

import { useEffect, useState } from 'react';
import { useAuthStore, authFetch } from '@/lib/store';
import { AvailableSlotsManager } from '@/components/AvailableSlotsManager';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Loader2, CalendarClock, Info } from 'lucide-react';

export function DisponibilidadePage() {
  const { user } = useAuthStore();
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    if (!user) return;

    if (user.teacherId) {
      setTeacherId(user.teacherId);
      setLoading(false);
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
      <Alert variant="destructive">
        <Info className="size-4" />
        <span className="ml-2">{error}</span>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-emerald-100">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-5 text-emerald-600" />
            <CardTitle className="text-lg">Minha Disponibilidade</CardTitle>
          </div>
          <CardDescription>
            Defina os dias e horários em que você está disponível para aulas.
            O coordenador só poderá agendar dentro desses horários.
          </CardDescription>
        </CardHeader>
      </Card>

      {teacherId && <AvailableSlotsManager teacherId={teacherId} />}
    </div>
  );
}
