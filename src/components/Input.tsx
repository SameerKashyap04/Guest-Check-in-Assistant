import React, { forwardRef, useState } from 'react';
import { View, TextInput, Text, TextInputProps, Platform } from 'react-native';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  type?: string;
}

const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, icon, className, type, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <View className={cn("w-full mb-4", className)}>
        {label && (
          <Text className="text-sm font-medium text-foreground mb-1.5 ml-1">
            {label}
          </Text>
        )}
        <View
          className={cn(
            "flex-row items-center bg-white dark:bg-black/20 border rounded-2xl px-4 h-14",
            isFocused ? "border-primary" : "border-transparent dark:border-transparent",
            error ? "border-red-500" : ""
          )}
        >
          {icon && <View className="mr-3">{icon}</View>}
          {Platform.OS === 'web' && type === 'date' ? (
            <input
              type="date"
              value={props.value || ''}
              onChange={(e) => props.onChangeText?.(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '16px',
                color: 'inherit',
                fontFamily: 'inherit',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            />
          ) : (
            <TextInput
              ref={ref}
              className="flex-1 text-base text-foreground font-medium"
              placeholderTextColor="#9CA3AF"
              style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : undefined}
              onFocus={(e) => {
                setIsFocused(true);
                props.onFocus?.(e);
              }}
              onBlur={(e) => {
                setIsFocused(false);
                props.onBlur?.(e);
              }}
              {...props}
            />
          )}
        </View>
        {error && (
          <Text className="text-sm text-red-500 mt-1 ml-1">{error}</Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

export { Input };

