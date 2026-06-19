import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING } from '../../constants/layout';

export default function EmailVerificationPanel({
  email,
  loading,
  onGoToLogin,
  onResend,
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Ionicons name="mail-open-outline" size={40} color={COLORS.primary} />
      </View>
      <Text style={styles.title}>E-postanı doğrula</Text>
      <Text style={styles.desc}>
        <Text style={styles.email}>{email}</Text>
        {' '}adresine bir doğrulama bağlantısı gönderdik.
      </Text>

      <View style={styles.tips}>
        {['Gelen kutusu ve spam klasörünü kontrol et', 'Bağlantı sınırlı süre geçerlidir'].map(
          (tip) => (
            <View key={tip} style={styles.tipRow}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          )
        )}
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={onGoToLogin} activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>Giriş ekranına dön</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resendBtn} onPress={onResend} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="small" />
        ) : (
          <>
            <Ionicons name="refresh" size={16} color={COLORS.primary} />
            <Text style={styles.resendText}>Tekrar gönder</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: SPACING.sm,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryMuted,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  desc: {
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  email: {
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textPrimary,
  },
  tips: {
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  tipText: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  primaryBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.md,
    color: '#FFFFFF',
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
  },
  resendText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
  },
});
