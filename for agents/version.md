# Version History

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
