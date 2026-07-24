import { useEffect, useRef, useCallback } from 'react';
import { CameraView } from 'expo-camera';
import { useAutoCaptureStore } from '../camera/AutoCaptureState';
import { OCRPipeline } from '../camera/OCRPipeline';
import { GuestProfile } from '@/utils/scanner';

interface UseAutoCaptureProps {
  cameraRef: React.RefObject<CameraView | null>;
  isCameraReady: boolean;
  isActive: boolean;
}

export function useAutoCapture({
  cameraRef,
  isCameraReady,
  isActive
}: UseAutoCaptureProps) {
  const store = useAutoCaptureStore();
  const loopActive = useRef(false);
  const isProcessingRef = useRef(false);
  
  const flipHoldCounter = useRef(0);

  useEffect(() => {
    if (isCameraReady && isActive && !store.hasCaptured) {
      loopActive.current = true;
      startOCRScannerLoop();
    } else {
      loopActive.current = false;
    }
    
    return () => {
      loopActive.current = false;
    };
  }, [isCameraReady, isActive, store.hasCaptured]);

  const startOCRScannerLoop = useCallback(async () => {
    if (isProcessingRef.current || !loopActive.current) return;
    
    isProcessingRef.current = true;

    try {
      if (cameraRef.current) {
        // Use skipProcessing to reduce the amount of time the Android camera preview freezes
        const photo = await cameraRef.current.takePictureAsync({
          base64: false,
          shutterSound: false,
          skipProcessing: true,
          quality: 0.5
        });

        if (photo?.uri && loopActive.current) {
          const blocks = await OCRPipeline.analyzeFrame(photo.uri);
          
          if (blocks.length > 0) {
            const currentProfile = useAutoCaptureStore.getState().extractedData;
            const currentDocType = useAutoCaptureStore.getState().documentType;
            const currentStatus = useAutoCaptureStore.getState().status;

            const mergedProfile = OCRPipeline.processBlocks(blocks, currentProfile, currentDocType);
            
            store.setDocumentType(mergedProfile.idType);
            store.updateExtractedData(mergedProfile);

            if (mergedProfile.idType !== 'UNKNOWN' && currentStatus === 'IDLE') {
              store.setStatus('PROCESSING_FRONT');
            }

            if (currentStatus === 'PROCESSING_FRONT' || currentStatus === 'IDLE') {
              if (OCRPipeline.isFrontComplete(mergedProfile)) {
                if (OCRPipeline.requiresBackScan(mergedProfile)) {
                  flipHoldCounter.current += 1;
                  if (flipHoldCounter.current > 2) {
                    store.setStatus('FLIP_DOCUMENT');
                    setTimeout(() => {
                      if (!store.hasCaptured) {
                        store.setStatus('PROCESSING_BACK');
                      }
                    }, 2000);
                  }
                } else {
                  store.setStatus('SUCCESS');
                }
              }
            } 
            else if (currentStatus === 'PROCESSING_BACK') {
              if (mergedProfile.address && mergedProfile.address.confidence >= 75) {
                store.setStatus('SUCCESS');
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('OCR Frame analysis failed:', err);
    } finally {
      isProcessingRef.current = false;
      
      if (loopActive.current && !store.hasCaptured) {
        // Increased delay to 1500ms to reduce the frequency of camera preview stutter on Android
        setTimeout(() => {
          startOCRScannerLoop();
        }, 1500);
      }
    }
  }, [cameraRef]);

  return {};
}
