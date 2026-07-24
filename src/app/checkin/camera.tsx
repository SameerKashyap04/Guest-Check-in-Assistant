import { CameraView, useCameraPermissions } from 'expo-camera';
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

  useFocusEffect(
    useCallback(() => {
      useAutoCaptureStore.getState().reset();
      
      // If a specific ID type was selected, lock it in immediately
      if (params.idType && params.idType !== 'UNKNOWN') {
        useAutoCaptureStore.getState().setDocumentType(params.idType as any);
      }
      
      setIsFocused(true);
      return () => {
        setIsFocused(false);
      };
    }, [params.idType])
  );

  const handleCapturePress = () => {
    // Manually finalize the scan using whatever data has been accumulated in the background
    useAutoCaptureStore.getState().setCaptured(true);
    
    // Quick flash effect or haptic could go here
    
    const profile = useAutoCaptureStore.getState().extractedData;
    router.push({
      pathname: '/checkin/review',
      params: {
        guestProfile: JSON.stringify(profile),
      },
    });
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
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
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
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeTxt}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Scan ID Card</Text>
        <TouchableOpacity
          style={styles.flipBtn}
          onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
        >
          <Text style={styles.closeTxt}>⟳</Text>
        </TouchableOpacity>
      </View>

      <StatusIndicator />

      {/* Capture Button Area */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity 
          style={styles.captureBtnOuter}
          onPress={handleCapturePress}
        >
          <View style={styles.captureBtnInner} />
        </TouchableOpacity>
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
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
