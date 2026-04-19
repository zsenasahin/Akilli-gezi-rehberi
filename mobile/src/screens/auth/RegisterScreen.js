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
import { signUp, signIn } from '../../services/authService';
import { createProfile } from '../../services/profileService';
import { isValidEmail, isValidPassword } from '../../utils/validators';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

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

const RegisterScreen = ({ navigation }) => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const sheetAnim = useFadeIn(100);
    const formAnim = useFadeIn(300);
    const footerAnim = useFadeIn(500);

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

        // Email doğrulama akışı — session yoksa doğrulama bekleniyor
        if (!authData?.session) {
            setLoading(false);
            setEmailSent(true);
            return;
        }

        setLoading(false);
    };

    // Email doğrulama ekranı
    if (emailSent) {
        return (
            <View style={styles.root}>
                <LinearGradient
                    colors={['#0E7490', '#0891B2', '#14B8A6']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View style={styles.verifyContainer}>
                    <Animated.View style={[styles.verifyContent, sheetAnim]}>
                        <View style={styles.verifyIconWrap}>
                            <Ionicons name="mail-open-outline" size={56} color={COLORS.primary} />
                        </View>
                        <Text style={styles.verifyTitle}>E-postanı Doğrula ✉️</Text>
                        <Text style={styles.verifyDesc}>
                            <Text style={{ fontFamily: FONTS.bodySemiBold }}>{email}</Text>
                            {' '}adresine bir doğrulama bağlantısı gönderdik.{'\n\n'}
                            Lütfen e-postanı kontrol et ve bağlantıya tıklayarak hesabını aktifleştir.
                        </Text>
                        <View style={styles.verifyTips}>
                            <View style={styles.verifyTipRow}>
                                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                                <Text style={styles.verifyTipText}>Spam klasörünü de kontrol edin</Text>
                            </View>
                            <View style={styles.verifyTipRow}>
                                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                                <Text style={styles.verifyTipText}>Bağlantı 24 saat geçerlidir</Text>
                            </View>
                        </View>
                        <Button
                            title="Giriş Ekranına Dön"
                            onPress={() => navigation.navigate('Login')}
                            style={styles.verifyButton}
                        />
                        <TouchableOpacity
                            style={styles.resendLink}
                            onPress={async () => {
                                setLoading(true);
                                const { error: resendErr } = await signUp(email.trim(), password);
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
            {/* Background gradient */}
            <LinearGradient
                colors={['#14B8A6', '#0891B2', '#0E7490']}
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
                        <Ionicons name="person-add" size={26} color="#fff" />
                    </View>
                    <Text style={styles.brandTitle}>Hesap Oluştur</Text>
                    <Text style={styles.brandSubtitle}>Gezi planlamaya başla</Text>
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

                        <Text style={styles.sheetTitle}>Kayıt Ol</Text>
                        <Text style={styles.sheetSubtitle}>
                            Bilgilerini girerek üye ol
                        </Text>

                        {error && <ErrorMessage message={error} />}

                        {/* Full Name */}
                        <View style={styles.inputWrapper}>
                            <View style={styles.inputIconWrap}>
                                <Ionicons name="person-outline" size={18} color={COLORS.primary} />
                            </View>
                            <Input
                                label="Ad Soyad"
                                placeholder="Adınızı girin"
                                value={fullName}
                                onChangeText={setFullName}
                                style={styles.inputField}
                            />
                        </View>

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
                                placeholder="En az 6 karakter"
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
                            title="Kayıt Ol"
                            onPress={handleRegister}
                            loading={loading}
                            style={styles.loginButton}
                        />

                        {/* Social Login */}
                        <Animated.View style={[styles.footer, footerAnim]}>
                            <View style={styles.dividerRow}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>veya şununla devam et</Text>
                                <View style={styles.dividerLine} />
                            </View>
                            
                            <View style={styles.socialButtonsRow}>
                                <TouchableOpacity 
                                    style={styles.socialButton}
                                    activeOpacity={0.7}
                                    onPress={() => {/* Google OAuth will be implemented */}}
                                >
                                    <View style={styles.socialIconGoogle}>
                                        <Text style={styles.googleIcon}>G</Text>
                                    </View>
                                    <Text style={styles.socialButtonText}>Google</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={[styles.socialButton, styles.socialButtonApple]}
                                    activeOpacity={0.7}
                                    onPress={() => {/* Apple OAuth will be implemented */}}
                                >
                                    <Ionicons name="logo-apple" size={20} color="#fff" />
                                    <Text style={[styles.socialButtonText, styles.socialButtonTextApple]}>Apple</Text>
                                </TouchableOpacity>
                            </View>
                            
                            <View style={styles.footerTextRow}>
                                <Text style={styles.footerText}>Zaten hesabın var mı?</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                    <Text style={styles.footerLink}> Giriş Yap</Text>
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
        maxHeight: SCREEN_H * 0.7,
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
    
    // Social Login Buttons
    socialButtonsRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginBottom: SPACING.lg,
    },
    socialButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: SPACING.md,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    socialButtonApple: {
        backgroundColor: '#000',
        borderColor: '#000',
    },
    socialIconGoogle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EA4335',
    },
    googleIcon: {
        fontFamily: FONTS.bodyBold,
        fontSize: 14,
        color: '#EA4335',
    },
    socialButtonText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    socialButtonTextApple: {
        color: '#fff',
    },

    // Email Verification Screen
    verifyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
    },
    verifyContent: {
        backgroundColor: COLORS.surface,
        borderRadius: 28,
        padding: SPACING.xl,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
    },
    verifyIconWrap: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: COLORS.primaryMuted,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    verifyTitle: {
        fontFamily: FONTS.heading,
        fontSize: 24,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
        textAlign: 'center',
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
        gap: 8,
    },
    verifyTipText: {
        fontFamily: FONTS.body,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    verifyButton: {
        width: '100%',
        borderRadius: BORDER_RADIUS.lg,
    },
    resendLink: {
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
