import React, { useState } from 'react';
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
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SPACING } from '../../constants/theme';
import { signIn, signUp, signInWithGoogle } from '../../data/repositories/authRepository';
import GlassmorphismModal from '../../components/common/GlassmorphismModal';

const { height } = Dimensions.get('window');

export default function AuthScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
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
          if (error.message?.toLowerCase().includes('invalid') ||
              error.message?.toLowerCase().includes('credentials')) {
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
          Alert.alert(
            'Kayıt Başarılı',
            'E-postanıza gönderilen doğrulama linkine tıklayın.',
            [{ text: 'Tamam', onPress: () => setIsLogin(true) }]
          );
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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Top Background Section */}
      <View style={styles.topSection}>
        <Image
          source={require('../../../assets/doga.jpg')}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.2)', 'rgba(0, 0, 0, 0.4)']}
          style={styles.imageOverlay}
        />
      </View>

      {/* Bottom White Card Section */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.bottomSection}
      >
        <View style={styles.card}>
          <View style={styles.cardContent}>
            {/* Welcome Text */}
            <Text style={styles.welcomeTitle}>
              {isLogin ? 'Hoş Geldin!' : 'Aramıza Katıl'}
            </Text>
            {!isLogin && (
              <Text style={styles.welcomeSubtitle}>Yeni maceralara başla</Text>
            )}

            {/* Input Fields */}
            {!isLogin && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Ad Soyad</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Adınızı girin"
                  placeholderTextColor="#999"
                  value={name}
                  onChangeText={setName}
                  editable={!loading}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>E-posta</Text>
              <TextInput
                style={styles.input}
                placeholder="ornek@email.com"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Şifre</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="••••••••"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            {isLogin && (
              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => setShowForgotPasswordModal(true)}
                disabled={loading}
              >
                <Text style={styles.forgotPasswordText}>Şifremi unuttum?</Text>
              </TouchableOpacity>
            )}

            {/* Primary Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Lütfen bekleyin...' : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}
              </Text>
            </TouchableOpacity>

            {/* Switch Auth Mode */}
            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>
                {isLogin ? 'Hesabın yok mu?' : 'Zaten hesabın var mı?'}
              </Text>
              <TouchableOpacity onPress={() => setIsLogin(!isLogin)} disabled={loading}>
                <Text style={styles.switchLink}>
                  {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ya da</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign-In Button */}
            <TouchableOpacity
              style={[styles.googleButton, loading && styles.buttonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={loading}
              activeOpacity={0.8}
            >
              <View style={styles.googleIconContainer}>
                <Text style={styles.googleIcon}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>
                {loading ? 'Bağlanıyor...' : 'Google ile giriş yap'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Glassmorphism Modal for Forgot Password */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E9',
  },
  topSection: {
    height: height * 0.35,
    width: '100%',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  bottomSection: {
    flex: 1,
    marginTop: -30,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  cardContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.lg,
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 24,
    color: '#2C3E50',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: SPACING.md,
  },
  inputContainer: {
    marginBottom: SPACING.sm,
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
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#C8E6C9',
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
    marginBottom: SPACING.lg,
    marginTop: -SPACING.xs,
  },
  forgotPasswordText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#7F8C8D',
  },
  primaryButton: {
    backgroundColor: '#2C3E50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: SPACING.md,
    shadowColor: '#2C3E50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: 6,
  },
  switchText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#7F8C8D',
  },
  switchLink: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#2C3E50',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#95A5A6',
    marginHorizontal: SPACING.md,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  googleButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#2C3E50',
  },
});
