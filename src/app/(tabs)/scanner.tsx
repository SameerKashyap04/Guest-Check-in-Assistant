import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Camera, FileText, X, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { GlassCard } from '@/components/GlassCard';

const ID_TYPES = [
  { id: 'UNKNOWN', label: 'Auto-Detect', description: 'Let the camera identify the document' },
  { id: 'AADHAAR', label: 'Aadhaar Card', description: 'Standard 12-digit UIDAI card' },
  { id: 'PAN', label: 'PAN Card', description: 'Permanent Account Number card' },
  { id: 'VOTER_ID', label: 'Voter ID', description: 'Election Commission of India card' },
  { id: 'DRIVING_LICENCE', label: 'Driving Licence', description: 'Indian Driving Licence' },
  { id: 'PASSPORT', label: 'Passport', description: 'Republic of India Passport' },
];

export default function ScannerScreen() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);

  const startScan = (idType: string) => {
    setModalVisible(false);
    router.push({
      pathname: '/checkin/camera',
      params: { idType }
    });
  };

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-background justify-center items-center px-6">
      <View className="items-center mb-10">
        <View className="w-24 h-24 bg-primary/10 rounded-full items-center justify-center mb-6">
          <Camera size={48} color="#38BDF8" />
        </View>
        <Text className="text-2xl font-bold text-foreground mb-2 text-center">
          New Guest Registration
        </Text>
        <Text className="text-base text-gray-500 text-center">
          Scan a government ID for quick auto-fill, or enter details manually.
        </Text>
      </View>

      <Button 
        label="Scan ID Card" 
        size="lg" 
        className="w-full mb-4"
        icon={<Camera size={20} color="#FFF" className="mr-2" />}
        onPress={() => setModalVisible(true)}
      />
      
      <Button 
        label="Manual Entry" 
        variant="outline"
        size="lg" 
        className="w-full"
        icon={<FileText size={20} color="#38BDF8" className="mr-2" />}
        onPress={() => router.push('/checkin/manual')}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-background rounded-t-3xl p-6 min-h-[60%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-foreground">Select ID Type</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} className="p-2 bg-primary/10 rounded-full">
                <X size={20} color="#38BDF8" />
              </TouchableOpacity>
            </View>
            
            {ID_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                className="flex-row items-center p-4 mb-3 rounded-2xl bg-white dark:bg-black/20 border border-transparent dark:border-transparent"
                style={Platform.OS === 'web' ? { transition: 'all 0.2s ease' } : undefined}
                activeOpacity={0.7}
                onPress={() => startScan(type.id)}
              >
                <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-4">
                  <FileText size={20} color="#38BDF8" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">{type.label}</Text>
                  <Text className="text-xs text-gray-500 mt-1">{type.description}</Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
