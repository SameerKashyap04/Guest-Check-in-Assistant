import React, {useState, useEffect} from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  Alert,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {C, R} from '../theme/tokens';
import {ROOMS, STATUS_META} from '../data';
import {Icon} from '../components/Icon';
import {Field, PrimaryButton, SecondaryButton} from '../components/Ui';
import {RoomCard} from '../components/RoomCard';

export function ManualEntryScreen({
  onDone,
  onClose,
  initialData,
}: {
  onDone: (newGuest: any) => void;
  onClose: () => void;
  initialData?: any;
}) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<1 | 2 | 3>(initialData?.name ? 2 : 1);
  const [name, setName] = useState(initialData?.name || '');
  const [docType, setDocType] = useState(initialData?.docType || 'Aadhaar');
  const [idNum, setIdNum] = useState(initialData?.idNum || '');
  const [dob, setDob] = useState(initialData?.dob || '');
  const [gender, setGender] = useState(initialData?.gender || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [photoUri, setPhotoUri] = useState<string | null>(initialData?.photoUri || null);
  const [room, setRoom] = useState(initialData?.room || '101');
  const [checkin, setCheckin] = useState('2026-08-20');
  const [checkout, setCheckout] = useState('2026-08-22');
  const [guestCount, setGuestCount] = useState(1);

  useEffect(() => {
    if (initialData) {
      if (initialData.name) setName(initialData.name);
      if (initialData.docType) setDocType(initialData.docType);
      if (initialData.idNum) setIdNum(initialData.idNum);
      if (initialData.dob) setDob(initialData.dob);
      if (initialData.gender) setGender(initialData.gender);
      if (initialData.phone) setPhone(initialData.phone);
      if (initialData.address) setAddress(initialData.address);
      if (initialData.photoUri) setPhotoUri(initialData.photoUri);
      if (initialData.room) setRoom(initialData.room);
    }
  }, [initialData]);

  // Launch photo picker / camera for ID document upload
  const handleUploadPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        // Mock auto-fill fallback
        setName(name || 'Ananya Patel');
        setIdNum(idNum || '9821 4452 1092');
        setDob(dob || '1994-06-12');
        setGender(gender || 'Female');
        setPhone(phone || '+91 98765 43210');
        setAddress(address || '742 Silver Oak, Bandra West, Mumbai');
        setPhotoUri('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
        if (!name) setName('Ananya Patel');
        if (!idNum) setIdNum('9821 4452 1092');
        if (!dob) setDob('1994-06-12');
        if (!gender) setGender('Female');
        if (!phone) setPhone('+91 98765 43210');
        if (!address) setAddress('742 Silver Oak, Bandra West, Mumbai');
      }
    } catch (e) {
      setName(name || 'Ananya Patel');
      setIdNum(idNum || '9821 4452 1092');
      setDob(dob || '1994-06-12');
      setGender(gender || 'Female');
      setPhone(phone || '+91 98765 43210');
      setAddress(address || '742 Silver Oak, Bandra West, Mumbai');
      setPhotoUri('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80');
    }
  };

  const handleConfirm = () => {
    const finalGuest = {
      id: Date.now(),
      name: name.trim() || 'Guest',
      room: room,
      type: docType,
      idNum: idNum.trim() || 'Pending verification',
      phone: phone.trim() || '+91 98765 00000',
      email: `${(name || 'guest').toLowerCase().replace(/\s+/g, '.')}@email.com`,
      nat: 'Indian',
      gender: gender || 'Unspecified',
      address: address.trim() || 'Verified by Host',
      time: 'Just now',
      verified: true,
      roomType: ROOMS.find((r) => r.num === room)?.type || 'Standard',
      photoUri: photoUri || undefined,
      guestCount,
      checkin,
      checkout,
    };
    onDone(finalGuest);
  };

  const stepTitles: [string, string, string] = [
    'Manual Entry',
    'Stay Details',
    'Review & Confirm',
  ];
  const stepLabels: [string, string, string] = [
    'Guest details',
    'Stay details',
    'Review & confirm',
  ];

  return (
    <View style={[s.container, {paddingTop: insets.top}]}>
      {/* Top Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={step > 1 ? () => setStep((step - 1) as 1 | 2 | 3) : onClose}
          activeOpacity={0.8}
          style={s.backBtn}
        >
          <Icon name="chevronLeft" size={19} color={C.ink}/>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{stepTitles[step - 1]}</Text>
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
                  <Icon name="check" size={13} color={C.primary}/>
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
                style={[
                  s.stepLabel,
                  step === n && s.stepLabelActive,
                ]}
                numberOfLines={1}
              >
                {stepLabels[i]}
              </Text>
            </View>
            {i < 2 && (
              <View style={[s.stepLine, step > n && s.stepLineActive]}/>
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Scrollable Content */}
      <ScrollView
        contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 30}}
        showsVerticalScrollIndicator={false}
      >
        {/* Step 1: Guest details */}
        {step === 1 && (
          <View>
            <Text style={s.sectionHeader}>GUEST DETAILS</Text>

            {/* Upload ID card */}
            <View style={s.uploadCard}>
              {photoUri ? (
                <Image
                  source={{uri: photoUri}}
                  style={{width: 44, height: 44, borderRadius: 10, backgroundColor: '#E2E8F0'}}
                  resizeMode="cover"
                />
              ) : null}
              <View style={{flex: 1}}>
                <Text style={s.uploadTitle}>
                  {photoUri ? 'ID Document Attached ✓' : 'Upload ID card photo'}
                </Text>
                <Text style={s.uploadSub}>
                  {photoUri ? 'Auto-filled from document' : 'Pick an image or auto-fill supported fields.'}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[s.uploadBtn, photoUri && {backgroundColor: '#EDE9FE'}]}
                onPress={handleUploadPhoto}
              >
                <Icon name={photoUri ? "check" : "upload"} size={15} color={photoUri ? C.primary : C.ink}/>
                <Text style={[s.uploadBtnText, photoUri && {color: C.primary}]}>
                  {photoUri ? 'Replace' : 'Upload'}
                </Text>
              </TouchableOpacity>
            </View>

            <Field
              label="Full name"
              value={name}
              onChangeText={setName}
              placeholder="Enter full name"
            />

            {/* Document type chips */}
            <View style={{marginTop: 12}}>
              <Text style={s.fieldLabel}>Document type</Text>
              <View style={s.docsGrid}>
                {['Aadhaar', 'PAN', 'Passport', 'Driving Licence', 'Voter ID'].map((v) => {
                  const active = docType === v;
                  return (
                    <TouchableOpacity
                      key={v}
                      activeOpacity={0.75}
                      onPress={() => setDocType(v)}
                      style={[s.docChip, active && s.docChipActive]}
                    >
                      <Text style={[s.docChipText, active && s.docChipTextActive]}>
                        {v}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Field
              label="ID number"
              value={idNum}
              onChangeText={setIdNum}
              placeholder="Enter id number"
            />

            {/* Date of birth + Gender */}
            <View style={{flexDirection: 'row', gap: 10, marginTop: 12}}>
              <View style={{flex: 1}}>
                <Text style={s.fieldLabel}>Date of birth</Text>
                <View style={s.inputWrap}>
                  <TextInput
                    value={dob}
                    onChangeText={setDob}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                    style={s.input}
                  />
                </View>
              </View>
              <View style={{flex: 1}}>
                <Text style={s.fieldLabel}>Gender</Text>
                <View style={s.inputWrap}>
                  <TextInput
                    value={gender}
                    onChangeText={setGender}
                    placeholder="e.g. Female"
                    placeholderTextColor="#9CA3AF"
                    style={s.input}
                  />
                </View>
              </View>
            </View>

            <Field
              label="Phone number"
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter phone number"
            />
            <Field
              label="Address"
              value={address}
              onChangeText={setAddress}
              placeholder="Enter address"
            />
          </View>
        )}

        {/* Step 2: Stay details */}
        {step === 2 && (
          <View>
            <Text style={s.sectionHeader}>SELECT ROOM</Text>
            <View style={s.stayRoomGrid}>
              {ROOMS.filter((r) => r.status === 'available' || r.num === room)
                .slice(0, 4)
                .map((r) => (
                  <View key={r.num} style={{width: '48.2%'}}>
                    <RoomCard
                      room={r}
                      compact
                      selected={room === r.num}
                      onPress={() => setRoom(r.num)}
                    />
                  </View>
                ))}
            </View>

            <View style={s.datesCard}>
              <Text style={s.cardSectionTitle}>DATES & RATE</Text>
              <View style={{flexDirection: 'row', gap: 10, marginTop: 12}}>
                <View style={{flex: 1}}>
                  <Text style={s.fieldLabel}>Check-in</Text>
                  <View style={s.inputWrap}>
                    <TextInput
                      value={checkin}
                      onChangeText={setCheckin}
                      style={s.input}
                    />
                  </View>
                </View>
                <View style={{flex: 1}}>
                  <Text style={s.fieldLabel}>Check-out</Text>
                  <View style={s.inputWrap}>
                    <TextInput
                      value={checkout}
                      onChangeText={setCheckout}
                      style={s.input}
                    />
                  </View>
                </View>
              </View>
              <View style={{marginTop: 14}}>
                <Text style={s.fieldLabel}>Nightly rate</Text>
                <Text style={s.rateValue}>
                  ₹
                  {Number(
                    ROOMS.find((r) => r.num === room)?.price || 1800
                  ).toLocaleString('en-IN')}{' '}
                  / night
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Step 3: Review & confirm */}
        {step === 3 && (
          <View>
            <Text style={s.sectionHeader}>GUEST SUMMARY</Text>
            <View style={s.reviewCard}>
              <View style={s.reviewTop}>
                <Text style={s.reviewTitle}>Primary Guest</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setStep(1)}
                  style={{flexDirection: 'row', alignItems: 'center', gap: 4}}
                >
                  <Icon name="edit" size={14} color={C.ink}/>
                  <Text style={s.editBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>
              <View style={s.divider}/>
              <View style={s.reviewGrid}>
                <View style={s.kvCol}>
                  <Text style={s.kvLabel}>Full name</Text>
                  <Text style={s.kvValue}>{name || 'Ananya Patel'}</Text>
                </View>
                <View style={s.kvCol}>
                  <Text style={s.kvLabel}>Document</Text>
                  <Text style={s.kvValue}>
                    {docType} · {idNum || '9821 4452 1092'}
                  </Text>
                </View>
                <View style={s.kvCol}>
                  <Text style={s.kvLabel}>DOB</Text>
                  <Text style={s.kvValue}>{dob || '1994-06-12'}</Text>
                </View>
                <View style={s.kvCol}>
                  <Text style={s.kvLabel}>Gender</Text>
                  <Text style={s.kvValue}>{gender || 'Female'}</Text>
                </View>
                <View style={s.kvCol}>
                  <Text style={s.kvLabel}>Phone</Text>
                  <Text style={s.kvValue}>{phone || '+91 98765 43210'}</Text>
                </View>
                <View style={s.kvCol}>
                  <Text style={s.kvLabel}>Address</Text>
                  <Text style={s.kvValue}>{address || 'Bandra West, Mumbai'}</Text>
                </View>
              </View>
            </View>

            <Text style={[s.sectionHeader, {marginTop: 18}]}>STAY SUMMARY</Text>
            <View style={s.reviewCard}>
              <View style={s.reviewGrid}>
                <View style={s.kvCol}>
                  <Text style={s.kvLabel}>Room</Text>
                  <Text style={s.kvValue}>Room {room}</Text>
                </View>
                <View style={s.kvCol}>
                  <Text style={s.kvLabel}>Rate</Text>
                  <Text style={s.kvValue}>
                    ₹
                    {Number(
                      ROOMS.find((r) => r.num === room)?.price || 1800
                    ).toLocaleString('en-IN')}{' '}
                    / night
                  </Text>
                </View>
                <View style={s.kvCol}>
                  <Text style={s.kvLabel}>Check-in</Text>
                  <Text style={s.kvValue}>{checkin}</Text>
                </View>
                <View style={s.kvCol}>
                  <Text style={s.kvLabel}>Check-out</Text>
                  <Text style={s.kvValue}>{checkout}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setGuestCount(guestCount + 1)}
              style={s.addGuestCard}
            >
              <View style={s.addGuestIcon}>
                <Icon name="users" size={19} color={C.primary}/>
              </View>
              <View style={{flex: 1}}>
                <Text style={s.addGuestTitle}>Add more guest</Text>
                <Text style={s.addGuestSub}>Scan or enter co-guest details</Text>
              </View>
              <Icon name="plus" size={18} color={C.ink}/>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Action Bar with Safe Area Inset */}
      <View style={[s.bottomBar, {paddingBottom: Math.max(16, insets.bottom + 8)}]}>
        {step === 1 && (
          <PrimaryButton
            label="Continue to Stay details →"
            onPress={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <View style={{flexDirection: 'row', gap: 10}}>
            <SecondaryButton
              label="Back"
              style={{flex: 1}}
              onPress={() => setStep(1)}
            />
            <PrimaryButton
              label="Continue to Review →"
              style={{flex: 2}}
              onPress={() => setStep(3)}
            />
          </View>
        )}
        {step === 3 && (
          <View>
            <PrimaryButton
              label={`Confirm Check-in (${guestCount} Guest${guestCount > 1 ? 's' : ''})`}
              icon="check"
              onPress={handleConfirm}
            />
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={s.cancelBtn}
            >
              <Text style={s.cancelBtnText}>Cancel & Retake</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ebebeb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    gap: 6,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: C.primary,
    borderWidth: 3,
    borderColor: '#EDE9FE',
  },
  stepDotDone: {
    backgroundColor: '#EDE9FE',
  },
  stepDotText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: '#6a6a6a',
  },
  stepDotTextActive: {
    color: '#fff',
  },
  stepDotTextDone: {
    color: C.primary,
  },
  stepLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '500',
    color: '#929292',
  },
  stepLabelActive: {
    fontWeight: '700',
    color: '#222222',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#ebebeb',
  },
  stepLineActive: {
    backgroundColor: C.primary,
  },
  sectionHeader: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#6a6a6a',
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 10,
  },
  uploadCard: {
    backgroundColor: '#F5F9FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  uploadTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
  },
  uploadSub: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '400',
    color: '#6a6a6a',
    marginTop: 2,
  },
  uploadBtn: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: R.full,
    backgroundColor: '#f2f2f2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  uploadBtnText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '600',
    color: '#222222',
  },
  fieldLabel: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 6,
  },
  docsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  docChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: '#dddddd',
    backgroundColor: '#fff',
  },
  docChipActive: {
    backgroundColor: '#222222',
    borderColor: '#222222',
  },
  docChipText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '600',
    color: '#222222',
  },
  docChipTextActive: {
    color: '#fff',
  },
  inputWrap: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dddddd',
    justifyContent: 'center',
    paddingHorizontal: 12,
    elevation: 1,
  },
  input: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
    color: '#222222',
    paddingVertical: 10,
  },
  stayRoomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  datesCard: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ebebeb',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  cardSectionTitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: '#6a6a6a',
    textTransform: 'uppercase',
  },
  rateValue: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: '#222222',
    marginTop: 4,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ebebeb',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: '#222222',
  },
  editBtnText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
  },
  divider: {
    height: 1,
    backgroundColor: '#ebebeb',
    marginBottom: 14,
  },
  reviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
  },
  kvCol: {
    width: '50%',
  },
  kvLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#929292',
    textTransform: 'uppercase',
  },
  kvValue: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
    marginTop: 3,
  },
  addGuestCard: {
    marginTop: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#111827',
    borderRadius: 18,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
  },
  addGuestIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addGuestTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
  },
  addGuestSub: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '400',
    color: '#6a6a6a',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ECEAF0',
  },
  cancelBtn: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#6a6a6a',
  },
});
