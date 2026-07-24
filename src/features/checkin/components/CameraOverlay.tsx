import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusIndicator } from './StatusIndicator';
import { DocumentFrame } from './DocumentFrame';

interface CameraOverlayProps {
  frameWidth: number;
  frameHeight: number;
}

export const CameraOverlay: React.FC<CameraOverlayProps> = ({ frameWidth, frameHeight }) => {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Dark mask around the frame - simplified for performance on Expo */}
      <View style={styles.maskContainer}>
        {/* Top mask */}
        <View style={styles.mask} />
        <View style={styles.centerRow}>
          {/* Left mask */}
          <View style={styles.mask} />
          {/* Clear center */}
          <View style={{ width: frameWidth, height: frameHeight, justifyContent: 'center', alignItems: 'center' }}>
            <DocumentFrame width={frameWidth} height={frameHeight} />
          </View>
          {/* Right mask */}
          <View style={styles.mask} />
        </View>
        {/* Bottom mask */}
        <View style={[styles.mask, styles.bottomMask]}>
          <StatusIndicator />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  maskContainer: {
    flex: 1,
  },
  centerRow: {
    flexDirection: 'row',
  },
  mask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  bottomMask: {
    alignItems: 'center',
    paddingTop: 40,
  }
});
