import React from 'react';
import { Tabs } from 'expo-router';
import { Home, BedDouble, Settings, ScanLine } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { BlurView } from 'expo-blur';
import { Platform, View, StyleSheet } from 'react-native';

export default function TabLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#38BDF8',
        tabBarInactiveTintColor: isDark ? '#9498AA' : '#64748B',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: -2,
          paddingBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 16,
          left: 16,
          right: 16,
          height: 68,
          borderRadius: 34,
          borderTopWidth: 0,
          borderWidth: 1.5,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.75)',
          backgroundColor: 'transparent',
          elevation: 10,
          shadowColor: isDark ? '#38BDF8' : '#0F172A',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDark ? 0.35 : 0.18,
          shadowRadius: 20,
          overflow: 'hidden',
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill} className="overflow-hidden rounded-full">
            <BlurView
              tint={isDark ? 'dark' : 'light'}
              intensity={Platform.OS === 'ios' ? 85 : 100}
              style={StyleSheet.absoluteFill}
              className="bg-white/70 dark:bg-[#0D0F14]/75"
            />
            {/* Top Gloss Reflection Line */}
            <View className="absolute top-0 left-0 right-0 h-[1.5px] bg-white/80 dark:bg-white/25" />
            {/* Bottom Subtle Ambient Tint */}
            <View className="absolute bottom-0 left-0 right-0 h-1/2 bg-sky-500/5 dark:bg-sky-400/5" />
          </View>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center">
              <Home color={color} size={focused ? 24 : 22} />
              {focused && (
                <View className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] mt-1" />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Scan ID',
          tabBarIcon: ({ color, focused }) => (
            <View className="bg-[#38BDF8] -mt-6 w-14 h-14 rounded-full items-center justify-center shadow-xl shadow-[#38BDF8]/50 border-2 border-white dark:border-[#12141C]">
              <ScanLine color="#FFFFFF" size={26} />
            </View>
          ),
          tabBarLabel: 'Check-in',
        }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          title: 'Rooms',
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center">
              <BedDouble color={color} size={focused ? 24 : 22} />
              {focused && (
                <View className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] mt-1" />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center">
              <Settings color={color} size={focused ? 24 : 22} />
              {focused && (
                <View className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] mt-1" />
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
