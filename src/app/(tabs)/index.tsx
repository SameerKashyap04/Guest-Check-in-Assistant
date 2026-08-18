import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Platform, Modal, Image, Share, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/GlassCard';
import { Users, LogIn, LogOut, AlertCircle, Search, FileBarChart, X, User, Phone, Mail, IdCard, MapPin, Calendar, Globe, DoorOpen, Share2, ExternalLink, Sparkles, Link2, QrCode, Download } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Input } from '@/components/Input';
import { openDatabase } from '@/database';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useRoomsStore } from '@/store/useRoomsStore';
import { subscribeToPropertyCheckins, subscribeToPendingCheckinCount } from '@/services/firebaseSync';
import { createMultipleGuestsAndStay, autoCheckoutExpiredStays } from '@/database/stays';
import { parseCheckinImportText } from '@/utils/checkinImporter';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { businessName, userName: customUserName, propertyId, ownerId, storageMode, getShareableLink } = useSettingsStore();
  const { owner } = useAuthStore();
  const { rooms, fetchRooms } = useRoomsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [recentGuests, setRecentGuests] = useState<any[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<any | null>(null);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const router = useRouter();

  const handleExecuteImport = async () => {
    if (!importText.trim()) {
      Alert.alert('Empty Input', 'Please paste the check-in message or code.');
      return;
    }
    const parsed = parseCheckinImportText(importText.trim());
    if (!parsed || !parsed.fullName) {
      Alert.alert('Invalid Check-in Code', 'Could not parse guest check-in details. Please make sure to copy the full message from WhatsApp.');
      return;
    }

    try {
      setIsImporting(true);
      let roomId = rooms.length > 0 ? rooms[0].id : 101;
      const matchedRoom = rooms.find(r => r.room_number === parsed.roomNumber);
      if (matchedRoom) roomId = matchedRoom.id;

      const todayStr = new Date().toISOString().split('T')[0];

      await createMultipleGuestsAndStay(
        [{
          full_name: parsed.fullName,
          id_number: parsed.idNumber || 'N/A',
          address: parsed.address || '',
          phone: parsed.phone || '',
          photo_uri: '',
          back_photo_uri: '',
          selfie_uri: '',
          property_id: propertyId || 'HS-8821',
          id_type: parsed.idType || 'Aadhaar',
          dob: '',
          gender: 'Other',
          pin_code: parsed.pinCode || ''
        }],
        {
          room_id: roomId,
          check_in_date: todayStr,
          check_out_date: todayStr
        }
      );

      await fetchGuests();
      setIsImportModalVisible(false);
      setImportText('');
      Alert.alert('Check-in Imported!', `Guest ${parsed.fullName} assigned to Room ${parsed.roomNumber} has been saved to your app.`);
    } catch (e: any) {
      console.error('Manual import error', e);
      Alert.alert('Import Failed', e?.message || 'Could not save imported check-in.');
    } finally {
      setIsImporting(false);
    }
  };

  const [overviewStats, setOverviewStats] = useState({
    todayCheckins: 0,
    todayCheckouts: 0,
    activeGuests: 0,
    pendingVerif: 0
  });

  // Real-time Cloud Sync Listener for Web Self Check-in Submissions
  useEffect(() => {
    if (!propertyId) return;
    const unsubscribe = subscribeToPropertyCheckins(
      propertyId,
      () => { fetchGuests(); },
      ownerId,
      false
    );
    return () => unsubscribe();
  }, [propertyId, ownerId, storageMode]);

  // Separate live pending count listener — updates on BOTH additions AND rejections/removals
  useEffect(() => {
    if (!propertyId && !ownerId) return;
    const unsubscribeCount = subscribeToPendingCheckinCount(
      propertyId || '',
      ownerId || '',
      (count) => {
        setOverviewStats(prev => ({ ...prev, pendingVerif: count }));
      }
    );
    return () => unsubscribeCount();
  }, [propertyId, ownerId]);

  const currentHour = new Date().getHours();
  let greetingKey = 'goodEvening';
  if (currentHour < 12) greetingKey = 'goodMorning';
  else if (currentHour < 18) greetingKey = 'goodAfternoon';
  const greeting = t(greetingKey);
  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const userName = (customUserName && customUserName.trim()) || 'Sameer';

  const fetchGuests = async () => {
    try {
      await autoCheckoutExpiredStays();
      const activePropertyId = propertyId || 'HS-DEFAULT';
      const db = await openDatabase();
      const guests = await db.getAllAsync(`
        SELECT g.*, r.room_number, r.room_type, s.check_in_date, s.check_out_date
        FROM guests g
        LEFT JOIN stays s ON s.guest_id = g.id
        LEFT JOIN rooms r ON r.id = s.room_id
        WHERE g.property_id = ? OR g.property_id IS NULL OR g.property_id = ''
        ORDER BY g.id DESC LIMIT 10
      `, [activePropertyId]);
      setRecentGuests(guests as any[]);
      fetchRooms();

      // Dynamic calculation for Today's Overview metrics:
      const todayIso = new Date().toISOString().split('T')[0];
      const todayDateObj = new Date();
      const tYear = todayDateObj.getFullYear();
      const tMonth = String(todayDateObj.getMonth() + 1).padStart(2, '0');
      const tDay = String(todayDateObj.getDate()).padStart(2, '0');
      const todayIndian = `${tDay}/${tMonth}/${tYear}`;

      // 1. Today's Check-ins Count
      const checkinsRes: any = await db.getFirstAsync(`
        SELECT COUNT(*) as count FROM stays s
        JOIN guests g ON g.id = s.guest_id
        WHERE g.property_id = ?
          AND (s.check_in_date LIKE ? OR s.check_in_date LIKE ? OR s.check_in_date LIKE ?)
      `, [activePropertyId, `${todayIso}%`, `${todayIndian}%`, `%${todayIso}%`]);

      // 2. Today's Check-outs Count — counts stays marked 'completed' with today's check_out_date
      const checkoutsRes: any = await db.getFirstAsync(`
        SELECT COUNT(*) as count FROM stays s
        JOIN guests g ON g.id = s.guest_id
        WHERE g.property_id = ?
          AND s.status = 'completed' 
          AND (s.check_out_date LIKE ? OR s.check_out_date LIKE ? OR s.check_out_date LIKE ?)
      `, [activePropertyId, `${todayIso}%`, `${todayIndian}%`, `%${todayIso}%`]);

      // 3. Current Active Guests Count
      const activeRes: any = await db.getFirstAsync(`
        SELECT COUNT(*) as count FROM stays s
        JOIN guests g ON g.id = s.guest_id
        WHERE g.property_id = ?
          AND (s.status IS NULL OR s.status = 'active')
      `, [activePropertyId]);

      setOverviewStats(prev => ({
        ...prev,
        todayCheckins: checkinsRes?.count || 0,
        todayCheckouts: checkoutsRes?.count || 0,
        activeGuests: activeRes?.count || 0
      }));
    } catch (e) {
      console.error('Failed to fetch guests and overview metrics', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGuests();
    }, [])
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <ScrollView 
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={async () => {
              setRefreshing(true);
              await fetchGuests();
              setRefreshing(false);
            }} 
          />
        }
      >
        <View className="mb-6 mt-2">
          <Text className="text-sm text-gray-500 mb-1 font-medium">{todayDate}</Text>
          <Text className="text-3xl font-extrabold text-foreground tracking-tight">{greeting}, {userName}</Text>
        </View>

        <View className="flex-row items-center gap-3 mb-6">
          <TouchableOpacity 
            className="flex-1"
            onPress={() => router.push('/search')}
            activeOpacity={0.7}
          >
            <View pointerEvents="none">
              <Input 
                placeholder={t('searchByNamePhoneRoom')} 
                icon={<Search size={20} color="#9498AA" />}
                editable={false}
                className="mb-0"
              />
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            className="w-14 h-14 bg-white dark:bg-black/20 border border-gray-100 dark:border-white/10 rounded-2xl items-center justify-center"
            style={Platform.OS === 'web' ? ({ transition: 'all 0.2s ease' } as any) : undefined}
            activeOpacity={0.7}
            onPress={() => router.push('/reports')}
          >
            <FileBarChart size={24} color="#38BDF8" />
          </TouchableOpacity>
        </View>

        <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          {t('todaysOverview')}
        </Text>
        
        <View className="flex-row flex-wrap justify-between">
          <GlassCard variant="elevated" className="w-[48%] mb-4 p-5 flex-col items-center rounded-2xl">
            <LogIn size={28} color="#38BDF8" className="mb-2" />
            <Text className="text-3xl font-bold text-foreground">{overviewStats.todayCheckins}</Text>
            <Text className="text-xs text-gray-500 font-medium">{t('todayCheckins')}</Text>
          </GlassCard>
          
          <GlassCard variant="elevated" className="w-[48%] mb-4 p-5 flex-col items-center rounded-2xl">
            <LogOut size={28} color="#14B8A6" className="mb-2" />
            <Text className="text-3xl font-bold text-foreground">{overviewStats.todayCheckouts}</Text>
            <Text className="text-xs text-gray-500 font-medium">{t('todayCheckouts')}</Text>
          </GlassCard>

          <GlassCard variant="elevated" className="w-[48%] mb-4 p-5 flex-col items-center rounded-2xl">
            <Users size={28} color="#F59E0B" className="mb-2" />
            <Text className="text-3xl font-bold text-foreground">{overviewStats.activeGuests}</Text>
            <Text className="text-xs text-gray-500 font-medium">{t('activeGuests')}</Text>
          </GlassCard>

          <GlassCard variant="elevated" className="w-[48%] mb-4 p-5 flex-col items-center rounded-2xl">
            <AlertCircle size={28} color="#EF4444" className="mb-2" />
            <Text className="text-3xl font-bold text-foreground">{overviewStats.pendingVerif}</Text>
            <Text className="text-xs text-gray-500 font-medium">{t('pendingVerif')}</Text>
          </GlassCard>
        </View>

        <View className="flex-row justify-between items-center mb-4 mt-4">
          <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            {t('recentCheckins')}
          </Text>
          <TouchableOpacity 
            onPress={() => router.push('/registrations')}
            activeOpacity={0.7}
            className="flex-row items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full"
          >
            <Text className="text-xs font-bold text-primary">{t('viewAll')} →</Text>
          </TouchableOpacity>
        </View>
        
        <GlassCard className="mb-6 p-5 rounded-2xl">
          {recentGuests.length === 0 ? (
            <Text className="text-gray-500 text-center py-4">{t('noRecentCheckins')}</Text>
          ) : (
            recentGuests.map((guest, index) => (
              <TouchableOpacity 
                key={guest.id}
                activeOpacity={0.7}
                onPress={() => setSelectedGuest(guest)}
                className={`flex-row justify-between items-center ${index !== recentGuests.length - 1 ? 'border-b border-gray-100 dark:border-gray-800 pb-3 mb-3' : ''}`}
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
                    <Text className="text-foreground font-bold text-lg">
                      {guest.full_name ? guest.full_name.charAt(0).toUpperCase() : '?'}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-foreground" numberOfLines={1}>{guest.full_name}</Text>
                    <View className="flex-row items-center gap-1.5 mt-0.5">
                      {guest.room_number ? (
                        <View className="bg-foreground/10 px-1.5 py-0.5 rounded">
                          <Text className="text-[11px] font-bold text-foreground">Room {guest.room_number}</Text>
                        </View>
                      ) : null}
                      <Text className="text-xs text-gray-500" numberOfLines={1}>ID: {guest.id_number || 'N/A'}</Text>
                    </View>
                  </View>
                </View>

                <View className="items-end gap-1">
                  <View className="bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                    <Text className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Verified</Text>
                  </View>
                  <Text className="text-[10px] text-primary font-semibold">Tap to view ID Card →</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </GlassCard>

      </ScrollView>

      {/* Guest Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!selectedGuest}
        onRequestClose={() => setSelectedGuest(null)}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setSelectedGuest(null)}
          className="flex-1 bg-black/50 justify-end"
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation?.()}
            className="bg-white dark:bg-[#12141C] rounded-t-3xl p-6 max-h-[85%]"
          >
            {selectedGuest && (
              <View>
                <View className="flex-row justify-between items-center mb-6">
                  <View className="flex-row items-center gap-3">
                    <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center">
                      <User size={24} color="#000000" />
                    </View>
                    <View>
                      <Text className="text-xl font-bold text-foreground">{selectedGuest.full_name}</Text>
                      <Text className="text-xs text-emerald-600 font-semibold">Verified Registration</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedGuest(null)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <X size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                  
                  {/* GUEST SELFIE PHOTO (IF AVAILABLE) */}
                  {selectedGuest.selfie_uri ? (
                    <View className="mb-4">
                      <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                        Guest Selfie Photo
                      </Text>
                      <View className="bg-sky-50 dark:bg-sky-950/30 p-3 rounded-2xl border border-sky-100 dark:border-sky-800/40">
                        <View className="bg-primary/20 px-2.5 py-1 rounded-md self-start mb-2">
                          <Text className="text-xs font-bold text-primary">Self Check-in Selfie</Text>
                        </View>
                        <Image 
                          source={{ uri: selectedGuest.selfie_uri }} 
                          style={{ width: '100%', height: 180, borderRadius: 12 }}
                          resizeMode="cover"
                        />
                      </View>
                    </View>
                  ) : null}

                  {/* ID CARD PHOTOS (FRONT & BACK) */}
                  {(selectedGuest.photo_uri || selectedGuest.back_photo_uri) ? (
                    <View className="mb-4">
                      <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                        ID Card Photos ({selectedGuest.photo_uri && selectedGuest.back_photo_uri ? 'Front & Back' : 'Scanned ID'})
                      </Text>
                      <View className="gap-3">
                        {selectedGuest.photo_uri ? (
                          <View className="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                            <View className="bg-gray-200 dark:bg-gray-700 px-2.5 py-1 rounded-md self-start mb-2">
                              <Text className="text-xs font-bold text-foreground">Front Side ID</Text>
                            </View>
                            <Image 
                              source={{ uri: selectedGuest.photo_uri }} 
                              style={{ width: '100%', height: 160, borderRadius: 12 }}
                              resizeMode="cover"
                            />
                          </View>
                        ) : null}

                        {selectedGuest.back_photo_uri ? (
                          <View className="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                            <View className="bg-gray-200 dark:bg-gray-700 px-2.5 py-1 rounded-md self-start mb-2">
                              <Text className="text-xs font-bold text-foreground">Back Side ID</Text>
                            </View>
                            <Image 
                              source={{ uri: selectedGuest.back_photo_uri }} 
                              style={{ width: '100%', height: 160, borderRadius: 12 }}
                              resizeMode="cover"
                            />
                          </View>
                        ) : null}
                      </View>
                    </View>
                  ) : null}

                  <View className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl mb-4 border border-gray-100 dark:border-gray-800 space-y-3">
                    
                    {selectedGuest.room_number && (
                      <View className="flex-row items-center gap-3">
                        <DoorOpen size={18} color="#6B7280" />
                        <View>
                          <Text className="text-xs text-gray-400 font-medium">Assigned Room</Text>
                          <Text className="text-sm font-bold text-foreground">Room {selectedGuest.room_number} ({selectedGuest.room_type || 'Standard'})</Text>
                        </View>
                      </View>
                    )}

                    <View className="flex-row items-center gap-3">
                      <IdCard size={18} color="#6B7280" />
                      <View>
                        <Text className="text-xs text-gray-400 font-medium">Document ID ({selectedGuest.id_type || 'ID'})</Text>
                        <Text className="text-sm font-semibold text-foreground">{selectedGuest.id_number || 'N/A'}</Text>
                      </View>
                    </View>

                    <View className="flex-row items-center gap-3">
                      <Phone size={18} color="#6B7280" />
                      <View>
                        <Text className="text-xs text-gray-400 font-medium">Phone</Text>
                        <Text className="text-sm font-semibold text-foreground">{selectedGuest.phone || 'N/A'}</Text>
                      </View>
                    </View>

                    <View className="flex-row items-center gap-3">
                      <Mail size={18} color="#6B7280" />
                      <View>
                        <Text className="text-xs text-gray-400 font-medium">Email</Text>
                        <Text className="text-sm font-semibold text-foreground">{selectedGuest.email || 'N/A'}</Text>
                      </View>
                    </View>

                    <View className="flex-row items-center gap-3">
                      <Globe size={18} color="#6B7280" />
                      <View>
                        <Text className="text-xs text-gray-400 font-medium">Nationality / Gender</Text>
                        <Text className="text-sm font-semibold text-foreground">{selectedGuest.nationality || 'Indian'} • {selectedGuest.gender || 'N/A'}</Text>
                      </View>
                    </View>

                    <View className="flex-row items-center gap-3">
                      <MapPin size={18} color="#6B7280" />
                      <View className="flex-1">
                        <Text className="text-xs text-gray-400 font-medium">Address</Text>
                        <Text className="text-sm font-semibold text-foreground">
                          {[selectedGuest.address, selectedGuest.city, selectedGuest.state, selectedGuest.country, selectedGuest.pin_code].filter(Boolean).join(', ') || 'N/A'}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center gap-3">
                      <Calendar size={18} color="#6B7280" />
                      <View>
                        <Text className="text-xs text-gray-400 font-medium">Registration Time</Text>
                        <Text className="text-sm font-semibold text-foreground">
                          {selectedGuest.created_at ? new Date(selectedGuest.created_at).toLocaleString() : 'Recent'}
                        </Text>
                      </View>
                    </View>

                  </View>
                </ScrollView>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* MANUAL IMPORT MODAL */}
      <Modal visible={isImportModalVisible} transparent animationType="slide">
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setIsImportModalVisible(false)}
          className="flex-1 bg-black/60 justify-end"
        >
          <TouchableOpacity activeOpacity={1} className="bg-background rounded-t-3xl p-6 border-t border-gray-200 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center gap-2">
                <LogIn size={20} color="#000000" className="dark:text-white" />
                <Text className="text-lg font-bold text-foreground">Import Web Self Check-in</Text>
              </View>
              <TouchableOpacity onPress={() => setIsImportModalVisible(false)} className="p-1 rounded-full bg-gray-100 dark:bg-gray-800">
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-gray-500 mb-3">
              Paste the check-in text or code received on WhatsApp from the guest to import their details directly into your database.
            </Text>

            <Input
              label="Paste Check-in Code / WhatsApp Message *"
              placeholder="Paste WhatsApp message or #GUEST_IMPORT_DATA...# code here"
              value={importText}
              onChangeText={setImportText}
              multiline
              numberOfLines={5}
              style={{ minHeight: 110, textAlignVertical: 'top' }}
            />

            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity
                onPress={() => setIsImportModalVisible(false)}
                className="flex-1 py-3.5 rounded-xl border border-gray-300 dark:border-gray-700 items-center justify-center"
              >
                <Text className="font-bold text-foreground">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                disabled={isImporting}
                onPress={handleExecuteImport}
                className="flex-1 py-3.5 rounded-xl bg-black dark:bg-white items-center justify-center flex-row gap-1.5"
              >
                {isImporting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Download size={16} color="#FFFFFF" />
                    <Text className="font-bold text-white dark:text-black">
                      Save to App
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
