'use client';

/**
 * PerfilPage.tsx
 * Página de perfil — funciona para todos os papéis (coordenador, professor, aluno).
 * Permite editar nome e senha.
 */

import { useState } from 'react';
import { useAuthStore, authFetch } from '@/lib/store';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { Badge }    from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Lock, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const roleLabel: Record<string, string> = {
  coordinator: 'Coordenador',
  teacher:     'Professor',
  student:     'Aluno',
};

const roleColors: Record<string, string> = {
  coordinator: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  teacher:     'bg-blue-100 text-blue-700 border-blue-200',
  student:     'bg-amber-100 text-amber-700 border-amber-200',
};

export function PerfilPage() {
  const { user } = useAuthStore();

  const [name, setName]           = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd]         = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd]   = useState(false);

  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  /* ---- Update name ---- */
  const saveName = async () => {
    if (!name.trim()) { toast.error('Nome não pode estar vazio'); return; }
    setSavingName(true);
    try {
      const res = await authFetch('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao salvar nome');
      }
      toast.success('Nome atualizado com sucesso!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar nome');
    } finally {
      setSavingName(false);
    }
  };

  /* ---- Update password ---- */
  const savePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      toast.error('Preencha todos os campos de senha');
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error('A nova senha e a confirmação não coincidem');
      return;
    }
    if (newPwd.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    setSavingPwd(true);
    try {
      const res = await authFetch('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao alterar senha');
      }
      toast.success('Senha alterada com sucesso!');
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar senha');
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Identity card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border-2 border-emerald-200">
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{user?.name}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge
                variant="outline"
                className={`mt-1 ${roleColors[user?.role || ''] || ''}`}
              >
                {roleLabel[user?.role || ''] || user?.role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit name */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User className="size-4 text-emerald-600" />
            <CardTitle className="text-base">Dados Pessoais</CardTitle>
          </div>
          <CardDescription>Atualize seu nome de exibição</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Nome completo</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Seu nome completo"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={user?.email || ''} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              O email não pode ser alterado.
            </p>
          </div>
          <Button
            onClick={saveName}
            disabled={savingName || name.trim() === user?.name}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {savingName ? (
              <><Loader2 className="size-4 mr-1 animate-spin" /> Salvando...</>
            ) : (
              <><CheckCircle className="size-4 mr-1" /> Salvar Nome</>
            )}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Change password */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-emerald-600" />
            <CardTitle className="text-base">Alterar Senha</CardTitle>
          </div>
          <CardDescription>Use uma senha forte com pelo menos 6 caracteres</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-pwd">Senha atual</Label>
            <Input
              id="current-pwd"
              type="password"
              value={currentPwd}
              onChange={e => setCurrentPwd(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-pwd">Nova senha</Label>
            <Input
              id="new-pwd"
              type="password"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pwd">Confirmar nova senha</Label>
            <Input
              id="confirm-pwd"
              type="password"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button
            onClick={savePassword}
            disabled={savingPwd || !currentPwd || !newPwd || !confirmPwd}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {savingPwd ? (
              <><Loader2 className="size-4 mr-1 animate-spin" /> Alterando...</>
            ) : (
              <><Lock className="size-4 mr-1" /> Alterar Senha</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
