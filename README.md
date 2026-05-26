# Horivoo — Agenda de Professores

PWA de agenda semanal com autenticação via Supabase Auth.

## Funcionalidades

- **Tela de login**: Professores fazem login com e-mail/senha
- **Criar conta**: Professores criam conta e perfil automaticamente
- **Recuperar senha**: Link de recuperação por e-mail
- **Modo visitante**: Alunos acessam sem conta para ver horários e agendar
- **Painel do professor**: Bloquear/desbloquear horários, ver agendamentos
- **Agenda do aluno**: Ver horários disponíveis e agendar
- **PWA instalável**: Funciona offline no celular

## Configuração do Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Vá em **Settings > API** e copie a **URL** e a **anon key**
3. No **SQL Editor**, execute o arquivo `sql/schema.sql`
4. Vá em **Authentication > Providers** e certifique-se de que **Email** está habilitado
5. (Opcional) Em **Authentication > Email Templates**, personalize os templates

### Configuração de Email no Supabase

Para desativar a confirmação de email (login direto após signup):
1. Vá em **Authentication > Providers > Email**
2. Desative **Confirm email**
3. Salve

Para manter confirmação de email (mais seguro):
1. Deixe **Confirm email** ativado
2. O usuário receberá um email de confirmação após criar a conta

## Deploy

### Vercel (recomendado)

1. Faça upload dos arquivos para um repositório GitHub
2. Conecte o repositório ao Vercel
3. O deploy será automático

### Estrutura de arquivos

```
/
  index.html
  manifest.json
  sw.js
  css/style.css
  js/
    app.js
    api.js
    auth.js
    config.js
    pwa.js
    student.js
    teacher.js
    ui.js
  sql/schema.sql
  icons/
    icon-72.png ... icon-512.png
```

## Primeiro acesso

1. Ao abrir o app, será exibida a tela de configuração do Supabase
2. Cole a URL e anon key do seu projeto
3. Clique em "Conectar e continuar"
4. Na tela de login, crie uma conta de professor ou entre como visitante (aluno)
5. O perfil de professor é criado automaticamente no signup

## Fluxos

### Professor
1. Cria conta com nome, e-mail e senha
2. Perfil de professor é criado automaticamente via trigger SQL
3. Faz login e acessa o painel do professor
4. Pode bloquear/desbloquear horários e ver/cancelar agendamentos

### Aluno (visitante)
1. Clica em "Continuar como aluno"
2. Seleciona um professor
3. Vê horários disponíveis e agenda
4. Pode clicar em "Entrar" no header para fazer login como professor
