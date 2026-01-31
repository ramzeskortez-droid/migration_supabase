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

export const getBuyerTabCounts = async (supplierName: string, buyerId?: string): Promise<{ new: number, hot: number, history: number, won: number, lost: number, cancelled: number, archive: number }> => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const isoDate = threeDaysAgo.toISOString();

    const { data: myOffers } = await supabase.from('offers').select('order_id, status').eq('supplier_name', supplierName);
    const myOfferIds = myOffers?.map(o => o.order_id) || [];
    
    // Личные отказы
    const myRefusedIds = myOffers?.filter(o => o.status === 'Отказ').map(o => o.order_id) || [];

    const getBaseQuery = () => {
        let q = supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status_manager', 'В обработке');
        if (myOfferIds.length > 0) {
            q = q.not('id', 'in', `(${myOfferIds.join(',')})`);
        }
        // Фильтр приватности: (assigned IS NULL) OR (assigned contains buyerId)
        if (buyerId) {
             q = q.or(`assigned_buyer_ids.is.null,assigned_buyer_ids.cs.{${buyerId}}`);
        } else {
             q = q.is('assigned_buyer_ids', null);
        }
        return q;
    };

    const { data: myWins } = await supabase.from('offer_items')
          .select('offer_id, offers!inner(order_id, supplier_name)')
          .eq('is_winner', true)
          .eq('offers.supplier_name', supplierName);
    const winIds = Array.from(new Set(myWins?.map((w: any) => w.offers.order_id) || []));
    const lostIds = myOfferIds.filter(id => !winIds.includes(id));

    // ID глобально отмененных заказов, где я участвовал
    const { count: globalCancelledCount } = await supabase.from('orders')
        .select('id', { count: 'exact', head: true })
        .in('id', myOfferIds.length > 0 ? myOfferIds : [0])
        .in('status_manager', ['Аннулирован', 'Отказ']);

    // Для архива берем уникальные ID: (личные отказы) + (глобальные отмены)
    // Но так как мы не можем сделать SELECT count(DISTINCT id) из двух списков одним запросом без сложного SQL,
    // а нам нужно только число...
    // Если заказ глобально отменен И я от него отказался — он считается 1 раз.
    // Проще загрузить ID глобальных отмен и объединить в JS.
    
    const { data: globalCancelled } = await supabase.from('orders')
        .select('id')
        .in('id', myOfferIds.length > 0 ? myOfferIds : [0])
        .in('status_manager', ['Аннулирован', 'Отказ']);
    
    const globalCancelledIds = globalCancelled?.map(o => o.id) || [];
    const archiveCount = new Set([...myRefusedIds, ...globalCancelledIds]).size;

    const [resNew, resHot, resHistory, resWon, resLost] = await Promise.all([
        getBaseQuery().gte('created_at', isoDate),
        getBaseQuery().lt('created_at', isoDate),
        supabase.from('orders').select('id', { count: 'exact', head: true }).in('id', myOfferIds.length > 0 ? myOfferIds : [0]).eq('status_manager', 'В обработке'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).in('id', winIds.length > 0 ? winIds : [0]),
        supabase.from('orders').select('id', { count: 'exact', head: true }).in('id', lostIds.length > 0 ? lostIds : [0]).neq('status_manager', 'В обработке').not('status_manager', 'in', '("Аннулирован","Отказ")')
    ]);

    return {
        new: resNew.count || 0,
        hot: resHot.count || 0,
        history: resHistory.count || 0,
        won: resWon.count || 0,
        lost: resLost.count || 0,
        cancelled: 0, 
        archive: archiveCount
    };
};
