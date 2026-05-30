'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  User,
  Lock,
  CheckCircle2,
  Loader2,
  Phone,
  Mail,
  GraduationCap,
  BookOpen,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface ProfileData {
  id: string
  name: string
  email: string
  phone: string
  role: string
  teacherId: string | null
  studentId: string | null
  teacher: { id: string; subjects: string; bio: string } | null
  student: { id: string; responsibleName: string; notes: string } | null
}

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const roleLabel: Record<string, string> = {
  coordinator: 'Coordenador',
  teacher: 'Professor',
  student: 'Aluno',
}

const roleColors: Record<string, string> = {
  coordinator: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  teacher: 'bg-amber-100 text-amber-700 border-amber-200',
  student: 'bg-sky-100 text-sky-700 border-sky-200',
}

const avatarColors: Record<string, string> = {
  coordinator: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  teacher: 'bg-amber-100 text-amber-700 border-amber-200',
  student: 'bg-sky-100 text-sky-700 border-sky-200',
}

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export function PerfilPage() {
  const { user, authFetch } = useAppStore()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // Editable fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)

  // Teacher-specific
  const [subjects, setSubjects] = useState('')
  const [bio, setBio] = useState('')
  const [savingTeacher, setSavingTeacher] = useState(false)

  // Password
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [savingPwd, setSavingPwd] = useState(false)

  /* ---- Load profile ---- */
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await authFetch('/api/auth/me')
        if (!res.ok) throw new Error('Erro ao carregar perfil')
        const data = await res.json()
        setProfile(data)
        setName(data.name || '')
        setPhone(data.phone || '')
        if (data.teacher) {
          setSubjects(data.teacher.subjects || '')
          setBio(data.teacher.bio || '')
        }
      } catch {
        toast.error('Erro ao carregar perfil')
      } finally {
        setLoadingProfile(false)
      }
    }
    loadProfile()
  }, [authFetch])

  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  /* ---- Save personal info ---- */
  const savePersonalInfo = async () => {
    if (!name.trim()) {
      toast.error('Nome não pode estar vazio')
      return
    }
    setSavingInfo(true)
    try {
      const res = await authFetch('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro ao salvar' }))
        throw new Error(err.error || 'Erro ao salvar dados')
      }
      const data = await res.json()
      setProfile(prev => prev ? { ...prev, name: data.name, phone: data.phone } : prev)
      toast.success('Dados pessoais atualizados com sucesso!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar dados')
    } finally {
      setSavingInfo(false)
    }
  }

  /* ---- Save teacher-specific info ---- */
  const saveTeacherInfo = async () => {
    if (!profile?.teacherId) return
    setSavingTeacher(true)
    try {
      const res = await authFetch(`/api/teachers/${profile.teacherId}`, {
        method: 'PATCH',
        body: JSON.stringify({ subjects, bio }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro ao salvar' }))
        throw new Error(err.error || 'Erro ao salvar dados do professor')
      }
      toast.success('Informações do professor atualizadas!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar informações')
    } finally {
      setSavingTeacher(false)
    }
  }

  /* ---- Update password ---- */
  const savePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      toast.error('Preencha todos os campos de senha')
      return
    }
    if (newPwd !== confirmPwd) {
      toast.error('A nova senha e a confirmação não coincidem')
      return
    }
    if (newPwd.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres')
      return
    }
    setSavingPwd(true)
    try {
      const res = await authFetch('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro ao alterar senha' }))
        throw new Error(err.error || 'Erro ao alterar senha')
      }
      toast.success('Senha alterada com sucesso!')
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar senha')
    } finally {
      setSavingPwd(false)
    }
  }

  if (loadingProfile) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
          <span>Carregando perfil...</span>
        </div>
      </div>
    )
  }

  const role = profile?.role || user?.role || 'student'

  return (
    <div className="flex-1 p-6 max-w-2xl mx-auto space-y-6">
      {/* Identity card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className={`size-16 border-2 ${avatarColors[role] || ''}`}>
              <AvatarFallback className={`text-xl font-bold ${avatarColors[role] || ''}`}>
                {initials || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{profile?.name || user?.name}</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="size-3.5" />
                {profile?.email || user?.email}
              </p>
              <Badge
                variant="outline"
                className={`mt-1 ${roleColors[role] || ''}`}
              >
                {roleLabel[role] || role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit personal info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User className="size-4 text-emerald-600" />
            <CardTitle className="text-base">Dados Pessoais</CardTitle>
          </div>
          <CardDescription>Atualize seu nome e telefone</CardDescription>
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
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              value={profile?.email || user?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              O email não pode ser alterado.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-phone">
              <span className="flex items-center gap-1">
                <Phone className="size-3" />
                Telefone
              </span>
            </Label>
            <Input
              id="profile-phone"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>
          <Button
            onClick={savePersonalInfo}
            disabled={savingInfo || (name.trim() === (profile?.name || user?.name) && phone.trim() === (profile?.phone || user?.phone || ''))}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {savingInfo ? (
              <><Loader2 className="size-4 mr-1 animate-spin" /> Salvando...</>
            ) : (
              <><CheckCircle2 className="size-4 mr-1" /> Salvar Dados</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Teacher-specific: subjects & bio */}
      {role === 'teacher' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="size-4 text-amber-600" />
              <CardTitle className="text-base">Informações do Professor</CardTitle>
            </div>
            <CardDescription>Disciplinas e biografia</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="teacher-subjects">
                <span className="flex items-center gap-1">
                  <BookOpen className="size-3" />
                  Disciplinas
                </span>
              </Label>
              <Input
                id="teacher-subjects"
                value={subjects}
                onChange={e => setSubjects(e.target.value)}
                placeholder="Ex: Matemática, Física, Química"
              />
              <p className="text-xs text-muted-foreground">
                Separe as disciplinas por vírgula.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teacher-bio">
                <span className="flex items-center gap-1">
                  <FileText className="size-3" />
                  Biografia
                </span>
              </Label>
              <Textarea
                id="teacher-bio"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Conte um pouco sobre você..."
                rows={4}
                className="resize-none"
              />
            </div>
            <Button
              onClick={saveTeacherInfo}
              disabled={savingTeacher}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {savingTeacher ? (
                <><Loader2 className="size-4 mr-1 animate-spin" /> Salvando...</>
              ) : (
                <><CheckCircle2 className="size-4 mr-1" /> Salvar Informações</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Student-specific: responsible & notes (view only) */}
      {role === 'student' && profile?.student && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="size-4 text-sky-600" />
              <CardTitle className="text-base">Informações do Aluno</CardTitle>
            </div>
            <CardDescription>Dados cadastrais (somente leitura)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Input
                value={profile.student.responsibleName || 'Não informado'}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                value={profile.student.notes || 'Nenhuma observação'}
                disabled
                className="bg-muted resize-none"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

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
  )
}
