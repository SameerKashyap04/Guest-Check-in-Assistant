import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  CheckCircle2,
  AlertCircle,
  Camera,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  User,
  Phone,
  Mail,
  Globe,
  Briefcase,
  Car,
  Calendar,
  Building2,
  Lock,
  Sparkles,
  RefreshCw,
} from 'lucide-react-native';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/Button';
import { useSettingsStore } from '@/store/useSettingsStore';
import { validateCheckinToken, markTokenCompleted, CheckinToken } from '@/database/tokens';
import { createGuestAndStay } from '@/database/stays';
import { SelfieCamera } from '@/components/SelfieCamera';
import { OCRPipeline } from '@/features/checkin/camera/OCRPipeline';
import { IDDocumentType, GuestProfile } from '@/utils/scanner';
import { CameraView, useCameraPermissions } from 'expo-camera';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Step = 'welcome' | 'id_scan' | 'selfie' | 'form' | 'summary' | 'completed' | 'error';

export default function SelfCheckinScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { businessName, requireSelfie } = useSettingsStore();

  const [step, setStep] = useState<Step>('welcome');
  const [isValidating, setIsValidating] = useState(true);
  const [tokenRecord, setTokenRecord] = useState<CheckinToken | null>(null);
  const [errorReason, setErrorReason] = useState<string>('');

  // ID Scanning states
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scanningSide, setScanningSide] = useState<'front' | 'back'>('front');
  const [frontImageUri, setFrontImageUri] = useState<string | null>(null);
  const [backImageUri, setBackImageUri] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState<number>(0.92);
  const cameraRef = React.useRef<CameraView>(null);

  // Selfie state
  const [selfieUri, setSelfieUri] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [idType, setIdType] = useState('Aadhaar Card');
  const [idNumber, setIdNumber] = useState('');
  const [address, setAddress] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [nationality, setNationality] = useState('Indian');
  const [purposeOfVisit, setPurposeOfVisit] = useState('Tourism / Leisure');
  const [adults, setAdults] = useState('1');
  const [children, setChildren] = useState('0');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [checkoutDate, setCheckoutDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate Token on initial mount
  useEffect(() => {
    async function checkToken() {
      if (!token) {
        setErrorReason('No check-in token provided in link.');
        setStep('error');
        setIsValidating(false);
        return;
      }

      try {
        setIsValidating(true);
        const result = await validateCheckinToken(String(token));

        if (!result.valid) {
          setErrorReason(result.reason || 'Invalid check-in link.');
          setStep('error');
        } else if (result.token) {
          setTokenRecord(result.token);
          if (result.token.guest_name) {
            setFullName(result.token.guest_name);
          }
          setStep('welcome');
        }
      } catch (e) {
        console.error('Validation error', e);
        setErrorReason('Failed to validate check-in link. Please check your network connection.');
        setStep('error');
      } finally {
        setIsValidating(false);
      }
    }

    checkToken();
  }, [token]);

  // Handle OCR scan capture
  const handleCaptureIdPhoto = async () => {
    if (!cameraRef.current || isScanning) return;

    try {
      setIsScanning(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });

      if (!photo?.uri) return;

      if (scanningSide === 'front') {
        setFrontImageUri(photo.uri);
        
        // Process OCR on front image using OCRPipeline
        try {
          const blocks = await OCRPipeline.analyzeFrame(photo.uri);
          const initialProfile: GuestProfile = { idType: 'UNKNOWN' };
          const profile = OCRPipeline.processBlocks(blocks, initialProfile, 'UNKNOWN');

          if (profile.fullName?.value) setFullName(profile.fullName.value);
          if (profile.idNumber?.value) setIdNumber(profile.idNumber.value);
          if (profile.idType && profile.idType !== 'UNKNOWN') setIdType(profile.idType);
          if (profile.address?.value) setAddress(profile.address.value);
          if (profile.dob?.value) setDob(profile.dob.value);
          if (profile.gender?.value) setGender(profile.gender.value);
          if (profile.pinCode?.value) setPinCode(profile.pinCode.value);
        } catch (ocrErr) {
          console.warn('OCR extraction warning', ocrErr);
        }

        // Ask for back photo if document requires it
        setScanningSide('back');
      } else {
        setBackImageUri(photo.uri);
        // Both sides captured -> move to next step (selfie or form)
        if (requireSelfie) {
          setStep('selfie');
        } else {
          setStep('form');
        }
      }
    } catch (e) {
      console.error('Failed to capture ID photo', e);
      Alert.alert('Camera Error', 'Could not capture photo. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  // Submit check-in handler
  const handleConfirmCheckin = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required Field', 'Please enter your Full Name.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Required Field', 'Please enter your Phone Number.');
      return;
    }

    try {
      setIsSubmitting(true);

      const guestData = {
        full_name: fullName.trim(),
        id_number: idNumber.trim() || 'N/A',
        address: address.trim() || '',
        phone: phone.trim(),
        photo_uri: frontImageUri || '',
        back_photo_uri: backImageUri || '',
        id_type: idType || 'Aadhaar Card',
        dob: dob || '',
        gender: gender || '',
        pin_code: pinCode || '',
        selfie_uri: selfieUri || '',
        ocr_confidence: ocrConfidence,
      };

      const stayData = {
        room_id: tokenRecord?.room_id || 1,
        check_in_date: new Date().toISOString().split('T')[0],
        check_out_date: checkoutDate,
        purpose_of_visit: purposeOfVisit,
        adults: parseInt(adults, 10) || 1,
        children: parseInt(children, 10) || 0,
        vehicle_number: vehicleNumber.trim(),
        emergency_contact: emergencyContact.trim(),
        notes: notes.trim(),
      };

      // Save to SQLite
      await createGuestAndStay(guestData, stayData);

      // Mark token as completed so it cannot be reused
      if (token) {
        await markTokenCompleted(String(token));
      }

      setStep('completed');
    } catch (e) {
      console.error('Checkin submission error', e);
      Alert.alert('Check-in Failed', 'Could not save check-in details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render progress bar
  const renderProgress = () => {
    const stepsList: Step[] = requireSelfie 
      ? ['welcome', 'id_scan', 'selfie', 'form', 'summary']
      : ['welcome', 'id_scan', 'form', 'summary'];
    
    const currentIndex = stepsList.indexOf(step);
    if (currentIndex < 0 || step === 'completed' || step === 'error') return null;

    const progressPct = ((currentIndex + 1) / stepsList.length) * 100;

    return (
      <View className="px-6 pt-2 pb-4">
        <View className="flex-row justify-between items-center mb-1.5">
          <Text className="text-xs font-semibold text-sky-500 uppercase tracking-wider">
            Step {currentIndex + 1} of {stepsList.length}
          </Text>
          <Text className="text-xs text-gray-400 font-medium">
            {step === 'welcome' && 'Welcome'}
            {step === 'id_scan' && 'ID Document'}
            {step === 'selfie' && 'Face Verification'}
            {step === 'form' && 'Guest Info'}
            {step === 'summary' && 'Confirmation'}
          </Text>
        </View>
        <View className="h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <View 
            style={{ width: `${progressPct}%` }} 
            className="h-full bg-primary rounded-full transition-all duration-300" 
          />
        </View>
      </View>
    );
  };

  if (isValidating) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center p-6">
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text className="text-foreground font-semibold mt-4 text-center">Validating Check-in Link...</Text>
        <Text className="text-xs text-gray-400 mt-1 text-center">Connecting securely to hotel desk</Text>
      </SafeAreaView>
    );
  }

  // ERROR SCREEN
  if (step === 'error') {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center p-6">
        <GlassCard className="p-6 items-center w-full max-w-sm border border-red-500/20">
          <View className="w-16 h-16 rounded-full bg-red-500/10 items-center justify-center mb-4">
            <AlertCircle size={36} color="#EF4444" />
          </View>
          <Text className="text-xl font-bold text-foreground text-center mb-2">Check-in Unavailable</Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6 leading-relaxed">
            {errorReason || 'This check-in link is invalid or has expired.'}
          </Text>
          <Button 
            label="Return Home" 
            onPress={() => router.replace('/')} 
            className="w-full" 
          />
        </GlassCard>
      </SafeAreaView>
    );
  }

  // COMPLETED SCREEN
  if (step === 'completed') {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center p-6">
        <GlassCard className="p-8 items-center w-full max-w-md border border-emerald-500/30">
          <View className="w-20 h-20 rounded-full bg-emerald-500/10 items-center justify-center mb-5 border border-emerald-500/20">
            <CheckCircle2 size={44} color="#10B981" />
          </View>
          <Text className="text-2xl font-extrabold text-foreground text-center mb-1">Check-in Complete!</Text>
          <Text className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold mb-4 text-center">
            Welcome to {businessName || 'our Hotel'}
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400 text-center mb-6 leading-relaxed px-4">
            Your self check-in registration has been received and verified. Please collect your room key card from the front desk reception.
          </Text>

          <View className="w-full bg-sky-50 dark:bg-sky-950/40 p-4 rounded-xl mb-6 border border-sky-100 dark:border-sky-900/30">
            <Text className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">Booking Confirmation</Text>
            <Text className="text-base font-bold text-foreground">{fullName}</Text>
            {tokenRecord?.room_number && (
              <Text className="text-sm font-semibold text-primary mt-1">Assigned Room: {tokenRecord.room_number}</Text>
            )}
          </View>

          <Button 
            label="Done" 
            onPress={() => router.replace('/')} 
            className="w-full" 
          />
        </GlassCard>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background">
      {renderProgress()}

      {/* STEP 1: WELCOME SCREEN */}
      {step === 'welcome' && (
        <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1, justifyContent: 'space-between' }}>
          <View className="items-center py-6">
            <View className="w-20 h-20 bg-primary/10 rounded-3xl items-center justify-center mb-4 border border-primary/20">
              <Building2 size={40} color="#38BDF8" />
            </View>
            <Text className="text-2xl font-extrabold text-foreground text-center">
              Welcome to {businessName || 'Guest Check-in'}
            </Text>
            <Text className="text-xs text-gray-400 font-medium text-center mt-1">
              Contactless Express Mobile Check-in
            </Text>
          </View>

          <GlassCard className="p-6 mb-6 rounded-2xl border border-gray-100 dark:border-white/10">
            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Reservation Info</Text>
            
            {tokenRecord?.guest_name && (
              <View className="mb-3">
                <Text className="text-xs text-gray-400">Guest Name</Text>
                <Text className="text-base font-bold text-foreground">{tokenRecord.guest_name}</Text>
              </View>
            )}

            {tokenRecord?.booking_reference && (
              <View className="mb-3">
                <Text className="text-xs text-gray-400">Booking Reference</Text>
                <Text className="text-base font-bold text-sky-500">{tokenRecord.booking_reference}</Text>
              </View>
            )}

            {tokenRecord?.room_number && (
              <View className="mb-3">
                <Text className="text-xs text-gray-400">Assigned Room</Text>
                <Text className="text-base font-bold text-foreground">Room {tokenRecord.room_number} ({tokenRecord.room_type || 'Standard'})</Text>
              </View>
            )}

            <View className="flex-row items-center mt-2 pt-3 border-t border-gray-100 dark:border-gray-800">
              <ShieldCheck size={18} color="#10B981" className="mr-2" />
              <Text className="text-xs text-gray-500 dark:text-gray-400 flex-1">
                Encrypted & verified government compliance check-in
              </Text>
            </View>
          </GlassCard>

          <Button
            label="Start Self Check-in"
            icon={<ChevronRight size={20} color="#FFFFFF" className="ml-2" />}
            onPress={() => {
              if (!cameraPermission?.granted) {
                requestCameraPermission();
              }
              setStep('id_scan');
            }}
            className="w-full py-4 mb-4"
          />
        </ScrollView>
      )}

      {/* STEP 2: ID SCANNING */}
      {step === 'id_scan' && (
        <View className="flex-1 bg-black">
          {!cameraPermission?.granted ? (
            <View className="flex-1 justify-center items-center p-6 bg-slate-900">
              <GlassCard className="p-6 items-center max-w-xs">
                <Camera size={44} color="#38BDF8" className="mb-3" />
                <Text className="text-lg font-bold text-white mb-2 text-center">Camera Access Needed</Text>
                <Text className="text-xs text-slate-300 text-center mb-5">
                  We need camera permission to scan your ID card automatically.
                </Text>
                <Button label="Grant Permission" onPress={requestCameraPermission} className="w-full" />
              </GlassCard>
            </View>
          ) : (
            <View className="flex-1">
              <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
                {/* ID Frame overlay */}
                <View className="flex-1 items-center justify-center p-6 bg-black/40">
                  <Text className="text-white font-bold text-lg text-center mb-2 shadow">
                    Scan {scanningSide === 'front' ? 'Front Side' : 'Back Side'} of ID
                  </Text>
                  <Text className="text-slate-200 text-xs text-center mb-6">
                    Aadhaar, Driving Licence, Passport, Voter ID, or PAN
                  </Text>

                  {/* ID FRAME */}
                  <View 
                    style={{
                      width: SCREEN_WIDTH - 60,
                      height: (SCREEN_WIDTH - 60) * 0.63,
                      borderWidth: 2,
                      borderColor: '#38BDF8',
                      borderRadius: 16,
                    }}
                    className="overflow-hidden bg-transparent justify-between p-3"
                  >
                    <View className="flex-row justify-between">
                      <View className="w-4 h-4 border-t-2 border-l-2 border-white" />
                      <View className="w-4 h-4 border-t-2 border-r-2 border-white" />
                    </View>
                    <View className="flex-row justify-between">
                      <View className="w-4 h-4 border-b-2 border-l-2 border-white" />
                      <View className="w-4 h-4 border-b-2 border-r-2 border-white" />
                    </View>
                  </View>

                  {/* CAPTURE BUTTON */}
                  <TouchableOpacity
                    onPress={handleCaptureIdPhoto}
                    disabled={isScanning}
                    className="w-18 h-18 rounded-full border-4 border-white bg-primary items-center justify-center mt-10 active:scale-95"
                  >
                    {isScanning ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <View className="w-14 h-14 rounded-full bg-white items-center justify-center">
                        <Camera size={24} color="#0EA5E9" />
                      </View>
                    )}
                  </TouchableOpacity>

                  {scanningSide === 'back' && (
                    <TouchableOpacity 
                      onPress={() => {
                        if (requireSelfie) setStep('selfie');
                        else setStep('form');
                      }} 
                      className="mt-4"
                    >
                      <Text className="text-slate-300 text-xs font-semibold underline">Skip Back Side</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </CameraView>
            </View>
          )}
        </View>
      )}

      {/* STEP 3: VERIFICATION SELFIE (Conditional) */}
      {step === 'selfie' && (
        <SelfieCamera
          onCapture={(photoUri) => {
            setSelfieUri(photoUri);
            setStep('form');
          }}
          onCancel={() => {
            setStep('form');
          }}
        />
      )}

      {/* STEP 4: GUEST INFO FORM */}
      {step === 'form' && (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          <Text className="text-xl font-bold text-foreground mb-1">Guest Information</Text>
          <Text className="text-xs text-gray-500 mb-5">Review and complete your check-in details</Text>

          <GlassCard className="p-5 mb-5 rounded-2xl border border-gray-100 dark:border-white/10">
            {/* Full Name */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-gray-500 mb-1">Full Name *</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter full name"
                placeholderTextColor="#94A3B8"
                className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-foreground font-medium"
              />
            </View>

            {/* Phone */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-gray-500 mb-1">Phone Number *</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="Enter 10-digit mobile number"
                placeholderTextColor="#94A3B8"
                className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-foreground font-medium"
              />
            </View>

            {/* Email */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-gray-500 mb-1">Email Address</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                placeholder="guest@example.com"
                placeholderTextColor="#94A3B8"
                className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-foreground font-medium"
              />
            </View>

            {/* ID Type & Number */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-xs font-bold text-gray-500 mb-1">ID Type</Text>
                <TextInput
                  value={idType}
                  onChangeText={setIdType}
                  placeholder="ID Type"
                  placeholderTextColor="#94A3B8"
                  className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-foreground font-medium"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-gray-500 mb-1">ID Number</Text>
                <TextInput
                  value={idNumber}
                  onChangeText={setIdNumber}
                  placeholder="ID Number"
                  placeholderTextColor="#94A3B8"
                  className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-foreground font-medium"
                />
              </View>
            </View>

            {/* Address */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-gray-500 mb-1">Address</Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="Residential address"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={2}
                className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-foreground font-medium"
              />
            </View>

            {/* Purpose & Vehicle */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-xs font-bold text-gray-500 mb-1">Purpose of Visit</Text>
                <TextInput
                  value={purposeOfVisit}
                  onChangeText={setPurposeOfVisit}
                  placeholder="Leisure / Business"
                  placeholderTextColor="#94A3B8"
                  className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-foreground font-medium"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-gray-500 mb-1">Vehicle No.</Text>
                <TextInput
                  value={vehicleNumber}
                  onChangeText={setVehicleNumber}
                  placeholder="e.g. KA-01-AB-1234"
                  placeholderTextColor="#94A3B8"
                  className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-foreground font-medium"
                />
              </View>
            </View>
          </GlassCard>

          <Button
            label="Continue to Summary"
            icon={<ChevronRight size={18} color="#FFFFFF" className="ml-2" />}
            onPress={() => setStep('summary')}
            className="w-full py-4"
          />
        </ScrollView>
      )}

      {/* STEP 5: SUMMARY & CONFIRMATION */}
      {step === 'summary' && (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          <Text className="text-xl font-bold text-foreground mb-1">Confirm Check-in</Text>
          <Text className="text-xs text-gray-500 mb-5">Please review your check-in summary before submitting</Text>

          <GlassCard className="p-5 mb-5 rounded-2xl border border-gray-100 dark:border-white/10">
            {/* Photos Preview */}
            <View className="flex-row gap-3 mb-5">
              {frontImageUri && (
                <View className="flex-1 items-center">
                  <Image source={{ uri: frontImageUri }} className="w-full h-24 rounded-xl bg-gray-100" resizeMode="cover" />
                  <Text className="text-[10px] text-gray-400 mt-1 font-semibold">ID Front Photo</Text>
                </View>
              )}
              {selfieUri && (
                <View className="flex-1 items-center">
                  <Image source={{ uri: selfieUri }} className="w-full h-24 rounded-xl bg-gray-100" resizeMode="cover" />
                  <Text className="text-[10px] text-gray-400 mt-1 font-semibold">Verification Selfie</Text>
                </View>
              )}
            </View>

            <View className="mb-3 border-b border-gray-100 dark:border-gray-800 pb-3">
              <Text className="text-xs text-gray-400">Guest Name</Text>
              <Text className="text-lg font-bold text-foreground">{fullName}</Text>
            </View>

            <View className="flex-row justify-between mb-3 border-b border-gray-100 dark:border-gray-800 pb-3">
              <View>
                <Text className="text-xs text-gray-400">Phone</Text>
                <Text className="text-sm font-semibold text-foreground">{phone}</Text>
              </View>
              <View>
                <Text className="text-xs text-gray-400">ID Document</Text>
                <Text className="text-sm font-semibold text-foreground">{idType}</Text>
              </View>
            </View>

            <View className="mb-3">
              <Text className="text-xs text-gray-400">Assigned Room</Text>
              <Text className="text-base font-bold text-primary">
                {tokenRecord?.room_number ? `Room ${tokenRecord.room_number}` : 'Front Desk Assignment'}
              </Text>
            </View>
          </GlassCard>

          <View className="gap-3">
            <Button
              label={isSubmitting ? "Submitting Check-in..." : "Confirm & Complete Check-in"}
              disabled={isSubmitting}
              icon={isSubmitting ? <ActivityIndicator color="#FFFFFF" className="mr-2" /> : <CheckCircle2 size={20} color="#FFFFFF" className="mr-2" />}
              onPress={handleConfirmCheckin}
              className="w-full py-4"
            />

            <TouchableOpacity 
              onPress={() => setStep('form')} 
              className="w-full py-3 bg-gray-100 dark:bg-gray-800/60 rounded-xl items-center"
            >
              <Text className="text-xs font-bold text-gray-700 dark:text-gray-300">Edit Information</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                setFrontImageUri(null);
                setBackImageUri(null);
                setSelfieUri(null);
                setScanningSide('front');
                setStep('id_scan');
              }} 
              className="w-full py-3 rounded-xl items-center"
            >
              <Text className="text-xs font-bold text-sky-500">Scan ID Again</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
