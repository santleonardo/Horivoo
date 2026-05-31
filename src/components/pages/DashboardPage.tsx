'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap,
  Users,
  CalendarCheck,
  CalendarDays,
  Plus,
  UserPlus,
  Calendar,
  Clock,
  User,
  ArrowRight,
  BookOpen,
  FileText,
  Layers,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UpcomingBooking {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  studentName: string;
  teacherName: string;
  status: string;
}

interface TeacherStat {
  id: string;
  name: string;
  subjects: string;
  classesCount: number;
  studentsCount: number;
  upcomingBookingsCount: number;
}

interface StudentStat {
  id: string;
  name: string;
  className: string;
  subjects: string;
  absencesCount: number;
  upcomingTests: { id: string; title: string; date: string }[];
}

interface DashboardData {
  totalTeachers: number;
  totalStudents: number;
  totalBookings: number;
  todayBookings: number;
  weekBookings: number;
  upcomingBookings: UpcomingBooking[];
  teacherStats?: TeacherStat[];
  studentStats?: StudentStat[];
}

export function DashboardPage() {
  const { user, setActivePage } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'Usuário';

  const stats = [
    {
      label: 'Total Professores',
      value: data?.totalTeachers || 0,
      icon: GraduationCap,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Total Alunos',
      value: data?.totalStudents || 0,
      icon: Users,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
    {
      label: 'Agendamentos Hoje',
      value: data?.todayAppointments || 0,
      icon: CalendarCheck,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Agendamentos Semana',
      value: data?.weekAppointments || 0,
      icon: CalendarDays,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <Card className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold">Olá, {firstName}! 👋</h1>
              <p className="text-emerald-100 mt-1">
                Bem-vindo ao Horivoo. Aqui está um resumo da sua agenda.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActivePage('agenda')}
                className="bg-white/20 text-white hover:bg-white/30 border-0"
              >
                <Plus className="size-4 mr-1" />
                Novo Agendamento
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActivePage('professores')}
                className="bg-white/20 text-white hover:bg-white/30 border-0"
              >
                <UserPlus className="size-4 mr-1" />
                Adicionar Professor
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`size-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Appointments */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Próximos Agendamentos</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActivePage('agendamentos')}
                className="text-emerald-600 hover:text-emerald-700"
              >
                Ver todos <ArrowRight className="size-4 ml-1" />
              </Button>
            </div>
            <CardDescription>Próximos 5 agendamentos confirmados</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.upcomingAppointments && data.upcomingAppointments.length > 0 ? (
              <div className="space-y-3">
                {data.upcomingAppointments.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Clock className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {booking.studentName}
                        </p>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {booking.startTime}-{booking.endTime}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <User className="size-3 inline mr-1" />
                        {booking.teacherName} •{' '}
                        {format(parseISO(booking.date), "dd 'de' MMM", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="size-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum agendamento próximo</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Ações Rápidas</CardTitle>
            <CardDescription>Acesse rapidamente as principais funcionalidades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-auto p-4 justify-start gap-3 hover:bg-emerald-50 hover:border-emerald-200"
                onClick={() => setActivePage('agenda')}
              >
                <div className="p-2 rounded-lg bg-emerald-100">
                  <Plus className="size-5 text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Novo Agendamento</p>
                  <p className="text-xs text-muted-foreground">Agendar horário</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 justify-start gap-3 hover:bg-teal-50 hover:border-teal-200"
                onClick={() => setActivePage('professores')}
              >
                <div className="p-2 rounded-lg bg-teal-100">
                  <UserPlus className="size-5 text-teal-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Adicionar Professor</p>
                  <p className="text-xs text-muted-foreground">Cadastrar docente</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 justify-start gap-3 hover:bg-amber-50 hover:border-amber-200"
                onClick={() => setActivePage('calendario')}
              >
                <div className="p-2 rounded-lg bg-amber-100">
                  <Calendar className="size-5 text-amber-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Ver Calendário</p>
                  <p className="text-xs text-muted-foreground">Visão mensal</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 justify-start gap-3 hover:bg-purple-50 hover:border-purple-200"
                onClick={() => setActivePage('turmas')}
              >
                <div className="p-2 rounded-lg bg-purple-100">
                  <Layers className="size-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Gerenciar Turmas</p>
                  <p className="text-xs text-muted-foreground">Classes e alunos</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Professores */}
      {data?.teacherStats && data.teacherStats.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <GraduationCap className="size-5 text-emerald-600" />
              Lista de Professores
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setActivePage('professores')} className="text-emerald-600">
              Ver todos <ArrowRight className="size-4 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.teacherStats.map(teacher => (
              <Card key={teacher.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <GraduationCap className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{teacher.name}</p>
                      {teacher.subjects && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {teacher.subjects.split(',').filter(Boolean).slice(0, 3).map((s, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] px-1 py-0">
                              {s.trim()}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Layers className="size-3" />
                          {teacher.classesCount} turma{teacher.classesCount !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="size-3" />
                          {teacher.studentsCount} aluno{teacher.studentsCount !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="size-3" />
                          {teacher.upcomingAppointmentsCount} aula{teacher.upcomingAppointmentsCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Alunos */}
      {data?.studentStats && data.studentStats.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="size-5 text-teal-600" />
              Lista de Alunos
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setActivePage('alunos')} className="text-emerald-600">
              Ver todos <ArrowRight className="size-4 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.studentStats.map(student => (
              <Card key={student.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                      <User className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{student.name}</p>
                      {student.className && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 mt-0.5">
                          {student.className}
                        </Badge>
                      )}
                      {student.subjects && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {student.subjects.split(',').filter(Boolean).slice(0, 3).map((s, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px] px-1 py-0">
                              {s.trim()}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 text-red-600">
                          {student.absencesCount} falta{student.absencesCount !== 1 ? 's' : ''}
                        </span>
                        {student.upcomingTests.length > 0 && (
                          <span className="flex items-center gap-1 text-purple-600">
                            <FileText className="size-3" />
                            {student.upcomingTests.length} prova{student.upcomingTests.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {student.upcomingTests.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {student.upcomingTests.slice(0, 2).map(t => (
                            <div key={t.id} className="text-xs text-muted-foreground flex items-center gap-1">
                              <FileText className="size-3 text-purple-400" />
                              {t.title} — {format(parseISO(t.date), "dd/MM", { locale: ptBR })}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
