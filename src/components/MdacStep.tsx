/**
 * خطوة بطاقة الوصول الرقمية (MDAC) — إجراء موقوت ضمن مرحلة السفر.
 *
 * منطق التوقيت (طبق القاعدة الرسمية):
 *  - قبل فتح النافذة (> 3 أيام على الوصول): مقفلة، نُعلم الطالب متى تُفتح
 *    ونحذّره ألا يقدّم مبكراً لأن النظام الحكومي سيرفضه.
 *  - داخل النافذة (خلال 3 أيام): مفتوحة، زر يفتح البوابة الرسمية،
 *    ثم يؤكد الطالب إتمامها ويُدخل الرقم المرجعي.
 *  - بعد الوصول: تظهر كمكتملة.
 *
 * الرابط الرسمي والنافذة يأتيان من app_config (قابلان للتحديث من اللوحة).
 */
import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, Linking, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';

interface Props {
  applicationId: string;
  arrivalDate: string | null;   // 'YYYY-MM-DD'
  mdacDone: boolean;
  officialUrl: string;
  windowDays: number;           // عادة 3
  onDone: () => void;
}

/** عدد الأيام من اليوم حتى تاريخ الوصول (سالب = مرّ) */
function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

export function MdacStep({ applicationId, arrivalDate, mdacDone, officialUrl, windowDays, onDone }: Props) {
  const { t } = useTranslation();
  const [ref, setRef] = useState('');
  const [saving, setSaving] = useState(false);

  // لا يمكن حساب التوقيت بدون تاريخ وصول — نطلب من الطالب إدخاله أولاً
  if (!arrivalDate) {
    return (
      <View className="rounded-2xl bg-surface p-4">
        <Text className="font-bold text-ink">🛬 {t('mdac.title')}</Text>
        <Text className="mt-2 text-xs leading-5 text-ink-soft">{t('mdac.need_arrival')}</Text>
      </View>
    );
  }

  const days = daysUntil(arrivalDate);
  const isOpen = days <= windowDays && days >= 0;
  const isFuture = days > windowDays;

  // مكتملة
  if (mdacDone) {
    return (
      <View className="rounded-2xl border-2 border-primary bg-surface p-4">
        <Text className="font-bold text-primary-dark">✓ {t('mdac.title')}</Text>
        <Text className="mt-1 text-xs text-ink-soft">{t('mdac.completed')}</Text>
      </View>
    );
  }

  const confirmDone = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('applications')
      .update({ mdac_done: true, mdac_ref: ref || null })
      .eq('id', applicationId);
    setSaving(false);
    if (error) Alert.alert(t('common.error_title'), error.message);
    else { Alert.alert('✓', t('mdac.saved')); onDone(); }
  };

  return (
    <View className={`rounded-2xl border-2 p-4 ${isOpen ? 'border-accent bg-surface' : 'border-transparent bg-surface'}`}>
      <View className="flex-row items-center justify-between">
        <Text className="font-bold text-ink">🛬 {t('mdac.title')}</Text>
        {isOpen
          ? <Text className="rounded-full bg-accent/20 px-3 py-1 text-[10px] font-bold text-accent">{t('mdac.open_now')}</Text>
          : isFuture
            ? <Text className="text-lg">🔒</Text>
            : null}
      </View>

      <Text className="mt-2 text-xs leading-5 text-ink-soft">{t('mdac.description')}</Text>

      {/* مقفلة: قبل فتح النافذة */}
      {isFuture && (
        <View className="mt-3 rounded-xl bg-surface-muted p-3">
          <Text className="text-xs font-bold text-ink">{t('mdac.opens_in', { days: days - windowDays })}</Text>
          <Text className="mt-1 text-[11px] leading-5 text-ink-soft">{t('mdac.dont_early')}</Text>
        </View>
      )}

      {/* مفتوحة: داخل نافذة الـ 3 أيام */}
      {isOpen && (
        <View className="mt-3 gap-2">
          <View className="rounded-xl bg-red-50 p-2.5">
            <Text className="text-[11px] font-semibold leading-5 text-red-700">{t('mdac.scam_warning')}</Text>
          </View>

          <Pressable
            onPress={() => Linking.openURL(officialUrl)}
            className="flex-row items-center justify-center gap-2 rounded-full bg-primary py-3.5 active:opacity-85"
          >
            <Text className="text-base">🌐</Text>
            <Text className="font-bold text-white">{t('mdac.open_portal')}</Text>
          </Pressable>

          <Text className="mt-1 text-[11px] text-ink-soft">{t('mdac.after_submit')}</Text>
          <TextInput
            value={ref}
            onChangeText={setRef}
            placeholder={t('mdac.ref_placeholder')}
            className="rounded-xl bg-surface-muted px-4 py-3 text-ink"
          />
          <Pressable
            onPress={confirmDone}
            disabled={saving}
            className={`rounded-full py-3.5 ${saving ? 'bg-primary/50' : 'bg-primary active:opacity-85'}`}
          >
            <Text className="text-center font-bold text-white">
              {saving ? t('common.loading') : t('mdac.mark_done')}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
