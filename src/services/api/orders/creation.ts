import { supabase } from '../../../lib/supabaseClient';

export const createOrder = async (items: any[], clientName: string, clientPhone?: string, ownerId?: string, deadline?: string, clientEmail?: string, location?: string, orderFiles?: any[], emailMessageId?: string | null, assignedBuyerIds?: string[] | null): Promise<string> => {
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        client_name: clientName, client_phone: clientPhone, client_email: clientEmail,
        location: location || 'РФ', owner_id: ownerId, deadline: deadline || null,
        order_files: orderFiles || [],
        email_message_id: emailMessageId || null,
        assigned_buyer_ids: assignedBuyerIds || null
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
};

export const repeatOrder = async (sourceOrderId: string, operatorId?: string): Promise<string> => {
    // 1. Получаем исходный заказ
    const { data: sourceOrder, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', sourceOrderId)
        .single();
    
    if (fetchError) throw fetchError;

    // 2. Получаем позиции
    const { data: sourceItems, error: itemsFetchError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', sourceOrderId);

    if (itemsFetchError) throw itemsFetchError;

    // 3. Расчет deadline (Копируем исходный, даже если прошел)
    const newDeadline = sourceOrder.deadline;

    // 4. Создаем новый заказ
    const newOwnerId = operatorId || sourceOrder.owner_id;

    const { data: newOrder, error: createError } = await supabase
        .from('orders')
        .insert({
            client_name: sourceOrder.client_name,
            client_phone: sourceOrder.client_phone,
            client_email: sourceOrder.client_email,
            location: sourceOrder.location,
            owner_id: newOwnerId,
            deadline: newDeadline,
            order_files: sourceOrder.order_files, // Копируем общие файлы
            email_message_id: sourceOrder.email_message_id, // Связываем с тем же письмом
            assigned_buyer_ids: sourceOrder.assigned_buyer_ids, // Копируем назначенных закупщиков
            status_manager: 'В обработке', // Явно задаем статус
            status_client: 'В обработке',
            status_supplier: 'В обработке'
        })
        .select()
        .single();

    if (createError) throw createError;

    // 4.1 Архивируем исходный заказ (только если он еще активен)
    const isAlreadyArchived = sourceOrder.status_manager === 'Архив' || 
                              sourceOrder.status_manager === 'Аннулирован' || 
                              sourceOrder.status_manager === 'Отказ' ||
                              sourceOrder.status_manager === 'Выполнен';

    if (!isAlreadyArchived) {
        await supabase
            .from('orders')
            .update({ 
                status_manager: 'Архив', 
                is_archived: true,
                refusal_reason: `Повторен в заказе #${newOrder.id}` 
            })
            .eq('id', sourceOrderId);
    }

    // 5. Копируем позиции
    if (sourceItems && sourceItems.length > 0) {
        const itemsToInsert = sourceItems.map((item: any) => ({
            order_id: newOrder.id,
            name: item.name,
            quantity: item.quantity,
            comment: item.comment,
            category: item.category,
            photo_url: item.photo_url,
            brand: item.brand,
            article: item.article,
            uom: item.uom,
            item_files: item.item_files
        }));

        const { error: insertItemsError } = await supabase
            .from('order_items')
            .insert(itemsToInsert);
        
        if (insertItemsError) throw insertItemsError;
    }

    return String(newOrder.id);
};
