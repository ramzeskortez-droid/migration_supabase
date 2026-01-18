import { supabase } from '../../../lib/supabaseClient';

export const getBuyerQuickBrands = async (supplierName: string): Promise<string[]> => {
    const { data: myOff } = await supabase.from('offers').select('order_id').eq('supplier_name', supplierName);
    const excludedIds = myOff?.map(o => o.order_id) || [];

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const isoDate = threeDaysAgo.toISOString();

    let query = supabase.from('order_items').select('brand, orders!inner(id, status_manager, is_archived, created_at)');
    query = query.eq('orders.status_manager', 'В обработке')
                 .is('orders.is_archived', false)
                 .gte('orders.created_at', isoDate) // Filter for last 3 days
                 .not('brand', 'is', null)
                 .neq('brand', '');
    
    if (excludedIds.length > 0) query = query.not('orders.id', 'in', `(${excludedIds.join(',')})`);

    const { data } = await query;
    if (!data) return [];

    const brandCounts: Record<string, number> = {};
    data.forEach((i: any) => {
        if (i.brand) brandCounts[i.brand] = (brandCounts[i.brand] || 0) + 1;
    });

    return Object.entries(brandCounts)
        .sort((a, b) => b[1] - a[1]) 
        .slice(0, 7) 
        .map(entry => entry[0]);
};
