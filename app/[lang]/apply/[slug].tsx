/**
 * معالج التسجيل (Wizard) — يتولّد ديناميكياً من جدول requirements:
 * أضف متطلباً جديداً في قاعدة البيانات وسيظهر كخطوة تلقائياً بكل اللغات.
 *
 * الفحص الفوري قبل الرفع:
 *  - الصيغة والحجم للملفات.
 *  - قاعدة الـ 18 شهراً لصلاحية الجواز (أكبر حاجز يعطّل الطلاب) —
 *    نكتشفها في أول دقيقة ونشرح للطالب كيف يحلها، بدل رفض بعد أسابيع.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useInstitute } from '@/hooks/useInstitutes';
import { useLocalized } from '@/hooks/useLocalized';
import {
  useRequirements, createDraftApplication, pickAndValidate,
  uploadDocument, saveTextDocument, submitForReview, monthsUntil, type Requirement
} from '@/hooks/useApplicationFlow';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { DateField } from '@/components/ui/DateField';
import { PhotoRequirement } from '@/components/PhotoRequirement';

type ItemState = { done: boolean; busy: boolean; error?: string };

export default function ApplyWizard() {
  const { slug, weeks = '12', start = '' } = useLocalSearchParams<{ slug: string; weeks?: string; start?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { L, lang } = useLocalized();

  const inst = useInstitute(slug);
  const reqs = useRequirements(inst.data?.id ?? '');

  const [appId, setAppId] = useState<string | null>(null);
  const [states, setStates] = useState<Record<string, ItemState>>({});
  const [dates, setDates] = useState<Record<string, string>>({});
  const [finishing, setFinishing] = useState(false);

  const setItem = (key: string, s: Partial<ItemState>) =>
    setStates((prev) => ({ ...prev, [key]: { done: false, busy: false, ...prev[key], ...s } }));

  /** ضمان وجود مسودة طلب قبل أول رفع */
  const ensureApp = async () => {
    if (appId) return appId;
    const id = await createDraftApplication(inst.data!.id, Number(weeks) || 12, start || new Date().toISOString().slice(0, 10), lang);
    setAppId(id);
    return id;
  };

  const handleFile = async (req: Requirement) => {
    setItem(req.key, { busy: true, error: undefined });
    try {
      const picked = await pickAndValidate(req);
      if (!picked) { setItem(req.key, { busy: false }); return; }
      if (!picked.ok) {
        setItem(req.key, { busy: false, error: t(`wizard.invalid_${picked.reason}`, { formats: (req.validation.formats ?? []).join(', '), mb: req.validation.max_mb }) });
        return;
      }
      const id = await ensureApp();
      await uploadDocument(id, req.key, picked.uri, picked.ext);
      setItem(req.key, { busy: false, done: true });
    } catch {
      setItem(req.key, { busy: false, error: t('common.error_network') });
    }
  };

  const handleDate = async (req: Requirement, value: string) => {
    setDates((d) => ({ ...d, [req.key]: value }));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    const min = req.validation.min_months_valid;
    if (min && monthsUntil(value) < min) {
      // الحاجز الأشهر: صلاحية الجواز — نوقفه فوراً مع شرح الحل
      setItem(req.key, { done: false, error: t('wizard.passport_short', { months: min }) });
      return;
    }
    setItem(req.key, { busy: true, error: undefined });
    try {
      const id = await ensureApp();
      await saveTextDocument(id, req.key, value);
      setItem(req.key, { busy: false, done: true });
    } catch {
      setItem(req.key, { busy: false, error: t('common.error_network') });
    }
  };

  const required = useMemo(() => (reqs.data ?? []).filter((r) => r.is_required), [reqs.data]);
  const doneCount = required.filter((r) => states[r.key]?.done).length;
  const allDone = required.length > 0 && doneCount === required.length;

  const finish = async () => {
    if (!appId) return;
    setFinishing(true);
    try {
      await submitForReview(appId);
      Alert.alert('✓', t('wizard.submitted'));
      router.replace(`/${lang}/application/${appId}`);
    } catch {
      Alert.alert(t('common.error_title'), t('common.error_network'));
    } finally {
      setFinishing(false);
    }
  };

  if (inst.loading || reqs.loading) return <LoadingState />;
  if (inst.error || !inst.data) return <ErrorState onRetry={inst.refetch} />;

  return (
    <SafeAreaView className="flex-1 bg-surface-muted">
      <ScrollView contentContainerClassName="gap-4 p-4 pb-10">
        <Text className="text-xl font-extrabold text-ink">{t('wizard.title')}</Text>
        <Text className="text-ink-soft">{L(inst.data.name)}</Text>

        {/* شريط تقدم */}
        <View className="h-2 overflow-hidden rounded-full bg-primary-light">
          <View className="h-2 rounded-full bg-primary" style={{ width: `${(doneCount / Math.max(required.length, 1)) * 100}%` }} />
        </View>
        <Text className="text-xs text-ink-soft">{t('wizard.progress', { done: doneCount, total: required.length })}</Text>

        {/* الخطوات المولّدة ديناميكياً من قاعدة البيانات */}
        {(reqs.data ?? []).map((req) => {
          const s = states[req.key];
          return (
            <View key={req.id} className={`rounded-2xl border-2 bg-surface p-4 ${s?.done ? 'border-primary' : s?.error ? 'border-red-400' : 'border-transparent'}`}>
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 font-bold text-ink">{s?.done ? '✓ ' : ''}{L(req.name)}</Text>
                {req.is_required && !s?.done && <Text className="text-xs font-bold text-accent">{t('wizard.required')}</Text>}
              </View>
              {/* الشرح الكامل — إجابة مسبقة عن "ما هذا ومن أين أجيبه؟" */}
              <Text className="mt-1.5 text-xs leading-5 text-ink-soft">{L(req.description)}</Text>

              {/* الصورة الشخصية: مكوّن خاص يزيل الخلفية ويجعلها بيضاء تلقائياً */}
              {req.input_type === 'file' && req.key === 'photo' && (
                <PhotoRequirement
                  ensureApp={ensureApp}
                  done={!!s?.done}
                  onDone={() => setItem('photo', { busy: false, done: true })}
                />
              )}

              {req.input_type === 'file' && req.key !== 'photo' && (
                <Pressable
                  onPress={() => handleFile(req)}
                  disabled={s?.busy}
                  className={`mt-3 rounded-full py-3 ${s?.done ? 'bg-primary-light' : 'bg-primary'} ${s?.busy ? 'opacity-50' : 'active:opacity-85'}`}
                >
                  <Text className={`text-center font-bold ${s?.done ? 'text-primary-dark' : 'text-white'}`}>
                    {s?.busy ? t('common.loading') : s?.done ? t('wizard.replace_file') : t('wizard.pick_file')}
                  </Text>
                </Pressable>
              )}

              {req.input_type === 'date' && (
                <DateField
                  value={dates[req.key] ?? ''}
                  onChange={(v) => handleDate(req, v)}
                  placeholder={t('wizard.pick_date')}
                  minimumDate={new Date()}
                />
              )}

              {req.input_type === 'text' && (
                <TextInput
                  onEndEditing={(e) => handleDate(req, e.nativeEvent.text)}
                  className="mt-3 rounded-xl bg-surface-muted px-4 py-3 text-ink"
                />
              )}

              {s?.error && <Text className="mt-2 text-xs font-semibold leading-5 text-red-600">{s.error}</Text>}
            </View>
          );
        })}

        <Pressable
          onPress={finish}
          disabled={!allDone || finishing}
          className={`rounded-full py-4 ${allDone && !finishing ? 'bg-primary active:opacity-85' : 'bg-primary/40'}`}
        >
          <Text className="text-center font-bold text-white">
            {finishing ? t('common.loading') : t('wizard.finish')}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
