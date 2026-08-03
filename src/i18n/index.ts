/**
 * نظام الترجمة الديناميكي (Scalable i18n)
 * ------------------------------------------------
 * مستويان من الترجمة:
 *  1) نصوص الواجهة الثابتة: ملفات JSON محلية (locales/*.json).
 *     لإضافة لغة جديدة للواجهة: أضف ملف fr.json وسطراً واحداً في resources.
 *  2) نصوص المحتوى (المعاهد/الإعلانات): JSONB من قاعدة البيانات،
 *     تُقرأ عبر useLocalized() — لا تحتاج أي تعديل كود عند إضافة لغة.
 *
 * قائمة اللغات المعروضة للمستخدم تأتي من جدول `languages` في Supabase،
 * لذا تفعيل لغة جديدة في الإنتاج = صف واحد في قاعدة البيانات.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ar from './locales/ar.json';
import en from './locales/en.json';
import ms from './locales/ms.json';
import ru from './locales/ru.json';

export const LANG_STORAGE_KEY = 'app_language';
export const FALLBACK_LANG = 'en';

const resources = {
  ar: { translation: ar },
  en: { translation: en },
  ms: { translation: ms },
  ru: { translation: ru }
  // لغة جديدة؟ import fr from './locales/fr.json' ثم fr: { translation: fr }
};

export async function initI18n() {
  // المحفوظ > لغة الجهاز > الاحتياطي
  const saved = await AsyncStorage.getItem(LANG_STORAGE_KEY);
  const device = Localization.getLocales()[0]?.languageCode ?? FALLBACK_LANG;
  const initial = saved ?? (device in resources ? device : FALLBACK_LANG);

  await i18n.use(initReactI18next).init({
    resources,
    lng: initial,
    fallbackLng: FALLBACK_LANG,
    interpolation: { escapeValue: false }
  });
  return i18n;
}

export default i18n;
