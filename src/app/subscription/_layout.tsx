import { Stack } from 'expo-router';

export default function SubscriptionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="pricing" />
      <Stack.Screen name="checkout" />
      <Stack.Screen name="payment-status" />
      <Stack.Screen name="success" />
    </Stack>
  );
}
