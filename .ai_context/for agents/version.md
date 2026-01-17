# Version History

## 1.18.115 - Fix: Final Order Approval Logic & Schema Drift
- **Database:**
  - Добавлена отсутствующая SQL-функция `approve_order_winners` для финализации заказа Менеджером.
  - Исправлен дрейф схемы: в таблицу `order_items` добавлена колонка `delivery_weeks` для фиксации итогового срока доставки.
- **Service Layer:**
  - `workflow.ts`: Теперь корректно вызывает RPC `approve_order_winners`.

## 1.18.112 - Security: Supabase Studio Protection
- **Infrastructure:**
  - Supabase Studio переведена на внутренний порт (8002) и закрыта для внешнего мира.
  - Доступ организован через Nginx на порту 8001 с использованием Basic Authentication (логин/пароль).
  - На сервере включена SSH-аутентификация по паролю по запросу пользователя.
- **Documentation:**
  - Обновлен файл `ДОСТУПЫ/access.md`: добавлены инструкции по входу в Studio и настройки SSH-туннеля.
- **Git:**
  - Файлы с доступами добавлены в `.gitignore` для предотвращения утечки секретов.

## 1.18.111 - Глобальная очистка проекта и подготовка к деплою
... (остальное без изменений)
