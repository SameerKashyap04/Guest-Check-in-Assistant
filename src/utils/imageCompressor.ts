import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 to 1.0
  returnBase64?: boolean;
}

const DEFAULT_DOC_OPTIONS: CompressOptions = {
  maxWidth: 1000,
  maxHeight: 1000,
  quality: 0.55,
  returnBase64: false,
};

const DEFAULT_SELFIE_OPTIONS: CompressOptions = {
  maxWidth: 600,
  maxHeight: 600,
  quality: 0.5,
  returnBase64: false,
};

/**
 * High-performance image compressor for low RAM & ROM / storage consumption.
 * Reduces 5MB-15MB camera photos down to ~35KB-60KB without sacrificing text legibility.
 */
export async function compressImage(
  uri: string,
  options: CompressOptions = DEFAULT_DOC_OPTIONS
): Promise<{ uri: string; base64?: string }> {
  if (!uri) return { uri: '' };

  const maxWidth = options.maxWidth || 1000;
  const maxHeight = options.maxHeight || 1000;
  const quality = options.quality ?? 0.55;
  const returnBase64 = options.returnBase64 ?? false;

  // Web Browser Canvas-based downsampling & compression
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return new Promise((resolve) => {
      try {
        const img = new window.Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          let width = img.width || maxWidth;
          let height = img.height || maxHeight;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round(height * (maxWidth / width));
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round(width * (maxHeight / height));
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            const base64Data = dataUrl.split(',')[1] || '';
            resolve({
              uri: dataUrl,
              base64: returnBase64 ? base64Data : undefined,
            });
          } else {
            resolve({ uri });
          }
        };
        img.onerror = () => {
          resolve({ uri });
        };
        img.src = uri;
      } catch (err) {
        console.warn('Web image compression notice:', err);
        resolve({ uri });
      }
    });
  }

  // Native (iOS & Android) hardware-accelerated compression via expo-image-manipulator
  try {
    const actions: ImageManipulator.Action[] = [
      {
        resize: {
          width: maxWidth,
        },
      },
    ];

    const result = await ImageManipulator.manipulateAsync(
      uri,
      actions,
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: returnBase64,
      }
    );

    return {
      uri: result.uri,
      base64: result.base64,
    };
  } catch (e) {
    console.warn('Native image compression notice, using original URI:', e);
    return { uri };
  }
}

/**
 * Convenience helper to compress and retrieve compact Base64 data URL
 */
export async function compressToBase64DataUrl(
  uri: string,
  isSelfie = false
): Promise<string> {
  if (!uri) return '';
  const opts = isSelfie ? DEFAULT_SELFIE_OPTIONS : DEFAULT_DOC_OPTIONS;
  const res = await compressImage(uri, { ...opts, returnBase64: true });
  if (res.uri && res.uri.startsWith('data:image')) {
    return res.uri;
  }
  if (res.base64) {
    return `data:image/jpeg;base64,${res.base64}`;
  }
  return res.uri;
}
