import { supabase } from '../src/lib/supabaseClient';
import { Order, OrderStatus, RowType, OrderItem, WorkflowStatus, Currency, RankType } from '../types';

export class SupabaseService {
  
  /**
   * Получение заказов с серверной пагинацией, сортировкой и поиском
   */
  static async getOrders(
    page: number = 1, 
    pageSize: number = 10, 
    sortBy: string = 'created_at', 
    sortDirection: 'asc' | 'desc' = 'desc',
    searchQuery: string = '',
    statusFilter?: string,
    clientPhoneFilter?: string // Фильтр для ЛК клиента
  ): Promise<{ data: Order[], count: number }> {
    
    // Начало и конец диапазона для пагинации
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (*),
        offers (
          *,
          offer_items (*)
        )
      `, { count: 'exact' }); 

    // Фильтр по клиенту (безопасность ЛК)
    if (clientPhoneFilter) {
        query = query.eq('client_phone', clientPhoneFilter);
    }

    // Фильтр по статусу (для табов админки)
    if (statusFilter) {
         if (statusFilter === 'КП отправлено') {
             // Для КП отправлено показываем то, что у админа имеет этот статус (КП готово)
             query = query.eq('status_admin', 'КП готово');
         } else {
             query = query.eq('status_admin', statusFilter);
         }
    }

    // Поиск (Search)
    if (searchQuery) {
        const q = searchQuery.trim();
        if (!isNaN(Number(q))) {
             // Если ввели число - ищем по ID или телефону (если похоже)
             query = query.or(`id.eq.${q},client_phone.ilike.%${q}%`);
        } else {
             query = query.or(`vin.ilike.%${q}%,client_name.ilike.%${q}%,car_model.ilike.%${q}%,car_brand.ilike.%${q}%,status_admin.ilike.%${q}%`);
        }
    }

    // Сортировка
    let dbSortCol = sortBy;
    if (sortBy === 'id') dbSortCol = 'id';
    else if (sortBy === 'createdAt' || sortBy === 'created_at' || sortBy === 'date') dbSortCol = 'created_at';
    else if (sortBy === 'statusUpdatedAt') dbSortCol = 'status_updated_at'; // Маппинг для сортировки по времени статуса
    else if (sortBy === 'clientName') dbSortCol = 'client_name';
    else if (sortBy === 'offers') {
        // Используем computed column offers_count (нужно выполнить add_computed_column.sql)
        dbSortCol = 'offers_count';
    }

    // Первичная сортировка
    query = query.order(dbSortCol, { ascending: sortDirection === 'asc' });
    
    // Вторичная сортировка (для стабильной пагинации)
    if (dbSortCol !== 'id') {
        query = query.order('id', { ascending: true }); // Всегда добавляем стабильный хвост
    }

    // Пагинация
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }

    const mappedData = data.map(order => this.mapDbOrderToAppOrder(order));
    
    return { data: mappedData, count: count || 0 };
  }

  /**
   * Получение статистики для дашбордов (не зависит от поиска и пагинации)
   */
  static async getMarketStats(): Promise<{ today: number, week: number, month: number, total: number, leader: string }> {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
      const startOfWeek = new Date(now.setDate(diff));
      const startOfWeekISO = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate()).toISOString();
      
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Запросы выполняются параллельно
      const [
          { count: total },
          { count: today },
          { count: week },
          { count: month },
          { data: recentOrders }
      ] = await Promise.all([
          supabase.from('orders').select('*', { count: 'exact', head: true }),
          supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', startOfToday),
          supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', startOfWeekISO),
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
          { key: 'kp_sent', val: 'КП готово' }, // Админский статус
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

  /**
   * Вспомогательный метод для маппинга заказа
   */
  private static mapDbOrderToAppOrder(dbOrder: any): Order {
    const items: OrderItem[] = dbOrder.order_items.map((item: any) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      comment: item.comment,
      category: item.category, // Mapped category
      car: {
        model: dbOrder.car_model,
        brand: dbOrder.car_brand,
        year: dbOrder.car_year,
        bodyType: '', 
        engine: '',
        transmission: ''
      }
    }));

    const offers: Order[] = dbOrder.offers.map((offer: any) => ({
      id: String(offer.id),
      parentId: String(dbOrder.id),
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
        deliveryWeeks: oi.delivery_days !== null && oi.delivery_days !== undefined ? Math.ceil(oi.delivery_days / 7) : undefined,
        deliveryDays: oi.delivery_days,
        deliveryRate: oi.delivery_rate, // Маппинг тарифа доставки
        weight: oi.weight, // Убедимся что в БД есть колонка weight
        photoUrl: oi.photo_url,
        adminComment: oi.admin_comment,
        comment: oi.comment, // Комментарий поставщика
        totalCost: oi.total_cost, // Computed Column
        goodsCost: oi.goods_cost  // Computed Column
      })),
      status: OrderStatus.OPEN,
      vin: dbOrder.vin,
      location: dbOrder.location
    }));

    return {
      id: String(dbOrder.id),
      type: RowType.ORDER,
      vin: dbOrder.vin,
      clientName: dbOrder.client_name,
      clientPhone: dbOrder.client_phone,
      status: dbOrder.status_admin === 'ЗАКРЫТ' ? OrderStatus.CLOSED : OrderStatus.OPEN,
      statusAdmin: dbOrder.status_admin,
      statusClient: dbOrder.status_client,
      statusSeller: dbOrder.status_supplier,
      workflowStatus: dbOrder.status_client as WorkflowStatus,
      createdAt: new Date(dbOrder.created_at).toLocaleString('ru-RU'),
      statusUpdatedAt: dbOrder.status_updated_at ? new Date(dbOrder.status_updated_at).toLocaleString('ru-RU') : undefined,
      location: dbOrder.location,
      visibleToClient: dbOrder.visible_to_client ? 'Y' : 'N',
      items: items,
      offers: offers,
      car: items[0]?.car,
      isProcessed: dbOrder.visible_to_client
    };
  }

  /**
   * Получение ленты заказов для ПОСТАВЩИКА (RPC)
   */
  static async getSellerFeed(
    sellerName: string,
    tab: 'new' | 'history',
    page: number,
    limit: number,
    search: string,
    sortCol: string = 'created_at',
    sortDir: 'asc' | 'desc' = 'desc',
    brandFilter: string | null = null // Новый параметр
  ): Promise<{ data: Order[], count: number, counts: { new: number, history: number } }> {
    
    const { data, error } = await supabase.rpc('get_seller_feed', {
        p_seller_name: sellerName,
        p_tab: tab,
        p_page: page,
        p_limit: limit,
        p_search: search,
        p_sort_col: sortCol,
        p_sort_dir: sortDir,
        p_brand_filter: brandFilter
    });

    if (error) throw error;

    if (!data || data.length === 0) return { data: [], count: 0, counts: { new: 0, history: 0 } };

    const totalCount = data[0].total_count || 0;
    const countNew = data[0].count_new || 0;
    const countHistory = data[0].count_history || 0;

    const mappedOrders: Order[] = data.map((d: any) => ({
        id: String(d.id),
        type: RowType.ORDER,
        createdAt: new Date(d.created_at).toLocaleString('ru-RU'),
        clientName: d.client_name,
        vin: d.vin,
        car: {
            brand: d.car_brand,
            model: d.car_model,
            year: d.car_year,
            bodyType: '', 
            engine: '', 
            transmission: ''
        },
        status: d.status_admin === 'ЗАКРЫТ' ? OrderStatus.CLOSED : OrderStatus.OPEN,
        statusAdmin: d.status_admin,
        statusClient: d.status_client,
        statusSeller: d.status_supplier,
        visibleToClient: d.visible_to_client ? 'Y' : 'N',
        isProcessed: d.status_admin !== 'В обработке' && d.status_admin !== 'ОТКРЫТ',
        items: (d.items || []).map((i: any) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            category: i.category
        })),
        offers: d.my_offer ? [{
            id: String(d.my_offer.id),
            clientName: d.my_offer.supplier_name,
            items: d.my_offer.items || []
        } as any] : []
    }));

    return { 
        data: mappedOrders, 
        count: Number(totalCount),
        counts: { new: Number(countNew), history: Number(countHistory) }
    };
  }

  static async getSellerBrands(sellerName: string): Promise<string[]> {
      const { data, error } = await supabase.rpc('get_seller_brands', {
          p_seller_name: sellerName
      });
      if (error) throw error;
      return data?.map((d: any) => d.brand) || [];
  }

  /**
   * Создание нового заказа
   */
  static async createOrder(vin: string, items: any[], clientName: string, car: any, clientPhone?: string): Promise<string> {
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        vin,
        client_name: clientName,
        client_phone: clientPhone,
        car_brand: car.brand,
        car_model: car.AdminModel || car.model,
        car_year: car.AdminYear || car.year,
        location: 'РФ'
      })
      .select()
      .single();

    if (orderError) throw orderError;

    const itemsToInsert = items.map(item => ({
      order_id: orderData.id,
      name: item.name,
      quantity: item.quantity || 1,
      comment: item.comment,
      category: item.category // Insert category
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    return String(orderData.id);
  }

  /**
   * Создание предложения (Offer)
   */
  static async createOffer(orderId: string, sellerName: string, items: any[], vin: string, sellerPhone?: string): Promise<void> {
    const { data: offerData, error: offerError } = await supabase
      .from('offers')
      .insert({
        order_id: orderId,
        supplier_name: sellerName,
        supplier_phone: sellerPhone
      })
      .select()
      .single();

    if (offerError) throw offerError;

    const offerItemsToInsert = items.map(item => ({
      offer_id: offerData.id,
      name: item.name,
      quantity: item.offeredQuantity || item.quantity || 1,
      price: item.sellerPrice || 0,
      currency: item.sellerCurrency || 'RUB',
      delivery_days: item.deliveryWeeks ? item.deliveryWeeks * 7 : (item.deliveryDays || 0),
      weight: item.weight || 0,
      photo_url: item.photoUrl || '',
      comment: item.comment || ''
    }));

    const { error: oiError } = await supabase
      .from('offer_items')
      .insert(offerItemsToInsert);

    if (oiError) throw oiError;
  }

  /**
   * Выбор победителя (Rank Update)
   */
  static async updateRank(vin: string, itemName: string, offerId: string, adminPrice?: number, adminCurrency?: Currency, actionType?: 'RESET', adminComment?: string, deliveryRate?: number): Promise<void> {
    const { data: offer } = await supabase.from('offers').select('order_id').eq('id', offerId).single();
    if (!offer) return;

    const orderId = offer.order_id;
    const { data: siblingOffers } = await supabase.from('offers').select('id').eq('order_id', orderId);
    const offerIds = siblingOffers?.map(o => o.id) || [];

    if (actionType === 'RESET') {
      await supabase.from('offer_items')
        .update({ is_winner: false })
        .in('offer_id', offerIds)
        .eq('name', itemName);
    } else {
      await supabase.from('offer_items')
        .update({ is_winner: false })
        .in('offer_id', offerIds)
        .eq('name', itemName);
      
      const { error: updateError } = await supabase.from('offer_items')
        .update({ 
          is_winner: true,
          admin_price: adminPrice,
          admin_currency: adminCurrency,
          delivery_rate: deliveryRate,
          admin_comment: adminComment
        })
        .eq('offer_id', offerId)
        .eq('name', itemName);

      if (updateError) {
          console.warn("delivery_rate update failed, falling back to delivery_days", updateError);
          // Fallback: if delivery_rate column is missing, save to delivery_days
          await supabase.from('offer_items')
          .update({ 
            is_winner: true,
            admin_price: adminPrice,
            admin_currency: adminCurrency,
            delivery_days: deliveryRate, 
            admin_comment: adminComment
          })
          .eq('offer_id', offerId)
          .eq('name', itemName);
      }
    }
  }

  static async formCP(orderId: string): Promise<void> {
    await supabase.from('orders').update({
      status_client: 'КП отправлено',
      status_admin: 'КП готово'
    }).eq('id', orderId);
  }

  /**
   * МГНОВЕННОЕ Утверждение КП (RPC вызов)
   */
  static async approveOrderFast(orderId: string, winners: any[]): Promise<void> {
    const { error } = await supabase.rpc('approve_order_winners', {
      p_order_id: Number(orderId),
      p_winners: winners
    });

    if (error) throw error;
  }

  static async confirmPurchase(orderId: string): Promise<void> {
    await supabase.from('orders').update({
      status_client: 'Подтверждение от поставщика',
      status_admin: 'Готов купить'
    }).eq('id', orderId);
  }

  static async refuseOrder(orderId: string, reason?: string, source: 'ADMIN' | 'CLIENT' = 'ADMIN'): Promise<void> {
    const status = source === 'ADMIN' ? 'Аннулирован' : 'Отказ';
    await supabase.from('orders').update({
      status_client: status,
      status_admin: status,
      status_supplier: 'Торги завершены',
      status_updated_at: new Date().toISOString()
    }).eq('id', orderId);
  }

  static async updateOrderJson(orderId: string, newItems: any[]): Promise<void> {
    for (const item of newItems) {
      await supabase.from('order_items')
        .update({ name: item.name, quantity: item.quantity })
        .eq('order_id', orderId)
        .eq('id', item.id);
    }
  }

  static async updateWorkflowStatus(orderId: string, status: string): Promise<void> {
    await supabase.from('orders').update({
      status_client: status,
      status_admin: status,
      status_updated_at: new Date().toISOString()
    }).eq('id', orderId);
  }

  /**
   * УДАЛИТЬ ВСЕ ЗАКАЗЫ (Очистка БД)
   */
  static async deleteAllOrders(): Promise<void> {
    const { error } = await supabase.rpc('reset_db');
    if (error) {
        console.error("RPC Error:", error);
        await supabase.from('orders').delete().neq('id', 0);
    }
  }

  /**
   * ГЕНЕРАЦИЯ ТЕСТОВЫХ ЗАКАЗОВ (Seed)
   */
  static async seedOrders(count: number, onProgress: (created: number) => void): Promise<void> {
    const BATCH_SIZE = 1000;
    const iterations = Math.ceil(count / BATCH_SIZE);

    const brands = ['Toyota', 'BMW', 'Mercedes', 'Audi', 'Kia', 'Hyundai', 'Lada'];
    const models = ['Camry', 'X5', 'E-Class', 'A6', 'Rio', 'Solaris', 'Vesta'];

    for (let i = 0; i < iterations; i++) {
      const ordersBatch = [];
      const itemsBatch = [];
      
      for (let j = 0; j < BATCH_SIZE; j++) {
        if (i * BATCH_SIZE + j >= count) break;
        
        ordersBatch.push({
          client_name: 'КЛИЕНТ № 1', // Фиксированное имя для демо
          client_phone: '+7 (999) 111-22-33', // Фиксированный телефон
          car_brand: brands[Math.floor(Math.random() * brands.length)],
          car_model: models[Math.floor(Math.random() * models.length)],
          car_year: '2020',
          vin: `VIN${Date.now()}${j}`,
          location: 'Москва',
          status_admin: 'В обработке',
          status_client: 'В обработке'
        });
      }

      const { data: createdOrders, error: orderError } = await supabase
        .from('orders')
        .insert(ordersBatch)
        .select('id');
      
      if (orderError) throw orderError;
      if (!createdOrders) continue;

      for (const order of createdOrders) {
        itemsBatch.push({
          order_id: order.id,
          name: 'Масляный фильтр',
          quantity: 1
        });
      }

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsBatch);
        
      if (itemsError) throw itemsError;

      onProgress(Math.min((i + 1) * BATCH_SIZE, count));
    }
  }

  // --- CHAT SYSTEM ---

  static async getChatMessages(orderId: string, offerId?: string, supplierName?: string): Promise<any[]> {
      console.log('getChatMessages called with:', { orderId, offerId, supplierName });
      let query = supabase
          .from('chat_messages')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: true });

      // Логика изменилась: мы всегда ищем переписку "Админ <-> Поставщик" в рамках заказа.
      // offer_id больше не является строгим фильтром, так как сообщения могут быть без него.
      if (supplierName) {
          const escapedName = supplierName.replace(/"/g, '\\"');
          query = query.or(`sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`);
      }

      const { data, error } = await query;
      if (error) {
          console.error('getChatMessages DB error:', error);
          throw error;
      }
      // console.log('getChatMessages returned:', data?.length);
      return data || [];
  }

  static async sendChatMessage(payload: {
      order_id: string,
      offer_id?: string | null,
      sender_role: 'ADMIN' | 'SUPPLIER',
      sender_name: string,
      recipient_name?: string,
      message: string,
      item_name?: string
  }): Promise<void> {
      const { error } = await supabase.from('chat_messages').insert(payload);
      if (error) throw error;
  }

  static async getUnreadChatCount(): Promise<number> {
      const { count, error } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_role', 'SUPPLIER')
          .eq('is_read', false);
      
      if (error) throw error;
      return count || 0;
  }

  static async getUnreadChatCountForSupplier(supplierName: string): Promise<{ count: number }> {
      const { count, error } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_name', supplierName)
          .eq('is_read', false);
      
      if (error) throw error;
      return { count: count || 0 };
  }

  static async markChatAsRead(orderId: string, supplierName: string, readerRole: 'ADMIN' | 'SUPPLIER'): Promise<void> {
      let query = supabase.from('chat_messages').update({ is_read: true }).eq('order_id', orderId);

      if (readerRole === 'ADMIN') {
          // Админ читает сообщения от Поставщика
          const escapedName = supplierName.replace(/"/g, '\\"');
          query = query.eq('sender_name', escapedName).eq('sender_role', 'SUPPLIER');
      } else {
          // Поставщик читает сообщения от Админа, адресованные ему
          const escapedName = supplierName.replace(/"/g, '\\"');
          query = query.eq('sender_role', 'ADMIN').eq('recipient_name', escapedName);
      }

      await query;
  }

  static async deleteChatHistory(orderId: string, supplierName?: string): Promise<void> {
      let query = supabase.from('chat_messages').delete().eq('order_id', orderId);
      
      if (supplierName) {
          // Удаляем переписку только с конкретным поставщиком
          const escapedName = supplierName.replace(/"/g, '\\"');
          // (Sender = Supplier AND Recipient = Admin) OR (Sender = Admin AND Recipient = Supplier)
          // PostgREST .or() filter
          query = query.or(`sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`);
      }
      
      const { error } = await query;
      if (error) throw error;
  }

  // Получение простых названий товаров для выпадающего списка в чате
  static async getOrderItemsSimple(orderId: string): Promise<string[]> {
      const { data } = await supabase
          .from('order_items')
          .select('name')
          .eq('order_id', orderId);
      return data?.map((i: any) => i.name) || [];
  }

  static async getGlobalChatThreads(filterBySupplierName?: string): Promise<Record<string, Record<string, { lastMessage: string, time: string, unread: number }>>> {
      // console.log('getGlobalChatThreads filtering by:', filterBySupplierName);
      
      let query = supabase
          .from('chat_messages')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);

      // Если запрашивает поставщик, он должен видеть только те сообщения, 
      // где он отправитель или он получатель.
      if (filterBySupplierName) {
          const escapedName = filterBySupplierName.replace(/"/g, '\\"');
          query = query.or(`sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`);
      }

      const { data, error } = await query;

      if (error) {
          console.error('getGlobalChatThreads error:', error);
          throw error;
      }
      
      // console.log('getGlobalChatThreads found:', data?.length);

      const threads: Record<string, Record<string, any>> = {};

      data?.forEach((msg: any) => {
          const oid = String(msg.order_id);
          
          let supplierName = '';
          if (msg.sender_role === 'SUPPLIER') {
              supplierName = msg.sender_name;
          } else {
              supplierName = msg.recipient_name || 'Unknown';
          }

          if (supplierName === 'Unknown') return;
          
          // Для поставщика мы можем группировать все под "Менеджер", но для унификации структуры
          // оставим ключ как имя поставщика (т.е. самого себя), чтобы структура совпадала с админской.
          
          if (!threads[oid]) threads[oid] = {};
          if (!threads[oid][supplierName]) {
              threads[oid][supplierName] = {
                  lastMessage: msg.message,
                  time: msg.created_at,
                  unread: 0
              };
          }
          
          // Считаем непрочитанные:
          // Если я Админ (нет фильтра), то считаю сообщения от SUPPLIER.
          // Если я Поставщик (есть фильтр), то считаю сообщения от ADMIN.
          const isMsgFromOther = filterBySupplierName 
              ? (msg.sender_role === 'ADMIN') 
              : (msg.sender_role === 'SUPPLIER');

          if (!msg.is_read && isMsgFromOther) {
              threads[oid][supplierName].unread++;
          }
      });

      return threads;
  }
}