import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { AIRBNB } from '@/theme/airbnb';

// ─── Airbnb Card Primitive for StayMate ──────────────────────────────────────
// Direct port of .card and .metric-card from staymate-airbnb-redesign/app.html
// Pure white canvas with #ebebeb hairline border, 14px radius and soft shadow
// ─────────────────────────────────────────────────────────────────────────────

export interface GlassCardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'soft';
}

export const GlassCard = React.forwardRef<View, GlassCardProps>(
  ({ style, variant = 'default', children, ...props }, ref) => {
    return (
      <View
        ref={ref}
        style={[
          styles.base,
          variant === 'soft' && styles.soft,
          AIRBNB.shadow.card,
          style,
        ]}
        {...props}
      >
        {children}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  base: {
    backgroundColor: AIRBNB.colors.canvas,
    borderRadius: AIRBNB.radius.md,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairlineSoft,
    overflow: 'hidden',
  },
  soft: {
    backgroundColor: AIRBNB.colors.surfaceSoft,
    borderColor: AIRBNB.colors.hairline,
  },
});

GlassCard.displayName = 'GlassCard';

export default GlassCard;
