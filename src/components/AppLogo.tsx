import React from 'react';
import Svg, { Path, Rect, G, Defs, LinearGradient, Stop } from 'react-native-svg';

interface AppLogoProps {
  size?: number;
}

export function AppLogo({ size = 64 }: AppLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Defs>
        <LinearGradient id="logoBg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#38BDF8" />
          <Stop offset="100%" stopColor="#0284C7" />
        </LinearGradient>
        <LinearGradient id="shieldGlow" x1="50" y1="10" x2="50" y2="90" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#0F172A" />
          <Stop offset="100%" stopColor="#1E293B" />
        </LinearGradient>
      </Defs>

      {/* Rounded Outer Badge Container */}
      <Rect x="5" y="5" width="90" height="90" rx="24" fill="url(#logoBg)" />

      {/* Homestay Shield & Building Icon */}
      <G>
        {/* Shield background inside badge */}
        <Path
          d="M50 18 L75 28 V50 C75 66 64 78 50 84 C36 78 25 66 25 50 V28 Z"
          fill="url(#shieldGlow)"
        />

        {/* Homestay House Roof */}
        <Path
          d="M38 46 L50 36 L62 46"
          stroke="#38BDF8"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Checkmark inside Shield */}
        <Path
          d="M42 55 L48 61 L59 49"
          stroke="#38BDF8"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
}
