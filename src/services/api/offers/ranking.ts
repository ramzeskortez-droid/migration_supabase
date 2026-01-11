import { supabase } from '../../../lib/supabaseClient';
import { Currency } from '../../../types';

export const updateRank = async (offerItemId: string, orderItemId: string, offerId: string, adminPrice?: number, adminCurrency?: Currency, actionType?: 'RESET', adminComment?: string, deliveryRate?: number, adminPriceRub?: number, clientDeliveryWeeks?: number): Promise<void> => {
  const { data: offer } = await supabase.from('offers').select('order_id').eq('id', offerId).single();
  if (!offer) return;
  const finalPrice = adminPriceRub ?? adminPrice;

  if (actionType === 'RESET') {
    await supabase.from('offer_items').update({ is_winner: false, admin_price: null, client_delivery_weeks: null }).eq('id', offerItemId); 
    await supabase.from('order_items').update({ admin_price: null }).eq('id', orderItemId);
  } else {
    await supabase.from('offer_items').update({ 
        is_winner: true, 
        admin_price: finalPrice, 
        delivery_rate: deliveryRate || 0, 
        admin_comment: adminComment || '',
        client_delivery_weeks: clientDeliveryWeeks 
    }).eq('id', offerItemId);
    await supabase.from('order_items').update({ admin_price: finalPrice }).eq('id', orderItemId);
  }
};
