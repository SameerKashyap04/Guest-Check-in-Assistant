import React, { forwardRef } from 'react';
import { Text, TouchableOpacity, TouchableOpacityProps, ActivityIndicator, View } from 'react-native';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  /**
   * primary  – Rausch #ff385c fill, white text, 8px radius
   * secondary – white canvas, ink border + text, 8px radius
   * soft     – surface-strong #f2f2f2 fill, ink text
   * pill     – Rausch fill, full pill radius, compact
   * ghost    – transparent, ink text
   * danger   – rose red fill, white text
   */
  variant?: 'primary' | 'secondary' | 'soft' | 'pill' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const Button = forwardRef<React.ElementRef<typeof TouchableOpacity>, ButtonProps>(
  ({ label, variant = 'primary', size = 'md', isLoading, icon, className, disabled, style, ...props }, ref) => {

    const containerVariants: Record<string, string> = {
      primary:   'bg-[#ff385c] rounded-[8px]',
      secondary: 'bg-white rounded-[8px] border border-[#222222]',
      soft:      'bg-[#f2f2f2] rounded-[8px]',
      pill:      'bg-[#ff385c] rounded-full',
      ghost:     'bg-transparent rounded-[8px]',
      danger:    'bg-[#c13515] rounded-[8px]',
    };

    const textVariants: Record<string, string> = {
      primary:   'text-white',
      secondary: 'text-[#222222]',
      soft:      'text-[#222222]',
      pill:      'text-white',
      ghost:     'text-[#222222]',
      danger:    'text-white',
    };

    const heights: Record<string, string> = {
      sm: 'h-9',
      md: 'h-12',
      lg: 'h-[50px]',
    };

    const textSizes: Record<string, string> = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-base',
    };

    const isDisabled = disabled || isLoading;
    const loaderColor = (variant === 'secondary' || variant === 'soft' || variant === 'ghost') ? '#222222' : '#FFFFFF';

    return (
      <TouchableOpacity
        ref={ref}
        disabled={isDisabled}
        activeOpacity={0.8}
        className={cn(
          'flex-row items-center justify-center gap-2 px-6',
          containerVariants[variant],
          heights[size],
          isDisabled && 'opacity-50',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <ActivityIndicator color={loaderColor} size="small" />
        ) : icon ? (
          icon
        ) : null}
        <Text
          className={cn(
            'font-[500]',
            textVariants[variant],
            textSizes[size]
          )}
          style={{ fontWeight: '500' }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';

export { Button };

