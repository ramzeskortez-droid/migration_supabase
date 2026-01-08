import { supabase } from '../lib/supabaseClient';
import { Order, OrderStatus, RowType, OrderItem, WorkflowStatus, Currency, RankType, AppUser, ExchangeRates, BuyerLabel } from '../types';

export class SupabaseService {
  
  // --- AUTH & ROLES ---

  static async loginWithToken(token: string): Promise<AppUser | null> {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('token', token)
      .maybeSingle();
    
    if (error) throw error;
    if (!data) return null;

    if (data.status === 'pending') {
        throw new Error('Ваш аккаунт находится на проверке. Ожидайте подтверждения менеджера.');
    }

    if (data.status === 'rejected') {
        throw new Error('Доступ запрещен. Ваш аккаунт был отклонен.');
    }

    if (data.status !== 'approved') {
         throw new Error('Статус аккаунта не подтвержден.');
    }

    return {
      id: data.id,
      name: data.name,
      token: data.token,
      role: data.role,
      phone: data.phone,
      status: data.status
    };
  }

  static async registerUser(name: string, token: string, phone: string, role: 'operator' | 'buyer' = 'operator'): Promise<AppUser> {
      const { data, error } = await supabase
          .from('app_users')
          .insert({ name, token, role, phone, status: 'pending' }) 
          .select()
          .single();
      
      if (error) throw error;
      return {
          id: data.id,
          name: data.name,
          token: data.token,
          role: data.role,
          phone: data.phone,
          status: data.status
      };
  }

  static async getAppUsers(status: 'pending' | 'approved'): Promise<AppUser[]> {
      const { data, error } = await supabase
          .from('app_users')
          .select('*')
          .eq('status', status)
          .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data.map((u: any) => ({
          id: u.id,
          name: u.name,
          token: u.token,
          role: u.role,
          phone: u.phone,
          status: u.status,
          createdAt: u.created_at
      }));
  }

  static async updateUserStatus(userId: string, status: 'approved' | 'rejected'): Promise<void> {
      if (status === 'rejected') {
          const { error } = await supabase.from('app_users').delete().eq('id', userId);
          if (error) throw error;
      } else {
          const { error } = await supabase.from('app_users').update({ status }).eq('id', userId);
          if (error) throw error;
      }
  }

  // --- FINANCE (Exchange Rates) ---

  static async getExchangeRates(date?: string): Promise<ExchangeRates | null> {
    let query = supabase.from('exchange_rates').select('*');
    if (date) {
      query = query.eq('date', date);
    } else {
      query = query.order('date', { ascending: false }).limit(1);
    }
    
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data as ExchangeRates;
  }

  static async upsertExchangeRates(rates: ExchangeRates): Promise<void> {
    const { error } = await supabase.from('exchange_rates').upsert(rates);
    if (error) throw error;
  }

  static async updateOrderItemPrice(itemId: string, updates: { adminPrice?: number, isManualPrice?: boolean }): Promise<void> {
    const { error } = await supabase.from('order_items').update({
        admin_price: updates.adminPrice,
        is_manual_price: updates.isManualPrice
    }).eq('id', itemId);
    if (error) throw error;
  }

  // --- FILE STORAGE ---

  static async uploadFile(file: File, folder: 'orders' | 'offers' | 'chat'): Promise<string> {
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { error } = await supabase.storage
          .from('attachments')
          .upload(fileName, file);

      if (error) throw error;

      const { data } = supabase.storage
          .from('attachments')
          .getPublicUrl(fileName);
      
      return data.publicUrl;
  }

  // --- BUYER TOOLS (Labels & Filters) ---

  static async toggleOrderLabel(userToken: string, orderId: string, color: string): Promise<void> {
    const { data: existing } = await supabase
      .from('buyer_order_labels')
      .select('id, color')
      .eq('user_token', userToken)
      .eq('order_id', orderId)
      .maybeSingle();

    if (existing) {
        if (existing.color === color) {
            await supabase.from('buyer_order_labels').delete().eq('id', existing.id);
        } else {
            await supabase.from('buyer_order_labels').update({ color }).eq('id', existing.id);
        }
    } else {
        await supabase.from('buyer_order_labels').insert({
            user_token: userToken,
            order_id: orderId,
            color
        });
    }
  }

  static async getBuyerLabels(userToken: string): Promise<BuyerLabel[]> {
    const { data, error } = await supabase
      .from('buyer_order_labels')
      .select('id, order_id, color, label_text')
      .eq('user_token', userToken);

    if (error) throw error;
    return data.map((l: any) => ({
      id: l.id,
      orderId: l.order_id,
      color: l.color,
      text: l.label_text
    }));
  }

  static async getOrders(
    cursor?: number, 
    limit: number = 50, 
    sortBy: string = 'id', 
    sortDirection: 'asc' | 'desc' = 'desc',
    searchQuery: string = '',
    statusFilter?: string,
    clientPhoneFilter?: string,
    brandFilter?: string[], 
    onlyWithMyOffersName?: string,
    ownerToken?: string, // Legacy param name, used as ownerId
    buyerToken?: string, 
    excludeOffersFrom?: string 
  ): Promise<{ data: Order[], nextCursor?: number }> {
    
    let excludedIds: any[] = [];
    if (excludeOffersFrom) {
        const { data: off } = await supabase.from('offers').select('order_id').eq('supplier_name', excludeOffersFrom);
        excludedIds = off?.map(o => o.order_id) || [];
    }

    let matchingBrandIds: any[] = [];
    if (brandFilter && brandFilter.length > 0) {
        const { data: items } = await supabase.from('order_items').select('order_id').in('brand', brandFilter);
        matchingBrandIds = items?.map(i => i.order_id) || [];
    }

    let query = supabase.from('orders').select(`
        id, created_at, client_name, client_phone, 
        status_admin, status_client, status_supplier,
        visible_to_client, location, status_updated_at,
        owner_id,
        deadline,
        order_items (id, name, comment, quantity, brand, article, uom, photo_url, admin_price),
        offers (id, supplier_name, offer_items (is_winner, quantity, name, price, currency, admin_price, delivery_days))
    `);

    if (ownerToken) {
        if (ownerToken.length > 20) {
             query = query.eq('owner_id', ownerToken);
        } else {
             const { data: u } = await supabase.from('app_users').select('id').eq('token', ownerToken).maybeSingle();
             if (u) query = query.eq('owner_id', u.id);
             else return { data: [], nextCursor: undefined }; 
        }
    }

    if (clientPhoneFilter) query = query.eq('client_phone', clientPhoneFilter);
    
    if (excludeOffersFrom && excludedIds.length > 0) {
        query = query.not('id', 'in', `(${excludedIds.join(',')})`);
    }

    if (brandFilter && brandFilter.length > 0) {
        if (matchingBrandIds.length > 0) {
            query = query.in('id', matchingBrandIds);
        } else {
            return { data: [], nextCursor: undefined };
        }
    }

    if (statusFilter) {
        const isIdSearch = searchQuery && !isNaN(Number(searchQuery.trim()));
        if (!isIdSearch) {
            if (statusFilter.includes(',')) {
                query = query.in('status_admin', statusFilter.split(',').map(s => s.trim()));
            } else {
                query = query.eq('status_admin', statusFilter);
            }
        }
    }

    if (onlyWithMyOffersName) {
        const { data: myOff } = await supabase.from('offers').select('order_id').eq('supplier_name', onlyWithMyOffersName);
        const ids = myOff?.map(o => o.order_id) || [];
        query = query.in('id', ids);
    }

    if (searchQuery) {
        const q = searchQuery.trim();
        if (!isNaN(Number(q))) {
             query = query.or(`id.eq.${q},client_phone.ilike.%${q}%`);
        } else {
             query = query.or(`client_name.ilike.%${q}%`);
        }
    }

    if (cursor) {
        if (sortDirection === 'desc') query = query.lt('id', cursor);
        else query = query.gt('id', cursor);
    }

    const { data, error } = await query.order('id', { ascending: sortDirection === 'asc' }).limit(limit);
    
    if (error) {
        console.error('getOrders ERROR:', error);
        throw error;
    }
    
    console.log('getOrders RESULT:', {
        count: data?.length,
        filters: { statusFilter, ownerToken, buyerToken, excludeOffersFrom }
    });

    let labelsMap: Record<string, BuyerLabel> = {};
    if (buyerToken && data.length > 0) {
        const ids = data.map(o => o.id);
        const { data: labels } = await supabase
            .from('buyer_order_labels')
            .select('*')
            .eq('user_token', buyerToken)
            .in('order_id', ids);
            
        labels?.forEach((l: any) => {
            labelsMap[l.order_id] = { id: l.id, orderId: l.order_id, color: l.color, text: l.label_text };
        });
    }

    const mappedData = data.map(order => ({
        id: String(order.id),
        type: RowType.ORDER,
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
        ownerId: order.owner_id,
        deadline: order.deadline ? new Date(order.deadline).toLocaleDateString('ru-RU') : undefined,
        buyerLabels: labelsMap[order.id] ? [labelsMap[order.id]] : [],
            items: order.order_items?.map((i: any) => ({
                id: i.id, name: i.name, quantity: i.quantity, comment: i.comment, brand: i.brand, article: i.article, uom: i.uom, opPhotoUrl: i.photo_url, adminPrice: i.admin_price
            })) || [],
            offers: order.offers?.map((o: any) => ({
                id: o.id, clientName: o.supplier_name, items: o.offer_items?.sort((a: any, b: any) => a.id - b.id).map((oi: any) => ({
                    id: oi.id, name: oi.name, is_winner: oi.is_winner, quantity: oi.quantity, offeredQuantity: oi.quantity,
                    sellerPrice: oi.price, sellerCurrency: oi.currency,
                    adminPrice: oi.admin_price,
                    deliveryWeeks: oi.delivery_days ? Math.ceil(oi.delivery_days / 7) : 0
                })) || []
            })) || [],
        isProcessed: order.status_admin !== 'В обработке' && order.status_admin !== 'ОТКРЫТ'
    } as Order));
    
    const nextCursor = data.length === limit ? data[data.length - 1].id : undefined;
    return { data: mappedData, nextCursor };
  }

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

      const sortedOrderItems = data.order_items.sort((a: any, b: any) => a.id - b.id);

      const items: OrderItem[] = sortedOrderItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        comment: item.comment,
        category: item.category,
        opPhotoUrl: item.photo_url,
        adminPrice: item.admin_price,
        brand: item.brand,
        article: item.article,
        uom: item.uom
      }));

      const offers: Order[] = data.offers.map((offer: any) => ({
        id: String(offer.id),
        parentId: String(data.id),
        type: RowType.OFFER,
        clientName: offer.supplier_name,
        clientPhone: offer.supplier_phone,
        createdAt: new Date(offer.created_at).toLocaleString('ru-RU'),
        items: offer.offer_items.sort((a: any, b: any) => a.id - b.id).map((oi: any) => ({
          id: oi.id,
          order_item_id: oi.order_item_id,
          name: oi.name,
          quantity: oi.quantity,
          offeredQuantity: oi.quantity,
          sellerPrice: oi.price,
          sellerCurrency: oi.currency as Currency,
          adminPrice: oi.admin_price, 
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
      ] = await Promise.all([
          supabase.from('orders').select('*', { count: 'exact', head: true }),
          supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', startOfToday),
          supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', startOfWeek),
          supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
      ]);

      return { today: today || 0, week: week || 0, month: month || 0, total: total || 0, leader: "N/A" };
  }

  static async getStatusCounts(): Promise<Record<string, number>> {
      const statuses = [
          { key: 'new', val: 'В обработке' },
          { key: 'kp_sent', val: 'КП готово' }, 
          { key: 'ready_to_buy', val: 'КП отправлено,Готов купить' },
          { key: 'supplier_confirmed', val: 'Подтверждение от поставщика' },
          { key: 'awaiting_payment', val: 'Ожидает оплаты' },
          { key: 'in_transit', val: 'В пути' },
          { key: 'completed', val: 'Выполнен' },
          { key: 'annulled', val: 'Аннулирован' },
          { key: 'refused', val: 'Отказ' }
      ];

      const promises = statuses.map(s => {
          let query = supabase.from('orders').select('*', { count: 'exact', head: true });
          if (s.val.includes(',')) {
              query = query.in('status_admin', s.val.split(',').map(v => v.trim()));
          } else {
              query = query.eq('status_admin', s.val);
          }
          return query;
      });

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

  static async searchBrands(query: string): Promise<string[]> {
      if (!query || query.length < 2) return [];
      const { data, error } = await supabase
          .from('brands')
          .select('name')
          .ilike('name', `%${query}%`)
          .order('name')
          .limit(20);
      if (error) throw error;
      return data?.map((b: any) => b.name) || [];
  }

  static async checkBrandExists(name: string): Promise<string | null> {
      if (!name) return null;
      const { data, error } = await supabase
          .from('brands')
          .select('name')
          .ilike('name', name) 
          .maybeSingle();
      if (error) return null;
      return data ? data.name : null;
  }

  static async getBrandsList(): Promise<string[]> {
      const { data, error } = await supabase.from('brands').select('name').order('name');
      if (error) throw error;
      return data?.map((b: any) => b.name) || [];
  }

  static async getBrandsFull(page: number = 1, limit: number = 100, search: string = '', sortField: string = 'id', sortDirection: 'asc' | 'desc' = 'desc'): Promise<{ data: Brand[], count: number }> {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase.from('brands').select('*', { count: 'exact' });
      
      if (search) {
          query = query.ilike('name', `%${search}%`);
      }

      const { data, error, count } = await query
          .order(sortField, { ascending: sortDirection === 'asc' })
          .range(from, to);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
  }

  static async getSupplierUsedBrands(supplierName: string): Promise<string[]> {
      const { data, error } = await supabase
        .from('offers')
        .select(`
            order_id,
            orders (
                order_items (brand)
            )
        `)
        .ilike('supplier_name', supplierName)
        .limit(100);
        
      if (error || !data) return [];
      
      const brands: string[] = [];
      data.forEach(offer => {
          offer.orders?.order_items?.forEach((item: any) => {
              if (item.brand) brands.push(item.brand);
          });
      });
        
      return Array.from(new Set(brands)).sort().slice(0, 10);
  }

  static async addBrand(name: string, createdBy: string = 'Admin'): Promise<void> {
      const { error } = await supabase.from('brands').insert({ name, created_by: createdBy });
      if (error) throw error;
  }

  static async updateBrand(id: number, name: string): Promise<void> {
      const { error } = await supabase.from('brands').update({ name }).eq('id', id);
      if (error) throw error;
  }

  static async deleteBrand(id: number): Promise<void> {
      const { error } = await supabase.from('brands').delete().eq('id', id);
      if (error) throw error;
  }
  
  static async seedOrders(count: number, onProgress: (created: number) => void, ownerToken: string = 'op1'): Promise<void> {
    const { data: u } = await supabase.from('app_users').select('id').eq('token', ownerToken).maybeSingle();
    const ownerId = u?.id;

    const BATCH_SIZE = 50; 
    const iterations = Math.ceil(count / BATCH_SIZE);
    const randStr = (len: number) => Math.random().toString(36).substring(2, 2 + len).toUpperCase();
    const randNum = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randPhone = () => `+7 (999) ${randNum(100, 999)}-${randNum(10, 99)}-${randNum(10, 99)}`;
    const dbBrands = await this.getBrandsList();
    const brands = dbBrands.length > 0 ? dbBrands : ['Generic Brand']; 
    const parts = ['Фильтр масляный', 'Колодки тормозные', 'Свеча зажигания', 'Амортизатор', 'Диск тормозной', 'Ступица', 'Рычаг подвески', 'Фара правая'];

    for (let i = 0; i < iterations; i++) {
      const ordersBatch = [];
      const itemsBatch = [];

      for (let j = 0; j < BATCH_SIZE; j++) {
        if (i * BATCH_SIZE + j >= count) break;
        const subject = randStr(6);
        const clientName = `CLI-${randStr(6)}`;
        const location = `City-${randStr(4)} St-${randStr(4)}`;
        const deadline = new Date(2026, 1, randNum(8, 28)).toISOString();

        ordersBatch.push({
          client_name: clientName, 
          client_phone: randPhone(),
          location: location,
          status_admin: 'В обработке', 
          status_client: 'В обработке',
          owner_id: ownerId, 
          deadline: deadline,
          _temp_subject: subject 
        });
      }

      const { data: createdOrders, error: orderError } = await supabase
        .from('orders')
        .insert(ordersBatch.map(({ _temp_subject, ...o }) => o))
        .select('id');

      if (orderError) throw orderError;
      if (!createdOrders) continue;

      createdOrders.forEach((order, idx) => {
        const originalOrder = ordersBatch[idx];
        const subject = originalOrder._temp_subject;
        const itemCount = randNum(1, 3);

        for (let k = 0; k < itemCount; k++) {
            itemsBatch.push({
                order_id: order.id,
                name: parts[Math.floor(Math.random() * parts.length)],
                brand: brands[Math.floor(Math.random() * brands.length)], 
                article: randStr(8),
                uom: 'шт',
                quantity: randNum(1, 10),
                comment: k === 0 ? `[Тема: ${subject}]` : '' 
            });
        }
      });

      const { error: itemsError } = await supabase.from('order_items').insert(itemsBatch);
      if (itemsError) throw itemsError;

      onProgress(Math.min((i + 1) * BATCH_SIZE, count));
    }
  }

  static async generateTestOffers(orderId: string): Promise<void> {
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId);
    if (!items || items.length === 0) return;

    const { data: buyers } = await supabase.from('app_users').select('*').eq('role', 'buyer').eq('status', 'approved');
    
    if (!buyers || buyers.length === 0) {
        throw new Error('Нет доступных закупщиков в базе');
    }

    const { data: existingOffers } = await supabase.from('offers').select('supplier_name').eq('order_id', orderId);
    const existingNames = new Set(existingOffers?.map(o => o.supplier_name) || []);

    const availableBuyers = buyers.filter(b => !existingNames.has(b.name));

    if (availableBuyers.length === 0) {
        throw new Error('Все закупщики уже оставили предложения');
    }

    const shuffled = availableBuyers.sort(() => 0.5 - Math.random());
    const selectedBuyers = shuffled.slice(0, 2);

    for (const user of selectedBuyers) {
        const { data: offer } = await supabase.from('offers').insert({
            order_id: orderId,
            supplier_name: user.name,
            supplier_phone: user.phone,
            created_by: user.id 
        }).select().single();

        if (!offer) continue;

        const offerItems = items.map((item: any) => ({
            offer_id: offer.id,
            order_item_id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: Math.floor(Math.random() * 500) + 100, 
            currency: 'CNY',
            delivery_days: (Math.floor(Math.random() * 4) + 4) * 7, 
            weight: Number((Math.random() * 5).toFixed(1)),
            comment: 'Тестовое предложение (Auto)'
        }));

        await supabase.from('offer_items').insert(offerItems);
    }
    
    await supabase.from('orders').update({ 
        status_supplier: 'Идут торги',
        status_updated_at: new Date().toISOString()
    }).eq('id', orderId);
  }

  static subscribeToUserChats(
      callback: (payload: { new: any, eventType: 'INSERT' | 'UPDATE' }) => void,
      channelId: string = 'global-user-chats'
  ) {
      const channel = supabase.channel(channelId)
          .on(
              'postgres_changes',
              { event: 'INSERT', schema: 'public', table: 'chat_messages' },
              (payload) => callback({ new: payload.new, eventType: 'INSERT' })
          )
          .subscribe();
      return channel;
  }

  static subscribeToChatMessages(orderId: string, callback: (payload: any) => void) {
      const channel = supabase.channel(`chat:${orderId}`)
          .on(
              'postgres_changes',
              { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `order_id=eq.${orderId}` },
              (payload) => callback(payload.new)
          )
          .subscribe();
      return channel;
  }

  static unsubscribeFromChat(channel: any) {
      supabase.removeChannel(channel);
  }

  static async getChatMessages(orderId: string, offerId?: string, supplierName?: string): Promise<any[]> {
      let query = supabase.from('chat_messages').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
      if (supplierName) {
          const escapedName = supplierName.split('"').join('"');
          query = query.or(`sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
  }

  static async sendChatMessage(payload: {
      order_id: string, offer_id?: string | null, sender_role: 'ADMIN' | 'SUPPLIER',
      sender_name: string, recipient_name?: string, message: string, item_name?: string,
      file_url?: string, file_type?: string
  }): Promise<any> {
      const { data, error } = await supabase.from('chat_messages').insert(payload).select().single();
      if (error) throw error;
      const supplierName = payload.sender_role === 'SUPPLIER' ? payload.sender_name : payload.recipient_name;
      if (supplierName) {
          const escapedName = supplierName.split('"').join('"');
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
      const escapedName = supplierName.split('"').join('"'); 
      
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
          const escapedName = supplierName.split('"').join('"');
          query = query.or(`sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`);
      }
      const { error } = await query;
      if (error) throw error;
  }

  static async getOrderItemsSimple(orderId: string): Promise<string[]> {
      const { data } = await supabase.from('order_items').select('name').eq('order_id', orderId);
      return data?.map((i: any) => i.name) || [];
  }

  static async getGlobalChatThreads(filterBySupplierName?: string, isArchived: boolean = false): Promise<Record<string, Record<string, { lastMessage: string, lastAuthorName: string, time: string, unread: number }>>> {
      if (!isArchived) supabase.rpc('archive_old_chats').then(() => {});
      let query = supabase.from('chat_messages').select('*').eq('is_archived', isArchived).order('created_at', { ascending: false }).limit(500);
      if (filterBySupplierName) {
          const escapedName = filterBySupplierName.split('"').join('"');
          query = query.or(`sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`);
      }
      const { data, error } = await query;
      if (error) throw error;
      const threads: Record<string, Record<string, any>> = {};
      data?.forEach((msg: any) => {
          const oid = String(msg.order_id);
          let supplierKey = msg.sender_role === 'SUPPLIER' ? msg.sender_name : (msg.recipient_name || 'Unknown');
          if (supplierKey === 'Unknown') return;
          if (!threads[oid]) threads[oid] = {};
          if (!threads[oid][supplierKey]) {
              threads[oid][supplierKey] = { 
                  lastMessage: msg.message, 
                  lastAuthorName: msg.sender_name, 
                  time: msg.created_at, 
                  unread: 0 
              };
          }
          const isMsgFromOther = filterBySupplierName ? (msg.sender_role === 'ADMIN') : (msg.sender_role === 'SUPPLIER');
          if (!msg.is_read && isMsgFromOther) threads[oid][supplierKey].unread++;
      });
      return threads;
  }

  static async archiveChat(orderId: string, supplierName: string): Promise<void> {
      const escapedName = supplierName.split('"').join('"');
      const { error } = await supabase.from('chat_messages').update({ is_archived: true }).eq('order_id', orderId).or(`sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`);
      if (error) throw error;
  }
}