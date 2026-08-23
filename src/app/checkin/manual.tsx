import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { C, R, shadow } from '@/theme/tokens';
import { Icon, IconName } from '@/components/v3/Icon';
import { Field, PrimaryButton, SecondaryButton } from '@/components/v3/Ui';
import { RoomCard } from '@/components/v3/RoomCard';
import { useRoomsStore } from '@/store/useRoomsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSubscriptionStore } from '@/store/useSubscriptionStore';
import { createMultipleGuestsAndStay } from '@/database/stays';
import { OCRPipeline } from '@/features/checkin/camera/OCRPipeline';
import { compressImage } from '@/utils/imageCompressor';

const DOC_TYPES = ['Aadhaar', 'PAN', 'Voter ID', 'Driving Licence', 'Passport'];

export default function ManualEntryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { propertyId } = useSettingsStore();
  const { rooms, fetchRooms } = useRoomsStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Guest Details
  const [name, setName] = useState('');
  const [docType, setDocType] = useState('Aadhaar');
  const [idNum, setIdNum] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [backPhotoUri, setBackPhotoUri] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Step 2: Stay Details
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [checkinDate, setCheckinDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [checkoutDate, setCheckoutDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [guestCount, setGuestCount] = useState(1);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId) {
      const firstAvailable = rooms.find((r) => r.status === 'available');
      setSelectedRoomId(firstAvailable ? firstAvailable.id : rooms[0].id);
    }
  }, [rooms]);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  const handlePickPhoto = async (side: 'front' | 'back', useCamera = false) => {
    try {
      if (Platform.OS !== 'web') {
        const permission = useCamera
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            'Permission Required',
            `Access is needed to capture or upload ${side === 'front' ? 'Front' : 'Back'} ID card photo.`
          );
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.9,
        allowsEditing: false,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const compressed = await compressImage(result.assets[0].uri, {
        maxWidth: 1000,
        maxHeight: 1000,
        quality: 0.55,
      });
      const imageUri = compressed.uri || result.assets[0].uri;
      if (side === 'front') {
        setPhotoUri(imageUri);
      } else {
        setBackPhotoUri(imageUri);
      }
      setIsScanning(true);

      const blocks = await OCRPipeline.analyzeFrame(imageUri);
      const initialProfile = {
        fullName: { value: name, confidence: 0 },
        idNumber: { value: idNum, confidence: 0 },
        address: { value: address, confidence: 0 },
        dob: { value: dob, confidence: 0 },
        gender: { value: gender, confidence: 0 },
        pinCode: { value: '', confidence: 0 },
        idType: 'UNKNOWN' as const,
        isBackScanned: side === 'back',
        photoUri: side === 'front' ? imageUri : (photoUri || ''),
        backPhotoUri: side === 'back' ? imageUri : (backPhotoUri || ''),
      };

      const profile = OCRPipeline.processBlocks(
        blocks,
        initialProfile,
        'UNKNOWN'
      );
      setIsScanning(false);

      if (profile.fullName?.value && !name) setName(profile.fullName.value);
      if (profile.idNumber?.value && !idNum) setIdNum(profile.idNumber.value);
      if (profile.address?.value) setAddress(profile.address.value);
      if (profile.dob?.value && !dob) setDob(profile.dob.value);
      if (profile.gender?.value && !gender) setGender(profile.gender.value);
      if (profile.idType && profile.idType !== 'UNKNOWN') {
        const match = DOC_TYPES.find(
          (d) => d.toLowerCase().replace(/\s/g, '') === profile.idType.toLowerCase()
        );
        if (match) setDocType(match);
      }

      Alert.alert(
        'Auto-filled from ID',
        `${side === 'front' ? 'Front' : 'Back'} ID details have been scanned and updated.`
      );
    } catch (e) {
      console.error(e);
      setIsScanning(false);
      Alert.alert('Scan Notice', 'Photo attached. Please verify or fill in the details.');
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim()) {
        Alert.alert('Required', 'Please enter guest full name');
        return;
      }
      if (!idNum.trim()) {
        Alert.alert('Required', 'Please enter document ID number');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!selectedRoomId) {
        Alert.alert('Required', 'Please select a room for this stay');
        return;
      }
      setStep(3);
    }
  };

  const handleFinalConfirm = async () => {
    try {
      setIsSubmitting(true);

      const guestData = {
        full_name: name.trim(),
        id_number: idNum.trim(),
        address: address.trim(),
        phone: phone.trim(),
        photo_uri: photoUri || '',
        back_photo_uri: backPhotoUri || '',
        selfie_uri: '',
        property_id: propertyId || 'HS-DEFAULT',
        id_type: docType,
        dob: dob.trim(),
        gender: gender || 'Other',
        pin_code: '',
      };

      await createMultipleGuestsAndStay([guestData], {
        room_id: selectedRoomId || 1,
        check_in_date: checkinDate,
        check_out_date: checkoutDate,
      });

      useSubscriptionStore.getState().incrementCheckIn();
      await fetchRooms();

      Alert.alert(
        'Check-in Confirmed',
        `Guest ${name} has been assigned to Room ${selectedRoom?.room_number || ''}.`,
        [
          {
            text: 'View Dashboard',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (e: any) {
      console.error('Check-in creation error', e);
      Alert.alert('Check-in Failed', e?.message || 'Could not save check-in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles: [string, string, string] = [
    'Guest Details',
    'Stay Details',
    'Review & Confirm',
  ];

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Top Header */}
        <View style={s.header}>
          <TouchableOpacity
            onPress={step > 1 ? () => setStep((step - 1) as 1 | 2 | 3) : () => router.back()}
            activeOpacity={0.8}
            style={s.backBtn}
          >
            <Icon name="chevronLeft" size={19} color={C.ink} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{stepTitles[step - 1]}</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Stepper */}
        <View style={s.stepper}>
          {([1, 2, 3] as const).map((n, i) => (
            <React.Fragment key={n}>
              <View style={s.stepItem}>
                <View
                  style={[
                    s.stepDot,
                    step === n && s.stepDotActive,
                    step > n && s.stepDotDone,
                  ]}
                >
                  {step > n ? (
                    <Icon name="check" size={13} color={C.primary} />
                  ) : (
                    <Text
                      style={[
                        s.stepDotText,
                        step === n && s.stepDotTextActive,
                        step > n && s.stepDotTextDone,
                      ]}
                    >
                      {n}
                    </Text>
                  )}
                </View>
                <Text
                  style={[s.stepLabel, step === n && s.stepLabelActive]}
                  numberOfLines={1}
                >
                  {['Guest', 'Stay', 'Confirm'][i]}
                </Text>
              </View>
              {i < 2 && (
                <View
                  style={[s.stepLine, step > i + 1 && s.stepLineActive]}
                />
              )}
            </React.Fragment>
          ))}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: Math.max(40, insets.bottom + 20),
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* STEP 1: Guest Details */}
          {step === 1 && (
            <View>
              {/* ID Card Photos (Front & Back) */}
              <Text style={s.sectionHeader}>ID CARD PHOTOS (FRONT & BACK)</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
                {/* Front Photo Card */}
                <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                    Front Side ID
                  </Text>
                  {photoUri ? (
                    <View style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', height: 90 }}>
                      <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      <TouchableOpacity
                        onPress={() => setPhotoUri(null)}
                        style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(220,38,38,0.9)', padding: 4, borderRadius: 12 }}
                      >
                        <Icon name="x" size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ gap: 6 }}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handlePickPhoto('front', true)}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#EDE9FE', paddingVertical: 8, borderRadius: 8 }}
                      >
                        <Icon name="camera" size={14} color="#7C3AED" />
                        <Text style={{ fontFamily: 'Inter', fontSize: 11.5, fontWeight: '700', color: '#7C3AED' }}>Camera</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handlePickPhoto('front', false)}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', paddingVertical: 7, borderRadius: 8 }}
                      >
                        <Icon name="upload" size={14} color="#475569" />
                        <Text style={{ fontFamily: 'Inter', fontSize: 11.5, fontWeight: '600', color: '#475569' }}>Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Back Photo Card */}
                <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                    Back Side ID
                  </Text>
                  {backPhotoUri ? (
                    <View style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', height: 90 }}>
                      <Image source={{ uri: backPhotoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      <TouchableOpacity
                        onPress={() => setBackPhotoUri(null)}
                        style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(220,38,38,0.9)', padding: 4, borderRadius: 12 }}
                      >
                        <Icon name="x" size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ gap: 6 }}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handlePickPhoto('back', true)}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#EDE9FE', paddingVertical: 8, borderRadius: 8 }}
                      >
                        <Icon name="camera" size={14} color="#7C3AED" />
                        <Text style={{ fontFamily: 'Inter', fontSize: 11.5, fontWeight: '700', color: '#7C3AED' }}>Camera</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handlePickPhoto('back', false)}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', paddingVertical: 7, borderRadius: 8 }}
                      >
                        <Icon name="upload" size={14} color="#475569" />
                        <Text style={{ fontFamily: 'Inter', fontSize: 11.5, fontWeight: '600', color: '#475569' }}>Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              <Field
                label="Full Name *"
                value={name}
                onChangeText={setName}
                placeholder="e.g. Rohan Sharma"
              />

            {/* Document Type Chips */}
            <Text style={s.sectionHeader}>DOCUMENT TYPE</Text>
            <View style={s.docTypesRow}>
              {DOC_TYPES.map((dt) => (
                <TouchableOpacity
                  key={dt}
                  activeOpacity={0.75}
                  onPress={() => setDocType(dt)}
                  style={[s.docTypeChip, docType === dt && s.docTypeChipActive]}
                >
                  <Text
                    style={[
                      s.docTypeChipText,
                      docType === dt && s.docTypeChipTextActive,
                    ]}
                  >
                    {dt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Field
              label="Document ID Number *"
              value={idNum}
              onChangeText={setIdNum}
              placeholder="e.g. 4821 9012 3456"
            />

            <Field
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
            />

            <Field
              label="Date of Birth"
              value={dob}
              onChangeText={setDob}
              placeholder="YYYY-MM-DD"
            />

            <Field
              label="Address"
              value={address}
              onChangeText={setAddress}
              placeholder="Street, City, State"
              multiline
            />

            <PrimaryButton
              label="Continue to Stay Details"
              icon="arrowRight"
              onPress={handleNext}
              style={{ marginTop: 22 }}
            />
          </View>
        )}

        {/* STEP 2: Stay Details */}
        {step === 2 && (
          <View>
            <Text style={s.sectionHeader}>ASSIGN ROOM</Text>
            <View style={{ gap: 10, marginTop: 8 }}>
              {rooms.map((r) => (
                <RoomCard
                  key={r.id}
                  compact
                  room={{
                    id: r.id,
                    room_number: r.room_number,
                    room_type: r.room_type || undefined,
                    price_per_night: r.price ?? undefined,
                    status: r.status,
                  }}
                  selected={selectedRoomId === r.id}
                  onPress={() => setSelectedRoomId(r.id)}
                />
              ))}
            </View>

            <Field
              label="Check-in Date"
              value={checkinDate}
              onChangeText={setCheckinDate}
              placeholder="YYYY-MM-DD"
            />

            <Field
              label="Check-out Date"
              value={checkoutDate}
              onChangeText={setCheckoutDate}
              placeholder="YYYY-MM-DD"
            />

            {/* Guest count stepper */}
            <View style={{ marginTop: 14 }}>
              <Text style={s.fieldLabel}>Total Guests in Room</Text>
              <View style={s.stepperBox}>
                <TouchableOpacity
                  onPress={() => setGuestCount(Math.max(1, guestCount - 1))}
                  style={s.stepperBtn}
                >
                  <Text style={s.stepperBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={s.stepperNum}>{guestCount}</Text>
                <TouchableOpacity
                  onPress={() => setGuestCount(guestCount + 1)}
                  style={s.stepperBtn}
                >
                  <Text style={s.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <PrimaryButton
              label="Review & Confirm"
              icon="arrowRight"
              onPress={handleNext}
              style={{ marginTop: 24 }}
            />
          </View>
        )}

        {/* STEP 3: Review & Confirm */}
        {step === 3 && (
          <View>
            {/* Guest Summary */}
            <View style={s.summaryCard}>
              <View style={s.summaryHead}>
                <Icon name="users" size={18} color={C.primary} />
                <Text style={s.summaryHeadTitle}>Guest Information</Text>
              </View>
              {(photoUri || backPhotoUri) && (
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  {photoUri ? (
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>Front Side ID</Text>
                      <Image source={{ uri: photoUri }} style={{ width: '100%', height: 75, borderRadius: 8 }} resizeMode="cover" />
                    </View>
                  ) : null}
                  {backPhotoUri ? (
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>Back Side ID</Text>
                      <Image source={{ uri: backPhotoUri }} style={{ width: '100%', height: 75, borderRadius: 8 }} resizeMode="cover" />
                    </View>
                  ) : null}
                </View>
              )}
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Full Name</Text>
                <Text style={s.summaryVal}>{name}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>{docType} ID</Text>
                <Text style={s.summaryVal}>{idNum}</Text>
              </View>
              {phone ? (
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Phone</Text>
                  <Text style={s.summaryVal}>{phone}</Text>
                </View>
              ) : null}
              {address ? (
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Address</Text>
                  <Text style={[s.summaryVal, { flex: 1, textAlign: 'right' }]}>
                    {address}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Stay Summary */}
            <View style={[s.summaryCard, { marginTop: 14 }]}>
              <View style={s.summaryHead}>
                <Icon name="bed" size={18} color={C.primary} />
                <Text style={s.summaryHeadTitle}>Stay Information</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Room</Text>
                <Text style={s.summaryVal}>
                  Room {selectedRoom?.room_number} (
                  {selectedRoom?.room_type || 'Standard'})
                </Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Check-in</Text>
                <Text style={s.summaryVal}>{checkinDate}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Check-out</Text>
                <Text style={s.summaryVal}>{checkoutDate}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Rate per Night</Text>
                <Text style={s.summaryVal}>
                  ₹{(selectedRoom?.price || 0).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            <PrimaryButton
              label={isSubmitting ? 'Confirming Check-in…' : 'Confirm Check-in'}
              icon="check"
              onPress={handleFinalConfirm}
              disabled={isSubmitting}
              style={{ marginTop: 24 }}
            />
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ebebeb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 30,
    backgroundColor: '#FAF8FD',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEAF0',
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#dddddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  stepDotDone: {
    backgroundColor: '#EDE9FE',
    borderColor: C.primary,
  },
  stepDotText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#929292',
  },
  stepDotTextActive: {
    color: '#fff',
  },
  stepDotTextDone: {
    color: C.primary,
  },
  stepLabel: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    fontWeight: '600',
    color: '#929292',
  },
  stepLabelActive: {
    color: C.primary,
    fontWeight: '700',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#EBEBEB',
    marginHorizontal: 8,
    marginBottom: 16,
  },
  stepLineActive: {
    backgroundColor: C.primary,
  },
  uploadCard: {
    marginTop: 14,
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    backgroundColor: '#FAF5FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  uploadIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#222222',
  },
  uploadSub: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#6a6a6a',
    marginTop: 2,
  },
  sectionHeader: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#6a6a6a',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
  },
  docTypesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  docTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: '#dddddd',
    backgroundColor: '#fff',
  },
  docTypeChipActive: {
    backgroundColor: '#222222',
    borderColor: '#222222',
  },
  docTypeChipText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '600',
    color: '#222222',
  },
  docTypeChipTextActive: {
    color: '#fff',
  },
  fieldLabel: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '600',
    color: C.ink,
    marginBottom: 6,
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF8FD',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    padding: 6,
  },
  stepperBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  stepperBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
  },
  stepperNum: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
  },
  summaryCard: {
    backgroundColor: '#FAF8FD',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    padding: 16,
  },
  summaryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECEAF0',
    paddingBottom: 10,
  },
  summaryHeadTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: '#222222',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '500',
    color: '#6a6a6a',
  },
  summaryVal: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '600',
    color: '#222222',
  },
});
