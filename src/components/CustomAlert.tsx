import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  AlertButton,
  AlertOptions,
  useColorScheme,
} from 'react-native';
import { CheckCircle2, AlertCircle, ShieldAlert, Info, Sparkles } from 'lucide-react-native';

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

  const options: CustomAlertOptions = { title, message, buttons, type: inferredType };
  listeners.forEach(l => l(options));
};

// Global patch for Alert.alert
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    const listener: AlertListener = (opt) => setCurrentAlert(opt);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  if (!currentAlert) return null;

  const handleClose = () => setCurrentAlert(null);

  const handleButtonPress = (btn?: AlertButton) => {
    handleClose();
    if (btn?.onPress) {
      setTimeout(() => btn.onPress?.(), 50);
    }
  };

  const alertType = currentAlert.type || 'info';

  const renderIcon = () => {
    switch (alertType) {
      case 'success':
        return (
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
            <CheckCircle2 size={32} color="#10B981" />
          </View>
        );
      case 'error':
        return (
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
            <AlertCircle size={32} color="#EF4444" />
          </View>
        );
      case 'warning':
        return (
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
            <ShieldAlert size={32} color="#F59E0B" />
          </View>
        );
      case 'confirm':
        return (
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(56,189,248,0.15)' }]}>
            <Sparkles size={32} color="#0284C7" />
          </View>
        );
      default:
        return (
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(56,189,248,0.15)' }]}>
            <Info size={32} color="#0284C7" />
          </View>
        );
    }
  };

  const defaultButtons: AlertButton[] = [{ text: 'OK', style: 'default' }];
  const actionButtons = currentAlert.buttons && currentAlert.buttons.length > 0
    ? currentAlert.buttons
    : defaultButtons;

  const cardBg = isDark ? '#181A24' : '#FFFFFF';
  const cardBorder = isDark ? '#1F2937' : '#F3F4F6';
  const titleColor = isDark ? '#F9FAFB' : '#111827';
  const subtitleColor = isDark ? '#9CA3AF' : '#6B7280';
  const overlayBg = isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.6)';

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
        style={[styles.overlay, { backgroundColor: overlayBg }]}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation?.()}
          style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}
        >
          {renderIcon()}

          <Text style={[styles.title, { color: titleColor }]}>
            {currentAlert.title}
          </Text>

          {currentAlert.message ? (
            <Text style={[styles.message, { color: subtitleColor }]}>
              {currentAlert.message}
            </Text>
          ) : (
            <View style={{ marginBottom: 16 }} />
          )}

          <View style={styles.buttonsContainer}>
            {actionButtons.map((btn, index) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';

              let btnBg = isDark ? '#FFFFFF' : '#000000';
              let btnTextColor = isDark ? '#000000' : '#FFFFFF';

              if (isDestructive) {
                btnBg = '#DC2626';
                btnTextColor = '#FFFFFF';
              } else if (isCancel) {
                btnBg = isDark ? '#1F2937' : '#F3F4F6';
                btnTextColor = isDark ? '#D1D5DB' : '#374151';
              }

              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.8}
                  onPress={() => handleButtonPress(btn)}
                  style={[styles.button, { backgroundColor: btnBg }]}
                >
                  <Text style={[styles.buttonText, { color: btnTextColor }]}>
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  buttonsContainer: {
    width: '100%',
    gap: 10,
    flexDirection: 'column',
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
