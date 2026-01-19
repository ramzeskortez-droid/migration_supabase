import { supabase } from '../../../lib/supabaseClient';

export const createOffer = async (orderId: string, sellerName: string, items: any[], sellerPhone?: string, userId?: string, supplierFiles?: any[], status: string = 'Активно'): Promise<void> => {
    const { data: existing } = await supabase.from('offers').select('id').eq('order_id', orderId).eq('supplier_name', sellerName).maybeSingle();
    if (existing) throw new Error('Вы уже отправили предложение по этому заказу.');

    const { data: offerData, error: offerError } = await supabase.from('offers').insert({ 
        order_id: orderId, 
        supplier_name: sellerName, 
        supplier_phone: sellerPhone, 
        created_by: userId,
        supplier_files: supplierFiles || [],
        status: status
    }).select().single();
    
    if (offerError) throw offerError;

    // Получаем настройки курсов для добавки к сроку
    const { data: rates } = await supabase.from('exchange_rates').select('delivery_weeks_add').order('date', { ascending: false }).limit(1).single();
    const weeksAdd = rates?.delivery_weeks_add || 0;

    const offerItemsToInsert = items.map(item => {
      const deliveryWeeks = item.deliveryWeeks || (item.delivery_days ? Math.ceil(item.delivery_days / 7) : 0);
      
      return {
        offer_id: offerData.id, 
        name: item.name, 
        quantity: item.offeredQuantity !== undefined ? item.offeredQuantity : (item.quantity || 1),
        price: item.sellerPrice !== undefined ? item.sellerPrice : (item.BuyerPrice || 0), 
        currency: item.sellerCurrency || item.BuyerCurrency || 'CNY',
        delivery_days: deliveryWeeks * 7,
        weight: item.weight !== undefined ? item.weight : 0, 
        photo_url: item.photoUrl || '', 
        item_files: item.itemFiles || [],
        comment: item.comment || '', 
        order_item_id: item.id,
        supplier_sku: item.supplierSku || '',
        client_delivery_weeks: deliveryWeeks > 0 ? (deliveryWeeks + weeksAdd) : null
      };
    });

    const { error: oiError } = await supabase.from('offer_items').insert(offerItemsToInsert);
    if (oiError) throw oiError;

    await supabase.from('orders').update({ status_supplier: 'Идут торги', status_updated_at: new Date().toISOString() }).eq('id', orderId);
};
