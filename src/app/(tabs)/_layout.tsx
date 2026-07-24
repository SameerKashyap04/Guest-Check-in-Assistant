import { Tabs } from 'expo-router';
import { Home, Users, Bed, Settings, ScanLine } from 'lucide-react-native';
import { useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { Platform, View } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: isDark ? '#0D0F14' : '#FAFAF7',
        },
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerTintColor: isDark ? '#fff' : '#000',
        tabBarActiveTintColor: '#38BDF8',
        tabBarInactiveTintColor: '#9498AA',
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 68,
          backgroundColor: 'transparent',
        },
        tabBarBackground: () => (
          <BlurView
            tint={isDark ? 'dark' : 'light'}
            intensity={80}
            className="absolute inset-0 bg-white/80 dark:bg-[#0D0F14]/80"
          />
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Check-in',
          tabBarIcon: ({ color, size }) => (
            <View className="bg-[#38BDF8] -mt-8 w-14 h-14 rounded-full items-center justify-center shadow-lg shadow-[#38BDF8]/30">
              <ScanLine color="#FFFFFF" size={28} />
            </View>
          ),
          tabBarLabel: 'Scan ID',
        }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          title: 'Rooms',
          tabBarIcon: ({ color, size }) => <Bed color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
