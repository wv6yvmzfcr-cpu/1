/**
 * الجذر `/` — يكتشف لغة الزائر ويحوّله لمساره اللغوي.
 *
 * ⚠️ ملاحظة SEO: هذي الصفحة لا تُفهرس (noindex) — الروابط المفهرسة
 * هي `/ar` و `/en` و `/ru`... وقد أشار إليها hreflang بوضوح.
 */
import { Redirect } from 'expo-router';
import { Platform } from 'react-native';
import * as Localization from 'expo-localization';

const SUPPORTED = ['ar', 'en', 'ms', 'ru'];
const FALLBACK = 'en';

export default function Index() {
  let lang = FALLBACK;

  if (Platform.OS === 'web') {
    // لغة المتصفح
    const nav = typeof navigator !== 'undefined' ? navigator.language?.split('-')[0] : null;
    if (nav && SUPPORTED.includes(nav)) lang = nav;
  } else {
    const dev = Localization.getLocales()[0]?.languageCode;
    if (dev && SUPPORTED.includes(dev)) lang = dev;
  }

  return <Redirect href={`/${lang}`} />;
}
