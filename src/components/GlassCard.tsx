import React from 'react';
import { View, ViewProps, StyleSheet, useColorScheme } from 'react-native';

export interface GlassCardProps extends ViewProps {
  variant?: 'default' | 'elevated';
}

export const GlassCard = React.forwardRef<View, GlassCardProps>(
  ({ style, variant = 'default', children, ...props }, ref) => {
    const isDark = useColorScheme() === 'dark';
    const cardBg = isDark ? '#181A24' : '#FFFFFF';
    const cardBorder = isDark ? '#1F2937' : 'rgba(0,0,0,0.08)';
    const cardElevatedBg = isDark ? '#1E2130' : '#FFFFFF';

    return (
      <View
        ref={ref}
        style={[
          styles.base,
          { backgroundColor: variant === 'elevated' ? cardElevatedBg : cardBg, borderColor: cardBorder },
          variant === 'elevated' && styles.elevated,
          style,
        ]}
        {...props}
      >
        {children}
      </View>
    );
  }
);

GlassCard.displayName = 'GlassCard';

const styles = StyleSheet.create({
  base: {
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  elevated: {
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
});
