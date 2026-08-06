/**
 * مشاركة روابط عميقة تفتح التطبيق مباشرة على الصفحة المحددة.
 * expo-router يحوّل المسارات تلقائياً: edulink://institute/elc-kl
 * وعند تجهيز الدومين: https://edulink.app/institute/elc-kl (Universal Links).
 */
import { Share } from 'react-native';
import * as Linking from 'expo-linking';

export async function shareDeepLink(path: string, title: string) {
  // في الإنتاج استبدل بـ https://edulink.app + path ليعمل الرابط حتى لمن لا يملك التطبيق
  const url = Linking.createURL(path);
  await Share.share({ message: `${title}\n${url}` });
}
