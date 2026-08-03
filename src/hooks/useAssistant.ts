/**
 * واجهة المساعد الذكي: استدعاء Edge Function (المفتاح يبقى في السيرفر)
 * وتحميل سجل المحادثة السابق من قاعدة البيانات.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';

export interface ChatMsg { role: 'user' | 'assistant'; content: string }

export function useAssistant() {
  const { i18n } = useTranslation();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // تحميل آخر 30 رسالة عند فتح الشاشة
  useEffect(() => {
    supabase.from('chat_messages')
      .select('role, content')
      .order('created_at', { ascending: true })
      .limit(30)
      .then(({ data }) => data && setMessages(data as ChatMsg[]));
  }, []);

  const send = useCallback(async (text: string) => {
    const msg = text.trim();
    if (!msg || sending) return;
    setError(null);
    setSending(true);
    setMessages((m) => [...m, { role: 'user', content: msg }]);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('assistant', {
        body: { message: msg, lang: i18n.language }
      });
      if (fnErr) throw fnErr;
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error');
      setMessages((m) => m.slice(0, -1)); // إعادة الرسالة الفاشلة لحقل الإدخال منطقياً
    } finally {
      setSending(false);
    }
  }, [sending, i18n.language]);

  return { messages, send, sending, error };
}
