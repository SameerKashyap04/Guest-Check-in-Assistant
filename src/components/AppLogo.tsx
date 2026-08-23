import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const StayMateLogo = require('../../assets/images/staymate-logo.png');
const StayMateLogoDark = require('../../assets/images/staymate-logo-dark.png');

interface AppLogoProps {
  size?: number;
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
  dark?: boolean;
}

export function AppLogo({ size, width, height, style, dark }: AppLogoProps) {
  let isDarkMode = false;
  try {
    const theme = useTheme();
    isDarkMode = theme?.isDark ?? false;
  } catch (_) {}

  const activeDark = dark !== undefined ? dark : isDarkMode;
  const w = width ?? (size ? size * 3.2 : 160);
  const h = height ?? (size ?? 42);

  return (
    <Image
      source={activeDark ? StayMateLogoDark : StayMateLogo}
      style={[{ width: w, height: h }, style]}
      resizeMode="contain"
    />
  );
}


