import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const err = await resetPassword(email.trim());
    setBusy(false);
    if (err) Alert.alert(t('common.error_title'), err);
    else Alert.alert('✓', t('auth.reset_sent'));
  };

  return (
    <SafeAreaView className="flex-1 justify-center bg-surface px-6">
      <Text className="mb-8 text-3xl font-extrabold text-ink">{t('auth.forgot')}</Text>
      <View className="gap-3">
        <TextInput value={email} onChangeText={setEmail} placeholder={t('auth.email')}
          autoCapitalize="none" keyboardType="email-address"
          className="rounded-xl bg-surface-muted px-4 py-4 text-ink" />
        <Pressable onPress={submit} disabled={busy}
          className={`rounded-full py-4 ${busy ? 'bg-primary/50' : 'bg-primary active:opacity-85'}`}>
          <Text className="text-center font-bold text-white">
            {busy ? t('common.loading') : t('auth.send_reset')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
