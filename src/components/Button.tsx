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
      primary: "bg-sky-500 dark:bg-sky-600 shadow-sm",
      secondary: "bg-slate-800 dark:bg-slate-700 shadow-sm",
      outline: "bg-transparent border border-gray-300 dark:border-gray-700",
      ghost: "bg-transparent",
    };

    const textVariants = {
      primary: "text-white font-bold",
      secondary: "text-white font-bold",
      outline: "text-foreground font-semibold",
      ghost: "text-foreground font-semibold",
    };

    const sizes = {
      sm: "px-4 py-2",
      md: "px-6 py-3.5",
      lg: "px-8 py-4",
    };

    const textSizes = {
      sm: "text-sm",
      md: "text-base",
      lg: "text-lg",
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
          <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? '#000000' : '#FFFFFF'} className="mr-2" />
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
