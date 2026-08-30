import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from '../components/Icon';
import { propertyService, ManagedProperty } from '../services/propertyService';
import { plansService } from '../services/plansService';
import { SubscriptionPlan } from '../types/subscription';

interface PropertyManagerScreenProps {
  ownerUid: string;
  ownerEmail?: string;
  currentPropertyId: string;
  currentPropertyName?: string;
  currentPropertyAddress?: string;
  activePlan: string;
  onClose: () => void;
  onSelectProperty: (property: ManagedProperty) => void;
  onUpgrade: () => void;
  onToast?: (msg: string) => void;
}

export function PropertyManagerScreen({
  ownerUid,
  ownerEmail,
  currentPropertyId,
  currentPropertyName = 'Sunrise Homestay',
  currentPropertyAddress = 'India',
  activePlan = 'Professional',
  onClose,
  onSelectProperty,
  onUpgrade,
  onToast,
}: PropertyManagerScreenProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [properties, setProperties] = useState<ManagedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [roomsCount, setRoomsCount] = useState('10');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [maxPropertiesAllowed, setMaxPropertiesAllowed] = useState<number>(() => {
    const planKey = activePlan.toUpperCase();
    return planKey.includes('ENTERPRISE') ? 9999 : planKey.includes('MULTI') ? 10 : 1;
  });

  useEffect(() => {
    plansService.fetchLivePlans().then((res) => {
      if (res && res.length > 0) {
        const planKey = activePlan.toUpperCase();
        if (planKey.includes('ENTERPRISE')) {
          setMaxPropertiesAllowed(9999);
        } else if (planKey.includes('MULTI')) {
          const mp = res.find((p) => p.id === SubscriptionPlan.MULTI_PROPERTY || p.name.toUpperCase().includes('MULTI'));
          if (mp && mp.maxProperties) {
            const parsed = parseInt(String(mp.maxProperties), 10);
            if (!isNaN(parsed) && parsed > 0) {
              setMaxPropertiesAllowed(parsed);
            }
          }
        } else {
          setMaxPropertiesAllowed(1);
        }
      }
    });
  }, [activePlan]);

  const isLimitReached = properties.length >= maxPropertiesAllowed;
  const isMultiPropertyPlan = maxPropertiesAllowed > 1;

  useEffect(() => {
    loadProperties();
  }, [ownerUid, currentPropertyId]);

  const loadProperties = async () => {
    setLoading(true);
    const list = await propertyService.getManagedProperties(ownerUid, ownerEmail, {
      code: currentPropertyId,
      name: currentPropertyName,
      address: currentPropertyAddress,
    });
    setProperties(list);
    setLoading(false);
  };

  const handleOpenAddModal = () => {
    if (!isMultiPropertyPlan || isLimitReached) {
      Alert.alert(
        'Multi-Property Upgrade Required',
        !isMultiPropertyPlan
          ? `Managing multiple properties requires the Multi-Property Plan (₹1,999/mo). Upgrade now to manage up to 10 homestays & hotels from one centralized dashboard.`
          : `You have reached the maximum of ${maxPropertiesAllowed} properties allowed on your plan. Contact support for Enterprise unlimited properties.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade Plan', onPress: onUpgrade },
        ]
      );
      return;
    }

    setName('');
    setCode(`HS-${Math.floor(1000 + Math.random() * 9000)}`);
    setAddress('');
    setCity('');
    setRoomsCount('10');
    setIsAddModalOpen(true);
  };

  const handleCreateProperty = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a property or homestay name.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Required', 'Please enter the property location or address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await propertyService.createProperty(ownerUid, {
        name,
        code,
        address,
        city,
        roomsCount: Number(roomsCount) || 10,
        email: ownerEmail,
      });

      setProperties((prev) => [...prev.filter((p) => p.code !== created.code), created]);
      setIsAddModalOpen(false);
      if (onToast) onToast(`Property ${created.name} registered`);
      Alert.alert(
        'Property Created',
        `"${created.name}" (${created.code}) has been added to your portfolio.\n\nWould you like to switch to this property now?`,
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Switch Now',
            onPress: () => {
              onSelectProperty(created);
              onClose();
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create property');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, isDark && { backgroundColor: colors.canvas }, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, isDark && { borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onClose}>
          <Icon name="chevronLeft" size={20} color={colors.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.ink }]}>Properties & Branches</Text>
          <Text style={[styles.subtitle, isDark && { color: colors.muted }]}>
            Active: {currentPropertyName} ({currentPropertyId})
          </Text>
        </View>
        <TouchableOpacity style={styles.addHeaderBtn} onPress={handleOpenAddModal}>
          <Icon name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.addHeaderBtnText}>Add Property</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Plan Allowance Card */}
        <View style={[styles.capacityCard, isDark && { backgroundColor: '#1E1B4B', borderColor: '#312E81' }]}>
          <View style={styles.capacityHeader}>
            <View>
              <Text style={[styles.capacityTitle, isDark && { color: '#E0E7FF' }]}>Properties Portfolio</Text>
              <Text style={[styles.capacitySub, isDark && { color: '#A5B4FC' }]}>
                {activePlan} Tier &bull; {properties.length} of {maxPropertiesAllowed === 9999 ? 'Unlimited' : maxPropertiesAllowed} Properties Configured
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {properties.length}/{maxPropertiesAllowed === 9999 ? '∞' : maxPropertiesAllowed}
              </Text>
            </View>
          </View>

          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(100, (properties.length / maxPropertiesAllowed) * 100)}%`,
                },
              ]}
            />
          </View>

          {!isMultiPropertyPlan && (
            <TouchableOpacity style={styles.upgradeBannerBtn} onPress={onUpgrade}>
              <Icon name="shield" size={16} color="#FFFFFF" />
              <Text style={styles.upgradeBannerBtnText}>Upgrade to Multi-Property Plan (Up to 10 Homestays)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Properties List */}
        <Text style={[styles.sectionTitle, { color: colors.ink }]}>Your Registered Homestays</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#7C3AED" style={{ marginVertical: 32 }} />
        ) : (
          properties.map((p) => {
            const isActive = (p.code || p.id) === currentPropertyId;
            return (
              <View
                key={p.id || p.code}
                style={[
                  styles.propertyCard,
                  isActive && styles.activePropertyCard,
                  isDark && { backgroundColor: colors.card, borderColor: isActive ? '#7C3AED' : colors.cardBorder },
                ]}
              >
                <View style={styles.cardTopRow}>
                  <View style={[styles.propIconBg, isActive && { backgroundColor: '#EDE9FE' }]}>
                    <Icon name="building" size={20} color={isActive ? '#7C3AED' : '#64748B'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.propName, { color: colors.ink }]}>{p.name}</Text>
                      {isActive && (
                        <View style={styles.activeTag}>
                          <View style={styles.greenDot} />
                          <Text style={styles.activeTagText}>ACTIVE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.propCode, { color: '#7C3AED' }]}>ID: {p.code || p.id}</Text>
                    <View style={styles.addressRow}>
                      <Icon name="mapPin" size={12} color={colors.muted} />
                      <Text style={[styles.propAddress, isDark && { color: colors.muted }]}>
                        {p.address} {p.city ? `• ${p.city}` : ''}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Footer Switcher */}
                <View style={[styles.cardFooter, isDark && { borderTopColor: colors.cardBorder }]}>
                  <View style={styles.roomsCountBadge}>
                    <Icon name="grid" size={13} color={colors.muted} />
                    <Text style={[styles.roomsCountText, isDark && { color: colors.muted }]}>
                      {p.roomsCount || 10} Rooms Configured
                    </Text>
                  </View>
                  {isActive ? (
                    <View style={styles.currentlySelectedPill}>
                      <Icon name="check" size={14} color="#059669" />
                      <Text style={styles.currentlySelectedText}>Currently Open</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.switchBtn}
                      onPress={() => {
                        onSelectProperty(p);
                        onClose();
                      }}
                    >
                      <Text style={styles.switchBtnText}>Switch Branch</Text>
                      <Icon name="arrowRight" size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Property Modal */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.ink }]}>Add New Property</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Icon name="x" size={20} color={colors.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={[styles.fieldLabel, { color: colors.ink }]}>Property / Homestay Name *</Text>
              <TextInput
                style={[styles.input, isDark && { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.cardBorder }]}
                placeholder="e.g. Mountain View Villa"
                placeholderTextColor={colors.muted}
                value={name}
                onChangeText={setName}
              />

              <Text style={[styles.fieldLabel, { color: colors.ink }]}>Property Code / ID</Text>
              <TextInput
                style={[styles.input, isDark && { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.cardBorder }]}
                placeholder="e.g. HS-1024"
                placeholderTextColor={colors.muted}
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
              />

              <Text style={[styles.fieldLabel, { color: colors.ink }]}>Address & Area *</Text>
              <TextInput
                style={[styles.input, isDark && { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.cardBorder }]}
                placeholder="e.g. Mall Road, Manali"
                placeholderTextColor={colors.muted}
                value={address}
                onChangeText={setAddress}
              />

              <Text style={[styles.fieldLabel, { color: colors.ink }]}>City / State</Text>
              <TextInput
                style={[styles.input, isDark && { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.cardBorder }]}
                placeholder="e.g. Himachal Pradesh"
                placeholderTextColor={colors.muted}
                value={city}
                onChangeText={setCity}
              />

              <Text style={[styles.fieldLabel, { color: colors.ink }]}>Initial Room Capacity</Text>
              <TextInput
                style={[styles.input, isDark && { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.cardBorder }]}
                placeholder="e.g. 10"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                value={roomsCount}
                onChangeText={setRoomsCount}
              />

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCreateProperty}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Create Property Branch</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: 'transparent',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDE9FE',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  addHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  capacityCard: {
    backgroundColor: '#EDE9FE',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginBottom: 20,
  },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  capacityTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4C1D95',
  },
  capacitySub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6D28D9',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 3,
  },
  upgradeBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 14,
    gap: 8,
  },
  upgradeBannerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  propertyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  activePropertyCard: {
    borderColor: '#7C3AED',
    borderWidth: 1.5,
    backgroundColor: '#FAF5FF',
  },
  cardTopRow: {
    flexDirection: 'row',
    gap: 12,
  },
  propIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  propName: {
    fontSize: 15,
    fontWeight: '800',
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  activeTagText: {
    color: '#059669',
    fontSize: 9,
    fontWeight: '800',
  },
  propCode: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  propAddress: {
    fontSize: 12,
    color: '#64748B',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  roomsCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  roomsCountText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  currentlySelectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  currentlySelectedText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  switchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
