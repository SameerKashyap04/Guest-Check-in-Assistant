import React, {useState, useEffect} from 'react';
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
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {C, R} from '../theme/tokens';
import {useTheme} from '../theme/ThemeContext';
import {Icon} from './Icon';
import {PrimaryButton, SecondaryButton} from './Ui';
import {CalendarPicker} from './CalendarPicker';
import {compressImage} from '../utils/imageCompressor';

const DOC_TYPES = ['Aadhaar', 'PAN', 'Voter ID', 'Driving Licence', 'Passport'];
const GENDERS = ['Male', 'Female', 'Other'];

export function EditGuestModal({
  visible,
  onClose,
  onSave,
  guest,
  roomsList = [],
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (updatedGuest: any) => void;
  guest?: any | null;
  roomsList?: any[];
}) {
  const {isDark, colors} = useTheme();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [room, setRoom] = useState('101');
  const [docType, setDocType] = useState('Aadhaar');
  const [idNum, setIdNum] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [backPhotoUri, setBackPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    if (guest) {
      setName(guest.name || guest.full_name || '');
      setPhone(guest.phone || '');
      setEmail(guest.email || '');
      setRoom(String(guest.room || guest.room_number || '101'));
      setDocType(guest.type || guest.docType || guest.id_type || 'Aadhaar');
      setIdNum(guest.idNum || guest.id_number || guest.docNum || '');
      setGender(guest.gender || 'Male');
      setDob(guest.dob || '');
      setAddress(guest.address || '');
      setPhotoUri(guest.photoUri || guest.photo_uri || guest.frontPhotoUri || null);
      setBackPhotoUri(guest.backPhotoUri || guest.back_photo_uri || null);
    }
  }, [guest, visible]);

  const handlePickPhoto = async (side: 'front' | 'back', useCamera: boolean) => {
    try {
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission Required', 'Camera permission is required to capture ID photo.');
          return;
        }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission Required', 'Gallery permission is required to select ID photo.');
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: false });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const compressed = await compressImage(result.assets[0].uri, { maxWidth: 1000, maxHeight: 1000, quality: 0.6 });
        const uri = compressed.uri || result.assets[0].uri;
        if (side === 'front') setPhotoUri(uri);
        else setBackPhotoUri(uri);
      }
    } catch (_) {}
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter guest name');
      return;
    }
    const updated = {
      ...(guest || {}),
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      room: room,
      type: docType,
      docType: docType,
      idNum: idNum.trim(),
      id_number: idNum.trim(),
      gender: gender,
      dob: dob,
      address: address.trim(),
      photoUri: photoUri || undefined,
      frontPhotoUri: photoUri || undefined,
      backPhotoUri: backPhotoUri || undefined,
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end'}}
      >
        <View
          style={[
            s.sheetContainer,
            {backgroundColor: colors.canvas, borderColor: isDark ? '#27272A' : '#E2E8F0'},
          ]}
        >
          {/* Header */}
          <View style={[s.headerRow, {borderBottomColor: isDark ? '#27272A' : '#F1F5F9'}]}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <View style={[s.iconCircle, {backgroundColor: isDark ? '#2E1065' : '#EDE9FE'}]}>
                <Icon name="edit" size={17} color={colors.primary} />
              </View>
              <View>
                <Text style={[s.title, {color: colors.ink}]}>Edit Guest Details</Text>
                <Text style={[s.sub, {color: colors.muted}]}>Update guest registration & room assignment</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={[s.closeBtn, isDark && {backgroundColor: '#27272A'}]}>
              <Icon name="x" size={16} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{maxHeight: 520}}
            contentContainerStyle={{paddingHorizontal: 20, paddingTop: 14, paddingBottom: 30}}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Full Name */}
            <View style={s.fieldGroup}>
              <Text style={[s.label, {color: colors.muted}]}>Full Name *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Guest Full Name"
                placeholderTextColor={colors.mutedSoft}
                style={[s.input, {backgroundColor: isDark ? '#18181B' : '#FAFAFA', borderColor: isDark ? '#27272A' : '#E2E8F0', color: colors.ink}]}
              />
            </View>

            {/* Room Assignment */}
            <View style={s.fieldGroup}>
              <Text style={[s.label, {color: colors.muted}]}>Assigned Room</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8, paddingVertical: 4}}>
                {(roomsList.length > 0 ? roomsList : [{num: '101'}, {num: '102'}]).map((r: any) => {
                  const isSel = room === r.num;
                  return (
                    <TouchableOpacity
                      key={r.num}
                      onPress={() => setRoom(r.num)}
                      activeOpacity={0.8}
                      style={[
                        s.roomChip,
                        isDark && {backgroundColor: '#18181B', borderColor: '#27272A'},
                        isSel && {backgroundColor: colors.primary, borderColor: colors.primary},
                      ]}
                    >
                      <Text style={[s.roomChipText, {color: colors.ink}, isSel && {color: '#FFFFFF', fontWeight: '700'}]}>
                        Room {r.num}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Phone & Email */}
            <View style={{flexDirection: 'row', gap: 10}}>
              <View style={[s.fieldGroup, {flex: 1}]}>
                <Text style={[s.label, {color: colors.muted}]}>Phone Number</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="+91 98765 00000"
                  placeholderTextColor={colors.mutedSoft}
                  style={[s.input, {backgroundColor: isDark ? '#18181B' : '#FAFAFA', borderColor: isDark ? '#27272A' : '#E2E8F0', color: colors.ink}]}
                />
              </View>
              <View style={[s.fieldGroup, {flex: 1}]}>
                <Text style={[s.label, {color: colors.muted}]}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="guest@email.com"
                  placeholderTextColor={colors.mutedSoft}
                  style={[s.input, {backgroundColor: isDark ? '#18181B' : '#FAFAFA', borderColor: isDark ? '#27272A' : '#E2E8F0', color: colors.ink}]}
                />
              </View>
            </View>

            {/* Document Type */}
            <View style={s.fieldGroup}>
              <Text style={[s.label, {color: colors.muted}]}>ID Document Type</Text>
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
                {DOC_TYPES.map((dt) => {
                  const isSel = docType === dt;
                  return (
                    <TouchableOpacity
                      key={dt}
                      onPress={() => setDocType(dt)}
                      activeOpacity={0.8}
                      style={[
                        s.docChip,
                        isDark && {backgroundColor: '#18181B', borderColor: '#27272A'},
                        isSel && {backgroundColor: colors.primary, borderColor: colors.primary},
                      ]}
                    >
                      <Text style={[s.docChipText, {color: colors.muted}, isSel && {color: '#FFFFFF', fontWeight: '700'}]}>
                        {dt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ID Number */}
            <View style={s.fieldGroup}>
              <Text style={[s.label, {color: colors.muted}]}>Document / ID Number</Text>
              <TextInput
                value={idNum}
                onChangeText={setIdNum}
                placeholder="4821 9012 3456"
                placeholderTextColor={colors.mutedSoft}
                style={[s.input, {backgroundColor: isDark ? '#18181B' : '#FAFAFA', borderColor: isDark ? '#27272A' : '#E2E8F0', color: colors.ink}]}
              />
            </View>

            {/* DOB & Gender */}
            <View style={{flexDirection: 'row', gap: 10}}>
              <View style={[s.fieldGroup, {flex: 1.1}]}>
                <CalendarPicker
                  label="Date of Birth"
                  value={dob}
                  onChange={setDob}
                  mode="dob"
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={[s.fieldGroup, {flex: 1.2}]}>
                <Text style={[s.label, {color: colors.muted}]}>Gender</Text>
                <View style={{flexDirection: 'row', gap: 6, marginTop: 2}}>
                  {GENDERS.map((g) => {
                    const isSel = gender.toLowerCase() === g.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={g}
                        onPress={() => setGender(g)}
                        activeOpacity={0.8}
                        style={[
                          s.genderChip,
                          isDark && {backgroundColor: '#18181B', borderColor: '#27272A'},
                          isSel && {backgroundColor: isDark ? '#2E1065' : '#EDE9FE', borderColor: colors.primary},
                        ]}
                      >
                        <Text style={[s.genderChipText, {color: colors.muted}, isSel && {color: colors.primary, fontWeight: '700'}]}>
                          {g}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Address */}
            <View style={s.fieldGroup}>
              <Text style={[s.label, {color: colors.muted}]}>Permanent Residential Address</Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={2}
                placeholder="Enter permanent address"
                placeholderTextColor={colors.mutedSoft}
                style={[s.input, {height: 60, textAlignVertical: 'top', backgroundColor: isDark ? '#18181B' : '#FAFAFA', borderColor: isDark ? '#27272A' : '#E2E8F0', color: colors.ink}]}
              />
            </View>

            {/* Photos */}
            <View style={{flexDirection: 'row', gap: 10, marginTop: 4}}>
              <View style={{flex: 1}}>
                <Text style={[s.label, {color: colors.muted, marginBottom: 4}]}>Front ID Photo</Text>
                {photoUri ? (
                  <View style={{position: 'relative', height: 75, borderRadius: 8, overflow: 'hidden'}}>
                    <Image source={{uri: photoUri}} style={{width: '100%', height: '100%'}} resizeMode="cover" />
                    <TouchableOpacity
                      onPress={() => setPhotoUri(null)}
                      style={{position: 'absolute', top: 3, right: 3, backgroundColor: 'rgba(220,38,38,0.9)', padding: 3, borderRadius: 10}}
                    >
                      <Icon name="x" size={12} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{flexDirection: 'row', gap: 4}}>
                    <TouchableOpacity onPress={() => handlePickPhoto('front', true)} style={[s.photoBtn, isDark && {backgroundColor: '#27272A'}]}>
                      <Icon name="camera" size={12} color={colors.primary} />
                      <Text style={{fontSize: 10, fontWeight: '700', color: colors.primary}}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handlePickPhoto('front', false)} style={[s.photoBtn, isDark && {backgroundColor: '#27272A'}]}>
                      <Icon name="upload" size={12} color={colors.muted} />
                      <Text style={{fontSize: 10, fontWeight: '600', color: colors.muted}}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <View style={{flex: 1}}>
                <Text style={[s.label, {color: colors.muted, marginBottom: 4}]}>Back ID Photo</Text>
                {backPhotoUri ? (
                  <View style={{position: 'relative', height: 75, borderRadius: 8, overflow: 'hidden'}}>
                    <Image source={{uri: backPhotoUri}} style={{width: '100%', height: '100%'}} resizeMode="cover" />
                    <TouchableOpacity
                      onPress={() => setBackPhotoUri(null)}
                      style={{position: 'absolute', top: 3, right: 3, backgroundColor: 'rgba(220,38,38,0.9)', padding: 3, borderRadius: 10}}
                    >
                      <Icon name="x" size={12} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{flexDirection: 'row', gap: 4}}>
                    <TouchableOpacity onPress={() => handlePickPhoto('back', true)} style={[s.photoBtn, isDark && {backgroundColor: '#27272A'}]}>
                      <Icon name="camera" size={12} color={colors.primary} />
                      <Text style={{fontSize: 10, fontWeight: '700', color: colors.primary}}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handlePickPhoto('back', false)} style={[s.photoBtn, isDark && {backgroundColor: '#27272A'}]}>
                      <Icon name="upload" size={12} color={colors.muted} />
                      <Text style={{fontSize: 10, fontWeight: '600', color: colors.muted}}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* Bottom Actions */}
            <View style={{flexDirection: 'row', gap: 10, marginTop: 22}}>
              <SecondaryButton label="Cancel" style={{flex: 1}} onPress={onClose} />
              <PrimaryButton label="Save Changes" style={{flex: 1.3}} onPress={handleSave} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingTop: 16,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
  },
  sub: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '400',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '600',
    marginBottom: 5,
  },
  input: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  roomChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
  },
  roomChipText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
  },
  docChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
  },
  docChipText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '600',
  },
  genderChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderChipText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '600',
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
});
