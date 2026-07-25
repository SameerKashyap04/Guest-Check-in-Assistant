import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/GlassCard';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { ChevronLeft, Camera, Image as ImageIcon, CheckCircle2, User, IdCard, Phone, MapPin, Building2, Sparkles, ShieldCheck, DoorOpen, Calendar, X, Link2, UploadCloud, CreditCard } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getRooms, Room } from '@/database/rooms';
import { createGuestAndStay } from '@/database/stays';

export default function SelfCheckinScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ property_id?: string; property_name?: string }>();
  const { businessName, propertyId: storePropId } = useSettingsStore();

  const activePropertyId = (searchParams?.property_id as string) || storePropId || 'DEFAULT-HOMESTAY';
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

  // Photos State
  const [frontPhotoUri, setFrontPhotoUri] = useState<string | null>(null);
  const [backPhotoUri, setBackPhotoUri] = useState<string | null>(null);
  const [selfiePhotoUri, setSelfiePhotoUri] = useState<string | null>(null); // OPTIONAL SELFIE

  // Rooms & Submission State
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [assignedRoomNumber, setAssignedRoomNumber] = useState<string>('');

  useEffect(() => {
    async function loadRooms() {
      try {
        const availableRooms = await getRooms();
        const avail = availableRooms.filter(r => r.status === 'available');
        setRooms(avail);
        if (avail.length > 0) {
          setSelectedRoomId(avail[0].id);
        }
      } catch (e) {
        console.error('Failed to load rooms for self check-in', e);
      }
    }
    loadRooms();
  }, []);

  const pickImage = async (target: 'front' | 'back' | 'selfie', useCamera = false) => {
    try {
      let result;
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsEditing: target === 'selfie',
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Denied', 'Gallery permission is required to select photos.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsEditing: target === 'selfie',
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        if (target === 'front') setFrontPhotoUri(uri);
        if (target === 'back') setBackPhotoUri(uri);
        if (target === 'selfie') setSelfiePhotoUri(uri);
      }
    } catch (e) {
      console.error('Image picker error', e);
    }
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required Field', 'Please enter your Full Name.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Required Field', 'Please enter your Phone Number.');
      return;
    }
    if (!idNumber.trim()) {
      Alert.alert('Required Field', 'Please enter your ID Number.');
      return;
    }
    if (!selectedRoomId) {
      Alert.alert('Room Required', 'Please select an available room.');
      return;
    }

    try {
      setIsSubmitting(true);
      const selectedRoom = rooms.find(r => r.id === selectedRoomId);
      const roomNum = selectedRoom ? selectedRoom.room_number : 'Assigned Room';

      const todayStr = new Date().toISOString().split('T')[0];

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
          room_id: selectedRoomId,
          check_in_date: todayStr,
          check_out_date: todayStr,
        }
      );

      setAssignedRoomNumber(roomNum);
      setIsSubmitted(true);
    } catch (e: any) {
      console.error('Self check-in submission error', e);
      Alert.alert('Submission Error', e?.message || 'Failed to complete self check-in.');
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

          <View className="bg-primary/10 px-6 py-4 rounded-2xl items-center mb-8 w-full border border-primary/20">
            <Text className="text-xs font-semibold text-primary uppercase tracking-widest">Assigned Room</Text>
            <Text className="text-3xl font-extrabold text-primary mt-1">Room {assignedRoomNumber}</Text>
          </View>

          <Button
            label="Back to App Dashboard"
            onPress={() => router.replace('/(tabs)')}
            className="w-full"
          />
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
          <GlassCard className="mb-6 p-5 rounded-2xl border border-sky-500/20 bg-sky-500/5">
            <View className="flex-row items-center gap-3 mb-2">
              <View className="w-10 h-10 rounded-xl bg-primary/20 items-center justify-center">
                <Link2 size={22} color="#38BDF8" />
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
              {['Male', 'Female', 'Other'].map((g) => (
                <TouchableOpacity
                  key={g}
                  onPress={() => setGender(g)}
                  className={`flex-1 py-3 rounded-xl border items-center justify-center ${
                    gender === g ? 'bg-primary border-primary' : 'bg-white dark:bg-black/20 border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <Text className={`font-bold text-xs ${gender === g ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
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
              {['Aadhaar', 'Passport', 'Driving License', 'Voter ID', 'PAN'].map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setIdType(type)}
                  className={`px-4 py-2.5 rounded-xl border ${
                    idType === type ? 'bg-primary border-primary' : 'bg-white dark:bg-black/20 border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <Text className={`font-bold text-xs ${idType === type ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
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
                <IdCard size={18} color="#38BDF8" />
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
                    <Camera size={22} color="#38BDF8" className="mb-1" />
                    <Text className="text-xs font-bold text-foreground">Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => pickImage('front', false)}
                    className="flex-1 bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl items-center border border-dashed border-gray-300 dark:border-gray-700"
                  >
                    <UploadCloud size={22} color="#38BDF8" className="mb-1" />
                    <Text className="text-xs font-bold text-foreground">Upload ID</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Back Side ID */}
            <View className="pt-3 border-t border-gray-100 dark:border-gray-800">
              <View className="flex-row items-center gap-2 mb-2">
                <CreditCard size={18} color="#38BDF8" />
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
                    <Camera size={22} color="#38BDF8" className="mb-1" />
                    <Text className="text-xs font-bold text-foreground">Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => pickImage('back', false)}
                    className="flex-1 bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl items-center border border-dashed border-gray-300 dark:border-gray-700"
                  >
                    <UploadCloud size={22} color="#38BDF8" className="mb-1" />
                    <Text className="text-xs font-bold text-foreground">Upload ID</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* OPTIONAL SELFIE PHOTO */}
            <View className="pt-3 border-t border-gray-100 dark:border-gray-800">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-1.5">
                  <Camera size={16} color="#38BDF8" />
                  <Text className="text-sm font-bold text-foreground">Guest Selfie Photo</Text>
                </View>
                <View className="bg-sky-500/10 px-2.5 py-0.5 rounded-full">
                  <Text className="text-[10px] font-bold text-primary">Optional</Text>
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
                    className="flex-1 bg-primary/10 p-4 rounded-2xl items-center border border-dashed border-primary/30"
                  >
                    <Camera size={24} color="#38BDF8" className="mb-1" />
                    <Text className="text-xs font-bold text-primary">Take Selfie</Text>
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

          {/* 4. ROOM SELECTION */}
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">
            4. Select Room
          </Text>

          <GlassCard className="mb-8 p-4 rounded-2xl border border-gray-100 dark:border-white/10">
            {rooms.length === 0 ? (
              <Text className="text-sm text-red-500 font-medium text-center py-3">No available rooms at the moment.</Text>
            ) : (
              <View className="flex-row flex-wrap gap-3">
                {rooms.map((r) => {
                  const isSel = selectedRoomId === r.id;
                  return (
                    <TouchableOpacity
                      key={r.id}
                      onPress={() => setSelectedRoomId(r.id)}
                      className={`px-5 py-3 rounded-2xl border ${
                        isSel ? 'bg-primary border-primary' : 'bg-white dark:bg-black/20 border-gray-200 dark:border-gray-800'
                      }`}
                    >
                      <Text className={`font-bold text-sm text-center ${isSel ? 'text-white' : 'text-foreground'}`}>
                        Room {r.room_number}
                      </Text>
                      <Text className={`text-[10px] text-center ${isSel ? 'text-white/80' : 'text-gray-400'}`}>
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
            label={isSubmitting ? "Submitting Registration..." : "Complete Self Check-in"}
            disabled={isSubmitting || rooms.length === 0}
            icon={isSubmitting ? <ActivityIndicator size="small" color="#FFFFFF" className="mr-2" /> : <CheckCircle2 size={20} color="#FFFFFF" className="mr-2" />}
            onPress={handleSubmit}
            className="mb-8"
          />

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
