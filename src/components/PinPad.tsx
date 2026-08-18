import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Fingerprint, Delete } from 'lucide-react-native';

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
    <View className="w-full max-w-sm self-center">
      {keys.map((row, rowIndex) => (
        <View key={rowIndex} className="flex-row justify-between mb-6">
          {row.map((key) => {
            if (key === 'biometric') {
              return (
                <TouchableOpacity
                  key={key}
                  onPress={onBiometric}
                  disabled={!showBiometric}
                  className={`w-20 h-20 items-center justify-center rounded-full ${
                    !showBiometric ? 'opacity-0' : 'active:bg-gray-100 dark:active:bg-gray-800'
                  }`}
                >
                  <Fingerprint size={32} color="#38BDF8" />
                </TouchableOpacity>
              );
            }
            if (key === 'delete') {
              return (
                <TouchableOpacity
                  key={key}
                  onPress={onDelete}
                  className="w-20 h-20 items-center justify-center rounded-full active:bg-gray-100 dark:active:bg-gray-800"
                >
                  <Delete size={32} color="#9CA3AF" />
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                key={key}
                onPress={() => onKeyPress(key)}
                className="w-20 h-20 items-center justify-center rounded-full active:bg-gray-100 dark:active:bg-gray-800"
              >
                <Text className="text-3xl font-medium text-foreground">{key}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}
