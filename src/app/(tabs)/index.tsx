import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Platform, Modal, Image, Share, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/GlassCard';
import { Users, LogIn, LogOut, AlertCircle, Search, FileBarChart, X, User, Phone, Mail, IdCard, MapPin, Calendar, Globe, DoorOpen, Share2, ExternalLink, Sparkles, Link2, QrCode, Download } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Input } from '@/components/Input';
import { openDatabase } from '@/database';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useRoomsStore } from '@/store/useRoomsStore';
import { subscribeToPropertyCheckins, subscribeToPendingCheckinCount } from '@/services/firebaseSync';
import { createMultipleGuestsAndStay, autoCheckoutExpiredStays } from '@/database/stays';
import { parseCheckinImportText } from '@/utils/checkinImporter';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { businessName, propertyId, ownerId, storageMode, getShareableLink } = useSettingsStore();
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
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: '#f7f7f7' }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchGuests();
              setRefreshing(false);
            }}
            tintColor="#ff385c"
          />
        }
      >
        {/* ── Header ── */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: 8, marginBottom: 20 }}>
          <View>
            <Text style={{ fontSize: 13.5, fontWeight: '400', color: '#6a6a6a', marginBottom: 3 }}>{todayDate}</Text>
            <Text style={{ fontSize: 22, fontWeight: '600', color: '#222222', letterSpacing: -0.4 }}>{greeting}, {businessName || 'Host'} 👋</Text>
          </View>
          {/* Live Sync badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#e5f6e6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999, marginTop: 4 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#008a05', shadowColor: '#008a05', shadowOpacity: 0.4, shadowRadius: 3, elevation: 2 }} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#008a05', letterSpacing: 0.2 }}>Live Sync</Text>
          </View>
        </View>

        {/* ── Search + Reports ── */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24, alignItems: 'center' }}>
          <TouchableOpacity
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
              backgroundColor: '#ffffff', borderRadius: 9999, paddingHorizontal: 18, paddingVertical: 13,
              borderWidth: 1, borderColor: '#dddddd',
              shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
            }}
            onPress={() => router.push('/search')}
            activeOpacity={0.7}
          >
            <Search size={18} color="#929292" />
            <Text style={{ fontSize: 13.5, color: '#929292', fontWeight: '400' }}>{t('searchByNamePhoneRoom')}</Text>
          </TouchableOpacity>

          {/* Reports button */}
          <TouchableOpacity
            style={{
              width: 48, height: 48, borderRadius: 24, backgroundColor: '#ffffff',
              borderWidth: 1, borderColor: '#dddddd', alignItems: 'center', justifyContent: 'center',
              shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
            }}
            onPress={() => router.push('/reports')}
            activeOpacity={0.7}
          >
            <FileBarChart size={20} color="#222222" />
            {/* Rausch notification dot */}
            <View style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff385c', borderWidth: 1.5, borderColor: '#fff' }} />
          </TouchableOpacity>
        </View>

        {/* ── Section label ── */}
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#6a6a6a', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 12 }}>
          {t('todaysOverview')}
        </Text>

        {/* ── Metrics 2×2 Grid ── */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
          {[
            { label: t('todayCheckins'), value: overviewStats.todayCheckins, icon: <LogIn size={18} color="#008a05" /> },
            { label: t('todayCheckouts'), value: overviewStats.todayCheckouts, icon: <LogOut size={18} color="#0f7dc2" /> },
            { label: t('activeGuests'), value: overviewStats.activeGuests, icon: <Users size={18} color="#b45900" /> },
            { label: t('pendingVerif'), value: overviewStats.pendingVerif, icon: <AlertCircle size={18} color="#ff385c" /> },
          ].map((stat) => (
            <View
              key={stat.label}
              style={{
                width: '47.5%', backgroundColor: '#ffffff', borderRadius: 14,
                padding: 14, borderWidth: 1, borderColor: '#ebebeb',
                shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
              }}
            >
              {stat.icon}
              <Text style={{ fontSize: 26, fontWeight: '700', color: '#222222', letterSpacing: -0.5, marginTop: 6 }}>{stat.value}</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#6a6a6a', textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 2 }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Recent Check-ins header ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#6a6a6a', letterSpacing: 0.6, textTransform: 'uppercase' }}>
            {t('recentCheckins')}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/registrations')}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 13, fontWeight: '400', color: '#6a6a6a' }}>{t('viewAll')} →</Text>
          </TouchableOpacity>
        </View>

        {/* ── Guest list card ── */}
        <View
          style={{
            backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#ebebeb',
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
            marginBottom: 16,
          }}
        >
          {recentGuests.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#6a6a6a', textAlign: 'center' }}>{t('noRecentCheckins')}</Text>
            </View>
          ) : (
            recentGuests.map((guest, index) => (
              <TouchableOpacity
                key={guest.id}
                activeOpacity={0.7}
                onPress={() => setSelectedGuest(guest)}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 16, paddingVertical: 14,
                  borderBottomWidth: index !== recentGuests.length - 1 ? 1 : 0,
                  borderBottomColor: '#ebebeb',
                }}
              >
                {/* Avatar + info */}
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                  <View style={{
                    width: 40, height: 40, borderRadius: 20, marginRight: 12,
                    backgroundColor: '#ffd1da', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#8a0030' }}>
                      {guest.full_name ? guest.full_name.charAt(0).toUpperCase() : '?'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#222222' }} numberOfLines={1}>{guest.full_name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      {guest.room_number ? (
                        <View style={{ backgroundColor: '#f2f2f2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#222222' }}>Room {guest.room_number}</Text>
                        </View>
                      ) : null}
                      <Text style={{ fontSize: 12.5, color: '#6a6a6a' }} numberOfLines={1}>ID: {guest.id_number || 'N/A'}</Text>
                    </View>
                  </View>
                </View>

                {/* Verified badge + chevron */}
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={{ backgroundColor: '#e5f6e6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#008a05' }}>Verified</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#6a6a6a' }}>View →</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* ── Guest Details Bottom Sheet ── */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!selectedGuest}
        onRequestClose={() => setSelectedGuest(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setSelectedGuest(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation?.()}
            style={{ backgroundColor: '#ffffff', borderRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: '88%' }}
          >
            {/* Handle bar */}
            <View style={{ width: 36, height: 4, borderRadius: 9999, backgroundColor: '#dddddd', alignSelf: 'center', marginTop: 10, marginBottom: 6 }} />

            {selectedGuest && (
              <View style={{ flex: 0 }}>
                {/* Sheet header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#ebebeb' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#ffd1da', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#8a0030' }}>
                        {selectedGuest.full_name ? selectedGuest.full_name.charAt(0).toUpperCase() : '?'}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: '#222222' }}>{selectedGuest.full_name}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#008a05' }}>Verified Registration</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedGuest(null)}
                    style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f2f2f2', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X size={18} color="#6a6a6a" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
                  {/* Selfie */}
                  {selectedGuest.selfie_uri ? (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#6a6a6a', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Guest Selfie</Text>
                      <Image source={{ uri: selectedGuest.selfie_uri }} style={{ width: '100%', height: 180, borderRadius: 12 }} resizeMode="cover" />
                    </View>
                  ) : null}

                  {/* ID Photos */}
                  {(selectedGuest.photo_uri || selectedGuest.back_photo_uri) ? (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#6a6a6a', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
                        ID Card Photos
                      </Text>
                      <View style={{ gap: 10 }}>
                        {selectedGuest.photo_uri ? (
                          <View style={{ backgroundColor: '#f7f7f7', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#ebebeb' }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#6a6a6a', marginBottom: 6 }}>Front Side</Text>
                            <Image source={{ uri: selectedGuest.photo_uri }} style={{ width: '100%', height: 160, borderRadius: 8 }} resizeMode="cover" />
                          </View>
                        ) : null}
                        {selectedGuest.back_photo_uri ? (
                          <View style={{ backgroundColor: '#f7f7f7', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#ebebeb' }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#6a6a6a', marginBottom: 6 }}>Back Side</Text>
                            <Image source={{ uri: selectedGuest.back_photo_uri }} style={{ width: '100%', height: 160, borderRadius: 8 }} resizeMode="cover" />
                          </View>
                        ) : null}
                      </View>
                    </View>
                  ) : null}

                  {/* Guest info rows */}
                  <View style={{ backgroundColor: '#f7f7f7', borderRadius: 14, borderWidth: 1, borderColor: '#ebebeb', overflow: 'hidden' }}>
                    {[
                      { label: 'Assigned Room', value: selectedGuest.room_number ? `Room ${selectedGuest.room_number} (${selectedGuest.room_type || 'Standard'})` : null, icon: <DoorOpen size={16} color="#6a6a6a" /> },
                      { label: `Document (${selectedGuest.id_type || 'ID'})`, value: selectedGuest.id_number || 'N/A', icon: <IdCard size={16} color="#6a6a6a" /> },
                      { label: 'Phone', value: selectedGuest.phone || 'N/A', icon: <Phone size={16} color="#6a6a6a" /> },
                      { label: 'Email', value: selectedGuest.email || 'N/A', icon: <Mail size={16} color="#6a6a6a" /> },
                      { label: 'Nationality / Gender', value: `${selectedGuest.nationality || 'Indian'} • ${selectedGuest.gender || 'N/A'}`, icon: <Globe size={16} color="#6a6a6a" /> },
                      { label: 'Address', value: [selectedGuest.address, selectedGuest.city, selectedGuest.state, selectedGuest.pin_code].filter(Boolean).join(', ') || 'N/A', icon: <MapPin size={16} color="#6a6a6a" /> },
                      { label: 'Checked In', value: selectedGuest.created_at ? new Date(selectedGuest.created_at).toLocaleString() : 'Recent', icon: <Calendar size={16} color="#6a6a6a" /> },
                    ].filter(r => r.value).map((row, i, arr) => (
                      <View
                        key={row.label}
                        style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: '#ebebeb' }}
                      >
                        {row.icon}
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, color: '#929292', fontWeight: '500', marginBottom: 2 }}>{row.label}</Text>
                          <Text style={{ fontSize: 13.5, color: '#222222', fontWeight: '500' }}>{row.value}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Manual Import Modal ── */}
      <Modal visible={isImportModalVisible} transparent animationType="slide">
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsImportModalVisible(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{ backgroundColor: '#ffffff', borderRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 24 }}
          >
            <View style={{ width: 36, height: 4, borderRadius: 9999, backgroundColor: '#dddddd', alignSelf: 'center', marginBottom: 16 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#222222' }}>Import Check-in</Text>
              <TouchableOpacity
                onPress={() => setIsImportModalVisible(false)}
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f2f2f2', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} color="#6a6a6a" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13.5, color: '#6a6a6a', marginBottom: 14 }}>
              Paste the check-in text or code received on WhatsApp from the guest.
            </Text>
            <Input
              label="Paste Check-in Code / WhatsApp Message *"
              placeholder="Paste WhatsApp message or #GUEST_IMPORT_DATA...# code here"
              value={importText}
              onChangeText={setImportText}
              multiline
              numberOfLines={5}
              style={{ minHeight: 110, textAlignVertical: 'top' } as any}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => setIsImportModalVisible(false)}
                style={{ flex: 1, height: 48, borderRadius: 8, borderWidth: 1, borderColor: '#dddddd', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 15, fontWeight: '500', color: '#222222' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={isImporting}
                onPress={handleExecuteImport}
                style={{ flex: 1, height: 48, borderRadius: 8, backgroundColor: '#ff385c', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: isImporting ? 0.5 : 1 }}
              >
                {isImporting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Download size={16} color="#ffffff" />
                    <Text style={{ fontSize: 15, fontWeight: '500', color: '#ffffff' }}>Save to App</Text>
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

