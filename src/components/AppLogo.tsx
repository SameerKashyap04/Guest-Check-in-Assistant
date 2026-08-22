import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

const StayMateLogo = require('../../assets/images/staymate-logo.png');

interface AppLogoProps {
  size?: number;
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
}

export function AppLogo({ size, width, height, style }: AppLogoProps) {
  const w = width ?? (size ? size * 3.2 : 160);
  const h = height ?? (size ?? 42);

  return (
    <Image
      source={StayMateLogo}
      style={[{ width: w, height: h }, style]}
      resizeMode="contain"
    />
  );
}


