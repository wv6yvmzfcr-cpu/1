/**
 * يجلب اللغات والعملات المتاحة من Supabase عند الإقلاع.
 * إضافة لغة/عملة جديدة في قاعدة البيانات = تظهر تلقائياً في التطبيق.
 * كما يدير تبديل اللغة مع معالجة RTL/LTR الكاملة.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { I18nManager, Alert } from 'react-native';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { supabase, type Language, type Currency } from '@/lib/supabase';
import i18n, { LANG_STORAGE_KEY } from '@/i18n';

const CURRENCY_STORAGE_KEY = 'app_currency';

interface Ctx {
  languages: Language[];
  currencies: Currency[];
  currency: Currency | null;
  setLanguage: (code: string) => Promise<void>;
  setCurrency: (code: string) => Promise<void>;
}

const SettingsContext = createContext<Ctx | null>(null);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [currency, setCurrencyState] = useState<Currency | null>(null);

  useEffect(() => {
    (async () => {
      // اللغات النشطة — مصدر قائمة اختيار اللغة في الملف الشخصي
      const [langsRes, currRes] = await Promise.all([
        supabase.from('languages').select('*').order('sort_order'),
        supabase.from('currencies').select('*').order('sort_order')
      ]);
      if (langsRes.data) setLanguages(langsRes.data);
      if (currRes.data) {
        setCurrencies(currRes.data);
        const savedCode = (await AsyncStorage.getItem(CURRENCY_STORAGE_KEY)) ?? 'SAR';
        setCurrencyState(currRes.data.find((c) => c.code === savedCode) ?? currRes.data[0]);
      }
    })();
  }, []);

  /** تبديل اللغة مع قلب الاتجاه RTL/LTR عند الحاجة */
  const setLanguage = useCallback(
    async (code: string) => {
      const lang = languages.find((l) => l.code === code);
      await AsyncStorage.setItem(LANG_STORAGE_KEY, code);
      await i18n.changeLanguage(code);

      const needsRTL = lang?.is_rtl ?? false;
      if (I18nManager.isRTL !== needsRTL) {
        // قلب الاتجاه يتطلب إعادة تشغيل — نُعلم المستخدم بلطف
        I18nManager.allowRTL(needsRTL);
        I18nManager.forceRTL(needsRTL);
        Alert.alert('', t('common.restart_needed'), [
          { text: 'OK', onPress: () => Updates.reloadAsync() }
        ]);
      }
      // مزامنة التفضيل مع الملف الشخصي إن كان المستخدم مسجلاً
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await supabase.from('profiles').update({ preferred_lang: code }).eq('id', data.user.id);
      }
    },
    [languages, t]
  );

  const setCurrency = useCallback(
    async (code: string) => {
      const c = currencies.find((x) => x.code === code);
      if (!c) return;
      await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, code);
      setCurrencyState(c);
    },
    [currencies]
  );

  return (
    <SettingsContext.Provider value={{ languages, currencies, currency, setLanguage, setCurrency }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useAppSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used inside AppSettingsProvider');
  return ctx;
}
