/**
 * موافقة مشاركة البيانات — يظهر للطالب قبل إرسال ملفه لأي معهد.
 *
 * مبادئ مطبّقة:
 *  - موافقة صريحة ومحددة: لهذا المعهد بالذات، وليست موافقة عامة.
 *  - شفافية: نعرض بالضبط ما سيُشارك (المستندات المعتمدة فقط).
 *  - قابلة للسحب في أي وقت — والسحب يوقف وصول المعهد فوراً (عبر RLS).
 */
import React, { useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useLocalized } from '@/hooks/useLocalized';
import type { LocalizedText } from '@/lib/supabase';

interface Props {
  applicationId: string;
  partnerId: string;
  partnerName: LocalizedText;
  granted: boolean;
  onChange: () => void;
}

export function ConsentCard({ applicationId, partnerId, partnerName, granted, onChange }: Props) {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const [busy, setBusy] = useState(false);

  const shared: string[] = t('consent.items', { returnObjects: true }) as string[];

  const grant = async () => {
    setBusy(true);
    const { error } = await supabase.from('data_consents').upsert(
      {
        application_id: applicationId,
        partner_id: partnerId,
        granted: true,
        granted_at: new Date().toISOString(),
        revoked_at: null,
      },
      { onConflict: 'application_id,partner_id' }
    );
    setBusy(false);
    if (error) Alert.alert(t('common.error_title'), error.message);
    else onChange();
  };

  const revoke = () => {
    Alert.alert(t('consent.revoke_title'), t('consent.revoke_body'), [
      { text: t('profile.cancel'), style: 'cancel' },
      {
        text: t('consent.revoke_yes'),
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          const { error } = await supabase
            .from('data_consents')
            .update({ granted: false, revoked_at: new Date().toISOString() })
            .eq('application_id', applicationId)
            .eq('partner_id', partnerId);
          setBusy(false);
          if (error) Alert.alert(t('common.error_title'), error.message);
          else onChange();
        },
      },
    ]);
  };

  // ممنوحة: نطمئن الطالب ونتيح السحب
  if (granted) {
    return (
      <View className="rounded-2xl border-2 border-primary bg-surface p-4">
        <Text className="font-bold text-primary-dark">✓ {t('consent.granted_title')}</Text>
        <Text className="mt-1.5 text-xs leading-5 text-ink-soft">
          {t('consent.granted_body', { partner: L(partnerName) })}
        </Text>
        <Pressable onPress={revoke} disabled={busy} className="mt-3 self-start">
          <Text className="text-xs font-bold text-red-600">{t('consent.revoke_link')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="rounded-2xl border-2 border-accent bg-surface p-4">
      <Text className="font-bold text-ink">🔒 {t('consent.title')}</Text>
      <Text className="mt-1.5 text-xs leading-5 text-ink-soft">
        {t('consent.body', { partner: L(partnerName) })}
      </Text>

      {/* شفافية: ما الذي سيُشارك بالضبط */}
      <View className="mt-3 rounded-xl bg-surface-muted p-3">
        <Text className="text-[11px] font-bold text-ink">{t('consent.will_share')}</Text>
        {shared.map((item) => (
          <Text key={item} className="mt-1 text-[11px] leading-5 text-ink-soft">• {item}</Text>
        ))}
      </View>

      <Text className="mt-2 text-[11px] leading-5 text-ink-soft">{t('consent.revocable')}</Text>

      <Pressable
        onPress={grant}
        disabled={busy}
        className={`mt-3 rounded-full py-3.5 ${busy ? 'bg-primary/50' : 'bg-primary active:opacity-85'}`}
      >
        <Text className="text-center font-bold text-white">
          {busy ? t('common.loading') : t('consent.approve')}
        </Text>
      </Pressable>
    </View>
  );
}
