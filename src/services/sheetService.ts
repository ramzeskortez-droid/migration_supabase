import { Order, OrderStatus, OrderItem, RowType, Currency } from '../types';

// Default URL provided by configuration
const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbxooqVnUce3SIllt2RUtG-KJ5EzNswyHqrTpdsTGhc6XOKW6qaUdlr6ld77LR2KQz0-/exec';

// Helper to handle API URL from localStorage or fallback to default
const getApiUrl = () => localStorage.getItem('GAS_API_URL') || DEFAULT_API_URL;

// Version 5.0 Grouped Statuses Structure
interface SheetRow {
  id: string;      // Col A (0)
  parentId: string;// Col B (1)
  type: string;    // Col C (2)
  statusAdmin: string; // Col D (3)
  statusClient: string; // Col E (4)
  statusSeller: string; // Col F (5)
  workflowStatus: string; // Col G (6)
  vin: string;     // Col H (7)
  clientName: string; // Col I (8)
  clientPhone: string; // Col J (9) - NEW
  summary: string; // Col K (10)
  json: string;    // Col L (11)
  rank: string;    // Col M (12)
  createdAt: string; // Col N (13)
  location: string; // Col O (14)
  refusal?: string; // Col P (15) (Y/N)
}

export class SheetService {
  private static cache: Order[] = [];
  private static lastFetch = 0;
  private static isMutationLocked = false;

  static isLocked() {
    return this.isMutationLocked;
  }

  static setMutationLock() {
    this.isMutationLocked = true;
    setTimeout(() => { this.isMutationLocked = false; }, 5000); // Auto unlock after 5s safety
  }

  // Reliable date parser for sorting and logic
  private static safeParseDate(str: string): number {
      if (!str) return 0;
      try {
          const clean = str.replace(/\n/g, ' ').replace(/\s+/g, ' ').split(/[\s,]/)[0];
          const parts = clean.split(/[\.\/]/);
          if (parts.length === 3) {
              const [d, m, y] = parts[0].length === 4 ? [parts[2], parts[1], parts[0]] : [parts[0], parts[1], parts[2]];
              return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
          }
      } catch (e) {}
      const native = new Date(str).getTime();
      return isNaN(native) ? 0 : native;
  }

  static async getOrders(force = false): Promise<Order[]> {
    if (!force && this.cache.length > 0 && (Date.now() - this.lastFetch < 10000)) {
      return this.cache;
    }

    const rawUrl = getApiUrl();
    if (!rawUrl) return [];
    const url = rawUrl.trim();

    try {
      const response = await fetch(`${url}?action=getData&_t=${Date.now()}`, {
        method: 'GET',
        redirect: 'follow'
      });
      
      if (!response.ok) throw new Error(`Network error: ${response.status}`);
      
      let rows: any[];
      try {
        rows = await response.json();
      } catch (e) {
        throw new Error("Invalid response format from server");
      }
      
      if (!Array.isArray(rows)) return [];

      const ordersMap = new Map<string, Order>();
      const offersList: { row: SheetRow, items: OrderItem[] }[] = [];

      // Helper to derive unified status
      const deriveWorkflowStatus = (sAdmin: string, sClient: string): string => {
          if (sAdmin === 'Аннулирован') return 'Аннулирован';
          if (sAdmin === 'Отказ' || sClient === 'Отказ') return 'Отказ';
          if (sAdmin === 'Выполнен' || sClient === 'Выполнен') return 'Выполнен';
          if (sAdmin === 'В пути') return 'В пути';
          if (sAdmin === 'Ожидает оплаты') return 'Ожидает оплаты';
          if (sAdmin === 'Готов купить') return 'Готов купить'; // Client confirmed
          if (sClient === 'Подтверждение от поставщика') return 'Подтверждение от поставщика';
          if (sAdmin === 'КП отправлено' || sClient === 'КП готово') return 'КП отправлено';
          return 'В обработке';
      };

      rows.forEach(row => {
        let parsedItems: OrderItem[] = [];
        let refusalReason = undefined;

        try {
          const parsed = row.json ? JSON.parse(row.json) : [];
          parsedItems = parsed;
          if (parsedItems.length > 0) {
             const meta = parsedItems[0] as any;
             if (meta.refusalReason) refusalReason = meta.refusalReason;
          }
        } catch (e) {}

        // Backend returns statusSupplier, map it correctly
        const rawStatusSupplier = (row as any).statusSupplier || row.statusSeller || '';

        if (row.type === 'ORDER') {
          const sAdmin = row.statusAdmin || '';
          const sClient = row.statusClient || '';
          const derivedWorkflow = deriveWorkflowStatus(sAdmin, sClient);

          const isCPReady = sAdmin === 'КП отправлено' || sClient === 'КП готово';
          const carDetails = parsedItems.length > 0 ? (parsedItems[0] as any).car : undefined;

          ordersMap.set(String(row.id), {
            id: String(row.id),
            type: RowType.ORDER,
            vin: row.vin,
            status: row.statusAdmin as any,
            statusAdmin: sAdmin,
            statusClient: sClient,
            statusSeller: rawStatusSupplier, // Correctly mapped
            clientName: row.clientName,
            clientPhone: row.clientPhone, // Read from dedicated column
            refusalReason: refusalReason,
            createdAt: row.createdAt,
            location: row.location,
            visibleToClient: isCPReady ? 'Y' : 'N',
            items: parsedItems,
            offers: [],
            car: carDetails,
            isProcessed: isCPReady, // Used for locking edits
            readyToBuy: sAdmin === 'Готов купить' || sClient === 'Подтверждение от поставщика',
            isRefused: sAdmin === 'Аннулирован' || sAdmin === 'Отказ' || sClient === 'Отказ',
            workflowStatus: derivedWorkflow as any
          });
        } else if (row.type === 'OFFER') {
          offersList.push({ row: {...row, statusSeller: rawStatusSupplier, id: String(row.id), parentId: String(row.parentId)}, items: parsedItems });
        }
      });

      offersList.forEach(({ row, items }) => {
        const parentOrder = ordersMap.get(row.parentId);
        if (parentOrder) {
          parentOrder.offers = parentOrder.offers || [];
          parentOrder.offers.push({
            id: row.id,
            parentId: row.parentId,
            type: RowType.OFFER,
            vin: row.vin,
            status: row.statusAdmin as any,
            clientName: row.clientName,
            createdAt: row.createdAt,
            location: row.location,
            visibleToClient: parentOrder.isProcessed ? 'Y' : 'N',
            items: items,
            isProcessed: true
          });
        }
      });

      const orders = Array.from(ordersMap.values());
      
      // СОРТИРОВКА
      orders.sort((a, b) => {
          if (a.isProcessed && !b.isProcessed) return -1;
          if (!a.isProcessed && b.isProcessed) return 1;
          return this.safeParseDate(b.createdAt) - this.safeParseDate(a.createdAt);
      });

      this.cache = orders;
      this.lastFetch = Date.now();
      return orders;

    } catch (error) {
      console.error("SHEET FETCH ERROR:", error); // ADDED LOGGING
      if (this.cache.length > 0) return this.cache;
      throw error;
    }
  }

  private static async postData(payload: any): Promise<any> {
    const rawUrl = getApiUrl();
    if (!rawUrl) throw new Error("API URL not set");
    const url = rawUrl.trim();

    const response = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        "Content-Type": "text/plain;charset=utf-8", 
      },
      body: JSON.stringify(payload)
    });

    try {
        return await response.json();
    } catch (e) {
        return { status: 'ok_no_content' };
    }
  }

  static async createOrder(vin: string, items: any[], clientName: string, car: any, clientPhone?: string): Promise<string> {
    const itemsWithPhone = items.map((item, idx) => {
        if (idx === 0) {
            return { ...item, clientPhone, car };
        }
        return { ...item, car };
    });

    const payload = {
      action: 'create',
      order: {
        id: "PENDING", 
        type: 'ORDER',
        status: 'ОТКРЫТ',
        vin,
        clientName,
        clientPhone,
        createdAt: new Date().toLocaleString('ru-RU'),
        location: 'РФ',
        items: itemsWithPhone,
        visibleToClient: 'N'
      }
    };

    const response = await this.postData(payload);
    this.lastFetch = 0;
    
    if (response && response.orderId) {
        return String(response.orderId);
    }
    throw new Error("Server did not return Order ID");
  }

  static async createOffer(orderId: string, sellerName: string, items: any[], vin: string, sellerPhone?: string): Promise<void> {
    const itemsWithPhone = items.map((item, idx) => {
        if (idx === 0) return { ...item, sellerPhone };
        return item;
    });

    const payload = {
      action: 'create',
      order: {
        id: "PENDING", 
        parentId: orderId,
        type: 'OFFER',
        status: 'ОТКРЫТ',
        vin,
        clientName: sellerName,
        sellerPhone,
        createdAt: new Date().toLocaleString('ru-RU'),
        location: 'РФ',
        items: itemsWithPhone,
        visibleToClient: 'N'
      }
    };

    await this.postData(payload);
    this.lastFetch = 0;
  }

  static async updateRank(vin: string, itemName: string, offerId: string, adminPrice?: number, adminCurrency?: Currency, actionType?: 'RESET', adminComment?: string, deliveryRate?: number): Promise<void> {
    await this.postData({
      action: 'update_rank',
      vin,
      detailName: itemName,
      leadOfferId: offerId,
      adminPrice,
      adminCurrency,
      actionType, 
      adminComment, 
      deliveryRate 
    });
    this.lastFetch = 0;
  }

  static async formCP(orderId: string): Promise<void> {
    await this.postData({
      action: 'form_cp',
      orderId
    });
    this.lastFetch = 0;
  }

  static async confirmPurchase(orderId: string): Promise<void> {
    await this.postData({
      action: 'confirm_purchase',
      orderId
    });
    this.lastFetch = 0;
  }

  static async refuseOrder(orderId: string, reason?: string, source: 'ADMIN' | 'CLIENT' = 'ADMIN'): Promise<void> {
    await this.postData({
      action: 'refuse_order',
      orderId,
      reason,
      source 
    });
    this.lastFetch = 0;
  }

  static async updateOrderJson(orderId: string, newItems: any[]): Promise<void> {
    await this.postData({
      action: 'update_json',
      orderId,
      items: newItems
    });
    this.lastFetch = 0;
  }

  static async updateWorkflowStatus(orderId: string, status: string): Promise<void> {
    await this.postData({
      action: 'update_workflow_status',
      orderId,
      status
    });
    this.lastFetch = 0;
  }
}