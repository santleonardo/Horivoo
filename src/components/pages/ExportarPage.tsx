'use client'

import { useState } from 'react'
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
import {
  Download,
  FileText,
  Loader2,
  CalendarDays,
  Users,
  GraduationCap,
  ClipboardCheck,
} from 'lucide-react'
import { toast } from 'sonner'

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface ExportOption {
  type: string
  title: string
  description: string
  icon: React.ElementType
  color: string
  filename: string
}

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const EXPORT_OPTIONS: ExportOption[] = [
  {
    type: 'appointments',
    title: 'Agendamentos',
    description: 'Exporte todos os agendamentos com data, horário, professor, aluno e status.',
    icon: CalendarDays,
    color: 'bg-emerald-50 text-emerald-600',
    filename: 'agendamentos.csv',
  },
  {
    type: 'students',
    title: 'Alunos',
    description: 'Exporte a lista de alunos com seus dados de contato e turmas.',
    icon: Users,
    color: 'bg-sky-50 text-sky-600',
    filename: 'alunos.csv',
  },
  {
    type: 'teachers',
    title: 'Professores',
    description: 'Exporte a lista de professores com disciplinas e turmas.',
    icon: GraduationCap,
    color: 'bg-amber-50 text-amber-600',
    filename: 'professores.csv',
  },
  {
    type: 'attendance',
    title: 'Frequência',
    description: 'Exporte os registros de frequência com aluno, aula e status.',
    icon: ClipboardCheck,
    color: 'bg-teal-50 text-teal-600',
    filename: 'frequencia.csv',
  },
]

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export function ExportarPage() {
  const { authFetch } = useAppStore()

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [exportingType, setExportingType] = useState<string | null>(null)

  const handleExport = async (option: ExportOption) => {
    setExportingType(option.type)
    try {
      const params = new URLSearchParams()
      params.set('type', option.type)

      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)

      const url = `/api/export?${params.toString()}`
      const res = await authFetch(url)

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Erro ao exportar' }))
        throw new Error(errData.error || 'Erro ao exportar dados')
      }

      // Download as CSV
      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = option.filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)

      toast.success(`${option.title} exportado com sucesso!`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao exportar dados')
    } finally {
      setExportingType(null)
    }
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Exportar</h1>
        <p className="text-sm text-muted-foreground">Exporte os dados do sistema em formato CSV</p>
      </div>

      {/* Date range filter */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-emerald-600" />
            <CardTitle className="text-base">Filtro de Período</CardTitle>
          </div>
          <CardDescription>
            Selecione um intervalo de datas para filtrar os dados exportados (opcional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1.5">
              <Label className="text-xs">Data início</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data fim</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-44"
              />
            </div>
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setDateFrom(''); setDateTo('') }}
              >
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Export options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {EXPORT_OPTIONS.map(option => {
          const Icon = option.icon
          const isExporting = exportingType === option.type

          return (
            <Card key={option.type} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${option.color}`}>
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{option.title}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {option.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => handleExport(option)}
                  disabled={isExporting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="size-4 mr-2" />
                      Exportar CSV
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Info card */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <FileText className="size-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-medium">Sobre a exportação</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>Os arquivos são exportados no formato CSV (valores separados por vírgula).</li>
                <li>Compatível com Microsoft Excel, Google Sheets e LibreOffice Calc.</li>
                <li>Se nenhum período for selecionado, todos os registros serão exportados.</li>
                <li>Os dados são gerados em tempo real a partir do banco de dados atual.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
