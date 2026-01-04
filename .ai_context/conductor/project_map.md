# Project Code Map

## 1. Database Schema (Supabase / PostgreSQL)

### Tables
- **orders**: Main orders table.
  - `id`, `created_at`, `client_name`, `client_phone`, `status_admin`, `status_client`, `status_supplier`, `location`, `visible_to_client`, `is_archived`.
- **order_items**: Items within an order.
  - `id`, `order_id`, `name`, `quantity`, `comment`, `category`.
- **offers**: Supplier offers linked to orders.
  - `id`, `order_id`, `supplier_name`, `supplier_phone`, `status`.
- **offer_items**: Items within an offer (linked to order items).
  - `id`, `offer_id`, `order_item_id`, `name`, `quantity`, `price`, `currency`, `delivery_days`, `admin_price`, `admin_currency`, `is_winner`.
  - *Added fields*: `weight`, `photo_url`, `admin_comment`, `delivery_rate`.
- **chat_messages**: Chat history.
  - `id`, `order_id`, `offer_id`, `sender_role`, `sender_name`, `recipient_name`, `message`, `is_read`, `is_archived`.
- **brands**: (New) List of known brands for validation.
  - `id`, `name`.

### SQL Functions
- `get_seller_feed(p_seller_name, p_tab, ...)`: Complex query to fetch orders for seller dashboard with filtering, tabs (new/history), and search.
- `get_seller_brands(p_seller_name)`: Returns list of car brands available for a specific seller (excluding their own offers).
- `approve_order_winners(p_order_id, p_winners)`: Updates order status to 'KP ready' and marks selected offer items as winners.
- `archive_old_chats()`: Moves inactive chats (older than 3 days) to archive.
- `offers_count(orders_row)`: Computed column for sorting orders by offer count.
- `total_cost(item)`: Calculates total cost (price * qty + delivery).
- `goods_cost(item)`: Calculates goods cost (price * qty).

---

## 2. Service Layer (`services/supabaseService.ts`)

### Order Management
- `getOrders(...)`: Fetches paginated list of orders with filters (status, phone, brand, search). Used by Admin and Operator.
- `getOrderDetails(orderId)`: Fetches full order details including items and offers.
- `createOrder(vin, items, clientName, car, clientPhone)`: Creates a new order.
- `updateOrderJson(orderId, newItems)`: Updates items in an order.
- `updateWorkflowStatus(orderId, status)`: Updates general order status.
- `refuseOrder(orderId, reason)`: Marks order as Refused/Annulled.
- `deleteAllOrders()`: Truncates orders table (Dev only).
- `seedOrders(count)`: Generates dummy orders (Dev only).

### Offer Management
- `createOffer(...)`: Creates a new offer from a supplier.
- `updateRank(...)`: Updates winner status/admin price for specific items.
- `confirmPurchase(orderId)`: Updates status to 'Ready to buy'.
- `formCP(orderId)`: Updates status to 'KP sent'.

### Chat & Communication
- `getChatMessages(orderId, offerId, supplierName)`: Fetches chat history.
- `sendChatMessage(payload)`: Sends a new message. Returns the created message object.
- `getGlobalChatThreads(...)`: Fetches list of active chat threads for Admin/Seller sidebars.
- `markChatAsRead(...)`: Marks messages as read.
- `deleteChatHistory(...)`: Deletes chat messages.
- `archiveChat(...)`: Manually archives a chat.
- `getUnreadChatCount()`: Global unread count.

### Brands & Stats
- `getBrandsList()`: Fetches all brand names from `brands` table.
- `addBrand(name)`: Inserts a new brand.
- `getMarketStats()`: Returns dashboard stats (today/week/month counts).
- `getStatusCounts()`: Returns counts by status.

---

## 3. Frontend Components

### Operator Interface (`/operator`)
*Replaces legacy Client Interface*
- `OperatorInterface`: Main orchestrator. Handles state, auth, and layout.
- `OperatorHeader`: Header with user profile and logout.
- `OrderInfoForm`: Form for contact info (Phone, Name), Address, Deadline, Email Subject.
- `PartsList`: Editable table of parts with **Fuzzy Brand Validation** (yellow warning/red error) and auto-add brand feature.
- `AiAssistant`: Integrated AI (Groq) to parse bulk text into parts list. Auto-detects Subject and Contacts.
- `OperatorOrdersList`: Infinite scroll list of created orders with status tabs.

### Seller Interface (`/supplier`)
- `SellerInterface`: Main dashboard.
- `SellerOrdersList`: Virtualized list of available orders (New / History).
- `SellerOrderRow`: Expandable row with quick offer submission.
- `SellerGlobalChat`: Chat interface for suppliers.

### Admin Interface (`/admin`)
- `AdminInterface`: Main dashboard.
- `AdminOrdersList`: List of all orders.
- `AdminOrderDetails`: Detailed view to manage offers, select winners, and chat.
- `AdminGlobalChat`: Centralized chat to communicate with all suppliers.
