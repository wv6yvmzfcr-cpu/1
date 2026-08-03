/**
 * شاشة متابعة الطلب — "الوكيل" الذي يزيل الحواجز:
 *  1) خط سير مرئي من 8 مراحل مع شرح كل مرحلة و"المطلوب منك الآن".
 *  2) حالة كل مستند؛ وعند الرفض: السبب المقنن + طريقة الإصلاح بالضبط بلغة الطالب.
 *  3) FAQ سياقي يعرض تلقائياً أسئلة المرحلة الحالية فقط.
 *  4) زر المساعد الذكي الذي يعرف حالة هذا الطلب فعلياً.
 */
import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTracker } from '@/hooks/useTracker';
import { useLocalized } from '@/hooks/useLocalized';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { MdacStep } from '@/components/MdacStep';
import { PriceComparison } from '@/components/PriceTag';

export default function ApplicationTracker() {
  const { id, lang } = useLocalSearchParams<{ id: string; lang: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { L } = useLocalized();
  const { data, loading, error, refetch } = useTracker(id);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={refetch} />;

  const { app, steps, docs, reasons, faq, mdac } = data;
  const currentOrder = steps.find((s) => s.status === app.status)?.step_order ?? 1;
  const current = steps.find((s) => s.status === app.status);
  const rejectedDocs = docs.filter((d) => d.status === 'rejected');

  return (
    <SafeAreaView className="flex-1 bg-surface-muted">
      <ScrollView contentContainerClassName="gap-4 p-4 pb-10">
        <Text className="text-xl font-extrabold text-ink">{L(app.institutes?.name)}</Text>

        {/* بطاقة "المطلوب منك الآن" — أهم عنصر في الشاشة */}
        {current && (
          <View className="rounded-2xl bg-primary p-4">
            <Text className="text-xs font-bold text-white/80">{t('tracker.current_step')}</Text>
            <Text className="mt-1 text-lg font-extrabold text-white">{L(current.title)}</Text>
            <Text className="mt-2 text-xs leading-5 text-white/90">{L(current.explanation)}</Text>
            <View className="mt-3 rounded-xl bg-white/15 p-3">
              <Text className="text-xs font-bold text-white">{t('tracker.your_action')}</Text>
              <Text className="mt-1 text-xs leading-5 text-white">{L(current.your_action)}</Text>
              {current.eta_days && (
                <Text className="mt-1 text-[10px] text-white/70">{t('tracker.eta', { days: current.eta_days })}</Text>
              )}
            </View>
          </View>
        )}

        {/* السعر النهائي بعد خطاب القبول — مقارنة شفافة بالتقدير */}
        {app.final_price_myr && (
          <PriceComparison
            quoted={app.quoted_price_myr}
            final={app.final_price_myr}
            estimated={app.quoted_estimated}
          />
        )}

        {/* بطاقة MDAC — تظهر في مرحلة السفر، وتُفتح تلقائياً قبل 3 أيام من الوصول */}
        {app.status === 'ticket' && mdac && (
          <MdacStep
            applicationId={app.id}
            arrivalDate={app.arrival_date}
            mdacDone={app.mdac_done}
            officialUrl={mdac.official_url}
            windowDays={mdac.window_days}
            onDone={refetch}
          />
        )}

        {/* مستندات مرفوضة؟ السبب والحل فوراً */}
        {rejectedDocs.length > 0 && (
          <View className="rounded-2xl border-2 border-red-300 bg-surface p-4">
            <Text className="font-bold text-red-600">{t('tracker.fix_needed')}</Text>
            {rejectedDocs.map((d) => {
              const reason = reasons.find((r) => r.key === d.rejection_key);
              return (
                <View key={d.requirement_key} className="mt-2 rounded-xl bg-red-50 p-3">
                  <Text className="text-xs font-bold text-ink">{d.requirement_key} — {L(reason?.title)}</Text>
                  <Text className="mt-1 text-xs leading-5 text-ink-soft">{L(reason?.fix)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* خط السير الكامل */}
        <View className="rounded-2xl bg-surface p-4">
          <Text className="mb-3 font-bold text-ink">{t('tracker.pipeline')}</Text>
          {steps.map((s) => {
            const done = s.step_order < currentOrder;
            const now = s.step_order === currentOrder;
            return (
              <View key={s.status} className="mb-3 flex-row gap-3">
                <View className="items-center">
                  <View className={`h-7 w-7 items-center justify-center rounded-full ${done ? 'bg-primary' : now ? 'bg-accent' : 'bg-surface-muted'}`}>
                    <Text className={`text-xs font-bold ${done || now ? 'text-white' : 'text-ink-soft'}`}>
                      {done ? '✓' : s.step_order}
                    </Text>
                  </View>
                  {s.step_order < steps.length && <View className={`w-0.5 flex-1 ${done ? 'bg-primary' : 'bg-surface-muted'}`} />}
                </View>
                <View className="flex-1 pb-1">
                  <Text className={`text-sm font-bold ${now ? 'text-ink' : done ? 'text-primary-dark' : 'text-ink-soft'}`}>
                    {L(s.title)}
                  </Text>
                  {now && <Text className="mt-0.5 text-[11px] leading-4 text-ink-soft">{L(s.explanation)}</Text>}
                </View>
              </View>
            );
          })}
        </View>

        {/* FAQ سياقي للمرحلة الحالية */}
        {faq.length > 0 && (
          <View className="rounded-2xl bg-surface p-4">
            <Text className="mb-2 font-bold text-ink">{t('tracker.faq_title')}</Text>
            {faq.map((f) => (
              <View key={f.id} className="mb-3">
                <Text className="text-sm font-bold text-primary-dark">{L(f.question)}</Text>
                <Text className="mt-1 text-xs leading-5 text-ink-soft">{L(f.answer)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* المساعد الذكي */}
        <Pressable
          onPress={() => router.push(`/${lang}/assistant`)}
          className="flex-row items-center justify-center gap-2 rounded-full bg-ink py-4 active:opacity-85"
        >
          <Text className="text-lg">✨</Text>
          <Text className="font-bold text-white">{t('assistant.open')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
