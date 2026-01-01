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
      location: dbOrder.location,
      visibleToClient: dbOrder.visible_to_client ? 'Y' : 'N',
      items: items,
      offers: offers,
      car: items[0]?.car,
      isProcessed: dbOrder.visible_to_client
    };
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
      photo_url: item.photoUrl || ''
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
      status_supplier: 'Торги завершены'
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
      status_admin: status
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
}