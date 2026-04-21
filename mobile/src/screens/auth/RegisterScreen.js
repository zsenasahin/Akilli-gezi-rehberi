import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
    Alert,
    Dimensions,
    Animated,
    Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';
import { signUp, signInWithGoogle, signInWithApple, resendVerificationEmail } from '../../services/authService';
import { createProfile } from '../../services/profileService';
import { isValidEmail, isValidPassword } from '../../utils/validators';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Floating orbs ──────────────────────────────────────────────────────────
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
                            toValue: -35,
                            duration: 3000 + Math.random() * 2000,
                            easing: Easing.inOut(Easing.sin),
                            useNativeDriver: true,
                        }),
                        Animated.timing(translateY, {
                            toValue: 35,
                            duration: 3000 + Math.random() * 2000,
                            easing: Easing.inOut(Easing.sin),
                            useNativeDriver: true,
                        }),
                    ]),
                ),
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(translateX, {
                            toValue: 18,
                            duration: 4000 + Math.random() * 2000,
                            easing: Easing.inOut(Easing.sin),
                            useNativeDriver: true,
                        }),
                        Animated.timing(translateX, {
                            toValue: -18,
                            duration: 4000 + Math.random() * 2000,
                            easing: Easing.inOut(Easing.sin),
                            useNativeDriver: true,
                        }),
                    ]),
                ),
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(scale, {
                            toValue: 1.15,
                            duration: 3500,
                            easing: Easing.inOut(Easing.sin),
                            useNativeDriver: true,
                        }),
                        Animated.timing(scale, {
                            toValue: 0.85,
                            duration: 3500,
                            easing: Easing.inOut(Easing.sin),
                            useNativeDriver: true,
                        }),
                    ]),
                ),
            ]).start();
        };

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

const RegisterScreen = ({ navigation }) => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState(null);
    const [error, setError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const headerAnim = useSpringIn(50);
    const formAnim = useSpringIn(200);
    const socialAnim = useSpringIn(400);
    const footerAnim = useSpringIn(550);
    const verifyAnim = useSpringIn(100);

    // Password strength
    const getPasswordStrength = (pwd) => {
        if (!pwd) return { level: 0, label: '', color: 'transparent' };
        if (pwd.length < 6) return { level: 1, label: 'Zayıf', color: '#EF4444' };
        if (pwd.length < 8) return { level: 2, label: 'Orta', color: '#F59E0B' };
        const hasUpper = /[A-Z]/.test(pwd);
        const hasNumber = /[0-9]/.test(pwd);
        if (hasUpper && hasNumber && pwd.length >= 8) return { level: 4, label: 'Güçlü', color: '#22C55E' };
        return { level: 3, label: 'İyi', color: '#0891B2' };
    };

    const pwdStrength = getPasswordStrength(password);

    const btnScale = useRef(new Animated.Value(1)).current;
    const animatePress = (callback) => {
        Animated.sequence([
            Animated.timing(btnScale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
            Animated.timing(btnScale, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]).start(() => callback?.());
    };

    const handleRegister = async () => {
        setError(null);
        if (!fullName.trim()) {
            setError('İsim alanı boş bırakılamaz.');
            return;
        }
        if (!isValidEmail(email)) {
            setError('Geçerli bir e-posta adresi girin.');
            return;
        }
        if (!isValidPassword(password)) {
            setError('Şifre en az 6 karakter olmalıdır.');
            return;
        }

        setLoading(true);
        const { data: authData, error: authError } = await signUp(email.trim(), password);

        if (authError) {
            // Kullanıcı zaten kayıtlıysa özel mesaj
            if (authError.message?.toLowerCase().includes('already registered') ||
                authError.message?.toLowerCase().includes('user already exists')) {
                setError('Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.');
            } else {
                setError(authError.message);
            }
            setLoading(false);
            return;
        }

        const userId = authData.user?.id;
        if (userId) {
            await createProfile({
                id: userId,
                full_name: fullName.trim(),
                travel_style: 'relaxed',
            });
        }

        setLoading(false);

        // session yoksa email doğrulama gerekiyor demektir
        if (!authData?.session) {
            setEmailSent(true);
        }
        // session varsa AuthContext otomatik yakalar, modal kapanır
    };

    const handleGoogleLogin = async () => {
        setError(null);
        setSocialLoading('google');
        const { error: authError } = await signInWithGoogle();
        setSocialLoading(null);
        if (authError && authError.message !== 'Giriş iptal edildi.') {
            setError(authError.message);
        }
    };

    const handleAppleLogin = async () => {
        setError(null);
        setSocialLoading('apple');
        const { error: authError } = await signInWithApple();
        setSocialLoading(null);
        if (authError && authError.message !== 'Giriş iptal edildi.') {
            setError(authError.message);
        }
    };

    // ─── Email doğrulama ekranı ─────────────────────────────────
    if (emailSent) {
        return (
            <View style={styles.root}>
                <LinearGradient
                    colors={['#0C4A6E', '#0E7490', '#0891B2', '#14B8A6']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0.1, y: 0 }}
                    end={{ x: 0.9, y: 1 }}
                />
                <FloatingOrb size={100} startX={-20} startY={120} delay={0} color="rgba(255,255,255,0.06)" />
                <FloatingOrb size={70} startX={SCREEN_W - 40} startY={200} delay={200} color="rgba(20,184,166,0.1)" />

                <View style={styles.verifyWrapper}>
                    <Animated.View style={[styles.verifyCard, verifyAnim]}>
                        <View style={styles.verifyIconCircle}>
                            <Ionicons name="mail-open-outline" size={44} color={COLORS.primary} />
                        </View>
                        <Text style={styles.verifyTitle}>E-postanı Doğrula</Text>
                        <Text style={styles.verifyDesc}>
                            <Text style={{ fontFamily: FONTS.bodySemiBold, color: COLORS.textPrimary }}>{email}</Text>
                            {' '}adresine bir doğrulama bağlantısı gönderdik.
                        </Text>

                        <View style={styles.verifyTips}>
                            {[
                                'Spam klasörünü de kontrol edin',
                                'Bağlantı 24 saat geçerlidir',
                            ].map((tip, i) => (
                                <View key={i} style={styles.verifyTipRow}>
                                    <View style={styles.tipDot} />
                                    <Text style={styles.verifyTipText}>{tip}</Text>
                                </View>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={styles.verifyPrimaryBtn}
                            onPress={() => navigation.navigate('Login')}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={['#0891B2', '#0E7490']}
                                style={styles.verifyPrimaryBtnInner}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={styles.verifyPrimaryBtnText}>Giriş Ekranına Dön</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.resendBtn}
                            onPress={async () => {
                                setLoading(true);
                                const { error: resendErr } = await resendVerificationEmail(email.trim());
                                setLoading(false);
                                if (resendErr) {
                                    Alert.alert('Hata', resendErr.message);
                                } else {
                                    Alert.alert('Gönderildi', 'Doğrulama e-postası tekrar gönderildi.');
                                }
                            }}
                        >
                            <Ionicons name="refresh" size={14} color={COLORS.primary} />
                            <Text style={styles.resendText}>Tekrar Gönder</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.root}>
            {/* Multi-layer gradient background */}
            <LinearGradient
                colors={['#134E5E', '#0E7490', '#14B8A6', '#0891B2']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
            />

            {/* Floating orbs */}
            <FloatingOrb size={110} startX={SCREEN_W - 50} startY={70} delay={0} color="rgba(255,255,255,0.06)" />
            <FloatingOrb size={70} startX={20} startY={150} delay={300} color="rgba(20,184,166,0.12)" />
            <FloatingOrb size={90} startX={SCREEN_W * 0.3} startY={50} delay={500} color="rgba(255,255,255,0.08)" />

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
                                <Ionicons name="person-add" size={26} color="#fff" />
                            </View>
                        </View>
                        <Text style={styles.brandTitle}>Hesap Oluştur</Text>
                        <Text style={styles.brandSubtitle}>
                            Gezi planlamaya hemen başla
                        </Text>
                    </Animated.View>

                    {/* ═══ Form Card ═══ */}
                    <Animated.View style={[styles.formCard, formAnim]}>
                        {error && <ErrorMessage message={error} />}

                        {/* Full Name */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Ad Soyad</Text>
                            <View style={styles.inputRow}>
                                <Ionicons name="person-outline" size={18} color={COLORS.textLight} style={styles.inputIcon} />
                                <Input
                                    placeholder="Adınızı girin"
                                    value={fullName}
                                    onChangeText={setFullName}
                                    style={styles.inputFlat}
                                />
                            </View>
                        </View>

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
                                    placeholder="En az 6 karakter"
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
                            {/* Password strength */}
                            {password.length > 0 && (
                                <View style={styles.strengthRow}>
                                    <View style={styles.strengthBarBg}>
                                        {[1, 2, 3, 4].map(i => (
                                            <View
                                                key={i}
                                                style={[
                                                    styles.strengthSegment,
                                                    {
                                                        backgroundColor: i <= pwdStrength.level ? pwdStrength.color : '#E5E7EB',
                                                    },
                                                ]}
                                            />
                                        ))}
                                    </View>
                                    <Text style={[styles.strengthLabel, { color: pwdStrength.color }]}>
                                        {pwdStrength.label}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Register Button */}
                        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                            <TouchableOpacity
                                style={styles.primaryBtn}
                                onPress={() => animatePress(handleRegister)}
                                disabled={loading}
                                activeOpacity={0.9}
                            >
                                <LinearGradient
                                    colors={['#14B8A6', '#0891B2']}
                                    style={styles.primaryBtnGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    {loading ? (
                                        <Text style={styles.primaryBtnText}>Kayıt yapılıyor...</Text>
                                    ) : (
                                        <>
                                            <Text style={styles.primaryBtnText}>Kayıt Ol</Text>
                                            <Ionicons name="arrow-forward" size={18} color="#fff" />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
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
                        <Text style={styles.footerText}>Zaten hesabın var mı? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.footerLink}>Giriş Yap</Text>
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
        paddingTop: Platform.OS === 'ios' ? 90 : 70,
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

    // Orbs
    orb: { position: 'absolute' },

    // Header
    headerArea: {
        alignItems: 'center',
        marginBottom: SPACING.xl - 8,
    },
    logoContainer: {
        marginBottom: SPACING.sm,
    },
    logoRing: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    brandTitle: {
        fontFamily: FONTS.heading,
        fontSize: 30,
        color: '#fff',
        letterSpacing: -0.8,
        marginBottom: 4,
    },
    brandSubtitle: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
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
        marginBottom: SPACING.sm + 4,
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

    // Password strength
    strengthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
        paddingHorizontal: 4,
    },
    strengthBarBg: {
        flexDirection: 'row',
        gap: 4,
        flex: 1,
    },
    strengthSegment: {
        flex: 1,
        height: 3,
        borderRadius: 2,
    },
    strengthLabel: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: 10,
    },

    // Primary Button
    primaryBtn: {
        marginTop: SPACING.xs,
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

    // Social
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

    // ─── Email Verification ─────────────────────────────────────
    verifyWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
    },
    verifyCard: {
        backgroundColor: '#fff',
        borderRadius: 28,
        padding: SPACING.xl,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.15,
        shadowRadius: 32,
        elevation: 15,
    },
    verifyIconCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: COLORS.primaryMuted,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    verifyTitle: {
        fontFamily: FONTS.heading,
        fontSize: 24,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    verifyDesc: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: SPACING.lg,
    },
    verifyTips: {
        width: '100%',
        gap: SPACING.sm,
        marginBottom: SPACING.lg,
    },
    verifyTipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    tipDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
    },
    verifyTipText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    verifyPrimaryBtn: {
        width: '100%',
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
    },
    verifyPrimaryBtnInner: {
        paddingVertical: 15,
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.lg,
    },
    verifyPrimaryBtnText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.md,
        color: '#fff',
    },
    resendBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: SPACING.md,
        paddingVertical: 8,
    },
    resendText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.primary,
    },
});

export default RegisterScreen;
