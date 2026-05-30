'use client';

import { authFetch } from '@/lib/store';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

interface Teacher {
  id: string;
  name: string;
}

export function ExportarPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [format, setFormat] = useState('csv');
  const [teacherId, setTeacherId] = useState('all');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    authFetch('/api/teachers')
      .then((res) => res.json())
      .then((data) => setTeachers(data.teachers || []))
      .catch(() => {});
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('format', format);
      
      if (teacherId !== 'all') {
        params.set('teacherId', teacherId);
      }

      if (dateStart && dateEnd) {
        // Use month export if we have a range
        params.set('month', dateStart.substring(0, 7));
      } else {
        // Default to current week
        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
        const yyyy = monday.getFullYear();
        const mm = String(monday.getMonth() + 1).padStart(2, '0');
        const dd = String(monday.getDate()).padStart(2, '0');
        params.set('weekStart', `${yyyy}-${mm}-${dd}`);
      }

      const url = `/api/export?${params.toString()}`;
      const res = await fetch(url);
      
      if (!res.ok) throw new Error();

      if (format === 'csv') {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'horivoo-agenda.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
        toast.success('Arquivo CSV exportado com sucesso');
      }
    } catch {
      toast.error('Erro ao exportar dados');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Exportar</h1>
        <p className="text-muted-foreground">Exporte os dados do sistema em diferentes formatos</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <Download className="size-6 text-emerald-600" />
              </div>
              <div>
                <CardTitle>Configuração de Exportação</CardTitle>
                <CardDescription>Selecione os filtros e formato desejado</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Formato</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="size-4" />
                      CSV
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Professor</Label>
              <Select value={teacherId} onValueChange={setTeacherId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Professores</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                />
              </div>
            </div>

            <Button
              onClick={handleExport}
              disabled={exporting}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              <Download className="size-4 mr-2" />
              {exporting ? 'Exportando...' : 'Exportar Dados'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <FileText className="size-6 text-amber-600" />
              </div>
              <div>
                <CardTitle>Informações</CardTitle>
                <CardDescription>Sobre a exportação</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium text-sm">Formato CSV</p>
              <p className="text-xs text-muted-foreground mt-1">
                Arquivo separado por vírgulas com colunas: Data, Dia, Horário, Professor, Aluno, Status.
                Compatível com Excel, Google Sheets e outros.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium text-sm">Período</p>
              <p className="text-xs text-muted-foreground mt-1">
                Se nenhum período for selecionado, a exportação incluirá a semana atual.
                Selecione datas para personalizar o período.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium text-sm">Filtro de Professor</p>
              <p className="text-xs text-muted-foreground mt-1">
                Selecione &quot;Todos os Professores&quot; para exportar dados de todos,
                ou escolha um professor específico.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
