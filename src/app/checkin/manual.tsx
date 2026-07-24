import React from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { useRouter } from 'expo-router';
import { User, MapPin, Hash, Phone, Calendar, FileText } from 'lucide-react-native';

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
    // Navigate to review screen with the manual data
    router.push({
      pathname: '/checkin/review',
      params: {
        extractedName: data.fullName,
        extractedDocType: data.docType,
        extractedIdNumber: data.idNumber,
        extractedAddress: data.address,
        extractedPhone: data.phone,
        extractedDob: data.dob || '',
        isManual: 'true'
      },
    });
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} className="flex-1 bg-background">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {/* PROGRESS STEPPER */}
          <View className="flex-row items-center justify-center mb-8 px-2">
            <View className="items-center">
              <View className="w-8 h-8 rounded-full bg-primary items-center justify-center">
                <Text className="text-white font-bold text-sm">1</Text>
              </View>
              <Text className="text-xs text-primary font-semibold mt-1.5">Details</Text>
            </View>
            <View className="h-[2px] flex-1 bg-gray-200 mx-3 mb-5" />
            <View className="items-center">
              <View className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center">
                <Text className="text-gray-500 font-bold text-sm">2</Text>
              </View>
              <Text className="text-xs text-gray-400 font-medium mt-1.5">Review</Text>
            </View>
            <View className="h-[2px] flex-1 bg-gray-200 mx-3 mb-5" />
            <View className="items-center">
              <View className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center">
                <Text className="text-gray-500 font-bold text-sm">3</Text>
              </View>
              <Text className="text-xs text-gray-400 font-medium mt-1.5">Done</Text>
            </View>
          </View>

          <Text className="text-xs font-bold text-muted uppercase tracking-widest mb-4 ml-1">
            Guest Information
          </Text>

          <GlassCard variant="elevated" className="mb-6 p-5">
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
                  <View className="flex-row flex-wrap gap-3">
                    {docTypes.map((type) => {
                      const isSelected = value === type;
                      return (
                        <TouchableOpacity
                          key={type}
                          onPress={() => onChange(type)}
                          activeOpacity={0.7}
                          {...(Platform.OS === 'web' ? { style: { transition: 'all 0.2s' } } : {})}
                          className={`px-4 py-2.5 rounded-2xl border ${
                            isSelected 
                              ? 'border-primary bg-primary/10' 
                              : 'border-transparent/80 dark:border-transparent/40 bg-surface/50'
                          }`}
                        >
                          <Text className={`text-xs font-semibold tracking-wide ${
                            isSelected ? 'text-primary' : 'text-muted'
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


