import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { TrendingUp, Users, Building2, CreditCard, Sparkles, AlertCircle, ArrowUpRight, CheckCircle2 } from 'lucide-react-native';
import { BackendApiService, AdminDashboardMetrics } from '@/services/backendApi';

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);

  useEffect(() => {
    BackendApiService.getAdminDashboardMetrics().then(setMetrics);
  }, []);

  if (!metrics) return null;

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {/* Top Header */}
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-2xl font-bold text-white">SaaS Overview Dashboard</Text>
          <Text className="text-slate-400 text-xs mt-1">Live business performance, MRR/ARR analytics & system activity</Text>
        </View>

        <View className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl flex-row items-center space-x-2">
          <View className="w-2 h-2 rounded-full bg-emerald-500" />
          <Text className="text-slate-300 font-semibold text-xs">Live Backend Engine</Text>
        </View>
      </View>

      {/* Primary Financial Metric Cards */}
      <View className="flex-row space-x-4 mb-6">
        <View className="flex-1 bg-gradient-to-br from-amber-500/20 to-orange-500/10 bg-slate-900 border border-amber-500/40 p-5 rounded-2xl">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-amber-400 font-semibold text-xs uppercase tracking-wider">Monthly Recurring Revenue</Text>
            <TrendingUp size={18} color="#F59E0B" />
          </View>
          <Text className="text-3xl font-black text-white">₹{metrics.mrr.toLocaleString()}</Text>
          <Text className="text-emerald-400 text-[11px] font-semibold mt-2 flex-row items-center">
            +14.8% vs last month
          </Text>
        </View>

        <View className="flex-1 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-slate-400 font-semibold text-xs uppercase tracking-wider">Annual Recurring Revenue</Text>
            <Sparkles size={18} color="#38BDF8" />
          </View>
          <Text className="text-3xl font-black text-white">₹{metrics.arr.toLocaleString()}</Text>
          <Text className="text-slate-400 text-[11px] mt-2">Annual contract run-rate</Text>
        </View>

        <View className="flex-1 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-slate-400 font-semibold text-xs uppercase tracking-wider">Active Subscriptions</Text>
            <CreditCard size={18} color="#10B981" />
          </View>
          <Text className="text-3xl font-black text-white">{metrics.activeSubscriptions}</Text>
          <Text className="text-slate-400 text-[11px] mt-2">Paying properties</Text>
        </View>

        <View className="flex-1 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-slate-400 font-semibold text-xs uppercase tracking-wider">Monthly Churn</Text>
            <AlertCircle size={18} color="#F43F5E" />
          </View>
          <Text className="text-3xl font-black text-white">{metrics.churnRate}%</Text>
          <Text className="text-emerald-400 text-[11px] font-semibold mt-2">Healthy (&lt; 5.0% target)</Text>
        </View>
      </View>

      {/* Secondary Metrics Row */}
      <View className="flex-row space-x-4 mb-6">
        <View className="flex-1 bg-slate-900/80 border border-slate-800/80 p-4 rounded-xl">
          <Text className="text-slate-400 text-xs">Total Customers</Text>
          <Text className="text-xl font-bold text-white mt-1">{metrics.totalUsers.toLocaleString()}</Text>
        </View>

        <View className="flex-1 bg-slate-900/80 border border-slate-800/80 p-4 rounded-xl">
          <Text className="text-slate-400 text-xs">Trial Users (30d)</Text>
          <Text className="text-xl font-bold text-amber-400 mt-1">{metrics.trialUsers}</Text>
        </View>

        <View className="flex-1 bg-slate-900/80 border border-slate-800/80 p-4 rounded-xl">
          <Text className="text-slate-400 text-xs">Total Check-ins</Text>
          <Text className="text-xl font-bold text-white mt-1">{metrics.totalCheckins.toLocaleString()}</Text>
        </View>

        <View className="flex-1 bg-slate-900/80 border border-slate-800/80 p-4 rounded-xl">
          <Text className="text-slate-400 text-xs">OCR ID Scans</Text>
          <Text className="text-xl font-bold text-blue-400 mt-1">{metrics.ocrScans.toLocaleString()}</Text>
        </View>
      </View>

      {/* Recent Activity Log */}
      <View className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-8">
        <Text className="text-base font-bold text-white mb-4">Recent Customer Activity</Text>

        <View className="space-y-3">
          {[
            { title: 'Rahul Homestay upgraded to Professional Plan', time: '10 mins ago', type: 'upgrade' },
            { title: 'Green Valley Resort completed check-in #42', time: '25 mins ago', type: 'checkin' },
            { title: 'Coorg Heritage Stay converted annual subscription (₹19,999)', time: '1 hour ago', type: 'payment' },
            { title: 'New property registered: Sunset Pines Lodge', time: '3 hours ago', type: 'new' },
          ].map((act, i) => (
            <View key={i} className="flex-row items-center justify-between py-2 border-b border-slate-800/60">
              <View className="flex-row items-center space-x-3">
                <CheckCircle2 size={16} color="#10B981" />
                <Text className="text-slate-200 text-sm">{act.title}</Text>
              </View>
              <Text className="text-slate-500 text-xs">{act.time}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};
