import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { C, R } from '@/theme/tokens';
import { Icon, IconName } from '@/components/v3/Icon';
import { SecondaryButton, PrimaryButton } from '@/components/v3/Ui';
import { OCRPipeline } from '@/features/checkin/camera/OCRPipeline';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useRoomsStore } from '@/store/useRoomsStore';
import {
  subscribeToPropertyCheckins,
  deleteCloudCheckinDoc,
  CloudGuestCheckin,
} from '@/services/firebaseSync';
import { createMultipleGuestsAndStay } from '@/database/stays';
import { useSubscriptionStore } from '@/store/useSubscriptionStore';
import { canUseFeature } from '@/services/entitlementService';
import { useTranslation } from 'react-i18next';
import { SelfCheckinQrModal } from '@/components/v3/SelfCheckinQrModal';

type DocId = 'UNKNOWN' | 'AADHAAR' | 'PAN' | 'VOTER_ID' | 'DRIVING_LICENCE' | 'PASSPORT';

interface DocTypeItem {
  id: DocId;
  label: string;
  icon: IconName;
}

const DOC_TYPES: DocTypeItem[] = [
  { id: 'UNKNOWN', label: 'Auto-detect', icon: 'search' },
  { id: 'AADHAAR', label: 'Aadhaar', icon: 'aadhaar' },
  { id: 'PAN', label: 'PAN Card', icon: 'pan' },
  { id: 'VOTER_ID', label: 'Voter ID', icon: 'voter' },
  { id: 'DRIVING_LICENCE', label: 'Driving Licence', icon: 'dl' },
  { id: 'PASSPORT', label: 'Passport', icon: 'passport' },
];

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const { propertyId, ownerId } = useSettingsStore();
  const { rooms, fetchRooms } = useRoomsStore();

  const [selectedDoc, setSelectedDoc] = useState<DocId>('UNKNOWN');
  const [isScanning, setIsScanning] = useState(false);

  // Web Self Check-in Portal State
  const [pendingCheckins, setPendingCheckins] = useState<CloudGuestCheckin[]>([]);
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedCheckinDetail, setSelectedCheckinDetail] = useState<CloudGuestCheckin | null>(null);
  const [isApprovingId, setIsApprovingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  // Real-time listener for incoming Web Self Check-ins
  useEffect(() => {
    if (!propertyId) return;
    const unsub = subscribeToPropertyCheckins(
      propertyId,
      (newCheckin) => {
        setPendingCheckins((prev) => {
          if (prev.some((item) => item.id === newCheckin.id)) return prev;
          return [newCheckin, ...prev];
        });
      },
      ownerId,
      false
    );
    return () => unsub();
  }, [propertyId, ownerId]);

  const startCameraScan = () => {
    if (!canUseFeature('ocrScanning')) {
      Alert.alert(
        'OCR Scanning — Professional Feature',
        'Automatic ID scanning with OCR is available on the Professional plan. You can still use Manual Entry or Upload ID Image.',
        [
          { text: 'OK', style: 'cancel' },
          {
            text: 'View Plans',
            onPress: () => router.push('/subscription/pricing'),
          },
        ]
      );
      return;
    }
    useSubscriptionStore.getState().incrementOcrScan();
    router.push({
      pathname: '/checkin/camera',
      params: { idType: selectedDoc },
    });
  };

  const handleUploadID = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Permission to access photo gallery is required to upload ID images.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const imageUri = result.assets[0].uri;
      setIsScanning(true);

      const blocks = await OCRPipeline.analyzeFrame(imageUri);
      const initialProfile = {
        fullName: { value: '', confidence: 0 },
        idNumber: { value: '', confidence: 0 },
        address: { value: '', confidence: 0 },
        dob: { value: '', confidence: 0 },
        gender: { value: '', confidence: 0 },
        pinCode: { value: '', confidence: 0 },
        idType: selectedDoc as any,
        isBackScanned: false,
        photoUri: imageUri,
      };

      const profile = OCRPipeline.processBlocks(
        blocks,
        initialProfile,
        selectedDoc as any
      );
      setIsScanning(false);

      router.push({
        pathname: '/checkin/review',
        params: {
          guestProfile: JSON.stringify(profile),
          photoUri: imageUri,
          extractedName: profile.fullName?.value || '',
          extractedDocType: profile.idType || selectedDoc,
          extractedIdNumber: profile.idNumber?.value || '',
          extractedAddress: profile.address?.value || '',
          extractedDob: profile.dob?.value || '',
        },
      });
    } catch (error) {
      console.error('Upload & Scan error:', error);
      setIsScanning(false);
      Alert.alert(
        'Scan Failed',
        'Could not extract text from the selected image. Please try another image or use manual entry.'
      );
    }
  };

  const handleApproveCheckin = async (checkin: CloudGuestCheckin) => {
    try {
      setIsApprovingId(checkin.id || 'current');

      let roomId = rooms.length > 0 ? rooms[0].id : 1;
      const matchedRoom = rooms.find(
        (r) => r.room_number === checkin.room_number
      );
      if (matchedRoom) roomId = matchedRoom.id;

      const allGuestsToImport = [
        {
          full_name: checkin.full_name,
          id_number: checkin.id_number || 'N/A',
          address: checkin.address || '',
          phone: checkin.phone || '',
          photo_uri: checkin.photo_uri || '',
          back_photo_uri: checkin.back_photo_uri || '',
          selfie_uri: checkin.selfie_uri || '',
          property_id: checkin.property_id || propertyId || 'HS-DEFAULT',
          id_type: checkin.id_type || 'Aadhaar',
          dob: checkin.dob || '',
          gender: checkin.gender || 'Other',
          pin_code: checkin.pin_code || '',
        },
        ...(checkin.additional_guests || []).map((g: any) => ({
          full_name: g.fullName || 'Additional Guest',
          id_number: g.idNumber || 'N/A',
          address: checkin.address || '',
          phone: g.phone || checkin.phone || '',
          photo_uri: g.frontPhotoUri || '',
          back_photo_uri: g.backPhotoUri || '',
          selfie_uri: g.selfiePhotoUri || '',
          property_id: checkin.property_id || propertyId || 'HS-DEFAULT',
          id_type: g.idType || 'Aadhaar',
          dob: g.dob || '',
          gender: g.gender || 'Other',
          pin_code: checkin.pin_code || '',
        })),
      ];

      const todayStr = new Date().toISOString().split('T')[0];

      await createMultipleGuestsAndStay(allGuestsToImport, {
        room_id: roomId,
        check_in_date: checkin.check_in_date || todayStr,
        check_out_date:
          checkin.check_out_date || checkin.check_in_date || todayStr,
      });

      if (checkin.id) {
        await deleteCloudCheckinDoc(checkin.id);
      }

      useSubscriptionStore.getState().incrementCheckIn();
      setPendingCheckins((prev) =>
        prev.filter((item) => item.id !== checkin.id)
      );
      if (selectedCheckinDetail?.id === checkin.id) {
        setSelectedCheckinDetail(null);
      }

      await fetchRooms();

      Alert.alert(
        'Self Check-in Approved! 🎉',
        `Guest ${checkin.full_name} assigned to Room ${checkin.room_number} has been registered.`
      );
    } catch (e: any) {
      console.error('Approval failed', e);
      Alert.alert('Approval Failed', e?.message || 'Could not approve self check-in.');
    } finally {
      setIsApprovingId(null);
    }
  };

  const handleRejectCheckin = (checkin: CloudGuestCheckin) => {
    Alert.alert(
      'Reject & Remove Check-in?',
      `Are you sure you want to discard the online check-in request from ${checkin.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject & Remove',
          style: 'destructive',
          onPress: async () => {
            if (checkin.id) {
              await deleteCloudCheckinDoc(checkin.id);
            }
            setPendingCheckins((prev) =>
              prev.filter((item) => item.id !== checkin.id)
            );
            if (selectedCheckinDetail?.id === checkin.id) {
              setSelectedCheckinDetail(null);
            }
          },
        },
      ]
    );
  };

  const renderDocCard = (t: DocTypeItem) => {
    const active = selectedDoc === t.id;
    return (
      <TouchableOpacity
        key={t.id}
        activeOpacity={0.75}
        onPress={() => setSelectedDoc(t.id)}
        style={[s.docCard, active && s.docCardActive]}
      >
        <Icon
          name={t.icon}
          size={21}
          color={active ? C.ink : '#6a6a6a'}
          strokeWidth={1.8}
        />
        <Text style={[s.docLabel, active && s.docLabelActive]} numberOfLines={2}>
          {t.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Page header */}
        <View style={s.headerSection}>
          <Text style={s.h1}>Check-in</Text>
          <Text style={s.sub}>
            Scan an ID to auto-fill guest details, or enter manually
          </Text>
        </View>

        {/* DOCUMENT TYPE section header */}
        <Text style={s.sectionLabel}>DOCUMENT TYPE</Text>

        {/* Document Type Cards — 2 rows of 3 equal columns */}
        <View style={s.docGridContainer}>
          <View style={s.docRow}>{DOC_TYPES.slice(0, 3).map(renderDocCard)}</View>
          <View style={[s.docRow, { marginTop: 8 }]}>
            {DOC_TYPES.slice(3, 6).map(renderDocCard)}
          </View>
        </View>

        {/* SCAN DOCUMENT label */}
        <Text style={[s.sectionLabel, { marginTop: 22 }]}>SCAN DOCUMENT</Text>

        {/* Viewfinder */}
        <View style={s.viewfinder}>
          {/* Dashed frame */}
          <View style={s.dashedFrame} />
          {/* Corner brackets */}
          <View
            style={[
              s.corner,
              { top: '12%', left: '12%', borderRightWidth: 0, borderBottomWidth: 0 },
            ]}
          />
          <View
            style={[
              s.corner,
              { top: '12%', right: '12%', borderLeftWidth: 0, borderBottomWidth: 0 },
            ]}
          />
          <View
            style={[
              s.corner,
              { bottom: '18%', left: '12%', borderRightWidth: 0, borderTopWidth: 0 },
            ]}
          />
          <View
            style={[
              s.corner,
              { bottom: '18%', right: '12%', borderLeftWidth: 0, borderTopWidth: 0 },
            ]}
          />

          {/* Top controls */}
          <View style={s.camTop}>
            <TouchableOpacity onPress={startCameraScan} style={s.camBtn}>
              <Icon name="flashOff" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={startCameraScan} style={s.camBtn}>
              <Icon name="flip" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Align hint */}
          <Text style={s.alignHint}>Align the document within the frame</Text>

          {/* Bottom controls */}
          <View style={s.camBottom}>
            <TouchableOpacity onPress={handleUploadID} style={s.camBtn}>
              {isScanning ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="image" size={18} color="#fff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={startCameraScan} style={s.shutter} />
            <View style={{ width: 42 }} />
          </View>
        </View>

        {/* OR divider */}
        <View style={s.orRow}>
          <View style={s.orLine} />
          <Text style={s.orText}>OR</Text>
          <View style={s.orLine} />
        </View>

        <SecondaryButton
          label="Enter details manually"
          icon="edit"
          onPress={() => router.push('/checkin/manual')}
        />

        {/* Web self check-ins card */}
        <TouchableOpacity
          style={s.webCard}
          activeOpacity={0.8}
          onPress={() => setIsPortalModalOpen(true)}
        >
          <View style={s.webCardRow}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                flex: 1,
                minWidth: 0,
              }}
            >
              <View style={s.webIcon}>
                <Icon name="qr" size={17} color={C.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.webTitle}>Web self check-ins</Text>
                <Text style={s.webSub}>
                  {pendingCheckins.length} pending · share QR or link with guests
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="share" size={16} color={C.muted} />
              <Icon name="chevronRight" size={18} color={C.muted} />
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Web Self Check-in Portal Modal */}
      <Modal
        visible={isPortalModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsPortalModalOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsPortalModalOpen(false)}
          style={s.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation?.()}
            style={s.sheetContent}
          >
            <View style={s.sheetHeader}>
              <View>
                <Text style={s.sheetTitle}>Web Self Check-ins</Text>
                <Text style={s.sheetSub}>
                  {pendingCheckins.length} guest submissions waiting for review
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsPortalModalOpen(false)}
                style={s.sheetClose}
              >
                <Icon name="x" size={18} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {pendingCheckins.length === 0 ? (
                <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                  <Icon name="qr" size={32} color={C.mutedSoft} />
                  <Text
                    style={{
                      fontFamily: 'Inter',
                      fontSize: 15,
                      fontWeight: '600',
                      color: '#222222',
                      marginTop: 8,
                    }}
                  >
                    No pending self check-ins
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Inter',
                      fontSize: 13,
                      color: '#6a6a6a',
                      marginTop: 2,
                    }}
                  >
                    Share your check-in link with arriving guests
                  </Text>
                </View>
              ) : (
                pendingCheckins.map((checkin) => (
                  <View key={checkin.id} style={s.pendingCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.pendingName}>{checkin.full_name}</Text>
                      <Text style={s.pendingMeta}>
                        Room {checkin.room_number || 'N/A'} ·{' '}
                        {checkin.phone || 'No phone'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => handleRejectCheckin(checkin)}
                        style={s.rejectBtn}
                      >
                        <Text style={s.rejectBtnText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleApproveCheckin(checkin)}
                        style={s.approveBtn}
                      >
                        {isApprovingId === checkin.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={s.approveBtnText}>Approve</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setIsPortalModalOpen(false);
                  setTimeout(() => setIsQrModalOpen(true), 250);
                }}
                style={s.qrStandeeActionBtn}
              >
                <Icon name="qr" size={18} color={C.primary} />
                <Text style={s.qrStandeeActionText}>
                  Show Reception QR & Print Standee
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Self Check-in & QR Generator Modal */}
      <SelfCheckinQrModal
        visible={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 130,
  },
  headerSection: {
    paddingTop: 12,
  },
  h1: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: '#222222',
    lineHeight: 27,
  },
  sub: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    color: '#6a6a6a',
    marginTop: 4,
    lineHeight: 19,
  },
  sectionLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#6a6a6a',
    marginTop: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  docGridContainer: {
    width: '100%',
  },
  docRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  docCard: {
    flex: 1,
    height: 84,
    minHeight: 84,
    borderWidth: 1.5,
    borderColor: '#dddddd',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
  },
  docCardActive: {
    borderColor: '#222222',
    backgroundColor: '#F8F7FB',
  },
  docLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '500',
    color: '#6a6a6a',
    textAlign: 'center',
    lineHeight: 15,
  },
  docLabelActive: {
    color: '#222222',
    fontWeight: '700',
  },
  viewfinder: {
    aspectRatio: 3 / 4,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#2D3239',
    position: 'relative',
  },
  dashedFrame: {
    position: 'absolute',
    top: '12%',
    left: '12%',
    right: '12%',
    bottom: '18%',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 14,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  camTop: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  camBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alignHint: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
  },
  camBottom: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  shutter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    marginBottom: 14,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ebebeb',
  },
  orText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '500',
    color: '#6a6a6a',
  },
  webCard: {
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ebebeb',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  webCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  webIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '500',
    color: '#222222',
  },
  webSub: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    color: '#6a6a6a',
    marginTop: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
  },
  sheetSub: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#6a6a6a',
    marginTop: 2,
  },
  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingCard: {
    backgroundColor: '#FAF8FD',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pendingName: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#222222',
  },
  pendingMeta: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#6a6a6a',
    marginTop: 2,
  },
  rejectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: R.full,
    backgroundColor: '#FFF1F0',
    borderWidth: 1,
    borderColor: C.rose,
  },
  rejectBtnText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: C.rose,
  },
  approveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: R.full,
    backgroundColor: C.primary,
  },
  approveBtnText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  qrStandeeActionBtn: {
    marginTop: 14,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  qrStandeeActionText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '700',
    color: C.primary,
  },
});
