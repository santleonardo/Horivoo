-- ============================================================
-- HORIVOO — Tabela de Mensagens
-- Execute no SQL Editor do Supabase (adicionar ao schema.sql)
-- ============================================================

CREATE TABLE IF NOT EXISTS messages (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sender_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject     TEXT DEFAULT '',
  body        TEXT NOT NULL,
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, read);
CREATE INDEX IF NOT EXISTS idx_messages_sender   ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created  ON messages(created_at DESC);

ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
