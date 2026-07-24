import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { useRouter } from 'expo-router';
import { User, MapPin, Hash, Phone, Calendar, DoorOpen, Plus } from 'lucide-react-native';
import { useRoomsStore } from '@/store/useRoomsStore';

const docTypes = ['AADHAAR', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID', 'OTHER'];

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

  const availableRooms = rooms.filter(r => r.status === 'available');

  useEffect(() => {
    fetchRooms();
  }, []);

  // Pre-select first available room if none selected
  useEffect(() => {
    if (availableRooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(availableRooms[0].id);
    }
  }, [availableRooms]);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
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
        isManual: 'true'
      },
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {/* PROGRESS STEPPER */}
          <View className="flex-row items-center justify-center mb-8 px-2 mt-2">
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
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Date of Birth"
                  placeholder="YYYY-MM-DD"
                  {...(Platform.OS === 'web' ? { type: 'date' } as any : {})}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.dob?.message}
                  icon={<Calendar size={20} color="#9498AA" />}
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
                  multiline
                  numberOfLines={3}
                  className="h-24 items-start pt-3"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.address?.message}
                  icon={<MapPin size={20} color="#9498AA" className="mt-1" />}
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
