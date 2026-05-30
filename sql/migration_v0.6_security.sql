-- ============================================================
-- HORIVOO — Migração v0.6: Segurança
-- Habilita RLS com políticas básicas usando service_role
-- Execute no SQL Editor do Supabase
-- ============================================================

-- A aplicação usa a service_role key que bypassa RLS automaticamente.
-- Estas políticas protegem contra acesso direto via anon key ou
-- conexões externas ao PostgreSQL.

-- Habilitar RLS em todas as tabelas
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE coordinators       ENABLE ROW LEVEL SECURITY;
ALTER TABLE students           ENABLE ROW LEVEL SECURITY;
ALTER TABLE available_slots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE non_class_days     ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays           ENABLE ROW LEVEL SECURITY;
ALTER TABLE recesses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_periods    ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students     ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests              ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance         ENABLE ROW LEVEL SECURITY;
ALTER TABLE make_up_classes    ENABLE ROW LEVEL SECURITY;

-- A service_role bypassa RLS — nenhuma política adicional é necessária
-- para a aplicação funcionar. As políticas abaixo bloqueiam a anon key.

-- Negar acesso anônimo total (política explícita de deny-all para anon)
-- Nenhuma linha retorna para requisições com anon key.
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'users','teachers','coordinators','students',
    'available_slots','blocked_slots','bookings','recurring_bookings',
    'non_class_days','holidays','recesses','blocked_periods','messages',
    'classes','class_students','appointments','tests','attendance','make_up_classes'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format(
      'CREATE POLICY "deny_anon_%1$s" ON %1$s FOR ALL TO anon USING (false)',
      tbl
    );
  END LOOP;
END $$;

-- Confirmar
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
