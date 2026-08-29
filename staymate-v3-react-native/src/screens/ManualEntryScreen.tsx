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
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {C, R} from '../theme/tokens';
import {useTheme} from '../theme/ThemeContext';
import {ROOMS, STATUS_META} from '../data';
import {Icon} from '../components/Icon';
import {Field, PrimaryButton, SecondaryButton} from '../components/Ui';
import {RoomCard} from '../components/RoomCard';
import {AddCoGuestModal, CoGuestItem} from '../components/AddCoGuestModal';
import {CalendarPicker} from '../components/CalendarPicker';
import {compressImage} from '../utils/imageCompressor';
import {OCRPipeline} from '../utils/OCRPipeline';

export function ManualEntryScreen({
  onDone,
  onClose,
  initialData,
  roomsList,
  currentPlan = 'Free',
}: {
  onDone: (newGuest: any) => void;
  onClose: () => void;
  initialData?: any;
  roomsList?: any[];
  currentPlan?: string;
}) {
  const {isDark, colors} = useTheme();
  const insets = useSafeAreaInsets();
  const activeRooms = roomsList && roomsList.length > 0 ? roomsList : (ROOMS as any);
  const isFreePlan = (currentPlan || 'Free').toUpperCase().includes('FREE');
  const availableRooms = activeRooms.filter((r: any) => r.status === 'available');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [name, setName] = useState(initialData?.name || '');
  const [docType, setDocType] = useState(initialData?.docType || 'Aadhaar');
  const [idNum, setIdNum] = useState(initialData?.idNum || '');
  const [dob, setDob] = useState(initialData?.dob || '');
  const [gender, setGender] = useState(initialData?.gender || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [photoUri, setPhotoUri] = useState<string | null>(initialData?.photoUri || initialData?.photo_uri || null);
  const [backPhotoUri, setBackPhotoUri] = useState<string | null>(initialData?.backPhotoUri || initialData?.back_photo_uri || null);
  const [room, setRoom] = useState(
    initialData?.room && activeRooms.some((r: any) => r.num === initialData.room && r.status === 'available')
      ? initialData.room
      : availableRooms[0]?.num || activeRooms[0]?.num || '101'
  );
  const [checkin, setCheckin] = useState('2026-08-20');
  const [checkout, setCheckout] = useState('2026-08-22');
  const [coGuests, setCoGuests] = useState<CoGuestItem[]>([]);
  const [coGuestModalVisible, setCoGuestModalVisible] = useState(false);
  const [editingCoGuest, setEditingCoGuest] = useState<CoGuestItem | null>(null);

  useEffect(() => {
    if (initialData) {
      if (initialData.name) setName(initialData.name);
      if (initialData.docType) setDocType(initialData.docType);
      if (initialData.idNum) setIdNum(initialData.idNum);
      if (initialData.dob) setDob(initialData.dob);
      if (initialData.gender) setGender(initialData.gender);
      if (initialData.phone) setPhone(initialData.phone);
      if (initialData.email) setEmail(initialData.email);
      if (initialData.address) setAddress(initialData.address);
      if (initialData.room && availableRooms.some((r: any) => r.num === initialData.room)) {
        setRoom(initialData.room);
      }
      if (initialData.photoUri || initialData.photo_uri) setPhotoUri(initialData.photoUri || initialData.photo_uri);
      if (initialData.backPhotoUri || initialData.back_photo_uri) setBackPhotoUri(initialData.backPhotoUri || initialData.back_photo_uri);
    }
  }, [initialData]);

  // Ensure selected room is always an available room
  useEffect(() => {
    const isCurrentAvailable = availableRooms.some((r: any) => r.num === room);
    if (!isCurrentAvailable && availableRooms.length > 0) {
      setRoom(availableRooms[0].num);
    }
  }, [roomsList, activeRooms]);

  const handleUploadPhoto = async (side: 'front' | 'back', useCamera: boolean) => {
    try {
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Required', `Please grant camera access to capture ${side === 'front' ? 'Front' : 'Back'} ID photo.`);
          return;
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Required', `Please grant access to upload ${side === 'front' ? 'Front' : 'Back'} ID photo.`);
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.85,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.85,
          });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsOcrProcessing(true);
        const originalUri = result.assets[0].uri;
        const compressed = await compressImage(originalUri, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.65,
        });
        const uri = compressed.uri || originalUri;
        if (side === 'front') {
          setPhotoUri(uri);
        } else {
          setBackPhotoUri(uri);
        }

        // On Free Plan, OCR auto-fill is strictly disabled (photo is only attached)
        if (isFreePlan) {
          setIsOcrProcessing(false);
          return;
        }

        // On Paid Plans: Run ML Kit OCR on uploaded/captured document with full resolution
        try {
          const ocrResult = await OCRPipeline.processImage(originalUri, docType);
          if (ocrResult) {
            if (side === 'front') {
              // Front side: populate fields only if they are not already filled by user
              setName((prev: string) => (prev.trim() ? prev : ocrResult.name || ''));
              setIdNum((prev: string) => (prev.trim() ? prev : ocrResult.idNum || ''));
              setDob((prev: string) => (prev.trim() ? prev : ocrResult.dob || ''));
              setGender((prev: string) => (prev.trim() ? prev : ocrResult.gender || ''));
              setAddress((prev: string) => (prev.trim() ? prev : ocrResult.address || ''));
              if (ocrResult.docType && ocrResult.docType !== 'Unknown') {
                setDocType((prev: string) => (prev && prev !== 'Select' ? prev : ocrResult.docType));
              }
            } else {
              // Back side: NEVER touch or overwrite Name! Only populate Address and empty fields
              if (ocrResult.address) {
                setAddress((prev: string) => (prev.trim() ? prev : ocrResult.address));
              }
              setIdNum((prev: string) => (prev.trim() ? prev : ocrResult.idNum || ''));
              setDob((prev: string) => (prev.trim() ? prev : ocrResult.dob || ''));
              setGender((prev: string) => (prev.trim() ? prev : ocrResult.gender || ''));
            }
          }
        } catch (ocrErr) {
          console.warn('Manual Entry OCR parse notice:', ocrErr);
        } finally {
          setIsOcrProcessing(false);
        }
      }
    } catch (e) {
      console.log('Upload error', e);
      setIsOcrProcessing(false);
    }
  };

  const handleOpenAddCoGuest = () => {
    setEditingCoGuest(null);
    setCoGuestModalVisible(true);
  };

  const handleOpenEditCoGuest = (guest: CoGuestItem) => {
    setEditingCoGuest(guest);
    setCoGuestModalVisible(true);
  };

  const handleSaveCoGuest = (guest: CoGuestItem) => {
    setCoGuests((prev) => {
      const exists = prev.some((g) => g.id === guest.id);
      if (exists) {
        return prev.map((g) => (g.id === guest.id ? guest : g));
      }
      return [...prev, guest];
    });
  };

  const handleDeleteCoGuest = (id: string) => {
    setCoGuests((prev) => prev.filter((g) => g.id !== id));
  };

  const handleConfirm = () => {
    const finalGuest = {
      id: Date.now(),
      name: name.trim() || 'Guest',
      room: room,
      type: docType,
      idNum: idNum.trim() || '',
      phone: phone.trim() || '',
      email: email.trim() || '',
      nat: 'Indian',
      gender: gender || 'Unspecified',
      address: address.trim() || '',
      time: 'Just now',
      verified: true,
      roomType: activeRooms.find((r: any) => r.num === room)?.type || 'Standard',
      photoUri: photoUri || undefined,
      backPhotoUri: backPhotoUri || undefined,
      guestCount: 1 + coGuests.length,
      coGuests,
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
    <View style={[s.container, {paddingTop: insets.top, backgroundColor: colors.canvas}]}>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Top Header */}
        <View style={[s.header, isDark && {borderBottomColor: '#27272A'}]}>
          <TouchableOpacity
            onPress={step > 1 ? () => setStep((step - 1) as 1 | 2 | 3) : onClose}
            activeOpacity={0.8}
            style={[s.backBtn, isDark && {backgroundColor: '#27272A'}]}
          >
            <Icon name="chevronLeft" size={19} color={colors.ink} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, {color: colors.ink}]}>{stepTitles[step - 1]}</Text>
        </View>

        {/* Stepper */}
        <View style={s.stepper}>
          {([1, 2, 3] as const).map((n, i) => (
            <React.Fragment key={n}>
              <View style={s.stepItem}>
                <View
                  style={[
                    s.stepDot,
                    isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'},
                    step === n && (isDark ? {backgroundColor: colors.primary, borderColor: colors.primary} : s.stepDotActive),
                    step > n && (isDark ? {backgroundColor: '#2E1065', borderColor: colors.primary} : s.stepDotDone),
                  ]}
                >
                  {step > n ? (
                    <Icon name="check" size={13} color={colors.primary} />
                  ) : (
                    <Text
                      style={[
                        s.stepDotText,
                        isDark && {color: colors.muted},
                        step === n && (isDark ? {color: '#ffffff'} : s.stepDotTextActive),
                        step > n && (isDark ? {color: colors.primary} : s.stepDotTextDone),
                      ]}
                    >
                      {n}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    s.stepLabel,
                    isDark && {color: colors.muted},
                    step === n && (isDark ? {color: colors.ink, fontWeight: '700'} : s.stepLabelActive),
                  ]}
                  numberOfLines={1}
                >
                  {stepLabels[i]}
                </Text>
              </View>
              {i < 2 && (
                <View style={[
                  s.stepLine,
                  isDark && {backgroundColor: '#27272A'},
                  step > n && (isDark ? {backgroundColor: colors.primary} : s.stepLineActive),
                ]} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={{flex: 1}}
          contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 60}}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Step 1: Guest details */}
          {step === 1 && (
            <View>
              <Text style={[s.sectionHeader, {color: colors.muted}]}>PRIMARY GUEST DETAILS</Text>

            {/* Front & Back ID card photos */}
            <View style={{flexDirection: 'row', gap: 10, marginBottom: 14}}>
              {/* Front Photo */}
              <View style={{flex: 1, backgroundColor: isDark ? '#18181B' : '#F8FAFC', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: isDark ? '#27272A' : '#E2E8F0'}}>
                <Text style={{fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: colors.muted, marginBottom: 6}}>Front Side ID</Text>
                {photoUri ? (
                  <View style={{position: 'relative', borderRadius: 8, overflow: 'hidden', height: 80}}>
                    <Image source={{uri: photoUri}} style={{width: '100%', height: '100%'}} resizeMode="cover" />
                    <TouchableOpacity
                      onPress={() => setPhotoUri(null)}
                      style={{position: 'absolute', top: 3, right: 3, backgroundColor: 'rgba(220,38,38,0.9)', padding: 3, borderRadius: 10}}
                    >
                      <Icon name="x" size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{gap: 5}}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleUploadPhoto('front', true)}
                      style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: isDark ? '#2E1065' : '#EDE9FE', paddingVertical: 6, borderRadius: 6}}
                    >
                      <Icon name="camera" size={12} color={colors.primary} />
                      <Text style={{fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: colors.primary}}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleUploadPhoto('front', false)}
                      style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: isDark ? '#27272A' : '#FFFFFF', borderWidth: 1, borderColor: isDark ? '#3F3F46' : '#CBD5E1', paddingVertical: 6, borderRadius: 6}}
                    >
                      <Icon name="upload" size={12} color={colors.muted} />
                      <Text style={{fontFamily: 'Inter', fontSize: 11, fontWeight: '600', color: colors.muted}}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Back Photo */}
              <View style={{flex: 1, backgroundColor: isDark ? '#18181B' : '#F8FAFC', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: isDark ? '#27272A' : '#E2E8F0'}}>
                <Text style={{fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: colors.muted, marginBottom: 6}}>Back Side ID</Text>
                {backPhotoUri ? (
                  <View style={{position: 'relative', borderRadius: 8, overflow: 'hidden', height: 80}}>
                    <Image source={{uri: backPhotoUri}} style={{width: '100%', height: '100%'}} resizeMode="cover" />
                    <TouchableOpacity
                      onPress={() => setBackPhotoUri(null)}
                      style={{position: 'absolute', top: 3, right: 3, backgroundColor: 'rgba(220,38,38,0.9)', padding: 3, borderRadius: 10}}
                    >
                      <Icon name="x" size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{gap: 5}}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleUploadPhoto('back', true)}
                      style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: isDark ? '#2E1065' : '#EDE9FE', paddingVertical: 6, borderRadius: 6}}
                    >
                      <Icon name="camera" size={12} color={colors.primary} />
                      <Text style={{fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: colors.primary}}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleUploadPhoto('back', false)}
                      style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: isDark ? '#27272A' : '#FFFFFF', borderWidth: 1, borderColor: isDark ? '#3F3F46' : '#CBD5E1', paddingVertical: 6, borderRadius: 6}}
                    >
                      <Icon name="upload" size={12} color={colors.muted} />
                      <Text style={{fontFamily: 'Inter', fontSize: 11, fontWeight: '600', color: colors.muted}}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            <Field
              label="Full name *"
              value={name}
              onChangeText={setName}
              placeholder="Enter full name"
            />

            {/* Document type chips */}
            <View style={{marginTop: 12}}>
              <Text style={[s.fieldLabel, {color: colors.muted}]}>Document type</Text>
              <View style={s.docsGrid}>
                {['Aadhaar', 'PAN', 'Passport', 'Driving Licence', 'Voter ID'].map((v) => {
                  const active = docType === v;
                  return (
                    <TouchableOpacity
                      key={v}
                      activeOpacity={0.75}
                      onPress={() => setDocType(v)}
                      style={[
                        s.docChip,
                        isDark && {backgroundColor: '#27272A'},
                        active && (isDark ? {backgroundColor: colors.primary} : s.docChipActive),
                      ]}
                    >
                      <Text style={[
                        s.docChipText,
                        isDark && {color: colors.muted},
                        active && (isDark ? {color: '#ffffff', fontWeight: '700'} : s.docChipTextActive),
                      ]}>
                        {v}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Field
              label="ID number *"
              value={idNum}
              onChangeText={setIdNum}
              placeholder="Enter id number"
            />

            {/* Date of birth + Gender */}
            <View style={{flexDirection: 'row', gap: 10, marginTop: 12}}>
              <View style={{flex: 1}}>
                <CalendarPicker
                  label="Date of birth"
                  value={dob}
                  onChange={setDob}
                  mode="dob"
                  placeholder="Select DOB"
                />
              </View>
              <View style={{flex: 1.15}}>
                <Text style={[s.fieldLabel, {color: colors.muted}]}>Gender</Text>
                <View style={s.genderRow}>
                  {['Male', 'Female', 'Other'].map((g) => {
                    const active = gender.toLowerCase() === g.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={g}
                        onPress={() => setGender(g)}
                        activeOpacity={0.75}
                        style={[
                          s.genderBtn,
                          isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'},
                          active && (isDark ? {backgroundColor: '#2E1065', borderColor: colors.primary} : s.genderBtnActive),
                        ]}
                      >
                        <Text style={[
                          s.genderText,
                          isDark && {color: colors.muted},
                          active && (isDark ? {color: colors.primary, fontWeight: '700'} : s.genderTextActive),
                        ]}>
                          {g}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
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

            {/* Co-Guests Section in Step 1 */}
            <View style={{marginTop: 20}}>
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8}}>
                <Text style={[s.sectionHeader, {color: colors.muted}]}>ACCOMPANYING CO-GUESTS ({coGuests.length})</Text>
                {coGuests.length > 0 && (
                  <TouchableOpacity onPress={handleOpenAddCoGuest} activeOpacity={0.7}>
                    <Text style={s.addMoreLink}>+ Add Another</Text>
                  </TouchableOpacity>
                )}
              </View>

              {coGuests.map((cg, idx) => (
                <View key={cg.id} style={[s.coGuestCard, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}]}>
                  <View style={s.coGuestAvatar}>
                    <Text style={s.coGuestAvatarText}>
                      {cg.name.split(' ').map((n) => n[0]).join('') || `G${idx + 2}`}
                    </Text>
                  </View>
                  <View style={{flex: 1, minWidth: 0}}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                      <Text style={[s.coGuestName, {color: colors.ink}]}>{cg.name}</Text>
                      <View style={s.relationBadge}>
                        <Text style={s.relationBadgeText}>{cg.relation}</Text>
                      </View>
                    </View>
                    <Text style={[s.coGuestMeta, {color: colors.muted}]}>
                      {cg.docType}: {cg.idNum}
                      {cg.gender ? ` · ${cg.gender}` : ''}
                    </Text>
                  </View>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                    <TouchableOpacity
                      onPress={() => handleOpenEditCoGuest(cg)}
                      style={[s.actionIconBtn, isDark && {backgroundColor: '#27272A'}]}
                      activeOpacity={0.7}
                    >
                      <Icon name="edit" size={14} color={colors.ink} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteCoGuest(cg.id)}
                      style={[s.actionIconBtn, {backgroundColor: '#FEE2E2'}]}
                      activeOpacity={0.7}
                    >
                      <Icon name="trash" size={14} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleOpenAddCoGuest}
                style={[s.addGuestCard, isDark && {backgroundColor: '#18181B', borderColor: '#3F3F46'}]}
              >
                <View style={[s.addGuestIcon, isDark && {backgroundColor: '#2E1065'}]}>
                  <Icon name="users" size={19} color={colors.primary} />
                </View>
                <View style={{flex: 1}}>
                  <Text style={[s.addGuestTitle, {color: colors.ink}]}>Add more guest</Text>
                  <Text style={[s.addGuestSub, {color: colors.muted}]}>Scan or enter co-guest details</Text>
                </View>
                <Icon name="plus" size={18} color={colors.ink} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 2: Stay details */}
        {step === 2 && (
          <View>
            <Text style={[s.sectionHeader, {color: colors.muted}]}>SELECT ROOM (AVAILABLE ONLY)</Text>
            {activeRooms.filter((r: any) => r.status === 'available').length === 0 ? (
              <View style={[s.noRoomsCard, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}]}>
                <Icon name="alert-circle" size={24} color="#EF4444" />
                <Text style={[s.noRoomsTitle, {color: colors.ink}]}>No Available Rooms</Text>
                <Text style={[s.noRoomsSub, {color: colors.muted}]}>
                  All {activeRooms.length} room(s) for your property are currently occupied or being cleaned.
                </Text>
              </View>
            ) : (
              <View style={s.stayRoomGrid}>
                {activeRooms
                  .filter((r: any) => r.status === 'available')
                  .map((r: any) => (
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
            )}

            <View style={[s.datesCard, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}]}>
              <Text style={[s.cardSectionTitle, {color: colors.muted}]}>DATES & RATE</Text>
              <View style={{flexDirection: 'row', gap: 10, marginTop: 12}}>
                <View style={{flex: 1}}>
                  <CalendarPicker
                    label="Check-in Date"
                    value={checkin}
                    onChange={setCheckin}
                    mode="stay"
                  />
                </View>
                <View style={{flex: 1}}>
                  <CalendarPicker
                    label="Check-out Date"
                    value={checkout}
                    onChange={setCheckout}
                    mode="stay"
                  />
                </View>
              </View>

              <View style={{marginTop: 4}}>
                <Text style={[s.fieldLabel, {color: colors.muted}]}>Nightly rate</Text>
                <Text style={[s.rateValue, {color: colors.ink}]}>
                  ₹
                  {Number(
                    activeRooms.find((r: any) => r.num === room)?.price || 1800
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
            <Text style={[s.sectionHeader, {color: colors.muted}]}>PRIMARY GUEST</Text>
            <View style={[s.reviewCard, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}]}>
              <View style={s.reviewTop}>
                <Text style={[s.reviewTitle, {color: colors.ink}]}>{name || 'Primary Guest'}</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setStep(1)}
                  style={{flexDirection: 'row', alignItems: 'center', gap: 4}}
                >
                  <Icon name="edit" size={14} color={colors.ink} />
                  <Text style={[s.editBtnText, {color: colors.ink}]}>Edit</Text>
                </TouchableOpacity>
              </View>
              <View style={[s.divider, isDark && {backgroundColor: '#27272A'}]} />
              {(photoUri || backPhotoUri) && (
                <View style={{flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6}}>
                  {photoUri ? (
                    <View style={{flex: 1}}>
                      <Text style={{fontFamily: 'Inter', fontSize: 10, fontWeight: '700', color: colors.muted, marginBottom: 4}}>Front Side ID</Text>
                      <Image source={{uri: photoUri}} style={{width: '100%', height: 75, borderRadius: 8}} resizeMode="cover" />
                    </View>
                  ) : null}
                  {backPhotoUri ? (
                    <View style={{flex: 1}}>
                      <Text style={{fontFamily: 'Inter', fontSize: 10, fontWeight: '700', color: colors.muted, marginBottom: 4}}>Back Side ID</Text>
                      <Image source={{uri: backPhotoUri}} style={{width: '100%', height: 75, borderRadius: 8}} resizeMode="cover" />
                    </View>
                  ) : null}
                </View>
              )}
              <View style={s.reviewGrid}>
                <View style={s.kvCol}>
                  <Text style={[s.kvLabel, {color: colors.muted}]}>Full name</Text>
                  <Text style={[s.kvValue, {color: colors.ink}]}>{name || '—'}</Text>
                </View>
                <View style={s.kvCol}>
                  <Text style={[s.kvLabel, {color: colors.muted}]}>Document</Text>
                  <Text style={[s.kvValue, {color: colors.ink}]}>
                    {docType} {idNum ? `· ${idNum}` : ''}
                  </Text>
                </View>
                <View style={s.kvCol}>
                  <Text style={[s.kvLabel, {color: colors.muted}]}>DOB</Text>
                  <Text style={[s.kvValue, {color: colors.ink}]}>{dob || '—'}</Text>
                </View>
                <View style={s.kvCol}>
                  <Text style={[s.kvLabel, {color: colors.muted}]}>Gender</Text>
                  <Text style={[s.kvValue, {color: colors.ink}]}>{gender || '—'}</Text>
                </View>
                <View style={s.kvCol}>
                  <Text style={[s.kvLabel, {color: colors.muted}]}>Phone</Text>
                  <Text style={[s.kvValue, {color: colors.ink}]}>{phone || '—'}</Text>
                </View>
                <View style={s.kvCol}>
                  <Text style={[s.kvLabel, {color: colors.muted}]}>Address</Text>
                  <Text style={[s.kvValue, {color: colors.ink}]}>{address || '—'}</Text>
                </View>
              </View>
            </View>

            {/* Co-Guests Summary in Step 3 */}
            {coGuests.length > 0 && (
              <View style={{marginTop: 18}}>
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8}}>
                  <Text style={[s.sectionHeader, {color: colors.muted}]}>CO-GUESTS ({coGuests.length})</Text>
                  <TouchableOpacity onPress={handleOpenAddCoGuest} activeOpacity={0.7}>
                    <Text style={s.addMoreLink}>+ Add Another</Text>
                  </TouchableOpacity>
                </View>
                {coGuests.map((cg) => (
                  <View key={cg.id} style={[s.coGuestSummaryCard, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}]}>
                    <View style={s.coGuestAvatar}>
                      <Text style={s.coGuestAvatarText}>
                        {cg.name.split(' ').map((n) => n[0]).join('')}
                      </Text>
                    </View>
                    <View style={{flex: 1}}>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                        <Text style={[s.coGuestName, {color: colors.ink}]}>{cg.name}</Text>
                        <View style={s.relationBadge}>
                          <Text style={s.relationBadgeText}>{cg.relation}</Text>
                        </View>
                      </View>
                      <Text style={[s.coGuestMeta, {color: colors.muted}]}>
                        {cg.docType} · {cg.idNum}
                        {cg.gender ? ` · ${cg.gender}` : ''}
                      </Text>
                      {(cg.photoUri || cg.backPhotoUri) && (
                        <View style={{flexDirection: 'row', gap: 6, marginTop: 4}}>
                          {cg.photoUri ? (
                            <Image source={{uri: cg.photoUri}} style={{width: 38, height: 28, borderRadius: 4}} resizeMode="cover" />
                          ) : null}
                          {cg.backPhotoUri ? (
                            <Image source={{uri: cg.backPhotoUri}} style={{width: 38, height: 28, borderRadius: 4}} resizeMode="cover" />
                          ) : null}
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleOpenEditCoGuest(cg)}
                      style={[s.actionIconBtn, isDark && {backgroundColor: '#27272A'}]}
                      activeOpacity={0.7}
                    >
                      <Icon name="edit" size={14} color={colors.ink} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <Text style={[s.sectionHeader, {marginTop: 18, color: colors.muted}]}>STAY DETAILS</Text>
            <View style={[s.reviewCard, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}]}>
              <View style={s.reviewGrid}>
                <View style={s.kvCol}>
                  <Text style={[s.kvLabel, {color: colors.muted}]}>Room</Text>
                  <Text style={[s.kvValue, {color: colors.ink}]}>Room {room}</Text>
                </View>
                <View style={s.kvCol}>
                  <Text style={[s.kvLabel, {color: colors.muted}]}>Rate</Text>
                  <Text style={[s.kvValue, {color: colors.ink}]}>
                    ₹
                    {Number(
                      activeRooms.find((r: any) => r.num === room)?.price || 1800
                    ).toLocaleString('en-IN')}{' '}
                    / night
                  </Text>
                </View>
                <View style={s.kvCol}>
                  <Text style={[s.kvLabel, {color: colors.muted}]}>Check-in</Text>
                  <Text style={[s.kvValue, {color: colors.ink}]}>{checkin}</Text>
                </View>
                <View style={s.kvCol}>
                  <Text style={[s.kvLabel, {color: colors.muted}]}>Check-out</Text>
                  <Text style={[s.kvValue, {color: colors.ink}]}>{checkout}</Text>
                </View>
                <View style={s.kvCol}>
                  <Text style={[s.kvLabel, {color: colors.muted}]}>Total Occupants</Text>
                  <Text style={[s.kvValue, {color: colors.ink}]}>{1 + coGuests.length} Guests</Text>
                </View>
              </View>
            </View>

            {/* Add More Guest Action Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleOpenAddCoGuest}
              style={[s.addGuestCard, isDark && {backgroundColor: '#18181B', borderColor: '#3F3F46'}]}
            >
              <View style={[s.addGuestIcon, isDark && {backgroundColor: '#2E1065'}]}>
                <Icon name="users" size={19} color={colors.primary} />
              </View>
              <View style={{flex: 1}}>
                <Text style={[s.addGuestTitle, {color: colors.ink}]}>Add more guest</Text>
                <Text style={[s.addGuestSub, {color: colors.muted}]}>Scan or enter co-guest details</Text>
              </View>
              <Icon name="plus" size={18} color={colors.ink} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Co-Guest Modal */}
      <AddCoGuestModal
        visible={coGuestModalVisible}
        onClose={() => setCoGuestModalVisible(false)}
        onSave={handleSaveCoGuest}
        initialData={editingCoGuest}
      />

      {/* Sticky Bottom Action Bar with Safe Area Inset */}
      <View style={[s.bottomBar, isDark && {backgroundColor: colors.canvas, borderTopColor: '#27272A'}, {paddingBottom: Math.max(16, insets.bottom + 8)}]}>
        {step === 1 && (
          <PrimaryButton
            label="Continue to Stay details →"
            onPress={() => {
              if (!name.trim()) {
                Alert.alert('Required', 'Please enter guest full name');
                return;
              }
              setStep(2);
            }}
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
              style={{flex: 1}}
              onPress={() => setStep(3)}
            />
          </View>
        )}
        {step === 3 && (
          <View style={{flexDirection: 'row', gap: 10}}>
            <SecondaryButton
              label="Back"
              style={{flex: 1}}
              onPress={() => setStep(2)}
            />
            <PrimaryButton
              label="Confirm Check-in"
              style={{flex: 1.4}}
              onPress={handleConfirm}
            />
          </View>
        )}
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: '#222222',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ECEAF0',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ECEAF0',
    backgroundColor: '#FAF8FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: '#222222',
    borderColor: '#222222',
  },
  stepDotDone: {
    backgroundColor: '#EDE9FE',
    borderColor: C.primary,
  },
  stepDotText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#6a6a6a',
  },
  stepDotTextActive: {
    color: '#ffffff',
  },
  stepDotTextDone: {
    color: C.primary,
  },
  stepLabel: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '500',
    color: '#6a6a6a',
  },
  stepLabelActive: {
    fontWeight: '700',
    color: '#222222',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#ECEAF0',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: C.primary,
  },
  sectionHeader: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#6a6a6a',
    marginTop: 18,
    marginBottom: 10,
  },
  addMoreLink: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '700',
    color: C.primary,
  },
  uploadCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#111827',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    marginBottom: 14,
  },
  uploadTitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
  },
  uploadSub: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '400',
    color: '#6a6a6a',
    marginTop: 2,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#f2f2f2',
  },
  uploadBtnText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#222222',
  },
  fieldLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#6a6a6a',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  docsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    marginBottom: 14,
  },
  docChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#f2f2f2',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  docChipActive: {
    backgroundColor: '#222222',
  },
  docChipText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '500',
    color: '#6a6a6a',
  },
  docChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  inputWrap: {
    borderWidth: 1.2,
    borderColor: '#ECEAF0',
    borderRadius: 14,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  input: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
    color: '#222222',
    paddingVertical: 10,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 4,
    height: 44,
    marginBottom: 14,
  },
  genderBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: '#ECEAF0',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderBtnActive: {
    backgroundColor: '#222222',
    borderColor: '#222222',
  },
  genderText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#6a6a6a',
  },
  genderTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  stayRoomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  datesCard: {
    marginTop: 18,
    borderWidth: 1.2,
    borderColor: '#ECEAF0',
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#fff',
  },
  cardSectionTitle: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#6a6a6a',
  },
  rateValue: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: '#222222',
    marginTop: 2,
  },
  occupantsValue: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
    marginTop: 2,
  },
  addCoGuestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  addCoGuestPillText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
  },
  reviewCard: {
    borderWidth: 1.2,
    borderColor: '#ECEAF0',
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#fff',
  },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  reviewTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: '#222222',
  },
  editBtnText: {
    fontFamily: 'Inter',
    fontSize: 13,
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
  coGuestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  coGuestSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: '#ECEAF0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  coGuestAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coGuestAvatarText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
  },
  coGuestName: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  relationBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  relationBadgeText: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    fontWeight: '700',
    color: C.primary,
  },
  coGuestMeta: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  actionIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addGuestCard: {
    marginTop: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#111827',
    borderRadius: 18,
    padding: 14,
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
    fontSize: 14.5,
    fontWeight: '600',
    color: '#222222',
  },
  addGuestSub: {
    fontFamily: 'Inter',
    fontSize: 12.5,
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
  noRoomsCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 12,
  },
  noRoomsTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: '#991B1B',
  },
  noRoomsSub: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: '#7F1D1D',
    textAlign: 'center',
    lineHeight: 18,
  },
});
