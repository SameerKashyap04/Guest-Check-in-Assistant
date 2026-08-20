import React, {useState} from 'react';
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

// Sample realistic demo data mapped by document type for instant high-confidence extraction
const SAMPLE_DOC_DATA: Record<DocId, any> = {
  auto: {
    name: 'Ananya Patel',
    docType: 'Aadhaar',
    idNum: '9821 4452 1092',
    dob: '1994-06-12',
    gender: 'Female',
    phone: '+91 98765 43210',
    address: '742 Silver Oak, Bandra West, Mumbai 400050',
    photoUri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  },
  aadhaar: {
    name: 'Vikramaditya Sengupta',
    docType: 'Aadhaar',
    idNum: '4821 9012 3456',
    dob: '1991-03-18',
    gender: 'Male',
    phone: '+91 98301 22445',
    address: '18 Park Street, Kolkata, West Bengal 700016',
    photoUri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  },
  pan: {
    name: 'Neha Roy',
    docType: 'PAN',
    idNum: 'ABCPR9821K',
    dob: '1996-11-04',
    gender: 'Female',
    phone: '+91 97112 34567',
    address: '52 Indiranagar 100ft Road, Bengaluru, Karnataka 560038',
    photoUri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
  },
  voter: {
    name: 'Rajesh Kumar Mehta',
    docType: 'Voter ID',
    idNum: 'WBZ1982741',
    dob: '1988-09-25',
    gender: 'Male',
    phone: '+91 94330 98765',
    address: '88 Salt Lake Sector 1, Kolkata 700064',
    photoUri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
  },
  dl: {
    name: 'Siddharth Rao',
    docType: 'Driving Licence',
    idNum: 'KA01 20180092144',
    dob: '1993-07-15',
    gender: 'Male',
    phone: '+91 99001 12233',
    address: '14 MG Road, Bengaluru, Karnataka 560001',
    photoUri: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
  },
  passport: {
    name: 'Priya Nair',
    docType: 'Passport',
    idNum: 'P9821045',
    dob: '1998-08-23',
    gender: 'Female',
    phone: '+91 98765 41022',
    address: '22 Marine Drive, Kochi, Kerala 682001',
    photoUri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
  },
};

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
  const [scannedImage, setScannedImage] = useState<string | null>(null);

  // Process captured/picked image with AI OCR extraction
  const processImage = async (imageUri: string) => {
    setScannedImage(imageUri);
    setScanning(true);

    // Simulate real AI OCR optical character recognition & parsing
    setTimeout(() => {
      setScanning(false);
      const parsedData = {
        ...SAMPLE_DOC_DATA[doc],
        photoUri: imageUri || SAMPLE_DOC_DATA[doc].photoUri,
      };

      if (onScanned) {
        onScanned(parsedData);
      } else {
        onVerify();
      }
    }, 1200);
  };

  // Launch live camera to scan document
  const handleCaptureCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        // Fallback for simulator or denied permission: run instant demo scan
        processImage(SAMPLE_DOC_DATA[doc].photoUri);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        processImage(result.assets[0].uri);
      }
    } catch (e) {
      // Fallback: simulate high-confidence scan
      processImage(SAMPLE_DOC_DATA[doc].photoUri);
    }
  };

  // Pick document image from gallery
  const handlePickGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        processImage(SAMPLE_DOC_DATA[doc].photoUri);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        processImage(result.assets[0].uri);
      }
    } catch (e) {
      processImage(SAMPLE_DOC_DATA[doc].photoUri);
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

      {/* Document Type Cards */}
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

      {/* Viewfinder */}
      <View style={s.viewfinder}>
        {/* Background preview image if scanned */}
        {scannedImage && (
          <Image
            source={{uri: scannedImage}}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        )}

        {/* Dashed frame */}
        <View style={s.dashedFrame}/>
        {/* Corner brackets */}
        <View style={[s.corner, {top: '12%', left: '12%', borderRightWidth: 0, borderBottomWidth: 0}]}/>
        <View style={[s.corner, {top: '12%', right: '12%', borderLeftWidth: 0, borderBottomWidth: 0}]}/>
        <View style={[s.corner, {bottom: '18%', left: '12%', borderRightWidth: 0, borderTopWidth: 0}]}/>
        <View style={[s.corner, {bottom: '18%', right: '12%', borderLeftWidth: 0, borderTopWidth: 0}]}/>

        {/* Scanning progress overlay */}
        {scanning && (
          <View style={s.scanningOverlay}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={s.scanningText}>Analyzing {DOC_TYPES.find(d => d.id === doc)?.label} with AI...</Text>
            <View style={s.laserBar} />
          </View>
        )}

        {/* Top controls */}
        <View style={s.camTop}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setFlashOn(!flashOn)}
            style={[s.camBtn, flashOn && {backgroundColor: '#7C3AED'}]}
          >
            <Icon name={flashOn ? 'flash' : 'flashOff'} size={18} color="#fff"/>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
            style={s.camBtn}
          >
            <Icon name="flip" size={18} color="#fff"/>
          </TouchableOpacity>
        </View>

        {/* Align hint */}
        {!scanning && (
          <Text style={s.alignHint}>
            Align {DOC_TYPES.find(d => d.id === doc)?.label} within the frame
          </Text>
        )}

        {/* Bottom controls */}
        <View style={s.camBottom}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePickGallery}
            style={s.camBtn}
          >
            <Icon name="image" size={18} color="#fff"/>
          </TouchableOpacity>

          {/* Shutter button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleCaptureCamera}
            style={s.shutter}
          >
            <View style={s.shutterInner} />
          </TouchableOpacity>

          <View style={{width: 42}}/>
        </View>
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

  // Viewfinder
  viewfinder: {
    aspectRatio: 3 / 4,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#2D3239',
    position: 'relative',
  },
  dashedFrame: {
    position: 'absolute',
    top: '12%',
    left: '12%',
    right: '12%',
    bottom: '18%',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 14,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  camTop: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  camBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alignHint: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
  },
  camBottom: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  shutter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 10,
  },
  scanningText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  laserBar: {
    width: '70%',
    height: 3,
    backgroundColor: '#A78BFA',
    borderRadius: 2,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 0},
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
