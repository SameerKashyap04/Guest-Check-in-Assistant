import React, { forwardRef } from 'react';
import { Text, TouchableOpacity, TouchableOpacityProps, ActivityIndicator, View, StyleSheet } from 'react-native';
import { AIRBNB } from '@/theme/airbnb';

// ─── Airbnb Button System for StayMate ───────────────────────────────────────
// Direct 1:1 port of .btn variants from staymate-airbnb-redesign/app.html
// ─────────────────────────────────────────────────────────────────────────────

export interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'soft' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const Button = forwardRef<React.ElementRef<typeof TouchableOpacity>, ButtonProps>(
  ({ label, variant = 'primary', size = 'md', isLoading, icon, style, disabled, ...props }, ref) => {
    const isDisabled = disabled || isLoading;

    return (
      <TouchableOpacity
        ref={ref}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={[
          styles.base,
          styles[variant],
          size === 'sm' && styles.sizeSm,
          size === 'lg' && styles.sizeLg,
          isDisabled && styles.disabled,
          style,
        ]}
        {...props}
      >
        {isLoading ? (
          <ActivityIndicator
            color={variant === 'primary' ? '#ffffff' : variant === 'danger' ? AIRBNB.colors.rose : AIRBNB.colors.ink}
            style={{ marginRight: 8 }}
          />
        ) : icon ? (
          <View style={{ marginRight: 8 }}>{icon}</View>
        ) : null}
        <Text
          style={[
            styles.label,
            styles[`${variant}Label` as keyof typeof styles],
            size === 'sm' && styles.labelSm,
            size === 'lg' && styles.labelLg,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  }
);

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: AIRBNB.radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  sizeSm: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: AIRBNB.radius.full,
    width: 'auto',
  },
  sizeLg: {
    height: 56,
    paddingHorizontal: 28,
  },
  disabled: {
    opacity: 0.45,
  },

  // ── Variants ──
  primary: {
    backgroundColor: AIRBNB.colors.primary,
  },
  secondary: {
    backgroundColor: AIRBNB.colors.canvas,
    borderWidth: 1,
    borderColor: AIRBNB.colors.ink,
  },
  soft: {
    backgroundColor: AIRBNB.colors.surfaceStrong,
  },
  outline: {
    backgroundColor: AIRBNB.colors.canvas,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairline,
  },
  ghost: {
    backgroundColor: 'transparent',
    height: 'auto',
    width: 'auto',
    paddingHorizontal: 0,
  },
  danger: {
    backgroundColor: AIRBNB.colors.canvas,
    borderWidth: 1,
    borderColor: AIRBNB.colors.rose,
  },

  // ── Text Labels ──
  label: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0,
  },
  labelSm: {
    fontSize: 13.5,
  },
  labelLg: {
    fontSize: 16,
  },
  primaryLabel: {
    color: '#ffffff',
  },
  secondaryLabel: {
    color: AIRBNB.colors.ink,
  },
  softLabel: {
    color: AIRBNB.colors.ink,
  },
  outlineLabel: {
    color: AIRBNB.colors.ink,
  },
  ghostLabel: {
    color: AIRBNB.colors.ink,
  },
  dangerLabel: {
    color: AIRBNB.colors.rose,
  },
});

Button.displayName = 'Button';

export { Button };
export default Button;
