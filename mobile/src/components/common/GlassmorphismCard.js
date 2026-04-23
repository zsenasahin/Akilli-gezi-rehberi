import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';

export default function GlassmorphismCard({ children, style }) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.glassMorphism,
    borderRadius: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    overflow: 'hidden',
  },
});
