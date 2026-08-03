/**
 * حقل اختيار تاريخ أصلي (Native Date Picker).
 * بدل كتابة YYYY-MM-DD يدوياً، يفتح تقويم الجهاز:
 *  - iOS: عجلة/تقويم منبثق.
 *  - Android: نافذة تقويم النظام.
 * يعرض التاريخ منسّقاً بلغة المستخدم، ويعيد القيمة بصيغة YYYY-MM-DD للتخزين.
 */
import React, { useState } from 'react';
import { Pressable, Text, Platform } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';

interface Props {
  value: string;                    // 'YYYY-MM-DD' أو ''
  onChange: (iso: string) => void;
  placeholder: string;
  minimumDate?: Date;               // مثال: اليوم (لا تواريخ ماضية للصلاحية)
}

const toISO = (d: Date) => d.toISOString().slice(0, 10);

export function DateField({ value, onChange, placeholder, minimumDate }: Props) {
  const { i18n } = useTranslation();
  const [show, setShow] = useState(false);

  const selected = value ? new Date(value) : new Date();

  // عرض منسّق بلغة المستخدم (مثال بالعربية: ١ أكتوبر ٢٠٢٧)
  const label = value
    ? new Intl.DateTimeFormat(i18n.language, { year: 'numeric', month: 'long', day: 'numeric' }).format(selected)
    : placeholder;

  const handle = (_e: DateTimePickerEvent, date?: Date) => {
    // أندرويد يغلق النافذة تلقائياً؛ iOS يبقيها ظاهرة
    if (Platform.OS === 'android') setShow(false);
    if (date) onChange(toISO(date));
  };

  return (
    <>
      <Pressable
        onPress={() => setShow(true)}
        className="mt-3 flex-row items-center justify-between rounded-xl bg-surface-muted px-4 py-3.5 active:opacity-80"
      >
        <Text className={value ? 'text-ink' : 'text-ink-soft'}>{label}</Text>
        <Text className="text-lg">📅</Text>
      </Pressable>

      {show && (
        <DateTimePicker
          value={selected}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
          minimumDate={minimumDate}
          onChange={handle}
          locale={i18n.language}
        />
      )}

      {/* زر إغلاق للـ iOS بعد الاختيار */}
      {show && Platform.OS === 'ios' && (
        <Pressable onPress={() => setShow(false)} className="mt-2 self-end rounded-full bg-primary px-6 py-2">
          <Text className="font-semibold text-white">✓</Text>
        </Pressable>
      )}
    </>
  );
}
