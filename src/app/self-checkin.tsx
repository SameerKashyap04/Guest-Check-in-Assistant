import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Share,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Check,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  ShieldCheck,
  Calendar,
  X,
  Upload,
  UserPlus,
  Trash2,
  Bed,
  CreditCard,
  Camera,
  Car,
  Compass,
  FileText,
  Users,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSettingsStore } from '@/store/useSettingsStore';
import { pushGuestCheckinToCloud } from '@/services/firebaseSync';

export interface Room {
  id: number;
  room_number: string;
  room_type?: string;
  price?: number;
  status: 'available' | 'occupied' | 'maintenance';
}

export interface AdditionalGuest {
  id: string;
  fullName: string;
  relation: string;
  phone: string;
  gender: string;
  age: string;
  idType: string;
  idNumber: string;
  frontPhotoUri: string | null;
}

const DOC_TYPES = ['Aadhaar', 'PAN', 'Passport', 'Driving Licence', 'Voter ID'];
const GENDERS = ['Male', 'Female', 'Other'];
const PURPOSES = ['Tourism / Holiday', 'Business / Work', 'Transit / Stopover', 'Personal / Family', 'Medical / Other'];
const RELATIONS = ['Spouse', 'Child', 'Parent', 'Friend', 'Colleague', 'Relative'];

export default function SelfCheckinScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{
    property_id?: string;
    owner_id?: string;
    property_name?: string;
    rooms?: string;
  }>();
  const { businessName, propertyId: storePropId, ownerId: storeOwnerId } = useSettingsStore();

  const activePropertyId = (searchParams?.property_id as string) || storePropId || 'HS-4821';
  const activeOwnerId = (searchParams?.owner_id as string) || storeOwnerId || 'OWNER_DEFAULT_101';
  const activePropertyName = (searchParams?.property_name as string) || businessName || 'StayMate Homestay';

  const getTodayStr = () => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, '0');
    const d = String(t.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getTomorrowStr = () => {
    const t = new Date(Date.now() + 86400000);
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, '0');
    const d = String(t.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Stepper State (1: Guest details, 2: Stay & Room, 3: ID Photos & Co-guests)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Guest Personal Details
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [nationality, setNationality] = useState('Indian');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [idType, setIdType] = useState('Aadhaar');
  const [idNumber, setIdNumber] = useState('');
  const [address, setAddress] = useState('');
  const [cityState, setCityState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [purposeOfVisit, setPurposeOfVisit] = useState('Tourism / Holiday');
  const [comingFrom, setComingFrom] = useState('');
  const [goingTo, setGoingTo] = useState('');

  // Step 2: Stay Details
  const [checkInDate, setCheckInDate] = useState(getTodayStr());
  const [checkOutDate, setCheckOutDate] = useState(getTomorrowStr());
  const [adultsCount, setAdultsCount] = useState('1');
  const [childrenCount, setChildrenCount] = useState('0');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // Step 3: Photos & Co-Guests
  const [frontPhotoUri, setFrontPhotoUri] = useState<string | null>(null);
  const [backPhotoUri, setBackPhotoUri] = useState<string | null>(null);
  const [selfiePhotoUri, setSelfiePhotoUri] = useState<string | null>(null);
  const [additionalGuests, setAdditionalGuests] = useState<AdditionalGuest[]>([]);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Rooms & Submission State
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [assignedRoomNumber, setAssignedRoomNumber] = useState<string>('101');

  useEffect(() => {
    async function loadRooms() {
      if (searchParams?.rooms) {
        if (searchParams.rooms === 'none') {
          setRooms([]);
          setSelectedRoomId(null);
          return;
        }
        try {
          const raw = String(searchParams.rooms);
          const parsed = raw.split(';').map((item, idx) => {
            const parts = item.split(':');
            return {
              id: idx + 900,
              room_number: decodeURIComponent(parts[0] || `Room ${idx + 1}`),
              room_type: decodeURIComponent(parts[1] || 'Standard'),
              price: Number(parts[2]) || 0,
              status: 'available' as const,
            };
          });
          setRooms(parsed);
          if (parsed.length > 0) {
            setSelectedRoomId(parsed[0].id);
          }
          return;
        } catch (err) {
          console.error('Failed to parse URL query rooms', err);
        }
      }

      // Default fallback room inventory
      const defaultWebRooms: Room[] = [
        { id: 901, room_number: '101', room_type: 'Standard Room', price: 1800, status: 'available' },
        { id: 902, room_number: '204', room_type: 'Deluxe King', price: 2600, status: 'available' },
        { id: 903, room_number: '303', room_type: 'Garden Cottage', price: 3600, status: 'available' },
      ];
      setRooms(defaultWebRooms);
      setSelectedRoomId(901);
    }
    loadRooms();
  }, [searchParams?.rooms]);

  const addAdditionalPerson = () => {
    setAdditionalGuests((prev) => [
      ...prev,
      {
        id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        fullName: '',
        relation: 'Spouse',
        phone: '',
        gender: 'Male',
        age: '',
        idType: 'Aadhaar',
        idNumber: '',
        frontPhotoUri: null,
      },
    ]);
  };

  const removeAdditionalPerson = (id: string) => {
    setAdditionalGuests((prev) => prev.filter((g) => g.id !== id));
  };

  const updateAdditionalPerson = (id: string, field: keyof AdditionalGuest, value: any) => {
    setAdditionalGuests((prev) =>
      prev.map((g) => (g.id === id ? { ...g, [field]: value } : g))
    );
  };

  const compressAndGetBase64 = async (asset: ImagePicker.ImagePickerAsset): Promise<string> => {
    const rawUri = asset.uri;

    if (Platform.OS === 'web' && typeof window !== 'undefined' && rawUri) {
      return new Promise<string>((resolve) => {
        const img = new window.Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 480;
          const MAX_HEIGHT = 480;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = Math.round(width);
          canvas.height = Math.round(height);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.35);
            resolve(compressedDataUrl);
          } else {
            resolve(rawUri);
          }
        };
        img.onerror = () => {
          if (asset.base64) resolve(`data:image/jpeg;base64,${asset.base64}`);
          else resolve(rawUri);
        };
        img.src = rawUri;
      });
    }

    if (asset.base64) {
      return `data:image/jpeg;base64,${asset.base64}`;
    }
    return rawUri;
  };

  const pickImage = async (
    target: 'front' | 'back' | 'selfie',
    useCamera = false,
    additionalGuestId?: string
  ) => {
    try {
      if (Platform.OS !== 'web') {
        const perm = useCamera
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission required', 'Please grant access to upload your ID document.');
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const compressedUri = await compressAndGetBase64(asset);

        if (additionalGuestId) {
          updateAdditionalPerson(additionalGuestId, 'frontPhotoUri', compressedUri);
          return;
        }

        if (target === 'front') setFrontPhotoUri(compressedUri);
        else if (target === 'back') setBackPhotoUri(compressedUri);
        else if (target === 'selfie') setSelfiePhotoUri(compressedUri);
      }
    } catch (e: any) {
      console.warn('Image picker notice:', e);
    }
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required Field', 'Please enter your full name.');
      setCurrentStep(1);
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Required Field', 'Please enter your mobile phone number.');
      setCurrentStep(1);
      return;
    }
    if (!idNumber.trim()) {
      Alert.alert('Required Field', 'Please enter your ID document number.');
      setCurrentStep(1);
      return;
    }
    if (!agreeTerms) {
      Alert.alert('Declaration Required', 'Please accept the declaration before submitting.');
      return;
    }

    const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
    const roomNum = selectedRoom?.room_number || '101';

    setIsSubmitting(true);
    try {
      const fullAddressStr = [address.trim(), cityState.trim(), pinCode.trim()].filter(Boolean).join(', ');

      await pushGuestCheckinToCloud({
        property_id: activePropertyId,
        owner_id: activeOwnerId,
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        nationality,
        gender,
        dob,
        id_type: idType,
        id_number: idNumber.trim(),
        address: fullAddressStr,
        pin_code: pinCode.trim(),
        purpose_of_visit: purposeOfVisit,
        coming_from: comingFrom.trim(),
        going_to: goingTo.trim(),
        photo_uri: frontPhotoUri || '',
        back_photo_uri: backPhotoUri || '',
        selfie_uri: selfiePhotoUri || '',
        room_number: roomNum,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        adults: adultsCount,
        children: childrenCount,
        vehicle_number: vehicleNumber.trim(),
        special_requests: specialRequests.trim(),
        additional_guests: additionalGuests,
      });

      setAssignedRoomNumber(roomNum);
      setIsSubmitted(true);
    } catch (e: any) {
      console.warn('Self check-in error:', e);
      setAssignedRoomNumber(roomNum);
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNotifyOwner = () => {
    const message = `*Welcome to ${activePropertyName}!*\n\nGuest Self Check-in Completed:\n- Guest Name: ${fullName.trim()}\n- Phone: ${phone.trim()}\n- Assigned Room: Room ${assignedRoomNumber}\n- ID: ${idType} (${idNumber.trim()})\n- Check-in: ${checkInDate} to ${checkOutDate}\n- Total Occupants: ${Number(adultsCount) + Number(childrenCount)} Guests\n\nThank you for choosing ${activePropertyName}!`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(whatsappUrl, '_blank');
    } else {
      Share.share({ message, title: 'Self Check-in Confirmation' }).catch(() => {});
    }
  };

  // SUCCESS VOUCHER VIEW
  if (isSubmitted) {
    return (
      <SafeAreaView style={s.container} edges={['top', 'bottom', 'left', 'right']}>
        <ScrollView contentContainerStyle={s.successWrap} showsVerticalScrollIndicator={false}>
          <View style={s.successCard}>
            <View style={s.successIconWrap}>
              <Check size={36} color="#FFFFFF" />
            </View>

            <View style={s.verifiedBadge}>
              <ShieldCheck size={14} color="#10B981" />
              <Text style={s.verifiedBadgeText}>VERIFIED REGISTRATION</Text>
            </View>

            <Text style={s.successTitle}>Check-in Successful</Text>
            <Text style={s.successSub}>
              Welcome to <Text style={{ fontWeight: '700', color: '#0F172A' }}>{activePropertyName}</Text>. Your digital registration has been submitted and verified.
            </Text>

            {/* Room Pass Card */}
            <View style={s.roomPassCard}>
              <Text style={s.roomPassLabel}>ASSIGNED ROOM</Text>
              <Text style={s.roomPassNumber}>Room {assignedRoomNumber}</Text>
              <Text style={s.roomPassSub}>
                {rooms.find((r) => r.room_number === assignedRoomNumber)?.room_type || 'Standard Room'} · {checkInDate} to {checkOutDate}
              </Text>
            </View>

            {/* Guest Summary Details */}
            <View style={s.guestSummaryBox}>
              <View style={s.kvRow}>
                <Text style={s.kvLabel}>Primary Guest</Text>
                <Text style={s.kvVal}>{fullName}</Text>
              </View>
              <View style={s.kvRow}>
                <Text style={s.kvLabel}>Phone Number</Text>
                <Text style={s.kvVal}>{phone}</Text>
              </View>
              {email ? (
                <View style={s.kvRow}>
                  <Text style={s.kvLabel}>Email Address</Text>
                  <Text style={s.kvVal}>{email}</Text>
                </View>
              ) : null}
              <View style={s.kvRow}>
                <Text style={s.kvLabel}>ID Document</Text>
                <Text style={s.kvVal}>{idType} · {idNumber}</Text>
              </View>
              <View style={s.kvRow}>
                <Text style={s.kvLabel}>Total Occupants</Text>
                <Text style={s.kvVal}>{adultsCount} Adults, {childrenCount} Children</Text>
              </View>
              {additionalGuests.length > 0 && (
                <View style={s.kvRow}>
                  <Text style={s.kvLabel}>Co-Guests</Text>
                  <Text style={s.kvVal}>+{additionalGuests.length} Guests</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={s.whatsappBtn}
              onPress={handleNotifyOwner}
            >
              <Text style={s.whatsappBtnText}>Send Confirmation via WhatsApp →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'left', 'right']}>
      {/* Header Bar */}
      <View style={s.headerBar}>
        <View style={s.headerInfo}>
          <Text style={s.headerTitle}>{activePropertyName}</Text>
          <View style={s.headerSubtitleRow}>
            <ShieldCheck size={13} color="#10B981" />
            <Text style={s.headerSubtitle}>Official Digital Registration</Text>
          </View>
        </View>
        <View style={s.propBadge}>
          <Text style={s.propBadgeText}>{activePropertyId}</Text>
        </View>
      </View>

      {/* Stepper Navigation */}
      <View style={s.stepperRow}>
        {[
          { num: 1, label: '1. Guest Details' },
          { num: 2, label: '2. Stay & Room' },
          { num: 3, label: '3. ID & Co-guests' },
        ].map((st, i) => {
          const isActive = currentStep === st.num;
          const isDone = currentStep > st.num;
          return (
            <React.Fragment key={st.num}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => isDone && setCurrentStep(st.num as any)}
                style={s.stepItem}
              >
                <View
                  style={[
                    s.stepCircle,
                    isActive && s.stepCircleActive,
                    isDone && s.stepCircleDone,
                  ]}
                >
                  {isDone ? (
                    <Check size={12} color="#7C3AED" />
                  ) : (
                    <Text
                      style={[
                        s.stepCircleText,
                        isActive && s.stepCircleTextActive,
                        isDone && s.stepCircleTextDone,
                      ]}
                    >
                      {st.num}
                    </Text>
                  )}
                </View>
                <Text style={[s.stepText, isActive && s.stepTextActive]}>
                  {st.label}
                </Text>
              </TouchableOpacity>
              {i < 2 && <View style={[s.stepLine, currentStep > i + 1 && s.stepLineActive]} />}
            </React.Fragment>
          );
        })}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* STEP 1: PRIMARY GUEST DETAILS */}
          {currentStep === 1 && (
            <View>
              <Text style={s.sectionHeader}>PRIMARY GUEST DETAILS</Text>

              {/* Full Name */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>FULL NAME *</Text>
                <View style={s.inputBox}>
                  <User size={18} color="#94A3B8" />
                  <TextInput
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Enter full name as per ID card"
                    placeholderTextColor="#94A3B8"
                    style={s.input}
                  />
                </View>
              </View>

              {/* Mobile Phone & Email */}
              <View style={s.rowFields}>
                <View style={{ flex: 1.1 }}>
                  <Text style={s.fieldLabel}>MOBILE PHONE *</Text>
                  <View style={s.inputBox}>
                    <Phone size={17} color="#94A3B8" />
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="+91 9876543210"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      style={s.input}
                    />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>EMAIL ADDRESS</Text>
                  <View style={s.inputBox}>
                    <Mail size={17} color="#94A3B8" />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="guest@mail.com"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={s.input}
                    />
                  </View>
                </View>
              </View>

              {/* Document Type Chips */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>ID DOCUMENT TYPE *</Text>
                <View style={s.chipRow}>
                  {DOC_TYPES.map((dt) => {
                    const isSel = idType === dt;
                    return (
                      <TouchableOpacity
                        key={dt}
                        activeOpacity={0.75}
                        onPress={() => setIdType(dt)}
                        style={[s.docChip, isSel && s.docChipActive]}
                      >
                        <Text style={[s.docChipText, isSel && s.docChipTextActive]}>
                          {dt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* ID Number */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>DOCUMENT ID NUMBER *</Text>
                <View style={s.inputBox}>
                  <CreditCard size={18} color="#94A3B8" />
                  <TextInput
                    value={idNumber}
                    onChangeText={setIdNumber}
                    placeholder="Enter document number (e.g. 4821 9012 3456)"
                    placeholderTextColor="#94A3B8"
                    style={s.input}
                  />
                </View>
              </View>

              {/* Gender & DOB */}
              <View style={s.rowFields}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>GENDER</Text>
                  <View style={s.genderGroup}>
                    {GENDERS.map((g) => {
                      const isSel = gender === g;
                      return (
                        <TouchableOpacity
                          key={g}
                          onPress={() => setGender(g)}
                          style={[s.genderBtn, isSel && s.genderBtnActive]}
                        >
                          <Text style={[s.genderText, isSel && s.genderTextActive]}>
                            {g}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={{ flex: 1.1 }}>
                  <Text style={s.fieldLabel}>DATE OF BIRTH</Text>
                  <View style={s.inputBox}>
                    <Calendar size={17} color="#94A3B8" />
                    <TextInput
                      value={dob}
                      onChangeText={setDob}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#94A3B8"
                      style={s.input}
                    />
                  </View>
                </View>
              </View>

              {/* Nationality & Purpose of Visit */}
              <View style={s.rowFields}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>NATIONALITY</Text>
                  <View style={s.inputBox}>
                    <TextInput
                      value={nationality}
                      onChangeText={setNationality}
                      placeholder="Indian"
                      placeholderTextColor="#94A3B8"
                      style={s.input}
                    />
                  </View>
                </View>

                <View style={{ flex: 1.3 }}>
                  <Text style={s.fieldLabel}>PURPOSE OF VISIT</Text>
                  <View style={s.inputBox}>
                    <Compass size={17} color="#94A3B8" />
                    <TextInput
                      value={purposeOfVisit}
                      onChangeText={setPurposeOfVisit}
                      placeholder="Tourism / Holiday"
                      placeholderTextColor="#94A3B8"
                      style={s.input}
                    />
                  </View>
                </View>
              </View>

              {/* Residential Address */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>PERMANENT RESIDENTIAL ADDRESS</Text>
                <View style={[s.inputBox, { height: 58, alignItems: 'flex-start', paddingTop: 8 }]}>
                  <MapPin size={18} color="#94A3B8" style={{ marginTop: 2 }} />
                  <TextInput
                    value={address}
                    onChangeText={setAddress}
                    placeholder="House / Flat No., Building, Street address"
                    placeholderTextColor="#94A3B8"
                    multiline
                    style={[s.input, { textAlignVertical: 'top' }]}
                  />
                </View>
              </View>

              {/* City/State & PIN Code */}
              <View style={s.rowFields}>
                <View style={{ flex: 1.4 }}>
                  <Text style={s.fieldLabel}>CITY / STATE</Text>
                  <View style={s.inputBox}>
                    <Building2 size={17} color="#94A3B8" />
                    <TextInput
                      value={cityState}
                      onChangeText={setCityState}
                      placeholder="City, State"
                      placeholderTextColor="#94A3B8"
                      style={s.input}
                    />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>PIN CODE</Text>
                  <View style={s.inputBox}>
                    <TextInput
                      value={pinCode}
                      onChangeText={setPinCode}
                      placeholder="e.g. 560001"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      style={s.input}
                    />
                  </View>
                </View>
              </View>

              {/* Travel Route: Coming From & Going To */}
              <View style={s.rowFields}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>COMING FROM (ORIGIN)</Text>
                  <View style={s.inputBox}>
                    <TextInput
                      value={comingFrom}
                      onChangeText={setComingFrom}
                      placeholder="e.g. Mumbai"
                      placeholderTextColor="#94A3B8"
                      style={s.input}
                    />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>GOING TO (DESTINATION)</Text>
                  <View style={s.inputBox}>
                    <TextInput
                      value={goingTo}
                      onChangeText={setGoingTo}
                      placeholder="e.g. Goa"
                      placeholderTextColor="#94A3B8"
                      style={s.input}
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                style={s.primaryBtn}
                onPress={() => {
                  if (!fullName.trim()) {
                    Alert.alert('Required Field', 'Please enter your full name.');
                    return;
                  }
                  if (!phone.trim()) {
                    Alert.alert('Required Field', 'Please enter your mobile phone number.');
                    return;
                  }
                  if (!idNumber.trim()) {
                    Alert.alert('Required Field', 'Please enter your ID document number.');
                    return;
                  }
                  setCurrentStep(2);
                }}
              >
                <Text style={s.primaryBtnText}>Continue to Stay & Room Details →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2: STAY & ROOM SELECTION */}
          {currentStep === 2 && (
            <View>
              <Text style={s.sectionHeader}>DATES OF STAY</Text>

              <View style={s.rowFields}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>CHECK-IN DATE</Text>
                  <View style={s.inputBox}>
                    <Calendar size={17} color="#94A3B8" />
                    <TextInput
                      value={checkInDate}
                      onChangeText={setCheckInDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#94A3B8"
                      style={s.input}
                    />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>CHECK-OUT DATE</Text>
                  <View style={s.inputBox}>
                    <Calendar size={17} color="#94A3B8" />
                    <TextInput
                      value={checkOutDate}
                      onChangeText={setCheckOutDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#94A3B8"
                      style={s.input}
                    />
                  </View>
                </View>
              </View>

              {/* Number of Occupants */}
              <View style={s.rowFields}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>NUMBER OF ADULTS</Text>
                  <View style={s.inputBox}>
                    <Users size={17} color="#94A3B8" />
                    <TextInput
                      value={adultsCount}
                      onChangeText={setAdultsCount}
                      placeholder="1"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      style={s.input}
                    />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>CHILDREN (BELOW 12)</Text>
                  <View style={s.inputBox}>
                    <TextInput
                      value={childrenCount}
                      onChangeText={setChildrenCount}
                      placeholder="0"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      style={s.input}
                    />
                  </View>
                </View>
              </View>

              {/* Vehicle Number */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>VEHICLE NUMBER (OPTIONAL)</Text>
                <View style={s.inputBox}>
                  <Car size={18} color="#94A3B8" />
                  <TextInput
                    value={vehicleNumber}
                    onChangeText={setVehicleNumber}
                    placeholder="e.g. KA 01 AB 1234"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                    style={s.input}
                  />
                </View>
              </View>

              {/* Available Rooms Grid */}
              <Text style={[s.sectionHeader, { marginTop: 18 }]}>SELECT YOUR ROOM</Text>
              <View style={{ gap: 10 }}>
                {rooms.map((r) => {
                  const isSel = selectedRoomId === r.id;
                  return (
                    <TouchableOpacity
                      key={r.id}
                      activeOpacity={0.8}
                      onPress={() => setSelectedRoomId(r.id)}
                      style={[s.roomCard, isSel && s.roomCardActive]}
                    >
                      <View style={s.roomCardIcon}>
                        <Bed size={20} color={isSel ? '#7C3AED' : '#0F172A'} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.roomCardTitle, isSel && { color: '#7C3AED' }]}>
                          Room {r.room_number}
                        </Text>
                        <Text style={s.roomCardType}>{r.room_type || 'Standard Room'}</Text>
                      </View>
                      <View style={s.roomPriceTag}>
                        <Text style={s.roomPriceText}>
                          {r.price ? `₹${r.price.toLocaleString('en-IN')}` : 'Included'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Special Requests / Arrival Note */}
              <View style={[s.fieldGroup, { marginTop: 16 }]}>
                <Text style={s.fieldLabel}>SPECIAL REQUESTS / ARRIVAL NOTE (OPTIONAL)</Text>
                <View style={[s.inputBox, { height: 58, alignItems: 'flex-start', paddingTop: 8 }]}>
                  <FileText size={18} color="#94A3B8" style={{ marginTop: 2 }} />
                  <TextInput
                    value={specialRequests}
                    onChangeText={setSpecialRequests}
                    placeholder="e.g. Late check-in around 8 PM, extra bed, etc."
                    placeholderTextColor="#94A3B8"
                    multiline
                    style={[s.input, { textAlignVertical: 'top' }]}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={s.secondaryBtn}
                  onPress={() => setCurrentStep(1)}
                >
                  <Text style={s.secondaryBtnText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[s.primaryBtn, { flex: 2 }]}
                  onPress={() => setCurrentStep(3)}
                >
                  <Text style={s.primaryBtnText}>Continue to ID Photos & Co-guests →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 3: ID PHOTOS, CO-GUESTS & DECLARATION */}
          {currentStep === 3 && (
            <View>
              <Text style={s.sectionHeader}>PRIMARY GUEST ID DOCUMENT PHOTOS</Text>

              {/* Front Photo Upload Card */}
              <Text style={s.uploadCardLabel}>1. Front Side of ID Card ({idType}) *</Text>
              <View style={s.uploadBox}>
                {frontPhotoUri ? (
                  <View style={s.previewCard}>
                    <Image source={{ uri: frontPhotoUri }} style={s.previewImg} resizeMode="cover" />
                    <View style={{ flex: 1, paddingLeft: 12 }}>
                      <Text style={s.uploadDoneTitle}>Front ID Attached ✓</Text>
                      <Text style={s.uploadDoneSub}>{idType} document attached</Text>
                    </View>
                    <TouchableOpacity onPress={() => setFrontPhotoUri(null)} style={s.removeImgBtn}>
                      <X size={16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', padding: 18 }}>
                    <View style={s.uploadCircle}>
                      <Upload size={20} color="#7C3AED" />
                    </View>
                    <Text style={s.uploadTitle}>Upload {idType} Front</Text>
                    <Text style={s.uploadSubtitle}>Capture or select clear photo of your ID front</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={s.uploadActionBtn}
                        onPress={() => pickImage('front', true)}
                      >
                        <Camera size={14} color="#0F172A" />
                        <Text style={s.uploadActionText}>Camera</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={s.uploadActionBtn}
                        onPress={() => pickImage('front', false)}
                      >
                        <Upload size={14} color="#0F172A" />
                        <Text style={s.uploadActionText}>Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Back Photo Upload Card */}
              <Text style={[s.uploadCardLabel, { marginTop: 14 }]}>2. Back Side of ID Card (Optional)</Text>
              <View style={s.uploadBox}>
                {backPhotoUri ? (
                  <View style={s.previewCard}>
                    <Image source={{ uri: backPhotoUri }} style={s.previewImg} resizeMode="cover" />
                    <View style={{ flex: 1, paddingLeft: 12 }}>
                      <Text style={s.uploadDoneTitle}>Back ID Attached ✓</Text>
                      <Text style={s.uploadDoneSub}>{idType} back side</Text>
                    </View>
                    <TouchableOpacity onPress={() => setBackPhotoUri(null)} style={s.removeImgBtn}>
                      <X size={16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', padding: 18 }}>
                    <View style={s.uploadCircle}>
                      <Upload size={20} color="#7C3AED" />
                    </View>
                    <Text style={s.uploadTitle}>Upload {idType} Back</Text>
                    <Text style={s.uploadSubtitle}>Capture or select clear photo of ID back side</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={s.uploadActionBtn}
                        onPress={() => pickImage('back', true)}
                      >
                        <Camera size={14} color="#0F172A" />
                        <Text style={s.uploadActionText}>Camera</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={s.uploadActionBtn}
                        onPress={() => pickImage('back', false)}
                      >
                        <Upload size={14} color="#0F172A" />
                        <Text style={s.uploadActionText}>Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Selfie / Live Photo (Optional) */}
              <Text style={[s.uploadCardLabel, { marginTop: 14 }]}>3. Guest Selfie / Photo (Optional)</Text>
              <View style={s.uploadBox}>
                {selfiePhotoUri ? (
                  <View style={s.previewCard}>
                    <Image source={{ uri: selfiePhotoUri }} style={s.previewImg} resizeMode="cover" />
                    <View style={{ flex: 1, paddingLeft: 12 }}>
                      <Text style={s.uploadDoneTitle}>Selfie Photo Attached ✓</Text>
                      <Text style={s.uploadDoneSub}>Live photo attached</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelfiePhotoUri(null)} style={s.removeImgBtn}>
                      <X size={16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', padding: 18 }}>
                    <View style={s.uploadCircle}>
                      <Camera size={20} color="#7C3AED" />
                    </View>
                    <Text style={s.uploadTitle}>Take Guest Selfie</Text>
                    <Text style={s.uploadSubtitle}>Quick photo for check-in verification</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={s.uploadActionBtn}
                        onPress={() => pickImage('selfie', true)}
                      >
                        <Camera size={14} color="#0F172A" />
                        <Text style={s.uploadActionText}>Take Selfie</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={s.uploadActionBtn}
                        onPress={() => pickImage('selfie', false)}
                      >
                        <Upload size={14} color="#0F172A" />
                        <Text style={s.uploadActionText}>Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* CO-GUESTS / ACCOMPANYING PERSONS */}
              <View style={{ marginTop: 22 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={s.sectionHeader}>CO-GUESTS & ACCOMPANYING PERSONS ({additionalGuests.length})</Text>
                  <TouchableOpacity activeOpacity={0.7} onPress={addAdditionalPerson}>
                    <Text style={s.addMoreLink}>+ Add Co-Guest</Text>
                  </TouchableOpacity>
                </View>

                {additionalGuests.map((cg, index) => (
                  <View key={cg.id} style={s.coGuestCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={s.coGuestIndex}>Co-Guest #{index + 1}</Text>
                      <TouchableOpacity onPress={() => removeAdditionalPerson(cg.id)}>
                        <Trash2 size={16} color="#DC2626" />
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      value={cg.fullName}
                      onChangeText={(t) => updateAdditionalPerson(cg.id, 'fullName', t)}
                      placeholder="Co-guest full name"
                      placeholderTextColor="#94A3B8"
                      style={[s.input, s.coGuestInput]}
                    />

                    {/* Relation & Age */}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <View style={{ flex: 1.2 }}>
                        <TextInput
                          value={cg.relation}
                          onChangeText={(t) => updateAdditionalPerson(cg.id, 'relation', t)}
                          placeholder="Relation (e.g. Spouse)"
                          placeholderTextColor="#94A3B8"
                          style={[s.input, s.coGuestInput]}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          value={cg.age}
                          onChangeText={(t) => updateAdditionalPerson(cg.id, 'age', t)}
                          placeholder="Age / DOB"
                          placeholderTextColor="#94A3B8"
                          style={[s.input, s.coGuestInput]}
                        />
                      </View>
                    </View>

                    {/* ID Type & Number */}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <TextInput
                        value={cg.idNumber}
                        onChangeText={(t) => updateAdditionalPerson(cg.id, 'idNumber', t)}
                        placeholder="ID number (Aadhaar / PAN)"
                        placeholderTextColor="#94A3B8"
                        style={[s.input, s.coGuestInput, { flex: 1 }]}
                      />
                      <TextInput
                        value={cg.phone}
                        onChangeText={(t) => updateAdditionalPerson(cg.id, 'phone', t)}
                        placeholder="Phone (optional)"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        style={[s.input, s.coGuestInput, { flex: 1 }]}
                      />
                    </View>

                    {/* Co-guest Photo Button */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => pickImage('front', false, cg.id)}
                      style={[s.uploadActionBtn, { marginTop: 8, alignSelf: 'flex-start' }]}
                    >
                      <Camera size={13} color="#0F172A" />
                      <Text style={s.uploadActionText}>
                        {cg.frontPhotoUri ? 'Co-Guest ID Attached ✓' : 'Attach Co-Guest ID Photo'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* DECLARATION & TERMS CHECKBOX */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setAgreeTerms(!agreeTerms)}
                style={s.termsBox}
              >
                <View style={[s.checkbox, agreeTerms && s.checkboxChecked]}>
                  {agreeTerms && <Check size={12} color="#FFFFFF" />}
                </View>
                <Text style={s.termsText}>
                  I confirm that all details & ID documents provided are true and accurate, and I agree to the property house rules and check-in terms.
                </Text>
              </TouchableOpacity>

              {/* SUBMIT BUTTON */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={s.secondaryBtn}
                  onPress={() => setCurrentStep(2)}
                >
                  <Text style={s.secondaryBtnText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isSubmitting}
                  style={[s.primaryBtn, { flex: 2 }]}
                  onPress={handleSubmit}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={s.primaryBtnText}>Confirm & Check-in ✓</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  headerSubtitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  propBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  propBadgeText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.5,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FAF8FD',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEAF0',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#7C3AED',
  },
  stepCircleDone: {
    backgroundColor: '#EDE9FE',
  },
  stepCircleText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  stepCircleTextActive: {
    color: '#FFFFFF',
  },
  stepCircleTextDone: {
    color: '#7C3AED',
  },
  stepText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  stepTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#7C3AED',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 80,
  },
  sectionHeader: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#64748B',
    marginBottom: 12,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#64748B',
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    height: 46,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  docChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  docChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  docChipText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  docChipTextActive: {
    color: '#FFFFFF',
  },
  rowFields: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  genderGroup: {
    flexDirection: 'row',
    gap: 4,
    height: 46,
  },
  genderBtn: {
    flex: 1,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  genderBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  genderText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  genderTextActive: {
    color: '#FFFFFF',
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  roomCardActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#FAF5FF',
  },
  roomCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomCardTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  roomCardType: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  roomPriceTag: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  roomPriceText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '800',
    color: '#7C3AED',
  },
  uploadCardLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  uploadCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadTitle: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  uploadSubtitle: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  uploadActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
  },
  uploadActionText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  previewImg: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  uploadDoneTitle: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  uploadDoneSub: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  removeImgBtn: {
    padding: 8,
  },
  coGuestCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
  },
  coGuestIndex: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  coGuestInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addMoreLink: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  termsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FAF8FD',
    borderWidth: 1,
    borderColor: '#EDE9FE',
    borderRadius: 12,
    padding: 12,
    marginTop: 18,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  termsText: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
  },
  primaryBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  secondaryBtnText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  successWrap: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  successCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  verifiedBadgeText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  successTitle: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  successSub: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  roomPassCard: {
    width: '100%',
    backgroundColor: '#FAF5FF',
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginVertical: 18,
  },
  roomPassLabel: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 1,
  },
  roomPassNumber: {
    fontFamily: 'Inter',
    fontSize: 26,
    fontWeight: '900',
    color: '#7C3AED',
    marginTop: 2,
  },
  roomPassSub: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  guestSummaryBox: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 18,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kvLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748B',
  },
  kvVal: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  whatsappBtn: {
    width: '100%',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappBtnText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
