import { BusinessSetupScreen } from '@/features/auth/BusinessSetupScreen';
import { Stack } from 'expo-router';

export default function SetupLayout() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <BusinessSetupScreen />
    </>
  );
}
