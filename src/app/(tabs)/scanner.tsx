import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Platform, Alert, ActivityIndicator, ScrollView, Image, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Camera, FileText, X, ChevronRight, Upload, Image as ImageIcon, Globe, CheckCircle2, Trash2, User, Phone, IdCard, MapPin, Calendar, Users, Check, UserCheck, Share2, Link2, ExternalLink } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { OCRPipeline } from '@/features/checkin/camera/OCRPipeline';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useRoomsStore } from '@/store/useRoomsStore';
import { subscribeToPropertyCheckins, deleteCloudCheckinDoc, CloudGuestCheckin } from '@/services/firebaseSync';
import { createMultipleGuestsAndStay } from '@/database/stays';
import { GlassCard } from '@/components/GlassCard';

const ID_TYPES = [
  { id: 'UNKNOWN', label: 'Auto-Detect', description: 'Let the system identify the document' },
  { id: 'AADHAAR', label: 'Aadhaar Card', description: 'Standard 12-digit UIDAI card' },
  { id: 'PAN', label: 'PAN Card', description: 'Permanent Account Number card' },
  { id: 'VOTER_ID', label: 'Voter ID', description: 'Election Commission of India card' },
  { id: 'DRIVING_LICENCE', label: 'Driving Licence', description: 'Indian Driving Licence' },
  { id: 'PASSPORT', label: 'Passport', description: 'Republic of India Passport' },
];

export default function ScannerScreen() {
  const router = useRouter();
  const { businessName, propertyId, ownerId, getShareableLink } = useSettingsStore();
  const { rooms, fetchRooms } = useRoomsStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Online Self Check-ins Portal State
  const [pendingCheckins, setPendingCheckins] = useState<CloudGuestCheckin[]>([]);
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);
  const [selectedCheckinDetail, setSelectedCheckinDetail] = useState<CloudGuestCheckin | null>(null);
  const [isApprovingId, setIsApprovingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  // Real-time listener for incoming Web Self Check-ins
  useEffect(() => {
    if (!propertyId) return;
    const unsub = subscribeToPropertyCheckins(
      propertyId,
      (newCheckin) => {
        setPendingCheckins(prev => {
          if (prev.some(item => item.id === newCheckin.id)) return prev;
          return [newCheckin, ...prev];
        });
      },
      ownerId,
      false
    );
    return () => unsub();
  }, [propertyId, ownerId]);

  const handleApproveCheckin = async (checkin: CloudGuestCheckin) => {
    try {
      setIsApprovingId(checkin.id || 'current');

      let roomId = rooms.length > 0 ? rooms[0].id : 1;
      const matchedRoom = rooms.find(r => r.room_number === checkin.room_number);
      if (matchedRoom) roomId = matchedRoom.id;

      const allGuestsToImport = [
        {
          full_name: checkin.full_name,
          id_number: checkin.id_number || 'N/A',
          address: checkin.address || '',
          phone: checkin.phone || '',
          photo_uri: checkin.photo_uri || '',
          back_photo_uri: checkin.back_photo_uri || '',
          selfie_uri: checkin.selfie_uri || '',
          property_id: checkin.property_id,
          id_type: checkin.id_type || 'Aadhaar',
          dob: checkin.dob || '',
          gender: checkin.gender || 'Other',
          pin_code: checkin.pin_code || ''
        },
        ...(checkin.additional_guests || []).map((g: any) => ({
          full_name: g.fullName || 'Additional Guest',
          id_number: g.idNumber || 'N/A',
          address: checkin.address || '',
          phone: g.phone || checkin.phone || '',
          photo_uri: g.frontPhotoUri || '',
          back_photo_uri: g.backPhotoUri || '',
          selfie_uri: g.selfiePhotoUri || '',
          property_id: checkin.property_id,
          id_type: g.idType || 'Aadhaar',
          dob: g.dob || '',
          gender: g.gender || 'Other',
          pin_code: checkin.pin_code || ''
        }))
      ];

      const todayStr = new Date().toISOString().split('T')[0];

      await createMultipleGuestsAndStay(
        allGuestsToImport,
        {
          room_id: roomId,
          check_in_date: checkin.check_in_date || todayStr,
          check_out_date: checkin.check_out_date || checkin.check_in_date || todayStr
        }
      );

      // Delete from Cloud Firestore once approved
      if (checkin.id) {
        await deleteCloudCheckinDoc(checkin.id);
      }

      setPendingCheckins(prev => prev.filter(item => item.id !== checkin.id));
      if (selectedCheckinDetail?.id === checkin.id) {
        setSelectedCheckinDetail(null);
      }

      await fetchRooms();

      Alert.alert(
        'Self Check-in Approved! 🎉',
        `Guest ${checkin.full_name} (${allGuestsToImport.length} guest${allGuestsToImport.length > 1 ? 's' : ''}) assigned to Room ${checkin.room_number} has been registered into your app.`
      );
    } catch (e: any) {
      console.error('Approval failed', e);
      Alert.alert('Approval Failed', e?.message || 'Could not approve self check-in.');
    } finally {
      setIsApprovingId(null);
    }
  };

  const handleRejectCheckin = (checkin: CloudGuestCheckin) => {
    Alert.alert(
      'Reject & Remove Check-in?',
      `Are you sure you want to discard the online check-in request from ${checkin.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject & Remove',
          style: 'destructive',
          onPress: async () => {
            if (checkin.id) {
              await deleteCloudCheckinDoc(checkin.id);
            }
            setPendingCheckins(prev => prev.filter(item => item.id !== checkin.id));
            if (selectedCheckinDetail?.id === checkin.id) {
              setSelectedCheckinDetail(null);
            }
          }
        }
      ]
    );
  };

  const startScan = (idType: string) => {
    setModalVisible(false);
    router.push({
      pathname: '/checkin/camera',
      params: { idType }
    });
  };

  const handleUploadID = async () => {
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
      setIsScanning(true);

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

      router.push({
        pathname: '/checkin/review',
        params: {
          guestProfile: JSON.stringify(profile),
          photoUri: imageUri,
          extractedName: profile.fullName?.value || '',
          extractedDocType: profile.idType || 'UNKNOWN',
          extractedIdNumber: profile.idNumber?.value || '',
          extractedAddress: profile.address?.value || '',
          extractedDob: profile.dob?.value || '',
        }
      });

    } catch (error) {
      console.error('Upload & Scan error:', error);
      setIsScanning(false);
      Alert.alert('Scan Failed', 'Could not extract text from the selected image. Please try another image or use manual entry.');
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background justify-center items-center px-6">
      <View className="items-center mb-8 mt-4">
        <View className="w-24 h-24 bg-primary/10 rounded-full items-center justify-center mb-6">
          <Camera size={48} color="#000000" />
        </View>
        <Text className="text-2xl font-bold text-foreground mb-2 text-center">
          New Guest Registration
        </Text>
        <Text className="text-base text-gray-500 text-center px-2">
          Scan a government ID using your camera, upload an image from your gallery, or enter details manually.
        </Text>
      </View>

      <Button 
        label="Scan ID Card" 
        size="lg" 
        className="w-full mb-3"
        icon={<Camera size={20} color="#FFF" className="mr-2" />}
        onPress={() => setModalVisible(true)}
      />

      <Button 
        label={isScanning ? "Scanning Uploaded ID..." : "Upload ID Image"} 
        variant="secondary"
        size="lg" 
        className="w-full mb-3"
        isLoading={isScanning}
        icon={<Upload size={20} color="#FFF" className="mr-2" />}
        onPress={handleUploadID}
      />

      {/* ONLINE SELF CHECK-INS APPROVAL BUTTON */}
      <TouchableOpacity
        onPress={() => setIsPortalModalOpen(true)}
        activeOpacity={0.8}
        className="w-full mb-3 bg-emerald-600 active:bg-emerald-700 px-8 py-4 rounded-2xl flex-row items-center justify-center shadow-sm"
      >
        <Globe size={20} color="#FFFFFF" className="mr-2" />
        <Text className="text-white font-bold text-lg">
          Online Self Check-ins
        </Text>
        {pendingCheckins.length > 0 && (
          <View className="ml-2.5 bg-white px-2.5 py-0.5 rounded-full flex-row items-center justify-center">
            <Text className="text-emerald-700 font-extrabold text-xs">
              {pendingCheckins.length}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      
      <Button 
        label="Manual Entry" 
        variant="outline"
        size="lg" 
        className="w-full"
        icon={<FileText size={20} color="#1F2937" className="mr-2" />}
        onPress={() => router.push('/checkin/manual')}
      />

      {/* CAMERA ID TYPE SELECTION MODAL */}
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
                <X size={20} color="#000000" />
              </TouchableOpacity>
            </View>
            
            {ID_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                className="flex-row items-center p-4 mb-3 rounded-2xl bg-white dark:bg-black/20 border border-transparent dark:border-transparent"
                style={Platform.OS === 'web' ? ({ transition: 'all 0.2s ease' } as any) : undefined}
                activeOpacity={0.7}
                onPress={() => startScan(type.id)}
              >
                <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-4">
                  <FileText size={20} color="#000000" />
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

      {/* ONLINE SELF CHECK-INS APPROVAL PORTAL MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isPortalModalOpen}
        onRequestClose={() => setIsPortalModalOpen(false)}
        statusBarTranslucent={true}
      >
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-white dark:bg-[#12141C] rounded-t-3xl p-6 h-[90%] flex-col justify-between">
            
            {/* Header */}
            <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
              <View className="flex-row items-center gap-2.5">
                <View className="w-9 h-9 rounded-xl bg-emerald-500/15 items-center justify-center">
                  <Globe size={20} color="#10B981" />
                </View>
                <View>
                  <Text className="text-xl font-bold text-foreground">Online Self Check-ins</Text>
                  <Text className="text-xs text-gray-500 font-medium">Review and approve guest web submissions</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsPortalModalOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                <X size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Content List */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              
              {/* SHARE ONLINE CHECK-IN LINK CARD */}
              <GlassCard className="mb-5 p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2.5 flex-1">
                    <View className="w-8 h-8 rounded-lg bg-emerald-600 justify-center items-center">
                      <Link2 size={18} color="#FFFFFF" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-foreground">Guest Self Check-in Link</Text>
                      <Text className="text-xs text-gray-500">Allow guests to submit their details before arrival</Text>
                    </View>
                  </View>
                </View>

                <View className="flex-row gap-2 mt-2">
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        await fetchRooms();
                        const activeLink = getShareableLink(useRoomsStore.getState().rooms);
                        const message = `Hello! Welcome to ${businessName || 'our property'}. Please complete your online guest self check-in prior to arrival using your unique link:\n${activeLink}`;
                        await Share.share({ message, title: 'Homestay Self Check-in Link' });
                      } catch (e) {
                        console.error('Share error', e);
                      }
                    }}
                    className="flex-1 bg-emerald-600 active:bg-emerald-700 py-2.5 rounded-xl items-center justify-center flex-row gap-1.5 shadow-sm"
                  >
                    <Share2 size={16} color="#FFFFFF" />
                    <Text className="text-xs font-extrabold text-white">Share Link with Guest</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setIsPortalModalOpen(false);
                      router.push('/self-checkin');
                    }}
                    className="bg-white dark:bg-black/30 border border-gray-200 dark:border-gray-800 px-3.5 py-2.5 rounded-xl items-center justify-center flex-row gap-1.5"
                  >
                    <ExternalLink size={16} color="#000000" className="dark:text-white" />
                    <Text className="text-xs font-bold text-foreground">Open Portal</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
              {pendingCheckins.length === 0 ? (
                <View className="bg-gray-50 dark:bg-gray-800/20 p-8 rounded-2xl items-center justify-center border border-dashed border-gray-200 dark:border-gray-800 my-8">
                  <Globe size={40} color="#9CA3AF" className="mb-3" />
                  <Text className="text-base font-bold text-foreground text-center">No Pending Self Check-ins</Text>
                  <Text className="text-xs text-gray-500 text-center mt-1">
                    When guests complete check-in on your online link, their registrations will appear here for your approval.
                  </Text>
                </View>
              ) : (
                <View className="gap-4">
                  {pendingCheckins.map((checkin) => {
                    const addGuestsCount = (checkin.additional_guests || []).length;
                    const totalGuests = 1 + addGuestsCount;
                    const isApproving = isApprovingId === checkin.id;

                    return (
                      <GlassCard key={checkin.id} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
                        {/* Checkin Card Top Bar */}
                        <View className="flex-row justify-between items-start mb-3">
                          <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 rounded-full bg-emerald-500/10 items-center justify-center">
                              <Text className="text-emerald-600 font-extrabold text-base">
                                {checkin.full_name ? checkin.full_name.charAt(0).toUpperCase() : 'G'}
                              </Text>
                            </View>
                            <View>
                              <Text className="text-base font-bold text-foreground">{checkin.full_name}</Text>
                              <Text className="text-xs text-gray-500">Phone: {checkin.phone || 'N/A'}</Text>
                            </View>
                          </View>

                          <View className="bg-emerald-100 dark:bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-500/30">
                            <Text className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                              Room {checkin.room_number || 'N/A'}
                            </Text>
                          </View>
                        </View>

                        {/* Stay Summary Pills */}
                        <View className="flex-row flex-wrap gap-2 mb-4 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl">
                          <View className="flex-row items-center gap-1">
                            <Users size={14} color="#6B7280" />
                            <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                              {totalGuests} Guest{totalGuests > 1 ? 's' : ''} ({1} Primary{addGuestsCount > 0 ? ` + ${addGuestsCount} Additional` : ''})
                            </Text>
                          </View>
                          <Text className="text-gray-300 dark:text-gray-700">•</Text>
                          <View className="flex-row items-center gap-1">
                            <IdCard size={14} color="#6B7280" />
                            <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                              {checkin.id_type || 'Aadhaar'}: {checkin.id_number || 'N/A'}
                            </Text>
                          </View>
                        </View>

                        {/* Photo Thumbnail Row */}
                        {(checkin.photo_uri || checkin.selfie_uri) && (
                          <View className="flex-row gap-2 mb-4">
                            {checkin.photo_uri ? (
                              <View className="flex-1 h-20 rounded-xl overflow-hidden bg-black/10">
                                <Image source={{ uri: checkin.photo_uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                              </View>
                            ) : null}
                            {checkin.selfie_uri ? (
                              <View className="flex-1 h-20 rounded-xl overflow-hidden bg-black/10">
                                <Image source={{ uri: checkin.selfie_uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                              </View>
                            ) : null}
                          </View>
                        )}

                        {/* Action Buttons */}
                        <View className="flex-row gap-2.5">
                          <TouchableOpacity
                            onPress={() => setSelectedCheckinDetail(checkin)}
                            className="bg-gray-100 dark:bg-gray-800 px-3.5 py-2.5 rounded-xl justify-center items-center"
                          >
                            <Text className="text-xs font-bold text-foreground">View Details</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleRejectCheckin(checkin)}
                            className="bg-red-500/10 border border-red-500/30 px-3.5 py-2.5 rounded-xl justify-center items-center flex-row gap-1"
                          >
                            <Trash2 size={14} color="#EF4444" />
                            <Text className="text-xs font-bold text-red-500">Remove</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleApproveCheckin(checkin)}
                            disabled={isApproving}
                            className="flex-1 bg-emerald-600 active:bg-emerald-700 py-2.5 rounded-xl justify-center items-center flex-row gap-1.5"
                          >
                            {isApproving ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <>
                                <CheckCircle2 size={16} color="#FFFFFF" />
                                <Text className="text-xs font-extrabold text-white">Approve & Save</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </GlassCard>
                    );
                  })}
                </View>
              )}
            </ScrollView>

          </View>
        </View>
      </Modal>

      {/* DETAILED CHECK-IN PREVIEW MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={selectedCheckinDetail !== null}
        onRequestClose={() => setSelectedCheckinDetail(null)}
      >
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-white dark:bg-[#12141C] rounded-t-3xl p-6 h-[92%] flex-col justify-between">
            <View className="flex-row justify-between items-center mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
              <View>
                <Text className="text-xl font-bold text-foreground">{selectedCheckinDetail?.full_name}</Text>
                <Text className="text-xs text-emerald-600 font-semibold">Web Self Check-in Preview</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedCheckinDetail(null)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                <X size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {selectedCheckinDetail && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Photos Display */}
                <Text className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
                  ID & Selfie Photos
                </Text>
                <View className="gap-3 mb-5">
                  {selectedCheckinDetail.photo_uri ? (
                    <View className="bg-gray-50 dark:bg-gray-800/40 p-2.5 rounded-2xl border border-gray-100 dark:border-gray-800">
                      <Text className="text-xs font-bold text-foreground mb-1.5 ml-1">Front ID Photo</Text>
                      <Image source={{ uri: selectedCheckinDetail.photo_uri }} style={{ width: '100%', height: 180, borderRadius: 12 }} resizeMode="cover" />
                    </View>
                  ) : null}

                  {selectedCheckinDetail.back_photo_uri ? (
                    <View className="bg-gray-50 dark:bg-gray-800/40 p-2.5 rounded-2xl border border-gray-100 dark:border-gray-800">
                      <Text className="text-xs font-bold text-foreground mb-1.5 ml-1">Back ID Photo</Text>
                      <Image source={{ uri: selectedCheckinDetail.back_photo_uri }} style={{ width: '100%', height: 180, borderRadius: 12 }} resizeMode="cover" />
                    </View>
                  ) : null}

                  {selectedCheckinDetail.selfie_uri ? (
                    <View className="bg-sky-50 dark:bg-sky-950/30 p-2.5 rounded-2xl border border-sky-100 dark:border-sky-800/40">
                      <Text className="text-xs font-bold text-primary mb-1.5 ml-1">Guest Selfie Photo</Text>
                      <Image source={{ uri: selectedCheckinDetail.selfie_uri }} style={{ width: '100%', height: 200, borderRadius: 12 }} resizeMode="cover" />
                    </View>
                  ) : null}
                </View>

                {/* Primary Info Details */}
                <Text className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
                  Primary Guest Information
                </Text>
                <View className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 gap-2.5 mb-5">
                  <View className="flex-row justify-between pb-2 border-b border-gray-200/50 dark:border-gray-700/40">
                    <Text className="text-xs font-medium text-gray-500">Requested Room</Text>
                    <Text className="text-xs font-bold text-foreground">Room {selectedCheckinDetail.room_number}</Text>
                  </View>
                  <View className="flex-row justify-between pb-2 border-b border-gray-200/50 dark:border-gray-700/40">
                    <Text className="text-xs font-medium text-gray-500">Document Type</Text>
                    <Text className="text-xs font-bold text-foreground">{selectedCheckinDetail.id_type || 'N/A'}</Text>
                  </View>
                  <View className="flex-row justify-between pb-2 border-b border-gray-200/50 dark:border-gray-700/40">
                    <Text className="text-xs font-medium text-gray-500">ID Number</Text>
                    <Text className="text-xs font-bold text-foreground">{selectedCheckinDetail.id_number || 'N/A'}</Text>
                  </View>
                  <View className="flex-row justify-between pb-2 border-b border-gray-200/50 dark:border-gray-700/40">
                    <Text className="text-xs font-medium text-gray-500">Phone</Text>
                    <Text className="text-xs font-bold text-foreground">{selectedCheckinDetail.phone || 'N/A'}</Text>
                  </View>
                  <View className="flex-row justify-between pb-2 border-b border-gray-200/50 dark:border-gray-700/40">
                    <Text className="text-xs font-medium text-gray-500">Gender & DOB</Text>
                    <Text className="text-xs font-bold text-foreground">{selectedCheckinDetail.gender || 'N/A'} • {selectedCheckinDetail.dob || 'N/A'}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs font-medium text-gray-500">Address</Text>
                    <Text className="text-xs font-bold text-foreground max-w-[60%] text-right">{selectedCheckinDetail.address || 'N/A'}</Text>
                  </View>
                </View>

                {/* Additional Guests List */}
                {(selectedCheckinDetail.additional_guests || []).length > 0 && (
                  <View className="mb-5">
                    <Text className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
                      Additional Group Guests ({(selectedCheckinDetail.additional_guests || []).length})
                    </Text>
                    <View className="gap-3">
                      {(selectedCheckinDetail.additional_guests || []).map((g: any, idx: number) => (
                        <View key={idx} className="bg-gray-50 dark:bg-gray-800/40 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800">
                          <Text className="text-xs font-bold text-foreground mb-1">Person {idx + 2}: {g.fullName}</Text>
                          <Text className="text-[11px] text-gray-500 font-medium">Gender: {g.gender || 'N/A'} • DOB: {g.dob || 'N/A'}</Text>
                          <Text className="text-[11px] text-gray-500 font-medium">{g.idType || 'ID'}: {g.idNumber || 'N/A'}</Text>

                          {g.frontPhotoUri ? (
                            <Image source={{ uri: g.frontPhotoUri }} style={{ width: '100%', height: 120, borderRadius: 10, marginTop: 8 }} resizeMode="cover" />
                          ) : null}
                          {g.selfiePhotoUri ? (
                            <Image source={{ uri: g.selfiePhotoUri }} style={{ width: '100%', height: 120, borderRadius: 10, marginTop: 8 }} resizeMode="cover" />
                          ) : null}
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Approval Action Footer */}
            {selectedCheckinDetail && (
              <View className="pt-3 border-t border-gray-100 dark:border-gray-800 flex-row gap-3">
                <TouchableOpacity
                  onPress={() => handleRejectCheckin(selectedCheckinDetail)}
                  className="bg-red-500/10 border border-red-500/30 px-5 py-3.5 rounded-2xl justify-center items-center flex-row gap-1.5"
                >
                  <Trash2 size={18} color="#EF4444" />
                  <Text className="text-xs font-bold text-red-500">Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleApproveCheckin(selectedCheckinDetail)}
                  disabled={isApprovingId === selectedCheckinDetail.id}
                  className="flex-1 bg-emerald-600 active:bg-emerald-700 py-3.5 rounded-2xl justify-center items-center flex-row gap-2"
                >
                  {isApprovingId === selectedCheckinDetail.id ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <CheckCircle2 size={18} color="#FFFFFF" />
                      <Text className="text-sm font-extrabold text-white">Approve & Save Check-in</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
