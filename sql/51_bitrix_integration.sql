-- Добавляем колонку для связи с Битрикс24
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bitrix_deal_id text;

-- ИНСТРУКЦИЯ ПО НАСТРОЙКЕ ВЕБХУКА (SUPABASE DASHBOARD):
-- 1. Перейдите в Supabase Dashboard -> Database -> Webhooks.
-- 2. Нажмите "Create a new webhook".
-- 3. Name: "Bitrix Sync".
-- 4. Table: "orders".
-- 5. Events: "Update".
-- 6. Webhook Type: "Supabase Edge Function".
-- 7. Выберите функцию: "create-bitrix-deal".
-- 8. HTTP Headers: добавьте "Authorization: Bearer [YOUR_SERVICE_ROLE_KEY]" (обычно добавляется само, но проверьте).
--    (На самом деле для Edge Function Webhook в Supabase Dashboard авторизация настраивается автоматически).

-- Альтернативно, триггер можно создать через SQL (если известен URL функции):
/*
create trigger "on_kp_sent_bitrix"
after update on "public"."orders"
for each row
when (
  old.status is distinct from new.status 
  and new.status = 'kp_sent'
  and new.bitrix_deal_id is null
)
execute function supabase_functions.http_request(
  'https://[PROJECT_REF].supabase.co/functions/v1/create-bitrix-deal',
  'POST',
  '{"Content-type":"application/json"}',
  '{}',
  '1000'
);
*/
