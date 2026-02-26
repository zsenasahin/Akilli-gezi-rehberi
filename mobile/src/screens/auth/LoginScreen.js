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
import { Image } from 'expo-image';
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

const SCREEN_HEIGHT = Dimensions.get('window').height;
const HERO_IMAGE = 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&h=600&fit=crop&q=80';

const useFadeIn = (delay = 0) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 500, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 0, duration: 500, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();
    }, []);
    return { opacity, transform: [{ translateY }] };
};

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const heroAnim = useFadeIn(200);
    const formAnim = useFadeIn(400);
    const footerAnim = useFadeIn(600);

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
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Background */}
                <View style={styles.heroSection}>
                    <Image
                        source={{ uri: HERO_IMAGE }}
                        style={styles.heroImage}
                        contentFit="cover"
                        transition={500}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(27, 40, 56, 0.6)', COLORS.background]}
                        style={styles.heroGradient}
                    />
                    <Animated.View style={[styles.heroContent, heroAnim]}>
                        <View style={styles.logoBadge}>
                            <Ionicons name="location" size={24} color="#fff" />
                        </View>
                        <Text style={styles.heroTitle}>Akıllı Gezi{'\n'}Rehberi</Text>
                        <Text style={styles.heroSubtitle}>
                            Hayalindeki seyahati planla
                        </Text>
                    </Animated.View>
                </View>

                {/* Form */}
                <Animated.View style={[styles.formSection, formAnim]}>
                    <Text style={styles.formTitle}>Giriş Yap</Text>
                    <Text style={styles.formSubtitle}>Hesabınıza giriş yaparak devam edin</Text>

                    {error && <ErrorMessage message={error} />}

                    <Input
                        label="E-posta"
                        placeholder="ornek@email.com"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                    />

                    <Input
                        label="Şifre"
                        placeholder="••••••••"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <Button
                        title="Giriş Yap"
                        onPress={handleLogin}
                        loading={loading}
                        style={styles.loginButton}
                    />
                </Animated.View>

                {/* Footer */}
                <Animated.View style={[styles.footer, footerAnim]}>
                    <Text style={styles.footerText}>Hesabınız yok mu?</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                        <Text style={styles.footerLink}> Kayıt Ol</Text>
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    flex: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    container: {
        flexGrow: 1,
    },
    heroSection: {
        height: SCREEN_HEIGHT * 0.4,
        position: 'relative',
    },
    heroImage: {
        ...StyleSheet.absoluteFillObject,
    },
    heroGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    heroContent: {
        position: 'absolute',
        bottom: SPACING.xl,
        left: SPACING.lg,
    },
    logoBadge: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    heroTitle: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: FONT_SIZES.hero,
        color: '#fff',
        lineHeight: 44,
    },
    heroSubtitle: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.md,
        color: 'rgba(255,255,255,0.85)',
        marginTop: SPACING.xs,
    },
    formSection: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        marginHorizontal: SPACING.lg,
        marginTop: -SPACING.lg,
        padding: SPACING.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 5,
    },
    formTitle: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: FONT_SIZES.xl,
        color: COLORS.textPrimary,
    },
    formSubtitle: {
        fontFamily: 'Inter_400Regular',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginTop: 4,
        marginBottom: SPACING.md,
    },
    loginButton: {
        marginTop: SPACING.sm,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: SPACING.lg,
        paddingBottom: SPACING.xxl,
    },
    footerText: {
        fontFamily: 'Inter_400Regular',
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
    },
    footerLink: {
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.primary,
        fontSize: FONT_SIZES.sm,
    },
});

export default LoginScreen;
