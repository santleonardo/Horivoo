-- ============================================================
-- HORIVOO — Schema de Produção com Autenticação
-- Execute este SQL no SQL Editor do Supabase
-- ============================================================

-- ============================================================
-- PASSO 0: Limpar dados fictícios (reset para produção)
-- ============================================================
DELETE FROM bookings;
DELETE FROM blocked_slots;
DELETE FROM teachers;

-- ============================================================
-- 1. Tabela de professores (com vínculo ao Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS teachers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),  -- vínculo com autenticação
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar coluna user_id se a tabela já existe sem ela
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teachers' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE teachers ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Índice para busca por user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);

-- ============================================================
-- 2. Tabela de agendamentos (feitos pelos alunos)
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_email TEXT,
  day TEXT NOT NULL,         -- ex: 'segunda', 'terca', ...
  hour TEXT NOT NULL,        -- ex: '08:00', '13:00', ...
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. Tabela de horários bloqueados pelo professor
-- ============================================================
CREATE TABLE IF NOT EXISTS blocked_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  hour TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, day, hour) -- evita duplicatas
);

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bookings_teacher ON bookings(teacher_id, day);
CREATE INDEX IF NOT EXISTS idx_blocked_teacher ON blocked_slots(teacher_id, day);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Produção com autenticação
-- ============================================================
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas (se existirem)
DROP POLICY IF EXISTS "Leitura pública de professores" ON teachers;
DROP POLICY IF EXISTS "Leitura pública de agendamentos" ON bookings;
DROP POLICY IF EXISTS "Inserção pública de agendamentos" ON bookings;
DROP POLICY IF EXISTS "Leitura pública de bloqueios" ON blocked_slots;
DROP POLICY IF EXISTS "Inserção pública de bloqueios" ON blocked_slots;
DROP POLICY IF EXISTS "Exclusão pública de bloqueios" ON blocked_slots;

-- Teachers: leitura pública, escrita apenas pelo próprio professor autenticado
CREATE POLICY "Leitura pública de professores" ON teachers FOR SELECT USING (true);
CREATE POLICY "Professor cria próprio perfil" ON teachers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Professor atualiza próprio perfil" ON teachers FOR UPDATE USING (auth.uid() = user_id);

-- Blocked slots: leitura pública, escrita apenas pelo professor dono
CREATE POLICY "Leitura pública de bloqueios" ON blocked_slots FOR SELECT USING (true);
CREATE POLICY "Professor bloqueia próprios horários" ON blocked_slots FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM teachers WHERE id = blocked_slots.teacher_id AND user_id = auth.uid())
);
CREATE POLICY "Professor desbloqueia próprios horários" ON blocked_slots FOR DELETE USING (
  EXISTS (SELECT 1 FROM teachers WHERE id = blocked_slots.teacher_id AND user_id = auth.uid())
);

-- Bookings: leitura pública, qualquer aluno pode agendar, professor cancela os seus
CREATE POLICY "Leitura pública de agendamentos" ON bookings FOR SELECT USING (true);
CREATE POLICY "Aluno cria agendamento" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Professor cancela agendamento" ON bookings FOR DELETE USING (
  EXISTS (SELECT 1 FROM teachers WHERE id = bookings.teacher_id AND user_id = auth.uid())
);

-- ============================================================
-- FUNCTION: criar perfil de professor automaticamente após signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.teachers (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: executa após novo usuário se cadastrar no auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- VIEW: horários ocupados
-- ============================================================
CREATE OR REPLACE VIEW occupied_slots AS
  SELECT teacher_id, day, hour, 'blocked' AS reason FROM blocked_slots
  UNION ALL
  SELECT teacher_id, day, hour, 'booked' AS reason FROM bookings;
