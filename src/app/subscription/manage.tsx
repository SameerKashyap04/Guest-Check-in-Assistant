import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Sparkles, CreditCard, Clock, RefreshCw } from 'lucide-react-native';
import { useSubscriptionStore } from '@/store/useSubscriptionStore';
import { PLANS } from '@/config/plans';
import { UsageMeter } from '@/components/subscription/UsageMeter';
import { getMonthlyCheckinCount, getMonthlyExportCount } from '@/database';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useRoomsStore } from '@/store/useRoomsStore';

export default function ManageSubscriptionScreen() {
  const router = useRouter();
  const propertyId = useSettingsStore((s) => s.propertyId);
  const rooms = useRoomsStore((s) => s.rooms);

  const {
    currentPlan,
    status,
    billingCycle,
    renewalDate,
    trialEnd,
    getRemainingTrialDays,
    verifyOnlineSubscription,
  } = useSubscriptionStore();

  const activePlan = PLANS[currentPlan] || PLANS.FREE;
  const remainingDays = getRemainingTrialDays();

  const [checkinCount, setCheckinCount] = useState(0);
  const [exportCount, setExportCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsage = async () => {
    setRefreshing(true);
    const cCount = await getMonthlyCheckinCount(propertyId);
    const eCount = await getMonthlyExportCount(propertyId);
    setCheckinCount(cCount);
    setExportCount(eCount);
    await verifyOnlineSubscription();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchUsage();
  }, [propertyId]);

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-800">
        <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full bg-slate-900">
          <ArrowLeft size={20} color="#F8FAFC" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white">Manage Subscription</Text>
        <TouchableOpacity onPress={fetchUsage} className="p-2 rounded-full bg-slate-900">
          <RefreshCw size={18} color="#94A3B8" className={refreshing ? 'animate-spin' : ''} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
        {/* Current Plan Overview Card */}
        <View className="bg-slate-900 rounded-3xl p-5 mb-5 border border-slate-800 shadow-xl">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center space-x-2">
              <Sparkles size={20} color="#F59E0B" />
              <Text className="text-xl font-bold text-white">{activePlan.name} Plan</Text>
            </View>
            <View className={`px-3 py-1 rounded-full border ${status === 'active' || status === 'trialing' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <Text className={`text-xs font-bold uppercase tracking-wider ${status === 'active' || status === 'trialing' ? 'text-emerald-400' : 'text-red-400'}`}>
                {status}
              </Text>
            </View>
          </View>

          {status === 'trialing' && (
            <View className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4 flex-row items-center space-x-2">
              <Clock size={16} color="#F59E0B" />
              <Text className="text-amber-400 text-xs font-semibold">
                Trial Active: {remainingDays} day{remainingDays === 1 ? '' : 's'} remaining
              </Text>
            </View>
          )}

          <View className="border-t border-slate-800/80 pt-3 space-y-2">
            <View className="flex-row justify-between text-xs">
              <Text className="text-slate-400 text-xs">Billing Cycle:</Text>
              <Text className="text-slate-200 font-semibold text-xs capitalize">{billingCycle}</Text>
            </View>
            <View className="flex-row justify-between text-xs">
              <Text className="text-slate-400 text-xs">Renewal Date:</Text>
              <Text className="text-slate-200 font-semibold text-xs">
                {renewalDate ? new Date(renewalDate).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/subscription/pricing')}
            className="w-full bg-amber-500 hover:bg-amber-600 py-3.5 rounded-xl items-center justify-center mt-5"
          >
            <Text className="text-slate-950 font-bold text-sm">Upgrade or Change Plan</Text>
          </TouchableOpacity>
        </View>

        {/* Live Usage Meters */}
        <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
          Current Monthly Usage
        </Text>

        <UsageMeter
          label="Monthly Check-ins"
          current={checkinCount}
          limit={activePlan.entitlements.monthlyCheckInLimit}
          unit="check-ins"
        />

        <UsageMeter
          label="Registered Rooms"
          current={rooms.length}
          limit={activePlan.entitlements.maxRoomsPerProperty}
          unit="rooms"
        />

        <UsageMeter
          label="Monthly PDF/CSV Exports"
          current={exportCount}
          limit={activePlan.entitlements.unlimitedExports ? 'unlimited' : 5}
          unit="exports"
        />

        {/* Feature Matrix Status */}
        <View className="bg-slate-900 rounded-2xl p-4 my-3 border border-slate-800">
          <Text className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Plan Entitlements Overview
          </Text>

          <View className="space-y-2">
            <View className="flex-row justify-between items-center">
              <Text className="text-slate-400 text-xs">Camera OCR ID Scan:</Text>
              <Text className={`text-xs font-semibold ${activePlan.entitlements.ocrScanning ? 'text-emerald-400' : 'text-slate-500'}`}>
                {activePlan.entitlements.ocrScanning ? 'Enabled' : 'Locked (Professional)'}
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className="text-slate-400 text-xs">Automated Backups:</Text>
              <Text className={`text-xs font-semibold ${activePlan.entitlements.backups ? 'text-emerald-400' : 'text-slate-500'}`}>
                {activePlan.entitlements.backups ? 'Enabled' : 'Locked (Professional)'}
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className="text-slate-400 text-xs">Multi-Property Dashboard:</Text>
              <Text className={`text-xs font-semibold ${activePlan.entitlements.multiProperty ? 'text-emerald-400' : 'text-slate-500'}`}>
                {activePlan.entitlements.multiProperty ? 'Enabled' : 'Locked (Multi-Property)'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
