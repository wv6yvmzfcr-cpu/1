import React from 'react';
import { Tabs } from 'expo-router';
import { Text, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function TabsLayout() {
  const { t } = useTranslation();
  usePushNotifications(); // تسجيل رمز الإشعارات بمجرد فتح التطبيق

  const icon = (glyph: string) => ({ color }: { color: string }) => (
    <Text style={{ fontSize: 20, color }}>{glyph}</Text>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0E6E5C',
        headerShown: false,
        // على الويب: لا شريط تبويبات — التنقل يكون بترويسة الصفحة.
        // شريط التبويبات نمط جوال؛ فرضه على الويب يبدو غريباً ويأكل مساحة.
        tabBarStyle: Platform.OS === 'web' ? { display: 'none' } : undefined,
      }}
    >
      <Tabs.Screen name="index"      options={{ title: t('nav.home'),        tabBarIcon: icon('🏠') }} />
      <Tabs.Screen name="institutes" options={{ title: t('nav.institutes'),  tabBarIcon: icon('🎓') }} />
      <Tabs.Screen name="listings"   options={{ title: t('listings.title'),  tabBarIcon: icon('🛏️') }} />
      <Tabs.Screen name="profile"    options={{ title: t('profile.title'),   tabBarIcon: icon('👤') }} />
    </Tabs>
  );
}
