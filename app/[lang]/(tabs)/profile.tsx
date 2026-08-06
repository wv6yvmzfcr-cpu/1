/**
 * الملف الشخصي:
 *  - متابعة حالة طلبات التسجيل.
 *  - اختيار اللغة من قائمة اللغات النشطة في قاعدة البيانات (ديناميكية بالكامل).
 *  - اختيار العملة.
 *  - زر "حذف الحساب نهائياً" (متطلب App Store 5.1.1(v)) بتأكيد مزدوج.
 */
import React from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useQuery } from '@/hooks/useQuery';
import { useLocalized } from '@/hooks/useLocalized';
import { supabase, type Application } from '@/lib/supabase';
import { LoadingState } from '@/components/ui/States';
import { LegalLinks } from '@/components/LegalConsent';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { lang } = useLocalSearchParams<{ lang: string }>();
  const { session, loading, signOut, deleteAccount } = useAuth();
  const { languages, currencies, currency, setLanguage, setCurrency } = useAppSettings();
  const { L } = useLocalized();

  // طلبات المستخدم مع اسم المعهد (join)
  const apps = useQuery<Application[]>(async () => {
    if (!session) return [];
    const { data, error } = await supabase
      .from('applications')
      .select('*, institutes(name, city)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }, [session?.user.id]);

  if (loading) return <LoadingState />;

  /** تأكيد مزدوج قبل الحذف النهائي */
  const confirmDelete = () => {
    Alert.alert(t('profile.delete_confirm_title'), t('profile.delete_confirm_body'), [
      { text: t('profile.cancel'), style: 'cancel' },
      {
        text: t('profile.delete_yes'),
        style: 'destructive',
        onPress: async () => {
          const err = await deleteAccount();
          if (err) Alert.alert(t('common.error_title'), err);
          else router.replace(`/${lang}`);
        }
      }
    ]);
  };

  const statusColor: Record<string, string> = {
    pending: 'bg-accent/20 text-ink',
    reviewing: 'bg-primary-light text-primary-dark',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-700'
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-muted">
      <ScrollView contentContainerClassName="gap-5 p-4 pb-10">
        <Text className="text-2xl font-extrabold text-ink">{t('profile.title')}</Text>

        {/* اللغة — القائمة تأتي من جدول languages: لغة جديدة تظهر هنا تلقائياً */}
        <View className="rounded-2xl bg-surface p-4">
          <Text className="mb-2 font-bold text-ink">{t('profile.language')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {languages.map((l) => (
              <Pressable
                key={l.code}
                onPress={() => setLanguage(l.code)}
                className={`rounded-full border px-4 py-2 ${
                  i18n.language === l.code ? 'border-primary bg-primary' : 'border-ink-soft/30'
                }`}
              >
                <Text className={i18n.language === l.code ? 'font-semibold text-white' : 'text-ink-soft'}>
                  {l.native_name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* العملة */}
        <View className="rounded-2xl bg-surface p-4">
          <Text className="mb-2 font-bold text-ink">{t('profile.currency')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {currencies.map((c) => (
              <Pressable
                key={c.code}
                onPress={() => setCurrency(c.code)}
                className={`rounded-full border px-4 py-2 ${
                  currency?.code === c.code ? 'border-primary bg-primary' : 'border-ink-soft/30'
                }`}
              >
                <Text className={currency?.code === c.code ? 'font-semibold text-white' : 'text-ink-soft'}>
                  {c.code}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {session ? (
          <>
            {/* الطلبات */}
            <View className="rounded-2xl bg-surface p-4">
              <Text className="mb-2 font-bold text-ink">{t('profile.my_applications')}</Text>
              {apps.data?.length ? (
                apps.data.map((a) => (
                  <Pressable
                    key={a.id}
                    onPress={() => router.push(`/${lang}/application/${a.id}`)}
                    className="mb-2 flex-row items-center justify-between rounded-xl bg-surface-muted p-3 active:opacity-80"
                  >
                    <View className="flex-1">
                      <Text className="font-semibold text-ink">{L(a.institutes?.name)}</Text>
                      <Text className="text-xs text-ink-soft">{a.weeks}w · {a.start_month}</Text>
                    </View>
                    <Text className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[a.status]}`}>
                      {t(`profile.status.${a.status}`)}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <Text className="text-ink-soft">{t('profile.no_applications')}</Text>
              )}
            </View>

            {/* الوثائق النظامية — يجب أن تكون متاحة دائماً */}
            <LegalLinks />

            <Pressable onPress={signOut} className="rounded-full border border-ink-soft/30 py-4">
              <Text className="text-center font-semibold text-ink">{t('auth.logout')}</Text>
            </Pressable>

            {/* حذف الحساب — واضح ومباشر كما تشترط أبل */}
            <Pressable onPress={confirmDelete} className="rounded-full bg-red-600 py-4 active:opacity-85">
              <Text className="text-center font-bold text-white">{t('profile.delete_account')}</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={() => router.push(`/${lang}/login`)}
            className="rounded-full bg-primary py-4 active:opacity-85"
          >
            <Text className="text-center font-bold text-white">{t('auth.login')}</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
