/**
 * تخطيط اللغة — كل ما تحته يعيش تحت `/[lang]/...`
 *
 * وظيفته الحاسمة: يقرأ اللغة **من الرابط** (لا من الجهاز) ويضبط i18n
 * والاتجاه عليها. لماذا؟ لأن Google يزور `/ar/institutes/ems` بمتصفح
 * إنجليزي — ويجب أن يرى المحتوى **بالعربية** كما وعده hreflang.
 * لو اعتمدنا لغة الجهاز، لرأى Google الإنجليزية في مسار عربي = فوضى.
 */
import React, { useEffect } from 'react';
import { Stack, useLocalSearchParams, Redirect } from 'expo-router';
import { I18nManager, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

export const SUPPORTED_LANGS = ['ar', 'en', 'ms', 'ru'] as const;
export const RTL_LANGS = ['ar', 'he', 'fa', 'ur'];

/** يخبر Expo بالمسارات التي يولّدها عند التصدير الثابت */
export async function generateStaticParams(): Promise<Record<string, string>[]> {
  return SUPPORTED_LANGS.map((lang) => ({ lang }));
}

export default function LangLayout() {
  const { lang } = useLocalSearchParams<{ lang: string }>();
  const { i18n } = useTranslation();

  const valid = SUPPORTED_LANGS.includes(lang as typeof SUPPORTED_LANGS[number]);

  useEffect(() => {
    if (!valid) return;
    if (i18n.language !== lang) i18n.changeLanguage(lang);

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const isRtl = RTL_LANGS.includes(lang);
      document.documentElement.lang = lang;
      document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    } else {
      const needsRtl = RTL_LANGS.includes(lang);
      if (I18nManager.isRTL !== needsRtl) {
        I18nManager.allowRTL(needsRtl);
        I18nManager.forceRTL(needsRtl);
      }
    }
  }, [lang, valid, i18n]);

  // لغة غير مدعومة → تحويل للإنجليزية (بدل صفحة خطأ)
  if (!valid) return <Redirect href="/en" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
