# Version History

## 1.18.42 - Hotfix схемы БД и маппинга
- **Database:** Добавлена миграция `76_add_item_files.sql`. В таблице `order_items` отсутствовала колонка `item_files`, что блокировало создание заказов.
- **Fix:** Обновлен маппинг в `getOrders` и `getOrderDetails` (добавлено поле `itemFiles`), чтобы позиции корректно отображались на фронтенде.

## 1.18.41 - Полная модуларизация SupabaseService (Шаг 5: Заказы)
...