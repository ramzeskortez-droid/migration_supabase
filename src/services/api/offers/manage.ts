import { supabase } from '../../../lib/supabaseClient';
import { Currency } from '../../../types';

export const updateOfferItem = async (itemId: string, updates: { admin_comment?: string, admin_price?: number, currency?: Currency, delivery_days?: number, supplier_sku?: string }): Promise<void> => {
  const { error } = await supabase.from('offer_items').update(updates).eq('id', itemId);
  if (error) throw error;
};

export const generateTestOffers = async (orderId: string): Promise<void> => {
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
};
