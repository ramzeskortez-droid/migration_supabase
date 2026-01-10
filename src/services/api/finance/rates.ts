import { supabase } from '../../../lib/supabaseClient';
import { ExchangeRates } from '../../../types';

export async function getExchangeRates(date?: string): Promise<ExchangeRates | null> {
  let query = supabase.from('exchange_rates').select('*');
  if (date) {
    query = query.eq('date', date);
  } else {
    query = query.order('date', { ascending: false }).limit(1);
  }
  
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as ExchangeRates;
}

export async function upsertExchangeRates(rates: ExchangeRates): Promise<void> {
  const { error } = await supabase.from('exchange_rates').upsert(rates);
  if (error) throw error;
}
