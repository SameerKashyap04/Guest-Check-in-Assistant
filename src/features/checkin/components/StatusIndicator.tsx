import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { CaptureStatus, useAutoCaptureStore } from '../camera/AutoCaptureState';
import { IDDocumentType } from '@/utils/scanner';

export function StatusIndicator() {
  const status = useAutoCaptureStore((s) => s.status);
  const docType = useAutoCaptureStore((s) => s.documentType);

  return (
    <Animated.View 
      entering={FadeIn} 
      exiting={FadeOut}
      style={[
        styles.container,
        status === 'SUCCESS' ? styles.success : null,
        status === 'FLIP_DOCUMENT' ? styles.flip : null,
      ]}
    >
      <Text style={styles.text}>
        {getStatusMessage(status, docType)}
      </Text>
    </Animated.View>
  );
}

function getStatusMessage(status: CaptureStatus, docType: IDDocumentType): string {
  const docName = docType === 'UNKNOWN' ? 'Document' : docType.replace('_', ' ');

  switch (status) {
    case 'IDLE':
      return `Align ${docName} and press Capture`;
    case 'PROCESSING_FRONT':
      return 'Processing image...';
    case 'FLIP_DOCUMENT':
      return `Please flip ${docName} and press Capture`;
    case 'PROCESSING_BACK':
      return 'Processing back side...';
    case 'SUCCESS':
      return 'Success! Redirecting...';
    case 'FAILED':
      return 'Scan failed. Try again.';
    default:
      return 'Align ID and press Capture';
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 140,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  success: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    borderColor: 'rgba(76, 175, 80, 1)',
  },
  flip: {
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
    borderColor: 'rgba(33, 150, 243, 1)',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  }
});
