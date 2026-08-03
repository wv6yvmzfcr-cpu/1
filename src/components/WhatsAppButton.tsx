/** زر التواصل المباشر عبر واتساب برسالة جاهزة بلغة المستخدم الحالية */
import React from 'react';
import { Pressable, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { openWhatsApp } from '@/lib/whatsapp';

export function WhatsAppButton({ phone, listingTitle }: { phone: string; listingTitle: string }) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={() => openWhatsApp(phone, t('listings.wa_message', { title: listingTitle }))}
      className="flex-row items-center justify-center rounded-full bg-[#25D366] py-4 active:opacity-85"
    >
      <Text className="text-base font-bold text-white">{t('listings.contact_whatsapp')}</Text>
    </Pressable>
  );
}
