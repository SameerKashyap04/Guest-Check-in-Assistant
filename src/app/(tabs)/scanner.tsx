import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Modal, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import {
  Search, Shield, MapPin, Users, Edit3, Globe,
  Zap, ZapOff, SwitchCamera, Image as ImageIcon, Check,
  ChevronRight, Wifi, X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useRoomsStore } from '@/store/useRoomsStore';
import { createMultipleGuestsAndStay } from '@/database/stays';
import { OCRPipeline } from '@/features/checkin/camera/OCRPipeline';
import { AIRBNB } from '@/theme/airbnb';

// ─── Airbnb Check-in Screen for StayMate ──────────────────────────────────────
// Exact 1:1 port of renderScanner() & startReview() from staymate-airbnb-redesign/app.html
// ─────────────────────────────────────────────────────────────────────────────

type DocType = 'AUTO' | 'AADHAAR' | 'PAN' | 'VOTER' | 'DRIVING' | 'PASSPORT';

export default function CheckinScannerScreen() {
  const router = useRouter();
  const { propertyId } = useSettingsStore();
  const { rooms, fetchRooms } = useRoomsStore();

  const [selectedDoc, setSelectedDoc] = useState<DocType>('AUTO');
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);

  // Review Sheet State
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [fullName, setFullName] = useState('Rohan Sharma');
  const [idNumber, setIdNumber] = useState('5481 9283 0192');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('14/08/1994');
  const [address, setAddress] = useState('14 MG Road, Guwahati, Assam 781001');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const cameraRef = useRef<any>(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms]);

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;
    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) {
        setCapturedPhotoUri(photo.uri);
        const parsed = await OCRPipeline.processImage(photo.uri, selectedDoc);
        if (parsed) {
          if (parsed.fullName) setFullName(parsed.fullName);
          if (parsed.idNumber) setIdNumber(parsed.idNumber);
          if (parsed.dob) setDob(parsed.dob);
          if (parsed.gender) setGender(parsed.gender);
          if (parsed.address) setAddress(parsed.address);
        }
        setIsReviewOpen(true);
      }
    } catch (e) {
      console.error('Capture error', e);
      setIsReviewOpen(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        const uri = result.assets[0].uri;
        setCapturedPhotoUri(uri);
        const parsed = await OCRPipeline.processImage(uri, selectedDoc);
        if (parsed) {
          if (parsed.fullName) setFullName(parsed.fullName);
          if (parsed.idNumber) setIdNumber(parsed.idNumber);
          if (parsed.dob) setDob(parsed.dob);
          if (parsed.gender) setGender(parsed.gender);
          if (parsed.address) setAddress(parsed.address);
        }
        setIsReviewOpen(true);
      }
    } catch (e) {
      console.error('Gallery pick error', e);
    }
  };

  const handleConfirmCheckin = async () => {
    if (!fullName.trim()) {
      Alert.alert('Missing Name', 'Please enter the guest full name.');
      return;
    }
    if (!selectedRoomId) {
      Alert.alert('Missing Room', 'Please select a room for check-in.');
      return;
    }

    try {
      setIsSaving(true);
      const todayStr = new Date().toISOString().split('T')[0];
      const activePropertyId = propertyId || 'HS-DEFAULT';

      await createMultipleGuestsAndStay(
        [{
          full_name: fullName.trim(),
          id_number: idNumber.trim() || 'N/A',
          address: address.trim(),
          phone: phone.trim(),
          photo_uri: capturedPhotoUri || '',
          back_photo_uri: '',
          selfie_uri: '',
          property_id: activePropertyId,
          id_type: selectedDoc === 'AADHAAR' ? 'Aadhaar' : selectedDoc === 'PAN' ? 'PAN Card' : selectedDoc === 'PASSPORT' ? 'Passport' : selectedDoc === 'VOTER' ? 'Voter ID' : selectedDoc === 'DRIVING' ? 'Driving Licence' : 'Aadhaar',
          dob: dob.trim(),
          gender: gender || 'Male',
          pin_code: '',
        }],
        {
          room_id: selectedRoomId,
          check_in_date: todayStr,
          check_out_date: todayStr,
        }
      );

      setIsReviewOpen(false);
      Alert.alert('Check-in Complete!', `${fullName} has been checked in successfully.`, [
        { text: 'View Dashboard', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (e: any) {
      Alert.alert('Check-in Error', e?.message || 'Failed to complete check-in.');
    } finally {
      setIsSaving(false);
    }
  };

  const docTypes = [
    { id: 'AUTO' as DocType, label: 'Auto-\ndetect', icon: Search },
    { id: 'AADHAAR' as DocType, label: 'Aadhaar', icon: Shield },
    { id: 'PAN' as DocType, label: 'PAN Card', icon: MapPin },
    { id: 'VOTER' as DocType, label: 'Voter ID', icon: Users },
    { id: 'DRIVING' as DocType, label: 'Driving\nLicence', icon: Edit3 },
    { id: 'PASSPORT' as DocType, label: 'Passport', icon: Globe },
  ];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Screen Header ── */}
        <View style={styles.header}>
          <Text style={styles.title}>Check-in</Text>
          <Text style={styles.subtitle}>
            Scan an ID to auto-fill guest details, or enter manually
          </Text>
        </View>

        {/* ── Document Type Grid (3x2 as in Screenshot 3) ── */}
        <Text style={styles.sectionLabel}>DOCUMENT TYPE</Text>
        <View style={styles.docTypeGrid}>
          {docTypes.map(doc => {
            const active = selectedDoc === doc.id;
            const Icon = doc.icon;
            return (
              <TouchableOpacity
                key={doc.id}
                style={[
                  styles.docTypeCard,
                  active && styles.docTypeCardActive,
                ]}
                activeOpacity={0.8}
                onPress={() => setSelectedDoc(doc.id)}
              >
                <Icon
                  size={20}
                  color={active ? AIRBNB.colors.ink : AIRBNB.colors.muted}
                />
                <Text
                  style={[styles.docTypeLabel, active && styles.docTypeLabelActive]}
                  numberOfLines={2}
                >
                  {doc.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Scan Document Viewfinder ── */}
        <Text style={styles.sectionLabel}>SCAN DOCUMENT</Text>
        <View style={styles.viewfinder}>
          {permission?.granted ? (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={facing}
              enableTorch={flash === 'on'}
            />
          ) : (
            <TouchableOpacity
              style={styles.permissionReq}
              onPress={requestPermission}
              activeOpacity={0.8}
            >
              <Text style={styles.permissionText}>Tap to grant Camera access</Text>
            </TouchableOpacity>
          )}

          {/* Dashed Frame Guide */}
          <View style={styles.frameGuide} />

          {/* 4 White Corner Brackets */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {/* Center Guide Label */}
          <View style={styles.centerGuide}>
            <Text style={styles.centerGuideText}>
              Align the document within the frame
            </Text>
          </View>

          {/* Top Camera Controls */}
          <View style={styles.camTop}>
            <TouchableOpacity
              style={styles.camIconBtn}
              activeOpacity={0.7}
              onPress={() => setFlash(flash === 'on' ? 'off' : 'on')}
            >
              {flash === 'on' ? <Zap size={18} color="#ffffff" /> : <ZapOff size={18} color="#ffffff" />}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.camIconBtn}
              activeOpacity={0.7}
              onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
            >
              <SwitchCamera size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Bottom Camera Controls */}
          <View style={styles.camControls}>
            <TouchableOpacity
              style={styles.camIconBtn}
              activeOpacity={0.7}
              onPress={handlePickGallery}
            >
              <ImageIcon size={18} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shutter}
              activeOpacity={0.8}
              onPress={handleCapture}
            />
            <View style={{ width: 42 }} />
          </View>
        </View>

        {/* ── OR Divider ── */}
        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.orLine} />
        </View>

        {/* ── Enter Details Manually Button ── */}
        <Button
          label="Enter details manually"
          variant="secondary"
          icon={<Edit3 size={17} color={AIRBNB.colors.ink} />}
          onPress={() => {
            setCapturedPhotoUri(null);
            setIsReviewOpen(true);
          }}
        />

        {/* ── Web Self Check-ins Card ── */}
        <TouchableOpacity
          style={styles.webCheckinCard}
          activeOpacity={0.8}
          onPress={() => router.push('/registrations')}
        >
          <View style={styles.webIconWell}>
            <Wifi size={17} color={AIRBNB.colors.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.webTitle}>Web self check-ins</Text>
            <Text style={styles.webSubtitle}>2 pending your approval</Text>
          </View>
          <ChevronRight size={18} color={AIRBNB.colors.mutedSoft} />
        </TouchableOpacity>
      </ScrollView>

      {/* ══════════════════════════════════════════════════
          CONFIRM & CHECK IN MODAL SHEET (app.html port)
      ══════════════════════════════════════════════════ */}
      <Modal visible={isReviewOpen} transparent animationType="slide">
        <TouchableOpacity
          style={styles.scrim}
          activeOpacity={1}
          onPress={() => setIsReviewOpen(false)}
        >
          <TouchableOpacity
            style={styles.sheet}
            activeOpacity={1}
            onPress={e => e.stopPropagation?.()}
          >
            <View style={styles.sheetHandle} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Header */}
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>Confirm guest details</Text>
                  <Text style={styles.sheetSubtitle}>Extracted from {selectedDoc}</Text>
                </View>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => setIsReviewOpen(false)}
                >
                  <X size={16} color={AIRBNB.colors.ink} />
                </TouchableOpacity>
              </View>

              {/* Form Fields */}
              <View style={styles.formWrap}>
                <Input
                  label="Full Name"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="e.g. Rohan Sharma"
                />
                <Input
                  label="ID Number"
                  value={idNumber}
                  onChangeText={setIdNumber}
                  placeholder="e.g. 5481 9283 0192"
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Gender"
                      value={gender}
                      onChangeText={setGender}
                      placeholder="Male / Female"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Date of Birth"
                      value={dob}
                      onChangeText={setDob}
                      placeholder="DD/MM/YYYY"
                    />
                  </View>
                </View>
                <Input
                  label="Phone Number"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91 98765 43210"
                />
                <Input
                  label="Address"
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Street, City, State, PIN"
                />

                {/* Room Selector */}
                <Text style={[styles.sectionLabel, { marginTop: 6, marginBottom: 8 }]}>
                  ASSIGN ROOM
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {rooms.map(r => {
                      const active = selectedRoomId === r.id;
                      return (
                        <TouchableOpacity
                          key={r.id}
                          style={[styles.roomChip, active && styles.roomChipActive]}
                          activeOpacity={0.8}
                          onPress={() => setSelectedRoomId(r.id)}
                        >
                          <Text style={[styles.roomChipText, active && styles.roomChipTextActive]}>
                            Room {r.room_number} ({r.room_type || 'Standard'})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* Action Buttons */}
              <Button
                label="Confirm &amp; Check In"
                variant="primary"
                isLoading={isSaving}
                icon={<Check size={18} color="#ffffff" strokeWidth={2.5} />}
                onPress={handleConfirmCheckin}
              />
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AIRBNB.colors.canvas,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 110,
  },
  header: {
    paddingTop: 18,
  },
  title: {
    ...AIRBNB.typography.displayLg,
    color: AIRBNB.colors.ink,
  },
  subtitle: {
    ...AIRBNB.typography.bodySm,
    color: AIRBNB.colors.muted,
    marginTop: 4,
  },
  sectionLabel: {
    ...AIRBNB.typography.caption,
    color: AIRBNB.colors.muted,
    marginTop: 20,
    marginBottom: 8,
  },

  // Document Type Grid (3x2)
  docTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  docTypeCard: {
    width: '31.5%',
    borderWidth: 1.5,
    borderColor: AIRBNB.colors.hairline,
    borderRadius: AIRBNB.radius.md,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: AIRBNB.colors.canvas,
    minHeight: 74,
  },
  docTypeCardActive: {
    borderColor: AIRBNB.colors.ink,
    backgroundColor: AIRBNB.colors.surfaceSoft,
  },
  docTypeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: AIRBNB.colors.ink,
    textAlign: 'center',
    lineHeight: 15,
  },
  docTypeLabelActive: {
    fontWeight: '700',
  },

  // Viewfinder
  viewfinder: {
    aspectRatio: 3 / 4,
    borderRadius: AIRBNB.radius.lg,
    backgroundColor: '#20242b',
    position: 'relative',
    overflow: 'hidden',
  },
  permissionReq: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  permissionText: {
    ...AIRBNB.typography.bodySm,
    color: '#ffffff',
    textAlign: 'center',
  },
  frameGuide: {
    position: 'absolute',
    top: '14%',
    bottom: '14%',
    left: '14%',
    right: '14%',
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: '#ffffff',
  },
  cornerTL: {
    top: '12%',
    left: '12%',
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: '12%',
    right: '12%',
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: '12%',
    left: '12%',
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: '12%',
    right: '12%',
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  centerGuide: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    transform: [{ translateY: -10 }],
    alignItems: 'center',
  },
  centerGuideText: {
    ...AIRBNB.typography.caption,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  camTop: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  camControls: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  camIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },

  // OR Divider
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 18,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: AIRBNB.colors.hairlineSoft,
  },
  orText: {
    ...AIRBNB.typography.caption,
    color: AIRBNB.colors.muted,
  },

  // Web Check-in Card
  webCheckinCard: {
    backgroundColor: AIRBNB.colors.canvas,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairlineSoft,
    borderRadius: AIRBNB.radius.md,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    ...AIRBNB.shadow.card,
  },
  webIconWell: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: AIRBNB.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webTitle: {
    ...AIRBNB.typography.titleSm,
    color: AIRBNB.colors.ink,
  },
  webSubtitle: {
    ...AIRBNB.typography.bodySm,
    color: AIRBNB.colors.muted,
  },

  // Sheet
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: AIRBNB.colors.canvas,
    borderTopLeftRadius: AIRBNB.radius.sheet,
    borderTopRightRadius: AIRBNB.radius.sheet,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 28,
    maxHeight: '86%',
    ...AIRBNB.shadow.sheet,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: AIRBNB.radius.full,
    backgroundColor: AIRBNB.colors.hairline,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    ...AIRBNB.typography.titleMd,
    color: AIRBNB.colors.ink,
  },
  sheetSubtitle: {
    ...AIRBNB.typography.bodySm,
    color: AIRBNB.colors.muted,
    marginTop: 2,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AIRBNB.colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formWrap: {
    gap: 12,
  },
  roomChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: AIRBNB.radius.full,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairline,
    backgroundColor: AIRBNB.colors.canvas,
  },
  roomChipActive: {
    backgroundColor: AIRBNB.colors.ink,
    borderColor: AIRBNB.colors.ink,
  },
  roomChipText: {
    ...AIRBNB.typography.caption,
    color: AIRBNB.colors.ink,
  },
  roomChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
