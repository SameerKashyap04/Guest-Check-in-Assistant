import React, {useState, useRef} from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import {CameraView, useCameraPermissions} from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import {C, R} from '../theme/tokens';
import {Icon, IconName} from '../components/Icon';
import {PrimaryButton, SecondaryButton} from '../components/Ui';

type DocId = 'auto' | 'aadhaar' | 'pan' | 'voter' | 'dl' | 'passport';
type DocType = {id: DocId; label: string; icon: IconName};

const DOC_TYPES: DocType[] = [
  {id: 'auto', label: 'Auto-detect', icon: 'search'},
  {id: 'aadhaar', label: 'Aadhaar', icon: 'aadhaar'},
  {id: 'pan', label: 'PAN Card', icon: 'pan'},
  {id: 'voter', label: 'Voter ID', icon: 'voter'},
  {id: 'dl', label: 'Driving Licence', icon: 'dl'},
  {id: 'passport', label: 'Passport', icon: 'passport'},
];

import {OCRPipeline} from '../utils/OCRPipeline';

export function ScannerScreen({
  onManual,
  onVerify,
  onWeb,
  onScanned,
}: {
  onManual: () => void;
  onVerify: () => void;
  onWeb: () => void;
  onScanned?: (guestData: any) => void;
}) {
  const [doc, setDoc] = useState<DocId>('auto');
  const [flashOn, setFlashOn] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  // Process captured/picked image with real ML Kit OCR
  const processImage = async (imageUri: string) => {
    setScanning(true);
    try {
      const result = await OCRPipeline.processImage(imageUri, doc);

      if (onScanned) {
        onScanned(result);
      } else {
        onVerify();
      }
    } catch (e) {
      console.error('OCR processing failed:', e);
      Alert.alert('Scan Failed', 'Could not read the document. Please try again or enter details manually.');
    } finally {
      setScanning(false);
    }
  };

  // Handle Shutter click from live CameraView
  const handleShutter = async () => {
    try {
      if (cameraRef.current && permission?.granted) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          skipProcessing: false,
        });
        if (photo?.uri) {
          await processImage(photo.uri);
          return;
        }
      }
    } catch (e) {
      console.log('Camera capture error:', e);
      Alert.alert('Camera Error', 'Could not capture photo. Please try the gallery option.');
    }
  };

  // Pick document image from gallery
  const handlePickGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Please grant gallery access to upload document photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processImage(result.assets[0].uri);
      }
    } catch (e) {
      console.log('Gallery pick error:', e);
      Alert.alert('Gallery Error', 'Could not pick image. Please try the camera instead.');
    }
  };

  const renderCard = (t: DocType) => {
    const active = doc === t.id;
    return (
      <TouchableOpacity
        key={t.id}
        activeOpacity={0.75}
        onPress={() => setDoc(t.id)}
        style={[s.docCard, active && s.docCardActive]}
      >
        <Icon
          name={t.icon}
          size={21}
          color={active ? C.ink : '#6a6a6a'}
          strokeWidth={1.8}
        />
        <Text
          style={[s.docLabel, active && s.docLabelActive]}
          numberOfLines={2}
        >
          {t.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: '#fff'}}
      contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 126}}
      showsVerticalScrollIndicator={false}
    >
      {/* Page header */}
      <View style={{paddingTop: 18}}>
        <Text style={s.h1}>Check-in</Text>
        <Text style={s.sub}>Scan an ID to auto-fill guest details, or enter manually</Text>
      </View>

      {/* DOCUMENT TYPE section header */}
      <Text style={s.sectionLabel}>DOCUMENT TYPE</Text>

      {/* Document Type Cards — 2 rows of 3 equal sized cards matching web view & ss */}
      <View style={s.docGridContainer}>
        <View style={s.docRow}>
          {DOC_TYPES.slice(0, 3).map(renderCard)}
        </View>
        <View style={[s.docRow, {marginTop: 8}]}>
          {DOC_TYPES.slice(3, 6).map(renderCard)}
        </View>
      </View>

      {/* SCAN DOCUMENT label */}
      <Text style={[s.sectionLabel, {marginTop: 22}]}>SCAN DOCUMENT</Text>

      {/* Viewfinder — Exact match to screenshot */}
      <View style={s.viewfinder}>
        {/* Embedded Live Camera inside black frame */}
        {permission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            facing={facing}
            enableTorch={flashOn}
          />
        ) : (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => requestPermission()}
            style={[StyleSheet.absoluteFillObject, {backgroundColor: '#2B2F38', alignItems: 'center', justifyContent: 'center'}]}
          >
            <Icon name="search" size={28} color="rgba(255,255,255,0.3)" />
            <Text style={{color: 'rgba(255,255,255,0.65)', fontSize: 12.5, fontWeight: '600', marginTop: 8}}>
              Tap to allow camera preview
            </Text>
          </TouchableOpacity>
        )}

        {/* Dashed outer border running around the frame */}
        <View style={s.dashedFrame} pointerEvents="none" />

        {/* 4 Rounded corner brackets matching exact screenshot */}
        <View style={s.cornerTopLeft} pointerEvents="none" />
        <View style={s.cornerTopRight} pointerEvents="none" />
        <View style={s.cornerBottomLeft} pointerEvents="none" />
        <View style={s.cornerBottomRight} pointerEvents="none" />

        {/* Centered Align hint */}
        <View style={s.alignCenterContainer} pointerEvents="none">
          <Text style={s.alignHint}>Align the document within the frame</Text>
        </View>

        {/* Scanning AI Indicator */}
        {scanning && (
          <View style={s.scanningOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={s.scanningText}>Scanning {DOC_TYPES.find(d => d.id === doc)?.label}...</Text>
          </View>
        )}

        {/* Top-left Flash Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setFlashOn(!flashOn)}
          style={s.topFlashBtn}
        >
          <Icon name={flashOn ? 'flash' : 'flashOff'} size={20} color="#fff"/>
        </TouchableOpacity>

        {/* Top-right Flip Camera Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
          style={s.topFlipBtn}
        >
          <Icon name="flip" size={20} color="#fff"/>
        </TouchableOpacity>

        {/* Bottom-left Gallery Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handlePickGallery}
          style={s.bottomGalleryBtn}
        >
          <Icon name="image" size={20} color="#fff"/>
        </TouchableOpacity>

        {/* Bottom-center Shutter Button overlapping bottom border */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleShutter}
          style={s.bottomShutterBtn}
        />
      </View>

      {/* OR divider */}
      <View style={s.orRow}>
        <View style={s.orLine}/>
        <Text style={s.orText}>OR</Text>
        <View style={s.orLine}/>
      </View>

      <SecondaryButton label="Enter details manually" icon="edit" onPress={onManual}/>

      {/* Web self check-ins card */}
      <TouchableOpacity style={s.webCard} activeOpacity={0.8} onPress={onWeb}>
        <View style={s.webCardRow}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0}}>
            <View style={s.webIcon}><Icon name="qr" size={17} color={C.ink}/></View>
            <View style={{flex: 1}}>
              <Text style={s.webTitle}>Web self check-ins</Text>
              <Text style={s.webSub}>2 pending · share QR or link with guests</Text>
            </View>
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <Icon name="share" size={16} color={C.muted}/>
            <Icon name="chevronRight" size={18} color={C.muted}/>
          </View>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  // Typography
  h1: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: '#222222',
    lineHeight: 27,
  },
  sub: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    color: '#6a6a6a',
    marginTop: 4,
    lineHeight: 19,
  },

  // Section label — matches app.html .caption style exactly
  sectionLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#6a6a6a',
    marginTop: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
  },

  // Doc type grid container — 2 rows of 3 equal columns
  docGridContainer: {
    width: '100%',
  },
  docRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },

  // Exactly equal sized doc-type cards matching web view & ss
  docCard: {
    flex: 1,
    height: 84,
    minHeight: 84,
    borderWidth: 1.5,
    borderColor: '#dddddd',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
  },

  // active state
  docCardActive: {
    borderColor: '#222222',
    backgroundColor: '#F8F7FB',
  },

  // label style
  docLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '500',
    color: '#6a6a6a',
    textAlign: 'center',
    lineHeight: 15,
  },

  // active label
  docLabelActive: {
    color: '#222222',
    fontWeight: '700',
  },

  // Viewfinder — Exactly matches screenshot
  viewfinder: {
    aspectRatio: 3 / 4,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#2E333D',
    position: 'relative',
  },
  dashedFrame: {
    position: 'absolute',
    top: '11%',
    left: '13%',
    right: '13%',
    bottom: '15%',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.42)',
    borderRadius: 14,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: '19%',
    left: '20%',
    width: 28,
    height: 28,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 8,
    borderColor: '#ffffff',
  },
  cornerTopRight: {
    position: 'absolute',
    top: '19%',
    right: '20%',
    width: 28,
    height: 28,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 8,
    borderColor: '#ffffff',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: '23%',
    left: '20%',
    width: 28,
    height: 28,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 8,
    borderColor: '#ffffff',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: '23%',
    right: '20%',
    width: 28,
    height: 28,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 8,
    borderColor: '#ffffff',
  },
  alignCenterContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '14%',
    right: '14%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alignHint: {
    textAlign: 'center',
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: -0.1,
  },
  topFlashBtn: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topFlipBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomGalleryBtn: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomShutterBtn: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#ffffff',
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    zIndex: 10,
  },
  scanningText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },

  // OR divider
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    marginBottom: 14,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ebebeb',
  },
  orText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '500',
    color: '#6a6a6a',
  },

  // Web self check-ins card
  webCard: {
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ebebeb',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  webCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  webIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '500',
    color: '#222222',
  },
  webSub: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    color: '#6a6a6a',
    marginTop: 3,
  },
});
