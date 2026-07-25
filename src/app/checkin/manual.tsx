import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/Input';
import { DatePicker } from '@/components/DatePicker';
import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { useRouter } from 'expo-router';
import { User, MapPin, Hash, Phone, Calendar, DoorOpen, Plus, Upload, Sparkles } from 'lucide-react-native';
import { useRoomsStore } from '@/store/useRoomsStore';
import * as ImagePicker from 'expo-image-picker';
import { OCRPipeline } from '@/features/checkin/camera/OCRPipeline';

const docTypes = ['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID', 'OTHER'];

const schema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  docType: z.string(),
  idNumber: z.string().min(4, 'ID Number is required'),
  dob: z.string().optional(),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  address: z.string().min(5, 'Address is required'),
});

type FormData = z.infer<typeof schema>;

export default function ManualEntryScreen() {
  const router = useRouter();
  const { rooms, fetchRooms } = useRoomsStore();
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [uploadedPhotoUri, setUploadedPhotoUri] = useState<string | null>(null);

  const availableRooms = rooms;

  useEffect(() => {
    fetchRooms();
  }, []);

  // Pre-select first room if none selected
  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms]);

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      docType: 'AADHAAR',
      idNumber: '',
      dob: '',
      phone: '',
      address: '',
    }
  });

  const handleUploadAndAutoFill = async () => {
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
      setUploadedPhotoUri(imageUri);
      setIsScanning(true);

      // Run OCR pipeline to extract text blocks
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
      setIsScanning(false);

      // Auto-fill form fields
      if (profile.fullName?.value) {
        setValue('fullName', profile.fullName.value, { shouldValidate: true });
      }
      if (profile.idNumber?.value) {
        setValue('idNumber', profile.idNumber.value, { shouldValidate: true });
      }
      if (profile.idType && profile.idType !== 'UNKNOWN') {
        const mappedType = profile.idType === 'DRIVING_LICENCE' ? 'DRIVING_LICENSE' : profile.idType;
        setValue('docType', mappedType);
      }
      if (profile.dob?.value) {
        setValue('dob', profile.dob.value);
      }
      if (profile.address?.value) {
        setValue('address', profile.address.value, { shouldValidate: true });
      }

      Alert.alert('Scan Complete', 'Document scanned! Check and refine any auto-filled details below.');

    } catch (error) {
      console.error('OCR Upload error:', error);
      setIsScanning(false);
      Alert.alert('Scan Failed', 'Could not extract text from the selected image. You can manually enter details.');
    }
  };

  const onSubmit = (data: FormData) => {
    router.push({
      pathname: '/checkin/review',
      params: {
        extractedName: data.fullName,
        extractedDocType: data.docType,
        extractedIdNumber: data.idNumber,
        extractedAddress: data.address,
        extractedPhone: data.phone,
        extractedDob: data.dob || '',
        selectedRoomId: selectedRoomId ? String(selectedRoomId) : '',
        photoUri: uploadedPhotoUri || '',
        isManual: 'true'
      },
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        >
          {/* PROGRESS STEPPER */}
          <View className="flex-row items-center justify-center mb-6 px-2 mt-2">
            <View className="items-center">
              <View className="w-8 h-8 rounded-full bg-foreground items-center justify-center">
                <Text className="text-background font-bold text-sm">1</Text>
              </View>
              <Text className="text-xs text-foreground font-semibold mt-1.5">Details</Text>
            </View>
            <View className="h-[2px] flex-1 bg-gray-200 dark:bg-gray-800 mx-3 mb-5" />
            <View className="items-center">
              <View className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 items-center justify-center">
                <Text className="text-gray-500 font-bold text-sm">2</Text>
              </View>
              <Text className="text-xs text-gray-400 font-medium mt-1.5">Review</Text>
            </View>
            <View className="h-[2px] flex-1 bg-gray-200 dark:bg-gray-800 mx-3 mb-5" />
            <View className="items-center">
              <View className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 items-center justify-center">
                <Text className="text-gray-500 font-bold text-sm">3</Text>
              </View>
              <Text className="text-xs text-gray-400 font-medium mt-1.5">Done</Text>
            </View>
          </View>

          {/* AUTO-FILL FROM UPLOADED ID BUTTON */}
          <GlassCard variant="elevated" className="mb-6 p-4 rounded-2xl border border-gray-100 dark:border-white/10 flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <View className="flex-row items-center gap-1.5 mb-1">
                <Sparkles size={16} color="#000000" />
                <Text className="text-sm font-bold text-foreground">Upload ID Card Photo</Text>
              </View>
              <Text className="text-xs text-gray-500">Pick an image from gallery to auto-fill form</Text>
            </View>
            <TouchableOpacity 
              onPress={handleUploadAndAutoFill}
              disabled={isScanning}
              activeOpacity={0.8}
              className="bg-foreground px-4 py-2.5 rounded-xl flex-row items-center gap-2"
            >
              {isScanning ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Upload size={16} color="#FFFFFF" />
                  <Text className="text-background font-semibold text-xs">Upload</Text>
                </>
              )}
            </TouchableOpacity>
          </GlassCard>

          {/* ROOM SELECTION SECTION */}
          <View className="flex-row justify-between items-center mb-3 ml-1">
            <Text className="text-xs font-bold text-gray-500 uppercase tracking-widest flex-row items-center gap-1.5">
              Select Room
            </Text>
            <TouchableOpacity 
              onPress={() => router.push('/rooms')}
              className="flex-row items-center gap-1"
            >
              <Plus size={14} color="#6B7280" />
              <Text className="text-xs text-gray-500 font-medium">Manage Rooms</Text>
            </TouchableOpacity>
          </View>

          <GlassCard variant="elevated" className="mb-6 p-4 rounded-2xl border border-gray-100 dark:border-white/10">
            {availableRooms.length > 0 ? (
              <View className="flex-row flex-wrap gap-2.5">
                {availableRooms.map((room) => {
                  const isSelected = selectedRoomId === room.id;
                  return (
                    <TouchableOpacity
                      key={room.id}
                      onPress={() => setSelectedRoomId(room.id)}
                      activeOpacity={0.7}
                      className={`px-4 py-3 rounded-xl border flex-row items-center gap-2 ${
                        isSelected 
                          ? 'border-foreground bg-foreground/10 dark:border-white dark:bg-white/15' 
                          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-black/20'
                      }`}
                    >
                      <DoorOpen size={16} color={isSelected ? '#000000' : '#6B7280'} />
                      <View>
                        <Text className={`font-bold text-sm ${isSelected ? 'text-foreground' : 'text-gray-700 dark:text-gray-300'}`}>
                          Room {room.room_number}
                        </Text>
                        <Text className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                          {room.room_type || 'Standard'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View className="py-2 flex-row justify-between items-center">
                <Text className="text-xs text-rose-500 font-medium">No available rooms. Add a room first.</Text>
                <TouchableOpacity 
                  onPress={() => router.push('/rooms')}
                  className="bg-primary/10 px-3 py-1.5 rounded-lg"
                >
                  <Text className="text-xs font-semibold text-foreground">+ Add Room</Text>
                </TouchableOpacity>
              </View>
            )}
          </GlassCard>

          {/* GUEST INFORMATION SECTION */}
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 ml-1">
            Guest Information
          </Text>

          <GlassCard variant="elevated" className="mb-6 p-5 rounded-2xl border border-gray-100 dark:border-white/10">
            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Full Name"
                  placeholder="Enter full name"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.fullName?.message}
                  icon={<User size={20} color="#9498AA" />}
                />
              )}
            />

            <Controller
              control={control}
              name="docType"
              render={({ field: { onChange, value } }) => (
                <View className="w-full mb-5">
                  <Text className="text-sm font-semibold text-foreground mb-2 ml-1 flex-row items-center">
                    Document Type
                  </Text>
                  <View className="flex-row flex-wrap gap-2.5">
                    {docTypes.map((type) => {
                      const isSelected = value === type;
                      return (
                        <TouchableOpacity
                          key={type}
                          onPress={() => onChange(type)}
                          activeOpacity={0.7}
                          className={`px-3.5 py-2 rounded-xl border ${
                            isSelected 
                              ? 'border-foreground bg-foreground/10 dark:border-white dark:bg-white/15' 
                              : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-black/20'
                          }`}
                        >
                          <Text className={`text-xs font-semibold tracking-wide ${
                            isSelected ? 'text-foreground font-bold' : 'text-gray-500'
                          }`}>
                            {type.replace('_', ' ')}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            />

            <Controller
              control={control}
              name="idNumber"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="ID Number"
                  placeholder="Enter ID number"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.idNumber?.message}
                  icon={<Hash size={20} color="#9498AA" />}
                />
              )}
            />

            <Controller
              control={control}
              name="dob"
              render={({ field: { onChange, value } }) => (
                <DatePicker
                  label="Date of Birth"
                  placeholder="YYYY-MM-DD"
                  value={value || ''}
                  onChangeText={onChange}
                  error={errors.dob?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Phone Number"
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.phone?.message}
                  icon={<Phone size={20} color="#9498AA" />}
                />
              )}
            />

            <Controller
              control={control}
              name="address"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Address"
                  placeholder="Enter full address"
                  returnKeyType="done"
                  blurOnSubmit={true}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.address?.message}
                  icon={<MapPin size={20} color="#9498AA" />}
                />
              )}
            />
          </GlassCard>

          <Button 
            label="Continue to Review" 
            size="lg" 
            variant="primary"
            onPress={handleSubmit(onSubmit)}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
