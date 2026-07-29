import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/GlassCard';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { ShieldCheck, Mail, Lock, Building2, UserPlus, LogIn, ChevronLeft, Zap } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { signUpOwner, loginOwner } from '@/services/firebaseAuth';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { PinScreen } from '@/features/auth/PinScreen';

export default function AuthScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { isAuthenticated, isUnlocked, hasPin, setOwner, checkPinSetup } = useAuthStore();
  const { setBusinessSetup, setOwnerId } = useSettingsStore();

  useEffect(() => {
    checkPinSetup();
  }, [checkPinSetup]);

  // If owner is already authenticated and unlocked, redirect directly to dashboard
  useEffect(() => {
    if (isAuthenticated && isUnlocked) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isUnlocked]);

  // If owner is authenticated, show Security PIN & Biometrics Screen (Setup or Unlock)
  if (isAuthenticated && !isUnlocked) {
    return <PinScreen onSuccess={() => router.replace('/(tabs)')} />;
  }

  const handleAuthSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter your email and password.');
      return;
    }

    if (tab === 'signup' && !businessName.trim()) {
      Alert.alert('Required Fields', 'Please enter your Homestay Property Name.');
      return;
    }

    // Master Admin Login Check
    if (email.trim().toLowerCase() === 'owner.admin@homestay.com' && password.trim() === 'Admin@123456') {
      const masterProfile = {
        uid: 'OWNER_ADMIN_999',
        email: 'owner.admin@homestay.com',
        businessName: businessName.trim() || 'Sameer Homestay (Master Admin)',
        propertyId: 'HS-8821',
        createdAt: new Date().toISOString()
      };
      setOwner(masterProfile);
      setOwnerId(masterProfile.uid);
      setBusinessSetup(masterProfile.businessName);
      
      const pinExists = await checkPinSetup();
      if (pinExists) {
        useAuthStore.setState({ isUnlocked: true });
        router.replace('/(tabs)');
      }
      return;
    }

    try {
      setIsLoading(true);
      let profile;

      if (tab === 'signup') {
        profile = await signUpOwner(email.trim(), password.trim(), businessName.trim());
        setBusinessSetup(businessName.trim());
      } else {
        profile = await loginOwner(email.trim(), password.trim());
        if (profile.businessName) {
          setBusinessSetup(profile.businessName);
        }
      }

      setOwner(profile);
      setOwnerId(profile.uid);

      const pinExists = await checkPinSetup();
      if (pinExists) {
        useAuthStore.setState({ isUnlocked: true });
        router.replace('/(tabs)');
      }
      // If PIN does not exist, state is authenticated but unlocked=false, rendering PinScreen in setup mode!
    } catch (err: any) {
      console.error('Auth error', err);
      Alert.alert('Authentication Failed', err?.message || 'Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDebugDirectAccess = async () => {
    const debugProfile = {
      uid: 'OWNER_DEBUG_101',
      email: 'owner.admin@homestay.com',
      businessName: businessName.trim() || 'Sameer Homestay',
      propertyId: 'HS-8821',
      createdAt: new Date().toISOString()
    };
    setOwner(debugProfile);
    setOwnerId(debugProfile.uid);
    setBusinessSetup(debugProfile.businessName);

    const pinExists = await checkPinSetup();
    if (pinExists) {
      useAuthStore.setState({ isUnlocked: true });
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-3 pb-3 border-b border-gray-200/50 dark:border-gray-800">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="p-2 -ml-2 rounded-full active:bg-gray-100 dark:active:bg-gray-800"
        >
          <ChevronLeft size={26} color="#000000" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-foreground">Homestay Owner Portal</Text>
        <View className="w-8" />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1, justifyContent: 'center' }}>
          
          <GlassCard className="p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
            {/* Header Icon */}
            <View className="items-center mb-6">
              <View className="w-16 h-16 rounded-2xl bg-black dark:bg-white items-center justify-center mb-3">
                <ShieldCheck size={36} color="#FFFFFF" className="dark:text-black" />
              </View>
              <Text className="text-2xl font-extrabold text-foreground text-center">Owner Account</Text>
              <Text className="text-xs text-gray-500 text-center mt-1">
                Manage your homestay property & receive real-time guest self check-ins
              </Text>
            </View>

            {/* Login / Sign Up Tabs */}
            <View className="flex-row bg-gray-100 dark:bg-gray-800/60 p-1 rounded-2xl mb-6">
              <TouchableOpacity
                onPress={() => setTab('login')}
                className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center gap-1.5 ${
                  tab === 'login' ? 'bg-white dark:bg-black shadow-sm' : ''
                }`}
              >
                <LogIn size={16} color={tab === 'login' ? '#000000' : '#6B7280'} className="dark:text-white" />
                <Text className={`font-bold text-xs ${tab === 'login' ? 'text-foreground' : 'text-gray-500'}`}>
                  Log In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setTab('signup')}
                className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center gap-1.5 ${
                  tab === 'signup' ? 'bg-white dark:bg-black shadow-sm' : ''
                }`}
              >
                <UserPlus size={16} color={tab === 'signup' ? '#000000' : '#6B7280'} className="dark:text-white" />
                <Text className={`font-bold text-xs ${tab === 'signup' ? 'text-foreground' : 'text-gray-500'}`}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form Fields */}
            {tab === 'signup' && (
              <Input
                label="Property / Business Name *"
                placeholder="e.g. Sameer Homestay"
                value={businessName}
                onChangeText={setBusinessName}
                icon={<Building2 size={18} color="#9498AA" />}
              />
            )}

            <Input
              label="Email Address *"
              placeholder="owner@homestay.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              icon={<Mail size={18} color="#9498AA" />}
            />

            <Input
              label="Password *"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              icon={<Lock size={18} color="#9498AA" />}
            />

            {/* Submit Button */}
            <Button
              label={isLoading ? 'Processing...' : tab === 'signup' ? 'Create Owner Account' : 'Log In to Dashboard'}
              disabled={isLoading}
              icon={isLoading ? <ActivityIndicator size="small" color="#FFFFFF" className="mr-2" /> : null}
              onPress={handleAuthSubmit}
              className="mt-2 bg-black dark:bg-white"
            />

            {/* Direct Debug Login Button */}
            <View className="mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-800 items-center">
              <TouchableOpacity
                onPress={handleDebugDirectAccess}
                className="w-full py-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex-row items-center justify-center gap-2"
              >
                <Zap size={18} color="#D97706" />
                <Text className="text-sm font-bold text-amber-700 dark:text-amber-400">
                  Direct Debug Access (No Password)
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
