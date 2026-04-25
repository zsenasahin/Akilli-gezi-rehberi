import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { COLORS, SPACING } from '../../constants/theme';

const { width } = Dimensions.get('window');

export default function GlassmorphismModal({
  visible,
  title,
  message,
  primaryAction,
  secondaryAction,
  onClose,
}) {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              <BlurView intensity={20} style={styles.blurContainer}>
                <View style={styles.card}>
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.message}>{message}</Text>

                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={primaryAction.onPress}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.primaryButtonText}>
                        {primaryAction.label}
                      </Text>
                    </TouchableOpacity>

                    {secondaryAction && (
                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={secondaryAction.onPress}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.secondaryButtonText}>
                          {secondaryAction.label}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </BlurView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85,
    maxWidth: 400,
  },
  blurContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: '#2C3E50',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#5D6D7E',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  buttonContainer: {
    gap: SPACING.sm,
  },
  primaryButton: {
    backgroundColor: '#A8E063',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#A8E063',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#2C3E50',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  secondaryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#7F8C8D',
  },
});
