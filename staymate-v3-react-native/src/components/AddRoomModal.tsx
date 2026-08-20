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
} from 'react-native';
import {C, R} from '../theme/tokens';
import {Icon} from './Icon';
import {PrimaryButton, SecondaryButton} from './Ui';
import {RoomStatus, STATUS_META} from '../data';

const ROOM_CATEGORIES = [
  {id: 'Standard', label: 'Standard Room', icon: 'bed', defaultPrice: 1800},
  {id: 'Deluxe', label: 'Deluxe King', icon: 'bed', defaultPrice: 2600},
  {id: 'Suite', label: 'Executive Suite', icon: 'bed', defaultPrice: 4200},
  {id: 'Cottage', label: 'Garden Cottage', icon: 'home', defaultPrice: 3600},
  {id: 'Villa', label: 'Private Villa', icon: 'home', defaultPrice: 6500},
  {id: 'Dorm', label: 'Shared Dorm', icon: 'users', defaultPrice: 850},
];

const OCCUPANCIES = [1, 2, 3, 4, 6];

export function AddRoomModal({
  visible,
  onClose,
  onAdd,
  existingRoomNums = [],
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (room: {
    num: string;
    type: string;
    price: number;
    status: RoomStatus;
    capacity: number;
    floor: string;
  }) => void;
  existingRoomNums?: string[];
}) {
  const [num, setNum] = useState('');
  const [type, setType] = useState('Standard');
  const [price, setPrice] = useState('1800');
  const [capacity, setCapacity] = useState(2);
  const [floor, setFloor] = useState('1st Floor');
  const [status, setStatus] = useState<RoomStatus>('available');
  const [error, setError] = useState('');

  const handleSelectCategory = (cat: typeof ROOM_CATEGORIES[0]) => {
    setType(cat.id);
    setPrice(cat.defaultPrice.toString());
  };

  const handleSave = () => {
    const trimmedNum = num.trim();
    if (!trimmedNum) {
      setError('Please enter a room number or name (e.g. 104, 206)');
      return;
    }
    if (existingRoomNums.includes(trimmedNum)) {
      setError(`Room ${trimmedNum} already exists in your property`);
      return;
    }
    const numPrice = parseInt(price, 10);
    if (isNaN(numPrice) || numPrice <= 0) {
      setError('Please enter a valid nightly rate');
      return;
    }

    setError('');
    onAdd({
      num: trimmedNum,
      type,
      price: numPrice,
      status,
      capacity,
      floor,
    });
    // Reset form
    setNum('');
    setType('Standard');
    setPrice('1800');
    setStatus('available');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.scrim}
      >
        <View style={s.sheet}>
          {/* Header handle */}
          <View style={s.handleRow}>
            <View style={s.handle} />
          </View>

          <View style={s.header}>
            <View>
              <Text style={s.title}>Add New Room</Text>
              <Text style={s.subtitle}>Configure room number, category & nightly rate</Text>
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

            {/* Room Number */}
            <Text style={s.label}>ROOM NUMBER / NAME *</Text>
            <TextInput
              value={num}
              onChangeText={(t) => {
                setNum(t);
                setError('');
              }}
              placeholder="e.g. 104, 206, Villa 2"
              placeholderTextColor="#9CA3AF"
              style={s.input}
              autoCapitalize="characters"
            />

            {/* Category Selector */}
            <Text style={[s.label, {marginTop: 16}]}>ROOM CATEGORY</Text>
            <View style={s.catGrid}>
              {ROOM_CATEGORIES.map((cat) => {
                const active = type === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => handleSelectCategory(cat)}
                    activeOpacity={0.8}
                    style={[s.catCard, active && s.catCardActive]}
                  >
                    <Icon
                      name={cat.icon as any}
                      size={18}
                      color={active ? C.primary : '#64748B'}
                    />
                    <Text style={[s.catLabel, active && s.catLabelActive]}>
                      {cat.label}
                    </Text>
                    <Text style={s.catPrice}>₹{cat.defaultPrice}/night</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Nightly Rate */}
            <Text style={[s.label, {marginTop: 16}]}>BASE NIGHTLY RATE (₹) *</Text>
            <View style={s.priceInputWrap}>
              <Text style={s.currencyPrefix}>₹</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                placeholder="1800"
                placeholderTextColor="#9CA3AF"
                style={s.priceInput}
              />
              <Text style={s.priceSuffix}>/ night</Text>
            </View>

            {/* Floor / Wing & Capacity Row */}
            <View style={s.row}>
              <View style={{flex: 1}}>
                <Text style={s.label}>FLOOR / BLOCK</Text>
                <TextInput
                  value={floor}
                  onChangeText={setFloor}
                  placeholder="e.g. 1st Floor, Garden"
                  placeholderTextColor="#9CA3AF"
                  style={s.input}
                />
              </View>
              <View style={{width: 14}} />
              <View style={{flex: 1}}>
                <Text style={s.label}>MAX GUESTS</Text>
                <View style={s.occupancyRow}>
                  {OCCUPANCIES.map((occ) => (
                    <TouchableOpacity
                      key={occ}
                      onPress={() => setCapacity(occ)}
                      activeOpacity={0.7}
                      style={[s.occBtn, capacity === occ && s.occBtnActive]}
                    >
                      <Text style={[s.occText, capacity === occ && s.occTextActive]}>
                        {occ}{occ === 6 ? '+' : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Initial Status */}
            <Text style={[s.label, {marginTop: 16}]}>INITIAL STATUS</Text>
            <View style={s.statusRow}>
              {(['available', 'cleaning', 'maintenance'] as const).map((st) => {
                const meta = STATUS_META[st];
                const active = status === st;
                return (
                  <TouchableOpacity
                    key={st}
                    onPress={() => setStatus(st)}
                    activeOpacity={0.8}
                    style={[
                      s.statusBtn,
                      active && {borderColor: meta.color, backgroundColor: meta.bg},
                    ]}
                  >
                    <Icon
                      name={st === 'available' ? 'check' : 'info'}
                      size={13}
                      color={active ? meta.color : '#64748B'}
                    />
                    <Text
                      style={[
                        s.statusBtnText,
                        active && {color: meta.color, fontWeight: '700'},
                      ]}
                    >
                      {meta.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Action buttons */}
            <View style={s.actionRow}>
              <SecondaryButton
                label="Cancel"
                onPress={onClose}
                style={{flex: 1}}
              />
              <PrimaryButton
                label="Save Room"
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
    paddingVertical: 11,
    fontWeight: '500',
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catCard: {
    width: '48.5%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 10,
    gap: 4,
  },
  catCardActive: {
    backgroundColor: '#F7F3FF',
    borderColor: C.primary,
    borderWidth: 1.6,
  },
  catLabel: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  catLabelActive: {
    color: C.primary,
    fontWeight: '700',
  },
  catPrice: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#64748B',
  },
  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  currencyPrefix: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 6,
  },
  priceInput: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    paddingVertical: 11,
  },
  priceSuffix: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: '#64748B',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
  },
  occupancyRow: {
    flexDirection: 'row',
    gap: 5,
  },
  occBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  occBtnActive: {
    backgroundColor: '#F7F3FF',
    borderColor: C.primary,
    borderWidth: 1.5,
  },
  occText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  occTextActive: {
    color: C.primary,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
  },
  statusBtnText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
  },
});
