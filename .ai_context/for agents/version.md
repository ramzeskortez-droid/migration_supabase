# Version History

## 1.18.119 - UI Polishing: Neutral Initial Validation
- **Buyer Interface:**
  - Поля закупщика теперь выглядят нейтрально (без красных рамок и звездочек) при открытии заказа.
  - Валидация активируется точечно только для тех позиций, где введена цена (> 0).
  - Поле цены больше не помечается как "ошибочное", если оно пустое.

## 1.18.118 - Fix: Buyer Dashboard Data Structure
- **Database:**
  - Обновлена SQL-функция `get_buyer_dashboard_stats`. Теперь она возвращает вложенную структуру JSON (personal, department, leaders), полностью совместимую с фронтендом.
  - Исправлен баг, вызывавший `TypeError: Cannot read properties of undefined (reading 'kp_count')`.

## 1.18.117 - Fix: Missing Dashboard Stats
- **Database:** Добавлена отсутствующая функция `get_buyer_dashboard_stats` для расчета KPI закупщика.

## 1.18.116 - Feature: Advanced Drag-and-Drop
- **UX Improvements:**
  - Внедрен глобальный Drag-and-Drop на весь контейнер ордера для Закупщика и Оператора.
  - Реализован локальный сброс файлов на конкретную строку позиции (Drop on Row) с визуальным оверлеем.
  - Добавлены визуальные эффекты: пунктирная рамка и легкий блюр (backdrop-blur) при перетаскивании.
- **Fixes:**
  - Исправлена ошибка дублирования файлов при сбросе на позицию (stopPropagation).
  - Исправлен Race Condition при одновременной загрузке нескольких файлов (переход на Promise.all).
  - Удалена избыточная кнопка "Добавить общие файлы" у закупщика.

## 1.18.115 - Fix: Final Order Approval Logic & Schema Drift
- **Database:**
  - Добавлена отсутствующая SQL-функция `approve_order_winners` для финализации заказа Менеджером.
  - Исправлен дрейф схемы: в таблицу `order_items` добавлена колонка `delivery_weeks` для фиксации итогового срока доставки.
- **Service Layer:**
  - `workflow.ts`: Теперь корректно вызывает RPC `approve_order_winners`.

## 1.18.112 - Security: Supabase Studio Protection
... (остальное без изменений)