/**
 * حالات UX الموحّدة: تحميل / خطأ مع إعادة محاولة / فارغ.
 * توحيدها هنا يضمن تجربة متسقة في كل الشاشات وكل اللغات.
 */
import React from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

export function LoadingState() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center bg-surface-muted">
      <ActivityIndicator size="large" color="#0E6E5C" />
      <Text className="mt-3 text-ink-soft">{t('common.loading')}</Text>
    </View>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center bg-surface-muted px-8">
      <Text className="text-lg font-bold text-ink">{t('common.error_title')}</Text>
      <Text className="mt-2 text-center text-ink-soft">{t('common.error_network')}</Text>
      <Pressable onPress={onRetry} className="mt-5 rounded-full bg-primary px-8 py-3 active:opacity-80">
        <Text className="font-semibold text-white">{t('common.retry')}</Text>
      </Pressable>
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View className="items-center justify-center py-16 px-8">
      <Text className="text-center text-ink-soft">{message}</Text>
    </View>
  );
}
