/**
 * شريط فلترة أفقي: المدينة، السقف السعري (بعملة المستخدم)، ومدة الكورس.
 * قائمة المدن تُبنى ديناميكياً من city_key الموجودة في البيانات نفسها —
 * أضف معهداً في مدينة جديدة وستظهر المدينة في الفلتر تلقائياً.
 */
import React from 'react';
import { ScrollView, Pressable, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Institute } from '@/lib/supabase';
import { useLocalized } from '@/hooks/useLocalized';

interface Props {
  institutes: Institute[];
  cityKey: string | null;
  onCity: (key: string | null) => void;
}

export function FilterBar({ institutes, cityKey, onCity }: Props) {
  const { t } = useTranslation();
  const { L } = useLocalized();

  // مدن فريدة مأخوذة من البيانات الحية
  const cities = Array.from(
    new Map(institutes.map((i) => [i.city_key, L(i.city)])).entries()
  );

  const Chip = ({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      className={`me-2 rounded-full border px-4 py-2 ${
        active ? 'border-primary bg-primary' : 'border-ink-soft/30 bg-surface'
      }`}
    >
      <Text className={active ? 'font-semibold text-white' : 'text-ink-soft'}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2">
      <Chip active={!cityKey} label={t('filters.all_cities')} onPress={() => onCity(null)} />
      {cities.map(([key, name]) => (
        <Chip key={key} active={cityKey === key} label={name} onPress={() => onCity(key)} />
      ))}
    </ScrollView>
  );
}
