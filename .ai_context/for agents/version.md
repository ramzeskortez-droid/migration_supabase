# Version History

## 1.17.3 - Фикс счетчиков и переключения вкладок закупщика
- **Buyer Interface:** Добавлен принудительный вызов `refetch()` при смене вкладок (исправлено "залипание" списка).
- **Service:** Исправлен баг в `getBuyerTabCounts`, вызывавший обнуление счетчиков из-за конфликта запросов.
- **Service:** Оптимизирована логика исключения ID (`not in`) в запросах к заказам.

## 1.17.2 - Исправление глобального поиска и счетчиков закупщика
- **Search:** Исправлен поиск по позициям, брендам и артикулам (реализован двухэтапный запрос ID). Теперь поиск "бенз" работает корректно.
- **Buyer Interface:** 
  - Исправлена работа счетчиков в табах (теперь показывают актуальные данные).
  - Исправлено переключение между вкладками (список обновляется согласно выбранному фильтру).
  - Уточнена логика фильтрации "свой/чужой" оффер.

## 1.17.1 - Hotfix синтаксической ошибки
- **Fix:** Исправлена ошибка компиляции `Expected ")" but found "as"` в `SupabaseService.ts` (метод `getOrders`).

## 1.17.0 - Глобальный поиск, динамические бренды и логика "Горящих"
- **Search:** Реализован сквозной поиск по ID, теме, позициям, брендам, артикулам и почте клиента во всех интерфейсах. Внедрен "нечеткий" (fuzzy) поиск.
- **Buyer Interface:** 
  - **Dynamic Brands:** Быстрые теги брендов теперь формируются автоматически (ТОП-7) из активных заказов.
  - **Full Brand Search:** В выпадающем списке реализован серверный поиск по всей базе (3000+ брендов).
  - **"Hot" Tab:** Заказы со статусом "В обработке", созданные > 3 дней назад и без офферов, теперь отображаются только в табе "Горящие 🔥" со статусом "ГОРИТ".
  - **Counters:** Исправлена логика расчета счетчиков во всех табах.
  - **Infinite Scroll:** Бесконечная подгрузка данных теперь работает для всех вкладок (Новые, Горящие, Отправленные).
- **Service:** Оптимизирован метод `getOrders` для поддержки расширенного поиска и серверной фильтрации табов.

## 1.16.4 - Улучшение UX менеджера и финализация навигации
- **Admin Interface:** Сделана кликабельной вся строка товара в деталях заказа для раскрытия предложений (офферов).
- **UX:** Добавлен стиль `cursor-pointer` для интерактивных строк в панели менеджера.

## 1.16.3 - Hotfix: Исправление ошибки создания оффера (UUID validation)
- **Fix:** Исправлен порядок аргументов в вызове `SupabaseService.createOffer`. Ранее в поле `userId` ошибочно передавался номер телефона, что вызывало ошибку БД `invalid input syntax for type uuid`.

## 1.16.2 - Исправление стабильности и восстановление логики
- **Fix:** Полное восстановление `OperatorInterface.tsx` (исправлена бесконечная загрузка профиля).
- **Fix:** Восстановление констант и структуры в `BuyerOrdersList.tsx` (исправлена ошибка GRID_COLS).
- **Fix:** Восстановлены импорты и работоспособность Dropdown-меню в `App.tsx`.
- **UX:** Улучшена точность автоматического скролла к заказу.

## 1.16.1 - Умная навигация и авто-скролл
- **Navigation:** Реализован автоматический выбор вкладки (таба) при переходе из чата к заказу для Оператора и Закупщика.
- **Scroll:** Внедрен плавный автоматический скролл к нужному заказу в списке (Virtuoso integration).
- **Service:** Добавлен метод `getOrderStatus` для быстрого определения местоположения заказа.
- **Fix:** Исправлена опечатка в методе `getStatusCounts`.

## 1.16.0 - Рефакторинг навигации, мульти-вложения в чате и улучшения UI
- **Global UI:** Группировка кнопок интерфейсов в один выпадающий список (Dropdown), удалена кнопка Debug.
- **Chat:** 
  - Реализована возможность прикреплять **несколько позиций** к одному сообщению.
  - Кнопка "В архив" скрывается, если чат уже находится в архиве.
  - Оптимизирована скорость архивации и восстановления чатов (мгновенное обновление).
- **Buyer Interface:** 
  - Заменена иконка камеры на превью фото от оператора в деталях заказа.
  - Исправлен формат копирования позиций: "Наименование Бренд Артикул Кол-во Ед.".
  - Добавлена нумерация при копировании всего заказа.
  - Исправлено наложение подсказок (?) дашборда на шапку при скролле.
- **Operator Interface:**
  - Возвращен компонент поиска в архив заявок.
  - Исправлена навигация из чата к конкретному заказу (через поиск).

## 1.15.3 - Исправление раскрытия офферов и фикс регистрации (RLS)
- **UX:** Теперь вся строка товара кликабельна для раскрытия вариантов цен (ранее только иконка ">").
- **Fix:** Добавлена миграция для исправления ошибки RLS при регистрации новых пользователей (`Allow anonymous registration`).

## 1.15.2 - Исправление наследования данных, отображения фото и модерации
- **Data Inheritance:** Исправлено наследование адреса (location) — теперь значение из поля "Адрес" корректно сохраняется в БД и отображается во всех интерфейсах вместо заглушки "РФ".
- **UI/UX (Operator):** 
  - Раскрытие заказа теперь работает при клике в любое место строки (а не только по иконке ">").
  - В развернутом виде теперь отображаются варианты (офферы) не только для статуса "КП готово", но и для "КП отправлено".
  - Исправлено отображение фото в развернутом списке: теперь используется `opPhotoUrl` (фото оператора), если фото нет — выводится "-".
  - Убрана метка "(макс 40)" у поля Адрес.
- **Auth & Moderation:**
  - Кнопка регистрации переименована в "Подать заявку".
  - После регистрации пользователь больше не входит в систему автоматически, а видит сообщение об ожидании проверки менеджером.
  - Улучшена обработка ошибок входа для аккаунтов со статусом "pending".

## 1.15.1 - Улучшения UX и опциональные поля
- **UX:** Очищены названия полей (убраны лимиты символов из заголовков), добавлен плейсхолдер "Иван".
- **Validation:** Поле "Телефон" теперь не является обязательным. 
- **UI:** Обязательные поля (Наименование, Бренд) помечены красной звездочкой (*).
- **Fix:** Исправлена ошибка бесконечной загрузки профиля и ReferenceError (handleAddBrand).

## 1.15.0 - Ужесточение валидации брендов и улучшения интерфейса оператора
- **Validation:** Новая логика "светофора" для брендов.
  - Зеленый: Строгое совпадение (с учетом регистра) или флаг "Новый бренд".
  - Желтый: Нестрогое совпадение (регистр) или частичное совпадение (подсказки). Состояние сохраняется при потере фокуса.
  - Красный: Нет совпадений в базе и нет подсказок.
- **UI:** 
  - Кнопка "Создать заявку" блокируется, если хотя бы один бренд не "зеленый".
  - Добавлена кнопка "+" (Добавить как новый бренд) в поле ввода бренда.
  - Поле "Количество" теперь принимает только целые числа, убраны стрелки выбора.
  - Поле "Телефон" ограничено 20 символами.
  - Добавлено новое поле "Почта клиента" в форму заявки.
- **Database:** Добавлена колонка `client_email` в таблицу `orders` (Миграция 56).

## 1.14.4 - Исправление критической ошибки отображения заказов
- **Fix:** Исправлена ошибка `ReferenceError: labelsMap is not defined` в `SupabaseService.getOrders`.
- **Logic:** Добавлена инициализация и загрузка стикеров только при наличии `buyerToken`.

## 1.14.3 - Исправление ошибок в интерфейсе Закупщика
- **Fix:** Удален мертвый код (`showCopiedToast`, `copyToClipboard`) в `BuyerOrderDetails.tsx`, вызывавший падение приложения.

## 1.14.2 - Восстановление методов SupabaseService
- **Fix:** Полное восстановление методов `createOrder`, `subscribeToUserChats` и других в сервисном слое.

## 1.14.1 - Hotfixes и обновление AI
- **Fixes:**
  - Восстановлены методы чата и подписок в `SupabaseService.ts` (критический фикс).
  - Исправлена ошибка `ownerToken` в `OperatorOrdersList.tsx`.
  - Удалены последние упоминания `car` и `vin` из JSX-компонентов.
  - Форма `NewOrderForm` упрощена до списка товаров.
- **AI:** Обновлен Groq API Key в конфигурации.

## 1.14.0 - Глобальный Рефакторинг и Оптимизация Схемы
- **Database Refactor:**
  - Удалены устаревшие поля автомобилей (`car_brand`, `car_model`, `vin`).
  - Переход от строковых `owner_token` к внешним ключам `owner_id` (UUID).
  - Унификация цен: удалены `admin_price_rub`, `calculated_price_rub`. Теперь используется единое поле `admin_price` (RUB).
- **Codebase Clean-up:**
  - Полная реструктуризация проекта: исходный код перенесен в папку `src/`.
  - Удален мертвый код и неиспользуемые скрипты.
  - Обновлены все сервисы и типы данных под новую схему БД.

## 1.13.1 - Багфиксы и Optimistic UI
- **Bug Fixes:**
  - Исправлена проблема "связанных" чекбоксов: выбор лидера теперь работает строго по уникальным ID, что решает конфликты при одинаковых названиях товаров.
  - Исправлен баг "прыгающих строк": добавлена принудительная сортировка позиций по ID в `getOrderDetails`.
  - Разрешен множественный выбор победителей для одной позиции заказа.
- **Performance & UI:**
  - Внедрен **Optimistic UI** для выбора лидера: интерфейс подсвечивается мгновенно, не дожидаясь ответа от БД.
  - Оптимизирована логика сопоставления офферов с позициями заказа (ID-first approach).

## 1.13.0 - Интеграция с Bitrix24 и рефакторинг воронки
- **Bitrix24 Integration:**
  - Реализована Edge Function `create-bitrix-deal` для автоматического создания сделок в CRM.
  - Настроена синхронизация данных: поиск/создание контакта по телефону, создание сделки в стадии "Подписан", загрузка товарных позиций.
  - Добавлена колонка `bitrix_deal_id` в таблицу заказов для связи систем.
  - Решена проблема с просроченными SSL-сертификатами тестовых доменов через использование HTTP-протокола.
- **Manager Workflow:**
  - Табы переработаны под новую воронку: "КП готово" (внутренний статус) и "КП у клиента" (внешний статус).
  - Улучшена логика фильтрации: заказы больше не исчезают при смене статуса оператором.
  - Реализовано принудительное обновление (`refetch`) данных при переключении вкладок.
- **Operator UI:**
  - Исправлен фильтр в табе "Обработанные", теперь он включает статус "КП отправлено".

## 1.12.1 - Оптимизация Почтового Модуля
- **Email Module:**
  - Реализован почтовый виджет в сайдбаре оператора с поддержкой вкладок "Новые" и "Архив".
  - Настроена автоматическая обработка писем: при нажатии "В Ассистент" текст письма с темой передается в AI, а само письмо уходит в архив.
  - Подключен Supabase Realtime для мгновенного отображения входящих писем из Gmail.
  - Создана инфраструктура для синхронизации Gmail через Edge Functions (v10).
- **Operator UI Redesign:**
  - Сайдбард логов удален для очистки рабочего пространства.
  - Статус системы перенесен в горизонтальную панель под блоком ИИ-ассистента.
  - Все технические метрики переведены на русский язык ("Лимит токенов", "Лимит запросов"), восстановлен таймер сброса лимитов.
- **Copy Engine:**
  - Добавлен отладочный поп-ап `DebugCopyModal` для предпросмотра текста перед копированием.
  - Унифицированы кнопки копирования для закупщика и оператора (Indigo-стиль).

## 1.11.0 - Копирование данных и Улучшения UX
- **Data Export:**
  - Реализован функционал копирования позиций в буфер обмена по маске.
  - Добавлен компонент `DebugCopyModal` для предпросмотра текста перед копированием (режим отладки).
  - Оператор: Копирование доступно в табе "Обработанные". Маска включает наименование, бренд, количество и все варианты (офферы) с ценами и сроками.
  - Закупщик: Копирование доступно в табе "Новые". Упрощенная маска (без цен) для быстрой работы с заявками.
- **UI/UX Fixes:**
  - Исправлена верстка таблицы позиций у оператора: увеличена ширина колонки № (с 50px до 90px), чтобы кнопки управления не накладывались на текст.
  - Кнопки копирования получили новый акцентный стиль (Indigo) для лучшей видимости.
  - Удалены дублирующиеся кнопки "Копировать всё" из интерфейса оператора.
- **Logic:**
  - Оператор теперь видит офферы в деталях заказа только после официального утверждения КП (статус "КП готово"), что предотвращает преждевременный просмотр промежуточных данных.

## 1.10.5 - Комментарии Поставщика
- **Admin Interface:**
  - Реализовано отображение комментариев поставщика к каждой позиции в таблице офферов. Комментарий выводится в отдельном желтом блоке под строкой с ценами, чтобы менеджер не пропустил важные уточнения.

## 1.10.4 - Логика Статистики Заказа
- **Admin Interface:**
  - Переработан счетчик в колонке "Позиций": теперь он показывает количество строк, на которые получен хотя бы один оффер (независимо от выбора лидера). Это позволяет менеджеру сразу видеть полноту проработки заказа закупщиками.

## 1.10.1 - Чат: Hotfix импортов
- Исправлена ошибка `ReferenceError: Archive is not defined` в компонентах `GlobalChatWindow.tsx` и `BuyerGlobalChat.tsx`.
- Исправлена ошибка `ReferenceError: Loader2 is not defined` в компоненте `ChatWindow.tsx`.

## 1.10.0 - Вложения в чате и Архивация
- **Chat Engine:**
  - Реализована отправка файлов (изображений и документов) через иконку "Скрепка".
  - Создан компонент `ChatImage` с индикатором загрузки (Spinner), устраняющий мерцание при отрисовке вложений.
  - Добавлены колонки `file_url` и `file_type` в таблицу `chat_messages` (Миграция 49).
- **Chat Management:**
  - Логика удаления чатов заменена на **Архивацию**. Теперь при нажатии на "крестик" диалог перемещается в архив у обоих участников.
  - Исправлена критическая ошибка `TypeError` в интерфейсе закупщика при отсутствии статистики конкурентов.
  - Добавлен `.trim()` при сравнении имен в Realtime, что решило проблему "залипания" счетчиков.
- **Header & Global UI:**
  - Оптимизировано пространство в шапке: удалены контакты, блок курсов валют перенесен направо.
  - Исправлен лейбл кросс-курса на актуальный `$/¥`.
  - Увеличен `z-index` шапки до 100 для корректного перекрытия контента при скролле.

## 1.9.1 - Buyer UX & Operator Identity
- **Buyer Interface:**
  - **Best Price & Best Time:** Stats are now displayed directly above the input fields ("ЛУЧШАЯ: ...") for immediate comparison.
  - **Validation:** Enforced a minimum delivery time of 4 weeks with explicit red warning text ("минимум 4 недели").
  - **Notifications:** Updated the success toast to include the specific Order ID.
  - **Security:** Strict state reset (editing drafts, expanded views) and cache cleanup on logout.
  - **Auth:** Instant login for Demo accounts without extra clicks.
- **Operator Identity:**
  - Prepared SQL migration to rename demo accounts (`op1` -> Женя, `op2` -> Ваня) for correct display in Chat.

## 1.9.0 - Buyer KPI & Gamification
- **Database & Stats:**
  - Implemented `monthly_buyer_stats` table for tracking KPI metrics.
  - Added triggers `tr_kp_sent` and `tr_offer_win` for real-time statistics calculation.
  - Created RPC function `get_buyer_dashboard_stats` to provide aggregated JSON for the UI.
  - Added `created_by` field to `offers` table to link authorship.
- **Service Layer:**
  - Updated `SupabaseService.createOffer` to record the `userId`.
  - Added `SupabaseService.getBuyerDashboardStats` for frontend integration.
- **Buyer Interface:**
  - Replaced legacy market stats with a new, unified **KPI Dashboard**.
  - New components: `TotalKpiCard` (Department Turnover), `KpiCard` (Personal Stats), and `LeaderBoard` (Competition & Progress).
  - Implemented `useBuyerStats` hook for efficient data fetching.
  - Optimized dashboard UI: compact layout, unified container, and clear dividers.

## 1.8.1 - Reference Assets
- **Project Structure:** Added `temp_sup` folder containing reference components and guidelines for the new dashboard implementation.

## 1.8.0 - Listing Uniformity
- **Admin Interface:**
  - Aligned all columns and data rows in the main order listing to the **left** for improved readability and visual consistency.
  - Renamed the "ДАТА" (Date) column header to "ДАТА СОЗДАНИЯ" (Date Created) to more accurately describe the data.
  - Standardized the placement of status badges and counters.

## 1.7.9 - Manager List Enhancements
- **Admin Interface:** Added "СРОК ДО" (Deadline) column to the main order listing. Deadlines are displayed in bold red text with a light red background for high visibility, matching the operator's view.

## 1.7.8 - Layout Compactness
- **App Wrapper:** Removed `pb-20` from the main container in `App.tsx` to eliminate excessive empty space at the bottom of the screen.
- **Operator Interface:** Reduced bottom padding in `OperatorOrdersList` for a tighter layout.

## 1.7.7 - Syntax Fix & Highlight Update
## 1.7.6 - Leader Offer Visualization
- **Admin Interface:**
  - Enhanced the highlighting of the selected "Leader" offer row with a more solid green background (`bg-emerald-50`) and a thick left accent border (`border-l-4 border-emerald-500`).
  - Added a pulsating status dot next to the winner's name for immediate visual recognition.
  - Applied the highlighting to the entire offer block, including the supplier comment field.

## 1.7.5 - Responsive Offer Table & Bidding Control
- **Admin Interface:**
  - Optimized `OFFER_GRID` layout using fractional units to ensure the "Select" button is visible on standard screens.
  - Added horizontal scrolling support for the offers section to prevent data cutoff.
  - Implemented bidding access control: the "Select" button is now only active during the "In processing" and "Bidding" stages.
  - Improved table compactness and typography.

## 1.7.4 - Space Optimization & Price Editing
- **Admin Interface:**
  - Implemented a collapsible sidebar that expands on hover, maximizing horizontal space for tables.
  - Restored the "Pencil" icon and manual price override logic in `AdminItemsTable`.
  - Improved layout responsiveness for wide screens.

## 1.7.3 - UI Media Unification
- **Admin Interface:** Replaced the file icon in the lot header with a visual thumbnail preview for operator photos, matching the style of supplier offers.

## 1.7.2 - Manager Order View Redesign
- **Admin Interface:**
  - Completely rebuilt `AdminItemsTable` to follow the new hierarchical design (Lots > Offers).
  - Added new columns: Brand, Article, and UOM directly to the lot header.
  - Implemented dual-photo logic: operator photo in the lot row, supplier thumbnail in the offer row.
  - Moved the comment field into the individual offer rows for per-supplier notes.
  - Applied new styling with gradients and a dark sub-header for offers.

## 1.7.1 - Quick Brands Logic Fix (Buyer)
- **Supabase Service:** 
  - Optimized `getSupplierUsedBrands` to use case-insensitive matching (`ilike`) for supplier names.
  - Improved data retrieval logic to fetch brand history directly via linked orders and items.
  - Increased the number of displayed quick brand tags to 10.
- **Buyer Interface:** Fixed an issue where brand history was inconsistent across different environments (local vs server).

## 1.7.0 - Buyer Interface Restoration
- **Supabase Service:** Restored `getBrandsList` to support legacy static filters.
- **Buyer Interface:** 
  - Fixed the Brand filter dropdown which was broken due to missing data.
  - Cleaned up `BuyerToolbar`: removed the redundant "Plus" button next to the Brands selector.
  - Ensured `availableBrands` are correctly fetched and displayed.

## 1.6.9 - Partial Match Visualization
- **Operator Interface:**
  - Restored the **Warning (Yellow)** state in `PartsList` for brand inputs.
  - The field now turns yellow if partial matches are found in the DB (e.g., typing "Mak" when "Makita" exists).
  - Added visual priority: Green (Exact case-insensitive match) > Yellow (Partial matches available) > Red (No results).
  - Improved the user experience by providing immediate feedback during the typing process.

## 1.6.8 - Robust Brand Validation & Register Correction
- **Supabase Service:** Updated `checkBrandExists` to be case-insensitive and return the actual database casing.
- **Operator Interface:**
  - Redesigned `PartsList` validation: brands are now verified in the background for all items simultaneously.
  - Implemented **Register Correction**: if a user types a brand in the wrong case (e.g., "makita"), a 🔄 button appears to instantly fix it to the DB version ("Makita").
  - Simplified order creation logic: the "Create" button is no longer hard-blocked by the database brand check, preventing UX deadlocks.
  - Added brand verification caching to minimize redundant API calls.

## 1.6.7 - ReferenceError Fix & Cleanup
- **Operator Interface:** Removed all remaining `brandsList` references from `OperatorInterface.tsx` and `AiAssistant.tsx` to fix a runtime crash.
- **AiAssistant:** Removed brand normalization logic, delegating it to the dynamic check in `PartsList`.

## 1.6.6 - Dynamic Brand Autocomplete (Operator)
- **Supabase Service:** Added `searchBrands` and `checkBrandExists` for real-time brand verification.
- **Operator Interface:**
  - Replaced static brand list loading with dynamic server-side autocomplete.
  - Implemented "live" validation in `PartsList`: brands are now verified against the entire DB (3100+ entries) as the user types.
  - Added visual status indicators: ✅ for verified brands, ⚠️ for unknown brands.
  - Optimized performance by removing the need to download the full brand dictionary.

## 1.6.5 - Global Brand Sync & Media Isolation
- **Supabase Service:** Increased brand loading limit to 5000 to cover the entire database (3100+ items).
- **Operator Interface:**
  - Implemented automatic brand list refresh when the browser tab gains focus.
  - Fixed "stale data" issue where newly added brands from Admin weren't available without a page reload.
- **UI Consistency:** Removed `uppercase` styling from brand names across all interfaces (Admin, Operator, Buyer) to preserve original database casing.
- **Media Fix:** Finalized separation of `opPhotoUrl` and `photoUrl` in the Buyer interface to prevent visual data overwriting.

## 1.6.4 - Media Data Isolation
- **Data Model:** Introduced `opPhotoUrl` field in `OrderItem` to separate the operator's source photo from the supplier's offer photo.
- **Supabase Service:** Updated `getOrders` and `getOrderDetails` to map source photos to `opPhotoUrl`.
- **UI Components:**
  - **Buyer Interface:** Fixed a bug in `BuyerItemCard` where uploading a new photo would overwrite the display of the operator's original photo.
  - **Admin Interface:** Updated `AdminItemsTable` to correctly show the operator's file in the item header and the supplier's file in the offer row.

## 1.6.3 - Commit Convention Update
- **Internal Rules:** Updated `rules.md` and `System prompt.md` to enforce a new mandatory git commit structure: Header, Description, "БЫЛА ПРОБЛЕМА", and "КАК РЕШИЛИ".

## 1.5.2 - Brand Management Stability & RLS
- **Database:** Added missing RLS policies for `brands` table (`INSERT`, `UPDATE`, `DELETE`) to allow administrative actions from the client.
- **Admin Interface:**
  - Implemented error handling and `Toast` notifications in the Brands section.
  - Users now receive immediate feedback on success or failure of brand operations.
  - Improved robustness of brand addition and deletion logic.

## 1.6.2 - UI Polish & Real-time Details
- **Admin Interface:**
  - Fixed a layout bug in `AdminItemsTable` where the CNY price hint overlapped with the client comment input.
  - Forced immediate data refresh on order expansion by setting `staleTime` to 0. This ensures newly received offers appear instantly without manual page reloads.

## 1.6.1 - Critical Fixes: Prices & Navigation
- **Supabase Service:** Fixed `createOffer` to correctly map `BuyerPrice` from the frontend, resolving the issue where prices were saved as "0" in the database.
- **Admin Interface:** Synchronized status naming between frontend and database. Changed "КП отправлено" to "КП готово" to match the server-side status update, ensuring orders remain visible in the correct tab after approval.

## 1.6.0 - Manager UI & Data Accuracy
- **Supabase Service:** Fixed a data mapping issue in `getOrders` where offer prices and currencies were missing, resulting in "0" values in the UI.
- **Admin Interface:** Renamed "Цена Закупа" to "Цена закупщика" in the order details table for better clarity.

## 1.5.9 - Manager Offer Visibility Fix
- **Admin Interface:**
  - Improved offer matching logic: now uses `order_item_id` as primary key and robust string matching as fallback.
  - Expanded offer visibility: managers can now see and re-select offers even when the order status is "КП готово" or "КП отправлено".
  - Fixed a bug where offers were hidden if the supplier didn't explicitly specify an `offeredQuantity`.

## 1.5.8 - Service Layer Fix (Buyer Interface)
- **Supabase Service:** Restored the `getSupplierUsedBrands` method which was accidentally removed in 1.4.9. This fixes the "is not a function" error when buyers attempt to submit offers.

## 1.5.7 - Tabular Item View for Operator
- **Operator Interface:**
  - Redesigned the expanded order view: replaced the simple item list with a structured table.
  - Added columns: `#`, `Name`, `Brand`, `Article`, `UOM`, `Qty`, and `Photo`.
  - Improved data clarity and alignment for easier order processing.
  - Implemented file attachment preview icon in the table.

## 1.5.6 - Brand Sorting & Precise Counting
- **Supabase Service:** Extended `getBrandsFull` to handle dynamic sorting (field and direction).
- **Admin Interface:**
  - Made "ID" and "Brand Name" columns sortable. Default sort is **ID DESC**.
  - Implemented dual-counter system: **Absolute Total** (all brands in DB) and **Filtered Count** (search results).
  - Fixed a bug where the total count didn't update immediately after adding a brand.
  - Improved UI feedback for brand data operations.

## 1.5.4 - Brand Management UI Fix
- **Admin Interface:** Fixed an infinite loading issue in the Brands section caused by corrupted source code and non-terminating async operations. Restored full component logic and optimized hook dependencies.

## 1.5.3 - Brand Management Feedback & Reliability
- **Admin Interface:**
  - Added loading states (`isAdding`) to the brand creation button to prevent double-clicks.
  - Implemented explicit error handling for database unique constraint violations (Brand already exists).
  - Added console logging for easier debugging of failed database operations.
  - Improved `Toast` notifications for better user feedback.

## 1.5.5 - Case Sensitivity & Hints
- **Admin Interface:**
  - Removed global `uppercase` styling for brand names to allow precise case tracking (e.g., Makita vs makita).
  - Redesigned Action Bar: the main input is now for search only; new brands are added via a toggleable form.
  - Implemented "Did you mean..." hint system during brand creation to prevent unintended duplicates.
  - Improved UX for brand management with clearer visual separation of actions.

## 1.5.1 - Brand Management Improvements
- **Supabase Service:** Changed brand sorting to **ID descending** (newest first).
- **UI Components:**
  - Added "100" as an option in the `Pagination` component's dropdown.
  - Updated `AdminBrands` to correctly handle items-per-page changes.

## 1.5.0 - Brand Management Optimization (Pagination)
- **Supabase Service:** Updated `getBrandsFull` to support server-side pagination and count retrieval.
- **Admin Interface:**
  - Implemented pagination (100 items per page) for the Brands section.
  - Redesigned the brands table to be more compact (reduced row height and padding).
  - Added debounced search for efficient brand filtering.
  - Fixed total count display to show actual database size (e.g., 3100+).

## 1.4.9 - Brand Management System
- **Database:** Added `created_by` column to `brands` table (defaults to 'Admin').
- **Admin Interface:**
  - Created a new "Brands" section in the sidebar.
  - Implemented full CRUD for brands (Create, Read, Update, Delete).
  - Added search/filter functionality for brands.
  - Implemented creator tracking (identifies if a brand was added by an Operator or Admin).
- **Operator Interface:** Updated `addBrand` logic to automatically record the current operator's name as the creator.

## 1.4.8 - Dynamic Brands & Cleanup
- **Codebase Refactor:** 
  - Deleted `constants/cars.ts` (Removed hardcoded car lists).
  - Updated `NewOrderForm` to fetch brands dynamically from the database (`SupabaseService.getBrandsList`).
- **Test Data Generation:** 
  - `seedOrders` now uses real brands from the DB instead of a static array.
  - Removed "Car Model" generation logic (set to empty string) to align with the new data model.

## 1.4.7 - Enhanced Test Data Generation
- **Supabase Service:** 
  - Upgraded `seedOrders` to generate realistic random data for testing.
  - **Features:** Random email subjects (6 chars), phone numbers (+7 999...), client names, delivery addresses, and deadlines (Feb 2026).
  - **Items:** Orders now contain 1-3 random items with varied names, brands, and articles.

## 1.4.6 - Admin Tools & Stability
- **Admin Interface:**
  - Fixed "Clear DB" and "Seed Orders" buttons which were crashing due to undefined loading state.
  - "Seed Orders" now correctly assigns generated orders to **Operator 1 (op1)**, ensuring visibility in the demo account.
- **Supabase Service:**
  - `deleteAllOrders`: Added manual cascade delete fallback if `reset_db` RPC fails.
  - `seedOrders`: Added `ownerToken` parameter.

## 1.4.5 - Critical Bug Fixes (Data Mapping)
- **Supabase Service:** 
  - Fixed a critical bug in `getOrders` where `items` and `offers` were referenced incorrectly.
  - Added `offeredQuantity` mapping to `getOrders` to ensure offers are visible in the Manager Interface even during initial load/fallback.
  - Verified RLS policies are active and functioning correctly.

## 1.4.4 - Sorting & Formatting
- **Admin Interface:**
  - **Sorting:** "New" orders now sort by **Offer Count** (descending) by default, highlighting orders with more activity. All other tabs sort by **Last Status Change** (descending).
  - **Formatting:** Time column now displays full seconds (`HH:mm:ss`).

## 1.4.3 - Sort by Status Time
- **Database:** Added `status_updated_at` column to `orders` table.
- **Admin Interface:** 
  - Added "Time" column to the listing.
  - Implemented smart sorting: 
    - "New" tab -> Sort by Creation Date (desc).
    - Other tabs -> Sort by Status Change Time (desc).
  - This ensures that recently approved/processed orders always appear at the top of their respective lists.

## 1.4.2 - UX Fix
- **Admin Interface:** Explicitly force `expandedId` to persist after order approval to ensure the order stays open in the new tab.

## 1.4.1 - UX Polish
- **Admin Interface:** Fixed "vanishing order" issue during approval. Switched from full optimistic tab switching to "confirm-then-switch" to avoid race conditions with server-side status updates. Order now stays expanded and correctly moves to the next tab.

## 1.4.0 - Server-Side Calculations
- **Database:** Added Computed Columns `total_cost` and `goods_cost` to `offer_items` table. Logic is now centralized in PostgreSQL (`add_server_calculations.sql`).
- **Client Interface:** Frontend now consumes pre-calculated totals from the server, improving security and consistency. Includes fallback to client-side math for optimistic UI.

## 1.3.1 - Delivery Logic Fix
- **Client Interface:** Fixed delivery cost calculation logic. Delivery rate is now treated as a *fixed cost per position* (line item), not multiplied by item quantity.

## 1.3.0 - Performance Optimization
- **Admin Interface:** Implemented "Instant Approval" for Orders.
  - Replaced multiple sequential requests with a single RPC call (`approve_order_winners`).
  - Added Optimistic UI: Tab switches immediately, background process handles the data.
- **Database:** Added `approve_order_winners` stored function.
- **Schema:** Enforced existence of `delivery_rate` column in `offer_items`.

## 1.2.3 - Hotfix for Delivery Rate
- **Supabase Service:** Added fallback mechanism for `delivery_rate`. If the column is missing (migration not applied), it falls back to saving cost in `delivery_days` to prevent data loss and UI breakage.

## 1.2.2 - Bug Fixes
- **Admin Interface:**
  - Fixed a bug where Admin Delivery Rate (Cost) was not saving correctly (was overwriting Delivery Days).
  - Ensured "Total Delivery" is correctly calculated and persisted.

## 1.2.1 - Backend Logic Upgrade
- **ID Generation (Server-Side):**
  - Orders now get sequential integer IDs (1, 2, 3...) generated by `getNextId`.
  - Offers get composite IDs `[OrderId]-[Count]` (e.g., 5-1, 5-2).
- **Google Sheets UX:**
  - Implemented `setupValidations` to auto-generate Dropdown lists for Status columns (Admin, Client, Supplier).
  - Statuses are now strictly typed via `STATUS_OPTS_*` constants.

## 1.2.0 - UI/UX Synchronization with Google Script Logic
- **Data Layer (`sheetService.ts`):**
  - Fixed `statusSupplier` mapping (was `statusSeller`).
  - Implemented `deriveWorkflowStatus` to synthesize a unified status from Admin/Client/Supplier columns.
  - Aligned status strings with Google Script logic (e.g., "КП отправлено", "Подтверждение от поставщика").
- **Types (`types.ts`):**
  - Added 'КП отправлено' to `WorkflowStatus` type.
- **UI Improvements (`AdminInterface`, `ClientInterface`):**
  - Implemented dynamic color coding for rows based on status (Green/Red/Yellow/Blue/Gray).
  - Aligned visuals with the backend "Status Matrix".

## 1.1.0 - Initial Production Release
- Complete flow: Client Order -> Supplier Offer -> Admin Approval -> Client Purchase.
- Telegram broadcasting integration.
- Optimistic UI updates.
- Role-based interfaces (Client, Admin, Supplier).

## 1.0.0 - Prototype
- Basic CRUD operations.
- Google Sheets integration.
