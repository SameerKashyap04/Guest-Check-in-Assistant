import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';
import { CreditCard, Search, Filter, Edit3, Clock, CheckCircle } from 'lucide-react-native';
import { BackendApiService } from '@/services/backendApi';
import { SubscriptionPlanId } from '@/types/subscription';

export const SubscriptionsPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    BackendApiService.getAdminSubscriptions().then(setSubscriptions);
  }, []);

  const handleUpdatePlan = async (newPlan: SubscriptionPlanId) => {
    if (!selectedSub) return;
    await BackendApiService.updateCustomerPlan(selectedSub.id, newPlan);
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === selectedSub.id ? { ...s, plan: newPlan } : s))
    );
    setModalOpen(false);
    Alert.alert('Plan Updated', `Successfully updated subscription plan to ${newPlan}.`);
  };

  const handleExtendTrial = async () => {
    if (!selectedSub) return;
    await BackendApiService.extendTrialDays(selectedSub.id, 14);
    setModalOpen(false);
    Alert.alert('Trial Extended', 'Extended trial duration by 14 days.');
  };

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-2xl font-bold text-white">Subscription Management</Text>
          <Text className="text-slate-400 text-xs mt-1">Manage customer SaaS subscriptions, billing status & trial extensions</Text>
        </View>
      </View>

      {/* Subscription Table */}
      <View className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {/* Table Header */}
        <View className="flex-row bg-slate-800/80 p-4 border-b border-slate-700/80">
          <Text className="flex-2 text-slate-300 font-bold text-xs uppercase">Customer & Property</Text>
          <Text className="flex-1 text-slate-300 font-bold text-xs uppercase text-center">Plan</Text>
          <Text className="flex-1 text-slate-300 font-bold text-xs uppercase text-center">Cycle</Text>
          <Text className="flex-1 text-slate-300 font-bold text-xs uppercase text-center">Status</Text>
          <Text className="flex-1 text-slate-300 font-bold text-xs uppercase text-center">Renewal</Text>
          <Text className="flex-1 text-slate-300 font-bold text-xs uppercase text-right">Action</Text>
        </View>

        {/* Rows */}
        {subscriptions.map((sub) => (
          <View key={sub.id} className="flex-row items-center p-4 border-b border-slate-800/60">
            <View className="flex-2">
              <Text className="text-white font-bold text-sm">{sub.customerName}</Text>
              <Text className="text-slate-400 text-xs">{sub.propertyName}</Text>
            </View>

            <View className="flex-1 items-center">
              <View className="bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                <Text className="text-amber-400 font-extrabold text-xs">{sub.plan}</Text>
              </View>
            </View>

            <Text className="flex-1 text-slate-300 text-xs text-center capitalize">{sub.billingCycle}</Text>

            <View className="flex-1 items-center">
              <View className="bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <Text className="text-emerald-400 text-xs font-bold capitalize">{sub.status}</Text>
              </View>
            </View>

            <Text className="flex-1 text-slate-400 text-xs text-center">{sub.renewalDate}</Text>

            <TouchableOpacity
              onPress={() => {
                setSelectedSub(sub);
                setModalOpen(true);
              }}
              className="flex-1 bg-slate-800 px-3 py-1.5 rounded-lg items-end"
            >
              <Text className="text-amber-400 font-bold text-xs">Manage</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Admin Action Modal */}
      {selectedSub && (
        <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
          <View className="flex-1 bg-black/70 justify-center items-center p-4">
            <View className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <Text className="text-xl font-bold text-white mb-1">Manage Subscription</Text>
              <Text className="text-slate-400 text-xs mb-4">{selectedSub.propertyName} ({selectedSub.customerName})</Text>

              <Text className="text-xs font-bold text-slate-300 uppercase mb-2">Change Plan Tier:</Text>

              {(['FREE', 'STARTER', 'PROFESSIONAL', 'MULTI_PROPERTY'] as SubscriptionPlanId[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => handleUpdatePlan(p)}
                  className={`p-3 rounded-xl mb-2 flex-row justify-between items-center ${
                    selectedSub.plan === p ? 'bg-amber-500/20 border border-amber-500/40' : 'bg-slate-800'
                  }`}
                >
                  <Text className="text-white font-bold text-sm">{p}</Text>
                  {selectedSub.plan === p && <CheckCircle size={16} color="#F59E0B" />}
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                onPress={handleExtendTrial}
                className="w-full bg-slate-800 py-3 rounded-xl items-center mt-3 border border-slate-700"
              >
                <Text className="text-blue-400 font-bold text-xs">+ Extend Trial by 14 Days</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setModalOpen(false)} className="w-full py-2 items-center mt-3">
                <Text className="text-slate-400 text-xs">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};
