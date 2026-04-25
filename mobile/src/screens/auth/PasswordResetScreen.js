import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { COLORS, SPACING } from '../../constants/theme';
import { supabase } from '../../config/supabase';
import GlassmorphismCard from '../../components/common/GlassmorphismCard';

const { width, height } = Dimensions.get('window');

export default function PasswordResetScreen({ navigation, route }) {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [step, setStep] = useState('email'); // 'email' | 'code' | 'password' | 'success'
  const [email, setEmail] = useState(route.params?.email || '');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (step === 'success') {
      const timer = setTimeout(() => {
        navigation.navigate('Auth', { email });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  if (!fontsLoaded) {
    return null;
  }

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getPasswordStrength = (password) => {
    if (password.length < 8) return 'weak';
    if (password.length < 12) return 'medium';
    return 'strong';
  };

  const getPasswordStrengthColor = (strength) => {
    switch (strength) {
      case 'weak': return '#E74C3C';
      case 'medium': return '#F39C12';
      case 'strong': return '#27AE60';
      default: return '#BDC3C7';
    }
  };

  const getPasswordStrengthText = (strength) => {
    switch (strength) {
      case 'weak': return 'Zayıf';
      case 'medium': return 'Orta';
      case 'strong': return 'Güçlü';
      default: return '';
    }
  };

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
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: 'smarttravelguide://reset-password',
        }
      );

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
      if (err.message.toLowerCase().includes('network')) {
        setError('İnternet bağlantınızı kontrol edin');
      } else {
        setError('Bir hata oluştu. Lütfen tekrar deneyin');
      }
      console.error('Password reset error:', err);
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
        if (verifyError.message.toLowerCase().includes('invalid') || 
            verifyError.message.toLowerCase().includes('expired')) {
          setError('Geçersiz veya süresi dolmuş kod');
        } else {
          setError(verifyError.message || 'Kod doğrulanamadı');
        }
      } else {
        setStep('password');
      }
    } catch (err) {
      if (err.message.toLowerCase().includes('network')) {
        setError('İnternet bağlantınızı kontrol edin');
      } else {
        setError('Bir hata oluştu. Lütfen tekrar deneyin');
      }
      console.error('Code verification error:', err);
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
        // Clear sensitive data
        setVerificationCode('');
        setNewPassword('');
        setConfirmPassword('');
        setStep('success');
      }
    } catch (err) {
      if (err.message.toLowerCase().includes('network')) {
        setError('İnternet bağlantınızı kontrol edin');
      } else {
        setError('Bir hata oluştu. Lütfen tekrar deneyin');
      }
      console.error('Password update error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = () => {
    setVerificationCode('');
    setError(null);
    handleSendCode();
  };

  const renderEmailStep = () => (
    <>
      <Text style={styles.stepTitle}>E-posta Adresiniz</Text>
      <Text style={styles.stepDescription}>
        Şifre sıfırlama kodu göndereceğimiz e-posta adresinizi girin
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>E-posta</Text>
        <TextInput
          style={styles.input}
          placeholder="ornek@email.com"
          placeholderTextColor="#999"
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

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color="#E74C3C" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleSendCode}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>Kod Gönder</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderCodeStep = () => (
    <>
      <Text style={styles.stepTitle}>Doğrulama Kodu</Text>
      <Text style={styles.stepDescription}>
        E-postanıza gönderilen 6 haneli kodu girin
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Doğrulama Kodu</Text>
        <TextInput
          style={styles.input}
          placeholder="000000"
          placeholderTextColor="#999"
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

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color="#E74C3C" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleVerifyCode}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>Kodu Doğrula</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resendLink}
        onPress={handleResendCode}
        disabled={loading}
      >
        <Text style={styles.resendLinkText}>Kodu Tekrar Gönder</Text>
      </TouchableOpacity>
    </>
  );

  const renderPasswordStep = () => {
    const strength = getPasswordStrength(newPassword);
    const strengthColor = getPasswordStrengthColor(strength);
    const strengthText = getPasswordStrengthText(strength);

    return (
      <>
        <Text style={styles.stepTitle}>Yeni Şifre</Text>
        <Text style={styles.stepDescription}>
          Hesabınız için yeni bir şifre belirleyin
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Yeni Şifre</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="••••••••"
              placeholderTextColor="#999"
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
                color="#999"
              />
            </TouchableOpacity>
          </View>
          {newPassword.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={[styles.strengthBar, { backgroundColor: strengthColor }]} />
              <Text style={[styles.strengthText, { color: strengthColor }]}>
                {strengthText}
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
              placeholderTextColor="#999"
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
                color="#999"
              />
            </TouchableOpacity>
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color="#E74C3C" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleUpdatePassword}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Şifreyi Güncelle</Text>
          )}
        </TouchableOpacity>
      </>
    );
  };

  const renderSuccessStep = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIconContainer}>
        <Ionicons name="checkmark-circle" size={80} color="#27AE60" />
      </View>
      <Text style={styles.successTitle}>Başarılı!</Text>
      <Text style={styles.successMessage}>
        Şifreniz başarıyla güncellendi. Giriş ekranına yönlendiriliyorsunuz...
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background Image */}
      <Image
        source={require('../../../assets/doga.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      {/* Gradient Overlay */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.6)']}
        style={styles.gradient}
      />

      {/* Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          {step !== 'success' && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* Main Card */}
          <GlassmorphismCard style={styles.card}>
            <Text style={styles.title}>Şifremi Unuttum</Text>

            {step === 'email' && renderEmailStep()}
            {step === 'code' && renderCodeStep()}
            {step === 'password' && renderPasswordStep()}
            {step === 'success' && renderSuccessStep()}
          </GlassmorphismCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDarkStart,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  card: {
    padding: SPACING.xl,
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 28,
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  stepTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#2C3E50',
    marginBottom: SPACING.xs,
  },
  stepDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#5D6D7E',
    marginBottom: SPACING.xs,
  },
  input: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#2C3E50',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(200, 230, 201, 0.5)',
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
  strengthContainer: {
    marginTop: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  strengthBar: {
    height: 4,
    flex: 1,
    borderRadius: 2,
  },
  strengthText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  errorText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#E74C3C',
  },
  primaryButton: {
    backgroundColor: '#2C3E50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: SPACING.sm,
    shadowColor: '#2C3E50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  resendLink: {
    alignSelf: 'center',
    marginTop: SPACING.md,
    padding: SPACING.sm,
  },
  resendLinkText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#2C3E50',
    textDecorationLine: 'underline',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  successIconContainer: {
    marginBottom: SPACING.lg,
  },
  successTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#27AE60',
    marginBottom: SPACING.sm,
  },
  successMessage: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#5D6D7E',
    textAlign: 'center',
    lineHeight: 22,
  },
});
