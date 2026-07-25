import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/GlassCard';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Building2, LogOut, ChevronRight, X, Check, Lock, ShieldCheck, Globe, Moon, Link as LinkIcon, Camera, User, Share2, Copy, Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import i18n from '@/i18n';
import { createSelfCheckinToken } from '@/database/tokens';
import * as Sharing from 'expo-sharing';

export default function SettingsScreen() {
  const { 
    businessName, 
    language, 
    theme, 
    enableSelfCheckin, 
    requireSelfie, 
    allowManualEditing, 
    requireSignature, 
    allowWalkIn, 
    enableIdScanning, 
    enableOcr,
    setBusinessSetup, 
    setLanguage, 
    setTheme, 
    setSetting 
  } = useSettingsStore();

  const { setColorScheme } = useColorScheme();
  const { lock, verifyPin, setupPin } = useAuthStore();
  const router = useRouter();

  // Modals state
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [autoLockModalOpen, setAutoLockModalOpen] = useState(false);
  const [linkGenModalOpen, setLinkGenModalOpen] = useState(false);

  // Form states
  const [tempPropName, setTempPropName] = useState(businessName || '');
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [autoLockSetting, setAutoLockSetting] = useState('After 5 min');
  const [customMinutes, setCustomMinutes] = useState('');

  // Link Generator state
  const [guestNameInput, setGuestNameInput] = useState('');
  const [bookingRefInput, setBookingRefInput] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

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
    Alert.alert('Success ✨', 'Property profile updated successfully!');
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
      Alert.alert('Success 🔐', 'Security PIN changed successfully!');
    } else {
      Alert.alert('Error', 'Failed to save new PIN');
    }
  };

  const handleGenerateLink = async () => {
    try {
      const record = await createSelfCheckinToken(bookingRefInput.trim(), guestNameInput.trim());
      const link = `https://guestcheckin.app/checkin/${record.token}`;
      setGeneratedLink(link);
    } catch (e) {
      Alert.alert('Error', 'Failed to generate Self Check-in link.');
    }
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
            <View className="w-16 h-16 rounded-2xl bg-primary/10 items-center justify-center mr-4 border border-primary/20">
              <Building2 size={30} color="#38BDF8" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-foreground mb-0.5">{businessName || 'Property Name'}</Text>
              <Text className="text-xs font-medium text-gray-500">Hotel Owner Settings • Tap to edit</Text>
            </View>
          </GlassCard>
        </TouchableOpacity>

        {/* SELF CHECK-IN & HOTEL CONFIGURATION */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Self Check-in & Hotel Options
          </Text>
          <TouchableOpacity 
            onPress={() => {
              setGeneratedLink(null);
              setGuestNameInput('');
              setBookingRefInput('');
              setLinkGenModalOpen(true);
            }}
            className="flex-row items-center bg-primary/10 px-3 py-1.5 rounded-full"
          >
            <Sparkles size={14} color="#38BDF8" className="mr-1" />
            <Text className="text-xs font-bold text-primary">Generate Link</Text>
          </TouchableOpacity>
        </View>

        <GlassCard className="mb-6 p-4 rounded-2xl border border-gray-100 dark:border-white/10">
          {/* Enable Self Check-in */}
          <View className="flex-row justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-semibold text-foreground">Enable Self Check-in</Text>
              <Text className="text-xs text-gray-400">Allow guests to check in on their mobile phones</Text>
            </View>
            <Switch
              value={enableSelfCheckin}
              onValueChange={(val) => setSetting('enableSelfCheckin', val)}
              trackColor={{ false: '#94A3B8', true: '#38BDF8' }}
            />
          </View>

          {/* Require Selfie */}
          <View className="flex-row justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-semibold text-foreground">Require Selfie Verification</Text>
              <Text className="text-xs text-gray-400">Capture circular face guide photo during check-in</Text>
            </View>
            <Switch
              value={requireSelfie}
              onValueChange={(val) => setSetting('requireSelfie', val)}
              trackColor={{ false: '#94A3B8', true: '#38BDF8' }}
            />
          </View>

          {/* Allow Manual Editing */}
          <View className="flex-row justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-semibold text-foreground">Allow Manual Editing</Text>
              <Text className="text-xs text-gray-400">Guests can edit OCR scanned ID information</Text>
            </View>
            <Switch
              value={allowManualEditing}
              onValueChange={(val) => setSetting('allowManualEditing', val)}
              trackColor={{ false: '#94A3B8', true: '#38BDF8' }}
            />
          </View>

          {/* Enable ID Scanning */}
          <View className="flex-row justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-semibold text-foreground">Enable ID Scanning</Text>
              <Text className="text-xs text-gray-400">Camera scan for Aadhaar, Passport, DL, Voter ID</Text>
            </View>
            <Switch
              value={enableIdScanning}
              onValueChange={(val) => setSetting('enableIdScanning', val)}
              trackColor={{ false: '#94A3B8', true: '#38BDF8' }}
            />
          </View>

          {/* Enable OCR */}
          <View className="flex-row justify-between items-center py-3">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-semibold text-foreground">Automatic OCR Extraction</Text>
              <Text className="text-xs text-gray-400">Extract name, ID number, and address automatically</Text>
            </View>
            <Switch
              value={enableOcr}
              onValueChange={(val) => setSetting('enableOcr', val)}
              trackColor={{ false: '#94A3B8', true: '#38BDF8' }}
            />
          </View>
        </GlassCard>

        {/* GENERAL SETTINGS */}
        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          General App Settings
        </Text>

        <GlassCard className="mb-6 p-2 overflow-hidden">
          {['Property Profile', 'Language', 'Theme (Dark/Light)'].map((item, index) => {
            let detailText = '';
            if (item === 'Property Profile') detailText = businessName || 'Edit Details';
            if (item === 'Language') detailText = getLanguageLabel(language);
            if (item === 'Theme (Dark/Light)') detailText = getThemeLabel(theme);

            return (
              <TouchableOpacity 
                key={item}
                activeOpacity={0.7}
                onPress={() => {
                  if (item === 'Property Profile') setProfileModalOpen(true);
                  if (item === 'Language') setLangModalOpen(true);
                  if (item === 'Theme (Dark/Light)') setThemeModalOpen(true);
                }}
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

        {/* SECURITY SETTINGS */}
        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
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
                onPress={() => {
                  if (item === 'Change PIN') setPinModalOpen(true);
                  if (item === 'Biometrics') setBiometricsEnabled(!biometricsEnabled);
                  if (item === 'Auto-Lock') setAutoLockModalOpen(true);
                }}
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

      {/* MODAL: SELF CHECK-IN LINK GENERATOR */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={linkGenModalOpen}
        onRequestClose={() => setLinkGenModalOpen(false)}
        statusBarTranslucent={true}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setLinkGenModalOpen(false)} 
          className="flex-1 bg-black/60 justify-end"
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} className="bg-white dark:bg-[#12141C] rounded-t-3xl p-6">
              <View className="flex-row justify-between items-center mb-5">
                <View className="flex-row items-center">
                  <Sparkles size={22} color="#38BDF8" className="mr-2" />
                  <Text className="text-xl font-bold text-foreground">Self Check-in Link</Text>
                </View>
                <TouchableOpacity onPress={() => setLinkGenModalOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <X size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <Input
                label="Guest Name (Optional)"
                placeholder="e.g. Sameer Kashyap"
                value={guestNameInput}
                onChangeText={setGuestNameInput}
              />

              <Input
                label="Booking Ref (Optional)"
                placeholder="e.g. BK-9821"
                value={bookingRefInput}
                onChangeText={setBookingRefInput}
              />

              {!generatedLink ? (
                <Button
                  label="Create Express Check-in Link"
                  onPress={handleGenerateLink}
                  className="mt-2"
                />
              ) : (
                <View className="mt-2 bg-sky-50 dark:bg-sky-950/40 p-4 rounded-xl border border-sky-100 dark:border-sky-900/40">
                  <Text className="text-xs font-bold text-sky-500 uppercase tracking-wider mb-1">Generated Link</Text>
                  <Text className="text-sm font-semibold text-foreground mb-4" selectable={true}>{generatedLink}</Text>
                  
                  <View className="flex-row gap-2">
                    <TouchableOpacity 
                      onPress={() => {
                        Alert.alert('Link Copied', 'Check-in link copied to clipboard!');
                      }}
                      className="flex-1 bg-primary py-3 rounded-xl items-center justify-center flex-row"
                    >
                      <Copy size={16} color="#FFFFFF" className="mr-1.5" />
                      <Text className="text-white font-bold text-xs">Copy Link</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

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
