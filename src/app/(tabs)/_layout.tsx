import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Home, BedDouble, Settings, ScanLine } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { BlurView } from 'expo-blur';
import { Platform, View, StyleSheet } from 'react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { AIRBNB } from '@/theme/airbnb';

// ─── Airbnb Floating Tab Bar for StayMate ─────────────────────────────────────
// Exact 1:1 port of .tabbar & .tab-fab from staymate-airbnb-redesign/app.html
// ─────────────────────────────────────────────────────────────────────────────

export default function TabLayout() {
  const { isUnlocked } = useAuthStore();
  const { colorScheme } = useColorScheme();
  const { t } = useTranslation();
  const isDark = colorScheme === 'dark';

  if (!isUnlocked) {
    return <Redirect href="/auth" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: AIRBNB.colors.ink,
        tabBarInactiveTintColor: AIRBNB.colors.mutedSoft,
        tabBarShowLabel: true,
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 6,
          flex: 1,
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '600',
          marginTop: 2,
          letterSpacing: 0,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 20 : 16,
          left: 16,
          right: 16,
          height: 68,
          borderRadius: AIRBNB.radius.full,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : AIRBNB.colors.hairlineSoft,
          backgroundColor: 'transparent',
          ...AIRBNB.shadow.tabBar,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill} className="overflow-hidden rounded-full">
            <BlurView
              tint={isDark ? 'dark' : 'light'}
              intensity={Platform.OS === 'ios' ? 88 : 95}
              style={StyleSheet.absoluteFill}
              className="bg-white/90 dark:bg-[#121214]/90"
            />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('dashboard'),
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabItem}>
              <Home
                color={focused ? AIRBNB.colors.ink : AIRBNB.colors.mutedSoft}
                size={22}
                strokeWidth={2}
              />
              <View style={[styles.activeDot, { opacity: focused ? 1 : 0 }]} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: t('checkin'),
          tabBarIcon: () => (
            <View style={styles.fabWrapper}>
              <View style={styles.fab}>
                <ScanLine color="#FFFFFF" size={24} strokeWidth={2.2} />
              </View>
            </View>
          ),
          tabBarLabelStyle: {
            fontSize: 10.5,
            fontWeight: '700',
            color: AIRBNB.colors.primary,
            marginTop: 2,
          },
        }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          title: t('rooms'),
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabItem}>
              <BedDouble
                color={focused ? AIRBNB.colors.ink : AIRBNB.colors.mutedSoft}
                size={22}
                strokeWidth={2}
              />
              <View style={[styles.activeDot, { opacity: focused ? 1 : 0 }]} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabItem}>
              <Settings
                color={focused ? AIRBNB.colors.ink : AIRBNB.colors.mutedSoft}
                size={22}
                strokeWidth={2}
              />
              <View style={[styles.activeDot, { opacity: focused ? 1 : 0 }]} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: AIRBNB.colors.primary,
    marginTop: 2,
  },
  fabWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AIRBNB.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: '#ffffff',
    ...AIRBNB.shadow.fab,
  },
});
