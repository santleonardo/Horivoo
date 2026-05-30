'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, Users, GraduationCap, CalendarCheck, TrendingUp } from 'lucide-react';

interface ReportData {
  totalTeachers: number;
  totalStudents: number;
  totalBookings: number;
  todayBookings: number;
  weekBookings: number;
}

export function RelatoriosPage() {
  const [data, setData] = useState<ReportData | null>(null);
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
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-60 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const completionRate = data?.totalBookings && data.totalBookings > 0
    ? Math.round(((data.todayBookings || 0) / data.totalBookings) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground">Visão geral das métricas do sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <GraduationCap className="size-6 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">Professores</CardTitle>
                <CardDescription>Total de docentes cadastrados</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-emerald-700">{data?.totalTeachers || 0}</p>
            <div className="mt-2 flex items-center gap-1 text-sm text-emerald-600">
              <TrendingUp className="size-4" />
              <span>Ativos no sistema</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-50">
                <Users className="size-6 text-teal-600" />
              </div>
              <div>
                <CardTitle className="text-base">Alunos</CardTitle>
                <CardDescription>Total de alunos cadastrados</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-teal-700">{data?.totalStudents || 0}</p>
            <div className="mt-2 flex items-center gap-1 text-sm text-teal-600">
              <TrendingUp className="size-4" />
              <span>Ativos no sistema</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <CalendarCheck className="size-6 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-base">Agendamentos</CardTitle>
                <CardDescription>Total de agendamentos confirmados</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-amber-700">{data?.totalBookings || 0}</p>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Hoje: {data?.todayBookings || 0}</span>
                <span>Semana: {data?.weekBookings || 0}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(completionRate, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <BarChart3 className="size-6 text-emerald-600" />
            <div>
              <CardTitle>Resumo Geral</CardTitle>
              <CardDescription>Métricas consolidadas do sistema</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold">{data?.totalTeachers || 0}</p>
              <p className="text-sm text-muted-foreground">Professores</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold">{data?.totalStudents || 0}</p>
              <p className="text-sm text-muted-foreground">Alunos</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold">{data?.todayBookings || 0}</p>
              <p className="text-sm text-muted-foreground">Hoje</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold">{data?.weekBookings || 0}</p>
              <p className="text-sm text-muted-foreground">Semana</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
