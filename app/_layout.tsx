/**
 * الجذر: تهيئة i18n قبل عرض أي شيء، ثم تركيب المزوّدات.
 * expo-router يقرأ scheme من app.json ويولّد الروابط العميقة تلقائياً:
 *   edulink://institute/[slug] -> app/institute/[slug].tsx
 */
import '../global.css';
import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initI18n } from '@/i18n';
import { AuthProvider } from '@/hooks/useAuth';
import { AppSettingsProvider } from '@/hooks/useAppSettings';
import { LoadingState } from '@/components/ui/States';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setReady(true));
  }, []);

  if (!ready) return <LoadingState />;

  return (
    <AuthProvider>
      <AppSettingsProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AppSettingsProvider>
    </AuthProvider>
  );
}
