'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Settings, User, Save } from 'lucide-react';
import { toast } from 'sonner';

export function ConfiguracoesPage() {
  const { user } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name || !email) {
      toast.error('Nome e email são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      // Update local storage
      const storedUser = localStorage.getItem('horivoo_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const updated = { ...parsed, name, email };
        localStorage.setItem('horivoo_user', JSON.stringify(updated));
      }
      toast.success('Configurações salvas com sucesso');
    } catch {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'U';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Gerencie suas preferências e perfil</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <User className="size-6 text-emerald-600" />
              </div>
              <div>
                <CardTitle>Perfil</CardTitle>
                <CardDescription>Informações da sua conta</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-emerald-200">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-lg">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <p className="text-xs text-emerald-600 mt-1 capitalize">
                  {user?.role === 'coordinator' ? 'Coordenador' : user?.role === 'teacher' ? 'Professor' : 'Aluno'}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="size-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <Settings className="size-6 text-amber-600" />
              </div>
              <div>
                <CardTitle>Preferências do Sistema</CardTitle>
                <CardDescription>Configurações gerais da plataforma</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="font-medium text-sm">Horivoo — Sistema de Agenda Escolar</p>
              <p className="text-xs text-muted-foreground mt-1">
                Versão 2.0 — Plataforma completa de agendamento acadêmico
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <p className="font-medium text-sm">Idioma</p>
              <p className="text-xs text-muted-foreground mt-1">Português (Brasil)</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <p className="font-medium text-sm">Fuso Horário</p>
              <p className="text-xs text-muted-foreground mt-1">América/São_Paulo (BRT)</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <p className="font-medium text-sm">Formato de Data</p>
              <p className="text-xs text-muted-foreground mt-1">DD/MM/AAAA</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
