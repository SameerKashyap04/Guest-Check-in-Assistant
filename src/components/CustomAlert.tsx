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
  Platform,
} from 'react-native';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, HelpCircle } from 'lucide-react-native';

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
    } else if (lower.includes('success') || lower.includes('approved') || lower.includes('complete') || lower.includes('imported') || lower.includes('created') || lower.includes('confirmed')) {
      inferredType = 'success';
    } else if (lower.includes('warning') || lower.includes('required') || lower.includes('cannot') || lower.includes('missing') || lower.includes('notice')) {
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
          <View style={[styles.iconContainer, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
            <CheckCircle2 size={30} color="#059669" strokeWidth={2.4} />
          </View>
        );
      case 'error':
        return (
          <View style={[styles.iconContainer, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
            <AlertCircle size={30} color="#DC2626" strokeWidth={2.4} />
          </View>
        );
      case 'warning':
        return (
          <View style={[styles.iconContainer, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
            <AlertTriangle size={30} color="#7C3AED" strokeWidth={2.4} />
          </View>
        );
      case 'confirm':
        return (
          <View style={[styles.iconContainer, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
            <HelpCircle size={30} color="#0284C7" strokeWidth={2.4} />
          </View>
        );
      default:
        return (
          <View style={[styles.iconContainer, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
            <Info size={30} color="#7C3AED" strokeWidth={2.4} />
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
        style={styles.overlay}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation?.()}
          style={styles.card}
        >
          {renderIcon()}

          <Text style={styles.title}>
            {currentAlert.title}
          </Text>

          {currentAlert.message ? (
            <Text style={styles.message}>
              {currentAlert.message}
            </Text>
          ) : (
            <View style={{ marginBottom: 12 }} />
          )}

          <View style={styles.buttonsContainer}>
            {actionButtons.map((btn, index) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';

              let btnBg = '#7C3AED';
              let btnTextColor = '#FFFFFF';

              if (isDestructive) {
                btnBg = '#DC2626';
                btnTextColor = '#FFFFFF';
              } else if (isCancel) {
                btnBg = '#F1F5F9';
                btnTextColor = '#475569';
              }

              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.85}
                  onPress={() => handleButtonPress(btn)}
                  style={[
                    styles.button,
                    { backgroundColor: btnBg },
                    !isCancel && !isDestructive && styles.primaryBtnGlow,
                  ]}
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
    paddingHorizontal: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as any)
      : {}),
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 18.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  message: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 22,
    paddingHorizontal: 6,
  },
  buttonsContainer: {
    width: '100%',
    gap: 9,
    flexDirection: 'column',
  },
  button: {
    width: '100%',
    paddingVertical: 13.5,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnGlow: {
    shadowColor: '#7C3AED',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonText: {
    fontFamily: 'Inter',
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

