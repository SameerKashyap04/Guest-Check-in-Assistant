import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Image, Alert, TouchableOpacity, Platform, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/Button';
import { DatePicker } from '@/components/DatePicker';
import { CheckCircle2, User, Hash, MapPin, Phone, Edit2, Calendar, DoorOpen, Plus, UserPlus, Trash2, Camera, Upload, FileText, X } from 'lucide-react-native';
import { Input } from '@/components/Input';
import { createMultipleGuestsAndStay } from '@/database/stays';
import { useRoomsStore } from '@/store/useRoomsStore';
import * as ImagePicker from 'expo-image-picker';
import { OCRPipeline } from '@/features/checkin/camera/OCRPipeline';

export interface GuestItem {
  id: string;
  name: string;
  idNumber: string;
  address: string;
  phone: string;
  docType: string;
  dob: string;
  gender: string;
  pinCode: string;
  photoUri?: string;
  backPhotoUri?: string;
}

const DOC_TYPES = ['AADHAAR', 'PASSPORT', 'DRIVING_LICENCE', 'VOTER_ID', 'PAN', 'OTHER'];

export default function ReviewScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);

  // Modals state
  const [addOptionsModalVisible, setAddOptionsModalVisible] = useState(false);
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [editingGuestIndex, setEditingGuestIndex] = useState<number | null>(null);

  // Parse initial room ID from params
  const initialRoomId = params.selectedRoomId 
    ? Number(Array.isArray(params.selectedRoomId) ? params.selectedRoomId[0] : params.selectedRoomId) 
    : null;
  
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(initialRoomId);

  const { rooms, fetchRooms } = useRoomsStore();
  
  useEffect(() => {
    fetchRooms();
  }, []);

  // Set initial selected room once when rooms load
  useEffect(() => {
    if (selectedRoomId === null) {
      if (initialRoomId) {
        setSelectedRoomId(initialRoomId);
      } else if (rooms.length > 0) {
        const firstAvailable = rooms.find(r => r.status === 'available');
        setSelectedRoomId(firstAvailable ? firstAvailable.id : rooms[0].id);
      }
    }
  }, [rooms, initialRoomId]);

  const displayRooms = rooms;

  // Form for manual adding or editing
  const [guestForm, setGuestForm] = useState<GuestItem>({
    id: '',
    name: '',
    idNumber: '',
    address: '',
    phone: '',
    docType: 'AADHAAR',
    dob: '',
    gender: '',
    pinCode: '',
    photoUri: '',
    backPhotoUri: ''
  });

  // Parse initial guest profile from route params
  let profile: any = null;
  if (params.guestProfile) {
    try {
      const guestProfileStr = Array.isArray(params.guestProfile) ? params.guestProfile[0] : params.guestProfile;
      profile = JSON.parse(guestProfileStr);
    } catch (e) {
      console.warn("Failed to parse guestProfile", e);
    }
  }

  // Support guest list passed back from camera scan
  let initialGuestList: GuestItem[] = [];
  if (params.guestList) {
    try {
      const listStr = Array.isArray(params.guestList) ? params.guestList[0] : params.guestList;
      initialGuestList = JSON.parse(listStr);
    } catch (e) {
      console.warn("Failed to parse guestList", e);
    }
  }

  const primaryGuest: GuestItem = {
    id: 'guest-1',
    name: profile?.fullName?.value || (Array.isArray(params.extractedName) ? params.extractedName[0] : (params.extractedName || '')),
    idNumber: profile?.idNumber?.value || (Array.isArray(params.extractedIdNumber) ? params.extractedIdNumber[0] : (params.extractedIdNumber || '')),
    address: profile?.address?.value || (Array.isArray(params.extractedAddress) ? params.extractedAddress[0] : (params.extractedAddress || '')),
    phone: Array.isArray(params.extractedPhone) ? params.extractedPhone[0] : (params.extractedPhone || ''),
    docType: profile?.idType || (Array.isArray(params.extractedDocType) ? params.extractedDocType[0] : (params.extractedDocType || 'UNKNOWN')),
    dob: profile?.dob?.value || (Array.isArray(params.extractedDob) ? params.extractedDob[0] : (params.extractedDob || '')),
    gender: profile?.gender?.value || '',
    pinCode: profile?.pinCode?.value || '',
    photoUri: profile?.photoUri || (Array.isArray(params.photoUri) ? params.photoUri[0] : params.photoUri) || '',
    backPhotoUri: profile?.backPhotoUri || (Array.isArray(params.backPhotoUri) ? params.backPhotoUri[0] : params.backPhotoUri) || ''
  };

  const [guestsData, setGuestsData] = useState<GuestItem[]>(() => {
    if (initialGuestList.length > 0) return initialGuestList;
    return [primaryGuest];
  });

  useEffect(() => {
    if (initialGuestList.length > 0) {
      setGuestsData(initialGuestList);
    }
  }, [params.guestList]);

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  
  const [checkInDate, setCheckInDate] = useState(today);
  const [checkOutDate, setCheckOutDate] = useState(tomorrow);

  // --- ADD MORE GUEST HANDLERS ---
  const handleScanWithCamera = () => {
    setAddOptionsModalVisible(false);
    router.push({
      pathname: '/checkin/camera',
      params: {
        returnToReview: 'true',
        existingGuests: JSON.stringify(guestsData),
        selectedRoomId: selectedRoomId ? String(selectedRoomId) : '',
      }
    });
  };

  const handleUploadNewId = async () => {
    setAddOptionsModalVisible(false);
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Permission to access photo gallery is required to upload ID images.');
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
      setIsProcessingUpload(true);

      const blocks = await OCRPipeline.analyzeFrame(imageUri);
      const initialProfile = {
        fullName: { value: '', confidence: 0 },
        idNumber: { value: '', confidence: 0 },
        address: { value: '', confidence: 0 },
        dob: { value: '', confidence: 0 },
        gender: { value: '', confidence: 0 },
        pinCode: { value: '', confidence: 0 },
        idType: 'UNKNOWN' as const,
        isBackScanned: false,
        photoUri: imageUri
      };

      const profile = OCRPipeline.processBlocks(blocks, initialProfile, 'UNKNOWN');
      setIsProcessingUpload(false);

      const newGuest: GuestItem = {
        id: `guest-${Date.now()}`,
        name: profile.fullName?.value || '',
        idNumber: profile.idNumber?.value || '',
        address: profile.address?.value || '',
        phone: '',
        docType: profile.idType || 'UNKNOWN',
        dob: profile.dob?.value || '',
        gender: profile.gender?.value || '',
        pinCode: profile.pinCode?.value || '',
        photoUri: imageUri
      };

      setGuestsData(prev => [...prev, newGuest]);
      Alert.alert('Guest Added ✨', `Scanned ID details added for ${newGuest.name || 'Additional Guest'}.`);

    } catch (error) {
      console.error('Upload OCR error:', error);
      setIsProcessingUpload(false);
      Alert.alert('Scan Failed', 'Could not extract details from the image. You can add guest details manually.');
    }
  };

  const handleOpenManualModal = () => {
    setAddOptionsModalVisible(false);
    setGuestForm({
      id: `guest-${Date.now()}`,
      name: '',
      idNumber: '',
      address: '',
      phone: '',
      docType: 'AADHAAR',
      dob: '',
      gender: '',
      pinCode: '',
      photoUri: ''
    });
    setManualModalVisible(true);
  };

  const handleSaveManualGuest = () => {
    if (!guestForm.name.trim()) {
      Alert.alert('Missing Name', 'Please enter the guest full name.');
      return;
    }
    setGuestsData(prev => [...prev, guestForm]);
    setManualModalVisible(false);
  };

  const handleOpenEditGuest = (index: number) => {
    setEditingGuestIndex(index);
    setGuestForm({ ...guestsData[index] });
  };

  const handleSaveEditedGuest = () => {
    if (editingGuestIndex === null) return;
    if (!guestForm.name.trim()) {
      Alert.alert('Missing Name', 'Please enter the guest full name.');
      return;
    }
    setGuestsData(prev => {
      const updated = [...prev];
      updated[editingGuestIndex] = guestForm;
      return updated;
    });
    setEditingGuestIndex(null);
  };

  const handleRemoveGuest = (index: number) => {
    if (guestsData.length <= 1) {
      Alert.alert('Cannot Delete', 'At least one guest is required for check-in.');
      return;
    }
    Alert.alert(
      'Remove Guest',
      `Are you sure you want to remove ${guestsData[index].name || `Guest #${index + 1}`}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            setGuestsData(prev => prev.filter((_, i) => i !== index));
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    if (!selectedRoomId) {
      Alert.alert('Missing Info', 'Please select a room to assign to this check-in.');
      return;
    }

    if (guestsData.length === 0) {
      Alert.alert('Missing Guests', 'Please add at least one guest.');
      return;
    }

    setIsSaving(true);
    try {
      await createMultipleGuestsAndStay(
        guestsData.map(g => ({
          full_name: g.name,
          id_number: g.idNumber,
          address: g.address,
          phone: g.phone,
          photo_uri: g.photoUri || '',
          back_photo_uri: g.backPhotoUri || '',
          id_type: g.docType,
          dob: g.dob,
          gender: g.gender,
          pin_code: g.pinCode
        })),
        {
          room_id: selectedRoomId,
          check_in_date: checkInDate,
          check_out_date: checkOutDate
        }
      );
      
      Alert.alert('Success', `${guestsData.length} ${guestsData.length === 1 ? 'guest' : 'guests'} checked in successfully!`, [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save guest and stay details');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        
        {/* PROGRESS STEPPER */}
        <View className="flex-row items-center justify-center mb-8 px-2">
          <View className="items-center">
            <View className="w-8 h-8 rounded-full bg-primary/20 items-center justify-center">
              <Text className="text-primary font-bold text-sm">1</Text>
            </View>
            <Text className="text-xs text-primary/70 font-semibold mt-1.5">Details</Text>
          </View>
          <View className="h-[2px] flex-1 bg-primary/30 mx-3 mb-5" />
          <View className="items-center">
            <View className="w-8 h-8 rounded-full bg-primary items-center justify-center">
              <Text className="text-white font-bold text-sm">2</Text>
            </View>
            <Text className="text-xs text-primary font-semibold mt-1.5">Review</Text>
          </View>
          <View className="h-[2px] flex-1 bg-gray-200 mx-3 mb-5" />
          <View className="items-center">
            <View className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center">
              <Text className="text-gray-500 font-bold text-sm">3</Text>
            </View>
            <Text className="text-xs text-gray-400 font-medium mt-1.5">Done</Text>
          </View>
        </View>

        {/* Loading Indicator when scanning uploaded guest image */}
        {isProcessingUpload && (
          <GlassCard variant="elevated" className="mb-6 p-4 flex-row items-center justify-center gap-3">
            <ActivityIndicator size="small" color="#38BDF8" />
            <Text className="text-sm font-semibold text-foreground">Processing uploaded ID card image...</Text>
          </GlassCard>
        )}

        {/* --- ROOM ASSIGNMENT SECTION --- */}
        <View className="mb-8">
          <View className="flex-row items-center mb-4 mt-2 ml-1">
            <DoorOpen size={18} color="#38BDF8" className="mr-2" />
            <Text className="text-xs font-bold text-muted uppercase tracking-widest">
              Room Assignment
            </Text>
          </View>
          
          <GlassCard variant="elevated" className="mb-4 p-5">
            <View className="border-b border-transparent dark:border-transparent pb-5 mb-5">
              <View className="flex-row items-center mb-4">
                <Text className="text-xs font-semibold text-muted uppercase tracking-wide">Select Room</Text>
              </View>
              
              {displayRooms.length > 0 ? (
                <View className="flex-row flex-wrap gap-3">
                  {displayRooms.map((room) => {
                    const isSelected = selectedRoomId === room.id;
                    return (
                      <TouchableOpacity
                        key={room.id}
                        onPress={() => setSelectedRoomId(room.id)}
                        activeOpacity={0.7}
                        style={Platform.OS === 'web' ? ({ transition: 'all 0.2s' } as any) : undefined}
                        className={`px-5 py-3.5 rounded-2xl border ${
                          isSelected 
                            ? 'border-foreground bg-foreground/10 dark:border-white dark:bg-white/15' 
                            : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-black/20'
                        }`}
                      >
                        <Text className={`font-bold text-center text-base mb-0.5 ${
                          isSelected ? 'text-foreground font-extrabold' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          Room {room.room_number}
                        </Text>
                        <Text className={`text-[10px] text-center font-medium uppercase tracking-wider ${
                          isSelected ? 'text-foreground' : 'text-gray-500'
                        }`}>
                          {room.room_type || 'Standard'} {room.price ? `• ₹${room.price}/night` : ''} {room.status && room.status !== 'available' ? `(${room.status})` : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text className="text-sm text-red-500 font-medium">No rooms found. Please add a room first.</Text>
              )}
            </View>

            <View className="flex-row gap-5">
              <View className="flex-1">
                <DatePicker
                  label="Check In Date"
                  value={checkInDate}
                  onChangeText={setCheckInDate}
                />
              </View>
              <View className="flex-1">
                <DatePicker
                  label="Check Out Date"
                  value={checkOutDate}
                  onChangeText={setCheckOutDate}
                />
              </View>
            </View>
          </GlassCard>
        </View>

        {/* --- GUEST DETAILS & MULTI-GUEST LIST --- */}
        <View className="flex-row justify-between items-center mb-4 mt-2 ml-1">
          <Text className="text-xs font-bold text-muted uppercase tracking-widest">
            Registered Guests ({guestsData.length})
          </Text>
        </View>

        {guestsData.map((guest, index) => (
          <GlassCard key={guest.id || index} variant="elevated" className="mb-6 p-5 rounded-2xl border border-gray-100 dark:border-white/10">
            {/* Header with Guest Badge and Actions */}
            <View className="flex-row justify-between items-center pb-4 mb-4 border-b border-gray-100 dark:border-gray-800">
              <View className="flex-row items-center gap-2">
                <View className={`px-3 py-1 rounded-full ${index === 0 ? 'bg-primary/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  <Text className={`text-xs font-bold ${index === 0 ? 'text-primary' : 'text-gray-600 dark:text-gray-300'}`}>
                    {index === 0 ? 'Primary Guest' : `Guest #${index + 1}`}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-2">
                <TouchableOpacity 
                  onPress={() => handleOpenEditGuest(index)} 
                  className="flex-row items-center bg-primary/10 px-3 py-1.5 rounded-full"
                  activeOpacity={0.7}
                >
                  <Edit2 size={13} color="#38BDF8" className="mr-1" />
                  <Text className="text-xs font-semibold text-primary">Edit</Text>
                </TouchableOpacity>

                {guestsData.length > 1 && (
                  <TouchableOpacity 
                    onPress={() => handleRemoveGuest(index)} 
                    className="p-1.5 bg-rose-500/10 rounded-full"
                    activeOpacity={0.7}
                  >
                    <Trash2 size={15} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Guest ID Photos (Front & Back) */}
            {(guest.photoUri || guest.backPhotoUri) ? (
              <View className="mb-5">
                <Text className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 ml-1">
                  ID Card Photos ({guest.photoUri && guest.backPhotoUri ? 'Front & Back' : 'Scanned ID'})
                </Text>
                <View className="flex-row gap-3">
                  {guest.photoUri ? (
                    <View className="flex-1">
                      <View className="bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-t-xl align-self-start">
                        <Text className="text-[10px] font-bold text-foreground">Front Side</Text>
                      </View>
                      <Image 
                        source={{ uri: guest.photoUri }} 
                        style={{ width: '100%', height: 140, borderRadius: 12, borderTopLeftRadius: 0 }}
                        resizeMode="cover"
                      />
                    </View>
                  ) : null}

                  {guest.backPhotoUri ? (
                    <View className="flex-1">
                      <View className="bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-t-xl align-self-start">
                        <Text className="text-[10px] font-bold text-foreground">Back Side</Text>
                      </View>
                      <Image 
                        source={{ uri: guest.backPhotoUri }} 
                        style={{ width: '100%', height: 140, borderRadius: 12, borderTopLeftRadius: 0 }}
                        resizeMode="cover"
                      />
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Guest Details Summary */}
            <View className="gap-4">
              <View className="flex-row items-center">
                <User size={16} color="#9498AA" className="mr-2" />
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold text-muted uppercase tracking-wider">Full Name</Text>
                  <Text className="text-base font-semibold text-foreground">{guest.name || 'Not provided'}</Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <Hash size={16} color="#9498AA" className="mr-2" />
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold text-muted uppercase tracking-wider">Document Type & ID</Text>
                  <Text className="text-sm font-semibold text-foreground">
                    {guest.docType ? guest.docType.replace('_', ' ') : 'ID'}: <Text className="font-medium text-muted">{guest.idNumber || 'Not provided'}</Text>
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-5">
                <View className="flex-1 flex-row items-center">
                  <Calendar size={16} color="#9498AA" className="mr-2" />
                  <View>
                    <Text className="text-[10px] font-semibold text-muted uppercase tracking-wider">DOB</Text>
                    <Text className="text-xs font-semibold text-foreground">{guest.dob || 'N/A'}</Text>
                  </View>
                </View>

                <View className="flex-1 flex-row items-center">
                  <User size={16} color="#9498AA" className="mr-2" />
                  <View>
                    <Text className="text-[10px] font-semibold text-muted uppercase tracking-wider">Gender</Text>
                    <Text className="text-xs font-semibold text-foreground">{guest.gender || 'N/A'}</Text>
                  </View>
                </View>
              </View>

              <View className="flex-row items-center">
                <MapPin size={16} color="#9498AA" className="mr-2" />
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold text-muted uppercase tracking-wider">Address</Text>
                  <Text className="text-xs font-medium text-foreground">{guest.address || 'Not provided'} {guest.pinCode ? `(PIN: ${guest.pinCode})` : ''}</Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <Phone size={16} color="#9498AA" className="mr-2" />
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold text-muted uppercase tracking-wider">Phone</Text>
                  <Text className="text-sm font-semibold text-foreground">{guest.phone || 'Not provided'}</Text>
                </View>
              </View>
            </View>
          </GlassCard>
        ))}

        {/* --- ADD MORE GUEST BUTTON --- */}
        <TouchableOpacity
          onPress={() => setAddOptionsModalVisible(true)}
          activeOpacity={0.8}
          className="mb-8 p-4 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 flex-row items-center justify-center gap-3"
        >
          <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center">
            <UserPlus size={20} color="#38BDF8" />
          </View>
          <View>
            <Text className="text-base font-bold text-foreground">Add More Guest</Text>
            <Text className="text-xs text-gray-500">Scan additional ID card or enter co-guest details</Text>
          </View>
        </TouchableOpacity>

        {/* --- SUBMIT BUTTONS --- */}
        <Button 
          label={`Confirm Check-in (${guestsData.length} ${guestsData.length === 1 ? 'Guest' : 'Guests'})`}
          size="lg" 
          variant="primary"
          icon={<CheckCircle2 size={20} color="#FFF" className="mr-2" />}
          onPress={handleSave}
          isLoading={isSaving}
          className="mb-3"
        />
        
        <Button 
          label="Cancel & Retake" 
          variant="ghost" 
          size="lg" 
          onPress={() => router.back()}
        />

        {/* --- MODAL 1: ADD GUEST OPTIONS SHEET --- */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={addOptionsModalVisible}
          onRequestClose={() => setAddOptionsModalVisible(false)}
        >
          <View className="flex-1 justify-end bg-black/60">
            <View className="bg-background rounded-t-3xl p-6 min-h-[40%]">
              <View className="flex-row justify-between items-center mb-6">
                <View>
                  <Text className="text-xl font-bold text-foreground">Add More Guest</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">Select how you want to add the additional guest</Text>
                </View>
                <TouchableOpacity onPress={() => setAddOptionsModalVisible(false)} className="p-2 bg-primary/10 rounded-full">
                  <X size={20} color="#000000" />
                </TouchableOpacity>
              </View>

              {/* Option A: Camera Scan */}
              <TouchableOpacity
                onPress={handleScanWithCamera}
                activeOpacity={0.8}
                className="flex-row items-center p-4 mb-3.5 rounded-2xl bg-white dark:bg-black/20 border border-gray-100 dark:border-gray-800"
              >
                <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center mr-4">
                  <Camera size={24} color="#38BDF8" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-foreground">Scan ID Card with Camera</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">Auto-capture details from guest's physical ID</Text>
                </View>
              </TouchableOpacity>

              {/* Option B: Upload ID Image */}
              <TouchableOpacity
                onPress={handleUploadNewId}
                activeOpacity={0.8}
                className="flex-row items-center p-4 mb-3.5 rounded-2xl bg-white dark:bg-black/20 border border-gray-100 dark:border-gray-800"
              >
                <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center mr-4">
                  <Upload size={24} color="#38BDF8" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-foreground">Upload ID Image from Gallery</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">Select photo of ID card and run OCR scanner</Text>
                </View>
              </TouchableOpacity>

              {/* Option C: Manual Entry */}
              <TouchableOpacity
                onPress={handleOpenManualModal}
                activeOpacity={0.8}
                className="flex-row items-center p-4 mb-3 rounded-2xl bg-white dark:bg-black/20 border border-gray-100 dark:border-gray-800"
              >
                <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center mr-4">
                  <FileText size={24} color="#38BDF8" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-foreground">Manual Guest Entry</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">Enter name, ID number, and phone manually</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* --- MODAL 2: MANUAL GUEST ENTRY FORM MODAL --- */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={manualModalVisible}
          onRequestClose={() => setManualModalVisible(false)}
        >
          <View className="flex-1 justify-end bg-black/60">
            <View className="bg-background rounded-t-3xl p-6 min-h-[70%] max-h-[90%]">
              <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-gray-200 dark:border-gray-800">
                <Text className="text-xl font-bold text-foreground">Add Co-Guest Details</Text>
                <TouchableOpacity onPress={() => setManualModalVisible(false)} className="p-2 bg-primary/10 rounded-full">
                  <X size={20} color="#000000" />
                </TouchableOpacity>
              </View>

              <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 20 }}>
                <View className="gap-3">
                  <Input
                    label="Full Name *"
                    placeholder="Enter guest full name"
                    value={guestForm.name}
                    onChangeText={(v) => setGuestForm(prev => ({ ...prev, name: v }))}
                    icon={<User size={18} color="#9498AA" />}
                  />

                  <View className="mb-2">
                    <Text className="text-xs font-semibold text-foreground mb-2 ml-1">Document Type</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {DOC_TYPES.map((type) => {
                        const isSelected = guestForm.docType === type;
                        return (
                          <TouchableOpacity
                            key={type}
                            onPress={() => setGuestForm(prev => ({ ...prev, docType: type }))}
                            className={`px-3 py-2 rounded-xl border ${
                              isSelected 
                                ? 'border-foreground bg-foreground/10 dark:border-white dark:bg-white/15' 
                                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-black/20'
                            }`}
                          >
                            <Text className={`text-xs font-semibold ${isSelected ? 'text-foreground font-bold' : 'text-gray-500'}`}>
                              {type.replace('_', ' ')}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <Input
                    label="ID Number"
                    placeholder="Enter document ID number"
                    value={guestForm.idNumber}
                    onChangeText={(v) => setGuestForm(prev => ({ ...prev, idNumber: v }))}
                    keyboardType={guestForm.docType?.toLowerCase() === 'aadhaar' ? 'numeric' : 'default'}
                    icon={<Hash size={18} color="#9498AA" />}
                  />

                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <DatePicker
                        label="Date of Birth"
                        value={guestForm.dob}
                        onChangeText={(v) => setGuestForm(prev => ({ ...prev, dob: v }))}
                      />
                    </View>
                    <View className="flex-1">
                      <Input
                        label="Gender"
                        placeholder="Male / Female / Other"
                        value={guestForm.gender}
                        onChangeText={(v) => setGuestForm(prev => ({ ...prev, gender: v }))}
                      />
                    </View>
                  </View>

                  <Input
                    label="Phone Number"
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                    value={guestForm.phone}
                    onChangeText={(v) => setGuestForm(prev => ({ ...prev, phone: v }))}
                    icon={<Phone size={18} color="#9498AA" />}
                  />

                  <Input
                    label="Address"
                    placeholder="Enter guest address"
                    returnKeyType="done"
                    blurOnSubmit={true}
                    value={guestForm.address}
                    onChangeText={(v) => setGuestForm(prev => ({ ...prev, address: v }))}
                    icon={<MapPin size={18} color="#9498AA" />}
                  />
                </View>

                <Button
                  label="Add Guest"
                  size="lg"
                  variant="primary"
                  className="mt-6"
                  icon={<Plus size={18} color="#FFFFFF" />}
                  onPress={handleSaveManualGuest}
                />
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* --- MODAL 3: EDIT GUEST DETAILS MODAL --- */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={editingGuestIndex !== null}
          onRequestClose={() => setEditingGuestIndex(null)}
        >
          <View className="flex-1 justify-end bg-black/60">
            <View className="bg-background rounded-t-3xl p-6 min-h-[70%] max-h-[90%]">
              <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-gray-200 dark:border-gray-800">
                <Text className="text-xl font-bold text-foreground">Edit Guest #{editingGuestIndex !== null ? editingGuestIndex + 1 : 1} Details</Text>
                <TouchableOpacity onPress={() => setEditingGuestIndex(null)} className="p-2 bg-primary/10 rounded-full">
                  <X size={20} color="#000000" />
                </TouchableOpacity>
              </View>

              <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 20 }}>
                <View className="gap-3">
                  <Input
                    label="Full Name"
                    placeholder="Enter guest full name"
                    value={guestForm.name}
                    onChangeText={(v) => setGuestForm(prev => ({ ...prev, name: v }))}
                    icon={<User size={18} color="#9498AA" />}
                  />

                  <View className="mb-2">
                    <Text className="text-xs font-semibold text-foreground mb-2 ml-1">Document Type</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {DOC_TYPES.map((type) => {
                        const isSelected = guestForm.docType === type;
                        return (
                          <TouchableOpacity
                            key={type}
                            onPress={() => setGuestForm(prev => ({ ...prev, docType: type }))}
                            className={`px-3 py-2 rounded-xl border ${
                              isSelected 
                                ? 'border-foreground bg-foreground/10 dark:border-white dark:bg-white/15' 
                                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-black/20'
                            }`}
                          >
                            <Text className={`text-xs font-semibold ${isSelected ? 'text-foreground font-bold' : 'text-gray-500'}`}>
                              {type.replace('_', ' ')}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <Input
                    label="ID Number"
                    placeholder="Enter document ID number"
                    value={guestForm.idNumber}
                    onChangeText={(v) => setGuestForm(prev => ({ ...prev, idNumber: v }))}
                    icon={<Hash size={18} color="#9498AA" />}
                  />

                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <DatePicker
                        label="Date of Birth"
                        value={guestForm.dob}
                        onChangeText={(v) => setGuestForm(prev => ({ ...prev, dob: v }))}
                      />
                    </View>
                    <View className="flex-1">
                      <Input
                        label="Gender"
                        placeholder="Male / Female / Other"
                        value={guestForm.gender}
                        onChangeText={(v) => setGuestForm(prev => ({ ...prev, gender: v }))}
                      />
                    </View>
                  </View>

                  <Input
                    label="Phone Number"
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                    value={guestForm.phone}
                    onChangeText={(v) => setGuestForm(prev => ({ ...prev, phone: v }))}
                    icon={<Phone size={18} color="#9498AA" />}
                  />

                  <Input
                    label="Address"
                    placeholder="Enter guest address"
                    returnKeyType="done"
                    blurOnSubmit={true}
                    value={guestForm.address}
                    onChangeText={(v) => setGuestForm(prev => ({ ...prev, address: v }))}
                    icon={<MapPin size={18} color="#9498AA" />}
                  />
                </View>

                <Button
                  label="Save Changes"
                  size="lg"
                  variant="primary"
                  className="mt-6"
                  onPress={handleSaveEditedGuest}
                />
              </ScrollView>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </SafeAreaView>
  );
}
