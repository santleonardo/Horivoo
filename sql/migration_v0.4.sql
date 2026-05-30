-- ============================================================
-- HORIVOO — Migração v0.4 (apenas novas tabelas)
-- Execute DEPOIS do schema original já estar rodando.
-- Usa UUID para compatibilidade com tabelas existentes.
-- ============================================================

-- Turmas
CREATE TABLE IF NOT EXISTS classes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  subject    TEXT NOT NULL,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);

-- Relação turma ↔ aluno
CREATE TABLE IF NOT EXISTS class_students (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_class_students_class ON class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student ON class_students(student_id);

-- Agendamentos (appointments)
CREATE TABLE IF NOT EXISTS appointments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id          UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  student_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  class_id            UUID REFERENCES classes(id) ON DELETE SET NULL,
  date                TEXT NOT NULL,
  day_of_week         INT NOT NULL,
  start_time          TEXT NOT NULL,
  end_time            TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'confirmed',
  recurring_group_id  TEXT,
  booking_type        TEXT NOT NULL DEFAULT 'normal',
  original_booking_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  notes               TEXT DEFAULT '',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_appointments_teacher ON appointments(teacher_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_student ON appointments(student_id);
CREATE INDEX IF NOT EXISTS idx_appointments_class ON appointments(class_id);
CREATE INDEX IF NOT EXISTS idx_appointments_recurring ON appointments(recurring_group_id);
CREATE INDEX IF NOT EXISTS idx_appointments_original ON appointments(original_booking_id);
CREATE INDEX IF NOT EXISTS idx_appointments_type ON appointments(booking_type);

-- Provas
CREATE TABLE IF NOT EXISTS tests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  date       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tests_class ON tests(class_id);
CREATE INDEX IF NOT EXISTS idx_tests_date ON tests(date);

-- Presença / Frequência
CREATE TABLE IF NOT EXISTS attendance (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'present',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, appointment_id)
);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_appointment ON attendance(appointment_id);

-- Reposições de aula
CREATE TABLE IF NOT EXISTS make_up_classes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  new_date                TEXT NOT NULL,
  new_start_time          TEXT NOT NULL,
  new_end_time            TEXT NOT NULL,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_makeups_original ON make_up_classes(original_appointment_id);

-- RLS: desabilitar para MVP
ALTER TABLE classes         DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_students  DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments    DISABLE ROW LEVEL SECURITY;
ALTER TABLE tests           DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance      DISABLE ROW LEVEL SECURITY;
ALTER TABLE make_up_classes DISABLE ROW LEVEL SECURITY;
