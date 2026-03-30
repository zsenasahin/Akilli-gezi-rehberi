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
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/layout';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';
import { signUp, signIn } from '../../services/authService';
import { createProfile } from '../../services/profileService';
import { isValidEmail, isValidPassword } from '../../utils/validators';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const HERO_IMAGE = 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&h=600&fit=crop&q=80';

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

const RegisterScreen = ({ navigation }) => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const heroAnim = useFadeIn(200);
    const formAnim = useFadeIn(400);
    const footerAnim = useFadeIn(600);

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

        console.log('📝 Kayıt deneniyor:', email.trim());
        const { data: authData, error: authError } = await signUp(email.trim(), password);

        if (authError) {
            console.log('❌ Kayıt hatası:', JSON.stringify(authError, null, 2));
            setError(authError.message);
            setLoading(false);
            return;
        }

        console.log('✅ Kayıt başarılı:', authData?.user?.id);

        const userId = authData.user?.id;
        if (userId) {
            const { error: profileError } = await createProfile({
                id: userId,
                full_name: fullName.trim(),
                travel_style: 'relaxed',
            });

            if (profileError) {
                console.warn('Profil oluşturma hatası:', profileError.message);
            }
        }

        if (!authData?.session) {
            console.log('🔄 Otomatik giriş deneniyor...');
            const { data: loginData, error: loginError } = await signIn(email.trim(), password);

            if (loginError) {
                setLoading(false);
                Alert.alert(
                    'Kayıt Başarılı! 🎉',
                    'Hesabınız oluşturuldu. Lütfen e-postanızı onaylayıp tekrar giriş yapın.',
                    [{ text: 'Tamam', onPress: () => navigation.navigate('Login') }]
                );
                return;
            }
        }

        setLoading(false);
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
                {/* Hero */}
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
                            <Ionicons name="person-add" size={22} color="#fff" />
                        </View>
                        <Text style={styles.heroTitle}>Hesap{'\n'}Oluştur</Text>
                        <Text style={styles.heroSubtitle}>
                            Gezi planlamaya başlayın
                        </Text>
                    </Animated.View>
                </View>

                {/* Form */}
                <Animated.View style={[styles.formSection, formAnim]}>
                    <Text style={styles.formTitle}>Kayıt Ol</Text>
                    <Text style={styles.formSubtitle}>Bilgilerinizi girerek üye olun</Text>

                    {error && <ErrorMessage message={error} />}

                    <Input
                        label="Ad Soyad"
                        placeholder="Adınızı girin"
                        value={fullName}
                        onChangeText={setFullName}
                    />

                    <Input
                        label="E-posta"
                        placeholder="ornek@email.com"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                    />

                    <Input
                        label="Şifre"
                        placeholder="En az 6 karakter"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <Button
                        title="Kayıt Ol"
                        onPress={handleRegister}
                        loading={loading}
                        style={styles.registerButton}
                    />
                </Animated.View>

                {/* Footer */}
                <Animated.View style={[styles.footer, footerAnim]}>
                    <Text style={styles.footerText}>Zaten hesabınız var mı?</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.footerLink}> Giriş Yap</Text>
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
        height: SCREEN_HEIGHT * 0.35,
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
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    heroTitle: {
        fontFamily: FONTS.heading,
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
        fontFamily: FONTS.heading,
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
    registerButton: {
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

export default RegisterScreen;
