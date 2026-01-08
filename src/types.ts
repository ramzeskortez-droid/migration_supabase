export enum OrderStatus {
  OPEN = 'ОТКРЫТ',
  CLOSED = 'ЗАКРЫТ',
}

export enum RowType {
  ORDER = 'ORDER',
  OFFER = 'OFFER'
}

export type RankType = 'LEADER' | 'RESERVE' | 'ЛИДЕР' | 'РЕЗЕРВ' | '';
export type PartCategory = 'Оригинал' | 'Б/У' | 'Аналог';
export type Currency = 'RUB' | 'USD' | 'CNY';
export type UserRole = 'admin' | 'operator' | 'buyer';

export interface AppUser {
  id: string;
  name: string;
  token: string;
  role: UserRole;
  phone?: string;
}

export interface ExchangeRates {
  date: string;
  cny_rub: number;
  usd_rub: number;
  cny_usd: number;
  delivery_kg_usd: number;
  markup_percent: number;
}

export interface BuyerLabel {
  id: string;
  orderId: string;
  color: string;
  text?: string;
}

export type WorkflowStatus = 
  | 'В обработке' 
  | 'КП готово' 
  | 'КП отправлено'
  | 'Готов купить' 
  | 'Подтверждение от поставщика' 
  | 'Ожидает оплаты' 
  | 'В пути' 
  | 'Выполнен' 
  | 'Аннулирован' 
  | 'Отказ';

export interface OrderItem {
  id: string;
  order_item_id?: string; // ID родительской позиции для офферов
  name: string;
  quantity: number; 
  comment?: string;
  category?: PartCategory;
  
  // Admin Overrides
  AdminName?: string;
  AdminQuantity?: number;
  
  // Seller side
  sellerPrice?: number;
  sellerCurrency?: Currency;
  
  // Admin side (Client view)
  // adminPrice - теперь ЕДИНАЯ цена в рублях для клиента
  adminPrice?: number; 
  adminCurrency?: Currency; // Всегда RUB (можно оставить для совместимости UI или убрать)
  isManualPrice?: boolean;
  
  offeredQuantity?: number;
  rank?: RankType;
  is_winner?: boolean; // Флаг победителя
  adminComment?: string;
  weight?: number;
  deliveryWeeks?: number;
  deliveryRate?: number;
  photoUrl?: string;
  opPhotoUrl?: string;
  clientPhone?: string;
  sellerPhone?: string;
  
  // Product Data
  brand?: string;
  article?: string;
  uom?: string;

  // Computed
  totalCost?: number;
  goodsCost?: number;
  bestCompetitorPrice?: number;
}

export interface Order {
  id: string;
  parentId?: string;
  type: RowType;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string; 
  statusUpdatedAt?: string;
  location: string;
  clientName: string;
  clientPhone?: string;
  visibleToClient?: 'Y' | 'N';
  offers?: Order[];
  ownerId?: string; // Вместо ownerToken
  ownerToken?: string; // Legacy support (optional)
  deadline?: string;
  buyerLabels?: BuyerLabel[];
  
  statusAdmin?: string;
  statusClient?: string;
  statusSeller?: string;

  isProcessed?: boolean | 'Y' | 'N';
  isSentOptimistic?: boolean;
  readyToBuy?: boolean;
  isRefused?: boolean;
  refusalReason?: string;
  workflowStatus?: WorkflowStatus;
}

export interface ActionLog {
  id: string;
  time: string;
  text: string;
  type: 'info' | 'success' | 'error';
}

export interface AdminModalState {
  type: 'ANNUL' | 'VALIDATION';
  orderId?: string;
  missingItems?: string[];
}

export interface Brand {
  id: number;
  name: string;
  created_by?: string;
}

export type AdminTab = 'new' | 'kp_sent' | 'ready_to_buy' | 'supplier_confirmed' | 'awaiting_payment' | 'in_transit' | 'completed' | 'annulled' | 'refused';
