/**
 * TravelAssistantScreen — Gemini destekli AI Gezi Asistanı
 *
 * Kullanıcının aktif gezi planını biliyor ve bağlamsal öneriler veriyor.
 * Açılış sırasında hazır sorular (quick replies) sunuyor.
 *
 * Props (route.params):
 *   - context: { city, days, startDate, currentDay, places, completedPlaces, remainingTime }
 */

import React, { useState, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput,
    TouchableOpacity, KeyboardAvoidingView, Platform,
    ActivityIndicator, Animated, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { askTravelAssistant } from '../../data/api/edgeFunctionApi';

// ─── Hazır sorular ─────────────────────────────────────────────────────────────
const QUICK_REPLIES = [
    { label: '1 saatim var, ne yapayım?', icon: 'time-outline' },
    { label: 'Yakında bir kafe öner', icon: 'cafe-outline' },
    { label: 'Bu şehirde mutlaka yenilmesi gereken yemek?', icon: 'restaurant-outline' },
    { label: 'Bugünkü planım için ipuçları ver', icon: 'bulb-outline' },
    { label: 'Toplu taşıma nasıl?', icon: 'bus-outline' },
    { label: 'Yarın için hava durumu önerisi?', icon: 'partly-sunny-outline' },
];

const TravelAssistantScreen = ({ route, navigation }) => {
    const context = route?.params?.context || {};

    const [messages, setMessages] = useState([
        {
            id: 0,
            role: 'assistant',
            text: context.city
                ? `Merhaba! 👋 ${context.city} geziniz için buradayım.\n\nBana seyahatinizle ilgili her şeyi sorabilirsiniz — alternatif yerler, yemek önerileri, yerel ipuçları veya boş vakit değerlendirmesi. Ne öğrenmek istersiniz?`
                : 'Merhaba! 👋 Ben gezi asistanınızım.\n\nTürkiye\'deki seyahatinizde size rehberlik edebilirim. Nerede olduğunuzu veya nasıl yardımcı olabileceğimi söyleyin!',
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [showQuickReplies, setShowQuickReplies] = useState(true);

    const scrollRef = useRef(null);
    const inputRef = useRef(null);
    const sendBtnScale = useRef(new Animated.Value(1)).current;

    // Mesajları scroll'un altına tut
    const scrollToBottom = useCallback((animated = true) => {
        setTimeout(() => {
            scrollRef.current?.scrollToEnd({ animated });
        }, 100);
    }, []);

    const animateSendBtn = () => {
        Animated.sequence([
            Animated.timing(sendBtnScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
            Animated.timing(sendBtnScale, { toValue: 1, duration: 80, useNativeDriver: true }),
        ]).start();
    };

    const sendMessage = useCallback(async (text) => {
        const trimmed = (text ?? input).trim();
        if (!trimmed || loading) return;

        animateSendBtn();
        setInput('');
        setShowQuickReplies(false);
        Keyboard.dismiss();

        const userMsg = { id: Date.now(), role: 'user', text: trimmed };
        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        scrollToBottom();

        setLoading(true);

        // Geçmiş (user + assistant alterner)
        const history = updatedMessages.slice(1).map(m => ({
            role: m.role,
            text: m.text,
        }));

        const { data, error } = await askTravelAssistant(trimmed, context, history);
        setLoading(false);

        const replyText = error
            ? '⚠️ Şu an yanıt veremiyorum. İnternet bağlantınızı kontrol edin.'
            : (data?.reply ?? 'Yanıt alınamadı.');

        setMessages(prev => [
            ...prev,
            { id: Date.now() + 1, role: 'assistant', text: replyText },
        ]);
        scrollToBottom();
    }, [input, loading, messages, context, scrollToBottom]);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <View style={styles.avatarDot} />
                    <View>
                        <Text style={styles.headerTitle}>Gezi Asistanı</Text>
                        <Text style={styles.headerSub}>
                            {context.city ? `${context.city} · ${context.days || '?'} gün` : 'AI Rehber'}
                        </Text>
                    </View>
                </View>
                <View style={styles.onlineBadge}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.onlineText}>Çevrimiçi</Text>
                </View>
            </View>

            {/* Mesajlar */}
            <ScrollView
                ref={scrollRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => scrollToBottom(false)}
            >
                {messages.map((msg) => (
                    <View
                        key={msg.id}
                        style={[
                            styles.messageBubble,
                            msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
                        ]}
                    >
                        {msg.role === 'assistant' && (
                            <View style={styles.assistantAvatar}>
                                <Text style={styles.assistantAvatarEmoji}>✈️</Text>
                            </View>
                        )}
                        <View style={[
                            styles.bubbleContent,
                            msg.role === 'user' ? styles.userBubbleContent : styles.assistantBubbleContent,
                        ]}>
                            <Text style={[
                                styles.bubbleText,
                                msg.role === 'user' ? styles.userBubbleText : styles.assistantBubbleText,
                            ]}>
                                {msg.text}
                            </Text>
                        </View>
                    </View>
                ))}

                {/* Yazıyor... göstergesi */}
                {loading && (
                    <View style={[styles.messageBubble, styles.assistantBubble]}>
                        <View style={styles.assistantAvatar}>
                            <Text style={styles.assistantAvatarEmoji}>✈️</Text>
                        </View>
                        <View style={styles.typingIndicator}>
                            <ActivityIndicator size="small" color={COLORS.primary} />
                            <Text style={styles.typingText}>Yazıyor...</Text>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Hızlı sorular */}
            {showQuickReplies && !loading && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.quickRepliesContainer}
                    style={styles.quickRepliesScroll}
                >
                    {QUICK_REPLIES.map((qr, i) => (
                        <TouchableOpacity
                            key={i}
                            style={styles.quickReplyChip}
                            onPress={() => sendMessage(qr.label)}
                            activeOpacity={0.75}
                        >
                            <Ionicons name={qr.icon} size={14} color={COLORS.primary} />
                            <Text style={styles.quickReplyText}>{qr.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            {/* Input alanı */}
            <View style={styles.inputRow}>
                <TextInput
                    ref={inputRef}
                    style={styles.input}
                    placeholder="Bir şey sorun..."
                    placeholderTextColor={COLORS.textLight}
                    value={input}
                    onChangeText={setInput}
                    multiline
                    maxLength={500}
                    returnKeyType="send"
                    onSubmitEditing={() => sendMessage()}
                />
                <Animated.View style={{ transform: [{ scale: sendBtnScale }] }}>
                    <TouchableOpacity
                        style={[
                            styles.sendBtn,
                            (!input.trim() || loading) && styles.sendBtnDisabled,
                        ]}
                        onPress={() => sendMessage()}
                        disabled={!input.trim() || loading}
                        activeOpacity={0.85}
                    >
                        <Ionicons
                            name="send"
                            size={18}
                            color={(!input.trim() || loading) ? COLORS.textLight : '#fff'}
                        />
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    // ─── Header ───
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingTop: Platform.OS === 'ios' ? 52 : 16,
        paddingBottom: SPACING.md,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        gap: SPACING.sm,
    },
    backBtn: { padding: 4 },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    avatarDot: {
        width: 36, height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
    },
    headerSub: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 1,
    },
    onlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    onlineDot: {
        width: 7, height: 7,
        borderRadius: 3.5,
        backgroundColor: COLORS.success,
    },
    onlineText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.success,
    },

    // ─── Mesajlar ───
    messagesContainer: { flex: 1 },
    messagesContent: {
        padding: SPACING.md,
        paddingBottom: SPACING.sm,
        gap: SPACING.sm,
    },
    messageBubble: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: SPACING.xs,
        marginBottom: 4,
    },
    userBubble: {
        justifyContent: 'flex-end',
    },
    assistantBubble: {
        justifyContent: 'flex-start',
    },
    assistantAvatar: {
        width: 30, height: 30,
        borderRadius: 15,
        backgroundColor: COLORS.primaryMuted,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
    },
    assistantAvatarEmoji: { fontSize: 15 },
    bubbleContent: {
        maxWidth: '78%',
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
        paddingVertical: 10,
    },
    userBubbleContent: {
        backgroundColor: COLORS.primary,
        borderBottomRightRadius: 4,
    },
    assistantBubbleContent: {
        backgroundColor: COLORS.surface,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    bubbleText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        lineHeight: 20,
    },
    userBubbleText: { color: '#fff' },
    assistantBubbleText: { color: COLORS.textPrimary },

    // ─── Yazıyor göstergesi ───
    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    typingText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },

    // ─── Hızlı Sorular ───
    quickRepliesScroll: { maxHeight: 52 },
    quickRepliesContainer: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        gap: SPACING.xs,
        alignItems: 'center',
    },
    quickReplyChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.full,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderWidth: 1.5,
        borderColor: COLORS.primary + '40',
    },
    quickReplyText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.primary,
        maxWidth: 200,
    },

    // ─── Input ───
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    input: {
        flex: 1,
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
        paddingVertical: 10,
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
        maxHeight: 100,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    sendBtn: {
        width: 42, height: 42,
        borderRadius: 21,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendBtnDisabled: {
        backgroundColor: COLORS.surfaceAlt,
    },
});

export default TravelAssistantScreen;
