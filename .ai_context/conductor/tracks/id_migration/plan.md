# Plan: Migration to Server-Side Sequential IDs

## Goal
Switch from client-side random ID generation (e.g., `ORD-12345`) to server-side sequential ID generation (e.g., `1`, `2`, `3`...).
Also fix a bug where rapid clicking on the submit button creates duplicate orders.

## Context
- **Current:** Frontend generates `ORD-[random]`.
- **Target:** Backend (GAS) calculates `Max(ID) + 1`.
- **Bug:** "Submit" button isn't disabled during the async request, allowing double submission.

## Tasks

### 1. Backend (GAS) - `перенос/TG_BLOCK_V2.js`
- [ ] Implement `getNextId(sheet, type)` function.
    - Logic: Scan column A for numbers, find Max, return Max + 1.
    - Handle empty sheet case (start with 1).
- [ ] Modify `doPost` to ignore incoming ID.
    - For `action === 'create'`:
        - Lock the script (`LockService`).
        - Generate new ID.
        - Use this ID for the row insertion.
    - Return the new ID in the JSON response `{ status: 'ok', orderId: '...' }`.

### 2. Frontend - `services/sheetService.ts`
- [ ] Update `createOrder`:
    - Do not generate `ORD-...`.
    - Send `null` or placeholder for ID.
    - Wait for response.
    - Parse `response.orderId`.
    - Return this real ID.
- [ ] Update `createOffer` (if applicable, though offers might stay random or also move to sequential). *Decision: Let's make offers sequential too for consistency, or keep random `OFF-` if they are sub-items.* -> Let's stick to Orders first as requested.

### 3. Frontend - `components/ClientInterface.tsx`
- [ ] Add `isSubmitting` state.
- [ ] Disable "Отправить запрос" button when `isSubmitting` is true.
- [ ] Ensure `handleSubmit` handles the async flow correctly.

## Verification
- [ ] Create 3 orders rapidly.
- [ ] Check IDs are 1, 2, 3 (or whatever next sequence is).
- [ ] Check no duplicates appear.
