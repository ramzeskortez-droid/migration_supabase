-- Создаем бакет 'attachments', если его нет
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Включаем RLS для объектов (обычно включено по умолчанию)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики, чтобы не было конфликтов
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;

-- Создаем политику: Разрешить ВСЕМ (anon и authenticated) читать файлы из папки 'attachments'
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'attachments' );

-- Создаем политику: Разрешить ВСЕМ загружать файлы в папку 'attachments'
-- (Внимание: это разрешает загрузку любому, кто знает URL проекта. Для продакшена нужна защита)
CREATE POLICY "Public Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'attachments' );

-- Разрешаем обновление (на случай перезаписи)
CREATE POLICY "Public Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'attachments' );
