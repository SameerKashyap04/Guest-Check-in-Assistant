import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera, RefreshCw, CheckCircle2, User } from 'lucide-react-native';
import { GlassCard } from '@/components/GlassCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CIRCLE_SIZE = Math.min(SCREEN_WIDTH - 80, 280);

interface SelfieCameraProps {
  onCapture: (photoUri: string) => void;
  onCancel?: () => void;
}

export function SelfieCamera({ onCapture, onCancel }: SelfieCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return (
      <View style={styles.container} className="justify-center items-center p-6 bg-black">
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text className="text-white mt-4 font-medium">Initializing camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container} className="justify-center items-center p-6 bg-slate-900">
        <GlassCard className="p-6 items-center max-w-xs text-center">
          <User size={48} color="#38BDF8" className="mb-4" />
          <Text className="text-xl font-bold text-white mb-2 text-center">Camera Access Needed</Text>
          <Text className="text-sm text-slate-300 mb-6 text-center">
            Camera permission is required to capture a verification selfie for self check-in.
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            className="w-full bg-primary py-3 rounded-xl items-center"
          >
            <Text className="text-white font-bold text-base">Grant Camera Access</Text>
          </TouchableOpacity>
        </GlassCard>
      </View>
    );
  }

  const handleTakeSelfie = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      if (photo?.uri) {
        onCapture(photo.uri);
      }
    } catch (e) {
      console.error('Failed to take selfie', e);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <View style={styles.container} className="bg-black flex-1">
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="front"
        mute={true}
      />

      {/* CIRCULAR FACE MASK OVERLAY */}
      <View style={styles.overlay} className="items-center justify-center">
        <View className="items-center mb-6 px-6">
          <Text className="text-white font-bold text-lg text-center shadow">Position Your Face</Text>
          <Text className="text-slate-200 text-xs text-center mt-1">Align your face inside the circle for verification</Text>
        </View>

        {/* CIRCULAR GUIDE */}
        <View
          style={{
            width: CIRCLE_SIZE,
            height: CIRCLE_SIZE,
            borderRadius: CIRCLE_SIZE / 2,
            borderWidth: 3,
            borderColor: '#38BDF8',
            shadowColor: '#38BDF8',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 16,
          }}
          className="items-center justify-center overflow-hidden bg-transparent"
        />

        {/* BOTTOM CAPTURE BAR */}
        <View className="absolute bottom-10 left-0 right-0 items-center px-6">
          <TouchableOpacity
            onPress={handleTakeSelfie}
            disabled={isCapturing}
            className="w-20 h-20 rounded-full border-4 border-white bg-primary/90 items-center justify-center shadow-lg active:scale-95"
          >
            {isCapturing ? (
              <ActivityIndicator color="#FFFFFF" size="large" />
            ) : (
              <View className="w-16 h-16 rounded-full bg-white items-center justify-center">
                <Camera size={28} color="#0EA5E9" />
              </View>
            )}
          </TouchableOpacity>

          {onCancel && (
            <TouchableOpacity onPress={onCancel} className="mt-6 py-2 px-4 rounded-full bg-black/40">
              <Text className="text-slate-300 text-sm font-semibold">Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
  },
});
