-- ============================================================
-- Horivoo — Schema Completo (Supabase / PostgreSQL)
-- Sistema de Agenda Escolar
-- ============================================================

-- 1. Usuários (autenticados via Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('teacher', 'coordinator', 'student')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Professores
CREATE TABLE IF NOT EXISTS public.teachers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  subjects      TEXT DEFAULT '',        -- comma-separated
  bio           TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Coordenadores
CREATE TABLE IF NOT EXISTS public.coordinators (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Alunos
CREATE TABLE IF NOT EXISTS public.students (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Horários disponíveis dos professores (padrão semanal recorrente)
CREATE TABLE IF NOT EXISTS public.teacher_availability (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Dom, 1=Seg, ..., 6=Sáb
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, day_of_week, start_time, end_time)
);

-- 6. Agendamentos (bookings)
CREATE TABLE IF NOT EXISTS public.appointments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id          UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  student_id          UUID REFERENCES public.students(id) ON DELETE SET NULL,
  student_user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  student_name        TEXT NOT NULL,
  student_email       TEXT,
  date                DATE NOT NULL,
  day_of_week         SMALLINT NOT NULL,
  start_time          TIME NOT NULL,
  end_time            TIME NOT NULL,
  status              TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  recurring_id        UUID REFERENCES public.recurring_schedules(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Agendamentos recorrentes (semanais)
CREATE TABLE IF NOT EXISTS public.recurring_schedules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  student_name  TEXT NOT NULL,
  student_email TEXT,
  day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Feriados
CREATE TABLE IF NOT EXISTS public.holidays (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date          DATE NOT NULL,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'nacional' CHECK (type IN ('nacional', 'estadual', 'municipal')),
  recurring     BOOLEAN NOT NULL DEFAULT false
);

-- 9. Recessos
CREATE TABLE IF NOT EXISTS public.recesses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  description   TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Horários bloqueados (por professor, data específica)
CREATE TABLE IF NOT EXISTS public.blocked_slots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Períodos bloqueados (por professor, intervalo de datas)
CREATE TABLE IF NOT EXISTS public.blocked_periods (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Dias sem aula (global, todos os professores)
CREATE TABLE IF NOT EXISTS public.non_class_days (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date          DATE UNIQUE NOT NULL,
  reason        TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON public.teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_coordinators_user_id ON public.coordinators(user_id);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_availability_teacher ON public.teacher_availability(teacher_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_appointments_teacher_date ON public.appointments(teacher_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_student ON public.appointments(student_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_teacher_date ON public.blocked_slots(teacher_id, date);
CREATE INDEX IF NOT EXISTS idx_blocked_periods_teacher ON public.blocked_periods(teacher_id);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON public.holidays(date);
CREATE INDEX IF NOT EXISTS idx_recesses_dates ON public.recesses(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_non_class_days_date ON public.non_class_days(date);
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_teacher ON public.recurring_schedules(teacher_id, active);

-- ============================================================
-- VIEW: Horários ocupados (union de bloqueados + agendados)
-- ============================================================
CREATE OR REPLACE VIEW public.occupied_slots AS
  SELECT
    'booked' AS type,
    a.id,
    a.teacher_id,
    a.date,
    a.start_time,
    a.end_time,
    a.student_name,
    a.status
  FROM public.appointments a
  WHERE a.status = 'confirmed'

  UNION ALL

  SELECT
    'blocked' AS type,
    b.id,
    b.teacher_id,
    b.date,
    b.start_time,
    b.end_time,
    b.reason AS student_name,
    'blocked' AS status
  FROM public.blocked_slots b;

-- ============================================================
-- FUNÇÃO: check_availability(p_teacher_id, p_date, p_start, p_end)
-- Retorna TRUE se o horário está disponível para agendamento
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_availability(
  p_teacher_id UUID,
  p_date DATE,
  p_start TIME,
  p_end TIME
)
RETURNS TABLE (available BOOLEAN, reason TEXT)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  -- 1. Verifica se o professor tem disponibilidade nesse dia da semana
  IF NOT EXISTS (
    SELECT 1 FROM public.teacher_availability ta
    WHERE ta.teacher_id = p_teacher_id
      AND ta.day_of_week = EXTRACT(DOW FROM p_date)
      AND ta.start_time = p_start
      AND ta.end_time = p_end
  ) THEN
    RETURN QUERY SELECT false, 'Professor não atende neste horário'::TEXT;
    RETURN;
  END IF;

  -- 2. Verifica feriado
  IF EXISTS (
    SELECT 1 FROM public.holidays h
    WHERE h.date = p_date
  ) THEN
    RETURN QUERY SELECT false, 'Feriado'::TEXT;
    RETURN;
  END IF;

  -- 3. Verifica recesso
  IF EXISTS (
    SELECT 1 FROM public.recesses r
    WHERE p_date BETWEEN r.start_date AND r.end_date
  ) THEN
    RETURN QUERY SELECT false, 'Recesso'::TEXT;
    RETURN;
  END IF;

  -- 4. Verifica dia sem aula
  IF EXISTS (
    SELECT 1 FROM public.non_class_days ncd
    WHERE ncd.date = p_date
  ) THEN
    RETURN QUERY SELECT false, 'Dia sem aula'::TEXT;
    RETURN;
  END IF;

  -- 5. Verifica horário bloqueado
  IF EXISTS (
    SELECT 1 FROM public.blocked_slots bs
    WHERE bs.teacher_id = p_teacher_id
      AND bs.date = p_date
      AND bs.start_time = p_start
      AND bs.end_time = p_end
  ) THEN
    RETURN QUERY SELECT false, 'Horário bloqueado'::TEXT;
    RETURN;
  END IF;

  -- 6. Verifica período bloqueado
  IF EXISTS (
    SELECT 1 FROM public.blocked_periods bp
    WHERE bp.teacher_id = p_teacher_id
      AND p_date BETWEEN bp.start_date AND bp.end_date
  ) THEN
    RETURN QUERY SELECT false, 'Período bloqueado'::TEXT;
    RETURN;
  END IF;

  -- 7. Verifica agendamento existente
  IF EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.teacher_id = p_teacher_id
      AND a.date = p_date
      AND a.start_time = p_start
      AND a.end_time = p_end
      AND a.status = 'confirmed'
  ) THEN
    RETURN QUERY SELECT false, 'Horário já agendado'::TEXT;
    RETURN;
  END IF;

  -- 8. Verifica agendamento recorrente
  IF EXISTS (
    SELECT 1 FROM public.recurring_schedules rs
    WHERE rs.teacher_id = p_teacher_id
      AND rs.day_of_week = EXTRACT(DOW FROM p_date)
      AND rs.start_time = p_start
      AND rs.end_time = p_end
      AND rs.active = true
  ) THEN
    RETURN QUERY SELECT false, 'Horário recorrente ocupado'::TEXT;
    RETURN;
  END IF;

  -- Disponível!
  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$;

-- ============================================================
-- TRIGGER: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_teachers_updated_at
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_coordinators_updated_at
  BEFORE UPDATE ON public.coordinators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_recurring_schedules_updated_at
  BEFORE UPDATE ON public.recurring_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- TRIGGER: Ao criar agendamento, verificar disponibilidade
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_appointment()
RETURNS TRIGGER AS $$
DECLARE
  avail BOOLEAN;
  reason TEXT;
BEGIN
  SELECT a.available, a.reason INTO avail, reason
  FROM public.check_availability(NEW.teacher_id, NEW.date, NEW.start_time, NEW.end_time) a;

  IF NOT avail THEN
    RAISE EXCEPTION 'Horário indisponível: %', reason;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_appointment
  BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.validate_appointment();

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coordinators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.non_class_days ENABLE ROW LEVEL SECURITY;

-- Coordenadores podem ver/editar tudo
CREATE POLICY "Coordinators full access" ON public.users FOR ALL USING (
  EXISTS (SELECT 1 FROM public.coordinators c WHERE c.user_id = auth.uid())
);
CREATE POLICY "Coordinators full access teachers" ON public.teachers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.coordinators c WHERE c.user_id = auth.uid())
);
CREATE POLICY "Coordinators full access students" ON public.students FOR ALL USING (
  EXISTS (SELECT 1 FROM public.coordinators c WHERE c.user_id = auth.uid())
);
CREATE POLICY "Coordinators full access appointments" ON public.appointments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.coordinators c WHERE c.user_id = auth.uid())
);
CREATE POLICY "Coordinators full access availability" ON public.teacher_availability FOR ALL USING (
  EXISTS (SELECT 1 FROM public.coordinators c WHERE c.user_id = auth.uid())
);
CREATE POLICY "Coordinators full access recurring" ON public.recurring_schedules FOR ALL USING (
  EXISTS (SELECT 1 FROM public.coordinators c WHERE c.user_id = auth.uid())
);
CREATE POLICY "Coordinators full access blocked" ON public.blocked_slots FOR ALL USING (
  EXISTS (SELECT 1 FROM public.coordinators c WHERE c.user_id = auth.uid())
);
CREATE POLICY "Coordinators full access blocked_periods" ON public.blocked_periods FOR ALL USING (
  EXISTS (SELECT 1 FROM public.coordinators c WHERE c.user_id = auth.uid())
);

-- Professores podem ver/editar seus próprios dados
CREATE POLICY "Teachers read own" ON public.teachers FOR SELECT USING (
  user_id = auth.uid()
);
CREATE POLICY "Teachers update own" ON public.teachers FOR UPDATE USING (
  user_id = auth.uid()
);
CREATE POLICY "Teachers manage own availability" ON public.teacher_availability FOR ALL USING (
  teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
);
CREATE POLICY "Teachers manage own blocked" ON public.blocked_slots FOR ALL USING (
  teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
);
CREATE POLICY "Teachers read own appointments" ON public.appointments FOR SELECT USING (
  teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
);
CREATE POLICY "Teachers read own recurring" ON public.recurring_schedules FOR SELECT USING (
  teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
);

-- Alunos podem ver seus próprios agendamentos
CREATE POLICY "Students read own appointments" ON public.appointments FOR SELECT USING (
  student_user_id = auth.uid()
);

-- Feriados e recessos são públicos para leitura
CREATE POLICY "Holidays read all" ON public.holidays FOR SELECT USING (true);
CREATE POLICY "Recesses read all" ON public.recesses FOR SELECT USING (true);
CREATE POLICY "Non class days read all" ON public.non_class_days FOR SELECT USING (true);
CREATE POLICY "Availability read all" ON public.teacher_availability FOR SELECT USING (true);
CREATE POLICY "Appointments read all" ON public.appointments FOR SELECT USING (true);

-- ============================================================
-- DADOS INICIAIS — Feriados Nacionais Brasil 2025
-- ============================================================
INSERT INTO public.holidays (date, name, type, recurring) VALUES
  ('2025-01-01', 'Confraternização Universal', 'nacional', true),
  ('2025-04-21', 'Tiradentes', 'nacional', true),
  ('2025-05-01', 'Dia do Trabalho', 'nacional', true),
  ('2025-09-07', 'Independência do Brasil', 'nacional', true),
  ('2025-10-12', 'Nossa Senhora Aparecida', 'nacional', true),
  ('2025-11-02', 'Finados', 'nacional', true),
  ('2025-11-15', 'Proclamação da República', 'nacional', true),
  ('2025-12-25', 'Natal', 'nacional', true),
  ('2025-03-05', 'Carnaval', 'nacional', false),
  ('2025-06-19', 'Corpus Christi', 'nacional', false)
ON CONFLICT DO NOTHING;

-- Recessos
INSERT INTO public.recesses (start_date, end_date, description) VALUES
  ('2025-07-01', '2025-07-15', 'Recesso de Inverno'),
  ('2025-12-20', '2026-01-05', 'Recesso de Fim de Ano')
ON CONFLICT DO NOTHING;
