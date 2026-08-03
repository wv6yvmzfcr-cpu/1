/**
 * عرض السعر بشفافية كاملة — حسب حالته الثلاث:
 *   1) تقديري  → شارة صفراء + النطاق + "يُؤكَّد في خطاب القبول"
 *   2) مؤكَّد   → شارة خضراء (سعر موثّق من المعهد)
 *   3) نهائي   → في شاشة الطلب بعد صدور خطاب القبول
 *
 * لماذا هذا مهم؟ الطالب يبني ميزانيته على هذا الرقم ويحجز تذكرة.
 * إخفاء كونه تقديرياً = صدمة عند خطاب القبول = فقدان ثقة.
 * إظهاره = توقّع صحيح = رضا حتى لو تغيّر السعر.
 */
import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalized } from '@/hooks/useLocalized';
import { useAppSettings } from '@/hooks/useAppSettings';
import { formatPrice } from '@/lib/currency';
import type { LocalizedText } from '@/lib/supabase';

interface ExtraFee {
  key: string;
  amount: number;
  label: LocalizedText;
}

interface Props {
  priceMonthMyr: number | null;
  estimated: boolean;
  minMyr?: number | null;
  maxMyr?: number | null;
  note?: LocalizedText | null;
  extraFees?: ExtraFee[];
  compact?: boolean;   // للبطاقات في القوائم
}

export function PriceTag({
  priceMonthMyr, estimated, minMyr, maxMyr, note, extraFees = [], compact
}: Props) {
  const { t } = useTranslation();
  const { L, lang } = useLocalized();
  const { currency } = useAppSettings();
  const [open, setOpen] = useState(false);

  if (!currency) return null;

  // لا سعر بعد
  if (!priceMonthMyr) {
    return <Text className="text-xs text-ink-soft">{t('price.on_request')}</Text>;
  }

  const main = formatPrice(priceMonthMyr, currency, lang);
  const hasRange = estimated && minMyr && maxMyr && minMyr !== maxMyr;

  // نسخة مختصرة للبطاقات
  if (compact) {
    return (
      <View className="mt-1.5 flex-row items-center gap-1.5">
        <Text className="text-sm font-bold text-primary">
          {estimated ? '~' : ''}{main}
          <Text className="text-[10px] font-normal text-ink-soft"> / {t('price.month')}</Text>
        </Text>
        {estimated && (
          <Text className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-bold text-accent">
            {t('price.badge_estimated')}
          </Text>
        )}
      </View>
    );
  }

  const feesTotal = extraFees.reduce((s, f) => s + f.amount, 0);

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <Text className="text-xl font-extrabold text-primary">
          {estimated ? '~' : ''}{main}
          <Text className="text-sm font-normal text-ink-soft"> / {t('price.month')}</Text>
        </Text>
        <Text
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
            estimated ? 'bg-accent/15 text-accent' : 'bg-primary-light text-primary-dark'
          }`}
        >
          {estimated ? t('price.badge_estimated') : t('price.badge_confirmed')}
        </Text>
      </View>

      {/* النطاق السعري — يعطي الطالب تصوراً واقعياً */}
      {hasRange && (
        <Text className="text-[11px] text-ink-soft">
          {t('price.range', {
            min: formatPrice(minMyr!, currency, lang),
            max: formatPrice(maxMyr!, currency, lang),
          })}
        </Text>
      )}

      {/* الملاحظة المترجمة (مصدر السعر / متى يُؤكَّد) */}
      {note && <Text className="text-[11px] leading-5 text-ink-soft">{L(note)}</Text>}

      {/* الرسوم الإضافية — أكبر مصدر شكاوى إن أُخفيت */}
      {extraFees.length > 0 && (
        <Pressable onPress={() => setOpen(!open)} className="rounded-xl bg-surface-muted p-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold text-ink">
              ⚠️ {t('price.extra_fees')} +{formatPrice(feesTotal, currency, lang)}
            </Text>
            <Text className="text-ink-soft">{open ? '▲' : '▼'}</Text>
          </View>
          {open && (
            <View className="mt-2 gap-1">
              {extraFees.map((f) => (
                <View key={f.key} className="flex-row justify-between">
                  <Text className="text-[11px] text-ink-soft">{L(f.label)}</Text>
                  <Text className="text-[11px] font-semibold text-ink">
                    {formatPrice(f.amount, currency, lang)}
                  </Text>
                </View>
              ))}
              <Text className="mt-1 text-[10px] leading-4 text-ink-soft">{t('price.fees_note')}</Text>
            </View>
          )}
        </Pressable>
      )}
    </View>
  );
}

/**
 * مقارنة السعر التقديري بالنهائي — تظهر في شاشة الطلب بعد خطاب القبول.
 * الشفافية هنا تحوّل مفاجأة محتملة إلى ثقة.
 */
export function PriceComparison({
  quoted, final, estimated
}: { quoted: number | null; final: number | null; estimated: boolean | null }) {
  const { t } = useTranslation();
  const { lang } = useLocalized();
  const { currency } = useAppSettings();
  if (!currency || !final || !quoted) return null;

  const diff = final - quoted;
  const same = Math.abs(diff) < 1;

  return (
    <View className="rounded-2xl bg-surface p-4">
      <Text className="mb-2 font-bold text-ink">{t('price.final_title')}</Text>

      <View className="flex-row justify-between">
        <Text className="text-xs text-ink-soft">
          {estimated ? t('price.you_saw_estimate') : t('price.you_saw')}
        </Text>
        <Text className="text-xs text-ink-soft line-through">
          {formatPrice(quoted, currency, lang)}
        </Text>
      </View>

      <View className="mt-1 flex-row justify-between">
        <Text className="text-sm font-bold text-ink">{t('price.final_price')}</Text>
        <Text className="text-base font-extrabold text-primary">
          {formatPrice(final, currency, lang)}
        </Text>
      </View>

      {!same && (
        <Text className={`mt-2 text-[11px] font-semibold ${diff > 0 ? 'text-accent' : 'text-green-700'}`}>
          {diff > 0
            ? t('price.higher_by', { amount: formatPrice(Math.abs(diff), currency, lang) })
            : t('price.lower_by', { amount: formatPrice(Math.abs(diff), currency, lang) })}
        </Text>
      )}
      {same && <Text className="mt-2 text-[11px] font-semibold text-green-700">{t('price.matched')}</Text>}
    </View>
  );
}
