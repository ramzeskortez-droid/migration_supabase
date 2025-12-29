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
         if (statusFilter === 'В обработке') {
             query = query.eq('status_admin', 'В обработке');
         } else if (statusFilter === 'КП отправлено') {
             query = query.or('status_admin.eq.КП отправлено,status_client.eq.КП готово');
         } else if (statusFilter === 'Аннулирован') {
             query = query.eq('status_admin', 'Аннулирован');
         } else if (statusFilter === 'Отказ') {
             query = query.eq('status_admin', 'Отказ');
         } else {
             query = query.eq('status_admin', statusFilter);
         }
    }

    // Поиск (Search)
    if (searchQuery) {
        if (!isNaN(Number(searchQuery))) {
             query = query.eq('id', Number(searchQuery));
        } else {
             query = query.or(`vin.ilike.%${searchQuery}%,client_name.ilike.%${searchQuery}%`);
        }
    }

    // Сортировка
    let dbSortCol = sortBy;
    if (sortBy === 'createdAt') dbSortCol = 'created_at';
    if (sortBy === 'clientName') dbSortCol = 'client_name';

    query = query.order(dbSortCol, { ascending: sortDirection === 'asc' });

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
   * Вспомогательный метод для маппинга заказа
   */
  private static mapDbOrderToAppOrder(dbOrder: any): Order {
    const items: OrderItem[] = dbOrder.order_items.map((item: any) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      comment: item.comment,
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
        sellerPrice: oi.price,
        sellerCurrency: oi.currency as Currency,
        adminPrice: oi.admin_price,
        adminCurrency: oi.admin_currency as Currency,
        rank: oi.is_winner ? 'ЛИДЕР' : 'РЕЗЕРВ',
        deliveryWeeks: oi.delivery_days ? Math.ceil(oi.delivery_days / 7) : undefined
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
      workflowStatus: dbOrder.workflowStatus as WorkflowStatus,
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
      comment: item.comment
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
      currency: item.sellerCurrency || 'RUB'
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
      
      await supabase.from('offer_items')
        .update({ 
          is_winner: true,
          admin_price: adminPrice,
          admin_currency: adminCurrency,
          delivery_days: deliveryRate 
        })
        .eq('offer_id', offerId)
        .eq('name', itemName);
    }
  }

  static async formCP(orderId: string): Promise<void> {
    await supabase.from('orders').update({
      status_client: 'КП готово',
      status_admin: 'КП отправлено'
    }).eq('id', orderId);
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