import { supabase } from '../../../lib/supabaseClient';
import { OrderItem, Order, RowType, Currency } from '../../../types';

export const getOrderDetails = async (orderId: string): Promise<{ items: OrderItem[], offers: Order[], orderFiles?: any[], refusalReason?: string }> => {
    const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_files, is_manual_processing, refusal_reason, order_items (*),
          offers (id, status, created_at, supplier_name, supplier_phone, supplier_files, created_by, locked_at, offer_items (*))
        `)
        .eq('id', orderId)
        .single();

    if (error) throw error;

    const sortedOrderItems = data.order_items.sort((a: any, b: any) => a.id - b.id);

    const items: OrderItem[] = sortedOrderItems.map((item: any) => ({
      id: item.id, name: item.name, quantity: item.quantity, comment: item.comment,
      category: item.category, opPhotoUrl: item.photo_url, adminPrice: item.admin_price,
      brand: item.brand, article: item.article, uom: item.uom,
      itemFiles: item.item_files || []
    }));

    const offers: Order[] = data.offers.map((offer: any) => ({
      id: String(offer.id), parentId: String(data.id), type: RowType.OFFER,
      status: offer.status as any, // Mapped status
      clientName: offer.supplier_name, clientPhone: offer.supplier_phone,
      supplier_files: offer.supplier_files,
      locked_at: offer.locked_at,
      ownerId: offer.created_by, // Mapped Supplier UUID
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

    return { items, offers, orderFiles: data.order_files, refusalReason: data.refusal_reason };
};

export const getOrderStatus = async (orderId: string): Promise<{ status_admin: string, supplier_names: string[] }> => {
    const { data, error } = await supabase
        .from('orders')
        .select('status_manager, offers (supplier_name)')
        .eq('id', orderId)
        .maybeSingle();
    
    if (error || !data) return { status_admin: '', supplier_names: [] };
    return { 
        status_admin: data.status_manager, 
        supplier_names: (data.offers as any[] || []).map(o => o.supplier_name) 
    };
};

export const getOrderItemsSimple = async (orderId: string): Promise<string[]> => {
    const { data } = await supabase.from('order_items').select('name').eq('order_id', orderId);
    return data?.map((i: any) => i.name) || [];
};

export const getOperatorStatusCounts = async (ownerId: string): Promise<Record<string, number>> => {
    // 1. Получаем сырые данные для подсчета на клиенте (или делаем сложные count query)
    // Чтобы не делать 5 запросов, сделаем один select статусов
    const { data } = await supabase
        .from('orders')
        .select('status_manager, status_client, is_manual_processing')
        .eq('owner_id', ownerId);
    
    const counts: Record<string, number> = {
        processing: 0,
        manual: 0,
        processed: 0,
        completed: 0,
        rejected: 0,
        archive: 0
    };

    data?.forEach((o: any) => {
        if (o.status_manager === 'Ручная обработка') {
            counts.manual++;
        } else if (o.status_manager === 'В обработке') {
            counts.processing++;
        } else if (['КП готово', 'КП отправлено'].includes(o.status_manager)) {
            counts.processed++;
        } else if (o.status_manager === 'Выполнен') {
            counts.completed++;
            counts.archive++;
        } else if (['Аннулирован', 'Отказ'].includes(o.status_manager)) {
            counts.rejected++;
            counts.archive++;
        }
    });

    return counts;
};

export const getStatusCounts = async (): Promise<Record<string, number>> => {
    const statuses = [
        { key: 'new', val: 'В обработке' }, { key: 'manual', val: 'Ручная обработка' }, { key: 'kp_sent', val: 'КП готово' }, 
        { key: 'ready_to_buy', val: 'КП отправлено,Готов купить' }, { key: 'supplier_confirmed', val: 'Подтверждение от поставщика' },
        { key: 'awaiting_payment', val: 'Ожидает оплаты' }, { key: 'in_transit', val: 'В пути' },
        { key: 'completed', val: 'Выполнен' }, { key: 'archive', val: 'Аннулирован,Отказ,Архив,Обработано вручную' }
    ];
    const promises = statuses.map(s => {
        let query = supabase.from('orders').select('*', { count: 'exact', head: true });
        if (s.val.includes(',')) query = query.in('status_manager', s.val.split(',').map(v => v.trim()));
        else query = query.eq('status_manager', s.val);
        return query;
    });
    const results = await Promise.all(promises);
    const counts: Record<string, number> = {};
    results.forEach((res, idx) => { counts[statuses[idx].key] = res.count || 0; });
    return counts;
};
