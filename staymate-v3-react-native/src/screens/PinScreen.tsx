import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {C, R} from '../theme/tokens';
import {Icon} from '../components/Icon';

export function PinScreen({onUnlock}: {onUnlock: () => void}) {
  const [pin, setPin] = useState('');

  const press = (n: string) => {
    if (pin.length >= 4) return;
    const next = pin + n;
    setPin(next);
    if (next.length === 4) setTimeout(onUnlock, 200);
  };

  return (
    <View style={s.wrap}>
      <View style={s.lock}>
        <Icon name="lock" size={28} color="#fff"/>
      </View>
      <Text style={s.title}>Welcome back</Text>
      <Text style={s.sub}>Enter your 4-digit PIN to unlock StayMate</Text>

      <View style={s.dots}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[s.dot, i < pin.length && s.filled]}/>
        ))}
      </View>

      <View style={s.keys}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <TouchableOpacity
            key={n}
            activeOpacity={0.7}
            onPress={() => press(String(n))}
            style={s.key}
          >
            <Text style={s.keyText}>{n}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onUnlock}
          style={s.key}
        >
          <Icon name="fingerprint" size={22} color={C.primary}/>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => press('0')}
          style={s.key}
        >
          <Text style={s.keyText}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setPin(pin.slice(0, -1))}
          style={s.key}
        >
          <Icon name="chevronLeft" size={20} color={C.ink}/>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onUnlock}
        style={s.quickUnlock}
      >
        <Text style={s.quickUnlockText}>Quick Unlock (Demo) →</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    backgroundColor: '#fff',
    minHeight: '100%',
  },
  lock: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: '#222222',
  },
  sub: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    color: '#6a6a6a',
    textAlign: 'center',
    marginTop: 6,
  },
  dots: {
    flexDirection: 'row',
    gap: 14,
    marginVertical: 30,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#222222',
  },
  filled: {
    backgroundColor: '#222222',
  },
  keys: {
    width: 240,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
  },
  key: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#F8F7FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '500',
    color: '#222222',
  },
  quickUnlock: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: R.full,
    backgroundColor: '#EDE9FE',
  },
  quickUnlockText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
  },
});
