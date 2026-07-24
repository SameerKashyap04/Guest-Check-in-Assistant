import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, Alert, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/Button';
import { CheckCircle2, User, Hash, MapPin, Phone, Edit2, Calendar, DoorOpen } from 'lucide-react-native';
import { Input } from '@/components/Input';
import { createGuestAndStay } from '@/database/stays';
import { useRoomsStore } from '@/store/useRoomsStore';

export default function ReviewScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { rooms, fetchRooms } = useRoomsStore();
  const availableRooms = rooms.filter(r => r.status === 'available');

  useEffect(() => {
    fetchRooms();
  }, []);

  // Parse the serialized guest profile from the new scanner
  let profile: any = null;
  if (params.guestProfile) {
    try {
      const guestProfileStr = Array.isArray(params.guestProfile) ? params.guestProfile[0] : params.guestProfile;
      profile = JSON.parse(guestProfileStr);
    } catch (e) {
      console.warn("Failed to parse guestProfile", e);
    }
  }

  const [formData, setFormData] = useState({
    name: profile?.fullName?.value || (Array.isArray(params.extractedName) ? params.extractedName[0] : (params.extractedName || '')),
    idNumber: profile?.idNumber?.value || (Array.isArray(params.extractedIdNumber) ? params.extractedIdNumber[0] : (params.extractedIdNumber || '')),
    address: profile?.address?.value || (Array.isArray(params.extractedAddress) ? params.extractedAddress[0] : (params.extractedAddress || '')),
    phone: Array.isArray(params.extractedPhone) ? params.extractedPhone[0] : (params.extractedPhone || ''),
    docType: profile?.idType || (Array.isArray(params.extractedDocType) ? params.extractedDocType[0] : (params.extractedDocType || 'UNKNOWN')),
    dob: profile?.dob?.value || (Array.isArray(params.extractedDob) ? params.extractedDob[0] : (params.extractedDob || '')),
    gender: profile?.gender?.value || '',
    pinCode: profile?.pinCode?.value || '',
  });
  
  const photoUri = profile?.photoUri || (Array.isArray(params.photoUri) ? params.photoUri[0] : params.photoUri);

  const initialRoomId = params.selectedRoomId ? Number(Array.isArray(params.selectedRoomId) ? params.selectedRoomId[0] : params.selectedRoomId) : null;
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(initialRoomId);
  
  useEffect(() => {
    if (initialRoomId) {
      setSelectedRoomId(initialRoomId);
    } else if (availableRooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(availableRooms[0].id);
    }
  }, [availableRooms, initialRoomId]);
  
  // Default to today's date in YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  
  const [checkInDate, setCheckInDate] = useState(today);
  const [checkOutDate, setCheckOutDate] = useState(tomorrow);

  const handleSave = async () => {
    if (!selectedRoomId) {
      Alert.alert('Missing Info', 'Please select a room to assign to this guest.');
      return;
    }

    setIsSaving(true);
    try {
      await createGuestAndStay(
        {
          full_name: formData.name,
          id_number: formData.idNumber,
          address: formData.address,
          phone: formData.phone,
          photo_uri: photoUri || '',
          id_type: formData.docType,
          dob: formData.dob,
          gender: formData.gender,
          pin_code: formData.pinCode
        },
        {
          room_id: selectedRoomId,
          check_in_date: checkInDate,
          check_out_date: checkOutDate
        }
      );
      
      // Navigate to success or back to dashboard
      Alert.alert('Success', 'Guest checked in and room assigned successfully!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save guest and stay details');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

        {photoUri && (
          <View className="mb-8 items-center">
            <Text className="text-xs font-bold text-muted uppercase tracking-widest mb-3 self-start ml-1">
              ID Image
            </Text>
            <Image 
              source={{ uri: photoUri }} 
              style={{ width: '100%', height: 200, borderRadius: 24 }}
              resizeMode="cover"
            />
          </View>
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
                <Text className="text-xs font-semibold text-muted uppercase tracking-wide">Select Available Room</Text>
              </View>
              
              {availableRooms.length > 0 ? (
                <View className="flex-row flex-wrap gap-3">
                  {availableRooms.map((room) => {
                    const isSelected = selectedRoomId === room.id;
                    return (
                      <TouchableOpacity
                        key={room.id}
                        onPress={() => setSelectedRoomId(room.id)}
                        activeOpacity={0.7}
                        {...(Platform.OS === 'web' ? { style: { transition: 'all 0.2s' } } : {})}
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
                          {room.room_type || 'Standard'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text className="text-sm text-red-500 font-medium">No available rooms found. Please add or free up a room first.</Text>
              )}
            </View>

            <View className="flex-row gap-5">
              <View className="flex-1">
                <View className="flex-row items-center mb-2">
                  <Calendar size={14} color="#9498AA" className="mr-1.5" />
                  <Text className="text-[11px] font-semibold text-muted uppercase tracking-wider">Check In</Text>
                </View>
                <Input 
                  value={checkInDate} 
                  onChangeText={setCheckInDate} 
                  placeholder="YYYY-MM-DD" 
                  {...(Platform.OS === 'web' ? { type: 'date' } as any : {})}
                />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center mb-2">
                  <Calendar size={14} color="#9498AA" className="mr-1.5" />
                  <Text className="text-[11px] font-semibold text-muted uppercase tracking-wider">Check Out</Text>
                </View>
                <Input 
                  value={checkOutDate} 
                  onChangeText={setCheckOutDate} 
                  placeholder="YYYY-MM-DD" 
                  {...(Platform.OS === 'web' ? { type: 'date' } as any : {})}
                />
              </View>
            </View>
          </GlassCard>
        </View>


        {/* --- GUEST DETAILS SECTION --- */}
        <View className="flex-row justify-between items-center mb-4 mt-2 ml-1">
          <Text className="text-xs font-bold text-muted uppercase tracking-widest">
            Guest Details
          </Text>
          {!isEditing && (
             <TouchableOpacity onPress={() => setIsEditing(true)} className="flex-row items-center bg-primary/10 px-3.5 py-1.5 rounded-full" activeOpacity={0.7}>
               <Edit2 size={14} color="#38BDF8" className="mr-1.5" />
               <Text className="text-xs font-semibold text-primary">Edit</Text>
             </TouchableOpacity>
          )}
        </View>

        <GlassCard variant="elevated" className="mb-8 p-5">
          <View className="border-b border-transparent dark:border-transparent pb-5 mb-5">
            <View className="flex-row items-center mb-3">
              <User size={16} color="#9498AA" className="mr-2" />
              <Text className="text-[11px] font-semibold text-muted uppercase tracking-wider">Full Name</Text>
            </View>
            {isEditing ? (
              <Input value={formData.name} onChangeText={(v) => updateField('name', v)} />
            ) : (
              <Text className="text-base font-semibold text-foreground ml-6">{formData.name || 'Not provided'}</Text>
            )}
          </View>

          <View className="border-b border-transparent dark:border-transparent pb-5 mb-5">
            <View className="flex-row items-center mb-3">
              <Hash size={16} color="#9498AA" className="mr-2" />
              <Text className="text-[11px] font-semibold text-muted uppercase tracking-wider">Document Type & ID</Text>
            </View>
            {isEditing ? (
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Input value={formData.docType} onChangeText={(v) => updateField('docType', v)} placeholder="Type" />
                </View>
                <View className="flex-[2]">
                  <Input value={formData.idNumber} onChangeText={(v) => updateField('idNumber', v)} placeholder="ID Number" />
                </View>
              </View>
            ) : (
              <Text className="text-base font-semibold text-foreground ml-6">{formData.docType.replace('_', ' ')}: <Text className="font-medium text-muted">{formData.idNumber || 'Not provided'}</Text></Text>
            )}
          </View>

          <View className="border-b border-transparent dark:border-transparent pb-5 mb-5 flex-row gap-5">
            <View className="flex-1">
              <Text className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3 ml-6">Date of Birth</Text>
              {isEditing ? (
                <Input 
                  value={formData.dob} 
                  onChangeText={(v) => updateField('dob', v)} 
                  {...(Platform.OS === 'web' ? { type: 'date' } as any : {})}
                />
              ) : (
                <Text className="text-sm font-semibold text-foreground ml-6">{formData.dob || 'Not provided'}</Text>
              )}
            </View>
            <View className="flex-1">
              <Text className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Gender</Text>
              {isEditing ? (
                <Input value={formData.gender} onChangeText={(v) => updateField('gender', v)} />
              ) : (
                <Text className="text-sm font-semibold text-foreground">{formData.gender || 'Not provided'}</Text>
              )}
            </View>
          </View>

          <View className="border-b border-transparent dark:border-transparent pb-5 mb-5">
            <View className="flex-row items-center mb-3">
              <MapPin size={16} color="#9498AA" className="mr-2" />
              <Text className="text-[11px] font-semibold text-muted uppercase tracking-wider">Address & PIN</Text>
            </View>
            {isEditing ? (
              <View className="gap-3">
                <Input value={formData.address} onChangeText={(v) => updateField('address', v)} placeholder="Address" multiline />
                <Input value={formData.pinCode} onChangeText={(v) => updateField('pinCode', v)} placeholder="PIN Code" />
              </View>
            ) : (
              <Text className="text-sm font-medium text-foreground leading-relaxed ml-6">{formData.address || 'Not provided'} {formData.pinCode ? `\nPIN: ${formData.pinCode}` : ''}</Text>
            )}
          </View>

          <View>
            <View className="flex-row items-center mb-3">
              <Phone size={16} color="#9498AA" className="mr-2" />
              <Text className="text-[11px] font-semibold text-muted uppercase tracking-wider">Phone Number</Text>
            </View>
            {isEditing ? (
              <Input value={formData.phone} onChangeText={(v) => updateField('phone', v)} placeholder="Enter Phone Number" keyboardType="phone-pad" />
            ) : (
              <Text className="text-base font-semibold text-foreground ml-6">{formData.phone || 'Not provided'}</Text>
            )}
          </View>
        </GlassCard>

        {isEditing ? (
          <Button 
            label="Save Changes" 
            size="lg" 
            variant="primary"
            onPress={() => setIsEditing(false)}
            className="mb-4"
          />
        ) : (
          <Button 
            label="Confirm Check-in" 
            size="lg" 
            variant="primary"
            icon={<CheckCircle2 size={20} color="#FFF" className="mr-2" />}
            onPress={handleSave}
            isLoading={isSaving}
          />
        )}
        
        <Button 
          label="Cancel & Retake" 
          variant="ghost" 
          size="lg" 
          className="mt-3"
          onPress={() => router.back()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
