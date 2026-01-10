import { supabase } from '../../../lib/supabaseClient';
import { BuyerLabel } from '../../../types';

export const toggleOrderLabel = async (userToken: string, orderId: string, color: string): Promise<void> => {
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
};

export const getBuyerLabels = async (userToken: string): Promise<BuyerLabel[]> => {
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
};
