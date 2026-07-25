import { Tabs } from 'expo-router';
import { Home, Bed, Settings, ScanLine } from 'lucide-react-native';
import { useColorScheme, Platform, View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

function LiquidGlassTabBarBackground() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Liquid Ambient Glow Orbs behind glass */}
      <View 
        style={{ 
          position: 'absolute', 
          top: -15, 
          left: '12%', 
          width: 130, 
          height: 60, 
          borderRadius: 30, 
          backgroundColor: isDark ? 'rgba(56, 189, 248, 0.22)' : 'rgba(56, 189, 248, 0.35)', 
        }} 
      />
      <View 
        style={{ 
          position: 'absolute', 
          top: -15, 
          right: '12%', 
          width: 130, 
          height: 60, 
          borderRadius: 30, 
          backgroundColor: isDark ? 'rgba(168, 85, 247, 0.18)' : 'rgba(99, 102, 241, 0.28)', 
        }} 
      />

      {/* High Intensity Frosted Blur View */}
      <BlurView
        intensity={Platform.OS === 'ios' ? 90 : 100}
        tint={isDark ? 'dark' : 'light'}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: isDark ? 'rgba(13, 15, 20, 0.92)' : 'rgba(255, 255, 255, 0.94)',
          borderTopWidth: 1,
          borderTopColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(229, 231, 235, 0.8)',
        }}
      />
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#38BDF8',
        tabBarInactiveTintColor: isDark ? '#9498AA' : '#64748B',
        tabBarLabelStyle: {
          fontWeight: '700',
          fontSize: 11,
          marginTop: -2,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          borderTopWidth: 0,
          elevation: 20,
          height: Platform.OS === 'ios' ? 90 : 72,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          backgroundColor: 'transparent',
        },
        tabBarBackground: () => <LiquidGlassTabBarBackground />,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? 'bg-sky-500/15 p-1.5 rounded-xl' : 'p-1.5'}>
              <Home color={color} size={22} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Scan ID',
          tabBarIcon: ({ color, focused }) => (
            <View className="relative items-center justify-center -mt-7">
              {/* Liquid Pulse Halo */}
              <View className="absolute w-16 h-16 rounded-full bg-sky-400/30 dark:bg-sky-400/40" />
              <View className="w-14 h-14 rounded-full bg-sky-500 items-center justify-center shadow-lg shadow-sky-500/40 border-2 border-white/60 dark:border-white/20">
                <ScanLine color="#FFFFFF" size={26} />
              </View>
            </View>
          ),
          tabBarLabel: 'Scan ID',
        }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          title: 'Rooms',
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? 'bg-sky-500/15 p-1.5 rounded-xl' : 'p-1.5'}>
              <Bed color={color} size={22} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? 'bg-sky-500/15 p-1.5 rounded-xl' : 'p-1.5'}>
              <Settings color={color} size={22} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
