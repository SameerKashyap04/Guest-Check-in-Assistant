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
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 1,
          paddingBottom: Platform.OS === 'ios' ? 0 : 2,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 20 : 16,
          left: 20,
          right: 20,
          marginHorizontal: 20,
          height: 56,
          borderRadius: 28,
          borderTopWidth: 0,
          borderWidth: 1.5,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.75)',
          backgroundColor: 'transparent',
          elevation: 10,
          shadowColor: isDark ? '#38BDF8' : '#0F172A',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.35 : 0.18,
          shadowRadius: 16,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill} className="overflow-hidden rounded-full">
            <BlurView
              tint={isDark ? 'dark' : 'light'}
              intensity={Platform.OS === 'ios' ? 85 : 100}
              style={StyleSheet.absoluteFill}
              className="bg-white/70 dark:bg-[#0D0F14]/75"
            />
          </View>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <View className="w-7 h-7 items-center justify-center">
              <Home color={color} size={20} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Check-in',
          tabBarIcon: ({ color }) => (
            <View className="w-7 h-7 items-center justify-center">
              <View className="bg-[#38BDF8] -mt-4 w-11 h-11 rounded-full items-center justify-center shadow-lg shadow-[#38BDF8]/40 border-2 border-white dark:border-[#12141C]">
                <ScanLine color="#FFFFFF" size={20} />
              </View>
            </View>
          ),
          tabBarLabel: 'Check-in',
        }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          title: 'Rooms',
          tabBarIcon: ({ color }) => (
            <View className="w-7 h-7 items-center justify-center">
              <BedDouble color={color} size={20} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <View className="w-7 h-7 items-center justify-center">
              <Settings color={color} size={20} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
