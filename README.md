# Horivoo — Sistema de Agenda Escolar

Sistema completo de agendamento e gestão escolar com três perfis de acesso: **Coordenador**, **Professor** e **Aluno**.

## Funcionalidades

- **Coordenador**: Dashboard, Agenda, Professores, Alunos, Turmas, Provas, Reposições, Calendário, Feriados, Recessos, Mensagens, Relatórios, Exportar, Configurações
- **Professor**: Minha Agenda, Disponibilidade, Turmas, Calendário, Mensagens, Perfil
- **Aluno**: Calendário, Minhas Aulas, Provas, Mensagens, Perfil

## Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, shadcn/ui
- **Backend**: Next.js API Routes (App Router)
- **Banco de Dados**: Supabase (PostgreSQL + PostgREST)
- **Auth**: JWT (jose) com hash SHA-256 nativo

## Configuração

### 1. Clone e instale

```bash
git clone https://github.com/seu-usuario/horivoo.git
cd horivoo
npm install
```

### 2. Configure o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Vá em **Settings → API** e copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`
3. Vá no **SQL Editor** e execute os scripts na ordem:
   - `sql/schema.sql`
   - `sql/messages.sql`

### 3. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui
JWT_SECRET=horivoo-mude-isso-em-producao-2025
```

### 4. Rode o projeto

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

### 5. Deploy no Vercel

1. Conecte o repositório no [vercel.com](https://vercel.com)
2. Adicione as variáveis de ambiente em **Settings → Environment Variables**
3. Faça o deploy

## Estrutura

```
src/
├── app/
│   ├── api/           # API Routes (auth, bookings, teachers, etc.)
│   ├── globals.css    # Estilos globais (Tailwind CSS 4)
│   ├── layout.tsx     # Layout raiz
│   └── page.tsx       # Roteador principal por papel
├── components/
│   ├── pages/         # Páginas por funcionalidade
│   ├── ui/            # Componentes shadcn/ui
│   ├── AppSidebar.tsx # Sidebar com navegação por papel
│   └── LoginForm.tsx  # Login/Cadastro
├── hooks/             # Custom hooks
└── lib/
    ├── auth.ts        # JWT + hash de senha
    ├── db.ts          # Cliente Supabase (PostgREST)
    ├── store.ts       # Zustand (auth state)
    └── utils.ts       # Utilitários
sql/
├── schema.sql         # Schema completo do banco
├── messages.sql       # Tabela de mensagens
└── reset.sql          # Reset para desenvolvimento
```
