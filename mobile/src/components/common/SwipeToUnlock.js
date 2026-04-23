import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING } from '../../constants/theme';

const { width } = Dimensions.get('window');
const TRACK_WIDTH = width - 80;
const THUMB_SIZE = 60;
const SWIPE_THRESHOLD = 0.85;

export default function SwipeToUnlock({ onComplete }) {
  const [completed, setCompleted] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !completed,
      onMoveShouldSetPanResponder: () => !completed,
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.max(0, Math.min(gestureState.dx, TRACK_WIDTH - THUMB_SIZE));
        translateX.setValue(newX);
        
        const progress = newX / (TRACK_WIDTH - THUMB_SIZE);
        opacity.setValue(1 - progress);
      },
      onPanResponderRelease: (_, gestureState) => {
        const progress = gestureState.dx / (TRACK_WIDTH - THUMB_SIZE);
        
        if (progress >= SWIPE_THRESHOLD) {
          setCompleted(true);
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: TRACK_WIDTH - THUMB_SIZE,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setTimeout(() => onComplete?.(), 300);
          });
        } else {
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 50,
              friction: 7,
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <Animated.Text style={[styles.label, { opacity }]}>
          G O
        </Animated.Text>
        
        <Animated.View
          style={[
            styles.thumb,
            {
              transform: [{ translateX }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <LinearGradient
            colors={[COLORS.primaryAccent, '#8BC34A']}
            style={styles.thumbGradient}
          >
            <Text style={styles.arrow}>→</Text>
          </LinearGradient>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  track: {
    width: TRACK_WIDTH,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.glassMorphismLight,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 8,
  },
  thumb: {
    position: 'absolute',
    left: 5,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
  },
  thumbGradient: {
    width: '100%',
    height: '100%',
    borderRadius: THUMB_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primaryAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  arrow: {
    fontSize: 28,
    color: COLORS.backgroundDarkStart,
    fontWeight: 'bold',
  },
});
