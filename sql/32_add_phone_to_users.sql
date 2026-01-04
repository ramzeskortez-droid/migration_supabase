-- Добавляем поле телефона для пользователей
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Обновляем тестовых пользователей (опционально)
UPDATE app_users SET phone = '+7 (999) 000-00-01' WHERE token = 'buy1';
UPDATE app_users SET phone = '+7 (999) 000-00-02' WHERE token = 'buy2';
