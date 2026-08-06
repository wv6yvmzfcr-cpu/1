/**
 * بطاقة معهد — تعمل في وضعي القائمة والشبكة.
 * كل النصوص تُقرأ ديناميكياً من JSONB بلغة المستخدم عبر useLocalized.
 */
import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { Link } from 'expo-router';
import type { Institute } from '@/lib/supabase';
import { useLocalized } from '@/hooks/useLocalized';
import { PriceTag } from '@/components/PriceTag';

export function InstituteCard({ item, grid }: { item: Institute; grid?: boolean }) {
  const { L, LL, lang } = useLocalized();
  const tags = LL(item.tags).slice(0, 2);

  return (
    <Link href={`/${lang}/institutes/${item.slug}`} asChild>
      <Pressable
        className={`overflow-hidden rounded-2xl bg-surface shadow-sm active:opacity-90 ${grid ? 'flex-1' : 'flex-row'}`}
      >
        {item.images[0] ? (
          <Image
            source={{ uri: item.images[0] }}
            className={grid ? 'h-32 w-full' : 'h-28 w-28'}
            resizeMode="cover"
          />
        ) : (
          <View className={`bg-primary-light ${grid ? 'h-32 w-full' : 'h-28 w-28'}`} />
        )}
        <View className="flex-1 p-3">
          <Text numberOfLines={1} className="font-bold text-ink">{L(item.name)}</Text>
          <View className="mt-0.5 flex-row items-center gap-2">
            <Text className="text-xs text-ink-soft">{L(item.city)}</Text>
            {/* تقييم Google الحقيقي — مؤشر ثقة قوي للطالب */}
            {!!item.rating && (
              <Text className="text-[11px] font-semibold text-accent">
                ★ {item.rating} <Text className="font-normal text-ink-soft">({item.rating_count})</Text>
              </Text>
            )}
          </View>
          {/* شارة الاعتماد الرسمي — الفارق الحقيقي بين معهد وآخر */}
          {item.accreditation?.length > 0 && (
            <Text className="mt-1 text-[9px] font-bold text-primary-dark">
              ✓ {item.accreditation.join(' · ')}
            </Text>
          )}
          <View className="mt-1.5 flex-row flex-wrap gap-1">
            {tags.map((tag) => (
              <Text key={tag} className="rounded-full bg-primary-light px-2 py-0.5 text-[10px] text-primary-dark">
                {tag}
              </Text>
            ))}
          </View>
          <PriceTag
            priceMonthMyr={item.price_month_myr}
            estimated={item.price_estimated}
            compact
          />
        </View>
      </Pressable>
    </Link>
  );
}
