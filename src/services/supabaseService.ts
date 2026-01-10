import { supabase } from '../lib/supabaseClient';
import { Order, OrderStatus, RowType, OrderItem, WorkflowStatus, Currency, RankType, AppUser, ExchangeRates, BuyerLabel, Brand } from '../types';

import * as ratesApi from './api/finance/rates';
import * as settingsApi from './api/finance/settings';
import * as uploadApi from './api/storage/upload';
import * as brandsReadApi from './api/brands/read';
import * as brandsWriteApi from './api/brands/write';
import * as loginApi from './api/auth/login';
import * as registrationApi from './api/auth/registration';
import * as usersApi from './api/auth/users';
import * as buyerDashboardApi from './api/buyer/dashboard';
import * as buyerLabelsApi from './api/buyer/labels';
import * as buyerUtilsApi from './api/buyer/utils';

export class SupabaseService {
  
  // --- AUTH & ROLES ---

  static loginWithToken = loginApi.loginWithToken;
  static generateInviteCode = registrationApi.generateInviteCode;
  static getActiveInvites = registrationApi.getActiveInvites;
  static registerUser = registrationApi.registerUser;
  static getAppUsers = usersApi.getAppUsers;
  static updateUserStatus = usersApi.updateUserStatus;

  // --- FINANCE (Exchange Rates) ---

  static getExchangeRates = ratesApi.getExchangeRates;
  static upsertExchangeRates = ratesApi.upsertExchangeRates;

  static async updateOrderJson(orderId: string, newItems: any[]): Promise<void> {
    const itemsToInsert = newItems.map(item => ({
      order_id: Number(orderId), name: item.AdminName || item.name, quantity: item.AdminQuantity || item.quantity,
      comment: item.comment, category: item.category, photo_url: item.photo_url,
      brand: item.brand, article: item.article, uom: item.uom,
      item_files: item.itemFiles || []
    }));
    await supabase.from('order_items').delete().eq('order_id', orderId);
    await supabase.from('order_items').insert(itemsToInsert);
  }

  static async updateOrderMetadata(orderId: string, metadata: { client_name?: string, client_phone?: string, client_email?: string, location?: string }): Promise<void> {
      const { error } = await supabase.from('orders').update(metadata).eq('id', orderId);
      if (error) throw error;
  }

  static async updateOrderItemPrice(itemId: string, updates: { adminPrice?: number, isManualPrice?: boolean }): Promise<void> {
    const { error } = await supabase.from('order_items').update({
        admin_price: updates.adminPrice,
        is_manual_price: updates.isManualPrice
    }).eq('id', itemId);
    if (error) throw error;
  }

  // --- SYSTEM SETTINGS ---

  static getSystemSettings = settingsApi.getSystemSettings;
  static updateSystemSettings = settingsApi.updateSystemSettings;

  static async updateOfferItem(itemId: string, updates: { admin_comment?: string, admin_price?: number, currency?: Currency, delivery_days?: number, supplier_sku?: string }): Promise<void> {
    const { error } = await supabase.from('offer_items').update(updates).eq('id', itemId);
    if (error) throw error;
  }

  // --- FILE STORAGE ---

  static uploadFile = uploadApi.uploadFile;

  // --- BUYER TOOLS (Labels & Filters) ---

  static toggleOrderLabel = buyerLabelsApi.toggleOrderLabel;
  static getBuyerLabels = buyerLabelsApi.getBuyerLabels;
  static getBuyerDashboardStats = buyerDashboardApi.getBuyerDashboardStats;
  static getBuyerTabCounts = buyerDashboardApi.getBuyerTabCounts;
  static getBuyerQuickBrands = buyerUtilsApi.getBuyerQuickBrands;

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
    buyerTab?: 'new' | 'hot' | 'history' | 'won' | 'lost' | 'cancelled'
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
        order_files,
        order_items (id, name, comment, quantity, brand, article, uom, photo_url, admin_price),
        offers (id, supplier_name, supplier_files, offer_items (is_winner, quantity, name, price, currency, admin_price, delivery_days, photo_url, item_files, order_item_id, supplier_sku, admin_comment))
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
    } else if (onlyWithMyOffersName) {
        if (buyerTab === 'history') {
            // В торгах (активные, статус В обработке)
            const { data: myOff } = await supabase.from('offers').select('order_id').eq('supplier_name', onlyWithMyOffersName);
            const ids = myOff?.map(o => o.order_id) || [];
            query = query.in('id', ids.length > 0 ? ids : [0]);
            query = query.eq('status_admin', 'В обработке');
        } 
        else if (buyerTab === 'won') {
            const { data: myWins } = await supabase.from('offer_items')
                .select('offer_id, offers!inner(order_id, supplier_name)')
                .eq('is_winner', true)
                .eq('offers.supplier_name', onlyWithMyOffersName);
            const ids = myWins?.map((w: any) => w.offers.order_id) || [];
            query = query.in('id', ids.length > 0 ? ids : [0]);
        }
        else if (buyerTab === 'lost') {
            const { data: myOff } = await supabase.from('offers').select('order_id').eq('supplier_name', onlyWithMyOffersName);
            const allMyIds = myOff?.map(o => o.order_id) || [];
            
            const { data: myWins } = await supabase.from('offer_items')
                .select('offer_id, offers!inner(order_id, supplier_name)')
                .eq('is_winner', true)
                .eq('offers.supplier_name', onlyWithMyOffersName);
            const winIds = myWins?.map((w: any) => w.offers.order_id) || [];
            
            const lostIds = allMyIds.filter(id => !winIds.includes(id));
            
            query = query.in('id', lostIds.length > 0 ? lostIds : [0]);
            query = query.neq('status_admin', 'В обработке');
            query = query.not('status_admin', 'in', '("Аннулирован","Отказ")');
        }
        else if (buyerTab === 'cancelled') {
            const { data: myOff } = await supabase.from('offers').select('order_id').eq('supplier_name', onlyWithMyOffersName);
            const ids = myOff?.map(o => o.order_id) || [];
            query = query.in('id', ids.length > 0 ? ids : [0]);
            query = query.in('status_admin', ['Аннулирован', 'Отказ']);
        }
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
        // Упрощенная пагинация по ID. Для полной поддержки пагинации по не-уникальным полям 
        // (дата, дедлайн) потребовался бы составной курсор.
        if (sortDirection === 'desc') query = query.lt('id', cursor);
        else query = query.gt('id', cursor);
    }

    // Маппинг ключей сортировки на колонки БД
    const columnMap: Record<string, string> = {
        'id': 'id',
        'date': 'created_at',
        'deadline': 'deadline',
        'status': 'status_admin',
        'statusUpdatedAt': 'status_updated_at',
        'client_name': 'client_name'
    };
    const sortColumn = columnMap[sortBy] || 'id';

    query = query.order(sortColumn, { ascending: sortDirection === 'asc', nullsFirst: false });
    if (sortColumn !== 'id') {
        query = query.order('id', { ascending: sortDirection === 'asc' });
    }
    
    const { data, error } = await query.limit(limit);
    
    if (error) {
        console.error('getOrders ERROR:', error);
        throw error;
    }

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
            order_files: order.order_files,
            buyerLabels: labelsMap[order.id] ? [labelsMap[order.id]] : [],
            items: (order.order_items as any[])?.sort((a, b) => a.id - b.id).map((i: any) => ({
                id: i.id, name: i.name, quantity: i.quantity, comment: i.comment, brand: i.brand, article: i.article, uom: i.uom, opPhotoUrl: i.photo_url, adminPrice: i.admin_price
            })) || [],
            offers: order.offers?.map((o: any) => ({
                id: o.id, clientName: o.supplier_name, supplier_files: o.supplier_files, items: o.offer_items?.sort((a: any, b: any) => a.id - b.id).map((oi: any) => ({
                    id: oi.id, order_item_id: oi.order_item_id, name: oi.name, is_winner: oi.is_winner, quantity: oi.quantity, offeredQuantity: oi.quantity,
                    sellerPrice: oi.price, sellerCurrency: oi.currency,
                    adminPrice: oi.admin_price,
                    deliveryWeeks: oi.delivery_days ? Math.ceil(oi.delivery_days / 7) : 0,
                    photoUrl: oi.photo_url, itemFiles: oi.item_files, supplierSku: oi.supplier_sku, adminComment: oi.admin_comment
                })) || []
            })) || [],
            isProcessed: order.status_admin !== 'В обработке' && order.status_admin !== 'ОТКРЫТ'
        } as unknown as Order;
    });
    
    const nextCursor = data.length === limit ? data[data.length - 1].id : undefined;
    return { data: mappedData, nextCursor };
  }

  static async getOrderDetails(orderId: string): Promise<{ items: OrderItem[], offers: Order[], orderFiles?: any[] }> {
      const { data, error } = await supabase
          .from('orders')
          .select(`
            id, order_files, order_items (*),
            offers (id, created_at, supplier_name, supplier_phone, supplier_files, offer_items (*))
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
        supplier_files: offer.supplier_files,
        createdAt: new Date(offer.created_at).toLocaleString('ru-RU'),
        items: offer.offer_items.sort((a: any, b: any) => a.id - b.id).map((oi: any) => ({
          id: oi.id, order_item_id: oi.order_item_id, name: oi.name, quantity: oi.quantity,
          offeredQuantity: oi.quantity, sellerPrice: oi.price, sellerCurrency: oi.currency as Currency,
          adminPrice: oi.admin_price, rank: oi.is_winner ? 'ЛИДЕР' : 'РЕЗЕРВ',
          deliveryWeeks: oi.delivery_days ? Math.ceil(oi.delivery_days / 7) : 0,
          weight: oi.weight, photoUrl: oi.photo_url, itemFiles: oi.item_files, adminComment: oi.admin_comment, supplierSku: oi.supplier_sku,
          comment: oi.comment, totalCost: oi.total_cost, goodsCost: oi.goods_cost
        }))
      } as any));

      return { items, offers, orderFiles: data.order_files };
  }

  static async generateTestOffers(orderId: string): Promise<void> {
      const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId);
      if (!items || items.length === 0) return;

      // Find Demo Buyers
      const { data: demoBuyers } = await supabase.from('app_users').select('*').in('token', ['buy1', 'buy2']);
      const buyersToUse = demoBuyers && demoBuyers.length > 0 ? demoBuyers : [{ name: 'Demo 1', phone: '+79990000001', id: undefined }, { name: 'Demo 2', phone: '+79990000002', id: undefined }];

      for (const buyer of buyersToUse) {
          const { data: offer, error: offerError } = await supabase.from('offers').insert({
              order_id: Number(orderId),
              supplier_name: buyer.name,
              supplier_phone: buyer.phone,
              created_by: buyer.id
          }).select().single();
          
          if (offerError) continue;

          const offerItems = items.map((item: any) => ({
              offer_id: offer.id,
              order_item_id: item.id,
              name: item.name,
              quantity: item.quantity,
              price: Math.floor(Math.random() * 10000) + 1000,
              currency: Math.random() > 0.5 ? 'CNY' : 'RUB',
              delivery_days: (Math.floor(Math.random() * 4) + 2) * 7,
              weight: Math.floor(Math.random() * 5) + 1
          }));

          await supabase.from('offer_items').insert(offerItems);
      }

      await supabase.from('orders').update({ status_supplier: 'Идут торги' }).eq('id', orderId);
  }

  static async createOrder(items: any[], clientName: string, clientPhone?: string, ownerId?: string, deadline?: string, clientEmail?: string, location?: string, orderFiles?: any[]): Promise<string> {
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        client_name: clientName, client_phone: clientPhone, client_email: clientEmail,
        location: location || 'РФ', owner_id: ownerId, deadline: deadline || null,
        order_files: orderFiles || []
      })
      .select().single();

    if (orderError) throw orderError;

    const itemsToInsert = items.map(item => ({
      order_id: orderData.id, name: item.name, quantity: item.quantity || 1,
      comment: item.comment, category: item.category, photo_url: item.photoUrl || null,
      brand: item.brand || null, article: item.article || null, uom: item.uom || 'шт',
      item_files: item.itemFiles || []
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
    if (itemsError) throw itemsError;
    return String(orderData.id);
  }

  static async createOffer(orderId: string, sellerName: string, items: any[], sellerPhone?: string, userId?: string, supplierFiles?: any[]): Promise<void> {
    const { data: existing } = await supabase.from('offers').select('id').eq('order_id', orderId).eq('supplier_name', sellerName).maybeSingle();
    if (existing) throw new Error('Вы уже отправили предложение по этому заказу.');

    const { data: offerData, error: offerError } = await supabase.from('offers').insert({ 
        order_id: orderId, 
        supplier_name: sellerName, 
        supplier_phone: sellerPhone, 
        created_by: userId,
        supplier_files: supplierFiles || [] 
    }).select().single();
    
    if (offerError) throw offerError;

    const offerItemsToInsert = items.map(item => ({
      offer_id: offerData.id, name: item.name, quantity: item.offeredQuantity || item.quantity || 1,
      price: item.sellerPrice || item.BuyerPrice || 0, currency: item.sellerCurrency || item.BuyerCurrency || 'RUB',
      delivery_days: item.deliveryWeeks ? item.deliveryWeeks * 7 : (item.deliveryDays || 0),
      weight: item.weight || 0, photo_url: item.photoUrl || '', 
      item_files: item.itemFiles || [], // New
      comment: item.comment || '', order_item_id: item.id,
      supplier_sku: item.supplierSku || ''
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

      // Unarchive thread
      const supplierName = payload.sender_role === 'SUPPLIER' ? payload.sender_name : payload.recipient_name;
      if (supplierName && supplierName !== 'ADMIN') {
          const escapedName = supplierName.split('"').join('"');
          await supabase.from('chat_messages')
            .update({ is_archived: false })
            .eq('order_id', payload.order_id)
            .or(`sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`);
      }

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
      if (!isArchived) supabase.rpc('auto_archive_chats').then(() => {});
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
          const isMsgFromOther = filterBySupplierName 
            ? ['ADMIN', 'MANAGER', 'OPERATOR'].includes(msg.sender_role) 
            : (msg.sender_role === 'SUPPLIER');
            
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
  
  static getSellerBrands = brandsReadApi.getSellerBrands;
  static searchBrands = brandsReadApi.searchBrands;
  static checkBrandExists = brandsReadApi.checkBrandExists;
  static getBrandsList = brandsReadApi.getBrandsList;
  static getBrandsFull = brandsReadApi.getBrandsFull;
  static getSupplierUsedBrands = brandsReadApi.getSupplierUsedBrands;
  static addBrand = brandsWriteApi.addBrand;
  static updateBrand = brandsWriteApi.updateBrand;
  static deleteBrand = brandsWriteApi.deleteBrand;

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

  static async refuseOrder(orderId: string, reason: string, userRole: 'ADMIN' | 'OPERATOR'): Promise<void> {
      const status = userRole === 'ADMIN' ? 'Аннулирован' : 'Отказ';
      // В реальности, если отказывается оператор, статус 'Отказ', если менеджер - 'Аннулирован'.
      // Но в ТЗ: "Менеджер -> Аннулирован".
      // Причина отказа может храниться в поле refusal_reason (если оно есть) или просто в логах/комментарии.
      // Проверим types.ts: есть refusalReason.
      
      const { error } = await supabase.from('orders').update({
          status_admin: status,
          status_client: status,
          status_updated_at: new Date().toISOString(),
          refusal_reason: reason
      }).eq('id', orderId);

      if (error) throw error;
  }

  static async seedOrders(count: number, onProgress?: (current: number) => void, ownerToken: string = 'op1'): Promise<void> {
      const brands = await this.getBrandsList();
      const safeBrands = brands.length > 0 ? brands : ['Toyota', 'BMW', 'Mercedes', 'Audi', 'Lexus'];
      const parts = ['Фильтр масляный', 'Колодки тормозные', 'Свеча зажигания', 'Амортизатор', 'Рычаг подвески', 'Подшипник ступицы', 'Фара правая', 'Бампер передний'];
      const cities = ['Москва', 'Санкт-Петербург', 'Екатеринбург', 'Новосибирск', 'Казань', 'Нижний Новгород', 'Челябинск'];
      const names = ['Алексей', 'Дмитрий', 'Сергей', 'Андрей', 'Максим', 'Евгений', 'Владимир', 'Иван'];
      const subjects = ['Запрос запчастей', 'Срочно детали', 'Заявка на ТО', 'В работу', 'Проценка'];

      let ownerId: string | undefined;
      const { data: user } = await supabase.from('app_users').select('id').eq('token', ownerToken).maybeSingle();
      if (user) ownerId = user.id;
      else {
          const { data: anyOp } = await supabase.from('app_users').select('id').eq('role', 'operator').limit(1).maybeSingle();
          ownerId = anyOp?.id;
      }
      if (!ownerId) return;

      const batchSize = 50;
      for (let i = 0; i < count; i += batchSize) {
          const batchOrders = [];
          const currentBatchSize = Math.min(batchSize, count - i);
          for (let j = 0; j < currentBatchSize; j++) {
              const date = new Date();
              date.setHours(date.getHours() - Math.floor(Math.random() * 72));
              
              const deadline = new Date();
              deadline.setDate(deadline.getDate() + 7); // Срок +7 дней

              batchOrders.push({
                  client_name: names[Math.floor(Math.random() * names.length)],
                  client_phone: `+7 (9${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(10 + Math.random() * 90)}-${Math.floor(10 + Math.random() * 90)}`,
                  client_email: `client${Math.floor(Math.random() * 10000)}@mail.ru`,
                  location: cities[Math.floor(Math.random() * cities.length)],
                  owner_id: ownerId,
                  status_admin: 'В обработке',
                  status_client: 'В обработке',
                  created_at: date.toISOString(),
                  status_updated_at: date.toISOString(),
                  deadline: deadline.toISOString()
              });
          }
          const { data: insertedOrders, error } = await supabase.from('orders').insert(batchOrders).select('id');
          if (error) continue;

          const batchItems = [];
          insertedOrders.forEach(ord => {
              const numItems = Math.floor(Math.random() * 3) + 1;
              for (let k = 0; k < numItems; k++) {
                  const randomArticle = Math.random().toString(36).substring(2, 10).toUpperCase();
                  batchItems.push({
                      order_id: ord.id,
                      name: parts[Math.floor(Math.random() * parts.length)],
                      quantity: Math.floor(Math.random() * 4) + 1,
                      brand: safeBrands[Math.floor(Math.random() * safeBrands.length)],
                      article: randomArticle,
                      comment: k === 0 ? `[Тема: ${subjects[Math.floor(Math.random() * subjects.length)]}]` : '',
                      uom: 'шт', category: 'Оригинал'
                  });
              }
          });
          if (batchItems.length > 0) await supabase.from('order_items').insert(batchItems);
          if (onProgress) onProgress(i + currentBatchSize);
      }
  }
}
