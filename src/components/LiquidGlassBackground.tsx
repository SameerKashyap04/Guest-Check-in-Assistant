import React from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';

export function LiquidGlassBackground() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Top Left Liquid Ambient Orb */}
      <View 
        style={{
          position: 'absolute',
          top: -60,
          left: -40,
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(56, 189, 248, 0.18)',
        }}
      />

      {/* Top Right Liquid Purple Orb */}
      <View 
        style={{
          position: 'absolute',
          top: 80,
          right: -50,
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: isDark ? 'rgba(147, 51, 234, 0.10)' : 'rgba(129, 140, 248, 0.16)',
        }}
      />

      {/* Middle/Bottom Soft Liquid Accent */}
      <View 
        style={{
          position: 'absolute',
          bottom: 120,
          left: '20%',
          width: 240,
          height: 140,
          borderRadius: 70,
          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(56, 189, 248, 0.12)',
        }}
      />
    </View>
  );
}
