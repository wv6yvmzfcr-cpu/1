/** جلب الإعلانات (السكن/الخدمات) — تظهر فقط النشطة وغير المنتهية بفضل RLS */
import { supabase, type Listing } from '@/lib/supabase';
import { useQuery } from './useQuery';

export function useFeaturedListings() {
  return useQuery<Listing[]>(async () => {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('is_featured', true)
      .order('sort_order')
      .limit(6);
    if (error) throw error;
    return data ?? [];
  }, []);
}

export function useListings(category?: string) {
  return useQuery<Listing[]>(async () => {
    let q = supabase.from('listings').select('*').order('sort_order');
    if (category) q = q.eq('category', category);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }, [category]);
}

export function useListing(slug: string) {
  return useQuery<Listing | null>(async () => {
    const { data, error } = await supabase.from('listings').select('*').eq('slug', slug).maybeSingle();
    if (error) throw error;
    return data;
  }, [slug]);
}
