<div align="center">

<img src="icons/icon-192.png" width="100" alt="Marcaí logo" />

# Marcaí

**Agenda semanal para professores e alunos — PWA, sem frameworks, pronto para produção.**

[![Status](https://img.shields.io/badge/status-ativo-2D6A4F?style=flat-square)](.)
[![PWA](https://img.shields.io/badge/PWA-instalável-5B5EA6?style=flat-square)](.)
[![Supabase](https://img.shields.io/badge/backend-Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![License](https://img.shields.io/badge/licença-MIT-C1440E?style=flat-square)](LICENSE)
[![Zero deps](https://img.shields.io/badge/dependências-zero-F4A261?style=flat-square)](.)

[Demo](#) · [Reportar bug](../../issues) · [Sugerir feature](../../issues)

</div>

---

## O que é

O **Marcaí** resolve um problema simples: professores não têm onde mostrar seus horários disponíveis e alunos não têm onde agendar aulas sem precisar mandar mensagem.

O professor acessa o painel, marca os horários que está ocupado, e pronto — o aluno abre o app e só vê o que está livre para agendar.

Funciona no celular, instala como app e opera parcialmente offline.

---

## Funcionalidades

**Painel do Professor**
- Visualização da semana completa (seg → dom)
- Clique para bloquear ou liberar qualquer horário
- Horários agendados por alunos aparecem destacados (não editáveis)
- Resumo em tempo real: disponíveis / bloqueados / agendados
- Lista de todos os agendamentos recebidos com opção de cancelar

**Agenda do Aluno**
- Só exibe horários realmente disponíveis
- Modal de confirmação com nome e e-mail
- Feedback imediato de sucesso ou conflito

**PWA**
- Instalável no celular (Android e iOS) e no desktop
- Funciona offline com dados em cache
- Banner de aviso quando sem conexão
- Deep links: `?tab=teacher` e `?tab=student`
- Auto-update quando nova versão é publicada

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | HTML + CSS + JavaScript puro (ES Modules) |
| Backend | [Supabase](https://supabase.com) (PostgreSQL + REST API) |
| Offline | Service Worker (Cache API) |
| Fonte | DM Serif Display + DM Sans (Google Fonts) |
| Deploy | Qualquer host estático (Vercel, Netlify, GitHub Pages) |

Zero dependências npm. Zero frameworks. Zero build step.

---

## Estrutura do projeto

```
marcai/
├── index.html          ← App completo (shell HTML + estrutura)
├── manifest.json       ← Identidade PWA (nome, ícones, shortcuts)
├── sw.js               ← Service Worker (cache, offline, push)
├── css/
│   └── style.css       ← Design system (variáveis, componentes, responsivo)
├── js/
│   ├── config.js       ← Horários, dias e credenciais Supabase
│   ├── api.js          ← CRUD com Supabase via fetch REST
│   ├── ui.js           ← Grade semanal, toast, modal
│   ├── teacher.js      ← Lógica do painel do professor
│   ├── student.js      ← Lógica da agenda do aluno
│   ├── pwa.js          ← Registro SW, prompt de instalação, status de rede
│   └── app.js          ← Bootstrap + roteamento entre abas
├── sql/
│   └── schema.sql      ← Tabelas, índices, RLS e dados de exemplo
└── icons/              ← Ícones PWA (72px até 512px)
```

---

## Como rodar

### 1. Supabase

1. Crie uma conta gratuita em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Vá em **SQL Editor** e execute o arquivo `sql/schema.sql`
4. Vá em **Settings → API** e copie a **Project URL** e a **Anon Key**

### 2. Credenciais

**Opção A — via código** (recomendado para produção):

```js
// js/config.js
const SUPABASE_URL = 'https://seuprojeto.supabase.co';
const SUPABASE_KEY = 'sua-anon-key-aqui';
```

**Opção B — via interface** (ideal para testes):

Deixe as variáveis em branco. Na primeira abertura, o app exibe uma tela de configuração. As credenciais ficam salvas no `localStorage` do dispositivo.

### 3. Servidor local

```bash
# Python
python3 -m http.server 3000

# Node.js
npx serve .

# VS Code → extensão Live Server
```

Acesse `http://localhost:3000`

> ⚠️ ES Modules não funcionam via `file://`. Use sempre um servidor HTTP.

### 4. Adicionar um professor

Execute no SQL Editor do Supabase:

```sql
INSERT INTO teachers (name, email)
VALUES ('Ana Silva', 'ana@escola.com');
```

---

## Deploy em produção

O PWA exige **HTTPS**. Opções gratuitas e rápidas:

```bash
# Vercel (recomendado)
npx vercel

# Netlify
npx netlify deploy --prod

# GitHub Pages
# Suba o repositório e ative Pages em Settings → Pages
```

---

## Banco de dados

Três tabelas principais:

```sql
teachers      → cadastro de professores
blocked_slots → horários bloqueados pelo professor
bookings      → agendamentos feitos pelos alunos
```

**Regra central:**

```
horário em blocked_slots  →  invisível para o aluno
horário em bookings       →  invisível para o aluno
qualquer outro            →  visível e agendável
```

---

## Fluxo do sistema

```
PROFESSOR                    SUPABASE                      ALUNO
    │                            │                            │
    ├── abre painel ────────────►│                            │
    │◄── blocked + bookings ─────┤                            │
    │                            │                            │
    ├── clica horário livre ─────►│                            │
    │   INSERT blocked_slots     │                            │
    │◄── slot fica vermelho ──────┤                            │
    │                            │                            │
    │                            │◄─── abre agenda ───────────┤
    │                            ├──── só livres aparecem ───►│
    │                            │                            │
    │                            │◄─── clica + confirma ──────┤
    │                            │   INSERT bookings          │
    │◄── novo agendamento ────────┤───► confirmação ──────────►│
```

---

## Segurança

Este repositório é um **MVP com RLS aberto**. Para produção com dados reais:

- [ ] Ativar Supabase Auth e restringir writes em `blocked_slots` ao professor autenticado
- [ ] Validar disponibilidade antes do INSERT via Edge Function (evita race conditions)
- [ ] Adicionar rate limiting por IP para evitar spam de agendamentos
- [ ] Restringir leitura de `bookings` ao professor dono dos slots

---

## Roadmap

- [ ] Login do professor (Supabase Auth)
- [ ] E-mail de confirmação para o aluno (Edge Function + Resend)
- [ ] Exportar para Google Calendar
- [ ] Horários recorrentes (bloquear toda semana)
- [ ] Navegação entre semanas
- [ ] Push notifications para novos agendamentos
- [ ] Painel multi-professor com subdomain por professor

---

## Contribuindo

Pull requests são bem-vindos. Para mudanças grandes, abra uma issue primeiro.

```bash
git clone https://github.com/seu-usuario/marcai.git
cd marcai
python3 -m http.server 3000
```

---

## Licença

MIT © 2025 — veja [LICENSE](LICENSE) para detalhes.

---

<div align="center">
  <sub>Feito com HTML, CSS e JS puro. Sem complicação.</sub>
</div>
