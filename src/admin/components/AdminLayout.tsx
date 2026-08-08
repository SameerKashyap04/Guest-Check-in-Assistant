import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LayoutDashboard, Users, Building2, CreditCard, TrendingUp, Sliders, Shield, LogOut } from 'lucide-react-native';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activeTab, onTabChange }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'revenue', label: 'Revenue Analytics', icon: <TrendingUp size={18} /> },
    { id: 'subscriptions', label: 'Subscriptions', icon: <CreditCard size={18} /> },
    { id: 'users', label: 'Users', icon: <Users size={18} /> },
    { id: 'properties', label: 'Properties', icon: <Building2 size={18} /> },
    { id: 'plans', label: 'Plan Configurator', icon: <Sliders size={18} /> },
    { id: 'audit', label: 'Audit Logs', icon: <Shield size={18} /> },
  ];

  return (
    <View className="flex-1 flex-row bg-slate-950">
      {/* Sidebar */}
      <View className="w-64 bg-slate-900 border-r border-slate-800 p-4 justify-between">
        <View>
          {/* Logo / Brand Header */}
          <View className="flex-row items-center space-x-3 mb-8 px-2">
            <View className="w-9 h-9 rounded-xl bg-amber-500 items-center justify-center">
              <Shield size={20} color="#020617" />
            </View>
            <View>
              <Text className="text-white font-bold text-base">Guest Check-in</Text>
              <Text className="text-amber-400 font-semibold text-xs tracking-wider uppercase">SaaS Admin Control</Text>
            </View>
          </View>

          {/* Navigation Items */}
          <View className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => onTabChange(item.id)}
                  className={`flex-row items-center space-x-3 px-3 py-3 rounded-xl ${
                    isActive ? 'bg-amber-500/15 border border-amber-500/30' : 'hover:bg-slate-800/60'
                  }`}
                >
                  {React.cloneElement(item.icon, { color: isActive ? '#F59E0B' : '#94A3B8' })}
                  <Text className={`font-semibold text-sm ${isActive ? 'text-amber-400' : 'text-slate-400'}`}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Footer Admin Profile */}
        <View className="border-t border-slate-800/80 pt-4 px-2 flex-row justify-between items-center">
          <View>
            <Text className="text-white font-bold text-xs">Super Admin</Text>
            <Text className="text-slate-400 text-[10px]">admin@guestcheckin.com</Text>
          </View>
          <View className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        </View>
      </View>

      {/* Main Content Area */}
      <View className="flex-1 bg-slate-950 p-6">
        {children}
      </View>
    </View>
  );
};
