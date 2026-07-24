import { PinScreen } from '@/features/auth/PinScreen';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PinScreen />
    </>
  );
}
