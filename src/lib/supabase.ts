/**
 * عميل Supabase الموحّد للتطبيق.
 * الباقة المجانية تكفي المرحلة الأولى بالكامل:
 * 500MB قاعدة بيانات + 1GB تخزين صور + Auth غير محدود.
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const { supabaseUrl, supabaseAnonKey } = Constants.expoConfig!.extra as {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,          // حفظ الجلسة محلياً
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false       // مطلوب في React Native
  }
});

/** أنواع البيانات المطابقة لمخطط قاعدة البيانات */
export type LocalizedText = Record<string, string>;      // {"ar": "...", "en": "..."}
export type LocalizedList = LocalizedText[];             // [{"ar":"..."}, ...]

export interface Language {
  code: string;
  native_name: string;
  is_rtl: boolean;
  sort_order: number;
}

export interface Currency {
  code: string;
  symbol: LocalizedText;
  rate_to_myr: number;
}

export interface ExtraFee {
  key: string;
  amount: number;
  label: LocalizedText;
}

export interface Institute {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  city: LocalizedText;
  city_key: string;
  price_myr: number;              // أسبوعي (مشتق)
  min_weeks: number;
  max_weeks: number;
  tags: LocalizedList;
  images: string[];
  whatsapp: string | null;
  // بيانات حقيقية مضافة من البحث الميداني
  rating: number | null;          // تقييم Google
  rating_count: number | null;
  website: string | null;
  address: string | null;
  accreditation: string[];        // ["MOE","KDN","EMGS"]
  programs: LocalizedList;
  hours_per_week: number | null;
  levels_count: number | null;
  min_age: number;
  max_age: number;
  // نظام الأسعار
  price_month_myr: number | null; // الأصل الشهري
  price_estimated: boolean;       // تقديري أم مؤكّد؟
  price_min_myr: number | null;
  price_max_myr: number | null;
  price_note: LocalizedText | null;
  extra_fees: ExtraFee[];
}

export interface Listing {
  id: string;
  slug: string;
  category: string;
  title: LocalizedText;
  description: LocalizedText;
  city: LocalizedText;
  city_key: string;
  price_myr: number;
  features: LocalizedList;
  images: string[];
  whatsapp: string;
  is_featured: boolean;
}

export interface Application {
  id: string;
  institute_id: string;
  weeks: number;
  start_month: string;
  status: 'pending' | 'reviewing' | 'accepted' | 'rejected';
  created_at: string;
  institutes?: Pick<Institute, 'name' | 'city'>;
}
