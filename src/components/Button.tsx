import { Text, TouchableOpacity, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { forwardRef } from 'react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const Button = forwardRef<React.ElementRef<typeof TouchableOpacity>, ButtonProps>(
  ({ label, variant = 'primary', size = 'md', isLoading, icon, className, disabled, ...props }, ref) => {
    
    const baseStyles = "flex-row items-center justify-center rounded-2xl active:opacity-80";
    
    const variants = {
      primary: "bg-primary shadow-sm",
      secondary: "bg-secondary shadow-sm",
      outline: "bg-transparent",
      ghost: "bg-transparent",
    };

    const textVariants = {
      primary: "text-white",
      secondary: "text-white",
      outline: "text-foreground",
      ghost: "text-foreground",
    };

    const sizes = {
      sm: "px-4 py-2",
      md: "px-6 py-3.5",
      lg: "px-8 py-4",
    };

    const textSizes = {
      sm: "text-sm font-medium",
      md: "text-base font-semibold",
      lg: "text-lg font-bold",
    };

    const isDisabled = disabled || isLoading;

    return (
      <TouchableOpacity
        ref={ref}
        disabled={isDisabled}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          isDisabled && "opacity-50",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? '#2563EB' : '#FFFFFF'} className="mr-2" />
        ) : icon ? (
          icon
        ) : null}
        <Text className={cn(textVariants[variant], textSizes[size])}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';

export { Button };
