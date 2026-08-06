/**
 * التواصل المباشر عبر واتساب بدل بناء Chat Server مكلف.
 * تُفتح المحادثة برسالة جاهزة بلغة المستخدم الحالية.
 */
import { Linking, Alert } from 'react-native';

export async function openWhatsApp(phone: string, message: string) {
  const clean = phone.replace(/[^\d]/g, ''); // 60123456789 بصيغة دولية بدون +
  const url = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
  } else {
    Alert.alert('WhatsApp', 'WhatsApp is not installed on this device.');
  }
}
