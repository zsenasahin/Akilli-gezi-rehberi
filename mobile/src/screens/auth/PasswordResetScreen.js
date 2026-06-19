import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING } from '../../constants/layout';
import { AUTH_IMAGES } from '../../constants/authAssets';
import { supabase } from '../../config/supabase';
import AuthFormLayout from '../../components/auth/AuthFormLayout';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const STEP_META = {
  email: { title: 'E-posta adresin', subtitle: 'Sıfırlama kodunu göndereceğimiz adresi gir.' },
  code: { title: 'Doğrulama kodu', subtitle: 'E-postana gelen 6 haneli kodu yaz.' },
  password: { title: 'Yeni şifre', subtitle: 'Hesabın için güçlü bir şifre belirle.' },
  success: { title: 'Tamamlandı', subtitle: 'Yeni şifrenle giriş yapabilirsin.' },
};

export default function PasswordResetScreen({ navigation, route }) {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [step, setStep] = useState('email');
  const [email, setEmail] = useState(route.params?.email || '');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

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

  useEffect(() => {
    if (step === 'success') {
      const timer = setTimeout(() => {
        navigation.navigate('Auth', { email });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step, email, navigation]);

  if (!fontsLoaded) {
    return null;
  }

  const meta = STEP_META[step];

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const getPasswordStrength = (password) => {
    if (password.length < 8) return 'weak';
    if (password.length < 12) return 'medium';
    return 'strong';
  };

  const strengthColors = {
    weak: COLORS.error,
    medium: COLORS.warning,
    strong: COLORS.success,
  };

  const strengthLabels = { weak: 'Zayıf', medium: 'Orta', strong: 'Güçlü' };

  const handleSendCode = async () => {
    setError(null);

    if (!email.trim()) {
      setError('Lütfen e-posta adresinizi girin');
      return;
    }

    if (!validateEmail(email.trim())) {
      setError('Geçerli bir e-posta adresi girin');
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'smarttravelguide://reset-password',
      });

      if (resetError) {
        if (resetError.message.toLowerCase().includes('not found')) {
          setError('Bu e-posta adresi kayıtlı değil');
        } else if (resetError.message.toLowerCase().includes('rate limit')) {
          setError('Çok fazla deneme. Lütfen daha sonra tekrar deneyin');
        } else {
          setError(resetError.message || 'Kod gönderilemedi');
        }
      } else {
        setStep('code');
      }
    } catch (err) {
      setError(
        err.message?.toLowerCase().includes('network')
          ? 'İnternet bağlantınızı kontrol edin'
          : 'Bir hata oluştu. Lütfen tekrar deneyin'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError(null);

    if (!verificationCode.trim()) {
      setError('Lütfen doğrulama kodunu girin');
      return;
    }

    if (!/^\d{6}$/.test(verificationCode.trim())) {
      setError('Doğrulama kodu 6 haneli olmalıdır');
      return;
    }

    setLoading(true);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: verificationCode.trim(),
        type: 'recovery',
      });

      if (verifyError) {
        if (
          verifyError.message.toLowerCase().includes('invalid') ||
          verifyError.message.toLowerCase().includes('expired')
        ) {
          setError('Geçersiz veya süresi dolmuş kod');
        } else {
          setError(verifyError.message || 'Kod doğrulanamadı');
        }
      } else {
        setStep('password');
      }
    } catch (err) {
      setError(
        err.message?.toLowerCase().includes('network')
          ? 'İnternet bağlantınızı kontrol edin'
          : 'Bir hata oluştu. Lütfen tekrar deneyin'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    setError(null);

    if (!newPassword || !confirmPassword) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    if (newPassword.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message || 'Şifre güncellenemedi');
      } else {
        setVerificationCode('');
        setNewPassword('');
        setConfirmPassword('');
        setStep('success');
      }
    } catch (err) {
      setError(
        err.message?.toLowerCase().includes('network')
          ? 'İnternet bağlantınızı kontrol edin'
          : 'Bir hata oluştu. Lütfen tekrar deneyin'
      );
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(newPassword);

  const renderError = () =>
    error ? (
      <View style={styles.errorBox}>
        <Ionicons name="alert-circle" size={18} color={COLORS.error} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    ) : null;

  const renderPrimaryButton = (label, onPress) => (
    <TouchableOpacity
      style={[styles.primaryButton, loading && styles.buttonDisabled]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.primaryButtonText}>{label}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <AuthFormLayout
      imageSource={AUTH_IMAGES.resetHero}
      keyboardVisible={keyboardVisible}
    >
      {step !== 'success' && (
        <TouchableOpacity
          style={styles.backRow}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
          <Text style={styles.backText}>Geri</Text>
        </TouchableOpacity>
      )}

      <View style={styles.headerBlock}>
        <Text style={styles.title}>Şifremi Unuttum</Text>
        <Text style={styles.stepTitle}>{meta.title}</Text>
        <Text style={styles.stepSubtitle}>{meta.subtitle}</Text>
      </View>

      {step === 'email' && (
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>E-posta</Text>
            <TextInput
              style={styles.input}
              placeholder="ornek@email.com"
              placeholderTextColor={COLORS.textLight}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>
          {renderError()}
          {renderPrimaryButton('Kod Gönder', handleSendCode)}
        </>
      )}

      {step === 'code' && (
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Doğrulama Kodu</Text>
            <TextInput
              style={styles.input}
              placeholder="000000"
              placeholderTextColor={COLORS.textLight}
              value={verificationCode}
              onChangeText={(text) => {
                setVerificationCode(text);
                setError(null);
              }}
              keyboardType="number-pad"
              maxLength={6}
              editable={!loading}
            />
          </View>
          {renderError()}
          {renderPrimaryButton('Kodu Doğrula', handleVerifyCode)}
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={handleSendCode}
            disabled={loading}
          >
            <Text style={styles.linkText}>Kodu tekrar gönder</Text>
          </TouchableOpacity>
        </>
      )}

      {step === 'password' && (
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Yeni Şifre</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textLight}
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  setError(null);
                }}
                secureTextEntry={!showNewPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Ionicons
                  name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textLight}
                />
              </TouchableOpacity>
            </View>
            {newPassword.length > 0 && (
              <View style={styles.strengthRow}>
                <View
                  style={[
                    styles.strengthBar,
                    { backgroundColor: strengthColors[strength] },
                  ]}
                />
                <Text style={[styles.strengthLabel, { color: strengthColors[strength] }]}>
                  {strengthLabels[strength]}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Şifre Tekrar</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textLight}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setError(null);
                }}
                secureTextEntry={!showConfirmPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textLight}
                />
              </TouchableOpacity>
            </View>
          </View>
          {renderError()}
          {renderPrimaryButton('Şifreyi Güncelle', handleUpdatePassword)}
        </>
      )}

      {step === 'success' && (
        <View style={styles.successBlock}>
          <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
          <Text style={styles.successTitle}>Şifren güncellendi</Text>
          <Text style={styles.successMsg}>Giriş ekranına yönlendiriliyorsun…</Text>
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
        </View>
      )}
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.md,
    marginTop: -SPACING.sm,
  },
  backText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  headerBlock: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.xxl,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    letterSpacing: -0.5,
  },
  stepTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  stepSubtitle: {
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
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: SPACING.xs,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: FONT_SIZES.xs,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(192, 57, 43, 0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(192, 57, 43, 0.2)',
  },
  errorText: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.sm,
    color: COLORS.error,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  primaryButtonText: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.md,
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  linkBtn: {
    alignSelf: 'center',
    paddingVertical: SPACING.sm,
  },
  linkText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
  },
  successBlock: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  successTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  successMsg: {
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
