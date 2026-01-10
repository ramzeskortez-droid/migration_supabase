import { supabase } from '../../../lib/supabaseClient';

export const getBuyerDashboardStats = async (userId: string): Promise<any> => {
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
};

export const getBuyerTabCounts = async (supplierName: string): Promise<{ new: number, hot: number, history: number, won: number, lost: number, cancelled: number }> => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const isoDate = threeDaysAgo.toISOString();

    const { data: myOff } = await supabase.from('offers').select('order_id').eq('supplier_name', supplierName);
    const myOfferIds = myOff?.map(o => o.order_id) || [];

    const getBaseQuery = () => {
        let q = supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status_admin', 'В обработке');
        if (myOfferIds.length > 0) {
            q = q.not('id', 'in', `(${myOfferIds.join(',')})`);
        }
        return q;
    };

    const { data: myWins } = await supabase.from('offer_items')
          .select('offer_id, offers!inner(order_id, supplier_name)')
          .eq('is_winner', true)
          .eq('offers.supplier_name', supplierName);
    const winIds = Array.from(new Set(myWins?.map((w: any) => w.offers.order_id) || []));
    const lostIds = myOfferIds.filter(id => !winIds.includes(id));

    const [resNew, resHot, resHistory, resWon, resLost, resCancelled] = await Promise.all([
        getBaseQuery().gte('created_at', isoDate),
        getBaseQuery().lt('created_at', isoDate),
        supabase.from('orders').select('id', { count: 'exact', head: true }).in('id', myOfferIds.length > 0 ? myOfferIds : [0]).eq('status_admin', 'В обработке'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).in('id', winIds.length > 0 ? winIds : [0]),
        supabase.from('orders').select('id', { count: 'exact', head: true }).in('id', lostIds.length > 0 ? lostIds : [0]).neq('status_admin', 'В обработке').not('status_admin', 'in', '("Аннулирован","Отказ")'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).in('id', myOfferIds.length > 0 ? myOfferIds : [0]).in('status_admin', ['Аннулирован', 'Отказ'])
    ]);

    return {
        new: resNew.count || 0,
        hot: resHot.count || 0,
        history: resHistory.count || 0,
        won: resWon.count || 0,
        lost: resLost.count || 0,
        cancelled: resCancelled.count || 0
    };
};
