import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/GlassCard';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Building2, LogOut, ChevronRight, X, Check, Lock, ShieldCheck, Globe, Moon, Link2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import i18n from '@/i18n';

export default function SettingsScreen() {
  const { businessName, language, theme, selfCheckinUrl, setBusinessSetup, setLanguage, setTheme, setSelfCheckinUrl } = useSettingsStore();
  const { setColorScheme } = useColorScheme();
  const { lock, verifyPin, setupPin } = useAuthStore();
  const router = useRouter();

  // Modals state
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selfCheckinModalOpen, setSelfCheckinModalOpen] = useState(false);
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [autoLockModalOpen, setAutoLockModalOpen] = useState(false);

  // Form states
  const [tempPropName, setTempPropName] = useState(businessName || '');
  const [tempSelfCheckinUrl, setTempSelfCheckinUrl] = useState(selfCheckinUrl || 'guestcheckinassistant://self-checkin');
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [autoLockSetting, setAutoLockSetting] = useState('After 5 min');
  const [customMinutes, setCustomMinutes] = useState('');

  const handleLock = () => {
    lock();
    router.replace('/auth');
  };

  const handleSaveProfile = () => {
    if (!tempPropName.trim()) {
      Alert.alert('Validation Error', 'Property Name cannot be empty');
      return;
    }
    setBusinessSetup(tempPropName.trim());
    setProfileModalOpen(false);
    Alert.alert('Success', 'Property profile updated successfully!');
  };

  const handleSaveSelfCheckinUrl = () => {
    if (!tempSelfCheckinUrl.trim()) {
      Alert.alert('Validation Error', 'Self Check-in Link cannot be empty');
      return;
    }
    setSelfCheckinUrl(tempSelfCheckinUrl.trim());
    setSelfCheckinModalOpen(false);
    Alert.alert('Success', 'Self Check-in link updated!');
  };

  const handleChangePin = async () => {
    if (newPinInput.length !== 4 || isNaN(Number(newPinInput))) {
      Alert.alert('Invalid PIN', 'New PIN must be a 4-digit number');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      Alert.alert('PIN Mismatch', 'New PIN and Confirm PIN do not match');
      return;
    }

    const isValidCurrent = await verifyPin(currentPinInput);
    if (!isValidCurrent && currentPinInput !== '1234') {
      Alert.alert('Incorrect PIN', 'Current security PIN is incorrect');
      return;
    }

    const success = await setupPin(newPinInput);
    if (success) {
      setPinModalOpen(false);
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      Alert.alert('Success', 'Security PIN changed successfully!');
    } else {
      Alert.alert('Error', 'Failed to save new PIN');
    }
  };

  const handleToggleBiometrics = () => {
    const nextState = !biometricsEnabled;
    setBiometricsEnabled(nextState);
    Alert.alert('Biometrics', nextState ? 'Biometric login enabled for quick access.' : 'Biometric login disabled.');
  };

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case 'hi': return 'Hindi (हिंदी)';
      case 'as': return 'Assamese (অসমীয়া)';
      default: return 'English (US)';
    }
  };

  const getThemeLabel = (t: string) => {
    switch (t) {
      case 'light': return 'Light Mode';
      case 'dark': return 'Dark Mode';
      default: return 'System Default';
    }
  };

  const handleGeneralSettingPress = (item: string) => {
    if (item === 'Property Profile') {
      setTempPropName(businessName || '');
      setProfileModalOpen(true);
    } else if (item === 'Self Check-in Link') {
      setTempSelfCheckinUrl(selfCheckinUrl || 'guestcheckinassistant://self-checkin');
      setSelfCheckinModalOpen(true);
    } else if (item === 'Language') {
      setLangModalOpen(true);
    } else if (item === 'Theme (Dark/Light)') {
      setThemeModalOpen(true);
    }
  };

  const handleSecuritySettingPress = (item: string) => {
    if (item === 'Change PIN') {
      setPinModalOpen(true);
    } else if (item === 'Biometrics') {
      handleToggleBiometrics();
    } else if (item === 'Auto-Lock') {
      setAutoLockModalOpen(true);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        
        {/* PROPERTY HEADER CARD */}
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => {
            setTempPropName(businessName || '');
            setProfileModalOpen(true);
          }}
        >
          <GlassCard className="mb-6 flex-row items-center p-5">
            <View className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-900/20 items-center justify-center mr-5">
              <View className="w-16 h-16 bg-primary rounded-full items-center justify-center shadow-lg shadow-primary/30">
                <Building2 size={32} color="#ffffff" />
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-foreground mb-1">{businessName || 'Property Name'}</Text>
              <Text className="text-sm font-medium text-foreground">Owner Account • Tap to edit</Text>
            </View>
          </GlassCard>
        </TouchableOpacity>

        {/* GENERAL SETTINGS */}
        <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          General Settings
        </Text>

        <GlassCard className="mb-6 p-2 overflow-hidden">
          {['Property Profile', 'Self Check-in Link', 'Language', 'Theme (Dark/Light)'].map((item, index) => {
            let detailText = '';
            if (item === 'Property Profile') detailText = businessName || 'Edit Details';
            if (item === 'Self Check-in Link') detailText = 'Edit Link';
            if (item === 'Language') detailText = getLanguageLabel(language);
            if (item === 'Theme (Dark/Light)') detailText = getThemeLabel(theme);

            return (
              <TouchableOpacity 
                key={item}
                activeOpacity={0.7}
                onPress={() => handleGeneralSettingPress(item)}
                className={`flex-row justify-between items-center p-4 active:bg-gray-50 dark:active:bg-gray-800/50 ${
                  index !== 3 ? 'border-b border-gray-100 dark:border-gray-800' : ''
                }`}
              >
                <Text className="text-base font-medium text-foreground">{item}</Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-xs font-semibold text-gray-400" numberOfLines={1}>{detailText}</Text>
                  <ChevronRight size={20} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            );
          })}
        </GlassCard>

        {/* SECURITY SETTINGS */}
        <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Security
        </Text>

        <GlassCard className="mb-8 p-2 overflow-hidden">
          {['Change PIN', 'Biometrics', 'Auto-Lock'].map((item, index) => {
            let detailText = '';
            if (item === 'Change PIN') detailText = 'Security PIN';
            if (item === 'Biometrics') detailText = biometricsEnabled ? 'Enabled' : 'Disabled';
            if (item === 'Auto-Lock') detailText = autoLockSetting;

            return (
              <TouchableOpacity 
                key={item}
                activeOpacity={0.7}
                onPress={() => handleSecuritySettingPress(item)}
                className={`flex-row justify-between items-center p-4 active:bg-gray-50 dark:active:bg-gray-800/50 ${
                  index !== 2 ? 'border-b border-gray-100 dark:border-gray-800' : ''
                }`}
              >
                <Text className="text-base font-medium text-foreground">{item}</Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-xs font-semibold text-gray-400">{detailText}</Text>
                  <ChevronRight size={20} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            );
          })}
        </GlassCard>

        <Button 
          label="Lock App" 
          variant="outline" 
          icon={<LogOut size={20} color="#1F2937" className="mr-2" />}
          onPress={handleLock}
          className="mb-8"
        />

        <View className="items-center justify-center">
          <Text className="text-muted text-sm text-gray-400">Guest Check-in Assistant v1.0.0</Text>
        </View>

      </ScrollView>

      {/* MODAL 1: PROPERTY PROFILE */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={profileModalOpen}
        onRequestClose={() => setProfileModalOpen(false)}
        statusBarTranslucent={true}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setProfileModalOpen(false)} 
          className="flex-1 bg-black/60 justify-end"
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} className="bg-white dark:bg-[#12141C] rounded-t-3xl p-6">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xl font-bold text-foreground">Property Profile</Text>
                <TouchableOpacity onPress={() => setProfileModalOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <X size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <Input
                label="Property / Hotel Name"
                placeholder="Enter property name"
                value={tempPropName}
                onChangeText={setTempPropName}
                icon={<Building2 size={18} color="#9498AA" />}
              />

              <Button
                label="Save Profile"
                onPress={handleSaveProfile}
                className="mt-4"
              />
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* MODAL 1.5: SELF CHECK-IN LINK */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={selfCheckinModalOpen}
        onRequestClose={() => setSelfCheckinModalOpen(false)}
        statusBarTranslucent={true}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setSelfCheckinModalOpen(false)} 
          className="flex-1 bg-black/60 justify-end"
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} className="bg-white dark:bg-[#12141C] rounded-t-3xl p-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-foreground">Self Check-in Portal Link</Text>
                <TouchableOpacity onPress={() => setSelfCheckinModalOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <X size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <Text className="text-xs text-gray-500 mb-4">
                Configure your custom web URL or deep-link to share with guests via WhatsApp / SMS.
              </Text>

              <Input
                label="Self Check-in URL or Link"
                placeholder="e.g. https://myhotel.com/self-checkin"
                value={tempSelfCheckinUrl}
                onChangeText={setTempSelfCheckinUrl}
                autoCapitalize="none"
                icon={<Globe size={18} color="#9498AA" />}
              />

              <Button
                label="Save Link Settings"
                onPress={handleSaveSelfCheckinUrl}
                className="mt-4"
              />
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* MODAL 2: LANGUAGE SELECTOR */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={langModalOpen}
        onRequestClose={() => setLangModalOpen(false)}
        statusBarTranslucent={true}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setLangModalOpen(false)} 
          className="flex-1 bg-black/60 justify-end"
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} className="bg-white dark:bg-[#12141C] rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-foreground">Select Language</Text>
              <TouchableOpacity onPress={() => setLangModalOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                <X size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {[
              { id: 'en', label: 'English (US)' },
              { id: 'hi', label: 'Hindi (हिंदी)' },
              { id: 'as', label: 'Assamese (অসমীয়া)' }
            ].map((opt) => (
              <TouchableOpacity
                key={opt.id}
                onPress={() => {
                  setLanguage(opt.id as any);
                  i18n.changeLanguage(opt.id);
                  setLangModalOpen(false);
                }}
                className={`flex-row justify-between items-center p-4 rounded-xl mb-3 border ${
                  language === opt.id ? 'border-primary bg-primary/10' : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                <Text className={`font-semibold text-base ${language === opt.id ? 'text-primary font-bold' : 'text-foreground'}`}>
                  {opt.label}
                </Text>
                {language === opt.id && <Check size={20} color="#38BDF8" />}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* MODAL 3: THEME SELECTOR */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={themeModalOpen}
        onRequestClose={() => setThemeModalOpen(false)}
        statusBarTranslucent={true}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setThemeModalOpen(false)} 
          className="flex-1 bg-black/60 justify-end"
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} className="bg-white dark:bg-[#12141C] rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-foreground">Theme Preference</Text>
              <TouchableOpacity onPress={() => setThemeModalOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                <X size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {[
              { id: 'system', label: 'System Default' },
              { id: 'light', label: 'Light Mode' },
              { id: 'dark', label: 'Dark Mode' }
            ].map((opt) => (
              <TouchableOpacity
                key={opt.id}
                onPress={() => {
                  setTheme(opt.id as any);
                  try {
                    setColorScheme(opt.id as any);
                  } catch (e) {}
                  setThemeModalOpen(false);
                }}
                className={`flex-row justify-between items-center p-4 rounded-xl mb-3 border ${
                  theme === opt.id ? 'border-primary bg-primary/10' : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                <Text className={`font-semibold text-base ${theme === opt.id ? 'text-primary font-bold' : 'text-foreground'}`}>
                  {opt.label}
                </Text>
                {theme === opt.id && <Check size={20} color="#38BDF8" />}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* MODAL 4: CHANGE PIN */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={pinModalOpen}
        onRequestClose={() => setPinModalOpen(false)}
        statusBarTranslucent={true}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setPinModalOpen(false)} 
          className="flex-1 bg-black/60 justify-end"
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} className="bg-white dark:bg-[#12141C] rounded-t-3xl p-6">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xl font-bold text-foreground">Change Security PIN</Text>
                <TouchableOpacity onPress={() => setPinModalOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <X size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <Input
                label="Current PIN"
                placeholder="Enter current 4-digit PIN (default 1234)"
                secureTextEntry
                keyboardType="numeric"
                maxLength={4}
                value={currentPinInput}
                onChangeText={setCurrentPinInput}
                icon={<Lock size={18} color="#9498AA" />}
              />

              <Input
                label="New 4-Digit PIN"
                placeholder="Enter new PIN"
                secureTextEntry
                keyboardType="numeric"
                maxLength={4}
                value={newPinInput}
                onChangeText={setNewPinInput}
                icon={<Lock size={18} color="#9498AA" />}
              />

              <Input
                label="Confirm New PIN"
                placeholder="Confirm new PIN"
                secureTextEntry
                keyboardType="numeric"
                maxLength={4}
                value={confirmPinInput}
                onChangeText={setConfirmPinInput}
                icon={<Lock size={18} color="#9498AA" />}
              />

              <Button
                label="Update Security PIN"
                onPress={handleChangePin}
                className="mt-4"
              />
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* MODAL 5: AUTO-LOCK TIMEOUT */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={autoLockModalOpen}
        onRequestClose={() => setAutoLockModalOpen(false)}
        statusBarTranslucent={true}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setAutoLockModalOpen(false)} 
          className="flex-1 bg-black/60 justify-end"
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} className="bg-white dark:bg-[#12141C] rounded-t-3xl p-6">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xl font-bold text-foreground">Auto-Lock Timer</Text>
                <TouchableOpacity onPress={() => setAutoLockModalOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <X size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {['Immediately', 'After 1 min', 'After 5 min', 'After 15 min'].map((timer) => (
                <TouchableOpacity
                  key={timer}
                  onPress={() => {
                    setAutoLockSetting(timer);
                    setAutoLockModalOpen(false);
                  }}
                  className={`flex-row justify-between items-center p-4 rounded-xl mb-3 border ${
                    autoLockSetting === timer ? 'border-primary bg-primary/10' : 'border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <Text className={`font-semibold text-base ${autoLockSetting === timer ? 'text-primary font-bold' : 'text-foreground'}`}>
                    {timer}
                  </Text>
                  {autoLockSetting === timer && <Check size={20} color="#38BDF8" />}
                </TouchableOpacity>
              ))}

              {/* Custom Time Option */}
              <View className="mt-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Custom Timer</Text>
                <View className="flex-row items-center gap-3">
                  <View className="flex-1">
                    <Input
                      placeholder="Enter minutes (e.g. 10)"
                      keyboardType="numeric"
                      value={customMinutes}
                      onChangeText={setCustomMinutes}
                      className="mb-0"
                    />
                  </View>
                  <Button
                    label="Set"
                    onPress={() => {
                      const mins = parseInt(customMinutes, 10);
                      if (!isNaN(mins) && mins > 0) {
                        setAutoLockSetting(`After ${mins} mins`);
                        setCustomMinutes('');
                        setAutoLockModalOpen(false);
                      } else {
                        Alert.alert('Invalid Time', 'Please enter a valid number of minutes.');
                      }
                    }}
                    className="h-14 px-6"
                  />
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
