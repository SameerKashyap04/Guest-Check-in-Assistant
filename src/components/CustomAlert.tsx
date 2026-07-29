import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Platform, Animated } from 'react-native';
import { CheckCircle2, AlertCircle, ShieldAlert, Info, Sparkles, X } from 'lucide-react-native';
import { Alert, AlertButton, AlertOptions } from 'react-native';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface CustomAlertOptions {
  title: string;
  message?: string;
  type?: AlertType;
  buttons?: AlertButton[];
}

type AlertListener = (options: CustomAlertOptions | null) => void;
const listeners: Set<AlertListener> = new Set();

export const showCustomAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
  type?: AlertType
) => {
  // Infer alert type if not explicitly provided
  let inferredType: AlertType = type || 'info';
  if (!type) {
    const lower = (title + ' ' + (message || '')).toLowerCase();
    if (lower.includes('error') || lower.includes('failed') || lower.includes('denied') || lower.includes('invalid')) {
      inferredType = 'error';
    } else if (lower.includes('success') || lower.includes('approved') || lower.includes('complete') || lower.includes('imported')) {
      inferredType = 'success';
    } else if (lower.includes('warning') || lower.includes('required') || lower.includes('cannot')) {
      inferredType = 'warning';
    } else if (buttons && buttons.some(b => b.style === 'destructive')) {
      inferredType = 'confirm';
    }
  }

  const options: CustomAlertOptions = {
    title,
    message,
    buttons,
    type: inferredType
  };

  listeners.forEach(l => l(options));
};

// Global patch for Alert.alert to seamlessly direct all alert popups to the CustomAlert UI
if (typeof Alert.alert === 'function') {
  const originalAlert = Alert.alert;
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) => {
    try {
      showCustomAlert(title, message, buttons);
    } catch (e) {
      originalAlert(title, message, buttons, options);
    }
  };
}

export function CustomAlertProvider() {
  const [currentAlert, setCurrentAlert] = useState<CustomAlertOptions | null>(null);

  useEffect(() => {
    const listener: AlertListener = (opt) => setCurrentAlert(opt);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (!currentAlert) return null;

  const handleClose = () => {
    setCurrentAlert(null);
  };

  const handleButtonPress = (btn?: AlertButton) => {
    handleClose();
    if (btn && btn.onPress) {
      setTimeout(() => {
        btn.onPress?.();
      }, 50);
    }
  };

  const alertType = currentAlert.type || 'info';

  const renderIcon = () => {
    switch (alertType) {
      case 'success':
        return (
          <View className="w-14 h-14 rounded-full bg-emerald-500/15 items-center justify-center mb-3">
            <CheckCircle2 size={32} color="#10B981" />
          </View>
        );
      case 'error':
        return (
          <View className="w-14 h-14 rounded-full bg-red-500/15 items-center justify-center mb-3">
            <AlertCircle size={32} color="#EF4444" />
          </View>
        );
      case 'warning':
        return (
          <View className="w-14 h-14 rounded-full bg-amber-500/15 items-center justify-center mb-3">
            <ShieldAlert size={32} color="#F59E0B" />
          </View>
        );
      case 'confirm':
        return (
          <View className="w-14 h-14 rounded-full bg-sky-500/15 items-center justify-center mb-3">
            <Sparkles size={32} color="#0284C7" />
          </View>
        );
      default:
        return (
          <View className="w-14 h-14 rounded-full bg-sky-500/15 items-center justify-center mb-3">
            <Info size={32} color="#0284C7" />
          </View>
        );
    }
  };

  const defaultButtons: AlertButton[] = [{ text: 'OK', style: 'default' }];
  const actionButtons = currentAlert.buttons && currentAlert.buttons.length > 0
    ? currentAlert.buttons
    : defaultButtons;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={true}
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <TouchableOpacity 
        activeOpacity={1}
        onPress={handleClose}
        className="flex-1 bg-black/60 dark:bg-black/80 items-center justify-center px-6"
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation?.()}
          className="w-full max-w-sm bg-white dark:bg-[#181A24] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-2xl items-center"
        >
          {renderIcon()}

          <Text className="text-xl font-bold text-foreground text-center mb-2">
            {currentAlert.title}
          </Text>

          {currentAlert.message ? (
            <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 text-center mb-6 leading-5">
              {currentAlert.message}
            </Text>
          ) : (
            <View className="mb-4" />
          )}

          {/* Action Buttons Row */}
          <View className="w-full gap-2.5 flex-col">
            {actionButtons.map((btn, index) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';

              let btnBg = 'bg-black dark:bg-white';
              let btnText = 'text-white dark:text-black';

              if (isDestructive) {
                btnBg = 'bg-red-600 active:bg-red-700';
                btnText = 'text-white';
              } else if (isCancel) {
                btnBg = 'bg-gray-100 dark:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700';
                btnText = 'text-gray-700 dark:text-gray-300';
              }

              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.8}
                  onPress={() => handleButtonPress(btn)}
                  className={`w-full py-3.5 rounded-2xl items-center justify-center ${btnBg}`}
                >
                  <Text className={`text-sm font-extrabold ${btnText}`}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
