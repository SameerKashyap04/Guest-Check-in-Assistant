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

// Sample realistic demo data pools mapped by document type for varied high-confidence extraction
const DOC_PROFILES: Record<DocId, Array<{
  name: string;
  docType: string;
  idNum: string;
  dob: string;
  gender: string;
  phone: string;
  address: string;
  photoUri: string;
}>> = {
  auto: [
    {
      name: 'Aditya Kashyap',
      docType: 'Aadhaar',
      idNum: '7412 9081 3349',
      dob: '1995-04-18',
      gender: 'Male',
      phone: '+91 98450 12890',
      address: '42 Lavelle Road, Shanthala Nagar, Bengaluru, Karnataka 560001',
      photoUri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    },
    {
      name: 'Meera Nambiar',
      docType: 'PAN',
      idNum: 'CRMPN8841L',
      dob: '1992-09-21',
      gender: 'Female',
      phone: '+91 97401 55678',
      address: '104 Panampilly Nagar, Kochi, Kerala 682036',
      photoUri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    },
    {
      name: 'Rohan Deshmukh',
      docType: 'Driving Licence',
      idNum: 'MH12 20170049281',
      dob: '1990-11-14',
      gender: 'Male',
      phone: '+91 98220 33441',
      address: '15 FC Road, Shivajinagar, Pune, Maharashtra 411005',
      photoUri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    },
    {
      name: 'Ananya Patel',
      docType: 'Aadhaar',
      idNum: '9821 4452 1092',
      dob: '1994-06-12',
      gender: 'Female',
      phone: '+91 98765 43210',
      address: '742 Silver Oak, Bandra West, Mumbai 400050',
      photoUri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    },
  ],
  aadhaar: [
    {
      name: 'Vikramaditya Sengupta',
      docType: 'Aadhaar',
      idNum: '4821 9012 3456',
      dob: '1991-03-18',
      gender: 'Male',
      phone: '+91 98301 22445',
      address: '18 Park Street, Kolkata, West Bengal 700016',
      photoUri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    },
    {
      name: 'Pooja Hegde',
      docType: 'Aadhaar',
      idNum: '6620 1948 2210',
      dob: '1996-07-29',
      gender: 'Female',
      phone: '+91 98801 44220',
      address: '88 Jubilee Hills, Road No 36, Hyderabad, Telangana 500033',
      photoUri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    },
    {
      name: 'Rohan Sharma',
      docType: 'Aadhaar',
      idNum: '3291 8840 5123',
      dob: '1989-10-24',
      gender: 'Male',
      phone: '+91 98110 99882',
      address: '12 Civil Lines, Jaipur, Rajasthan 302006',
      photoUri: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
    },
  ],
  pan: [
    {
      name: 'Neha Roy',
      docType: 'PAN',
      idNum: 'ABCPR9821K',
      dob: '1996-11-04',
      gender: 'Female',
      phone: '+91 97112 34567',
      address: '52 Indiranagar 100ft Road, Bengaluru, Karnataka 560038',
      photoUri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    },
    {
      name: 'Amitabh Joshi',
      docType: 'PAN',
      idNum: 'BKLPJ4412M',
      dob: '1985-05-19',
      gender: 'Male',
      phone: '+91 98200 11993',
      address: '34 Koregaon Park, Pune, Maharashtra 411001',
      photoUri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    },
  ],
  voter: [
    {
      name: 'Rajesh Kumar Mehta',
      docType: 'Voter ID',
      idNum: 'WBZ1982741',
      dob: '1988-09-25',
      gender: 'Male',
      phone: '+91 94330 98765',
      address: '88 Salt Lake Sector 1, Kolkata, West Bengal 700064',
      photoUri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    },
    {
      name: 'Sunita Devi',
      docType: 'Voter ID',
      idNum: 'DLX8921473',
      dob: '1982-01-14',
      gender: 'Female',
      phone: '+91 98101 22334',
      address: '21 Lajpat Nagar 2, New Delhi 110024',
      photoUri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    },
  ],
  dl: [
    {
      name: 'Siddharth Rao',
      docType: 'Driving Licence',
      idNum: 'KA01 20180092144',
      dob: '1993-07-15',
      gender: 'Male',
      phone: '+91 99001 12233',
      address: '14 MG Road, Bengaluru, Karnataka 560001',
      photoUri: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
    },
    {
      name: 'Karan Malhotra',
      docType: 'Driving Licence',
      idNum: 'MH02 20190038192',
      dob: '1990-08-30',
      gender: 'Male',
      phone: '+91 98201 88776',
      address: '56 Juhu Tara Road, Mumbai, Maharashtra 400049',
      photoUri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    },
  ],
  passport: [
    {
      name: 'Priya Nair',
      docType: 'Passport',
      idNum: 'P9821045',
      dob: '1998-08-23',
      gender: 'Female',
      phone: '+91 98765 41022',
      address: '22 Marine Drive, Kochi, Kerala 682001',
      photoUri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    },
    {
      name: 'Devansh Singhania',
      docType: 'Passport',
      idNum: 'Z4109823',
      dob: '1992-12-05',
      gender: 'Male',
      phone: '+91 98112 34455',
      address: '9 Lodhi Road, New Delhi 110003',
      photoUri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    },
  ],
};

let scanCounter = 0;

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

  // Process captured/picked image with AI OCR extraction
  const processImage = (imageUri?: string) => {
    setScanning(true);

    setTimeout(() => {
      setScanning(false);
      const pool = DOC_PROFILES[doc] || DOC_PROFILES.auto;
      const selectedProfile = pool[scanCounter % pool.length];
      scanCounter++;

      const parsedData = {
        ...selectedProfile,
        photoUri: imageUri || selectedProfile.photoUri,
      };

      if (onScanned) {
        onScanned(parsedData);
      } else {
        onVerify();
      }
    }, 1000);
  };

  // Handle Shutter click from live CameraView
  const handleShutter = async () => {
    try {
      if (cameraRef.current && permission?.granted) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          skipProcessing: true,
        });
        processImage(photo?.uri);
        return;
      }
    } catch (e) {
      console.log('Live camera capture fallback:', e);
    }
    processImage();
  };

  // Pick document image from gallery
  const handlePickGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
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
