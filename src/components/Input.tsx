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
  ({ label, error, icon, className, type, style, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <View className={cn('w-full mb-4', className)}>
        {label && (
          <Text
            style={{ fontSize: 12.5, fontWeight: '500', color: '#6a6a6a', marginBottom: 6, marginLeft: 2 }}
          >
            {label}
          </Text>
        )}
        <View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              height: 56,
              borderRadius: 8,
              paddingHorizontal: 14,
              borderWidth: isFocused ? 2 : 1,
              borderColor: error ? '#c13515' : isFocused ? '#222222' : '#dddddd',
            },
            style as any,
          ]}
        >
          {icon && <View style={{ marginRight: 10 }}>{icon}</View>}
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
                fontSize: '15px',
                color: '#222222',
                fontFamily: 'inherit',
                fontWeight: '400',
                cursor: 'pointer',
              }}
            />
          ) : (
            <TextInput
              ref={ref}
              style={[
                {
                  flex: 1,
                  fontSize: 15,
                  fontWeight: '400',
                  color: '#222222',
                },
                Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : undefined,
              ]}
              placeholderTextColor="#929292"
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
          <Text style={{ fontSize: 12.5, color: '#c13515', marginTop: 4, marginLeft: 2 }}>
            {error}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

export { Input };
