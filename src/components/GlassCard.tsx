import React from 'react';
import { View, ViewProps } from 'react-native';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface GlassCardProps extends ViewProps {
  variant?: 'default' | 'elevated';
}

export const GlassCard = React.forwardRef<View, GlassCardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    return (
      <View
        ref={ref}
        className={cn(
          "bg-white/80 dark:bg-black/40 rounded-3xl border border-transparent dark:border-transparent",
          variant === 'elevated' && "shadow-lg shadow-black/5 dark:shadow-black/20",
          className
        )}
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        } as any}
        {...props}
      >
        {children}
      </View>
    );
  }
);

GlassCard.displayName = 'GlassCard';
