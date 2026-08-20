import React, {useState} from 'react';
import {ScrollView, View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {C, R, shadow} from '../theme/tokens';
import {Icon, IconName} from '../components/Icon';
import {SettingRow, PrimaryButton, SoftButton} from '../components/Ui';

export function SettingsScreen({
  onAccount,
  onModal,
  onPricing,
  onLogout,
  onLock,
}: {
  onAccount: () => void;
  onModal: (title: string, text: string) => void;
  onPricing: () => void;
  onLogout: () => void;
  onLock: () => void;
}) {
  const [cloudSync, setCloudSync] = useState(true);
  const [biometric, setBiometric] = useState(true);

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: '#fff'}}
      contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 130}}
      showsVerticalScrollIndicator={false}
    >
      <Text style={s.h1}>Settings</Text>

      {/* Profile card */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={s.profileCard}
        onPress={() =>
          onModal(
            'Property profile',
            'Update your property name, address and branding from the property profile screen.'
          )
        }
      >
        <View style={s.profileMark}>
          <Text style={s.profileMarkText}>SM</Text>
        </View>
        <View style={{flex: 1}}>
          <Text style={s.profileTitle}>Sunrise Homestay</Text>
          <Text style={s.profileSub}>HS-4821 · Homestay Owner</Text>
        </View>
        <Icon name="chevronRight" size={18} color={C.mutedSoft}/>
      </TouchableOpacity>

      {/* Plan & Usage card */}
      <View style={s.planCard}>
        <View style={s.planTop}>
          <View>
            <Text style={s.planTitle}>Professional plan</Text>
            <Text style={s.planSub}>12 days left on trial</Text>
          </View>
          <View style={s.proBadge}>
            <Text style={s.proBadgeText}>PRO</Text>
          </View>
        </View>

        <UsageBar label="Check-ins" value="84 / 100" pct={84}/>
        <UsageBar label="Reports & exports" value="6 / 10" pct={60} dark/>

        <View style={s.ocrRow}>
          <Text style={s.ocrText}>AI Document OCR</Text>
          <View style={s.activeBadge}>
            <Text style={s.activeBadgeText}>Active</Text>
          </View>
        </View>

        <PrimaryButton
          label="View plans & upgrade"
          onPress={onPricing}
          style={{marginTop: 14}}
        />
      </View>

      {/* DATA STORAGE */}
      <Text style={s.sectionHeader}>DATA STORAGE</Text>
      <SettingRow
        icon="cloud"
        label="Cloud mode"
        subtitle="Synced live across staff devices"
        onPress={() =>
          onModal(
            'Cloud sync',
            'Switch between synced cloud mode and local-first offline mode.'
          )
        }
        right={
          <TouchableOpacity activeOpacity={0.9} onPress={() => setCloudSync(!cloudSync)}>
            <Switch on={cloudSync}/>
          </TouchableOpacity>
        }
      />

      {/* GENERAL */}
      <Text style={[s.sectionHeader, {marginTop: 16}]}>GENERAL</Text>
      <SettingRow
        icon="users"
        label="Username & password"
        onPress={onAccount}
      />
      <SettingRow
        icon="mapPin"
        label="Property name & address"
        onPress={() =>
          onModal(
            'Property name & address',
            'This setting opens the property name & address editor.'
          )
        }
      />
      <SettingRow
        icon="globe"
        label="Language — English"
        onPress={() =>
          onModal('Language — English', 'This setting opens the language selector.')
        }
      />
      <SettingRow
        icon="moon"
        label="Theme — System default"
        onPress={() =>
          onModal('Theme — System default', 'This setting opens the theme selector.')
        }
      />

      {/* SECURITY */}
      <Text style={[s.sectionHeader, {marginTop: 16}]}>SECURITY</Text>
      <SettingRow
        icon="lock"
        label="Change security PIN"
        onPress={() =>
          onModal('Change security PIN', 'This setting opens the security PIN editor.')
        }
      />
      <SettingRow
        icon="fingerprint"
        label="Biometric unlock"
        subtitle="Face ID / Fingerprint"
        right={
          <TouchableOpacity activeOpacity={0.9} onPress={() => setBiometric(!biometric)}>
            <Switch on={biometric}/>
          </TouchableOpacity>
        }
      />
      <SettingRow
        icon="clock"
        label="Auto-lock — After 5 minutes"
        onPress={() =>
          onModal(
            'Auto-lock — After 5 minutes',
            'This setting opens the auto-lock selector.'
          )
        }
      />

      {/* Actions: Lock app & Log out */}
      <View style={s.bottomActions}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onLock}
          style={s.lockBtn}
        >
          <Icon name="lock" size={16} color={C.ink}/>
          <Text style={s.lockBtnText}>Lock app</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onLogout}
          style={s.logoutBtn}
        >
          <Icon name="logout" size={16} color={C.primary}/>
          <Text style={s.logoutBtnText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function UsageBar({
  label,
  value,
  pct,
  dark,
}: {
  label: string;
  value: string;
  pct: number;
  dark?: boolean;
}) {
  return (
    <View style={{marginTop: 14}}>
      <View style={s.usageLabels}>
        <Text style={s.usageText}>{label}</Text>
        <Text style={s.usageText}>{value}</Text>
      </View>
      <View style={s.usageTrack}>
        <View
          style={[
            s.usageFill,
            {width: `${pct}%`, backgroundColor: dark ? '#222222' : C.primary},
          ]}
        />
      </View>
    </View>
  );
}

function Switch({on}: {on: boolean}) {
  return (
    <View style={[s.switchTrack, {backgroundColor: on ? C.primary : '#dddddd'}]}>
      <View style={[s.switchKnob, {left: on ? 20 : 3}]}/>
    </View>
  );
}

const s = StyleSheet.create({
  h1: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: '#222222',
    paddingTop: 18,
  },
  profileCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ebebeb',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  profileMark: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileMarkText: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  profileTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
  },
  profileSub: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    color: '#6a6a6a',
    marginTop: 2,
  },
  planCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ebebeb',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  planTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '500',
    color: '#222222',
  },
  planSub: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    color: '#6a6a6a',
    marginTop: 2,
  },
  proBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: R.full,
    backgroundColor: '#f2f2f2',
  },
  proBadgeText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#222222',
  },
  usageLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  usageText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '500',
    color: '#6a6a6a',
  },
  usageTrack: {
    height: 8,
    borderRadius: R.full,
    backgroundColor: '#f2f2f2',
    overflow: 'hidden',
  },
  usageFill: {
    height: '100%',
    borderRadius: R.full,
  },
  ocrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  ocrText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    color: '#6a6a6a',
  },
  activeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: R.full,
    backgroundColor: '#ECFDF3',
  },
  activeBadgeText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  sectionHeader: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#6a6a6a',
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 4,
  },
  switchTrack: {
    width: 42,
    height: 25,
    borderRadius: R.full,
    position: 'relative',
  },
  switchKnob: {
    position: 'absolute',
    top: 3,
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: {width: 0, height: 1},
    elevation: 2,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  lockBtn: {
    flex: 1,
    height: 50,
    borderRadius: R.sm,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  lockBtnText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
  },
  logoutBtn: {
    flex: 1,
    height: 50,
    borderRadius: R.sm,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logoutBtnText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: C.primary,
  },
});
