import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { lang } = useLocalSearchParams<{ lang: string }>();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const err = await signIn(email.trim(), password);
    setBusy(false);
    if (err) Alert.alert(t('common.error_title'), err);
    else router.replace(`/${lang}`);
  };

  return (
    <SafeAreaView className="flex-1 justify-center bg-surface px-6">
      <Text className="mb-8 text-3xl font-extrabold text-ink">{t('auth.login')}</Text>
      <View className="gap-3">
        <TextInput
          value={email} onChangeText={setEmail}
          placeholder={t('auth.email')} autoCapitalize="none" keyboardType="email-address"
          className="rounded-xl bg-surface-muted px-4 py-4 text-ink"
        />
        <TextInput
          value={password} onChangeText={setPassword}
          placeholder={t('auth.password')} secureTextEntry
          className="rounded-xl bg-surface-muted px-4 py-4 text-ink"
        />
        <Pressable onPress={submit} disabled={busy}
          className={`rounded-full py-4 ${busy ? 'bg-primary/50' : 'bg-primary active:opacity-85'}`}>
          <Text className="text-center font-bold text-white">
            {busy ? t('common.loading') : t('auth.login')}
          </Text>
        </Pressable>
        <Link href={`/${lang}/forgot-password`} className="text-center text-primary">
          {t('auth.forgot')}
        </Link>
        <Text className="mt-4 text-center text-ink-soft">
          {t('auth.no_account')}{' '}
          <Link href={`/${lang}/register`} className="font-bold text-primary">{t('auth.register')}</Link>
        </Text>
      </View>
    </SafeAreaView>
  );
}
