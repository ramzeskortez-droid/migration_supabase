import { supabase } from '../../../lib/supabaseClient';
import { Brand } from '../../../types';

export async function getSellerBrands(sellerName: string): Promise<string[]> {
    const { data, error } = await supabase.rpc('get_seller_brands', { p_seller_name: sellerName });
    if (error) throw error;
    return data?.map((d: any) => d.brand) || [];
}

export async function searchBrands(query: string): Promise<string[]> {
    if (!query || query.length < 2) return [];
    const { data, error } = await supabase.from('brands').select('name').ilike('name', `%${query}%`).order('name').limit(50);
    if (error) throw error;
    return data?.map((b: any) => b.name) || [];
}

export async function checkBrandExists(name: string): Promise<string | null> {
    if (!name) return null;
    const { data, error } = await supabase.from('brands').select('name').ilike('name', name).maybeSingle();
    if (error) return null;
    return data ? data.name : null;
}

export async function getBrandsList(): Promise<string[]> {
    const { data, error } = await supabase.from('brands').select('name').order('name').limit(10000);
    if (error) throw error;
    return data?.map((b: any) => b.name) || [];
}

export async function getBrandsFull(page: number = 1, limit: number = 100, search: string = '', sortField: string = 'id', sortDirection: 'asc' | 'desc' = 'desc', onlyOfficial: boolean = false): Promise<{ data: Brand[], count: number }> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    let query = supabase.from('brands').select('*', { count: 'exact' });
    if (search) query = query.ilike('name', `%${search}%`);
    if (onlyOfficial) query = query.eq('official', true);
    
    const { data, error, count } = await query.order(sortField, { ascending: sortDirection === 'asc' }).range(from, to);
    if (error) throw error;
    return { data: data || [], count: count || 0 };
}

export async function getOfficialBrands(): Promise<string[]> {
    const { data, error } = await supabase.from('brands').select('name').eq('official', true);
    if (error) throw error;
    return data?.map((b: any) => b.name) || [];
}

export async function getSupplierUsedBrands(supplierName: string): Promise<string[]> {
    const { data, error } = await supabase.from('offers').select(`order_id, orders (order_items (brand))`).ilike('supplier_name', supplierName).limit(100);
    if (error || !data) return [];
    const brands: string[] = [];
    data.forEach(offer => { 
        const ords = offer.orders as any;
        if (Array.isArray(ords)) {
             ords.forEach((o: any) => o.order_items?.forEach((item: any) => { if (item.brand) brands.push(item.brand); }));
        } else if (ords && ords.order_items) {
             // Если вернулся один объект (хотя select подразумевает массив, но связь может быть one-to-one)
             ords.order_items.forEach((item: any) => { if (item.brand) brands.push(item.brand); });
        }
    });
    return Array.from(new Set(brands)).sort().slice(0, 10);
}
