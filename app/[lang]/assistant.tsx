/**
 * المساعد الذكي "مرشد إيدولينك":
 * محادثة تستدعي Edge Function التي تبني سياق الطالب الحقيقي
 * (طلباته ومستنداته ومراحله) وتستدعي Claude API — فيجيب بدقة وبلغة الطالب.
 */
import React, { useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAssistant } from '@/hooks/useAssistant';

export default function AssistantScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { messages, send, sending, error } = useAssistant();
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  const suggestions: string[] = t('assistant.suggestions', { returnObjects: true }) as string[];

  const submit = () => {
    if (!text.trim()) return;
    send(text);
    setText('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-muted">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-row items-center gap-3 bg-surface p-4">
          <Pressable onPress={() => router.back()}><Text className="text-xl text-ink">‹</Text></Pressable>
          <View>
            <Text className="font-extrabold text-ink">✨ {t('assistant.title')}</Text>
            <Text className="text-[11px] text-ink-soft">{t('assistant.subtitle')}</Text>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerClassName="gap-3 p-4"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View className="gap-2">
              <Text className="mb-1 text-center text-xs text-ink-soft">{t('assistant.empty')}</Text>
              {suggestions.map((s) => (
                <Pressable key={s} onPress={() => send(s)} className="rounded-2xl bg-surface p-3 active:opacity-80">
                  <Text className="text-sm text-primary-dark">{s}</Text>
                </Pressable>
              ))}
            </View>
          }
          renderItem={({ item }) => (
            <View
              className={`max-w-[85%] rounded-2xl p-3 ${
                item.role === 'user' ? 'self-end bg-primary' : 'self-start bg-surface'
              }`}
            >
              <Text className={`text-sm leading-6 ${item.role === 'user' ? 'text-white' : 'text-ink'}`}>
                {item.content}
              </Text>
            </View>
          )}
          ListFooterComponent={
            <>
              {sending && <Text className="mt-2 text-xs text-ink-soft">{t('assistant.typing')}</Text>}
              {error && <Text className="mt-2 text-xs text-red-600">{t('common.error_network')}</Text>}
            </>
          }
        />

        <View className="flex-row items-center gap-2 bg-surface p-3">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('assistant.placeholder')}
            onSubmitEditing={submit}
            className="flex-1 rounded-full bg-surface-muted px-4 py-3 text-ink"
          />
          <Pressable
            onPress={submit}
            disabled={sending}
            className={`h-11 w-11 items-center justify-center rounded-full ${sending ? 'bg-primary/40' : 'bg-primary active:opacity-85'}`}
          >
            <Text className="text-lg text-white">➤</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
