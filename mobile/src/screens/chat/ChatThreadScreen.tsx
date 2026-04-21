/**
 * ChatThreadScreen — message thread for a single conversation.
 *
 * Renders messages as chat bubbles (mine = right/primary, others =
 * left/neutral). Bottom input bar with auto-resize. Polls for new
 * messages every 5s when focused, and calls markRead on mount.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { chat, type Message } from '../../services/modules';

const POLL_MS = 5000;

function displayName(p: any): string {
  if (!p) return '—';
  return (
    p.firstName_ar ||
    p.name ||
    `${p.firstName || ''} ${p.lastName || ''}`.trim() ||
    p.email ||
    '—'
  );
}

function initial(s: string) {
  return (s || '?').trim().charAt(0);
}

function formatTime(d?: string): string {
  if (!d) return '';
  try {
    const dt = new Date(d);
    const now = new Date();
    if (dt.toDateString() === now.toDateString()) {
      return dt.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    }
    return dt.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function ChatThreadScreen({
  conversationId,
  otherName,
  onBack,
}: {
  conversationId: string;
  otherName?: string;
  onBack?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState<string>('');

  const scrollRef = useRef<ScrollView>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageIdRef = useRef<string>('');

  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync('currentUser');
        if (raw) {
          const u = JSON.parse(raw);
          setMyId(String(u?.id || u?._id || ''));
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (!conversationId) return;
      if (!silent) setError('');
      try {
        const { items } = await chat.messages(conversationId, undefined, 100);
        setMessages(_prev => {
          // Preserve scroll position if last-id hasn't changed
          const newLast = items[items.length - 1]?._id || '';
          if (newLast !== lastMessageIdRef.current) {
            lastMessageIdRef.current = newLast;
            requestAnimationFrame(() =>
              scrollRef.current?.scrollToEnd({ animated: !silent })
            );
          }
          return items;
        });
        await chat.markRead(conversationId);
      } catch (e: any) {
        if (!silent) setError(e?.response?.data?.message || 'تعذّر تحميل الرسائل');
      }
    },
    [conversationId]
  );

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
    pollRef.current = setInterval(() => load(true), POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !conversationId || sending) return;
    setSending(true);
    try {
      const m = await chat.send(conversationId, text);
      setMessages(prev => [...prev, m]);
      lastMessageIdRef.current = m._id;
      setDraft('');
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    } catch (e: any) {
      Alert.alert('خطأ', e?.response?.data?.message || 'فشل الإرسال');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>{initial(otherName || '?')}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerName}>{otherName || 'محادثة'}</Text>
          <Text style={styles.headerStatus}>نشط</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBar}>
          <Text style={styles.errorBarText}>{error}</Text>
        </View>
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        {loading && messages.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#1976d2" />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.thread}
            contentContainerStyle={styles.threadContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyThread}>
                <Text style={styles.emptyThreadIcon}>💬</Text>
                <Text style={styles.emptyThreadText}>
                  لا توجد رسائل بعد. كن أوّل من يكتب.
                </Text>
              </View>
            ) : null}

            {messages.map(m => {
              const mine = String(m.sender?._id || (m as any).sender) === myId;
              return (
                <View
                  key={m._id}
                  style={[
                    styles.bubbleRow,
                    mine ? styles.bubbleRowMine : styles.bubbleRowOther,
                  ]}
                >
                  {!mine && (
                    <View style={styles.bubbleAvatar}>
                      <Text style={styles.bubbleAvatarText}>
                        {initial(displayName(m.sender))}
                      </Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      mine ? styles.bubbleMine : styles.bubbleOther,
                    ]}
                  >
                    {!mine && (
                      <Text style={styles.bubbleSender}>{displayName(m.sender)}</Text>
                    )}
                    <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
                      {m.content?.text || ''}
                    </Text>
                    <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
                      {formatTime(m.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="اكتب رسالتك…"
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={5000}
            textAlign="right"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!draft.trim() || sending) && { opacity: 0.5 }]}
            onPress={send}
            disabled={!draft.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendIcon}>➤</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: { padding: 8 },
  backIcon: { fontSize: 28, color: '#1976d2' },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1976d2',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  headerAvatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerText: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '600', color: '#111827', textAlign: 'right' },
  headerStatus: { fontSize: 12, color: '#16a34a', textAlign: 'right' },
  errorBar: { backgroundColor: '#fee2e2', padding: 8 },
  errorBarText: { color: '#991b1b', textAlign: 'center' },
  kav: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  thread: { flex: 1 },
  threadContent: { padding: 12 },
  emptyThread: { padding: 40, alignItems: 'center' },
  emptyThreadIcon: { fontSize: 48, marginBottom: 12 },
  emptyThreadText: { color: '#6b7280', textAlign: 'center' },
  bubbleRow: {
    flexDirection: 'row-reverse',
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowOther: { justifyContent: 'flex-start', flexDirection: 'row' },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  bubbleAvatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  bubble: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleMine: {
    backgroundColor: '#1976d2',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  bubbleSender: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1976d2',
    marginBottom: 2,
    textAlign: 'right',
  },
  bubbleText: { fontSize: 14, color: '#111827', lineHeight: 20, textAlign: 'right' },
  bubbleTextMine: { color: '#fff' },
  bubbleTime: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'left',
  },
  bubbleTimeMine: { color: '#bfdbfe' },
  composer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    backgroundColor: '#f9fafb',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1976d2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sendIcon: { color: '#fff', fontSize: 18, transform: [{ rotate: '180deg' }] },
});
