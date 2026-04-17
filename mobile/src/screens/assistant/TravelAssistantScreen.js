/**
 * TravelAssistantScreen — Gemini destekli AI Gezi Asistanı
 *
 * Kullanıcının aktif gezi planını biliyor ve bağlamsal öneriler veriyor.
 * Açılış sırasında hazır sorular (quick replies) sunuyor.
 *
 * Props (route.params):
 *   - context: { city, days, startDate, currentDay, places, completedPlaces, remainingTime }
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput,
    TouchableOpacity, KeyboardAvoidingView, Platform,
    ActivityIndicator, Animated, Keyboard, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import { askTravelAssistant } from '../../data/api/edgeFunctionApi';
import { getWeatherForecast } from '../../services/weatherService';
import { useAssistantContext } from '../../contexts/AssistantContext';

// ─── Hazır sorular (bağlama göre dinamik)──────────────────────────────────────
const getQuickReplies = (context) => {
    if (context?.screen === 'itinerary' && context?.city) {
        return [
            { label: 'Rotamı optimize eder misin?', icon: 'git-branch-outline' },
            { label: '1 saatim var, ne yapayım?', icon: 'time-outline' },
            { label: 'Yakında bir kafe öner', icon: 'cafe-outline' },
            { label: 'Hangi yerler atlanabilir?', icon: 'close-circle-outline' },
            { label: `${context.city}'de mutlaka yenilmesi gereken yemek?`, icon: 'restaurant-outline' },
            { label: 'Hava durumu için önerin?', icon: 'partly-sunny-outline' },
        ];
    }
    if (context?.screen === 'city' && context?.city) {
        return [
            { label: `${context.city}'de en önemli 5 yer?`, icon: 'map-outline' },
            { label: 'Yerel lezzetler neler?', icon: 'restaurant-outline' },
            { label: 'Bütçe dostu seçenekler?', icon: 'wallet-outline' },
            { label: 'Nasıl ulaşabilirim?', icon: 'bus-outline' },
            { label: 'Gizli kalmış yerler?', icon: 'eye-off-outline' },
            { label: 'Kaç gün ayırmalıyım?', icon: 'calendar-outline' },
        ];
    }
    return [
        { label: 'İstanbul\'da ne yapmalıyım?', icon: 'map-outline' },
        { label: 'Bütçe seyahat önerileri', icon: 'wallet-outline' },
        { label: 'En popüler şehirler?', icon: 'star-outline' },
        { label: 'Yakında bir kafe öner', icon: 'cafe-outline' },
        { label: 'Toplu taşıma nasıl?', icon: 'bus-outline' },
        { label: 'Hava durumu önerisi?', icon: 'partly-sunny-outline' },
    ];
};

const TravelAssistantScreen = ({ route, navigation }) => {
    // route.params.context (direkt navigate) + AssistantContext (floating button)
    const { context: globalContext } = useAssistantContext();
    const routeContext = route?.params?.context || {};
    // Merge: direkt navigate baskın gelir
    const context = Object.keys(routeContext).length > 0 ? routeContext : globalContext;
    const insets = useSafeAreaInsets();

    const getWelcomeMessage = () => {
        if (context?.screen === 'itinerary' && context?.city) {
            const progress = context.totalPlaces > 0
                ? ` ${context.completedCount || 0}/${context.totalPlaces} yeri tamamladın.`
                : '';
            return `Merhaba! 🐱 ${context.city} gezinı takip ediyorum.\n\n${context.days} günlük planında ${context.totalPlaces || 0} yer var.${progress}\n\nRota optimizasyonu, alternatif öneriler veya yakın mekanlar hakkında soru sorabilirsin!`;
        }
        if (context?.screen === 'city' && context?.city) {
            return `Merhaba! 🐱 ${context.city} hakkında sana yardımcı olmak için buradayım.\n\nGezilecek yerler, yemek önerileri, ulaşım veya konaklama hakkında sorabilirsin!`;
        }
        return 'Merhaba! 🐱 Ben gezi asistanınım.\n\nTürkiye\'deki seyahatinde sana rehberlik edebilirim. Nerede olduğunu veya nasıl yardımcı olabileceğimi söyle!';
    };

    const [messages, setMessages] = useState([
        {
            id: 0,
            role: 'assistant',
            text: getWelcomeMessage(),
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [showQuickReplies, setShowQuickReplies] = useState(true);
    // Gerçek hava verisi — Gemini'ye context olarak iletiliyor
    const [weatherContext, setWeatherContext] = useState(null);

    const scrollRef = useRef(null);
    const inputRef = useRef(null);
    const sendBtnScale = useRef(new Animated.Value(1)).current;

    // Açılışta gerçek hava verisini çek
    useEffect(() => {
        if (!context.city) return;
        getWeatherForecast(context.city).then(({ data }) => {
            if (!data || data.length === 0) return;
            const today = data[0];
            const forecast = data.map(d =>
                `${d.date}: ${d.label} ${d.emoji}, ${d.tempMin}-${d.tempMax}°C, yağış %${d.rainChance}`
            ).join(' | ');
            setWeatherContext(
                `GÜNCEL HAVA DURUMU (Open-Meteo gerçek verisi): Bugün ${today.label} ${today.emoji}, ` +
                `${today.tempMin}-${today.tempMax}°C, yağış ihtimali %${today.rainChance}. ` +
                `5 günlük tahmin: ${forecast}. ` +
                `Bu veriyi kullan, tahmin etme!`
            );
        });
    }, [context.city]);

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

    const handleBack = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
            return;
        }
        const parent = navigation.getParent?.();
        if (parent) {
            parent.navigate('Home');
            return;
        }
        navigation.navigate('Home');
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

        const history = updatedMessages.slice(1).map(m => ({
            role: m.role,
            text: m.text,
        }));

        // Hava verisini context'e ekle (varsa)
        const enrichedContext = weatherContext
            ? { ...context, weatherInfo: weatherContext }
            : context;

        const { data, error } = await askTravelAssistant(trimmed, enrichedContext, history);
        setLoading(false);

        const replyText = error
            ? '⚠️ Şu an yanıt veremiyorum. İnternet bağlantınızı kontrol edin.'
            : (data?.reply ?? 'Yanıt alınamadı.');

        setMessages(prev => [
            ...prev,
            { id: Date.now() + 1, role: 'assistant', text: replyText },
        ]);
        scrollToBottom();
    }, [input, loading, messages, context, scrollToBottom, weatherContext]);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {/* Premium Header */}
            <LinearGradient
                colors={['#0f0c29', '#302b63', '#24243e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + SPACING.xs }]}
            >
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={handleBack}
                >
                    <View style={styles.backBtnInner}>
                        <Ionicons name="arrow-back" size={20} color="#fff" />
                    </View>
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <View style={styles.avatarWrap}>
                        <LinearGradient
                            colors={['#667eea', '#764ba2']}
                            style={styles.avatarGradient}
                        >
                            <Text style={styles.avatarEmoji}>🐱</Text>
                        </LinearGradient>
                        <View style={styles.onlinePulse} />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Gezi Asistanı</Text>
                        <View style={styles.headerSubRow}>
                            <View style={styles.onlineDot} />
                            <Text style={styles.headerSub}>
                                {context.city ? `${context.city} · ${context.days || '?'} gün` : 'Hazır'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.geminiTag}>
                    <Text style={styles.geminiText}>✨ AI</Text>
                </View>
            </LinearGradient>

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
                            <LinearGradient
                                colors={['#667eea', '#764ba2']}
                                style={styles.assistantAvatar}
                            >
                                <Text style={styles.assistantAvatarEmoji}>🐱</Text>
                            </LinearGradient>
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
                    {getQuickReplies(context).map((qr, i) => (
                        <TouchableOpacity
                            key={i}
                            style={styles.quickReplyChip}
                            onPress={() => sendMessage(qr.label)}
                            activeOpacity={0.75}
                        >
                            <LinearGradient
                                colors={['rgba(102,126,234,0.15)', 'rgba(118,75,162,0.15)']}
                                style={styles.quickReplyGradient}
                            >
                                <Ionicons name={qr.icon} size={13} color="#667eea" />
                                <Text style={styles.quickReplyText}>{qr.label}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            {/* Input alanı */}
            <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, SPACING.sm) }]}>
                <TextInput
                    ref={inputRef}
                    style={styles.input}
                    placeholder="Bir şey sorun..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
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
                        <LinearGradient
                            colors={input.trim() && !loading ? ['#667eea', '#764ba2'] : ['#2a2a3e', '#2a2a3e']}
                            style={styles.sendBtnGradient}
                        >
                            <Ionicons
                                name="send"
                                size={17}
                                color={(!input.trim() || loading) ? 'rgba(255,255,255,0.25)' : '#fff'}
                            />
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0d0d1a' },

    // ─── Premium Header ───
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.md,
        gap: SPACING.sm,
    },
    backBtn: { marginRight: 2 },
    backBtnInner: {
        width: 36, height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    avatarWrap: {
        position: 'relative',
    },
    avatarGradient: {
        width: 42, height: 42,
        borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
    },
    avatarEmoji: { fontSize: 22 },
    onlinePulse: {
        position: 'absolute',
        bottom: -1, right: -1,
        width: 12, height: 12,
        borderRadius: 6,
        backgroundColor: '#4CAF50',
        borderWidth: 2,
        borderColor: '#0f0c29',
    },
    headerTitle: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.md,
        color: '#fff',
    },
    headerSubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    onlineDot: {
        width: 6, height: 6,
        borderRadius: 3,
        backgroundColor: '#4CAF50',
    },
    headerSub: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.55)',
    },
    geminiTag: {
        backgroundColor: 'rgba(102,126,234,0.25)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: BORDER_RADIUS.full,
        borderWidth: 1,
        borderColor: 'rgba(102,126,234,0.4)',
    },
    geminiText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 11,
        color: '#a78bfa',
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
    userBubble: { justifyContent: 'flex-end' },
    assistantBubble: { justifyContent: 'flex-start' },
    assistantAvatar: {
        width: 32, height: 32,
        borderRadius: 11,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 2,
    },
    assistantAvatarEmoji: { fontSize: 16 },
    bubbleContent: {
        maxWidth: '78%',
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
        paddingVertical: 10,
    },
    userBubbleContent: {
        backgroundColor: '#667eea',
        borderBottomRightRadius: 4,
    },
    assistantBubbleContent: {
        backgroundColor: '#1a1a2e',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
    },
    bubbleText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        lineHeight: 20,
    },
    userBubbleText: { color: '#fff' },
    assistantBubbleText: { color: 'rgba(255,255,255,0.9)' },

    // ─── Typing ───
    typingIndicator: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#1a1a2e',
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md, paddingVertical: 10,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    },
    typingText: {
        fontFamily: FONTS.body, fontSize: FONT_SIZES.sm,
        color: 'rgba(255,255,255,0.5)',
    },

    // ─── Quick Replies ───
    quickRepliesScroll: { maxHeight: 52 },
    quickRepliesContainer: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        gap: SPACING.xs,
        alignItems: 'center',
    },
    quickReplyChip: {
        borderRadius: BORDER_RADIUS.full,
        overflow: 'hidden',
    },
    quickReplyGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: BORDER_RADIUS.full,
        borderWidth: 1,
        borderColor: 'rgba(102,126,234,0.3)',
    },
    quickReplyText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: '#a78bfa',
        maxWidth: 200,
    },

    // ─── Input ───
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.sm,
        backgroundColor: '#111120',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
    },
    input: {
        flex: 1,
        backgroundColor: '#1a1a2e',
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
        paddingVertical: 10,
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: '#fff',
        maxHeight: 100,
        borderWidth: 1,
        borderColor: 'rgba(102,126,234,0.25)',
    },
    sendBtn: {
        width: 44, height: 44,
        borderRadius: 15,
        overflow: 'hidden',
    },
    sendBtnGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendBtnDisabled: {},
});

export default TravelAssistantScreen;
