import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { LegalConsent } from '@/components/LegalConsent';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { lang } = useLocalSearchParams<{ lang: string }>();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);   // يبدأ false — موافقة صريحة

  const submit = async () => {
    if (!agreed) { Alert.alert('', t('legal.must_agree')); return; }
    setBusy(true);
    const err = await signUp(email.trim(), password, name.trim());
    setBusy(false);
    if (err) Alert.alert(t('common.error_title'), err);
    else {
      Alert.alert('✓', t('auth.check_email'));
      router.replace(`/${lang}/login`);
    }
  };

  return (
    <SafeAreaView className="flex-1 justify-center bg-surface px-6">
      <Text className="mb-8 text-3xl font-extrabold text-ink">{t('auth.register')}</Text>
      <View className="gap-3">
        <TextInput value={name} onChangeText={setName} placeholder={t('auth.full_name')}
          className="rounded-xl bg-surface-muted px-4 py-4 text-ink" />
        <TextInput value={email} onChangeText={setEmail} placeholder={t('auth.email')}
          autoCapitalize="none" keyboardType="email-address"
          className="rounded-xl bg-surface-muted px-4 py-4 text-ink" />
        <TextInput value={password} onChangeText={setPassword} placeholder={t('auth.password')}
          secureTextEntry className="rounded-xl bg-surface-muted px-4 py-4 text-ink" />
        <LegalConsent checked={agreed} onChange={setAgreed} />
        <Pressable onPress={submit} disabled={busy || !agreed}
          className={`rounded-full py-4 ${busy || !agreed ? 'bg-primary/40' : 'bg-primary active:opacity-85'}`}>
          <Text className="text-center font-bold text-white">
            {busy ? t('common.loading') : t('auth.register')}
          </Text>
        </Pressable>
        <Text className="mt-4 text-center text-ink-soft">
          {t('auth.have_account')}{' '}
          <Link href={`/${lang}/login`} className="font-bold text-primary">{t('auth.login')}</Link>
        </Text>
      </View>
    </SafeAreaView>
  );
}
