import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function CheckinLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
        },
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerTintColor: isDark ? '#fff' : '#000',
        headerBackTitle: 'Back',
      }}>
      <Stack.Screen name="camera" options={{ headerShown: false }} />
      <Stack.Screen name="manual" options={{ title: 'Manual Entry' }} />
      <Stack.Screen name="review" options={{ title: 'Review Details' }} />
    </Stack>
  );
}
