import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, useEffect } from 'react';
import { LightSensor } from 'expo-sensors';
import {
  Button,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraOverlay } from '@/features/checkin/components/CameraOverlay';
import { StatusIndicator } from '@/features/checkin/components/StatusIndicator';
import { useAutoCapture } from '@/features/checkin/hooks/useAutoCapture';
import { useAutoCaptureStore } from '@/features/checkin/camera/AutoCaptureState';
import { GuestProfile } from '@/utils/scanner';

const { width: W } = Dimensions.get('window');
const VF_W = W - 48;
const VF_H = VF_W * 0.63;

export default function CameraScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const params = useLocalSearchParams();
  
  // Use navigation focus to pause/resume the camera analysis loop
  const [isFocused, setIsFocused] = useState(true);
  const status = useAutoCaptureStore((s) => s.status);

  useEffect(() => {
    let subscription: any;
    
    // Check if the device has a light sensor
    LightSensor.isAvailableAsync().then((available) => {
      if (available && isFocused) {
        LightSensor.setUpdateInterval(500); // Check every half second
        subscription = LightSensor.addListener(({ illuminance }) => {
          // Normal room light is ~100-300 lux. A dark room is typically < 30 lux.
          if (illuminance < 15) {
            setIsTorchOn(true);
          } else if (illuminance > 30) {
            setIsTorchOn(false);
          }
        });
      }
    });

    return () => {
      if (subscription) subscription.remove();
    };
  }, [isFocused]);

  // Captured photo refs for instant synchronous access across async renders
  const capturedFrontUriRef = useRef<string>('');
  const capturedBackUriRef = useRef<string>('');

  // Target scanning side: 'front' or 'back'
  const initialSide = (params.targetSide === 'back' ? 'back' : 'front') as 'front' | 'back';
  const [scanSide, setScanSide] = useState<'front' | 'back'>(initialSide);
  const [frontCapturedUri, setFrontCapturedUri] = useState<string | null>(null);
  const [backCapturedUri, setBackCapturedUri] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const target = (params.targetSide === 'back' ? 'back' : 'front') as 'front' | 'back';
      setScanSide(target);

      if (target === 'back') {
        useAutoCaptureStore.getState().setStatus('PROCESSING_BACK');
      } else {
        useAutoCaptureStore.getState().reset();
        capturedFrontUriRef.current = '';
        capturedBackUriRef.current = '';
        setFrontCapturedUri(null);
        setBackCapturedUri(null);
      }
      
      // If a specific ID type was selected, lock it in immediately
      if (params.idType && params.idType !== 'UNKNOWN') {
        useAutoCaptureStore.getState().setDocumentType(params.idType as any);
      }
      
      setIsFocused(true);
      return () => {
        setIsFocused(false);
      };
    }, [params.targetSide, params.idType])
  );

  const handleCapturePress = async () => {
    let capturedUri = '';
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          skipProcessing: false,
        });
        if (photo?.uri) {
          capturedUri = photo.uri;
        }
      } catch (e) {
        console.warn('Take picture error', e);
      }
    }

    const profile = { ...useAutoCaptureStore.getState().extractedData };
    if (scanSide === 'front') {
      const uri = capturedUri || profile.photoUri || '';
      capturedFrontUriRef.current = uri;
      profile.photoUri = uri;
      setFrontCapturedUri(uri);
      useAutoCaptureStore.getState().updateExtractedData({ photoUri: uri });

      // If targeted to just front side from Review screen, return immediately
      if (params.targetSide === 'front' && params.guestIndex !== undefined) {
        returnToReviewWithPhoto('photoUri', uri, profile);
        return;
      }

      // Transition to Back side scan
      setScanSide('back');
      useAutoCaptureStore.getState().setStatus('PROCESSING_BACK');
    } else {
      const uri = capturedUri || profile.backPhotoUri || '';
      capturedBackUriRef.current = uri;
      profile.backPhotoUri = uri;
      setBackCapturedUri(uri);
      useAutoCaptureStore.getState().updateExtractedData({ backPhotoUri: uri });
      useAutoCaptureStore.getState().setCaptured(true);

      if (params.targetSide === 'back' && params.guestIndex !== undefined) {
        returnToReviewWithPhoto('backPhotoUri', uri, profile);
        return;
      }

      navigateToReview(profile, uri);
    }
  };

  const returnToReviewWithPhoto = (field: 'photoUri' | 'backPhotoUri', uri: string, profile: any) => {
    let existing: any[] = [];
    if (params.existingGuests) {
      try {
        const str = Array.isArray(params.existingGuests) ? params.existingGuests[0] : params.existingGuests;
        existing = JSON.parse(str);
      } catch (e) {
        console.warn('Failed to parse existingGuests', e);
      }
    }
    const idx = Number(params.guestIndex || 0);
    if (existing[idx]) {
      existing[idx][field] = uri;
      if (profile.fullName?.value && !existing[idx].name) existing[idx].name = profile.fullName.value;
      if (profile.idNumber?.value && !existing[idx].idNumber) existing[idx].idNumber = profile.idNumber.value;
      if (profile.address?.value && !existing[idx].address) existing[idx].address = profile.address.value;
    }
    router.push({
      pathname: '/checkin/review',
      params: {
        guestList: JSON.stringify(existing),
        selectedRoomId: params.selectedRoomId || '',
      },
    });
  };

  const navigateToReview = (profile: any, currentBackUri?: string) => {
    const finalFront = capturedFrontUriRef.current || frontCapturedUri || profile?.photoUri || '';
    const finalBack = currentBackUri || capturedBackUriRef.current || backCapturedUri || profile?.backPhotoUri || '';

    if (params.returnToReview === 'true') {
      let existing: any[] = [];
      if (params.existingGuests) {
        try {
          const str = Array.isArray(params.existingGuests) ? params.existingGuests[0] : params.existingGuests;
          existing = JSON.parse(str);
        } catch (e) {
          console.warn('Failed to parse existingGuests', e);
        }
      }
      const newGuest = {
        name: profile?.fullName?.value || '',
        idNumber: profile?.idNumber?.value || '',
        address: profile?.address?.value || '',
        phone: '',
        docType: profile?.idType || 'UNKNOWN',
        dob: profile?.dob?.value || '',
        gender: profile?.gender?.value || '',
        pinCode: profile?.pinCode?.value || '',
        photoUri: finalFront,
        backPhotoUri: finalBack
      };
      existing.push(newGuest);
      router.push({
        pathname: '/checkin/review',
        params: {
          guestList: JSON.stringify(existing),
          selectedRoomId: params.selectedRoomId || '',
        },
      });
    } else {
      router.push({
        pathname: '/checkin/review',
        params: {
          guestProfile: JSON.stringify({
            ...profile,
            photoUri: finalFront,
            backPhotoUri: finalBack
          }),
        },
      });
    }
  };

  useAutoCapture({
    cameraRef,
    isCameraReady,
    isActive: isFocused,
  });
  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permText}>Camera permission is required to scan ID cards.</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={{ marginTop: 16 }}>
          <Text style={styles.backText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        enableTorch={isTorchOn}
        mode="picture"
        mute={true}
        onCameraReady={() => setIsCameraReady(true)}
      />

      <CameraOverlay frameWidth={VF_W} frameHeight={VF_H} />

      {/* Top overlay */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Text style={styles.closeTxt}>✕</Text>
        </TouchableOpacity>
        
        {/* Side Selector Tabs */}
        <View style={styles.sideSelector}>
          <TouchableOpacity
            onPress={() => {
              setScanSide('front');
              useAutoCaptureStore.getState().setStatus('PROCESSING_FRONT');
            }}
            style={[styles.sideTab, scanSide === 'front' && styles.sideTabActive]}
          >
            <Text style={[styles.sideTabText, scanSide === 'front' && styles.sideTabTextActive]}>
              Front Side {frontCapturedUri ? '✓' : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setScanSide('back');
              useAutoCaptureStore.getState().setStatus('PROCESSING_BACK');
            }}
            style={[styles.sideTab, scanSide === 'back' && styles.sideTabActive]}
          >
            <Text style={[styles.sideTabText, scanSide === 'back' && styles.sideTabTextActive]}>
              Back Side {backCapturedUri ? '✓' : ''}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.flipBtn}
          onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
        >
          <Text style={styles.closeTxt}>⟳</Text>
        </TouchableOpacity>
      </View>

      <StatusIndicator />

      {/* Capture Button & Skip to Review Area */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', paddingHorizontal: 30 }}>
          <TouchableOpacity 
            style={styles.captureBtnOuter}
            onPress={handleCapturePress}
          >
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>

          {(frontCapturedUri || backCapturedUri) && (
            <TouchableOpacity
              onPress={() => navigateToReview(useAutoCaptureStore.getState().extractedData)}
              style={styles.doneBtn}
            >
              <Text style={styles.doneBtnText}>Review →</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.hint}>
          {scanSide === 'front' ? 'Hold front side steady or tap button to capture' : 'Hold back side steady or tap button to capture'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  sideSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sideTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sideTabActive: {
    backgroundColor: '#7C3AED',
  },
  sideTabText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700',
  },
  sideTabTextActive: {
    color: '#FFFFFF',
  },
  doneBtn: {
    position: 'absolute',
    right: 24,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    zIndex: 10,
  },
  captureBtnOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnDisabled: {
    opacity: 0.5,
  },
  captureBtnInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 16,
    textAlign: 'center',
  },
  permText: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 32,
    fontSize: 16,
  },
  backText: {
    color: '#38BDF8',
    textAlign: 'center',
    fontSize: 14,
  },
});
