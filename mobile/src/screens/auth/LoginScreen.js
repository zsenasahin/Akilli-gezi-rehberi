import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Animated,
    Easing,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';
import { signIn, signInWithGoogle, signInWithApple, sendPasswordReset } from '../../services/authService';
import { isValidEmail, isValidPassword } from '../../utils/validators';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Floating orbs animasyonu ───────────────────────────────────────────────
const FloatingOrb = ({ size, startX, startY, delay, color }) => {
    const translateY = useRef(new Animated.Value(0)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.6)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animateOrb = () => {
            Animated.parallel([
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(translateY, {
                            toValue: -40,
                            duration: 3000 + Math.random() * 2000,
                            easing: Easing.inOut(Easing.sin),
                            useNativeDriver: true,
                        }),
                        Animated.timing(translateY, {
                            toValue: 40,
                            duration: 3000 + Math.random() * 2000,
                            easing: Easing.inOut(Easing.sin),
                            useNativeDriver: true,
                        }),
                    ]),
                ),
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(translateX, {
                            toValue: 20,
                            duration: 4000 + Math.random() * 2000,
                            easing: Easing.inOut(Easing.sin),
                            useNativeDriver: true,
                        }),
                        Animated.timing(translateX, {
                            toValue: -20,
                            duration: 4000 + Math.random() * 2000,
                            easing: Easing.inOut(Easing.sin),
                            useNativeDriver: true,
                        }),
                    ]),
                ),
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(scale, {
                            toValue: 1.2,
                            duration: 3500,
                            easing: Easing.inOut(Easing.sin),
                            useNativeDriver: true,
                        }),
                        Animated.timing(scale, {
                            toValue: 0.8,
                            duration: 3500,
                            easing: Easing.inOut(Easing.sin),
                            useNativeDriver: true,
                        }),
                    ]),
                ),
            ]).start();
        };

        // Fade in
        Animated.timing(opacity, {
            toValue: 1,
            duration: 800,
            delay,
            useNativeDriver: true,
        }).start(() => animateOrb());
    }, []);

    return (
        <Animated.View
            style={[
                styles.orb,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: color,
                    left: startX,
                    top: startY,
                    opacity,
                    transform: [{ translateY }, { translateX }, { scale }],
                },
            ]}
        />
    );
};

// ─── Spring-based fade-in ────────────────────────────────────────────────
const useSpringIn = (delay = 0) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(40)).current;
    const scale = useRef(new Animated.Value(0.95)).current;

    useEffect(() => {
        const timeout = setTimeout(() => {
            Animated.parallel([
                Animated.spring(opacity, {
                    toValue: 1,
                    damping: 20,
                    stiffness: 90,
                    useNativeDriver: true,
                }),
                Animated.spring(translateY, {
                    toValue: 0,
                    damping: 18,
                    stiffness: 100,
                    useNativeDriver: true,
                }),
                Animated.spring(scale, {
                    toValue: 1,
                    damping: 15,
                    stiffness: 100,
                    useNativeDriver: true,
                }),
            ]).start();
        }, delay);
        return () => clearTimeout(timeout);
    }, []);

    return { opacity, transform: [{ translateY }, { scale }] };
};

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState(null);
    const [error, setError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    const headerAnim = useSpringIn(50);
    const formAnim = useSpringIn(200);
    const socialAnim = useSpringIn(400);
    const footerAnim = useSpringIn(550);

    // ─── Button press animation ─────────────────────────────────
    const btnScale = useRef(new Animated.Value(1)).current;
    const animatePress = (callback) => {
        Animated.sequence([
            Animated.timing(btnScale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
            Animated.timing(btnScale, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]).start(() => callback?.());
    };

    const handleLogin = async () => {
        setError(null);
        if (!isValidEmail(email)) {
            setError('Geçerli bir e-posta adresi girin.');
            return;
        }
        if (!isValidPassword(password)) {
            setError('Şifre en az 6 karakter olmalıdır.');
            return;
        }

        setLoading(true);
        const { data, error: authError } = await signIn(email.trim(), password);
        setLoading(false);

        if (authError) {
            // Email doğrulanmamış kullanıcıya özel mesaj
            if (authError.message?.toLowerCase().includes('email not confirmed')) {
                setError('E-posta adresiniz doğrulanmamış. Lütfen gelen kutunuzu kontrol edin.');
            } else {
                setError(authError.message);
            }
        }
    };

    const handleForgotPassword = async () => {
        if (!isValidEmail(email)) {
            setError('Şifre sıfırlamak için önce e-posta adresinizi girin.');
            return;
        }
        setLoading(true);
        const { error: resetError } = await sendPasswordReset(email.trim());
        setLoading(false);
        if (resetError) {
            setError(resetError.message);
        } else {
            setResetSent(true);
            setError(null);
        }
    };

    const handleGoogleLogin = async () => {
        setError(null);
        setSocialLoading('google');
        const { data, error: authError } = await signInWithGoogle();
        setSocialLoading(null);
        if (authError && authError.message !== 'Giriş iptal edildi.') {
            setError(authError.message);
        }
    };

    const handleAppleLogin = async () => {
        setError(null);
        setSocialLoading('apple');
        const { data, error: authError } = await signInWithApple();
        setSocialLoading(null);
        if (authError && authError.message !== 'Giriş iptal edildi.') {
            setError(authError.message);
        }
    };

    return (
        <View style={styles.root}>
            {/* Multi-layer gradient background */}
            <LinearGradient
                colors={['#0C4A6E', '#0E7490', '#0891B2', '#14B8A6']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
            />

            {/* Floating orbs */}
            <FloatingOrb size={120} startX={-30} startY={80} delay={0} color="rgba(255,255,255,0.06)" />
            <FloatingOrb size={80} startX={SCREEN_W - 60} startY={140} delay={300} color="rgba(20,184,166,0.12)" />
            <FloatingOrb size={60} startX={SCREEN_W * 0.4} startY={60} delay={600} color="rgba(255,255,255,0.08)" />
            <FloatingOrb size={100} startX={SCREEN_W * 0.6} startY={200} delay={150} color="rgba(8,145,178,0.1)" />

            {/* Close button */}
            <TouchableOpacity
                style={styles.closeButton}
                onPress={() => navigation.goBack()}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
                <View style={styles.closeButtonInner}>
                    <Ionicons name="close" size={20} color="rgba(255,255,255,0.9)" />
                </View>
            </TouchableOpacity>

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {/* ═══ Header ═══ */}
                    <Animated.View style={[styles.headerArea, headerAnim]}>
                        <View style={styles.logoContainer}>
                            <View style={styles.logoRing}>
                                <Ionicons name="compass" size={28} color="#fff" />
                            </View>
                        </View>
                        <Text style={styles.brandTitle}>Hoş Geldin</Text>
                        <Text style={styles.brandSubtitle}>
                            Hesabına giriş yaparak kaldığın yerden devam et
                        </Text>
                    </Animated.View>

                    {/* ═══ Form Card ═══ */}
                    <Animated.View style={[styles.formCard, formAnim]}>
                        {error && <ErrorMessage message={error} />}

                        {/* Email */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>E-posta</Text>
                            <View style={styles.inputRow}>
                                <Ionicons name="mail-outline" size={18} color={COLORS.textLight} style={styles.inputIcon} />
                                <Input
                                    placeholder="ornek@email.com"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    style={styles.inputFlat}
                                />
                            </View>
                        </View>

                        {/* Password */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Şifre</Text>
                            <View style={styles.inputRow}>
                                <Ionicons name="lock-closed-outline" size={18} color={COLORS.textLight} style={styles.inputIcon} />
                                <Input
                                    placeholder="••••••••"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    style={styles.inputFlat}
                                />
                                <TouchableOpacity
                                    style={styles.eyeBtn}
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <Ionicons
                                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                        size={18}
                                        color={COLORS.textLight}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Login Button */}
                        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                            <TouchableOpacity
                                style={styles.primaryBtn}
                                onPress={() => animatePress(handleLogin)}
                                disabled={loading}
                                activeOpacity={0.9}
                            >
                                <LinearGradient
                                    colors={['#0891B2', '#0E7490']}
                                    style={styles.primaryBtnGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    {loading ? (
                                        <Text style={styles.primaryBtnText}>Giriş yapılıyor...</Text>
                                    ) : (
                                        <>
                                            <Text style={styles.primaryBtnText}>Giriş Yap</Text>
                                            <Ionicons name="arrow-forward" size={18} color="#fff" />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* Şifremi Unuttum */}
                        <TouchableOpacity
                            style={styles.forgotBtn}
                            onPress={handleForgotPassword}
                            disabled={loading}
                        >
                            <Text style={styles.forgotText}>Şifremi Unuttum</Text>
                        </TouchableOpacity>

                        {/* Şifre sıfırlama gönderildi mesajı */}
                        {resetSent && (
                            <View style={styles.successBanner}>
                                <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                                <Text style={styles.successText}>
                                    Şifre sıfırlama linki e-postanıza gönderildi.
                                </Text>
                            </View>
                        )}
                    </Animated.View>

                    {/* ═══ Social Login ═══ */}
                    <Animated.View style={[styles.socialSection, socialAnim]}>
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>veya</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <TouchableOpacity
                            style={styles.socialBtn}
                            onPress={handleGoogleLogin}
                            disabled={!!socialLoading}
                            activeOpacity={0.8}
                        >
                            <View style={styles.googleIconWrap}>
                                <Text style={styles.googleG}>G</Text>
                            </View>
                            <Text style={styles.socialBtnText}>
                                {socialLoading === 'google' ? 'Bağlanıyor...' : 'Google ile devam et'}
                            </Text>
                        </TouchableOpacity>

                        {Platform.OS === 'ios' && (
                            <TouchableOpacity
                                style={[styles.socialBtn, styles.appleSocialBtn]}
                                onPress={handleAppleLogin}
                                disabled={!!socialLoading}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="logo-apple" size={20} color="#fff" />
                                <Text style={[styles.socialBtnText, styles.appleSocialText]}>
                                    {socialLoading === 'apple' ? 'Bağlanıyor...' : 'Apple ile devam et'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </Animated.View>

                    {/* ═══ Footer ═══ */}
                    <Animated.View style={[styles.footer, footerAnim]}>
                        <Text style={styles.footerText}>Hesabın yok mu? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                            <Text style={styles.footerLink}>Kayıt Ol</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1 },
    flex: { flex: 1 },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: SPACING.lg,
        paddingTop: Platform.OS === 'ios' ? 100 : 80,
        paddingBottom: 40,
    },

    // Close
    closeButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 56 : 40,
        right: SPACING.lg,
        zIndex: 100,
    },
    closeButtonInner: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },

    // Floating orbs
    orb: {
        position: 'absolute',
    },

    // Header
    headerArea: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    logoContainer: {
        marginBottom: SPACING.md,
    },
    logoRing: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    brandTitle: {
        fontFamily: FONTS.heading,
        fontSize: 32,
        color: '#fff',
        letterSpacing: -0.8,
        marginBottom: 6,
    },
    brandSubtitle: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: SPACING.lg,
    },

    // Form Card
    formCard: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 24,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 30,
        elevation: 15,
    },
    inputGroup: {
        marginBottom: SPACING.md,
    },
    inputLabel: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginBottom: 6,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    inputRow: {
        position: 'relative',
    },
    inputIcon: {
        position: 'absolute',
        left: 14,
        top: 16,
        zIndex: 2,
    },
    inputFlat: {
        paddingLeft: 42,
        marginBottom: 0,
    },
    eyeBtn: {
        position: 'absolute',
        right: 14,
        top: 16,
        zIndex: 2,
        padding: 2,
    },

    // Primary Button
    primaryBtn: {
        marginTop: SPACING.sm,
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
    },
    primaryBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: BORDER_RADIUS.lg,
    },
    primaryBtnText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.md,
        color: '#fff',
    },

    // Şifremi Unuttum
    forgotBtn: {
        alignSelf: 'center',
        marginTop: SPACING.sm,
        padding: 4,
    },
    forgotText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.xs,
        color: COLORS.primary,
        textDecorationLine: 'underline',
    },
    successBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(34,197,94,0.1)',
        borderRadius: BORDER_RADIUS.sm,
        padding: SPACING.sm,
        marginTop: SPACING.sm,
    },
    successText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: '#15803D',
        flex: 1,
    },

    // Social Section
    socialSection: {
        gap: SPACING.sm,
        marginBottom: SPACING.lg,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    dividerText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.6)',
        marginHorizontal: SPACING.md,
    },
    socialBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 14,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: 'rgba(255,255,255,0.95)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    appleSocialBtn: {
        backgroundColor: '#000',
    },
    googleIconWrap: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    googleG: {
        fontFamily: FONTS.bodyBold,
        fontSize: 14,
        color: '#4285F4',
    },
    socialBtnText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    appleSocialText: {
        color: '#fff',
    },

    // Footer
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: 'rgba(255,255,255,0.7)',
    },
    footerLink: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: '#fff',
        textDecorationLine: 'underline',
    },
});

export default LoginScreen;
