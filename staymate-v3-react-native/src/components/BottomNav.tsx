import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {C, R} from '../theme/tokens';
import {Icon, IconName} from './Icon';

export type TabName = 'dashboard' | 'scanner' | 'rooms' | 'settings';

export function BottomNav({
  tab,
  onChange,
}: {
  tab: TabName;
  onChange: (t: TabName) => void;
}) {
  const insets = useSafeAreaInsets();
  const bottomPosition = Math.max(16, insets.bottom + 4);

  const item = (name: TabName, icon: IconName, label: string) => {
    const active = name === tab;
    return (
      <TouchableOpacity
        key={name}
        activeOpacity={0.8}
        onPress={() => onChange(name)}
        style={[s.tab, active && s.activeTab]}
      >
        <View style={[s.iconBox, active && s.activeIconBox]}>
          <Icon name={icon} size={19} color={active ? C.primary : '#64748B'}/>
        </View>
        <Text style={[s.label, active && s.activeLabel]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const activeScanner = tab === 'scanner';

  return (
    <View style={[s.bar, {bottom: bottomPosition}]}>
      {item('dashboard', 'home', 'Dashboard')}

      {/* Center Check-in Tab */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onChange('scanner')}
        style={s.fabTab}
      >
        <View style={s.fabButton}>
          <Icon name="camera" size={21} color="#fff"/>
        </View>
        <Text style={[s.label, s.fabLabel, activeScanner && s.activeLabel]}>
          Check-in
        </Text>
      </TouchableOpacity>

      {item('rooms', 'bed', 'Rooms')}
      {item('settings', 'settings', 'Settings')}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 66,
    borderRadius: R.full,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderWidth: 1,
    borderColor: '#ECEAF0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    shadowColor: '#241840',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 6},
    elevation: 8,
    zIndex: 50,
  },
  tab: {
    flex: 1,
    maxWidth: 74,
    height: 50,
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderRadius: 14,
    paddingBottom: 5,
  },
  activeTab: {
    backgroundColor: '#EDE9FE',
  },
  iconBox: {
    width: 32,
    height: 26,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  activeIconBox: {
    backgroundColor: '#fff',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  fabTab: {
    flex: 1,
    maxWidth: 70,
    height: 50,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 5,
    position: 'relative',
  },
  fabButton: {
    position: 'absolute',
    top: -22,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.32,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 4,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
    lineHeight: 13,
  },
  activeLabel: {
    fontWeight: '700',
    color: C.primary,
  },
  fabLabel: {
    color: C.primary,
    fontWeight: '700',
  },
});
