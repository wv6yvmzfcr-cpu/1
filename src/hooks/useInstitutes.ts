/**
 * جلب المعاهد مع الفلترة على مستوى قاعدة البيانات (وليس محلياً)
 * لتقليل نقل البيانات — مهم لتجربة سريعة في كل دول العالم.
 */
import { supabase, type Institute } from '@/lib/supabase';
import { useQuery } from './useQuery';

export interface InstituteFilters {
  cityKey?: string | null;
  maxPriceMYR?: number | null;   // نحوّل سقف السعر لعملة الأساس قبل الاستعلام
  weeks?: number | null;
}

export function useInstitutes(filters: InstituteFilters) {
  return useQuery<Institute[]>(async () => {
    let q = supabase
      .from('institutes')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (filters.cityKey) q = q.eq('city_key', filters.cityKey);
    if (filters.maxPriceMYR) q = q.lte('price_myr', filters.maxPriceMYR);
    if (filters.weeks) q = q.lte('min_weeks', filters.weeks).gte('max_weeks', filters.weeks);

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }, [filters.cityKey, filters.maxPriceMYR, filters.weeks]);
}

export function useInstitute(slug: string) {
  return useQuery<Institute | null>(async () => {
    const { data, error } = await supabase
      .from('institutes')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    return data;
  }, [slug]);
}
