import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Home, BedDouble, Settings, ScanLine } from 'lucide-react-native';
import { Platform, View } from 'react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { useTranslation } from 'react-i18next';

// Airbnb single shadow tier
const TAB_BAR_SHADOW = Platform.select({
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
  },
  android: {
    elevation: 8,
  },
  default: {},
});

export default function TabLayout() {
  const { isUnlocked } = useAuthStore();
  const { t } = useTranslation();

  if (!isUnlocked) {
    return <Redirect href="/auth" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Rausch red for active tab
        tabBarActiveTintColor: '#222222',
        tabBarInactiveTintColor: '#929292',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          marginTop: 1,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 6,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 20 : 16,
          left: 16,
          right: 16,
          height: 68,
          borderRadius: 9999,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: '#ebebeb',
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          ...TAB_BAR_SHADOW,
        },
        tabBarBackground: () => (
          <View
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 9999,
              backgroundColor: 'rgba(255, 255, 255, 0.92)',
              overflow: 'hidden',
            }}
          />
        ),
      }}
    >
      {/* Dashboard */}
      <Tabs.Screen
        name="index"
        options={{
          title: t('dashboard'),
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', gap: 3 }}>
              <Home color={focused ? '#222222' : '#929292'} size={22} strokeWidth={focused ? 2.5 : 2} />
              {/* Rausch active dot */}
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: '#ff385c',
                  opacity: focused ? 1 : 0,
                }}
              />
            </View>
          ),
        }}
      />

      {/* Rooms */}
      <Tabs.Screen
        name="rooms"
        options={{
          title: t('rooms'),
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: 'center', gap: 3 }}>
              <BedDouble color={focused ? '#222222' : '#929292'} size={22} strokeWidth={focused ? 2.5 : 2} />
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: '#ff385c',
                  opacity: focused ? 1 : 0,
                }}
              />
            </View>
          ),
        }}
      />

      {/* Check-in FAB (centre) */}
      <Tabs.Screen
        name="scanner"
        options={{
          title: t('checkin'),
          tabBarLabel: () => null,
          tabBarIcon: () => (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                // Rausch gradient simulated via background
                backgroundColor: '#ff385c',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 30, // lifts FAB above tab bar
                // Glow shadow
                shadowColor: '#ff385c',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.55,
                shadowRadius: 16,
                elevation: 14,
                // White ring
                borderWidth: 5,
                borderColor: '#ffffff',
              }}
            >
              <ScanLine color="#ffffff" size={22} strokeWidth={2.2} />
            </View>
          ),
        }}
      />

      {/* Settings */}
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: 'center', gap: 3 }}>
              <Settings color={focused ? '#222222' : '#929292'} size={22} strokeWidth={focused ? 2.5 : 2} />
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: '#ff385c',
                  opacity: focused ? 1 : 0,
                }}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}


