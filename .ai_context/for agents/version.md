# Version History

## 1.18.41 - Полная модуларизация SupabaseService (Шаг 5: Заказы)
- **Refactoring (Final):**
  - Логика заказов вынесена в `src/services/api/orders/` (`fetch.ts`, `details.ts`, `creation.ts`, `update.ts`, `workflow.ts`, `debug.ts`).
  - Логика чатов вынесена в `src/services/api/chat/`.
  - Логика офферов вынесена в `src/services/api/offers/`.
  - `SupabaseService.ts` теперь является 100% фасадом (оркестратором).
- **Fix:** Исправлена проблема с отображением позиций у закупщика, возникшая в процессе рефакторинга.
- **Optimization:** Удален весь мертвый код из основного сервиса.

## 1.18.40 - Модуларизация сервисов: Авторизация и Закупщик
- **Refactoring (SupabaseService):**
  - **Auth Module:** Логика авторизации вынесена в `src/services/api/auth/` (`login.ts`, `registration.ts`, `users.ts`).
  - **Buyer Module:** Инструменты закупщика вынесена в `src/services/api/buyer/` (`dashboard.ts`, `labels.ts`, `utils.ts`).
  - Основной класс `SupabaseService` очищен от ~150 строк кода реализации, теперь он только импортирует методы.
- **Architecture:**
  - Улучшена читаемость и поддерживаемость кода.
  - Исправлены пути импортов в новых модулях.

## 1.18.39 - Рефакторинг Сервисов и Улучшение Файлов
- **Refactoring:**
  - Начата модуларизация `SupabaseService`. Логика вынесена в подмодули: `finance`, `storage`, `brands`, `settings`.
  - Сам сервис теперь выступает как фасад (Facade), делегирующий вызовы.
...
