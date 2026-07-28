import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Platform, KeyboardAvoidingView, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/GlassCard';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { ChevronLeft, Camera, Image as ImageIcon, CheckCircle2, User, IdCard, Phone, MapPin, Building2, Sparkles, ShieldCheck, DoorOpen, Calendar, X, Link2, UploadCloud, CreditCard, AlertCircle, UserPlus, Trash2 } from 'lucide-react-native';
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
  phone: string;
  gender: string;
  dob: string;
  idType: string;
  idNumber: string;
  frontPhotoUri: string | null;
  backPhotoUri: string | null;
  selfiePhotoUri: string | null;
}

export default function SelfCheckinScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ property_id?: string; owner_id?: string; property_name?: string; rooms?: string }>();
  const { businessName, propertyId: storePropId, ownerId: storeOwnerId } = useSettingsStore();

  const activePropertyId = (searchParams?.property_id as string) || storePropId || 'DEFAULT-HOMESTAY';
  const activeOwnerId = (searchParams?.owner_id as string) || storeOwnerId || 'OWNER_DEFAULT_101';
  const activePropertyName = (searchParams?.property_name as string) || businessName || 'Homestay Property';

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [idType, setIdType] = useState('Aadhaar');
  const [idNumber, setIdNumber] = useState('');
  const [address, setAddress] = useState('');
  const [pinCode, setPinCode] = useState('');

  // Additional Guests State (Family / Group Check-in)
  const [additionalGuests, setAdditionalGuests] = useState<AdditionalGuest[]>([]);

  // Photos State
  const [frontPhotoUri, setFrontPhotoUri] = useState<string | null>(null);
  const [backPhotoUri, setBackPhotoUri] = useState<string | null>(null);
  const [selfiePhotoUri, setSelfiePhotoUri] = useState<string | null>(null); // OPTIONAL SELFIE

  const addAdditionalPerson = () => {
    setAdditionalGuests(prev => [
      ...prev,
      {
        id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        fullName: '',
        phone: '',
        gender: 'Male',
        dob: '',
        idType: 'Aadhaar',
        idNumber: '',
        frontPhotoUri: null,
        backPhotoUri: null,
        selfiePhotoUri: null,
      }
    ]);
  };

  const removeAdditionalPerson = (id: string) => {
    setAdditionalGuests(prev => prev.filter(g => g.id !== id));
  };

  const updateAdditionalPerson = (id: string, field: keyof AdditionalGuest, value: any) => {
    setAdditionalGuests(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  // Rooms & Submission State
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [assignedRoomNumber, setAssignedRoomNumber] = useState<string>('');

  useEffect(() => {
    async function loadRooms() {
      // 1. Check if rooms are passed in URL search params from owner link
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
              room_number: decodeURIComponent(parts[0] || `Room ${idx+1}`),
              room_type: decodeURIComponent(parts[1] || 'Standard'),
              price: Number(parts[2]) || 0,
              status: 'available' as const
            };
          });
          setRooms(parsed);
          if (parsed.length > 0) {
            setSelectedRoomId(parsed[0].id);
          } else {
            setSelectedRoomId(null);
          }
          return;
        } catch (err) {
          console.error('Failed to parse URL query rooms', err);
        }
      }

      // 2. Fetch from DB (Native Mobile Devices)
      if (Platform.OS !== 'web') {
        try {
          const { getRooms } = require('@/database/rooms');
          let availableRooms = await getRooms();
          let avail = availableRooms.filter((r: any) => r.status === 'available');
          setRooms(avail);
          if (avail.length > 0) {
            setSelectedRoomId(avail[0].id);
          } else {
            setSelectedRoomId(null);
          }
          return;
        } catch (e) {
          console.error('Failed to load rooms for self check-in', e);
        }
      }

      // Default Web Fallback Room
      const defaultWebRooms: Room[] = [
        { id: 901, room_number: '101', room_type: 'Standard', price: 0, status: 'available' }
      ];
      setRooms(defaultWebRooms);
      setSelectedRoomId(901);
    }
    loadRooms();
  }, [searchParams?.rooms]);

  const handleNotifyOwner = () => {
    const payload = JSON.stringify({
      fullName: fullName.trim(),
      phone: phone.trim(),
      idType: idType,
      idNumber: idNumber.trim(),
      address: address.trim(),
      pinCode: pinCode.trim(),
      roomNumber: assignedRoomNumber,
      propertyId: activePropertyId
    });

    const message = `🏡 *New Guest Self Check-in Submission*\n---------------------------------\n*Property:* ${activePropertyName} (ID: ${activePropertyId})\n*Guest Name:* ${fullName.trim()}\n*Phone:* ${phone.trim()}\n*Assigned Room:* Room ${assignedRoomNumber}\n*ID Type:* ${idType} (${idNumber.trim()})\n*Address:* ${address.trim()} (${pinCode.trim()})\n*Date:* ${new Date().toLocaleDateString()}\n\n📋 *IMPORT CODE FOR OWNER APP:*\n#GUEST_IMPORT_DATA:${payload}#\n\nVerified Online Check-in`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(whatsappUrl, '_blank');
    } else {
      Share.share({ message, title: 'Self Check-in Submission' }).catch(() => {});
    }
  };

  const compressAndGetBase64 = async (asset: ImagePicker.ImagePickerAsset): Promise<string> => {
    const rawUri = asset.uri;

    // Web Canvas Downscaler to keep Firestore payload ~25KB per image
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

  const pickImage = async (target: 'front' | 'back' | 'selfie', useCamera = false, additionalGuestId?: string) => {
    try {
      let result;
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.2,
        base64: true,
        allowsEditing: target === 'selfie',
      };

      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Denied', 'Gallery permission is required to select photos.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const portableUri = await compressAndGetBase64(result.assets[0]);
        if (additionalGuestId) {
          const fieldName = target === 'front' ? 'frontPhotoUri' : target === 'back' ? 'backPhotoUri' : 'selfiePhotoUri';
          updateAdditionalPerson(additionalGuestId, fieldName, portableUri);
        } else {
          if (target === 'front') setFrontPhotoUri(portableUri);
          if (target === 'back') setBackPhotoUri(portableUri);
          if (target === 'selfie') setSelfiePhotoUri(portableUri);
        }
      }
    } catch (e) {
      console.error('Image picker error', e);
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      showAlert('Required Field', 'Please enter your Full Name.');
      return;
    }
    if (!phone.trim()) {
      showAlert('Required Field', 'Please enter your Mobile Phone Number.');
      return;
    }
    if (!idNumber.trim()) {
      showAlert('Required Field', `Please enter your ${idType} Number.`);
      return;
    }

    // Additional guests validation
    for (let i = 0; i < additionalGuests.length; i++) {
      if (!additionalGuests[i].fullName.trim()) {
        showAlert('Required Field', `Please enter Full Name for Person ${i + 2}.`);
        return;
      }
    }

    if (rooms.length === 0) {
      showAlert('No Rooms Available', 'Sorry, all rooms are currently occupied or unavailable for online check-in. Please contact the homestay owner.');
      return;
    }

    const activeRooms = rooms;
    const effectiveRoomId = selectedRoomId || (activeRooms.length > 0 ? activeRooms[0].id : 0);
    const selectedRoom = activeRooms.find(r => r.id === effectiveRoomId) || activeRooms[0];
    const roomNum = selectedRoom ? selectedRoom.room_number : 'N/A';
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      setIsSubmitting(true);

      // 1. Local SQLite store (Native Mobile Only)
      if (Platform.OS !== 'web') {
        try {
          const { createGuestAndStay } = require('@/database/stays');
          await createGuestAndStay(
            {
              full_name: fullName.trim(),
              id_number: idNumber.trim(),
              address: address.trim(),
              phone: phone.trim(),
              photo_uri: frontPhotoUri || '',
              back_photo_uri: backPhotoUri || '',
              selfie_uri: selfiePhotoUri || '',
              property_id: activePropertyId,
              id_type: idType,
              dob: dob.trim(),
              gender: gender,
              pin_code: pinCode.trim(),
            },
            {
              room_id: effectiveRoomId,
              check_in_date: todayStr,
              check_out_date: todayStr,
            }
          );
        } catch (localDbErr) {
          console.warn('Local SQLite storage skipped on web:', localDbErr);
        }
      }

      // 2. Real-time Firebase Cloud Push
      try {
        await pushGuestCheckinToCloud({
          property_id: activePropertyId,
          owner_id: activeOwnerId,
          full_name: fullName.trim(),
          phone: phone.trim(),
          id_type: idType,
          id_number: idNumber.trim(),
          address: address.trim(),
          pin_code: pinCode.trim(),
          gender: gender,
          dob: dob.trim(),
          photo_uri: frontPhotoUri || '',
          back_photo_uri: backPhotoUri || '',
          selfie_uri: selfiePhotoUri || '',
          room_number: roomNum,
          check_in_date: todayStr,
          additional_guests: additionalGuests,
        });
      } catch (cloudErr) {
        console.warn('Cloud sync push warning:', cloudErr);
      }

      setAssignedRoomNumber(roomNum);
      setIsSubmitted(true);
    } catch (e: any) {
      console.error('Self check-in submission error', e);
      showAlert('Submission Error', e?.message || 'Failed to complete self check-in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background justify-center p-6">
        <GlassCard className="p-8 items-center rounded-3xl border border-emerald-500/30">
          <View className="w-20 h-20 bg-emerald-500/20 rounded-full items-center justify-center mb-6">
            <CheckCircle2 size={44} color="#10B981" />
          </View>

          <Text className="text-2xl font-extrabold text-foreground text-center">Self Check-in Successful!</Text>
          <Text className="text-sm text-gray-500 text-center mt-2 mb-6">
            Welcome to <Text className="font-bold text-foreground">{activePropertyName}</Text>. Your check-in registration has been processed.
          </Text>

          <View className="bg-primary/10 px-6 py-4 rounded-2xl items-center mb-6 w-full border border-primary/20">
            <Text className="text-xs font-semibold text-primary uppercase tracking-widest">Assigned Room</Text>
            <Text className="text-3xl font-extrabold text-primary mt-1">Room {assignedRoomNumber}</Text>
          </View>

          <View className="w-full gap-3">
            <Button
              label="Send Details to Property Owner (WhatsApp)"
              onPress={handleNotifyOwner}
              className="w-full bg-emerald-600 active:bg-emerald-700"
            />

            {Platform.OS === 'web' ? (
              <Button
                label="Property Owner Admin Login"
                variant="outline"
                onPress={() => router.replace('/auth')}
                className="w-full"
              />
            ) : (
              <Button
                label="Back to App Dashboard"
                variant="outline"
                onPress={() => router.replace('/(tabs)')}
                className="w-full"
              />
            )}
          </View>
        </GlassCard>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background">
      {/* Header Bar */}
      <View className="flex-row items-center justify-between px-4 pt-3 pb-3 border-b border-gray-200/50 dark:border-gray-800">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="p-2 -ml-2 rounded-full active:bg-gray-100 dark:active:bg-gray-800"
        >
          <ChevronLeft size={26} color="#000000" />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-lg font-bold text-foreground">{activePropertyName}</Text>
          <View className="flex-row items-center gap-1 mt-0.5">
            <ShieldCheck size={13} color="#10B981" />
            <Text className="text-xs text-emerald-600 font-semibold">Verified Online Check-in</Text>
          </View>
        </View>
        <View className="w-8" />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          
          {/* WELCOME BANNER */}
          <GlassCard className="mb-6 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/20">
            <View className="flex-row items-center gap-3 mb-2">
              <View className="w-10 h-10 rounded-xl bg-black/10 dark:bg-white/10 items-center justify-center">
                <Link2 size={22} color="#000000" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-foreground">Guest Self Check-in</Text>
                <Text className="text-xs text-gray-500">Complete your registration in under 2 minutes.</Text>
              </View>
            </View>
          </GlassCard>

          {/* 1. PERSONAL DETAILS */}
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">
            1. Personal Details
          </Text>

          <GlassCard className="mb-6 p-4 rounded-2xl border border-gray-100 dark:border-white/10">
            <Input
              label="Full Name *"
              placeholder="e.g. Sameer Kashyap"
              value={fullName}
              onChangeText={setFullName}
              icon={<User size={18} color="#9498AA" />}
            />

            <Input
              label="Mobile Phone *"
              placeholder="e.g. 9876543210"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              icon={<Phone size={18} color="#9498AA" />}
            />

            <Text className="text-sm font-semibold text-foreground mb-2 ml-1">Gender</Text>
            <View className="flex-row gap-3 mb-4">
              {['Male', 'Female', 'Other'].map((g) => {
                const isSel = gender === g;
                return (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setGender(g)}
                    className={`flex-1 py-3 rounded-xl border items-center justify-center ${
                      isSel ? 'bg-black dark:bg-white border-black dark:border-white' : 'bg-white dark:bg-black/20 border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    <Text className={`font-bold text-xs ${isSel ? 'text-white dark:text-black' : 'text-gray-600 dark:text-gray-400'}`}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Input
              label="Date of Birth"
              placeholder="DD/MM/YYYY"
              value={dob}
              onChangeText={setDob}
              icon={<Calendar size={18} color="#9498AA" />}
            />
          </GlassCard>

          {/* 2. IDENTITY DOCUMENT */}
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">
            2. Identity Document
          </Text>

          <GlassCard className="mb-6 p-4 rounded-2xl border border-gray-100 dark:border-white/10">
            <Text className="text-sm font-semibold text-foreground mb-2 ml-1">Document Type</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {['Aadhaar', 'Passport', 'Driving License', 'Voter ID', 'PAN'].map((type) => {
                const isSel = idType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setIdType(type)}
                    className={`px-4 py-2.5 rounded-xl border ${
                      isSel ? 'bg-black dark:bg-white border-black dark:border-white' : 'bg-white dark:bg-black/20 border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    <Text className={`font-bold text-xs ${isSel ? 'text-white dark:text-black' : 'text-gray-600 dark:text-gray-400'}`}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Input
              label={`${idType} Number *`}
              placeholder={`Enter ${idType} Number`}
              value={idNumber}
              onChangeText={setIdNumber}
              icon={<IdCard size={18} color="#9498AA" />}
            />

            <Input
              label="Permanent Address"
              placeholder="Enter Street / Area / City"
              value={address}
              onChangeText={setAddress}
              returnKeyType="done"
              blurOnSubmit={true}
              icon={<MapPin size={18} color="#9498AA" />}
            />

            <Input
              label="Pincode"
              placeholder="e.g. 781001"
              keyboardType="numeric"
              value={pinCode}
              onChangeText={setPinCode}
            />
          </GlassCard>

          {/* 3. ID PHOTOS & OPTIONAL SELFIE */}
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">
            3. Photos & Guest Selfie
          </Text>

          <GlassCard className="mb-6 p-4 rounded-2xl border border-gray-100 dark:border-white/10 gap-4">
            
            {/* Front Side ID */}
            <View>
              <View className="flex-row items-center gap-2 mb-2">
                <IdCard size={18} color="#000000" />
                <Text className="text-sm font-bold text-foreground">Front Side ID Card Photo</Text>
              </View>
              {frontPhotoUri ? (
                <View className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
                  <Image source={{ uri: frontPhotoUri }} style={{ width: '100%', height: 160 }} resizeMode="cover" />
                  <TouchableOpacity 
                    onPress={() => setFrontPhotoUri(null)}
                    className="absolute top-3 right-3 bg-black/60 p-2 rounded-full"
                  >
                    <X size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="flex-row gap-3">
                  <TouchableOpacity 
                    onPress={() => pickImage('front', true)}
                    className="flex-1 bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl items-center border border-dashed border-gray-300 dark:border-gray-700"
                  >
                    <Camera size={22} color="#000000" className="mb-1" />
                    <Text className="text-xs font-bold text-foreground">Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => pickImage('front', false)}
                    className="flex-1 bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl items-center border border-dashed border-gray-300 dark:border-gray-700"
                  >
                    <UploadCloud size={22} color="#000000" className="mb-1" />
                    <Text className="text-xs font-bold text-foreground">Upload ID</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Back Side ID */}
            <View className="pt-3 border-t border-gray-100 dark:border-gray-800">
              <View className="flex-row items-center gap-2 mb-2">
                <CreditCard size={18} color="#000000" />
                <Text className="text-sm font-bold text-foreground">Back Side ID Card Photo</Text>
              </View>
              {backPhotoUri ? (
                <View className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
                  <Image source={{ uri: backPhotoUri }} style={{ width: '100%', height: 160 }} resizeMode="cover" />
                  <TouchableOpacity 
                    onPress={() => setBackPhotoUri(null)}
                    className="absolute top-3 right-3 bg-black/60 p-2 rounded-full"
                  >
                    <X size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="flex-row gap-3">
                  <TouchableOpacity 
                    onPress={() => pickImage('back', true)}
                    className="flex-1 bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl items-center border border-dashed border-gray-300 dark:border-gray-700"
                  >
                    <Camera size={22} color="#000000" className="mb-1" />
                    <Text className="text-xs font-bold text-foreground">Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => pickImage('back', false)}
                    className="flex-1 bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl items-center border border-dashed border-gray-300 dark:border-gray-700"
                  >
                    <UploadCloud size={22} color="#000000" className="mb-1" />
                    <Text className="text-xs font-bold text-foreground">Upload ID</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* OPTIONAL SELFIE PHOTO */}
            <View className="pt-3 border-t border-gray-100 dark:border-gray-800">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-1.5">
                  <Camera size={16} color="#000000" />
                  <Text className="text-sm font-bold text-foreground">Guest Selfie Photo</Text>
                </View>
                <View className="bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full">
                  <Text className="text-[10px] font-bold text-gray-700 dark:text-gray-300">Optional</Text>
                </View>
              </View>

              {selfiePhotoUri ? (
                <View className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 items-center justify-center bg-black/10">
                  <Image source={{ uri: selfiePhotoUri }} style={{ width: '100%', height: 200 }} resizeMode="cover" />
                  <TouchableOpacity 
                    onPress={() => setSelfiePhotoUri(null)}
                    className="absolute top-3 right-3 bg-black/60 p-2 rounded-full"
                  >
                    <X size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="flex-row gap-3">
                  <TouchableOpacity 
                    onPress={() => pickImage('selfie', true)}
                    className="flex-1 bg-black/5 dark:bg-white/5 p-4 rounded-2xl items-center border border-dashed border-black/20 dark:border-white/20"
                  >
                    <Camera size={24} color="#000000" className="mb-1" />
                    <Text className="text-xs font-bold text-foreground">Take Selfie</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => pickImage('selfie', false)}
                    className="flex-1 bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl items-center border border-dashed border-gray-300 dark:border-gray-700"
                  >
                    <ImageIcon size={22} color="#9CA3AF" className="mb-1" />
                    <Text className="text-xs font-bold text-foreground">Upload Selfie</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

          </GlassCard>

          {/* 3. ADDITIONAL PERSONS (FAMILY & GROUP CHECK-IN) */}
          <View className="flex-row justify-between items-center mb-3 ml-1">
            <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              3. Additional Guests / Persons
            </Text>
            <TouchableOpacity
              onPress={addAdditionalPerson}
              className="flex-row items-center gap-1 bg-black/10 dark:bg-white/10 px-3 py-1.5 rounded-full"
            >
              <UserPlus size={14} color="#000000" className="dark:text-white" />
              <Text className="text-xs font-bold text-foreground">+ Add Person</Text>
            </TouchableOpacity>
          </View>

          {additionalGuests.length === 0 ? (
            <GlassCard className="mb-6 p-4 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 items-center justify-center py-5">
              <UserPlus size={28} color="#9498AA" className="mb-2" />
              <Text className="text-sm font-bold text-foreground">Travelling with Family or a Group?</Text>
              <Text className="text-xs text-gray-500 text-center mt-1 mb-3">
                Tap below to add details for additional guests staying in the same room.
              </Text>
              <TouchableOpacity
                onPress={addAdditionalPerson}
                className="bg-black dark:bg-white px-5 py-2.5 rounded-xl flex-row items-center gap-2"
              >
                <UserPlus size={16} color="#FFFFFF" className="dark:text-black" />
                <Text className="text-xs font-bold text-white dark:text-black">Add Additional Guest</Text>
              </TouchableOpacity>
            </GlassCard>
          ) : (
            <View className="mb-6 gap-4">
              {additionalGuests.map((guest, idx) => (
                <GlassCard key={guest.id} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
                  <View className="flex-row justify-between items-center mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                    <View className="flex-row items-center gap-2">
                      <View className="w-7 h-7 rounded-full bg-black/10 dark:bg-white/10 items-center justify-center">
                        <Text className="text-xs font-bold text-foreground">{idx + 2}</Text>
                      </View>
                      <Text className="text-sm font-bold text-foreground">Person {idx + 2} Details</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeAdditionalPerson(guest.id)}
                      className="p-1.5 rounded-full bg-red-500/10 active:bg-red-500/20"
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  <Input
                    label={`Person ${idx + 2} Full Name *`}
                    placeholder="e.g. Rahul Kashyap"
                    value={guest.fullName}
                    onChangeText={(val) => updateAdditionalPerson(guest.id, 'fullName', val)}
                    icon={<User size={18} color="#9498AA" />}
                  />

                  <Input
                    label="Mobile Phone (Optional)"
                    placeholder="Mobile number"
                    keyboardType="phone-pad"
                    value={guest.phone}
                    onChangeText={(val) => updateAdditionalPerson(guest.id, 'phone', val)}
                    icon={<Phone size={18} color="#9498AA" />}
                  />

                  <Text className="text-sm font-semibold text-foreground mb-2 ml-1">Gender</Text>
                  <View className="flex-row gap-3 mb-4">
                    {['Male', 'Female', 'Other'].map((g) => {
                      const isSel = guest.gender === g;
                      return (
                        <TouchableOpacity
                          key={g}
                          onPress={() => updateAdditionalPerson(guest.id, 'gender', g)}
                          className={`flex-1 py-2.5 rounded-xl border items-center justify-center ${
                            isSel ? 'bg-black dark:bg-white border-black dark:border-white' : 'bg-white dark:bg-black/20 border-gray-200 dark:border-gray-800'
                          }`}
                        >
                          <Text className={`font-bold text-xs ${isSel ? 'text-white dark:text-black' : 'text-gray-600 dark:text-gray-400'}`}>
                            {g}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text className="text-sm font-semibold text-foreground mb-2 ml-1">ID Document Type</Text>
                  <View className="flex-row flex-wrap gap-2 mb-4">
                    {['Aadhaar', 'Passport', 'Driving License', 'Voter ID', 'PAN'].map((type) => {
                      const isSel = guest.idType === type;
                      return (
                        <TouchableOpacity
                          key={type}
                          onPress={() => updateAdditionalPerson(guest.id, 'idType', type)}
                          className={`px-3 py-2 rounded-xl border ${
                            isSel ? 'bg-black dark:bg-white border-black dark:border-white' : 'bg-white dark:bg-black/20 border-gray-200 dark:border-gray-800'
                          }`}
                        >
                          <Text className={`font-bold text-xs ${isSel ? 'text-white dark:text-black' : 'text-gray-600 dark:text-gray-400'}`}>
                            {type}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Input
                    label={`${guest.idType} Number (Optional)`}
                    placeholder="Enter ID Number"
                    value={guest.idNumber}
                    onChangeText={(val) => updateAdditionalPerson(guest.id, 'idNumber', val)}
                    icon={<IdCard size={18} color="#9498AA" />}
                  />

                  {/* ID Front Photo */}
                  <View className="pt-2 border-t border-gray-100 dark:border-gray-800">
                    <Text className="text-xs font-bold text-foreground mb-2">ID Photo (Front)</Text>
                    {guest.frontPhotoUri ? (
                      <View className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                        <Image source={{ uri: guest.frontPhotoUri }} style={{ width: '100%', height: 120 }} resizeMode="cover" />
                        <TouchableOpacity 
                          onPress={() => updateAdditionalPerson(guest.id, 'frontPhotoUri', null)}
                          className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full"
                        >
                          <X size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View className="flex-row gap-2">
                        <TouchableOpacity 
                          onPress={() => pickImage('front', true, guest.id)}
                          className="flex-1 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl items-center border border-dashed border-gray-300 dark:border-gray-700 flex-row justify-center gap-1.5"
                        >
                          <Camera size={16} color="#000000" />
                          <Text className="text-xs font-bold text-foreground">Camera</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => pickImage('front', false, guest.id)}
                          className="flex-1 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl items-center border border-dashed border-gray-300 dark:border-gray-700 flex-row justify-center gap-1.5"
                        >
                          <UploadCloud size={16} color="#000000" />
                          <Text className="text-xs font-bold text-foreground">Upload</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </GlassCard>
              ))}
            </View>
          )}

          {/* 4. ROOM SELECTION */}
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">
            4. Select Room
          </Text>

          <GlassCard className="mb-8 p-4 rounded-2xl border border-gray-100 dark:border-white/10">
            {rooms.length === 0 ? (
              <View className="items-center py-5 px-3">
                <AlertCircle size={36} color="#EF4444" className="mb-2" />
                <Text className="text-base font-extrabold text-red-600 dark:text-red-400 text-center">
                  No Rooms Available Currently
                </Text>
                <Text className="text-xs text-gray-500 text-center mt-1">
                  All rooms at <Text className="font-bold text-foreground">{activePropertyName}</Text> are currently occupied or unavailable for online check-in. Please contact the property owner.
                </Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap gap-3">
                {rooms.map((r) => {
                  const isSel = selectedRoomId === r.id;
                  return (
                    <TouchableOpacity
                      key={r.id}
                      onPress={() => setSelectedRoomId(r.id)}
                      className={`px-5 py-3 rounded-2xl border ${
                        isSel ? 'bg-black dark:bg-white border-black dark:border-white' : 'bg-white dark:bg-black/20 border-gray-200 dark:border-gray-800'
                      }`}
                    >
                      <Text className={`font-bold text-sm text-center ${isSel ? 'text-white dark:text-black' : 'text-foreground'}`}>
                        Room {r.room_number}
                      </Text>
                      <Text className={`text-[10px] text-center ${isSel ? 'text-white/80 dark:text-black/80' : 'text-gray-400'}`}>
                        {r.room_type || 'Standard'} {r.price ? `(₹${r.price})` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </GlassCard>

          {/* SUBMIT BUTTON */}
          <Button
            label={
              isSubmitting 
                ? "Submitting Registration..." 
                : rooms.length === 0 
                ? "No Available Rooms to Check In" 
                : "Complete Self Check-in"
            }
            disabled={isSubmitting || rooms.length === 0}
            icon={isSubmitting ? <ActivityIndicator size="small" color="#FFFFFF" className="mr-2" /> : <CheckCircle2 size={20} color="#FFFFFF" className="mr-2" />}
            onPress={handleSubmit}
            className={`mb-8 ${rooms.length === 0 ? 'bg-gray-400 opacity-60' : 'bg-black dark:bg-white active:bg-gray-900'}`}
          />

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
