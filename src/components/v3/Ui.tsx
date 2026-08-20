import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { C, R, shadow } from '../../theme/tokens';
import { Icon, IconName } from './Icon';

export function IconButton({
  name,
  size = 18,
  onPress,
  style,
}: {
  name: IconName;
  size?: number;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[s.iconBtn, style]}
    >
      <Icon name={name} size={size} color={C.ink} />
    </TouchableOpacity>
  );
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  style,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  icon?: IconName;
  style?: ViewStyle;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={disabled ? undefined : onPress}
      style={[s.primary, disabled && s.disabledBtn, style]}
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
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[s.secondary, style]}
    >
      {icon && (
        <Icon
          name={icon}
          size={17}
          color={(style as any)?.borderWidth === 0 ? '#fff' : C.ink}
        />
      )}
      <Text
        style={[
          s.secondaryText,
          textStyle,
          (style as any)?.borderWidth === 0 && { color: '#fff' },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function SoftButton({
  label,
  onPress,
  icon,
  style,
}: {
  label: string;
  onPress?: () => void;
  icon?: IconName;
  style?: ViewStyle;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[s.soft, style]}
    >
      {icon && <Icon name={icon} size={16} color={C.ink} />}
      <Text style={s.softText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function SectionLabel({
  children,
  style,
}: {
  children: string;
  style?: TextStyle;
}) {
  return <Text style={[s.sectionLabel, style]}>{children}</Text>;
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
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={s.settingRow}
    >
      <View style={s.settingIcon}>
        <Icon name={icon} size={18} color={C.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{label}</Text>
        {subtitle && <Text style={s.body}>{subtitle}</Text>}
      </View>
      {right || <Icon name="chevronRight" size={17} color={C.mutedSoft} />}
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
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  secure?: boolean;
  icon?: IconName;
  keyboardType?: any;
  multiline?: boolean;
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={[s.inputWrap, multiline && { minHeight: 80, alignItems: 'flex-start', paddingTop: 8 }]}>
        {icon && <Icon name={icon} size={19} color={C.mutedSoft} />}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={secure}
          keyboardType={keyboardType}
          multiline={multiline}
          style={[s.input, multiline && { textAlignVertical: 'top' }]}
        />
      </View>
    </View>
  );
}

export function Switch({ on }: { on: boolean }) {
  return (
    <View
      style={[
        s.switchTrack,
        { backgroundColor: on ? C.primary : '#dddddd' },
      ]}
    >
      <View style={[s.switchKnob, { left: on ? 20 : 3 }]} />
    </View>
  );
}

export const s = StyleSheet.create({
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    height: 50,
    borderRadius: R.sm,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  disabledBtn: {
    backgroundColor: C.primaryDisabled,
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: C.ink,
  },
  soft: {
    height: 50,
    borderRadius: R.sm,
    backgroundColor: C.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  softText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: C.ink,
  },
  sectionLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: C.muted,
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
    backgroundColor: C.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '500',
    color: C.ink,
  },
  body: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    color: C.muted,
    marginTop: 2,
  },
  fieldLabel: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '600',
    color: C.ink,
    marginBottom: 6,
  },
  inputWrap: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.hairline,
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
    color: C.ink,
    paddingVertical: 10,
  },
  switchTrack: {
    width: 42,
    height: 25,
    borderRadius: R.full,
    position: 'relative',
  },
  switchKnob: {
    position: 'absolute',
    top: 3,
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
