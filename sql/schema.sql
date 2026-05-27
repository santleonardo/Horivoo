-- ============================================================
-- HORIVOO — Schema de Produção
-- Execute no SQL Editor do Supabase (idempotente)
--
-- ⚠️  FIX: Os DELETEs que apagavam todos os dados foram REMOVIDOS.
--     Se precisar limpar o banco, use o arquivo sql/reset.sql
--     separadamente, de forma consciente.
-- ============================================================

-- ============================================================
-- 1. Tabela de professores (com vínculo ao Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS teachers (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id),
  name       TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar coluna user_id se a tabela já existia sem ela
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teachers' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE teachers ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);

-- ============================================================
-- 2. Tabela de agendamentos (feitos pelos alunos)
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id    UUID REFERENCES teachers(id) ON DELETE CASCADE,
  student_name  TEXT NOT NULL,
  student_email TEXT,
  day           TEXT NOT NULL,
  hour          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. Tabela de horários bloqueados pelo professor
-- ============================================================
CREATE TABLE IF NOT EXISTS blocked_slots (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  day        TEXT NOT NULL,
  hour       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, day, hour)
);

-- ============================================================
-- 4. Tabela de coordenadores (com vínculo ao Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS coordinators (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) UNIQUE,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coordinators' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE coordinators ADD COLUMN user_id UUID REFERENCES auth.users(id) UNIQUE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_coordinators_user_id ON coordinators(user_id);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bookings_teacher ON bookings(teacher_id, day);
CREATE INDEX IF NOT EXISTS idx_blocked_teacher  ON blocked_slots(teacher_id, day);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE teachers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE coordinators    ENABLE ROW LEVEL SECURITY;

-- DROP seguro de policies antigas (idempotente)
DROP POLICY IF EXISTS "Leitura pública de professores"        ON teachers;
DROP POLICY IF EXISTS "Professor cria próprio perfil"         ON teachers;
DROP POLICY IF EXISTS "Professor atualiza próprio perfil"     ON teachers;
DROP POLICY IF EXISTS "Coordenador gerencia professores"      ON teachers;

DROP POLICY IF EXISTS "Leitura pública de agendamentos"       ON bookings;
DROP POLICY IF EXISTS "Aluno cria agendamento"                ON bookings;
DROP POLICY IF EXISTS "Professor cancela agendamento"         ON bookings;
DROP POLICY IF EXISTS "Coordenador gerencia agendamentos"     ON bookings;

DROP POLICY IF EXISTS "Leitura pública de bloqueios"          ON blocked_slots;
DROP POLICY IF EXISTS "Professor bloqueia próprios horários"  ON blocked_slots;
DROP POLICY IF EXISTS "Professor desbloqueia próprios horários" ON blocked_slots;
DROP POLICY IF EXISTS "Coordenador gerencia bloqueios"        ON blocked_slots;

DROP POLICY IF EXISTS "Leitura de coordenadores"              ON coordinators;
DROP POLICY IF EXISTS "Coordenador cria próprio perfil"       ON coordinators;

-- ── TEACHERS ────────────────────────────────────────────────────
CREATE POLICY "Leitura pública de professores"
  ON teachers FOR SELECT USING (true);

CREATE POLICY "Professor cria próprio perfil"
  ON teachers FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Professor atualiza próprio perfil"
  ON teachers FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Coordenador gerencia professores"
  ON teachers FOR ALL
  USING (EXISTS (SELECT 1 FROM coordinators WHERE user_id = auth.uid()));

-- ── BLOCKED SLOTS ────────────────────────────────────────────────
CREATE POLICY "Leitura pública de bloqueios"
  ON blocked_slots FOR SELECT USING (true);

CREATE POLICY "Professor bloqueia próprios horários"
  ON blocked_slots FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM teachers WHERE id = blocked_slots.teacher_id AND user_id = auth.uid())
  );

CREATE POLICY "Professor desbloqueia próprios horários"
  ON blocked_slots FOR DELETE USING (
    EXISTS (SELECT 1 FROM teachers WHERE id = blocked_slots.teacher_id AND user_id = auth.uid())
  );

CREATE POLICY "Coordenador gerencia bloqueios"
  ON blocked_slots FOR ALL
  USING (EXISTS (SELECT 1 FROM coordinators WHERE user_id = auth.uid()));

-- ── BOOKINGS ─────────────────────────────────────────────────────
CREATE POLICY "Leitura pública de agendamentos"
  ON bookings FOR SELECT USING (true);

CREATE POLICY "Aluno cria agendamento"
  ON bookings FOR INSERT WITH CHECK (true);

CREATE POLICY "Professor cancela agendamento"
  ON bookings FOR DELETE USING (
    EXISTS (SELECT 1 FROM teachers WHERE id = bookings.teacher_id AND user_id = auth.uid())
  );

CREATE POLICY "Coordenador gerencia agendamentos"
  ON bookings FOR ALL
  USING (EXISTS (SELECT 1 FROM coordinators WHERE user_id = auth.uid()));

-- ── COORDINATORS ─────────────────────────────────────────────────
CREATE POLICY "Leitura de coordenadores"
  ON coordinators FOR SELECT USING (true);

CREATE POLICY "Coordenador cria próprio perfil"
  ON coordinators FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: criar perfil de professor automaticamente no signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Só cria perfil de professor se o e-mail não pertence a um coordenador existente
  IF NOT EXISTS (SELECT 1 FROM public.coordinators WHERE email = NEW.email) THEN
    INSERT INTO public.teachers (user_id, name, email)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      NEW.email
    )
    ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- VIEW: horários ocupados (útil para queries futuras)
-- ============================================================
CREATE OR REPLACE VIEW occupied_slots AS
  SELECT teacher_id, day, hour, 'blocked' AS reason FROM blocked_slots
  UNION ALL
  SELECT teacher_id, day, hour, 'booked'  AS reason FROM bookings;

-- ============================================================
-- COMO ADICIONAR UM COORDENADOR:
--
-- 1. O usuário faz signup normalmente no app (vira professor)
-- 2. No SQL Editor, execute:
--
--   INSERT INTO coordinators (user_id, name, email)
--   SELECT id, raw_user_meta_data->>'name', email
--   FROM auth.users
--   WHERE email = 'coordenador@escola.com';
--
-- 3. Faça logout e login novamente no app.
-- ============================================================
