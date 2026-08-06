/** صفحة الإعلانات المخصصة (سكن الطلاب، الخدمات...) */
import React from 'react';
import { View, FlatList, Text, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useListings } from '@/hooks/useListings';
import { AdCard } from '@/components/AdCard';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';

export default function ListingsScreen() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useListings();

  if (loading && !data) return <LoadingState />;
  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <SafeAreaView className="flex-1 bg-surface-muted">
      <FlatList
        data={data ?? []}
        numColumns={2}
        keyExtractor={(i) => i.id}
        columnWrapperClassName="gap-3"
        contentContainerClassName="gap-3 p-4"
        renderItem={({ item }) => (
          <View className="flex-1"><AdCard item={item} /></View>
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
        ListHeaderComponent={
          <Text className="mb-1 text-2xl font-extrabold text-ink">{t('listings.title')}</Text>
        }
        ListEmptyComponent={<EmptyState message={t('home.empty')} />}
      />
    </SafeAreaView>
  );
}
