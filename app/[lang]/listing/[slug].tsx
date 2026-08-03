/**
 * تفاصيل إعلان السكن/الخدمة:
 * صور + سعر + مميزات + زر واتساب برسالة جاهزة بلغة المستخدم
 * (بديل مجاني بالكامل عن بناء سيرفر محادثات).
 */
import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useListing } from '@/hooks/useListings';
import { useLocalized } from '@/hooks/useLocalized';
import { useAppSettings } from '@/hooks/useAppSettings';
import { formatPrice } from '@/lib/currency';
import { shareDeepLink } from '@/lib/share';
import { ImageCarousel } from '@/components/ImageCarousel';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { LoadingState, ErrorState } from '@/components/ui/States';

export default function ListingScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useTranslation();
  const { L, LL, lang } = useLocalized();
  const { currency } = useAppSettings();
  const { data: ad, loading, error, refetch } = useListing(slug);

  if (loading) return <LoadingState />;
  if (error || !ad) return <ErrorState onRetry={refetch} />;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['bottom']}>
      <ScrollView contentContainerClassName="pb-28">
        <ImageCarousel images={ad.images} />
        <View className="gap-4 p-5">
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-2xl font-extrabold text-ink">{L(ad.title)}</Text>
              <Text className="mt-1 text-ink-soft">{L(ad.city)}</Text>
            </View>
            <Pressable
              onPress={() => shareDeepLink(`/listing/${ad.slug}`, L(ad.title))}
              className="rounded-full bg-primary-light px-4 py-2"
            >
              <Text className="text-xs font-semibold text-primary-dark">{t('common.share')}</Text>
            </Pressable>
          </View>

          {currency && (
            <Text className="text-xl font-bold text-primary">
              {formatPrice(ad.price_myr, currency, lang)}
              <Text className="text-sm font-normal text-ink-soft"> / {t('listings.per_month')}</Text>
            </Text>
          )}

          <View>
            <Text className="mb-2 font-bold text-ink">{t('listings.features')}</Text>
            <View className="flex-row flex-wrap gap-2">
              {LL(ad.features).map((f) => (
                <Text key={f} className="rounded-full bg-accent/15 px-3 py-1.5 text-xs text-ink">
                  {f}
                </Text>
              ))}
            </View>
          </View>

          <Text className="leading-6 text-ink-soft">{L(ad.description)}</Text>
        </View>
      </ScrollView>

      {/* زر ثابت أسفل الشاشة */}
      <View className="absolute bottom-0 w-full bg-surface p-4 shadow-lg">
        <WhatsAppButton phone={ad.whatsapp} listingTitle={L(ad.title)} />
      </View>
    </SafeAreaView>
  );
}
