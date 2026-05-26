# 📅 Agenda Semanal — Professores

Sistema web simples e funcional para professores gerenciarem sua disponibilidade semanal e alunos agendarem horários.

---

## 🗂 Estrutura de Pastas

```
agenda-professor/
├── index.html          ← Aplicação principal (único arquivo HTML)
├── css/
│   └── style.css       ← Todos os estilos (variáveis, layout, componentes)
├── js/
│   ├── config.js       ← Configuração do Supabase + constantes de horários
│   ├── api.js          ← Serviço de comunicação com o Supabase (REST)
│   ├── ui.js           ← Utilitários de interface (grid, toast, modal)
│   ├── teacher.js      ← Lógica do painel do professor
│   ├── student.js      ← Lógica da agenda do aluno
│   └── app.js          ← Ponto de entrada + roteamento de abas
└── sql/
    └── schema.sql      ← Script SQL completo para o Supabase
```

---

## 🚀 Como Configurar

### 1. Supabase

1. Crie uma conta gratuita em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Vá em **SQL Editor** e execute o conteúdo de `sql/schema.sql`
4. Vá em **Settings → API** e copie:
   - **Project URL** → ex: `https://xyzabc.supabase.co`
   - **Anon/Public Key** → ex: `eyJhbGci...`

### 2. Configuração no código

**Opção A — Direto no arquivo (recomendado para produção):**

Edite `js/config.js`:
```js
const SUPABASE_URL = 'https://seuprojeto.supabase.co';
const SUPABASE_KEY = 'sua-anon-key-aqui';
```

**Opção B — Interface gráfica (primeira abertura):**

Se as variáveis não estiverem preenchidas, o sistema exibe automaticamente uma tela de configuração. As credenciais são salvas na `sessionStorage` e usadas durante a sessão.

### 3. Adicionar professor

Execute no SQL Editor do Supabase:
```sql
INSERT INTO teachers (name, email) VALUES ('Nome do Professor', 'email@escola.com');
```

---

## 🔄 Fluxo do Sistema

```
PROFESSOR                          BANCO DE DADOS                    ALUNO
    |                                    |                              |
    |── abre painel ──────────────────→  |                              |
    |← carrega blocked_slots + bookings ─|                              |
    |                                    |                              |
    |── clica em horário livre ────────→ |                              |
    |   INSERT blocked_slots             |                              |
    |← slot fica vermelho ───────────────|                              |
    |                                    |                              |
    |── clica em horário vermelho ──────→|                              |
    |   DELETE blocked_slots             |                              |
    |← slot fica verde ──────────────────|                              |
    |                                    |                              |
    |                                    |←── aluno abre agenda ────────|
    |                                    |    SELECT blocked + booked   |
    |                                    |── só livres aparecem ───────→|
    |                                    |                              |
    |                                    |←── aluno clica em horário ───|
    |                                    |    INSERT bookings           |
    |                                    |── confirmação ──────────────→|
    |← professor vê novo agendamento ───|                              |
```

### Regras de visibilidade (lógica central)

```
Se horário em blocked_slots  → NÃO aparece para o aluno
Se horário em bookings       → NÃO aparece para o aluno
Caso contrário               → APARECE para o aluno (pode agendar)
```

### No painel do professor

```
Se horário em blocked_slots  → VERMELHO (clique desbloqueia)
Se horário em bookings       → ROXO com nome do aluno (não clicável)
Caso contrário               → VERDE (clique bloqueia)
```

---

## 📐 Arquitetura

### Módulos JS

| Arquivo      | Responsabilidade |
|--------------|-----------------|
| `config.js`  | Dados estáticos: URL, key, dias, horários |
| `api.js`     | CRUD no Supabase via fetch REST |
| `ui.js`      | Renderização da grade, toasts, modal |
| `teacher.js` | Lógica de bloquear/desbloquear, exibir agendamentos |
| `student.js` | Lógica de selecionar e confirmar agendamento |
| `app.js`     | Bootstrap, roteamento entre abas |

### CSS

Organizado em seções comentadas:
- Variáveis de design (cores, fontes, sombras)
- Componentes base (botões, inputs, badges)
- Layout (header, main, grade)
- Estados dos slots (available, blocked, booked, selected)
- Modal, toast, loading
- Responsivo (breakpoints: 900px, 640px, 400px)

---

## 🛡️ Segurança

Para um MVP, as políticas RLS do Supabase estão abertas. Para produção:

1. **Autenticação de professor**: integrar Supabase Auth e restringir writes em `blocked_slots` ao usuário autenticado
2. **Rate limiting**: implementar limite de agendamentos por aluno/IP
3. **Validação server-side**: usar Supabase Edge Functions para validar disponibilidade antes de inserir

---

## 🔮 Expansões Futuras

- **Autenticação**: login de professor via Supabase Auth
- **Notificações**: e-mail automático ao aluno via Supabase Edge Functions + Resend
- **Google Calendar**: exportar agendamentos via Google Calendar API
- **Recorrência**: horários bloqueados toda semana
- **Multi-semanas**: navegar entre semanas diferentes
- **Confirmação de presença**: aluno confirma 24h antes

---

## 📦 Dependências

**Zero dependências externas!**

- Supabase REST API (fetch nativo)
- Google Fonts (DM Serif Display + DM Sans)
- ES Modules nativos do browser

---

## 🖥️ Como Rodar Localmente

```bash
# Qualquer servidor estático serve. Exemplos:

# Python
python3 -m http.server 3000

# Node.js (npx)
npx serve .

# VS Code: usar extensão Live Server
```

Acesse: `http://localhost:3000`

> ⚠️ Não abra o `index.html` direto no browser (file://) — ES Modules requerem servidor HTTP.
