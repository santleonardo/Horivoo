-- ============================================================
-- AGENDA SEMANAL DE PROFESSORES — Schema Supabase
-- ============================================================

-- 1. Tabela de professores
CREATE TABLE IF NOT EXISTS teachers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de agendamentos (feitos pelos alunos)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_email TEXT,
  day TEXT NOT NULL,         -- ex: 'segunda', 'terca', ...
  hour TEXT NOT NULL,        -- ex: '08:00', '13:00', ...
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de horários bloqueados pelo professor
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
-- ROW LEVEL SECURITY (RLS) — habilitar para segurança
-- ============================================================
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para MVP (ajuste conforme autenticação futura)
CREATE POLICY "Leitura pública de professores" ON teachers FOR SELECT USING (true);
CREATE POLICY "Leitura pública de agendamentos" ON bookings FOR SELECT USING (true);
CREATE POLICY "Inserção pública de agendamentos" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Leitura pública de bloqueios" ON blocked_slots FOR SELECT USING (true);
CREATE POLICY "Inserção pública de bloqueios" ON blocked_slots FOR INSERT WITH CHECK (true);
CREATE POLICY "Exclusão pública de bloqueios" ON blocked_slots FOR DELETE USING (true);

-- ============================================================
-- DADOS DE EXEMPLO — Professor inicial
-- ============================================================
INSERT INTO teachers (name, email) VALUES
  ('Prof. Ana Silva', 'ana.silva@escola.com')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- VIEW ÚTIL: horários livres (consulta combinada)
-- ============================================================
-- Esta view pode ser usada no futuro como referência
-- SELECT * FROM available_slots WHERE teacher_id = '...' AND day = 'segunda';

CREATE OR REPLACE VIEW occupied_slots AS
  SELECT teacher_id, day, hour, 'blocked' AS reason FROM blocked_slots
  UNION ALL
  SELECT teacher_id, day, hour, 'booked' AS reason FROM bookings;
