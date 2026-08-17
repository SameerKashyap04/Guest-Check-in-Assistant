import React from 'react';
import { View, ViewProps } from 'react-native';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Airbnb single shadow tier — the only elevation level in the system
const AIRBNB_SHADOW = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.10,
  shadowRadius: 8,
  elevation: 3,
};

export interface GlassCardProps extends ViewProps {
  /**
   * default  – white canvas, hairline-soft border (#ebebeb), Airbnb shadow
   * elevated – alias for default (same treatment)
   * subtle   – white canvas, flat, no shadow, no border
   */
  variant?: 'default' | 'elevated' | 'subtle';
}

export const GlassCard = React.forwardRef<View, GlassCardProps>(
  ({ className, variant = 'default', children, style, ...props }, ref) => {
    const isSubtle = variant === 'subtle';
    return (
      <View
        ref={ref}
        style={[!isSubtle ? AIRBNB_SHADOW : undefined, style]}
        className={cn(
          'bg-white rounded-2xl',
          !isSubtle && 'border border-[#ebebeb]',
          className
        )}
        {...props}
      >
        {children}
      </View>
    );
  }
);

GlassCard.displayName = 'GlassCard';
