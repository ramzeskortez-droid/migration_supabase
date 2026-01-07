-- sql/50_incoming_emails.sql
-- Таблица для хранения входящих писем
CREATE TABLE IF NOT EXISTS incoming_emails (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    from_address text,
    subject text,
    body text,
    status text DEFAULT 'new' -- 'new', 'processed', 'ignored'
);

-- Включаем Realtime для этой таблицы
ALTER PUBLICATION supabase_realtime ADD TABLE incoming_emails;

-- Индекс для быстрого поиска новых писем
CREATE INDEX IF NOT EXISTS idx_emails_status ON incoming_emails(status);
