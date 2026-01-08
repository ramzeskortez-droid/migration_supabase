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
    ownerToken?: string, 
    buyerToken?: string, 
    excludeOffersFrom?: string,
    buyerTab?: 'new' | 'hot' | 'history'
  ): Promise<{ data: Order[], nextCursor?: number }> {
    
    let matchingIds: any[] = [];
    const q = searchQuery.trim();

    // 1. ПРЕДВАРИТЕЛЬНЫЙ ПОИСК ПО ПОЗИЦИЯМ (если есть текстовый запрос)
    if (q && isNaN(Number(q))) {
        const { data: items } = await supabase
            .from('order_items')
            .select('order_id')
            .or(`name.ilike.%${q}%,brand.ilike.%${q}%,article.ilike.%${q}%,comment.ilike.%${q}%`);
        
        if (items && items.length > 0) {
            matchingIds = Array.from(new Set(items.map(i => i.order_id)));
        }
    }

    // 2. СБОР ИСКЛЮЧЕНИЙ ДЛЯ ЗАКУПЩИКА
    let excludedIds: any[] = [];
    if (excludeOffersFrom) {
        const { data: off } = await supabase.from('offers').select('order_id').eq('supplier_name', excludeOffersFrom);
        excludedIds = off?.map(o => o.order_id) || [];
    }

    // 3. ОСНОВНОЙ ЗАПРОС
    let query = supabase.from('orders').select(`
        id, created_at, client_name, client_phone, client_email,
        status_admin, status_client, status_supplier,
        visible_to_client, location, status_updated_at,
        owner_id,
        deadline,
        order_items (id, name, comment, quantity, brand, article, uom, photo_url, admin_price),
        offers (id, supplier_name, offer_items (is_winner, quantity, name, price, currency, admin_price, delivery_days))
    `);

    // Фильтрация по табам закупщика
    if (buyerTab === 'new' || buyerTab === 'hot') {
        query = query.eq('status_admin', 'В обработке');
        if (excludedIds.length > 0) query = query.not('id', 'in', `(${excludedIds.join(',')})`);
        
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const isoDate = threeDaysAgo.toISOString();

        if (buyerTab === 'new') query = query.gte('created_at', isoDate);
        else query = query.lt('created_at', isoDate);
    } else if (buyerTab === 'history' && onlyWithMyOffersName) {
        const { data: myOff } = await supabase.from('offers').select('order_id').eq('supplier_name', onlyWithMyOffersName);
        const ids = myOff?.map(o => o.order_id) || [];
        query = query.in('id', ids.length > 0 ? ids : [0]);
    }

    // Изоляция для оператора
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
    
    if (brandFilter && brandFilter.length > 0) {
        const { data: items } = await supabase.from('order_items').select('order_id').in('brand', brandFilter);
        const ids = items?.map(i => i.order_id) || [];
        query = query.in('id', ids.length > 0 ? ids : [0]);
    }

    if (statusFilter && !buyerTab) {
        if (statusFilter.includes(',')) {
            query = query.in('status_admin', statusFilter.split(',').map(s => s.trim()));
        } else {
            query = query.eq('status_admin', statusFilter);
        }
    }

    // ЛОГИКА ПОИСКА (ОБЪЕДИНЕНИЕ СmatchingIds)
    if (q) {
        if (!isNaN(Number(q))) {
             // Если число - ищем строго по ID или телефону
             query = query.or(`id.eq.${q},client_phone.ilike.%${q}%`);
        } else {
             // Если текст - ищем по полям заказа ИЛИ по найденным ID из позиций
             let orFilter = `client_name.ilike.%${q}%,client_email.ilike.%${q}%`;
             if (matchingIds.length > 0) {
                 orFilter += `,id.in.(${matchingIds.join(',')})`;
             }
             query = query.or(orFilter);
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

    // Лог для отладки
    console.log(`FETCHED ORDERS for tab: ${buyerTab}, search: "${q}", count: ${data.length}`);

    let labelsMap: Record<string, any> = {};
    if (buyerToken) {
        const { data: labels } = await supabase.from('buyer_order_labels').select('order_id, color, label_text').eq('user_token', buyerToken);
        labels?.forEach((l: any) => {
            labelsMap[l.order_id] = { color: l.color, text: l.label_text };
        });
    }
    
    const mappedData = data.map(order => {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const orderDate = new Date(order.created_at);
        const isHot = order.status_admin === 'В обработке' && (!order.offers || order.offers.length === 0) && orderDate < threeDaysAgo;

        return {
            id: String(order.id),
            type: RowType.ORDER,
            clientName: order.client_name,
            clientPhone: order.client_phone,
            clientEmail: order.client_email,
            status: order.status_admin === 'ЗАКРЫТ' ? OrderStatus.CLOSED : OrderStatus.OPEN,
            statusAdmin: isHot ? 'ГОРИТ' : order.status_admin,
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
        } as unknown as Order;
    });
    
    const nextCursor = data.length === limit ? data[data.length - 1].id : undefined;
    return { data: mappedData, nextCursor };
  }

  static async getBuyerTabCounts(supplierName: string): Promise<{ new: number, hot: number, history: number }> {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const isoDate = threeDaysAgo.toISOString();

      const { data: myOff } = await supabase.from('offers').select('order_id').eq('supplier_name', supplierName);
      const myOfferIds = myOff?.map(o => o.order_id) || [];

      // Функция для создания базового запроса
      const getBaseQuery = () => {
          let q = supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status_admin', 'В обработке');
          if (myOfferIds.length > 0) {
              q = q.not('id', 'in', `(${myOfferIds.join(',')})`);
          }
          return q;
      };

      const [resNew, resHot, resHistory] = await Promise.all([
          getBaseQuery().gte('created_at', isoDate),
          getBaseQuery().lt('created_at', isoDate),
          supabase.from('orders').select('id', { count: 'exact', head: true }).in('id', myOfferIds.length > 0 ? myOfferIds : [0])
      ]);

      return {
          new: resNew.count || 0,
          hot: resHot.count || 0,
          history: resHistory.count || 0
      };
  }

  static async getBuyerQuickBrands(supplierName: string): Promise<string[]> {
      const { data: myOff } = await supabase.from('offers').select('order_id').eq('supplier_name', supplierName);
      const excludedIds = myOff?.map(o => o.order_id) || [];

      // Берем все бренды из заказов "В обработке", где я еще не участвую
      let query = supabase.from('order_items').select('brand, orders!inner(id, status_admin)');
      query = query.eq('orders.status_admin', 'В обработке');
      if (excludedIds.length > 0) query = query.not('orders.id', 'in', `(${excludedIds.join(',')})`);

      const { data } = await query;
      if (!data) return [];

      const brandCounts: Record<string, number> = {};
      data.forEach((i: any) => {
          if (i.brand) brandCounts[i.brand] = (brandCounts[i.brand] || 0) + 1;
      });

      return Object.entries(brandCounts)
          .sort((a, b) => b[1] - a[1]) // Сортировка по упоминаниям
          .slice(0, 7) // ТОП-7
          .map(entry => entry[0]);
  }

  static async getOrderDetails(orderId: string): Promise<{ items: OrderItem[], offers: Order[] }> {
      const { data, error } = await supabase
          .from('orders')
          .select(`
            id, order_items (*),
            offers (*, offer_items (*))
          `)
          .eq('id', orderId)
          .single();

      if (error) throw error;

      const sortedOrderItems = data.order_items.sort((a: any, b: any) => a.id - b.id);

      const items: OrderItem[] = sortedOrderItems.map((item: any) => ({
        id: item.id, name: item.name, quantity: item.quantity, comment: item.comment,
        category: item.category, opPhotoUrl: item.photo_url, adminPrice: item.admin_price,
        brand: item.brand, article: item.article, uom: item.uom
      }));

      const offers: Order[] = data.offers.map((offer: any) => ({
        id: String(offer.id), parentId: String(data.id), type: RowType.OFFER,
        clientName: offer.supplier_name, clientPhone: offer.supplier_phone,
        createdAt: new Date(offer.created_at).toLocaleString('ru-RU'),
        items: offer.offer_items.sort((a: any, b: any) => a.id - b.id).map((oi: any) => ({
          id: oi.id, order_item_id: oi.order_item_id, name: oi.name, quantity: oi.quantity,
          offeredQuantity: oi.quantity, sellerPrice: oi.price, sellerCurrency: oi.currency as Currency,
          adminPrice: oi.admin_price, rank: oi.is_winner ? 'ЛИДЕР' : 'РЕЗЕРВ',
          deliveryWeeks: oi.delivery_days ? Math.ceil(oi.delivery_days / 7) : 0,
          weight: oi.weight, photoUrl: oi.photo_url, adminComment: oi.admin_comment,
          comment: oi.comment, totalCost: oi.total_cost, goodsCost: oi.goods_cost
        }))
      } as any));

      return { items, offers };
  }

  static async getBuyerDashboardStats(userId: string): Promise<any> {
    const { data, error } = await supabase.rpc('get_buyer_dashboard_stats', { 
        p_user_id: userId
    });
    
    if (error || !data) {
        if (error) console.error('getBuyerDashboardStats ERROR:', error);
        return {
            department: { turnover: 0 },
            personal: { kp_count: 0, kp_sum: 0, won_count: 0, won_sum: 0 },
            leaders: { quantity_leader: '-', quantity_val: 0, sum_leader: '-', sum_val: 0 }
        };
    }
    return data;
  }

  static async createOrder(items: any[], clientName: string, clientPhone?: string, ownerId?: string, deadline?: string, clientEmail?: string, location?: string): Promise<string> {
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        client_name: clientName, client_phone: clientPhone, client_email: clientEmail,
        location: location || 'РФ', owner_id: ownerId, deadline: deadline || null
      })
      .select().single();

    if (orderError) throw orderError;

    const itemsToInsert = items.map(item => ({
      order_id: orderData.id, name: item.name, quantity: item.quantity || 1,
      comment: item.comment, category: item.category, photo_url: item.photoUrl || null,
      brand: item.brand || null, article: item.article || null, uom: item.uom || 'шт'
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
    if (itemsError) throw itemsError;
    return String(orderData.id);
  }

  static async createOffer(orderId: string, sellerName: string, items: any[], sellerPhone?: string, userId?: string): Promise<void> {
    const { data: existing } = await supabase.from('offers').select('id').eq('order_id', orderId).eq('supplier_name', sellerName).maybeSingle();
    if (existing) throw new Error('Вы уже отправили предложение по этому заказу.');

    const { data: offerData, error: offerError } = await supabase.from('offers').insert({ order_id: orderId, supplier_name: sellerName, supplier_phone: sellerPhone, created_by: userId }).select().single();
    if (offerError) throw offerError;

    const offerItemsToInsert = items.map(item => ({
      offer_id: offerData.id, name: item.name, quantity: item.offeredQuantity || item.quantity || 1,
      price: item.sellerPrice || item.BuyerPrice || 0, currency: item.sellerCurrency || item.BuyerCurrency || 'RUB',
      delivery_days: item.deliveryWeeks ? item.deliveryWeeks * 7 : (item.deliveryDays || 0),
      weight: item.weight || 0, photo_url: item.photoUrl || '', comment: item.comment || '', order_item_id: item.id
    }));

    const { error: oiError } = await supabase.from('offer_items').insert(offerItemsToInsert);
    if (oiError) throw oiError;

    await supabase.from('orders').update({ status_supplier: 'Идут торги', status_updated_at: new Date().toISOString() }).eq('id', orderId);
  }

  static async updateRank(offerItemId: string, orderItemId: string, offerId: string, adminPrice?: number, adminCurrency?: Currency, actionType?: 'RESET', adminComment?: string, deliveryRate?: number, adminPriceRub?: number): Promise<void> {
    const { data: offer } = await supabase.from('offers').select('order_id').eq('id', offerId).single();
    if (!offer) return;
    const finalPrice = adminPriceRub ?? adminPrice;

    if (actionType === 'RESET') {
      await supabase.from('offer_items').update({ is_winner: false, admin_price: null }).eq('id', offerItemId); 
      await supabase.from('order_items').update({ admin_price: null }).eq('id', orderItemId);
    } else {
      await supabase.from('offer_items').update({ is_winner: true, admin_price: finalPrice, delivery_rate: deliveryRate || 0, admin_comment: adminComment || '' }).eq('id', offerItemId);
      await supabase.from('order_items').update({ admin_price: finalPrice }).eq('id', orderItemId);
    }
  }

  static subscribeToUserChats(callback: (payload: any) => void, channelId: string) {
      return supabase.channel(channelId).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, callback).subscribe();
  }

  static subscribeToChatMessages(orderId: string, callback: (payload: any) => void) {
      return supabase.channel(`chat:${orderId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `order_id=eq.${orderId}` }, (payload) => callback(payload.new)).subscribe();
  }

  static unsubscribeFromChat(channel: any) { supabase.removeChannel(channel); }

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

  static async sendChatMessage(payload: any): Promise<any> {
      const { data, error } = await supabase.from('chat_messages').insert(payload).select().single();
      if (error) throw error;
      return data;
  }

  static async getUnreadChatCount(): Promise<number> {
      const { count } = await supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('sender_role', 'SUPPLIER').eq('is_read', false);
      return count || 0;
  }

  static async getUnreadChatCountForSupplier(supplierName: string): Promise<{ count: number }> {
      const { count } = await supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('recipient_name', supplierName).eq('is_read', false);
      return { count: count || 0 };
  }

  static async markChatAsRead(orderId: string, supplierName: string, readerRole: 'ADMIN' | 'SUPPLIER'): Promise<void> {
      let query = supabase.from('chat_messages').update({ is_read: true }).eq('order_id', orderId);
      const escapedName = supplierName.split('"').join('"'); 
      if (readerRole === 'ADMIN') query = query.eq('sender_name', escapedName).eq('sender_role', 'SUPPLIER');
      else query = query.eq('sender_role', 'ADMIN').eq('recipient_name', escapedName);
      await query;
  }

  static async deleteChatHistory(orderId: string, supplierName?: string): Promise<void> {
      let query = supabase.from('chat_messages').delete().eq('order_id', orderId);
      if (supplierName) {
          const escapedName = supplierName.split('"').join('"');
          query = query.or(`sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`);
      }
      await query;
  }

  static async getOrderItemsSimple(orderId: string): Promise<string[]> {
      const { data } = await supabase.from('order_items').select('name').eq('order_id', orderId);
      return data?.map((i: any) => i.name) || [];
  }

  static async getGlobalChatThreads(filterBySupplierName?: string, isArchived: boolean = false): Promise<Record<string, Record<string, any>>> {
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
              threads[oid][supplierKey] = { lastMessage: msg.message, lastAuthorName: msg.sender_name, time: msg.created_at, unread: 0 };
          }
          const isMsgFromOther = filterBySupplierName ? (msg.sender_role === 'ADMIN') : (msg.sender_role === 'SUPPLIER');
          if (!msg.is_read && isMsgFromOther) threads[oid][supplierKey].unread++;
      });
      return threads;
  }

  static async archiveChat(orderId: string, supplierName: string): Promise<void> {
      const escapedName = supplierName.split('"').join('"');
      await supabase.from('chat_messages').update({ is_archived: true }).eq('order_id', orderId).or(`sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`);
  }

  static async getOrderStatus(orderId: string): Promise<{ status_admin: string, supplier_names: string[] }> {
      const { data, error } = await supabase
          .from('orders')
          .select('status_admin, offers (supplier_name)')
          .eq('id', orderId)
          .maybeSingle();
      
      if (error || !data) return { status_admin: '', supplier_names: [] };
      return { 
          status_admin: data.status_admin, 
          supplier_names: (data.offers as any[] || []).map(o => o.supplier_name) 
      };
  }

  static async getStatusCounts(): Promise<Record<string, number>> {
      const statuses = [
          { key: 'new', val: 'В обработке' }, { key: 'kp_sent', val: 'КП готово' }, 
          { key: 'ready_to_buy', val: 'КП отправлено,Готов купить' }, { key: 'supplier_confirmed', val: 'Подтверждение от поставщика' },
          { key: 'awaiting_payment', val: 'Ожидает оплаты' }, { key: 'in_transit', val: 'В пути' },
          { key: 'completed', val: 'Выполнен' }, { key: 'annulled', val: 'Аннулирован' }, { key: 'refused', val: 'Отказ' }
      ];
      const promises = statuses.map(s => {
          let query = supabase.from('orders').select('*', { count: 'exact', head: true });
          if (s.val.includes(',')) query = query.in('status_admin', s.val.split(',').map(v => v.trim()));
          else query = query.eq('status_admin', s.val);
          return query;
      });
      const results = await Promise.all(promises);
      const counts: Record<string, number> = {};
      results.forEach((res, idx) => { counts[statuses[idx].key] = res.count || 0; });
      return counts;
  }
  
  static async getSellerBrands(sellerName: string): Promise<string[]> {
      const { data, error } = await supabase.rpc('get_seller_brands', { p_seller_name: sellerName });
      if (error) throw error;
      return data?.map((d: any) => d.brand) || [];
  }

  static async searchBrands(query: string): Promise<string[]> {
      if (!query || query.length < 2) return [];
      const { data, error } = await supabase.from('brands').select('name').ilike('name', `%${query}%`).order('name').limit(20);
      if (error) throw error;
      return data?.map((b: any) => b.name) || [];
  }

  static async checkBrandExists(name: string): Promise<string | null> {
      if (!name) return null;
      const { data, error } = await supabase.from('brands').select('name').ilike('name', name).maybeSingle();
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
      if (search) query = query.ilike('name', `%${search}%`);
      const { data, error, count } = await query.order(sortField, { ascending: sortDirection === 'asc' }).range(from, to);
      if (error) throw error;
      return { data: data || [], count: count || 0 };
  }

  static async getSupplierUsedBrands(supplierName: string): Promise<string[]> {
      const { data, error } = await supabase.from('offers').select(`order_id, orders (order_items (brand))`).ilike('supplier_name', supplierName).limit(100);
      if (error || !data) return [];
      const brands: string[] = [];
      data.forEach(offer => { offer.orders?.order_items?.forEach((item: any) => { if (item.brand) brands.push(item.brand); }); });
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

  static async deleteAllOrders(): Promise<void> {
    const { error } = await supabase.rpc('reset_db');
    if (error) {
        await supabase.from('monthly_buyer_stats').delete().neq('kp_count', -1);
        await supabase.from('chat_messages').delete().neq('id', 0);
        await supabase.from('buyer_order_labels').delete().neq('id', 0);
        await supabase.from('offer_items').delete().neq('id', 0);
        await supabase.from('order_items').delete().neq('id', 0);
        await supabase.from('offers').delete().neq('id', 0);
        await supabase.from('orders').delete().neq('id', 0);
    }
  }

  static async approveOrderFast(orderId: string, winners: any[]): Promise<void> {
    const { error } = await supabase.rpc('approve_order_winners', { p_order_id: Number(orderId), p_winners: winners });
    if (error) throw error;
  }

  static async updateWorkflowStatus(orderId: string, status: string): Promise<void> {
    await supabase.from('orders').update({ status_client: status, status_admin: status, status_updated_at: new Date().toISOString() }).eq('id', orderId);
  }
}
