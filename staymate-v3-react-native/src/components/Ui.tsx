import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { C, R, shadow } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { Icon, IconName } from './Icon';

export function IconButton({ name, size = 18, onPress, style }: { name: IconName; size?: number; onPress?: () => void; style?: ViewStyle }) {
  const { isDark, colors } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        s.iconBtn,
        { backgroundColor: isDark ? '#27272A' : C.surfaceStrong },
        style,
      ]}
    >
      <Icon name={name} size={size} color={colors.ink} />
    </TouchableOpacity>
  );
}

export function PrimaryButton({ label, onPress, icon, style }: { label: string; onPress?: () => void; icon?: IconName; style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[s.primary, { backgroundColor: colors.primary }, style]}
    >
      {icon && <Icon name={icon} size={17} color="#fff" />}
      <Text style={s.primaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function SecondaryButton({
  label,
  onPress,
  icon,
  style,
  textStyle,
}: {
  label: string;
  onPress?: () => void;
  icon?: IconName;
  style?: ViewStyle;
  textStyle?: TextStyle;
}) {
  const { isDark, colors } = useTheme();
  const isBorderless = (style as any)?.borderWidth === 0;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        s.secondary,
        {
          backgroundColor: isDark ? '#18181B' : '#fff',
          borderColor: isDark ? '#3F3F46' : colors.ink,
        },
        style,
      ]}
    >
      {icon && (
        <Icon
          name={icon}
          size={17}
          color={isBorderless ? '#fff' : colors.ink}
        />
      )}
      <Text
        style={[
          s.secondaryText,
          { color: colors.ink },
          textStyle,
          isBorderless && { color: '#fff' },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function SoftButton({ label, onPress, icon, style }: { label: string; onPress?: () => void; icon?: IconName; style?: ViewStyle }) {
  const { isDark, colors } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        s.soft,
        { backgroundColor: isDark ? '#27272A' : C.surfaceStrong },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={16} color={colors.ink} />}
      <Text style={[s.softText, { color: colors.ink }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function SectionLabel({ children, style }: { children: string; style?: TextStyle }) {
  const { colors } = useTheme();
  return <Text style={[s.sectionLabel, { color: colors.muted }, style]}>{children}</Text>;
}

export function SettingRow({
  icon,
  label,
  subtitle,
  onPress,
  right,
}: {
  icon: IconName;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  const { isDark, colors } = useTheme();
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={s.settingRow}>
      <View
        style={[
          s.settingIcon,
          { backgroundColor: isDark ? '#27272A' : C.surfaceStrong },
        ]}
      >
        <Icon name={icon} size={18} color={colors.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.title, { color: colors.ink }]}>{label}</Text>
        {subtitle && <Text style={[s.body, { color: colors.muted }]}>{subtitle}</Text>}
      </View>
      {right || <Icon name="chevronRight" size={17} color={colors.mutedSoft} />}
    </TouchableOpacity>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  icon,
}: {
  label: string;
  value: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  secure?: boolean;
  icon?: IconName;
}) {
  const { isDark, colors } = useTheme();
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={[s.fieldLabel, { color: colors.ink }]}>{label}</Text>
      <View
        style={[
          s.inputWrap,
          {
            backgroundColor: isDark ? '#18181B' : '#fff',
            borderColor: isDark ? '#27272A' : C.hairline,
          },
        ]}
      >
        {icon && <Icon name={icon} size={19} color={colors.mutedSoft} />}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
          secureTextEntry={secure}
          style={[s.input, { color: colors.ink }]}
        />
      </View>
    </View>
  );
}

export const s = StyleSheet.create({
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    height: 50,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  secondary: {
    height: 50,
    borderRadius: R.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
  },
  soft: {
    height: 50,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  softText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
  },
  sectionLabel: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '500',
  },
  body: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    marginTop: 2,
  },
  fieldLabel: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrap: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    ...shadow,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 10,
  },
});
