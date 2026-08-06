/**
 * مكوّن رفع/تصوير الصورة الشخصية مع التصحيح التلقائي للخلفية.
 *
 * التدفق:
 *  1) الطالب يختار: التقاط بالكاميرا (بإرشادات) أو رفع من المعرض.
 *  2) قص أولي للنسبة الصحيحة (صورة جواز) على الجهاز عبر expo-image-manipulator.
 *  3) إرسال للـ Edge Function التي تزيل الخلفية وتجعلها بيضاء وتضبط المقاس.
 *  4) عرض المعاينة للطالب: يعتمد أو يعيد المحاولة.
 *
 * ملاحظة: نضغط الصورة قبل الإرسال لتقليل زمن الرفع في كل دول العالم.
 */
import React, { useState } from 'react';
import { View, Text, Image, Pressable, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';

interface Props {
  ensureApp: () => Promise<string>;   // ينشئ الطلب إن لم يوجد ويعيد معرّفه
  done: boolean;
  onDone: () => void;
}

type Phase = 'idle' | 'processing' | 'preview';

export function PhotoRequirement({ ensureApp, done, onDone }: Props) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** التقاط أو اختيار ثم قص أولي بنسبة صورة الجواز (نسبة ~0.78) */
  const acquire = async (mode: 'camera' | 'library') => {
    setError(null);
    const perm =
      mode === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('', t('photo.permission'));
      return;
    }

    const opts: ImagePicker.ImagePickerOptions = {
      allowsEditing: true,
      aspect: [35, 45], // نسبة صورة الجواز — يقص الطالب على الوجه
      quality: 0.9,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    };
    const res =
      mode === 'camera'
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);

    if (res.canceled || !res.assets?.[0]) return;
    await process(res.assets[0].uri);
  };

  /** ضغط وتصغير قبل الرفع ثم استدعاء المعالجة على السيرفر */
  const process = async (uri: string) => {
    setPhase('processing');
    try {
      const applicationId = await ensureApp();
      // نصغّر للحد الأقصى 1000px عرض ونحوّل لـ base64 مضغوط
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1000 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      const { data, error: fnErr } = await supabase.functions.invoke('photo-passport', {
        body: { imageBase64: manipulated.base64, applicationId },
      });
      if (fnErr) throw fnErr;

      setPreview(data.preview);   // معاينة بخلفية بيضاء ومقاس صحيح
      setPhase('preview');
    } catch {
      setError(t('photo.failed'));
      setPhase('idle');
    }
  };

  /** اعتماد النتيجة: تسجيل المستند كمرفوع (الملف رُفع فعلاً من الـ Edge Function) */
  const confirm = async () => {
    const applicationId = await ensureApp();
    const userId = (await supabase.auth.getUser()).data.user!.id;
    const { error: err } = await supabase.from('application_documents').upsert(
      {
        application_id: applicationId,
        requirement_key: 'photo',
        storage_path: `${userId}/${applicationId}/photo.png`,
        status: 'pending',
        rejection_key: null,
      },
      { onConflict: 'application_id,requirement_key' }
    );
    if (err) Alert.alert(t('common.error_title'), err.message);
    else {
      setPhase('idle');
      onDone();
    }
  };

  if (done && phase === 'idle') {
    return (
      <View className="rounded-xl bg-primary-light p-3">
        <Text className="text-xs font-semibold text-primary-dark">✓ {t('photo.ready')}</Text>
      </View>
    );
  }

  return (
    <View className="mt-2">
      {/* إرشادات الصورة الصحيحة — تقلل الرفض من الأصل */}
      <View className="mb-3 rounded-xl bg-surface-muted p-3">
        <Text className="text-[11px] font-bold text-ink">{t('photo.tips_title')}</Text>
        {(t('photo.tips', { returnObjects: true }) as string[]).map((tip) => (
          <Text key={tip} className="mt-1 text-[11px] leading-5 text-ink-soft">• {tip}</Text>
        ))}
      </View>

      {phase === 'processing' && (
        <View className="items-center rounded-xl bg-surface-muted py-6">
          <Text className="text-2xl">✨</Text>
          <Text className="mt-2 text-xs font-semibold text-ink">{t('photo.processing')}</Text>
          <Text className="mt-1 text-[11px] text-ink-soft">{t('photo.processing_hint')}</Text>
        </View>
      )}

      {phase === 'preview' && preview && (
        <View className="items-center">
          <Text className="mb-2 text-xs font-bold text-primary-dark">{t('photo.result_ready')}</Text>
          <Image
            source={{ uri: preview }}
            style={{ width: 140, height: 180 }}
            className="rounded-xl border border-primary/30"
          />
          <View className="mt-3 w-full gap-2">
            <Pressable onPress={confirm} className="rounded-full bg-primary py-3.5 active:opacity-85">
              <Text className="text-center font-bold text-white">{t('photo.use_this')}</Text>
            </Pressable>
            <Pressable onPress={() => setPhase('idle')} className="rounded-full border border-ink-soft/30 py-3">
              <Text className="text-center font-semibold text-ink">{t('photo.retake')}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {phase === 'idle' && (
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => acquire('camera')}
            className="flex-1 items-center rounded-full bg-primary py-3.5 active:opacity-85"
          >
            <Text className="font-bold text-white">📷 {t('photo.capture')}</Text>
          </Pressable>
          <Pressable
            onPress={() => acquire('library')}
            className="flex-1 items-center rounded-full border border-primary py-3.5 active:opacity-80"
          >
            <Text className="font-bold text-primary">🖼️ {t('photo.upload')}</Text>
          </Pressable>
        </View>
      )}

      {error && <Text className="mt-2 text-xs font-semibold text-red-600">{error}</Text>}
    </View>
  );
}
