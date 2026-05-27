-- ============================================================
-- HORIVOO — reset.sql
-- ⚠️  ATENÇÃO: Este arquivo APAGA TODOS OS DADOS do banco.
--     Use APENAS em desenvolvimento ou para resetar o ambiente.
--     NUNCA execute em produção com dados reais.
-- ============================================================

-- Desabilitar triggers temporariamente para evitar erros de FK
SET session_replication_role = replica;

DELETE FROM bookings;
DELETE FROM blocked_slots;
DELETE FROM coordinators;
DELETE FROM teachers;

-- Reabilitar triggers
SET session_replication_role = DEFAULT;

-- Confirmar
SELECT 
  (SELECT COUNT(*) FROM teachers)     AS professores,
  (SELECT COUNT(*) FROM bookings)     AS agendamentos,
  (SELECT COUNT(*) FROM blocked_slots) AS bloqueios,
  (SELECT COUNT(*) FROM coordinators) AS coordenadores;
