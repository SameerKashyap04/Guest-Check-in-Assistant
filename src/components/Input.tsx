import React, { forwardRef, useState } from 'react';
import { View, TextInput, Text, TextInputProps, StyleSheet, Platform } from 'react-native';
import { AIRBNB } from '@/theme/airbnb';

// ─── Airbnb Form Input for StayMate ───────────────────────────────────────────
// Direct port of form fields from staymate-airbnb-redesign/app.html
// ─────────────────────────────────────────────────────────────────────────────

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  type?: string;
  hint?: string;
}

const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, icon, hint, style, type, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <View style={styles.wrap}>
        {label && <Text style={styles.label}>{label}</Text>}
        <View
          style={[
            styles.inputRow,
            isFocused && styles.inputFocused,
            error ? styles.inputError : null,
          ]}
        >
          {icon && <View style={styles.icon}>{icon}</View>}
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
                fontSize: '14.5px',
                color: AIRBNB.colors.ink,
                fontFamily: 'inherit',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            />
          ) : (
            <TextInput
              ref={ref}
              style={[styles.input, style as any]}
              placeholderTextColor={AIRBNB.colors.mutedSoft}
              onFocus={(e) => {
                setIsFocused(true);
                props.onFocus?.(e);
              }}
              onBlur={(e) => {
                setIsFocused(false);
                props.onBlur?.(e);
              }}
              {...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {})}
              {...props}
            />
          )}
        </View>
        {hint && !error && <Text style={styles.hintText}>{hint}</Text>}
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    marginBottom: 14,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '500',
    color: AIRBNB.colors.muted,
    marginBottom: 6,
    marginLeft: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AIRBNB.colors.canvas,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairline,
    borderRadius: AIRBNB.radius.sm,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: AIRBNB.colors.ink,
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: AIRBNB.colors.rose,
    borderWidth: 1.5,
  },
  icon: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '400',
    color: AIRBNB.colors.ink,
    paddingVertical: 10,
  },
  hintText: {
    fontSize: 11.5,
    color: AIRBNB.colors.muted,
    marginTop: 4,
    marginLeft: 1,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    color: AIRBNB.colors.rose,
    marginTop: 4,
    marginLeft: 1,
  },
});

Input.displayName = 'Input';

export { Input };
export default Input;
