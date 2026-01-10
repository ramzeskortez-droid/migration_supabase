import { supabase } from '../../../lib/supabaseClient';

export const seedOrders = async (count: number, brands: string[], ownerId: string, onProgress?: (current: number) => void): Promise<void> => {
    const safeBrands = brands.length > 0 ? brands : ['Toyota', 'BMW', 'Mercedes', 'Audi', 'Lexus'];
    const parts = ['Фильтр масляный', 'Колодки тормозные', 'Свеча зажигания', 'Амортизатор', 'Рычаг подвески', 'Подшипник ступицы', 'Фара правая', 'Бампер передний'];
    const cities = ['Москва', 'Санкт-Петербург', 'Екатеринбург', 'Новосибирск', 'Казань', 'Нижний Новгород', 'Челябинск'];
    const names = ['Алексей', 'Дмитрий', 'Сергей', 'Андрей', 'Максим', 'Евгений', 'Владимир', 'Иван'];
    const subjects = ['Запрос запчастей', 'Срочно детали', 'Заявка на ТО', 'В работу', 'Проценка'];

    const batchSize = 50;
    for (let i = 0; i < count; i += batchSize) {
        const batchOrders = [];
        const currentBatchSize = Math.min(batchSize, count - i);
        for (let j = 0; j < currentBatchSize; j++) {
            const date = new Date();
            date.setHours(date.getHours() - Math.floor(Math.random() * 72));
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + 7);

            batchOrders.push({
                client_name: names[Math.floor(Math.random() * names.length)],
                client_phone: `+7 (9${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(10 + Math.random() * 90)}-${Math.floor(10 + Math.random() * 90)}`,
                client_email: `client${Math.floor(Math.random() * 10000)}@mail.ru`,
                location: cities[Math.floor(Math.random() * cities.length)],
                owner_id: ownerId,
                status_admin: 'В обработке',
                status_client: 'В обработке',
                created_at: date.toISOString(),
                status_updated_at: date.toISOString(),
                deadline: deadline.toISOString()
            });
        }
        const { data: insertedOrders, error } = await supabase.from('orders').insert(batchOrders).select('id');
        if (error) continue;

        const batchItems = [];
        insertedOrders.forEach(ord => {
            const numItems = Math.floor(Math.random() * 3) + 1;
            for (let k = 0; k < numItems; k++) {
                const randomArticle = Math.random().toString(36).substring(2, 10).toUpperCase();
                batchItems.push({
                    order_id: ord.id,
                    name: parts[Math.floor(Math.random() * parts.length)],
                    quantity: Math.floor(Math.random() * 4) + 1,
                    brand: safeBrands[Math.floor(Math.random() * safeBrands.length)],
                    article: randomArticle,
                    comment: k === 0 ? `[Тема: ${subjects[Math.floor(Math.random() * subjects.length)]}]` : '',
                    uom: 'шт', category: 'Оригинал'
                });
            }
        });
        if (batchItems.length > 0) await supabase.from('order_items').insert(batchItems);
        if (onProgress) onProgress(i + currentBatchSize);
    }
};

export const deleteAllOrders = async (): Promise<void> => {
    const { error } = await supabase.rpc('reset_db');
    if (error) {
        await supabase.from('monthly_buyer_stats').delete().neq('kp_count', -1);
        await supabase.from('chat_messages').delete().neq('id', 0);
        await supabase.from('buyer_order_labels').delete().neq('id', 0);
        await supabase.from('offer_items').delete().neq('id', 0);
        await supabase.from('order_items').delete().neq('id', 0);
        await supabase.from('offers').delete().neq('id', 0);
        await supabase.from('orders').delete().neq('id', 0);
    }
};
