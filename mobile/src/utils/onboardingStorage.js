import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@smarttravel/onboarding_completed';

export async function hasCompletedOnboarding() {
  const value = await AsyncStorage.getItem(ONBOARDING_KEY);
  return value === 'true';
}

export async function markOnboardingCompleted() {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}
