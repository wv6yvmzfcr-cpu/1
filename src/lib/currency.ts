/**
 * تحويل الأسعار من العملة الأساس (MYR) إلى عملة المستخدم.
 * أسعار الصرف تُقرأ من جدول currencies — حدّثها من لوحة Supabase متى شئت.
 */
import type { Currency, LocalizedText } from '@/lib/supabase';
import { pickLocalized } from '@/hooks/useLocalized';

export function convertFromMYR(amountMYR: number, currency: Currency): number {
  return amountMYR / currency.rate_to_myr;
}

export function formatPrice(amountMYR: number, currency: Currency, lang: string): string {
  const value = convertFromMYR(amountMYR, currency);
  const symbol = pickLocalized(currency.symbol as LocalizedText, lang);
  // Intl مدعوم في Hermes — يضبط فواصل الأرقام حسب اللغة تلقائياً
  const formatted = new Intl.NumberFormat(lang, { maximumFractionDigits: 0 }).format(value);
  return lang === 'ar' ? `${formatted} ${symbol}` : `${symbol} ${formatted}`;
}
