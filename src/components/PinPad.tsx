import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Fingerprint, ChevronLeft } from 'lucide-react-native';
import { AIRBNB } from '@/theme/airbnb';

// ─── Airbnb Keypad for StayMate ───────────────────────────────────────────────
// Direct port of .keypad and .key from staymate-airbnb-redesign/app.html
// ─────────────────────────────────────────────────────────────────────────────

interface PinPadProps {
  onKeyPress: (key: string) => void;
  onDelete: () => void;
  onBiometric?: () => void;
  showBiometric?: boolean;
}

export function PinPad({ onKeyPress, onDelete, onBiometric, showBiometric = false }: PinPadProps) {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['biometric', '0', 'delete'],
  ];

  return (
    <View style={styles.grid}>
      {keys.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map(key => {
            if (key === 'biometric') {
              return (
                <TouchableOpacity
                  key={key}
                  onPress={onBiometric}
                  disabled={!showBiometric}
                  style={[styles.key, !showBiometric && { opacity: 0 }]}
                  activeOpacity={0.7}
                >
                  <Fingerprint size={22} color={AIRBNB.colors.primary} />
                </TouchableOpacity>
              );
            }
            if (key === 'delete') {
              return (
                <TouchableOpacity
                  key={key}
                  onPress={onDelete}
                  style={styles.key}
                  activeOpacity={0.7}
                >
                  <ChevronLeft size={20} color={AIRBNB.colors.ink} />
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                key={key}
                onPress={() => onKeyPress(key)}
                style={styles.key}
                activeOpacity={0.7}
              >
                <Text style={styles.keyText}>{key}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: 250,
    alignSelf: 'center',
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  key: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: AIRBNB.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 22,
    fontWeight: '500',
    color: AIRBNB.colors.ink,
  },
});
