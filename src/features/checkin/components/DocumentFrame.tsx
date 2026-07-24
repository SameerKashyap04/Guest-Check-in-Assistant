import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing, withSpring } from 'react-native-reanimated';
import { useAutoCaptureStore } from '../camera/AutoCaptureState';

interface DocumentFrameProps {
  width: number;
  height: number;
}

export const DocumentFrame: React.FC<DocumentFrameProps> = ({ width, height }) => {
  const status = useAutoCaptureStore(state => state.status);
  
  const borderColor = useSharedValue('rgba(255, 255, 255, 0.5)');
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    // Pulse animation removed, just static colors based on state
    if (status === 'IDLE') {
      borderColor.value = withTiming('rgba(255, 255, 255, 0.5)', { duration: 300 });
    } 
    else if (status === 'PROCESSING_FRONT' || status === 'PROCESSING_BACK') {
      borderColor.value = withTiming('rgba(255, 255, 255, 0.8)', { duration: 300 });
    } 
    else if (status === 'SUCCESS') {
      borderColor.value = withTiming('#4caf50', { duration: 300 });
    }
    else if (status === 'FLIP_DOCUMENT') {
      borderColor.value = withTiming('#2196f3', { duration: 300 });
    }
    else {
      // FAILED
      borderColor.value = withTiming('rgba(255, 0, 0, 0.5)', { duration: 300 });
    }
  }, [status]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      borderColor: borderColor.value,
      transform: [{ scale: pulseScale.value }]
    };
  });

  return (
    <Animated.View style={[styles.frame, { width, height }, animatedStyle]}>
      {/* Corner indicators for a "scanning" feel */}
      <View style={[styles.corner, styles.tl]} />
      <View style={[styles.corner, styles.tr]} />
      <View style={[styles.corner, styles.bl]} />
      <View style={[styles.corner, styles.br]} />
    </Animated.View>
  );
};

const CORNER_SZ = 30;
const BORDER = 4;

const styles = StyleSheet.create({
  frame: {
    borderWidth: 2,
    borderRadius: 16,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    borderColor: '#fff',
    width: CORNER_SZ,
    height: CORNER_SZ,
  },
  tl: { top: -2, left: -2, borderTopWidth: BORDER, borderLeftWidth: BORDER, borderTopLeftRadius: 16 },
  tr: { top: -2, right: -2, borderTopWidth: BORDER, borderRightWidth: BORDER, borderTopRightRadius: 16 },
  bl: { bottom: -2, left: -2, borderBottomWidth: BORDER, borderLeftWidth: BORDER, borderBottomLeftRadius: 16 },
  br: { bottom: -2, right: -2, borderBottomWidth: BORDER, borderRightWidth: BORDER, borderBottomRightRadius: 16 },
});
