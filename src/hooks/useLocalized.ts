/**
 * قلب نظام المحتوى متعدد اللغات.
 * أي حقل JSONB قادم من قاعدة البيانات {"ar": "...", "en": "..."}
 * يُعرض بلغة المستخدم الحالية مع سلسلة احتياط ذكية:
 *   اللغة الحالية -> الإنجليزية -> أول قيمة متاحة.
 *
 * لماذا هذا يجعل التوسع "بدون تعديل كود"؟
 * لأن الدالة لا تعرف اللغات مسبقاً — تقرأ المفتاح المطلوب من الكائن مباشرة.
 * أضف "fr" في قاعدة البيانات وفعّل اللغة في جدول languages، وستُعرض فوراً.
 */
import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import type { LocalizedText, LocalizedList } from '@/lib/supabase';
import { FALLBACK_LANG } from '@/i18n';

export function pickLocalized(field: LocalizedText | null | undefined, lang: string): string {
  if (!field) return '';
  return field[lang] ?? field[FALLBACK_LANG] ?? Object.values(field)[0] ?? '';
}

export function useLocalized() {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  /** نص واحد مترجم */
  const L = useCallback((field?: LocalizedText | null) => pickLocalized(field, lang), [lang]);

  /** مصفوفة نصوص مترجمة (مثل tags أو features) */
  const LL = useCallback(
    (list?: LocalizedList | null) => (list ?? []).map((item) => pickLocalized(item, lang)).filter(Boolean),
    [lang]
  );

  return { L, LL, lang };
}
