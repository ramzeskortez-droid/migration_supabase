import { supabase } from '../../../lib/supabaseClient';
import { Order, OrderStatus, RowType, WorkflowStatus } from '../../../types';

export const getOrders = async (
    cursor: number = 0, // Now represents PAGE INDEX (0, 1, 2...)
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
    buyerTab?: 'new' | 'hot' | 'history' | 'won' | 'lost' | 'cancelled',
    operatorTab?: 'processing' | 'trading' 
): Promise<{ data: Order[], nextCursor?: number }> => {
    
    // ... (rest of filtering logic remains same) ...
    let matchingIds: any[] = [];
    const q = searchQuery.trim();

    if (q) {
        const { data: items } = await supabase
            .from('order_items')
            .select('order_id')
            .or(`name.ilike.%${q}%,brand.ilike.%${q}%,article.ilike.%${q}%,comment.ilike.%${q}%`);
        
        if (items && items.length > 0) {
            matchingIds = Array.from(new Set(items.map(i => i.order_id)));
        }
    }

    let excludedIds: any[] = [];
    if (excludeOffersFrom) {
        const { data: off } = await supabase.from('offers').select('order_id').eq('supplier_name', excludeOffersFrom);
        excludedIds = off?.map(o => o.order_id) || [];
    }

    let query = supabase.from('orders').select(`
        id, created_at, client_name, client_phone, client_email,
        status_manager, status_client, status_supplier,
        visible_to_client, location, status_updated_at,
        owner_id,
        deadline,
        is_manual_processing,
        refusal_reason,
        order_files,
        order_items (id, name, comment, quantity, brand, article, uom, photo_url, admin_price, item_files),
        offers${operatorTab === 'trading' ? '!inner' : ''} (id, status, supplier_name, supplier_files, locked_at, created_by, offer_items (is_winner, quantity, name, price, currency, admin_price, delivery_days, photo_url, item_files, order_item_id, supplier_sku, admin_comment, client_delivery_weeks, weight))
    `);

    if (buyerTab === 'new' || buyerTab === 'hot') {
        query = query.eq('status_manager', 'В обработке');
        if (excludedIds.length > 0) query = query.not('id', 'in', `(${excludedIds.join(',')})`);
        
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const isoDate = threeDaysAgo.toISOString();

        if (buyerTab === 'new') query = query.gte('created_at', isoDate);
        else query = query.lt('created_at', isoDate);
    } else if (onlyWithMyOffersName) {
        if (buyerTab === 'history') {
            const { data: myOff } = await supabase.from('offers')
                .select('order_id')
                .eq('supplier_name', onlyWithMyOffersName)
                .neq('status', 'Отказ');
            const ids = myOff?.map(o => o.order_id) || [];
            query = query.in('id', ids.length > 0 ? ids : [0]);
            query = query.eq('status_manager', 'В обработке');
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
            query = query.neq('status_manager', 'В обработке');
            query = query.not('status_manager', 'in', '("Аннулирован","Отказ")');
        }
        else if (buyerTab === 'cancelled') {
            const { data: myRefusals } = await supabase.from('offers')
                .select('order_id')
                .eq('supplier_name', onlyWithMyOffersName)
                .eq('status', 'Отказ');
            const refusalIds = myRefusals?.map(o => o.order_id) || [];

            const { data: myParticipation } = await supabase.from('offers').select('order_id').eq('supplier_name', onlyWithMyOffersName);
            const partIds = myParticipation?.map(o => o.order_id) || [];
            
            if (refusalIds.length > 0) {
                 query = query.or(`id.in.(${refusalIds.join(',')}),and(id.in.(${partIds.length > 0 ? partIds.join(',') : 0}),status_manager.in.("Аннулирован","Отказ"))`);
            } else {
                 query = query.in('id', partIds.length > 0 ? partIds : [0]);
                 query = query.in('status_manager', ['Аннулирован', 'Отказ']);
            }
        }
        else if (buyerTab === 'archive') {
            const { data: myOffers } = await supabase.from('offers')
                .select('order_id, status')
                .eq('supplier_name', onlyWithMyOffersName);
            const myRefusals = myOffers?.filter(o => o.status === 'Отказ').map(o => o.order_id) || [];
            const myParticipation = myOffers?.map(o => o.order_id) || [];
            const { data: globalCancelled } = await supabase.from('orders')
                .select('id')
                .in('id', myParticipation.length > 0 ? myParticipation : [0])
                .in('status_manager', ['Аннулирован', 'Отказ']);
            
            const globalCancelledIds = globalCancelled?.map(o => o.id) || [];
            const finalIds = Array.from(new Set([...myRefusals, ...globalCancelledIds]));
            query = query.in('id', finalIds.length > 0 ? finalIds : [0]);
        }
    }

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
            query = query.in('status_manager', statusFilter.split(',').map(s => s.trim()));
        } else {
            query = query.eq('status_manager', statusFilter);
        }
    }

    if (q) {
        let orFilters = [
            `client_name.ilike.%${q}%`,
            `client_email.ilike.%${q}%`
        ];

        if (!isNaN(Number(q))) {
            orFilters.push(`id.eq.${q}`);
            orFilters.push(`client_phone.ilike.%${q}%`);
        } else {
            orFilters.push(`client_phone.ilike.%${q}%`);
        }

        if (matchingIds.length > 0) {
            orFilters.push(`id.in.(${matchingIds.join(',')})`);
        }

        query = query.or(orFilters.join(','));
    }

    // --- Pagination using Range (Offset) ---
    const from = cursor * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // --- Sorting ---
    const columnMap: Record<string, string> = {
        'id': 'id',
        'date': 'created_at',
        'deadline': 'deadline',
        'status': 'status_manager',
        'statusUpdatedAt': 'status_updated_at',
        'client_name': 'client_name'
    };
    const sortColumn = columnMap[sortBy] || 'id';

    query = query.order(sortColumn, { ascending: sortDirection === 'asc', nullsFirst: false });
    if (sortColumn !== 'id') {
        query = query.order('id', { ascending: sortDirection === 'asc' });
    }
    
    const { data, error } = await query;
    if (error) throw error;

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
        
        const hasOffers = order.offers && order.offers.length > 0;
        const isTrading = hasOffers && order.status_manager === 'В обработке';
        const isHot = !ownerToken && order.status_manager === 'В обработке' && (!order.offers || order.offers.length === 0) && orderDate < threeDaysAgo;
        
        let displayStatus = order.status_manager;
        if (ownerToken) {
             if (isTrading) displayStatus = 'Идут торги';
             else if (isHot) displayStatus = 'ГОРИТ'; 
        } else {
             if (isHot) displayStatus = 'ГОРИТ';
        }

        return {
            id: String(order.id),
            type: RowType.ORDER,
            clientName: order.client_name,
            clientPhone: order.client_phone,
            clientEmail: order.client_email,
            status: order.status_manager === 'ЗАКРЫТ' ? OrderStatus.CLOSED : OrderStatus.OPEN,
            statusManager: displayStatus,
            statusClient: order.status_client,
            statusSeller: order.status_supplier,
            workflowStatus: order.status_client as WorkflowStatus,
            createdAt: new Date(order.created_at).toLocaleString('ru-RU'),
            statusUpdatedAt: order.status_updated_at ? new Date(order.status_updated_at).toLocaleString('ru-RU') : undefined,
            location: order.location,
            visibleToClient: order.visible_to_client ? 'Y' : 'N',
            ownerId: order.owner_id,
            deadline: order.deadline ? new Date(order.deadline).toLocaleDateString('ru-RU') : undefined,
            isManualProcessing: order.is_manual_processing,
            refusalReason: order.refusal_reason,
            order_files: order.order_files,
            buyerLabels: labelsMap[order.id] ? [labelsMap[order.id]] : [],
            items: (order.order_items as any[])?.sort((a, b) => a.id - b.id).map((i: any) => ({
                id: i.id, name: i.name, quantity: i.quantity, comment: i.comment, brand: i.brand, article: i.article, uom: i.uom, opPhotoUrl: i.photo_url, adminPrice: i.admin_price,
                itemFiles: i.item_files || []
            })) || [],
            offers: order.offers?.map((o: any) => ({
                id: o.id, status: o.status, clientName: o.supplier_name, supplier_files: o.supplier_files, locked_at: o.locked_at, ownerId: o.created_by, items: o.offer_items?.sort((a: any, b: any) => a.id - b.id).map((oi: any) => ({
                    id: oi.id, order_item_id: oi.order_item_id, name: oi.name, is_winner: oi.is_winner, quantity: oi.quantity, offeredQuantity: oi.quantity,
                    sellerPrice: oi.price, sellerCurrency: oi.currency,
                    adminPrice: oi.admin_price,
                    weight: oi.weight,
                    deliveryWeeks: oi.delivery_days ? Math.ceil(oi.delivery_days / 7) : 0,
                    clientDeliveryWeeks: oi.client_delivery_weeks,
                    photoUrl: oi.photo_url, itemFiles: oi.item_files, supplierSku: oi.supplier_sku, adminComment: oi.admin_comment
                })) || []
            })) || [],
            isProcessed: order.status_manager !== 'В обработке' && order.status_manager !== 'ОТКРЫТ'
        } as unknown as Order;
    })
    .filter(o => {
        if (operatorTab === 'processing') return o.statusManager !== 'Идут торги';
        return true;
    });
    
    // Page Index + 1 if we have full page, otherwise undefined (end)
    const nextCursor = data.length === limit ? cursor + 1 : undefined;
    return { data: mappedData, nextCursor };
};