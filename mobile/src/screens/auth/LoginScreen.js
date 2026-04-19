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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';
import { signIn } from '../../services/authService';
import { isValidEmail, isValidPassword } from '../../utils/validators';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const HERO_IMAGE = 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&h=600&fit=crop&q=80';

const useFadeIn = (delay = 0) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(30)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 600, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 0, duration: 600, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();
    }, []);
    return { opacity, transform: [{ translateY }] };
};

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    const sheetAnim = useFadeIn(100);
    const formAnim = useFadeIn(300);
    const footerAnim = useFadeIn(500);

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
        console.log('🔐 Giriş deneniyor:', email.trim());
        const { data, error: authError } = await signIn(email.trim(), password);
        setLoading(false);

        if (authError) {
            console.log('❌ Giriş hatası:', JSON.stringify(authError, null, 2));
            setError(authError.message);
        } else {
            console.log('✅ Giriş başarılı:', data?.user?.id);
        }
    };

    return (
        <View style={styles.root}>
            {/* Background gradient */}
            <LinearGradient
                colors={['#0E7490', '#0891B2', '#14B8A6']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Top decorative area */}
            <View style={styles.topArea}>
                {/* Close button */}
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Ionicons name="close" size={24} color="rgba(255,255,255,0.9)" />
                </TouchableOpacity>

                {/* Logo & title */}
                <Animated.View style={[styles.logoArea, sheetAnim]}>
                    <View style={styles.logoBadge}>
                        <Ionicons name="location" size={28} color="#fff" />
                    </View>
                    <Text style={styles.brandTitle}>Akıllı Gezi Rehberi</Text>
                    <Text style={styles.brandSubtitle}>Hesabına giriş yap</Text>
                </Animated.View>
            </View>

            {/* Bottom Sheet */}
            <KeyboardAvoidingView
                style={styles.sheetContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    contentContainerStyle={styles.sheetScroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    <Animated.View style={[styles.sheet, formAnim]}>
                        {/* Handle bar */}
                        <View style={styles.handleBar} />

                        <Text style={styles.sheetTitle}>Giriş Yap</Text>
                        <Text style={styles.sheetSubtitle}>
                            E-posta ve şifrenle devam et
                        </Text>

                        {error && <ErrorMessage message={error} />}

                        {/* Email */}
                        <View style={styles.inputWrapper}>
                            <View style={styles.inputIconWrap}>
                                <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
                            </View>
                            <Input
                                label="E-posta"
                                placeholder="ornek@email.com"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                style={styles.inputField}
                            />
                        </View>

                        {/* Password */}
                        <View style={styles.inputWrapper}>
                            <View style={styles.inputIconWrap}>
                                <Ionicons name="lock-closed-outline" size={18} color={COLORS.primary} />
                            </View>
                            <Input
                                label="Şifre"
                                placeholder="••••••••"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                style={styles.inputField}
                            />
                            <TouchableOpacity
                                style={styles.eyeButton}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Ionicons
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={18}
                                    color={COLORS.textLight}
                                />
                            </TouchableOpacity>
                        </View>

                        <Button
                            title="Giriş Yap"
                            onPress={handleLogin}
                            loading={loading}
                            style={styles.loginButton}
                        />

                        {/* Footer */}
                        <Animated.View style={[styles.footer, footerAnim]}>
                            <View style={styles.dividerRow}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>veya</Text>
                                <View style={styles.dividerLine} />
                            </View>
                            <View style={styles.footerTextRow}>
                                <Text style={styles.footerText}>Hesabınız yok mu?</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                                    <Text style={styles.footerLink}> Kayıt Ol</Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    topArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 20,
    },
    closeButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 56 : 40,
        right: SPACING.lg,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.18)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    logoArea: {
        alignItems: 'center',
    },
    logoBadge: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    brandTitle: {
        fontFamily: FONTS.heading,
        fontSize: 28,
        color: '#fff',
        letterSpacing: -0.5,
    },
    brandSubtitle: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.md,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
    },

    // Bottom Sheet
    sheetContainer: {
        maxHeight: SCREEN_H * 0.65,
    },
    sheetScroll: {
        flexGrow: 1,
    },
    sheet: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.sm,
        paddingBottom: SPACING.xxl + 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 20,
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.border,
        alignSelf: 'center',
        marginBottom: SPACING.lg,
    },
    sheetTitle: {
        fontFamily: FONTS.heading,
        fontSize: 26,
        color: COLORS.textPrimary,
        letterSpacing: -0.5,
    },
    sheetSubtitle: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginTop: 4,
        marginBottom: SPACING.lg,
    },

    // Inputs
    inputWrapper: {
        position: 'relative',
        marginBottom: 4,
    },
    inputIconWrap: {
        position: 'absolute',
        left: 0,
        top: 32,
        zIndex: 2,
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputField: {
        paddingLeft: 36,
    },
    eyeButton: {
        position: 'absolute',
        right: 12,
        top: 32,
        zIndex: 2,
        padding: 8,
    },

    loginButton: {
        marginTop: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
    },

    // Footer
    footer: {
        marginTop: SPACING.lg,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.divider,
    },
    dividerText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
        marginHorizontal: SPACING.md,
    },
    footerTextRow: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    footerText: {
        fontFamily: FONTS.body,
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
    },
    footerLink: {
        fontFamily: FONTS.bodySemiBold,
        color: COLORS.primary,
        fontSize: FONT_SIZES.sm,
    },
});

export default LoginScreen;
