/**
 * الموافقة على الشروط وسياسة الخصوصية عند إنشاء الحساب.
 *
 * متطلب نظامي (PDPL): الموافقة يجب أن تكون **صريحة** —
 * لذلك الصندوق **غير مؤشّر مسبقاً**، والمستخدم يضغطه بنفسه.
 * صندوق مؤشّر مسبقاً = موافقة غير صحيحة نظاماً.
 */
import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';

const TERMS_URL = 'https://edulink.app/terms';       // بدّلها بنطاقك
const PRIVACY_URL = 'https://edulink.app/privacy';

export function LegalConsent({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const { t } = useTranslation();

  return (
    <Pressable onPress={() => onChange(!checked)} className="flex-row items-start gap-3 py-2">
      {/* الصندوق يبدأ فارغاً دائماً — شرط الموافقة الصريحة */}
      <View
        className={`mt-0.5 h-5 w-5 items-center justify-center rounded border-2 ${
          checked ? 'border-primary bg-primary' : 'border-ink-soft/40 bg-surface'
        }`}
      >
        {checked && <Text className="text-xs font-bold text-white">✓</Text>}
      </View>

      <Text className="flex-1 text-xs leading-5 text-ink-soft">
        {t('legal.agree_prefix')}{' '}
        <Text className="font-bold text-primary" onPress={() => Linking.openURL(TERMS_URL)}>
          {t('legal.terms')}
        </Text>
        {' '}{t('legal.and')}{' '}
        <Text className="font-bold text-primary" onPress={() => Linking.openURL(PRIVACY_URL)}>
          {t('legal.privacy')}
        </Text>
      </Text>
    </Pressable>
  );
}

/** روابط الوثائق في الملف الشخصي */
export function LegalLinks() {
  const { t } = useTranslation();
  return (
    <View className="rounded-2xl bg-surface p-4">
      <Text className="mb-2 font-bold text-ink">{t('legal.section')}</Text>
      <Pressable onPress={() => Linking.openURL(TERMS_URL)} className="py-2">
        <Text className="text-sm text-primary">{t('legal.terms')} ←</Text>
      </Pressable>
      <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} className="py-2">
        <Text className="text-sm text-primary">{t('legal.privacy')} ←</Text>
      </Pressable>
    </View>
  );
}
