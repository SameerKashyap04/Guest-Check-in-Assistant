import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { AIRBNB } from '@/theme/airbnb';

// ─── Airbnb Toggle Switch for StayMate ─────────────────────────────────────────
// Exact 1:1 port of toggleSwitch() from staymate-airbnb-redesign/app.html
// ─────────────────────────────────────────────────────────────────────────────

interface AirbnbSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function AirbnbSwitch({ value, onValueChange, disabled = false }: AirbnbSwitchProps) {
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 20],
  });

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [AIRBNB.colors.hairline, AIRBNB.colors.primary],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={styles.wrapper}
    >
      <Animated.View style={[styles.track, { backgroundColor }]}>
        <Animated.View
          style={[
            styles.thumb,
            {
              transform: [{ translateX }],
            },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    padding: 2,
  },
  track: {
    width: 42,
    height: 25,
    borderRadius: AIRBNB.radius.full,
    justifyContent: 'center',
    position: 'relative',
  },
  thumb: {
    width: 19,
    height: 19,
    borderRadius: 9.5,
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
});

export default AirbnbSwitch;
