import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { BottomNav, TabName } from '@/components/v3/BottomNav';

export default function TabLayout() {
  const { isUnlocked } = useAuthStore();

  if (!isUnlocked) {
    return <Redirect href="/auth" />;
  }

  return (
    <Tabs
      tabBar={({ state, navigation }) => {
        const routeName = state.routes[state.index]?.name;
        const currentTab: TabName =
          routeName === 'index' ? 'dashboard' : (routeName as TabName);

        return (
          <BottomNav
            tab={currentTab}
            onChange={(tabName) => {
              const targetRoute = tabName === 'dashboard' ? 'index' : tabName;
              navigation.navigate(targetRoute);
            }}
          />
        );
      }}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="scanner" />
      <Tabs.Screen name="rooms" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
