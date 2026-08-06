/**
 * إشعارات Expo Push المجانية بالكامل.
 * نخزّن الرمز + لغة المستخدم في جدول push_tokens،
 * فيمكن لاحقاً إرسال عرض بالعربية لمستخدمي العربية وبالفرنسية للفرنسيين... إلخ
 * عبر استدعاء واحد لـ https://exp.host/--/api/v2/push/send (مجاني).
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

export function usePushNotifications() {
  const { session } = useAuth();
  const { i18n } = useTranslation();

  useEffect(() => {
    (async () => {
      if (!Device.isDevice) return; // المحاكي لا يدعم الإشعارات

      const { status: existing } = await Notifications.getPermissionsAsync();
      let status = existing;
      if (existing !== 'granted') {
        status = (await Notifications.requestPermissionsAsync()).status;
      }
      if (status !== 'granted') return;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.DEFAULT
        });
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

      // upsert: نفس الجهاز لا يُسجَّل مرتين، وتُحدَّث لغته عند تغييرها
      await supabase.from('push_tokens').upsert({
        token,
        user_id: session?.user.id ?? null,
        lang: i18n.language,
        platform: Platform.OS
      });
    })();
  }, [session?.user.id, i18n.language]);
}
