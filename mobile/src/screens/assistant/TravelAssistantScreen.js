import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput,
    TouchableOpacity, KeyboardAvoidingView, Platform,
    ActivityIndicator, Animated, Keyboard,
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

const getQuickReplies = (context) => {
    if (context?.screen === 'itinerary' && context?.city) {
        return [
            { label: 'Rotamı optimize eder misin?', icon: 'git-branch-outline' },
            { label: '1 saatim var, ne yapayım?', icon: 'time-outline' },
            { label: 'Yakında bir kafe öner', icon: 'cafe-outline' },
            { label: `${context.city}'de mutlaka yenilmesi gereken yemek?`, icon: 'restaurant-outline' },
        ];
    }
    if (context?.screen === 'city' && context?.city) {
        return [
            { label: `${context.city}'de en önemli 5 yer?`, icon: 'map-outline' },
            { label: 'Yerel lezzetler neler?', icon: 'restaurant-outline' },
            { label: 'Bütçe dostu seçenekler?', icon: 'wallet-outline' },
            { label: 'Kaç gün ayırmalıyım?', icon: 'calendar-outline' },
        ];
    }
    return [
        { label: "İstanbul'da ne yapmalıyım?", icon: 'map-outline' },
        { label: 'Bütçe seyahat önerileri', icon: 'wallet-outline' },
        { label: 'En popüler şehirler?', icon: 'star-outline' },
        { label: 'Toplu taşıma nasıl?', icon: 'bus-outline' },
    ];
};

export default function TravelAssistantScreen({ route, navigation }) {
    const { context: globalContext } = useAssistantContext();
    const routeContext = route?.params?.context || {};
    const context = Object.keys(routeContext).length > 0 ? routeContext : globalContext;
    const insets = useSafeAreaInsets();

    const getWelcomeMessage = () => {
        if (context?.screen === 'itinerary' && context?.city) {
            return `Merhaba! ✈️ ${context.city} gezini takip ediyorum.\n\n${context.days} günlük planında ${context.totalPlaces || 0} yer var. Rota optimizasyonu, alternatif öneriler veya yakın mekanlar hakkında soru sorabilirsin!`;
        }
        if (context?.screen === 'city' && context?.city) {
            return `Merhaba! ✈️ ${context.city} hakkında sana yardımcı olmak için buradayım.\n\nGezilecek yerler, yemek önerileri, ulaşım veya konaklama hakkında sorabilirsin!`;
        }
        return "Merhaba! ✈️ Ben gezi asistanınım.\n\nTürkiye'deki seyahatinde sana rehberlik edebilirim. Ne öğrenmek istersin?";
    };

    const [messages, setMessages] = useState([
        { id: 0, role: 'assistant', text: getWelcomeMessage() },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [showQuickReplies, setShowQuickReplies] = useState(true);
    const [weatherContext, setWeatherContext] = useState(null);

    const scrollRef = useRef(null);
    const inputRef = useRef(null);
    const sendBtnScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!context.city) return;
        getWeatherForecast(context.city).then(({ data }) => {
            if (!data || data.length === 0) return;
            const today = data[0];
            const forecast = data.map(d =>
                `${d.date}: ${d.label} ${d.emoji}, ${d.tempMin}-${d.tempMax}°C, yağış %${d.rainChance}`
            ).join(' | ');
            setWeatherContext(
                `GÜNCEL HAVA DURUMU: Bugün ${today.label} ${today.emoji}, ` +
                `${today.tempMin}-${today.tempMax}°C, yağış ihtimali %${today.rainChance}. ` +
                `5 günlük tahmin: ${forecast}.`
            );
        });
    }, [context.city]);

    const scrollToBottom = useCallback((animated = true) => {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated }), 100);
    }, []);

    const animateSend = () => {
        Animated.sequence([
            Animated.timing(sendBtnScale, { toValue: 0.88, duration: 70, useNativeDriver: true }),
            Animated.timing(sendBtnScale, { toValue: 1, duration: 70, useNativeDriver: true }),
        ]).start();
    };

    const handleBack = () => {
        if (navigation.canGoBack()) { navigation.goBack(); return; }
        navigation.navigate('Home');
    };

    const sendMessage = useCallback(async (text) => {
        const trimmed = (text ?? input).trim();
        if (!trimmed || loading) return;

        animateSend();
        setInput('');
        setShowQuickReplies(false);
        Keyboard.dismiss();

        const userMsg = { id: Date.now(), role: 'user', text: trimmed };
        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        scrollToBottom();
        setLoading(true);

        const history = updatedMessages.slice(1).map(m => ({ role: m.role, text: m.text }));
        const enrichedContext = weatherContext ? { ...context, weatherInfo: weatherContext } : context;

        const { data, error } = await askTravelAssistant(trimmed, enrichedContext, history);
        setLoading(false);

        const replyText = error
            ? '⚠️ Şu an yanıt veremiyorum. İnternet bağlantınızı kontrol edin.'
            : (data?.reply ?? 'Yanıt alınamadı.');

        setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: replyText }]);
        scrollToBottom();
    }, [input, loading, messages, context, scrollToBottom, weatherContext]);

    const quickReplies = getQuickReplies(context);

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <View style={styles.avatarWrap}>
                        <LinearGradient
                            colors={COLORS.gradients.primary}
                            style={styles.avatar}
                        >
                            <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                        </LinearGradient>
                        <View style={styles.onlineDot} />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Gezi Asistanı</Text>
                        <Text style={styles.headerSub}>
                            {context.city ? `${context.city} · ${context.days || '?'} gün` : 'Seyahat yardımı'}
                        </Text>
                    </View>
                </View>
            </View>

            <AssistantSummary context={context} />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {/* Mesajlar */}
                <ScrollView
                    ref={scrollRef}
                    style={styles.messages}
                    contentContainerStyle={styles.messagesContent}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => scrollToBottom(false)}
                >
                    {messages.map((msg) => (
                        <MessageBubble key={msg.id} msg={msg} />
                    ))}

                    {loading && (
                        <View style={styles.typingRow}>
                            <View style={styles.typingAvatar}>
                                <Ionicons name="chatbubble-ellipses" size={14} color={COLORS.primary} />
                            </View>
                            <View style={styles.typingBubble}>
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
                        contentContainerStyle={styles.quickReplies}
                        style={styles.quickRepliesWrap}
                    >
                        {quickReplies.map((qr, i) => (
                            <TouchableOpacity
                                key={i}
                                style={styles.chip}
                                onPress={() => sendMessage(qr.label)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name={qr.icon} size={13} color={COLORS.primary} />
                                <Text style={styles.chipText}>{qr.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* Input */}
                <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, SPACING.sm) }]}>
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
                            onPress={() => sendMessage()}
                            disabled={!input.trim() || loading}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={input.trim() && !loading ? COLORS.gradients.primary : [COLORS.border, COLORS.border]}
                                style={styles.sendBtn}
                            >
                                <Ionicons
                                    name="send"
                                    size={17}
                                    color={input.trim() && !loading ? '#fff' : COLORS.textLight}
                                />
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const AssistantSummary = React.memo(({ context }) => {
    const mode = context?.screen === 'itinerary' ? 'Plan modu' : context?.screen === 'city' ? 'Şehir modu' : 'Rehber modu';
    const detail = context?.screen === 'itinerary'
        ? `${context.completedCount || 0}/${context.totalPlaces || 0} durak tamamlandı`
        : (context?.city ? `${context.city} önerileri` : 'Türkiye gezi önerileri');

    return (
        <View style={styles.summaryBand}>
            <View style={styles.summaryItem}>
                <Ionicons name="navigate-circle-outline" size={17} color={COLORS.primary} />
                <View style={styles.summaryTextWrap}>
                    <Text style={styles.summaryLabel}>{mode}</Text>
                    <Text style={styles.summaryValue} numberOfLines={1}>{detail}</Text>
                </View>
            </View>
            <View style={styles.localBadge}>
                <Ionicons name="phone-portrait-outline" size={13} color={COLORS.primaryDark} />
                <Text style={styles.localBadgeText}>Yerel</Text>
            </View>
        </View>
    );
});

const MessageBubble = React.memo(({ msg }) => {
    const isUser = msg.role === 'user';
    return (
        <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAssistant]}>
            {!isUser && (
                <View style={styles.msgAvatar}>
                    <Ionicons name="chatbubble-ellipses" size={14} color={COLORS.primary} />
                </View>
            )}
            <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
                <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant]}>
                    {msg.text}
                </Text>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    // ─── Header ───
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        gap: SPACING.sm,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    avatarWrap: { position: 'relative' },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
    onlineDot: {
        position: 'absolute',
        bottom: -1,
        right: -1,
        width: 11,
        height: 11,
        borderRadius: 6,
        backgroundColor: COLORS.success,
        borderWidth: 2,
        borderColor: COLORS.surface,
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
    summaryBand: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.md,
        paddingVertical: 10,
        backgroundColor: COLORS.surfaceAlt,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    summaryItem: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    summaryTextWrap: {
        flex: 1,
        minWidth: 0,
    },
    summaryLabel: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textPrimary,
    },
    summaryValue: {
        marginTop: 1,
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },
    localBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 9,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.primaryMuted,
    },
    localBadgeText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.xs,
        color: COLORS.primaryDark,
    },
    // ─── Mesajlar ───
    messages: { flex: 1, backgroundColor: COLORS.background },
    messagesContent: {
        padding: SPACING.md,
        paddingBottom: SPACING.sm,
        gap: SPACING.sm,
    },
    msgRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: SPACING.xs,
        marginBottom: 2,
    },
    msgRowUser: { justifyContent: 'flex-end' },
    msgRowAssistant: { justifyContent: 'flex-start' },
    msgAvatar: {
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: COLORS.primaryMuted,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
    },
    bubble: {
        maxWidth: '78%',
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
        paddingVertical: 10,
    },
    bubbleUser: {
        backgroundColor: COLORS.primary,
        borderBottomRightRadius: 4,
    },
    bubbleAssistant: {
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
    bubbleTextUser: { color: '#fff' },
    bubbleTextAssistant: { color: COLORS.textPrimary },

    // ─── Typing ───
    typingRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: SPACING.xs,
        marginBottom: 2,
    },
    typingAvatar: {
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: COLORS.primaryMuted,
        justifyContent: 'center',
        alignItems: 'center',
    },
    typingBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        borderBottomLeftRadius: 4,
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

    // ─── Quick Replies ───
    quickRepliesWrap: {
        maxHeight: 50,
        backgroundColor: COLORS.background,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    quickReplies: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs + 2,
        gap: SPACING.xs,
        alignItems: 'center',
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.primaryMuted,
        borderWidth: 1,
        borderColor: COLORS.primary + '25',
    },
    chipText: {
        fontFamily: FONTS.bodyMedium,
        fontSize: FONT_SIZES.xs,
        color: COLORS.primary,
    },

    // ─── Input ───
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    input: {
        flex: 1,
        backgroundColor: COLORS.background,
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
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
