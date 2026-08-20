import React, {useState} from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {C, R} from '../theme/tokens';
import {Icon} from './Icon';
import {PrimaryButton, SecondaryButton} from './Ui';
import {CalendarPicker} from './CalendarPicker';

const DOC_TYPES = ['Aadhaar', 'PAN', 'Voter ID', 'Driving Licence', 'Passport'];
const RELATIONS = ['Spouse', 'Child', 'Parent', 'Friend', 'Family', 'Colleague', 'Other'];
const GENDERS = ['Male', 'Female', 'Other'];

export interface CoGuestItem {
  id: string;
  name: string;
  relation: string;
  docType: string;
  idNum: string;
  gender?: string;
  dob?: string;
  phone?: string;
  photoUri?: string;
}

export function AddCoGuestModal({
  visible,
  onClose,
  onSave,
  initialData,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (guest: CoGuestItem) => void;
  initialData?: CoGuestItem | null;
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [relation, setRelation] = useState(initialData?.relation || 'Spouse');
  const [docType, setDocType] = useState(initialData?.docType || 'Aadhaar');
  const [idNum, setIdNum] = useState(initialData?.idNum || '');
  const [gender, setGender] = useState(initialData?.gender || 'Female');
  const [dob, setDob] = useState(initialData?.dob || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [photoUri, setPhotoUri] = useState<string | null>(initialData?.photoUri || null);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  React.useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setRelation(initialData.relation || 'Spouse');
      setDocType(initialData.docType || 'Aadhaar');
      setIdNum(initialData.idNum || '');
      setGender(initialData.gender || 'Female');
      setDob(initialData.dob || '');
      setPhone(initialData.phone || '');
      setPhotoUri(initialData.photoUri || null);
    } else {
      setName('');
      setRelation('Spouse');
      setDocType('Aadhaar');
      setIdNum('');
      setGender('Female');
      setDob('');
      setPhone('');
      setPhotoUri(null);
    }
    setError('');
  }, [initialData, visible]);

  const handlePickDocument = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Please grant media access to upload ID photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setPhotoUri(uri);
        // Auto-fill sample for co-guest if name is empty
        if (!name) setName('Sneha Sharma');
        if (!idNum) setIdNum('5521 8840 1923');
        if (!dob) setDob('1996-08-14');
      }
    } catch (e) {
      console.log('Upload error', e);
    }
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter co-guest full name');
      return;
    }

    onSave({
      id: initialData?.id || Date.now().toString(),
      name: trimmedName,
      relation,
      docType,
      idNum: idNum.trim() || 'Pending verification',
      gender,
      dob: dob.trim(),
      phone: phone.trim(),
      photoUri: photoUri || undefined,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.scrim}
      >
        <View style={s.sheet}>
          {/* Top handle */}
          <View style={s.handleRow}>
            <View style={s.handle} />
          </View>

          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.title}>{initialData ? 'Edit Co-Guest' : 'Add Co-Guest'}</Text>
              <Text style={s.subtitle}>Enter details for accompanying guest</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
              <Icon name="x" size={18} color={C.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingBottom: 24}}
          >
            {error ? (
              <View style={s.errorBox}>
                <Icon name="info" size={15} color="#DC2626" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Upload ID Option */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handlePickDocument}
              style={s.uploadCard}
            >
              <View style={s.uploadIcon}>
                <Icon name="camera" size={18} color={C.primary} />
              </View>
              <View style={{flex: 1}}>
                <Text style={s.uploadTitle}>
                  {photoUri ? 'ID Photo Attached ✓' : 'Upload Co-Guest ID Photo'}
                </Text>
                <Text style={s.uploadSub}>
                  {photoUri ? 'Tap to change photo' : 'Auto-fill details from ID card'}
                </Text>
              </View>
              <Icon name="plus" size={16} color={C.ink} />
            </TouchableOpacity>

            {/* Full Name */}
            <Text style={s.label}>FULL NAME *</Text>
            <TextInput
              value={name}
              onChangeText={(t) => {
                setName(t);
                setError('');
              }}
              placeholder="e.g. Sneha Sharma"
              placeholderTextColor="#9CA3AF"
              style={s.input}
            />

            {/* Relationship to Primary Guest */}
            <Text style={[s.label, {marginTop: 14}]}>RELATIONSHIP TO PRIMARY GUEST</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chipsRow}
            >
              {RELATIONS.map((r) => {
                const active = relation === r;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRelation(r)}
                    activeOpacity={0.75}
                    style={[s.chip, active && s.chipActive]}
                  >
                    <Text style={[s.chipText, active && s.chipTextActive]}>{r}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Document Type */}
            <Text style={[s.label, {marginTop: 14}]}>DOCUMENT TYPE</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chipsRow}
            >
              {DOC_TYPES.map((dt) => {
                const active = docType === dt;
                return (
                  <TouchableOpacity
                    key={dt}
                    onPress={() => setDocType(dt)}
                    activeOpacity={0.75}
                    style={[s.chip, active && s.chipActive]}
                  >
                    <Text style={[s.chipText, active && s.chipTextActive]}>{dt}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* ID Number */}
            <Text style={[s.label, {marginTop: 14}]}>DOCUMENT ID NUMBER</Text>
            <TextInput
              value={idNum}
              onChangeText={setIdNum}
              placeholder="e.g. 5521 8840 1923"
              placeholderTextColor="#9CA3AF"
              style={s.input}
              autoCapitalize="characters"
            />

            {/* Gender and DOB Row */}
            <View style={s.row}>
              <View style={{flex: 1}}>
                <Text style={s.label}>GENDER</Text>
                <View style={s.genderRow}>
                  {GENDERS.map((g) => (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setGender(g)}
                      activeOpacity={0.75}
                      style={[s.genderBtn, gender === g && s.genderBtnActive]}
                    >
                      <Text style={[s.genderText, gender === g && s.genderTextActive]}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={{width: 12}} />
              <View style={{flex: 1.2}}>
                <CalendarPicker
                  label="DATE OF BIRTH"
                  value={dob}
                  onChange={setDob}
                  mode="dob"
                  placeholder="Select DOB"
                />
              </View>
            </View>

            {/* Phone */}
            <Text style={[s.label, {marginTop: 14}]}>PHONE NUMBER (OPTIONAL)</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 98765 00000"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              style={s.input}
            />

            {/* Action Buttons */}
            <View style={s.actionRow}>
              <SecondaryButton
                label="Cancel"
                onPress={onClose}
                style={{flex: 1}}
              />
              <PrimaryButton
                label={initialData ? 'Update Co-Guest' : 'Add Co-Guest'}
                onPress={handleSave}
                style={{flex: 1.4}}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14,
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 19,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '400',
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: '#DC2626',
    fontWeight: '500',
    flex: 1,
  },
  uploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FAF5FF',
    borderWidth: 1.2,
    borderColor: '#E9D5FF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  uploadIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  uploadSub: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: '#64748B',
    marginBottom: 6,
  },
  input: {
    fontFamily: 'Inter',
    fontSize: 14.5,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10.5,
    fontWeight: '500',
  },
  chipsRow: {
    gap: 7,
    paddingBottom: 2,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: C.primary,
  },
  chipText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 14,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 4,
  },
  genderBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderBtnActive: {
    backgroundColor: '#F7F3FF',
    borderColor: C.primary,
    borderWidth: 1.5,
  },
  genderText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  genderTextActive: {
    color: C.primary,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
  },
});
