/** بطاقة إعلان (سكن/خدمة) بنمط Airbnb المدمج */
import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Listing } from '@/lib/supabase';
import { useLocalized } from '@/hooks/useLocalized';
import { useAppSettings } from '@/hooks/useAppSettings';
import { formatPrice } from '@/lib/currency';

export function AdCard({ item }: { item: Listing }) {
  const { t } = useTranslation();
  const { L, lang } = useLocalized();
  const { currency } = useAppSettings();

  return (
    <Link href={`/${lang}/listing/${item.slug}`} asChild>
      <Pressable className="w-56 overflow-hidden rounded-2xl bg-surface shadow-sm active:opacity-90">
        {item.images[0] ? (
          <Image source={{ uri: item.images[0] }} className="h-32 w-full" resizeMode="cover" />
        ) : (
          <View className="h-32 w-full bg-accent/20" />
        )}
        <View className="p-3">
          <Text numberOfLines={1} className="font-bold text-ink">{L(item.title)}</Text>
          <Text className="text-xs text-ink-soft">{L(item.city)}</Text>
          {currency && (
            <Text className="mt-1 text-sm font-bold text-primary">
              {formatPrice(item.price_myr, currency, lang)}
              <Text className="text-xs font-normal text-ink-soft"> / {t('listings.per_month')}</Text>
            </Text>
          )}
        </View>
      </Pressable>
    </Link>
  );
}
