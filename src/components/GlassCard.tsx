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
          "bg-white dark:bg-[#181A24] rounded-3xl border border-gray-200/60 dark:border-gray-800 shadow-sm",
          variant === 'elevated' && "shadow-md shadow-black/5 dark:shadow-black/30",
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
