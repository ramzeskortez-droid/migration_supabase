import { supabase } from '../src/lib/supabaseClient';
import { Order, OrderStatus, RowType, OrderItem, WorkflowStatus, Currency, RankType } from '../types';

export class SupabaseService {
  
  /**
   * Получение облегченного списка заказов для бесконечного скролла
   */
  static async getOrders(
    cursor?: number, 
    limit: number = 50, 
    sortBy: string = 'id', 
    sortDirection: 'asc' | 'desc' = 'desc',
    searchQuery: string = '',
    statusFilter?: string,
    clientPhoneFilter?: string,
    brandFilter?: string | null,
    onlyWithMyOffersName?: string
  ): Promise<{ data: Order[], nextCursor?: number }> {
    
    let query = supabase
      .from('orders')
      .select(`
        id, created_at, vin, client_name, client_phone, 
        car_brand, car_model, car_year,
        status_admin, status_client, status_supplier,
        visible_to_client, location, status_updated_at
      `);

    if (clientPhoneFilter) query = query.eq('client_phone', clientPhoneFilter);
    if (brandFilter) query = query.eq('car_brand', brandFilter);
    if (statusFilter) {
        if (statusFilter.includes(',')) {
            const statuses = statusFilter.split(',').map(s => s.trim());
            query = query.in('status_admin', statuses);
        } else if (statusFilter === 'КП отправлено') {
            query = query.eq('status_admin', 'КП готово');
        } else {
            query = query.eq('status_admin', statusFilter);
        }
    }

    if (onlyWithMyOffersName) {
        const { data: myOfferOrderIds } = await supabase
            .from('offers')
            .select('order_id')
            .eq('supplier_name', onlyWithMyOffersName);
        const ids = myOfferOrderIds?.map(o => o.order_id) || [];
        query = query.in('id', ids);
    }

    if (searchQuery) {
        const q = searchQuery.trim();
        if (!isNaN(Number(q))) {
             query = query.or(`id.eq.${q},client_phone.ilike.%${q}%`);
        } else {
             query = query.or(`vin.ilike.%${q}%,client_name.ilike.%${q}%,car_brand.ilike.%${q}%,car_model.ilike.%${q}%`);
        }
    }

    if (cursor) {
        if (sortDirection === 'desc') query = query.lt('id', cursor);
        else query = query.gt('id', cursor);
    }

    query = query.order('id', { ascending: sortDirection === 'asc' }).limit(limit);

    const { data, error } = await query;
    if (error) throw error;

    const mappedData = data.map(order => ({
        id: String(order.id),
        type: RowType.ORDER,
        vin: order.vin,
        clientName: order.client_name,
        clientPhone: order.client_phone,
        status: order.status_admin === 'ЗАКРЫТ' ? OrderStatus.CLOSED : OrderStatus.OPEN,
        statusAdmin: order.status_admin,
        statusClient: order.status_client,
        statusSeller: order.status_supplier,
        workflowStatus: order.status_client as WorkflowStatus,
        createdAt: new Date(order.created_at).toLocaleString('ru-RU'),
        statusUpdatedAt: order.status_updated_at ? new Date(order.status_updated_at).toLocaleString('ru-RU') : undefined,
        location: order.location,
        visibleToClient: order.visible_to_client ? 'Y' : 'N',
        items: [], 
        offers: [], 
        car: {
            brand: order.car_brand,
            model: order.car_model,
            year: order.car_year
        },
        isProcessed: order.status_admin !== 'В обработке' && order.status_admin !== 'ОТКРЫТ'
    } as Order));
    
    const nextCursor = data.length === limit ? data[data.length - 1].id : undefined;
    
    return { data: mappedData, nextCursor };
  }

  /**
   * Загрузка детальной информации (items, offers) при раскрытии заказа
   */
  static async getOrderDetails(orderId: string): Promise<{ items: OrderItem[], offers: Order[] }> {
      const { data, error } = await supabase
          .from('orders')
          .select(`
            id,
            order_items (*),
            offers (
              *,
              offer_items (*)
            )
          `)
          .eq('id', orderId)
          .single();

      if (error) throw error;

      const items: OrderItem[] = data.order_items.map((item: any) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        comment: item.comment,
        category: item.category
      }));

      const offers: Order[] = data.offers.map((offer: any) => ({
        id: String(offer.id),
        parentId: String(data.id),
        type: RowType.OFFER,
        clientName: offer.supplier_name,
        clientPhone: offer.supplier_phone,
        createdAt: new Date(offer.created_at).toLocaleString('ru-RU'),
        items: offer.offer_items.map((oi: any) => ({
          id: oi.id,
          name: oi.name,
          quantity: oi.quantity,
          offeredQuantity: oi.quantity,
          sellerPrice: oi.price,
          sellerCurrency: oi.currency as Currency,
          adminPrice: oi.admin_price,
          adminCurrency: oi.admin_currency as Currency,
          rank: oi.is_winner ? 'ЛИДЕР' : 'РЕЗЕРВ',
          deliveryWeeks: oi.delivery_days ? Math.ceil(oi.delivery_days / 7) : 0,
          weight: oi.weight,
          photoUrl: oi.photo_url,
          adminComment: oi.admin_comment,
          comment: oi.comment,
          totalCost: oi.total_cost,
          goodsCost: oi.goods_cost
        }))
      } as any));

      return { items, offers };
  }

  static async getMarketStats(): Promise<{ today: number, week: number, month: number, total: number, leader: string }> {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1)).toISOString();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
          { count: total },
          { count: today },
          { count: week },
          { count: month },
          { data: recentOrders }
      ] = await Promise.all([
          supabase.from('orders').select('*', { count: 'exact', head: true }),
          supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', startOfToday),
          supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', startOfWeek),
          supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
          supabase.from('orders').select('car_brand').order('created_at', { ascending: false }).limit(100)
      ]);

      const brandCounts: Record<string, number> = {};
      recentOrders?.forEach(o => {
          if (o.car_brand) brandCounts[o.car_brand] = (brandCounts[o.car_brand] || 0) + 1;
      });

      let leader = "N/A";
      let max = 0;
      Object.entries(brandCounts).forEach(([brand, count]) => {
          if (count > max) { max = count; leader = brand; }
      });

      return { today: today || 0, week: week || 0, month: month || 0, total: total || 0, leader };
  }

  static async getStatusCounts(): Promise<Record<string, number>> {
      const statuses = [
          { key: 'new', val: 'В обработке' },
          { key: 'kp_sent', val: 'КП готово' }, 
          { key: 'ready_to_buy', val: 'Готов купить' },
          { key: 'supplier_confirmed', val: 'Подтверждение от поставщика' },
          { key: 'awaiting_payment', val: 'Ожидает оплаты' },
          { key: 'in_transit', val: 'В пути' },
          { key: 'completed', val: 'Выполнен' },
          { key: 'annulled', val: 'Аннулирован' },
          { key: 'refused', val: 'Отказ' }
      ];

      const promises = statuses.map(s => 
          supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status_admin', s.val)
      );

      const results = await Promise.all(promises);
      const counts: Record<string, number> = {};
      results.forEach((res, idx) => {
          counts[statuses[idx].key] = res.count || 0;
      });
      return counts;
  }

  static async getSellerBrands(sellerName: string): Promise<string[]> {
      const { data, error } = await supabase.rpc('get_seller_brands', { p_seller_name: sellerName });
      if (error) throw error;
      return data?.map((d: any) => d.brand) || [];
  }

  static async getBrandsList(): Promise<string[]> {
      const { data, error } = await supabase.from('brands').select('name').order('name');
      if (error) throw error;
      return data?.map((b: any) => b.name) || [];
  }

  static async addBrand(name: string): Promise<void> {
      const { error } = await supabase.from('brands').insert({ name });
      if (error) throw error;
  }

  static async createOrder(vin: string, items: any[], clientName: string, car: any, clientPhone?: string): Promise<string> {
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        vin, client_name: clientName, client_phone: clientPhone,
        car_brand: car.brand, car_model: car.AdminModel || car.model,
        car_year: car.AdminYear || car.year, location: 'РФ'
      })
      .select().single();

    if (orderError) throw orderError;

    const itemsToInsert = items.map(item => ({
      order_id: orderData.id, name: item.name, quantity: item.quantity || 1,
      comment: item.comment, category: item.category
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
    if (itemsError) throw itemsError;
    return String(orderData.id);
  }

  static async createOffer(orderId: string, sellerName: string, items: any[], vin: string, sellerPhone?: string): Promise<void> {
    const { data: offerData, error: offerError } = await supabase
      .from('offers')
      .insert({ order_id: orderId, supplier_name: sellerName, supplier_phone: sellerPhone })
      .select().single();

    if (offerError) throw offerError;

    const offerItemsToInsert = items.map(item => ({
      offer_id: offerData.id, name: item.name, 
      quantity: item.offeredQuantity || item.quantity || 1,
      price: item.sellerPrice || 0, currency: item.sellerCurrency || 'RUB',
      delivery_days: item.deliveryWeeks ? item.deliveryWeeks * 7 : (item.deliveryDays || 0),
      weight: item.weight || 0, photo_url: item.photoUrl || '', comment: item.comment || ''
    }));

    const { error: oiError } = await supabase.from('offer_items').insert(offerItemsToInsert);
    if (oiError) throw oiError;
  }

  static async updateRank(vin: string, itemName: string, offerId: string, adminPrice?: number, adminCurrency?: Currency, actionType?: 'RESET', adminComment?: string, deliveryRate?: number): Promise<void> {
    const { data: offer } = await supabase.from('offers').select('order_id').eq('id', offerId).single();
    if (!offer) return;

    const orderId = offer.order_id;
    const { data: siblingOffers } = await supabase.from('offers').select('id').eq('order_id', orderId);
    const offerIds = siblingOffers?.map(o => o.id) || [];

    await supabase.from('offer_items').update({ is_winner: false }).in('offer_id', offerIds).eq('name', itemName);

    if (actionType !== 'RESET') {
      await supabase.from('offer_items')
        .update({ is_winner: true, admin_price: adminPrice, admin_currency: adminCurrency, delivery_rate: deliveryRate, admin_comment: adminComment })
        .eq('offer_id', offerId).eq('name', itemName);
    }
  }

  static async archiveAllChatsForOrder(orderId: string): Promise<void> {
      await supabase.from('chat_messages').update({ is_archived: true }).eq('order_id', orderId);
  }

  static async formCP(orderId: string): Promise<void> {
    await supabase.from('orders').update({ status_client: 'КП отправлено', status_admin: 'КП готово' }).eq('id', orderId);
    await this.archiveAllChatsForOrder(orderId);
  }

  static async approveOrderFast(orderId: string, winners: any[]): Promise<void> {
    const { error } = await supabase.rpc('approve_order_winners', { p_order_id: Number(orderId), p_winners: winners });
    if (error) throw error;
    await this.archiveAllChatsForOrder(orderId);
  }

  static async confirmPurchase(orderId: string): Promise<void> {
    await supabase.from('orders').update({ status_client: 'Подтверждение от поставщика', status_admin: 'Готов купить' }).eq('id', orderId);
  }

  static async refuseOrder(orderId: string, reason?: string, source: 'ADMIN' | 'CLIENT' = 'ADMIN'): Promise<void> {
    const status = source === 'ADMIN' ? 'Аннулирован' : 'Отказ';
    await supabase.from('orders').update({
      status_client: status, status_admin: status, status_supplier: 'Торги завершены',
      status_updated_at: new Date().toISOString()
    }).eq('id', orderId);
    await this.archiveAllChatsForOrder(orderId);
  }

  static async updateOrderJson(orderId: string, newItems: any[]): Promise<void> {
    for (const item of newItems) {
      await supabase.from('order_items').update({ name: item.name, quantity: item.quantity }).eq('order_id', orderId).eq('id', item.id);
    }
  }

  static async updateWorkflowStatus(orderId: string, status: string): Promise<void> {
    await supabase.from('orders').update({ status_client: status, status_admin: status, status_updated_at: new Date().toISOString() }).eq('id', orderId);
  }

  static async deleteAllOrders(): Promise<void> {
    const { error } = await supabase.rpc('reset_db');
    if (error) await supabase.from('orders').delete().neq('id', 0);
  }

  static async seedOrders(count: number, onProgress: (created: number) => void): Promise<void> {
    const BATCH_SIZE = 1000;
    const iterations = Math.ceil(count / BATCH_SIZE);
    const brands = ['Toyota', 'BMW', 'Mercedes', 'Audi', 'Kia', 'Hyundai', 'Lada'];
    const models = ['Camry', 'X5', 'E-Class', 'A6', 'Rio', 'Solaris', 'Vesta'];

    for (let i = 0; i < iterations; i++) {
      const ordersBatch = [];
      for (let j = 0; j < BATCH_SIZE; j++) {
        if (i * BATCH_SIZE + j >= count) break;
        ordersBatch.push({
          client_name: 'КЛИЕНТ № 1', client_phone: '+7 (999) 111-22-33',
          car_brand: brands[Math.floor(Math.random() * brands.length)],
          car_model: models[Math.floor(Math.random() * models.length)],
          car_year: '2020', vin: `VIN${Date.now()}${j}`, location: 'Москва',
          status_admin: 'В обработке', status_client: 'В обработке'
        });
      }
      const { data: createdOrders, error: orderError } = await supabase.from('orders').insert(ordersBatch).select('id');
      if (orderError) throw orderError;
      if (!createdOrders) continue;
      const itemsBatch = createdOrders.map(o => ({ order_id: o.id, name: 'Масляный фильтр', quantity: 1 }));
      await supabase.from('order_items').insert(itemsBatch);
      onProgress(Math.min((i + 1) * BATCH_SIZE, count));
    }
  }

  static async getChatMessages(orderId: string, offerId?: string, supplierName?: string): Promise<any[]> {
      let query = supabase.from('chat_messages').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
      if (supplierName) {
          const escapedName = supplierName.split('"').join('\\"');
          query = query.or(`sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
  }

  static async sendChatMessage(payload: {
      order_id: string, offer_id?: string | null, sender_role: 'ADMIN' | 'SUPPLIER',
      sender_name: string, recipient_name?: string, message: string, item_name?: string
  }): Promise<any> {
      const { data, error } = await supabase.from('chat_messages').insert(payload).select().single();
      if (error) throw error;
      const supplierName = payload.sender_role === 'SUPPLIER' ? payload.sender_name : payload.recipient_name;
      if (supplierName) {
          const escapedName = supplierName.split('"').join('\\"');
          await supabase.from('chat_messages').update({ is_archived: false }).eq('order_id', payload.order_id).or(`sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`).eq('is_archived', true);
      }
      return data;
  }

  static async getUnreadChatCount(): Promise<number> {
      const { count, error } = await supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('sender_role', 'SUPPLIER').eq('is_read', false);
      if (error) throw error;
      return count || 0;
  }

  static async getUnreadChatCountForSupplier(supplierName: string): Promise<{ count: number }> {
      const { count, error } = await supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('recipient_name', supplierName).eq('is_read', false);
      if (error) throw error;
      return { count: count || 0 };
  }

  static async markChatAsRead(orderId: string, supplierName: string, readerRole: 'ADMIN' | 'SUPPLIER'): Promise<void> {
      let query = supabase.from('chat_messages').update({ is_read: true }).eq('order_id', orderId);
      const escapedName = supplierName.split('"').join('\"'); 
      
      if (readerRole === 'ADMIN') {
          query = query.eq('sender_name', escapedName).eq('sender_role', 'SUPPLIER');
      } else {
          query = query.eq('sender_role', 'ADMIN').eq('recipient_name', escapedName);
      }

      const { error } = await query;
      if (error) console.error('markChatAsRead ERROR:', error);
  }

  static async deleteChatHistory(orderId: string, supplierName?: string): Promise<void> {
      let query = supabase.from('chat_messages').delete().eq('order_id', orderId);
      if (supplierName) {
          const escapedName = supplierName.split('"').join('\\"');
          query = query.or(`sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`);
      }
      const { error } = await query;
      if (error) throw error;
  }

  static async getOrderItemsSimple(orderId: string): Promise<string[]> {
      const { data } = await supabase.from('order_items').select('name').eq('order_id', orderId);
      return data?.map((i: any) => i.name) || [];
  }

  static async getGlobalChatThreads(filterBySupplierName?: string, isArchived: boolean = false): Promise<Record<string, Record<string, { lastMessage: string, time: string, unread: number }>>> {
      if (!isArchived) supabase.rpc('archive_old_chats').then(() => {});
      let query = supabase.from('chat_messages').select('*').eq('is_archived', isArchived).order('created_at', { ascending: false }).limit(500);
      if (filterBySupplierName) {
          const escapedName = filterBySupplierName.split('"').join('\\"');
          query = query.or(`sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`);
      }
      const { data, error } = await query;
      if (error) throw error;
      const threads: Record<string, Record<string, any>> = {};
      data?.forEach((msg: any) => {
          const oid = String(msg.order_id);
          let supplierName = msg.sender_role === 'SUPPLIER' ? msg.sender_name : (msg.recipient_name || 'Unknown');
          if (supplierName === 'Unknown') return;
          if (!threads[oid]) threads[oid] = {};
          if (!threads[oid][supplierName]) {
              threads[oid][supplierName] = { lastMessage: msg.message, time: msg.created_at, unread: 0 };
          }
          const isMsgFromOther = filterBySupplierName ? (msg.sender_role === 'ADMIN') : (msg.sender_role === 'SUPPLIER');
          if (!msg.is_read && isMsgFromOther) threads[oid][supplierName].unread++;
      });
      return threads;
  }

  static async archiveChat(orderId: string, supplierName: string): Promise<void> {
      const escapedName = supplierName.split('"').join('\\"');
      const { error } = await supabase.from('chat_messages').update({ is_archived: true }).eq('order_id', orderId).or(`sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`);
      if (error) throw error;
  }
}