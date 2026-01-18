import { supabase } from '../../../lib/supabaseClient';

export interface AdminChecklistItem {
    id: number;
    category: string;
    text: string;
    description?: string;
    is_checked: boolean;
    sub_items?: { id: string; text: string; checked: boolean }[];
    created_at?: string;
}

export const getChecklist = async (): Promise<AdminChecklistItem[]> => {
    const { data, error } = await supabase
        .from('admin_checklist')
        .select('*')
        .order('category', { ascending: true })
        .order('id', { ascending: true });
    
    if (error) throw error;
    
    return data.map(item => ({
        ...item,
        sub_items: typeof item.sub_items === 'string' ? JSON.parse(item.sub_items) : (item.sub_items || [])
    }));
};

export const upsertChecklistItem = async (item: Partial<AdminChecklistItem>): Promise<void> => {
    const payload: any = {
        category: item.category,
        text: item.text,
        description: item.description,
        is_checked: item.is_checked,
        sub_items: item.sub_items
    };
    if (item.id) payload.id = item.id;
    
    const { error } = await supabase.from('admin_checklist').upsert(payload);
    if (error) throw error;
};

export const deleteChecklistItem = async (id: number): Promise<void> => {
    const { error } = await supabase.from('admin_checklist').delete().eq('id', id);
    if (error) throw error;
};

export const resetChecklist = async (defaultItems: any[]): Promise<void> => {
    // 1. Delete all
    const { error: delError } = await supabase.from('admin_checklist').delete().neq('id', 0);
    if (delError) throw delError;

    // 2. Insert defaults
    const itemsToInsert = defaultItems.map((item) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, subItems, ...rest } = item; 
        
        return {
            category: item.category,
            text: item.text,
            description: item.description,
            is_checked: false,
            sub_items: item.sub_items || item.subItems || [] // Handle both cases
        };
    });

    const { error: insError } = await supabase.from('admin_checklist').insert(itemsToInsert);
    if (insError) throw insError;
};
