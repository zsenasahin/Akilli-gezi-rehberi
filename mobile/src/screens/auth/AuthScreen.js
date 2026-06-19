import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Platform,
  Alert,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING } from '../../constants/layout';
import { AUTH_IMAGES } from '../../constants/authAssets';
import { signIn, signUp, signInWithGoogle, resendVerificationEmail } from '../../data/repositories/authRepository';
import AuthFormLayout from '../../components/auth/AuthFormLayout';
import EmailVerificationPanel from '../../components/auth/EmailVerificationPanel';
import GlassmorphismModal from '../../components/common/GlassmorphismModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function AuthScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardVisible(true);
    };
    const onHide = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardVisible(false);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    if (!isLogin && !name) {
      Alert.alert('Hata', 'Lütfen adınızı girin');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          if (
            error.message?.toLowerCase().includes('invalid') ||
            error.message?.toLowerCase().includes('credentials')
          ) {
            Alert.alert(
              'Giriş Yapılamadı',
              'Email veya şifre hatalı. Şifrenizi unuttuysanız "Şifremi unuttum?" kullanın.',
              [
                { text: 'Tamam', style: 'cancel' },
                { text: 'Şifremi Sıfırla', onPress: () => handleForgotPassword() },
              ]
            );
          } else if (error.message?.toLowerCase().includes('email not confirmed')) {
            Alert.alert('E-posta Doğrulanmamış', 'Lütfen e-postanızdaki doğrulama linkine tıklayın.');
          } else {
            Alert.alert('Giriş Hatası', error.message || 'Giriş yapılamadı');
          }
        }
      } else {
        const { data, error } = await signUp(email.trim(), password);
        if (error) {
          Alert.alert('Kayıt Hatası', error.message || 'Kayıt oluşturulamadı');
        } else if (data?.session) {
          Alert.alert('Başarılı', 'Kayıt tamamlandı, hoş geldiniz!');
        } else {
          setPendingVerification(true);
        }
      }
    } catch (err) {
      Alert.alert('Hata', err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error && error.message !== 'Giriş iptal edildi.') {
        Alert.alert('Google Giriş Hatası', error.message || 'Google ile giriş yapılamadı');
      }
    } catch (err) {
      Alert.alert('Hata', err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setShowForgotPasswordModal(false);
    navigation.navigate('PasswordReset', { email: email.trim() });
  };

  const handleResendVerification = async () => {
    setLoading(true);
    try {
      const { error } = await resendVerificationEmail(email.trim());
      if (error) {
        Alert.alert('Hata', error.message || 'E-posta gönderilemedi');
      } else {
        Alert.alert('Gönderildi', 'Doğrulama e-postası tekrar gönderildi.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthFormLayout
        imageSource={AUTH_IMAGES.authHero}
        keyboardVisible={keyboardVisible && !pendingVerification}
      >
        {pendingVerification ? (
          <EmailVerificationPanel
            email={email.trim()}
            loading={loading}
            onGoToLogin={() => {
              setPendingVerification(false);
              setIsLogin(true);
            }}
            onResend={handleResendVerification}
          />
        ) : (
          <>
        <View style={styles.headerBlock}>
          <Text style={styles.welcomeTitle}>
            {isLogin ? 'Hoş Geldin!' : 'Aramıza Katıl'}
          </Text>
          <Text style={styles.welcomeSubtitle}>
            {isLogin
              ? 'Hesabına giriş yap ve keşfetmeye devam et'
              : 'Yeni maceralara başla'}
          </Text>
        </View>

        {!isLogin && (
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Ad Soyad</Text>
            <TextInput
              style={styles.input}
              placeholder="Adınızı girin"
              placeholderTextColor={COLORS.textLight}
              value={name}
              onChangeText={setName}
              editable={!loading}
              returnKeyType="next"
            />
          </View>
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>E-posta</Text>
          <TextInput
            style={styles.input}
            placeholder="ornek@email.com"
            placeholderTextColor={COLORS.textLight}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
            returnKeyType="next"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Şifre</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleAuth}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={COLORS.textLight}
              />
            </TouchableOpacity>
          </View>
        </View>

        {isLogin && (
          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => setShowForgotPasswordModal(true)}
            disabled={loading}
          >
            <Text style={styles.forgotPasswordText}>Şifremi unuttum?</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleAuth}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Lütfen bekleyin...' : isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
          </Text>
        </TouchableOpacity>

        <View style={styles.switchContainer}>
          <Text style={styles.switchText}>
            {isLogin ? 'Hesabın yok mu?' : 'Zaten hesabın var mı?'}
          </Text>
          <TouchableOpacity onPress={() => setIsLogin(!isLogin)} disabled={loading}>
            <Text style={styles.switchLink}>{isLogin ? 'Kayıt Ol' : 'Giriş Yap'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ya da</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={[styles.googleButton, loading && styles.buttonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={loading}
          activeOpacity={0.85}
        >
          <View style={styles.googleIconContainer}>
            <Text style={styles.googleIcon}>G</Text>
          </View>
          <Text style={styles.googleButtonText}>
            {loading ? 'Bağlanıyor...' : 'Google ile giriş yap'}
          </Text>
        </TouchableOpacity>
          </>
        )}
      </AuthFormLayout>

      <GlassmorphismModal
        visible={showForgotPasswordModal}
        title="Şifremi Unuttum"
        message="E-posta adresinize bir doğrulama kodu göndereceğiz. Bu kod ile yeni şifrenizi oluşturabilirsiniz."
        primaryAction={{
          label: 'Devam Et',
          onPress: handleForgotPassword,
        }}
        secondaryAction={{
          label: 'İptal',
          onPress: () => setShowForgotPasswordModal(false),
        }}
        onClose={() => setShowForgotPasswordModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    marginBottom: SPACING.lg,
  },
  welcomeTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.xxl,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  input: {
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 14,
    padding: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.md,
    marginTop: -SPACING.xs,
  },
  forgotPasswordText: {
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.md,
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: 6,
  },
  switchText: {
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  switchLink: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginHorizontal: SPACING.md,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  googleButtonText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
});
