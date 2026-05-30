'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function LoginForm() {
  const { login } = useAppStore()

  // Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Signup state
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPhone, setSignupPhone] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupRole, setSignupRole] = useState<'teacher' | 'student'>('student')
  const [signupSubjects, setSignupSubjects] = useState('')
  const [signupResponsibleName, setSignupResponsibleName] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginEmail || !loginPassword) {
      toast.error('Preencha todos os campos')
      return
    }
    setLoginLoading(true)
    try {
      await login(loginEmail, loginPassword)
      toast.success('Login realizado com sucesso!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao fazer login')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signupName || !signupPassword || !signupRole) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    if (signupRole === 'teacher' && !signupSubjects) {
      toast.error('Informe as disciplinas')
      return
    }
    if (signupRole === 'student' && !signupResponsibleName) {
      toast.error('Informe o nome do responsável')
      return
    }
    setSignupLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signup',
          name: signupName,
          email: signupEmail,
          phone: signupPhone,
          password: signupPassword,
          role: signupRole,
          subjects: signupRole === 'teacher' ? signupSubjects : undefined,
          responsibleName: signupRole === 'student' ? signupResponsibleName : undefined,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Erro ao criar conta' }))
        throw new Error(errorData.error || 'Erro ao criar conta')
      }

      const data = await res.json()

      // Auto-login after signup
      localStorage.setItem('horivoo_token', data.token)
      localStorage.setItem('horivoo_user', JSON.stringify({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        phone: data.user.phone || '',
        teacherId: data.user.teacherId,
        studentId: data.user.studentId,
        token: data.token,
      }))

      // Reload to trigger checkAuth
      window.location.reload()

      toast.success('Conta criada com sucesso!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar conta')
    } finally {
      setSignupLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 p-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4 shadow-lg shadow-primary/25">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Horivoo
          </h1>
          <p className="text-muted-foreground mt-1">
            Sistema de Agendamento Acadêmico
          </p>
        </div>

        <Card className="shadow-xl shadow-black/5 border-0">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-0 px-6 pt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="p-6">
              <TabsContent value="login" className="mt-0">
                <CardTitle className="text-lg">Bem-vindo de volta</CardTitle>
                <CardDescription className="mt-1 mb-6">
                  Entre com suas credenciais para acessar o sistema
                </CardDescription>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Sua senha"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginLoading}
                  >
                    {loginLoading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <CardTitle className="text-lg">Criar conta</CardTitle>
                <CardDescription className="mt-1 mb-6">
                  Preencha os dados para se cadastrar no sistema
                </CardDescription>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome completo</Label>
                    <Input
                      id="signup-name"
                      placeholder="Seu nome"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-mail</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Telefone</Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Crie uma senha"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-role">Tipo de conta</Label>
                    <Select
                      value={signupRole}
                      onValueChange={(v) => setSignupRole(v as 'teacher' | 'student')}
                    >
                      <SelectTrigger id="signup-role">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Aluno</SelectItem>
                        <SelectItem value="teacher">Professor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {signupRole === 'teacher' && (
                    <div className="space-y-2">
                      <Label htmlFor="signup-subjects">Disciplinas</Label>
                      <Input
                        id="signup-subjects"
                        placeholder="Ex: Matemática, Física"
                        value={signupSubjects}
                        onChange={(e) => setSignupSubjects(e.target.value)}
                      />
                    </div>
                  )}

                  {signupRole === 'student' && (
                    <div className="space-y-2">
                      <Label htmlFor="signup-responsible">Nome do responsável</Label>
                      <Input
                        id="signup-responsible"
                        placeholder="Nome do responsável"
                        value={signupResponsibleName}
                        onChange={(e) => setSignupResponsibleName(e.target.value)}
                      />
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={signupLoading}
                  >
                    {signupLoading ? 'Criando conta...' : 'Cadastrar'}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Contas de coordenador são criadas pelo administrador do sistema.
        </p>
      </div>
    </div>
  )
}
