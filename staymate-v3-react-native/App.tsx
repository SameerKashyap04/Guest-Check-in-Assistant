import React, {useState} from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
  Image,
  Share,
  Alert,
  Linking,
} from 'react-native';
import {SafeAreaProvider, SafeAreaView, initialWindowMetrics, useSafeAreaInsets} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import {C, R, shadow} from './src/theme/tokens';
import {Icon} from './src/components/Icon';
import {BottomNav, TabName} from './src/components/BottomNav';
import {PrimaryButton, SecondaryButton, SoftButton, IconButton} from './src/components/Ui';
import {PinScreen} from './src/screens/PinScreen';
import {DashboardScreen} from './src/screens/DashboardScreen';
import {RoomsScreen} from './src/screens/RoomsScreen';
import {ScannerScreen} from './src/screens/ScannerScreen';
import {SettingsScreen} from './src/screens/SettingsScreen';
import {ManualEntryScreen} from './src/screens/ManualEntryScreen';
import {AccountPortalScreen} from './src/screens/AccountPortalScreen';
import {GUESTS, ROOMS, STATUS_META, RoomStatus, SELF_CHECKINS, SELF_CHECKIN_URL, PLANS, buildSelfCheckinLink} from './src/data';
import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { captureRef } from 'react-native-view-shot';
import { AddRoomModal } from './src/components/AddRoomModal';
import { devifyPay, DevifyCheckoutResult } from './src/services/devifyPay';
import { WebView } from 'react-native-webview';

// Inject authentic Inter web font and typography styles on web platform
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  if (!document.getElementById('staymate-inter-webfont')) {
    const link = document.createElement('link');
    link.id = 'staymate-inter-webfont';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap';
    document.head.appendChild(link);
  }
  if (!document.getElementById('staymate-inter-css')) {
    const style = document.createElement('style');
    style.id = 'staymate-inter-css';
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      *, *::before, *::after, html, body, #root, input, button, textarea, [data-testid] {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
      }
      body {
        background-color: #0F172A;
      }
    `;
    document.head.appendChild(style);
  }
}

function MainApp() {
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState<TabName>('dashboard');
  const [roomsList, setRoomsList] = useState<any[]>([...ROOMS]);
  const [guestsList, setGuestsList] = useState<any[]>([...GUESTS]);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [modal, setModal] = useState<{
    title: string;
    text: string;
    primary?: string;
    action?: () => void;
  } | null>(null);
  const [sheet, setSheet] = useState<'guest' | 'self' | 'room' | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<'search' | 'reports' | 'pricing' | null>(null);
  const [manual, setManual] = useState(false);
  const [manualInitialData, setManualInitialData] = useState<any | null>(null);
  const [account, setAccount] = useState(false);
  const [guestId, setGuestId] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [billing, setBilling] = useState(false);

  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 2500);
  };

  const show = (title: string, text: string, primary = 'Close', action?: () => void) =>
    setModal({title, text, primary, action});

  // Update room status reactively across the entire application
  const handleUpdateRoomStatus = (roomNum: string, newStatus: RoomStatus) => {
    setRoomsList((prev) =>
      prev.map((r) => (r.num === roomNum ? {...r, status: newStatus} : r))
    );
    const meta = STATUS_META[newStatus];
    notify(`Room ${roomNum} marked as ${meta.label}`);
  };

  // Add new room to property inventory
  const handleAddRoom = (newRoom: any) => {
    setRoomsList((prev) => [newRoom, ...prev]);
    notify(`✓ Room ${newRoom.num} (${newRoom.type}) added to property!`);
  };

  // Delete room from property inventory
  const handleDeleteRoom = (roomNum: string) => {
    setRoomsList((prev) => prev.filter((r) => r.num !== roomNum));
    setSheet(null);
    setSelectedRoom(null);
    notify(`Room ${roomNum} deleted from property`);
  };

  // Checkout guest from room and set room to cleaning
  const handleCheckoutGuest = (roomNum: string, guestName?: string) => {
    setRoomsList((prev) =>
      prev.map((r) => (r.num === roomNum ? {...r, status: 'cleaning'} : r))
    );
    setGuestsList((prev) => prev.filter((g) => g.room !== roomNum));
    setSheet(null);
    setSelectedRoom(null);
    notify(`✓ ${guestName ? guestName : `Room ${roomNum}`} checked out! Room set to Cleaning.`);
  };

  // Handle successful check-in from either Scanner or Manual Entry
  const handleCheckinComplete = (newGuest: any) => {
    // Add guest to active reactive list
    setGuestsList((prev) => [newGuest, ...prev]);

    // Update room status to occupied reactively
    setRoomsList((prev) =>
      prev.map((r) => (r.num === newGuest.room ? {...r, status: 'occupied'} : r))
    );

    setManual(false);
    setManualInitialData(null);
    notify(`✓ ${newGuest.name} checked in to Room ${newGuest.room}!`);
    setTab('dashboard');
  };

  const content =
    tab === 'dashboard' ? (
      <DashboardScreen
        guests={guestsList}
        onSearch={() => setOverlay('search')}
        onReports={() => setOverlay('reports')}
        onGuest={(id) => {
          setGuestId(id);
          setSheet('guest');
        }}
        onSelfCheckin={() => setSheet('self')}
      />
    ) : tab === 'rooms' ? (
      <RoomsScreen
        rooms={roomsList}
        onSelect={(num) => {
          setSelectedRoom(num);
          setSheet('room');
        }}
        onAddRoom={() => setShowAddRoom(true)}
      />
    ) : tab === 'scanner' ? (
      <ScannerScreen
        onManual={() => {
          setManualInitialData(null);
          setManual(true);
        }}
        onVerify={() => {
          // Fallback path (not normally reached — onScanned handles all scans)
          // Use random data so it never shows the same person
          const names = [
            { name: 'Lakshmi Iyer', docType: 'Aadhaar', idNum: '5510 7723 8894', dob: '1987-12-03', gender: 'Female', phone: '+91 98842 11205', address: '9 Adyar Main Road, Chennai, Tamil Nadu 600020', photoUri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80' },
            { name: 'Arjun Kapoor', docType: 'Driving Licence', idNum: 'DL05 20210018431', dob: '1997-02-11', gender: 'Male', phone: '+91 99101 78890', address: '301 Green Park Extension, New Delhi 110016', photoUri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80' },
            { name: 'Kavitha Reddy', docType: 'PAN', idNum: 'DQKPR2290G', dob: '1993-08-17', gender: 'Female', phone: '+91 90001 44567', address: '45 Banjara Hills Road No 10, Hyderabad 500034', photoUri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80' },
            { name: 'Deepak Verma', docType: 'Aadhaar', idNum: '8134 5520 9917', dob: '1984-01-30', gender: 'Male', phone: '+91 98761 22001', address: '14 Sector 22, Chandigarh 160022', photoUri: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80' },
            { name: 'Ishita Banerjee', docType: 'Passport', idNum: 'R7321890', dob: '1999-06-28', gender: 'Female', phone: '+91 98304 77123', address: '5A Ballygunge Place, Kolkata 700019', photoUri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80' },
            { name: 'Manish Tiwari', docType: 'Voter ID', idNum: 'UPR3847219', dob: '1986-04-02', gender: 'Male', phone: '+91 94150 66788', address: '72 Hazratganj, Lucknow, UP 226001', photoUri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80' },
          ];
          setManualInitialData(names[Math.floor(Math.random() * names.length)]);
          setManual(true);
        }}
        onScanned={(guestData) => {
          setManualInitialData(guestData);
          setManual(true);
        }}
        onWeb={() => setSheet('self')}
      />
    ) : (
      <SettingsScreen
        onAccount={() => setAccount(true)}
        onModal={show}
        onPricing={() => setOverlay('pricing')}
        onToast={notify}
        onLogout={() =>
          show(
            'Log out of StayMate?',
            'You will need to sign in again with your email and password.',
            'Log out',
            () => {
              setUnlocked(false);
              setModal(null);
              notify('Logged out securely');
            }
          )
        }
        onLock={() => setUnlocked(false)}
      />
    );

  if (!unlocked) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar style="dark"/>
        <PinScreen onUnlock={() => setUnlocked(true)}/>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark"/>
      <View style={{flex: 1}}>
        {content}
        <BottomNav tab={tab} onChange={(t) => setTab(t)}/>
      </View>

      {/* Manual entry modal */}
      {manual && (
        <Modal visible animationType="slide">
          <ManualEntryScreen
            initialData={manualInitialData}
            onClose={() => {
              setManual(false);
              setManualInitialData(null);
            }}
            onDone={handleCheckinComplete}
          />
        </Modal>
      )}

      {/* Account portal modal */}
      {account && (
        <Modal visible animationType="slide">
          <AccountPortalScreen
            onClose={() => setAccount(false)}
            onToast={notify}
            onModal={show}
          />
        </Modal>
      )}

      {/* Search overlay */}
      {overlay === 'search' && (
        <Modal visible animationType="slide">
          <SearchOverlay
            onClose={() => setOverlay(null)}
            onGuest={(id) => {
              setOverlay(null);
              setGuestId(id);
              setSheet('guest');
            }}
          />
        </Modal>
      )}

      {/* Reports overlay */}
      {overlay === 'reports' && (
        <Modal visible animationType="slide">
          <ReportsOverlay
            onClose={() => setOverlay(null)}
            onToast={notify}
          />
        </Modal>
      )}

      {/* Pricing overlay */}
      {overlay === 'pricing' && (
        <Modal visible animationType="slide">
          <PricingOverlay
            billing={billing}
            setBilling={setBilling}
            onClose={() => setOverlay(null)}
            onSelectPlan={(plan) => {
              setOverlay(null);
              notify(`Switched to ${plan} plan`);
            }}
          />
        </Modal>
      )}

      {/* Room details sheet */}
      {sheet === 'room' && selectedRoom ? (
        <Modal visible transparent animationType="slide">
          <Sheet onClose={() => setSheet(null)}>
            <RoomSheet
              room={roomsList.find((r) => r.num === selectedRoom) || {num: selectedRoom, type: 'Standard', price: 1800, status: 'available'}}
              guests={guestsList}
              onToast={notify}
              onClose={() => setSheet(null)}
              onUpdateStatus={(newStatus) => handleUpdateRoomStatus(selectedRoom, newStatus)}
              onCheckout={(guestName) => handleCheckoutGuest(selectedRoom, guestName)}
              onDeleteRoom={() => handleDeleteRoom(selectedRoom)}
              onCheckin={() => {
                setSheet(null);
                setManualInitialData({room: selectedRoom});
                setManual(true);
              }}
              onViewGuest={(gId) => {
                setSheet(null);
                setGuestId(gId);
                setSheet('guest');
              }}
            />
          </Sheet>
        </Modal>
      ) : null}

      {/* Add Room Modal */}
      <AddRoomModal
        visible={showAddRoom}
        onClose={() => setShowAddRoom(false)}
        onAdd={handleAddRoom}
        existingRoomNums={roomsList.map((r) => r.num)}
      />

      {/* Guest details sheet */}
      {sheet === 'guest' && guestId ? (
        <Modal visible transparent animationType="slide">
          <Sheet onClose={() => setSheet(null)}>
            <GuestSheet
              id={guestId}
              onToast={notify}
              onClose={() => setSheet(null)}
            />
          </Sheet>
        </Modal>
      ) : null}

      {/* Web self check-ins sheet */}
      {sheet === 'self' ? (
        <Modal visible transparent animationType="slide">
          <Sheet onClose={() => setSheet(null)}>
            <SelfCheckins
              onReview={(id) => {
                setSheet(null);
                setGuestId(id);
                show(
                  'Review self check-in',
                  'Guest submitted online. Review the details before approval.',
                  'Approve',
                  () => notify('Guest approved for online check-in')
                );
              }}
              onToast={notify}
            />
          </Sheet>
        </Modal>
      ) : null}

      {/* App modal / confirmation dialog */}
      {modal && (
        <Modal visible transparent animationType="fade">
          <View style={ms.scrim}>
            <View style={ms.modalCard}>
              <View style={ms.modalIcon}>
                <Icon name="shield" size={23} color={C.primary}/>
              </View>
              <Text style={ms.modalTitle}>{modal.title}</Text>
              <Text style={ms.modalText}>{modal.text}</Text>
              <View style={{flexDirection: 'row', gap: 10}}>
                <SecondaryButton
                  label="Cancel"
                  style={{flex: 1}}
                  onPress={() => setModal(null)}
                />
                <PrimaryButton
                  label={modal.primary ?? 'Continue'}
                  style={{flex: 1}}
                  onPress={() => {
                    modal.action?.();
                    setModal(null);
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Toast notification */}
      {toast ? (
        <View style={ms.toast}>
          <Text style={ms.toastText}>{toast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics} style={styles.root}>
      <View style={styles.webWrapper}>
        <MainApp/>
      </View>
    </SafeAreaProvider>
  );
}

function Sheet({onClose, children}: {onClose: () => void; children?: React.ReactNode}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={ms.sheetScrim}>
      <View style={[ms.sheet, {paddingBottom: Math.max(16, insets.bottom)}]}>
        <View style={ms.handle}/>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onClose}
          style={ms.sheetCloseBtn}
        >
          <Icon name="x" size={16} color={C.ink}/>
        </TouchableOpacity>
        {children}
      </View>
    </View>
  );
}

function RoomSheet({
  room,
  guests = GUESTS as any,
  onToast,
  onClose,
  onUpdateStatus,
  onCheckout,
  onDeleteRoom,
  onCheckin,
  onViewGuest,
}: {
  room: any;
  guests?: any[];
  onToast: (msg: string) => void;
  onClose: () => void;
  onUpdateStatus: (st: RoomStatus) => void;
  onCheckout: (guestName?: string) => void;
  onDeleteRoom: () => void;
  onCheckin: () => void;
  onViewGuest: (id: number) => void;
}) {
  const activeGuest = guests.find((g) => g.room === room.num);
  const m = STATUS_META[room.status as RoomStatus] || STATUS_META.available;

  return (
    <ScrollView
      contentContainerStyle={{paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28}}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={ms.guestHeaderRow}>
        <View style={[ms.roomSheetBed, {backgroundColor: '#F7F3FF'}]}>
          <Icon name="bed" size={26} color={C.primary}/>
        </View>
        <View style={{flex: 1}}>
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
            <Text style={ms.roomSheetTitle}>Room {room.num}</Text>
            <View style={[ms.statusPillBadge, {backgroundColor: m.bg, borderColor: m.color}]}>
              <Icon name={room.status === 'available' ? 'check' : 'info'} size={10} color={m.color}/>
              <Text style={[ms.statusPillBadgeText, {color: m.color}]}>{m.label}</Text>
            </View>
          </View>
          <Text style={ms.bodySm}>
            {room.type} · ₹{room.price.toLocaleString('en-IN')}/night{room.floor ? ` · ${room.floor}` : ''}
          </Text>
        </View>
      </View>

      {/* Quick status switcher */}
      <Text style={[ms.sectionCaption, {marginTop: 14, marginBottom: 8}]}>CHANGE STATUS</Text>
      <View style={{flexDirection: 'row', gap: 6, flexWrap: 'wrap'}}>
        {(['available', 'occupied', 'cleaning', 'maintenance'] as const).map((st) => {
          const meta = STATUS_META[st];
          const isSelected = room.status === st;
          return (
            <TouchableOpacity
              key={st}
              activeOpacity={0.8}
              onPress={() => onUpdateStatus(st)}
              style={[
                ms.statusOptionBtn,
                isSelected && {backgroundColor: meta.bg, borderColor: meta.color, borderWidth: 1.5},
              ]}
            >
              <Icon name={st === 'available' ? 'check' : 'info'} size={12} color={meta.color}/>
              <Text style={[ms.statusOptionText, {color: meta.color}]}>
                {meta.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Status-specific banners and Active Guest Info */}
      {room.status === 'occupied' && activeGuest ? (
        <View style={{marginTop: 18}}>
          <Text style={ms.sectionCaption}>CURRENT OCCUPANT</Text>
          <View style={ms.occupantCard}>
            <View style={ms.avatar}>
              <Text style={ms.avatarText}>
                {activeGuest.name.split(' ').map((n: string) => n[0]).join('')}
              </Text>
            </View>
            <View style={{flex: 1, minWidth: 0}}>
              <Text style={ms.titleSm}>{activeGuest.name}</Text>
              <Text style={ms.bodySm}>
                {activeGuest.type} · Checked in {activeGuest.time}
              </Text>
              <Text style={[ms.bodySm, {color: '#222222', marginTop: 2}]}>{activeGuest.phone}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onViewGuest(activeGuest.id)}
              style={ms.viewGuestPill}
            >
              <Text style={ms.viewGuestPillText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : room.status === 'cleaning' ? (
        <View style={{marginTop: 18}}>
          <Text style={ms.sectionCaption}>HOUSEKEEPING</Text>
          <View style={[ms.readyCard, {backgroundColor: '#FFFBEB', borderColor: '#FDE68A'}]}>
            <Icon name="info" size={18} color="#D97706"/>
            <View style={{flex: 1}}>
              <Text style={[ms.readyTitle, {color: '#92400E'}]}>Housekeeping in Progress</Text>
              <Text style={[ms.readySub, {color: '#B45309'}]}>Room is being cleaned and sanitized for the next guest.</Text>
            </View>
          </View>
        </View>
      ) : room.status === 'maintenance' ? (
        <View style={{marginTop: 18}}>
          <Text style={ms.sectionCaption}>MAINTENANCE NOTICE</Text>
          <View style={[ms.readyCard, {backgroundColor: '#FEF2F2', borderColor: '#FECACA'}]}>
            <Icon name="info" size={18} color="#DC2626"/>
            <View style={{flex: 1}}>
              <Text style={[ms.readyTitle, {color: '#991B1B'}]}>Under Maintenance</Text>
              <Text style={[ms.readySub, {color: '#B91C1C'}]}>Inspection or repair required before assigning to guests.</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={{marginTop: 18}}>
          <Text style={ms.sectionCaption}>ROOM STATUS</Text>
          <View style={ms.readyCard}>
            <Icon name="check" size={18} color="#059669"/>
            <View style={{flex: 1}}>
              <Text style={ms.readyTitle}>Ready for Check-in</Text>
              <Text style={ms.readySub}>Cleaned, inspected and available for guest assignment.</Text>
            </View>
          </View>
        </View>
      )}

      {/* Room Details Table */}
      <View style={[ms.metaCard, {marginTop: 16}]}>
        {([
          ['Room Category', room.type],
          ['Base Nightly Rate', `₹${room.price.toLocaleString('en-IN')} / night`],
          ['Floor / Block', room.floor || `Floor ${room.num[0] || '1'}`],
          ['Max Occupancy', `${room.capacity || 2} Guests`],
          ['Amenities', 'Air Conditioned · Queen Bed · Attached Bath · Wi-Fi'],
        ] as [string, string][]).map(([label, val], idx, arr) => (
          <View
            key={label}
            style={[
              ms.metaRow,
              idx === arr.length - 1 && {borderBottomWidth: 0},
            ]}
          >
            <Text style={ms.metaLabel}>{label}</Text>
            <Text style={ms.metaValue}>{val}</Text>
          </View>
        ))}
      </View>

      {/* Action Buttons */}
      <View style={{flexDirection: 'row', gap: 10, marginTop: 18}}>
        {room.status === 'occupied' && activeGuest ? (
          <>
            <SecondaryButton
              label="Check-out"
              icon="logout"
              style={{flex: 1}}
              onPress={() => {
                Alert.alert(
                  `Check-out Room ${room.num}?`,
                  `Confirm check-out for ${activeGuest.name}. Room status will be set to Cleaning.`,
                  [
                    {text: 'Cancel', style: 'cancel'},
                    {
                      text: 'Check-out Guest',
                      style: 'destructive',
                      onPress: () => onCheckout(activeGuest.name),
                    },
                  ]
                );
              }}
            />
            <PrimaryButton
              label="Guest Details"
              icon="users"
              style={{flex: 1}}
              onPress={() => onViewGuest(activeGuest.id)}
            />
          </>
        ) : room.status === 'cleaning' ? (
          <>
            <SecondaryButton
              label="Put in Maint."
              icon="info"
              style={{flex: 1}}
              onPress={() => onUpdateStatus('maintenance')}
            />
            <PrimaryButton
              label="✓ Mark Clean & Ready"
              icon="check"
              style={{flex: 1.5}}
              onPress={() => onUpdateStatus('available')}
            />
          </>
        ) : room.status === 'maintenance' ? (
          <>
            <SecondaryButton
              label="Mark Cleaning"
              icon="info"
              style={{flex: 1}}
              onPress={() => onUpdateStatus('cleaning')}
            />
            <PrimaryButton
              label="Complete Maint."
              icon="check"
              style={{flex: 1.5}}
              onPress={() => onUpdateStatus('available')}
            />
          </>
        ) : (
          <>
            <SecondaryButton
              label="Delete Room"
              icon="trash"
              style={{flex: 1}}
              onPress={() => {
                Alert.alert(
                  `Delete Room ${room.num}?`,
                  `Are you sure you want to remove Room ${room.num} (${room.type}) from your property?`,
                  [
                    {text: 'Cancel', style: 'cancel'},
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: onDeleteRoom,
                    },
                  ]
                );
              }}
            />
            <PrimaryButton
              label="Check-in Guest →"
              icon="plus"
              style={{flex: 1.5}}
              onPress={onCheckin}
            />
          </>
        )}
      </View>
    </ScrollView>
  );
}



function GuestSheet({
  id,
  onToast,
  onClose,
}: {
  id: number;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const g = GUESTS.find((x) => x.id === id) || GUESTS[0];
  return (
    <ScrollView
      contentContainerStyle={{paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28}}
      showsVerticalScrollIndicator={false}
    >
      {/* Guest header */}
      <View style={ms.guestHeaderRow}>
        <View style={ms.avatarLarge}>
          <Text style={ms.avatarLargeText}>
            {g.name.split(' ').map((n) => n[0]).join('')}
          </Text>
        </View>
        <View style={{flex: 1}}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <Text style={ms.titleMd}>{g.name}</Text>
            {g.verified ? <Icon name="check" size={15} color={C.emerald}/> : null}
          </View>
          <Text style={ms.bodySm}>
            {g.verified ? 'Verified registration' : 'Awaiting verification'}
          </Text>
        </View>
      </View>

      {/* Photo section: 2 columns */}
      <View style={ms.photosRow}>
        <View style={ms.selfieBox}>
          <Icon name="image" size={26} color="#c13515"/>
          <Text style={ms.photoLabel}>Selfie</Text>
        </View>
        <View style={ms.idBox}>
          <View style={{flexDirection: 'row', gap: 6}}>
            <Icon name="image" size={18} color={C.muted}/>
            <Icon name="image" size={18} color={C.muted}/>
          </View>
          <Text style={ms.caption}>ID front / back</Text>
        </View>
      </View>

      {/* Details table */}
      <View style={ms.metaCard}>
        {([
          ['Room', `${g.room} · ${g.roomType}`],
          ['Document', `${g.type} — ${g.idNum}`],
          ['Phone', g.phone],
          ['Email', g.email],
          ['Nationality', g.nat],
          ['Gender', g.gender],
          ['Address', g.address],
        ] as [string, string][]).map(([label, val], idx, arr) => (
          <View
            key={label}
            style={[
              ms.metaRow,
              idx === arr.length - 1 && {borderBottomWidth: 0},
            ]}
          >
            <Text style={ms.metaLabel}>{label}</Text>
            <Text style={ms.metaValue}>{val}</Text>
          </View>
        ))}
      </View>

      {/* Action buttons */}
      <View style={{flexDirection: 'row', gap: 10, marginTop: 16}}>
        <SecondaryButton
          label="Edit"
          icon="edit"
          style={{flex: 1}}
          onPress={() => {
            onClose();
            onToast('Opening guest editor');
          }}
        />
        <PrimaryButton
          label="Contact"
          icon="phone"
          style={{flex: 1}}
          onPress={() => onToast(`Calling ${g.phone}`)}
        />
      </View>
    </ScrollView>
  );
}

function SelfCheckins({
  onReview,
  onToast,
}: {
  onReview: (guest: any) => void;
  onToast: (msg: string) => void;
}) {
  const [pendingList, setPendingList] = useState<any[]>([...SELF_CHECKINS]);
  const [reviewGuest, setReviewGuest] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrLocalUri, setQrLocalUri] = useState<string | null>(null);

  const shareUrl = buildSelfCheckinLink('HS-4821', 'StayMate Homestay', [
    { num: '101', type: 'Standard', price: 1800 },
    { num: '303', type: 'Cottage', price: 3600 }
  ]);
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(shareUrl)}`;

  const welcomeMessage = `🏡 *Welcome to StayMate Homestay!*\n\nPlease complete your quick guest registration & check-in online before arrival:\n🔗 ${shareUrl}\n\nWe look forward to hosting you!`;

  const standeeCardRef = React.useRef<View>(null);

  // "Share QR & Link" button: generates high-res Standee JPG image + auto-copies greeting message & link
  const handleShareQrAndLink = async () => {
    try {
      onToast('Generating Standee Image (JPG)...');
      
      // Auto-copy welcome text & link to clipboard
      await Clipboard.setStringAsync(welcomeMessage);

      // Snapshot the standee into a high-res JPG image file
      const uri = await captureRef(standeeCardRef, {
        format: 'jpg',
        quality: 0.98,
        result: 'tmpfile',
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable && uri) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Guest Self Check-in Standee — StayMate',
          UTI: 'public.jpeg',
        });
        onToast('Standee JPG ready to send! ✓');
        return;
      }
    } catch (e: any) {
      console.warn('Capture JPG error:', e);
    }

    // Fallback: Share formatted text & link
    try {
      await Share.share({
        title: 'Guest Self Check-in — StayMate',
        message: welcomeMessage,
        url: shareUrl,
      });
      onToast('Check-in link shared! ✓');
    } catch (_) {}
  };

  // Generate & print reception desk standee poster (PDF)
  const handlePrintStandee = async () => {
    try {
      onToast('Generating Reception Standee PDF...');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Guest Check-in QR — StayMate Homestay</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              text-align: center;
              padding: 24px;
              color: #1E293B;
              background-color: #F8FAFC;
              margin: 0;
            }
            .container {
              border: 3px solid #7C3AED;
              border-radius: 28px;
              padding: 40px 30px;
              max-width: 520px;
              margin: 0 auto;
              background: #FFFFFF;
              box-shadow: 0 10px 25px rgba(124, 58, 237, 0.1);
            }
            .badge {
              display: inline-block;
              background: #EDE9FE;
              color: #7C3AED;
              font-weight: 800;
              font-size: 13px;
              padding: 6px 18px;
              border-radius: 20px;
              margin-bottom: 14px;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            h1 {
              font-size: 32px;
              font-weight: 800;
              margin: 0 0 6px 0;
              color: #0F172A;
            }
            .sub {
              font-size: 15px;
              color: #64748B;
              margin-bottom: 24px;
            }
            .qr-frame {
              display: inline-block;
              padding: 16px;
              background: #FAF5FF;
              border: 2px dashed #7C3AED;
              border-radius: 24px;
              margin-bottom: 20px;
            }
            .qr-img {
              width: 220px;
              height: 220px;
              display: block;
              border-radius: 12px;
            }
            .prop-id {
              font-size: 13px;
              font-weight: 800;
              color: #7C3AED;
              margin-top: 10px;
              letter-spacing: 1px;
            }
            .link-box {
              background: #F1F5F9;
              padding: 10px 16px;
              border-radius: 12px;
              font-size: 12px;
              color: #475569;
              word-break: break-all;
              margin: 16px 0 24px 0;
            }
            .steps {
              display: flex;
              justify-content: space-around;
              margin-top: 20px;
              border-top: 1px solid #E2E8F0;
              padding-top: 20px;
            }
            .step-item { flex: 1; padding: 0 6px; }
            .step-num {
              width: 32px;
              height: 32px;
              line-height: 32px;
              border-radius: 50%;
              background: #7C3AED;
              color: #fff;
              font-weight: 800;
              font-size: 14px;
              margin: 0 auto 6px auto;
            }
            .step-text {
              font-size: 12px;
              font-weight: 600;
              color: #475569;
            }
            .footer {
              margin-top: 24px;
              font-size: 12px;
              color: #94A3B8;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="badge">Self Check-in Portal</div>
            <h1>StayMate Homestay</h1>
            <p class="sub">Scan with your phone camera to register & check in online</p>

            <div class="qr-frame">
              <a href="${shareUrl}" target="_blank" style="text-decoration: none;">
                <img class="qr-img" src="${qrImageUrl}" alt="Check-in QR Code" />
              </a>
              <div class="prop-id">PROPERTY ID: HS-4821</div>
            </div>

            <div class="link-box">
              <strong>Check-in Link:</strong><br/>
              <a href="${shareUrl}" target="_blank" style="color: #7C3AED; font-weight: 700; text-decoration: underline; word-break: break-all;">${shareUrl}</a>
            </div>

            <div class="steps">
              <div class="step-item">
                <div class="step-num">1</div>
                <div class="step-text">Scan QR with camera</div>
              </div>
              <div class="step-item">
                <div class="step-num">2</div>
                <div class="step-text">Fill details & upload ID</div>
              </div>
              <div class="step-item">
                <div class="step-num">3</div>
                <div class="step-text">Collect room key</div>
              </div>
            </div>

            <div class="footer">
              Powered by StayMate · Fast & Secure Digital Check-in
            </div>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable && uri) {
        await Sharing.shareAsync(uri, {
          UTI: 'com.adobe.pdf',
          mimeType: 'application/pdf',
          dialogTitle: 'Reception QR Standee PDF — StayMate',
        });
        onToast('QR Standee PDF ready to print! ✓');
      }
    } catch (e: any) {
      console.warn('Share Standee error:', e);
    }
  };

  // Copy link to device clipboard
  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(shareUrl);
      setCopied(true);
      onToast('Self check-in link copied to clipboard! ✓');
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      onToast('Link: ' + shareUrl);
    }
  };

  const handleOpenBrowser = async () => {
    try {
      const supported = await Linking.canOpenURL(shareUrl);
      if (supported) {
        await Linking.openURL(shareUrl);
      } else {
        onToast('Link: ' + shareUrl);
      }
    } catch (e) {
      onToast('Opening web form...');
    }
  };

  const handleApprove = (g: any) => {
    setPendingList((prev) => prev.filter((item) => item.id !== g.id));
    if (reviewGuest?.id === g.id) {
      setReviewGuest(null);
    }
    onToast(`✓ ${g.name} approved for Room ${g.room}!`);
  };

  const handleReject = (g: any) => {
    setPendingList((prev) => prev.filter((item) => item.id !== g.id));
    if (reviewGuest?.id === g.id) {
      setReviewGuest(null);
    }
    onToast(`Discarded check-in request from ${g.name}`);
  };

  return (
    <>
      {/* Offscreen Standee Poster for Crisp High-Res JPG Snapshots */}
      <View
        collapsable={false}
        ref={standeeCardRef}
        style={{
          position: 'absolute',
          left: -9999,
          width: 440,
          backgroundColor: '#FFFFFF',
          borderWidth: 3,
          borderColor: '#7C3AED',
          borderRadius: 26,
          padding: 30,
          alignItems: 'center',
        }}
      >
        <View
          style={{
            backgroundColor: '#EDE9FE',
            paddingHorizontal: 16,
            paddingVertical: 5,
            borderRadius: 20,
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontFamily: 'Inter',
              fontSize: 12,
              fontWeight: '800',
              color: '#7C3AED',
              letterSpacing: 0.5,
            }}
          >
            SELF CHECK-IN PORTAL
          </Text>
        </View>

        <Text
          style={{
            fontFamily: 'Inter',
            fontSize: 26,
            fontWeight: '800',
            color: '#0F172A',
            marginBottom: 4,
          }}
        >
          StayMate Homestay
        </Text>

        <Text
          style={{
            fontFamily: 'Inter',
            fontSize: 13,
            color: '#64748B',
            marginBottom: 18,
            textAlign: 'center',
          }}
        >
          Scan with your phone camera to register & check in online
        </Text>

        <View
          style={{
            padding: 14,
            backgroundColor: '#FAF5FF',
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: '#7C3AED',
            borderRadius: 20,
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Image
            source={{ uri: qrImageUrl }}
            style={{ width: 200, height: 200, borderRadius: 10 }}
            resizeMode="contain"
          />
          <Text
            style={{
              fontFamily: 'Inter',
              fontSize: 12,
              fontWeight: '800',
              color: '#7C3AED',
              marginTop: 8,
              letterSpacing: 1,
            }}
          >
            PROPERTY ID: HS-4821
          </Text>
        </View>

        <View
          style={{
            backgroundColor: '#F1F5F9',
            padding: 10,
            borderRadius: 10,
            width: '100%',
            marginBottom: 18,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: 'Inter',
              fontSize: 10,
              fontWeight: '800',
              color: '#475569',
              marginBottom: 2,
            }}
          >
            CHECK-IN LINK:
          </Text>
          <Text
            style={{
              fontFamily: 'Inter',
              fontSize: 11,
              fontWeight: '700',
              color: '#7C3AED',
              textAlign: 'center',
            }}
            numberOfLines={2}
          >
            {shareUrl}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            width: '100%',
            borderTopWidth: 1,
            borderTopColor: '#E2E8F0',
            paddingTop: 16,
          }}
        >
          <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: '#7C3AED',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 4,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>1</Text>
            </View>
            <Text style={{ fontSize: 10, fontWeight: '600', color: '#475569', textAlign: 'center' }}>
              Scan QR with camera
            </Text>
          </View>

          <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: '#7C3AED',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 4,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>2</Text>
            </View>
            <Text style={{ fontSize: 10, fontWeight: '600', color: '#475569', textAlign: 'center' }}>
              Fill details & upload ID
            </Text>
          </View>

          <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: '#7C3AED',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 4,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>3</Text>
            </View>
            <Text style={{ fontSize: 10, fontWeight: '600', color: '#475569', textAlign: 'center' }}>
              Collect room key
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 16 }}>
          Powered by StayMate · Fast & Secure Digital Check-in
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28}}
        showsVerticalScrollIndicator={false}
      >
        <Text style={ms.displayMd}>Web self check-ins</Text>
        <Text style={[ms.bodySm, {marginTop: 4}]}>
          Share the QR or link, then review and approve guest details.
        </Text>

        {/* QR Card */}
        <View style={ms.qrCard}>
          <View style={[ms.qrBox, {backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E9D5FF', padding: 8}]}>
            <Image
              source={{ uri: qrImageUrl }}
              style={{ width: 140, height: 140, borderRadius: 8 }}
              resizeMode="contain"
            />
          </View>
          <Text style={ms.titleSm}>Guest self check-in link</Text>
          <Text style={[ms.bodySm, {marginTop: 4, textAlign: 'center', fontSize: 12, color: C.primary}]} numberOfLines={2}>
            {shareUrl}
          </Text>

          {/* Action Buttons (Unified) */}
          <View style={{flexDirection: 'row', gap: 8, marginTop: 12, width: '100%'}}>
            <PrimaryButton
              label="Share QR & Link"
              icon="share"
              style={{flex: 1}}
              onPress={handleShareQrAndLink}
            />
            <SecondaryButton
              label={copied ? "Copied! ✓" : "Copy link"}
              icon={copied ? "check" : "copy"}
              style={{flex: 1}}
              onPress={handleCopy}
            />
          </View>

          {/* Additional Quick Actions */}
          <View style={{flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 10}}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleOpenBrowser}
              style={{paddingVertical: 6}}
            >
              <Text style={{fontFamily: 'Inter', fontSize: 12, fontWeight: '700', color: C.primary}}>
                Open Web Form →
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePrintStandee}
              style={{paddingVertical: 6}}
            >
              <Text style={{fontFamily: 'Inter', fontSize: 12, fontWeight: '700', color: '#6B7280'}}>
                Print QR Standee (PDF) 📄
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pending approvals */}
        <View style={ms.pendingHead}>
          <View>
            <Text style={ms.titleMd}>Pending approvals</Text>
            <Text style={ms.bodySm}>Review guest information before check-in.</Text>
          </View>
          <View style={ms.badgePurple}>
            <Text style={ms.badgePurpleText}>{pendingList.length} pending</Text>
          </View>
        </View>

        {pendingList.length === 0 ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <Icon name="check" size={28} color={C.emerald} />
            <Text style={[ms.titleSm, { marginTop: 8 }]}>All check-ins processed!</Text>
            <Text style={[ms.bodySm, { marginTop: 2 }]}>Share your QR code with new arriving guests.</Text>
          </View>
        ) : (
          pendingList.map((g) => (
            <View key={g.id} style={ms.pendingCard}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <View style={{minWidth: 0}}>
                  <Text style={ms.titleSm}>{g.name}</Text>
                  <Text style={ms.bodySm}>
                    Room {g.room} · {g.submitted}
                  </Text>
                </View>
                <View style={ms.badgeSoft}>
                  <Text style={ms.badgeSoftText}>Pending</Text>
                </View>
              </View>
              <View style={ms.cardDivider}/>
              <Text style={ms.bodySm}>{g.doc}</Text>
              <Text style={[ms.bodySm, {marginTop: 3}]}>{g.phone}</Text>
              <View style={{flexDirection: 'row', gap: 8, marginTop: 12}}>
                <SecondaryButton
                  label="Review"
                  style={{flex: 1}}
                  onPress={() => setReviewGuest(g)}
                />
                <PrimaryButton
                  label="Approve"
                  icon="check"
                  style={{flex: 1}}
                  onPress={() => handleApprove(g)}
                />
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Guest Review Sub-Modal */}
      {reviewGuest && (
        <Modal visible transparent animationType="slide">
          <View style={ms.sheetScrim}>
            <View style={[ms.sheet, {paddingBottom: 24}]}>
              <View style={ms.handle}/>
              
              {/* Navigation Header with Back and Close buttons */}
              <View style={ms.sheetHeaderBar}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setReviewGuest(null)}
                  style={ms.sheetBackBtn}
                >
                  <Icon name="chevronLeft" size={18} color={C.ink}/>
                </TouchableOpacity>
                <Text style={ms.sheetHeaderTitle}>Review Submission</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setReviewGuest(null)}
                  style={ms.sheetCloseBtnRelative}
                >
                  <Icon name="x" size={16} color={C.ink}/>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 20}}>
                <Text style={[ms.bodySm, {marginTop: 2}]}>
                  Online self check-in registration
                </Text>

                {reviewGuest.photoUri && (
                  <View style={{marginTop: 14, borderRadius: 14, overflow: 'hidden', height: 160, backgroundColor: '#FAF8FD', borderWidth: 1, borderColor: '#ECEAF0'}}>
                    <Image source={{ uri: reviewGuest.photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  </View>
                )}

                <View style={[ms.card, {marginTop: 14, gap: 10}]}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <Text style={ms.bodySm}>Full Name</Text>
                    <Text style={[ms.titleSm, {fontWeight: '700'}]}>{reviewGuest.name}</Text>
                  </View>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <Text style={ms.bodySm}>Assigned Room</Text>
                    <Text style={[ms.titleSm, {color: C.primary, fontWeight: '700'}]}>Room {reviewGuest.room}</Text>
                  </View>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <Text style={ms.bodySm}>Document</Text>
                    <Text style={ms.titleSm}>{reviewGuest.doc}</Text>
                  </View>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <Text style={ms.bodySm}>Phone</Text>
                    <Text style={ms.titleSm}>{reviewGuest.phone}</Text>
                  </View>
                  {reviewGuest.address && (
                    <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                      <Text style={ms.bodySm}>Address</Text>
                      <Text style={[ms.titleSm, {flex: 1, textAlign: 'right', marginLeft: 16}]}>{reviewGuest.address}</Text>
                    </View>
                  )}
                </View>

                <View style={{flexDirection: 'row', gap: 10, marginTop: 20}}>
                  <SecondaryButton
                    label="Reject"
                    style={{flex: 1}}
                    onPress={() => handleReject(reviewGuest)}
                  />
                  <PrimaryButton
                    label="Approve Check-in"
                    icon="check"
                    style={{flex: 1}}
                    onPress={() => handleApprove(reviewGuest)}
                  />
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

function SearchOverlay({
  onClose,
  onGuest,
}: {
  onClose: () => void;
  onGuest: (id: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const filteredGuests = GUESTS.filter((g) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      g.phone.includes(q) ||
      g.room.includes(q) ||
      g.idNum.toLowerCase().includes(q)
    );
  });

  return (
    <View style={[ms.overlayContainer, {paddingTop: insets.top}]}>
      <View style={ms.overlayHeader}>
        <IconButton name="chevronLeft" size={18} onPress={onClose}/>
        <View style={ms.searchPill}>
          <Icon name="search" size={17} color={C.muted}/>
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Name, phone, room, ID…"
            placeholderTextColor="#9CA3AF"
            style={ms.searchInput}
          />
        </View>
      </View>
      <ScrollView contentContainerStyle={{padding: 20, paddingBottom: Math.max(20, insets.bottom + 10)}} showsVerticalScrollIndicator={false}>
        <Text style={ms.sectionCaption}>
          {query.trim() ? `SEARCH RESULTS (${filteredGuests.length})` : 'RECENT GUESTS'}
        </Text>
        {filteredGuests.map((g) => (
          <View key={g.id}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => onGuest(g.id)}
              style={ms.guestItemRow}
            >
              <View style={ms.avatar}>
                <Text style={ms.avatarText}>
                  {g.name.split(' ').map((n) => n[0]).join('')}
                </Text>
              </View>
              <View style={{flex: 1, minWidth: 0}}>
                <Text style={ms.titleSm}>{g.name}</Text>
                <Text style={ms.bodySm}>
                  Room {g.room} · {g.phone}
                </Text>
              </View>
              <Icon name="chevronRight" size={17} color={C.mutedSoft}/>
            </TouchableOpacity>
            <View style={ms.cardDivider}/>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function ReportsOverlay({
  onClose,
  onToast,
}: {
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'month' | 'range' | 'room'>('month');

  return (
    <View style={[ms.overlayContainer, {paddingTop: insets.top}]}>
      <View style={ms.overlayHeader}>
        <IconButton name="chevronLeft" size={18} onPress={onClose}/>
        <Text style={ms.titleMd}>Compliance reports</Text>
      </View>
      <ScrollView contentContainerStyle={{padding: 20, paddingBottom: Math.max(20, insets.bottom + 10)}} showsVerticalScrollIndicator={false}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{gap: 8, paddingBottom: 4}}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setFilter('month')}
            style={filter === 'month' ? ms.chipDark : ms.chipLight}
          >
            <Text style={filter === 'month' ? ms.chipDarkText : ms.chipLightText}>This month</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setFilter('range')}
            style={filter === 'range' ? ms.chipDark : ms.chipLight}
          >
            <Text style={filter === 'range' ? ms.chipDarkText : ms.chipLightText}>Custom range</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setFilter('room')}
            style={filter === 'room' ? ms.chipDark : ms.chipLight}
          >
            <Text style={filter === 'room' ? ms.chipDarkText : ms.chipLightText}>By room</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Police Form C card */}
        <View style={ms.formCCard}>
          <View style={ms.formCIcon}>
            <Icon name="shield" size={20} color={C.ink}/>
          </View>
          <Text style={ms.titleMd}>Police Form C</Text>
          <Text style={[ms.bodySm, {marginTop: 4, textAlign: 'center'}]}>
            142 registrations logged this month, ready for export
          </Text>
          <View style={{flexDirection: 'row', gap: 8, marginTop: 16, width: '100%'}}>
            <SoftButton
              label="CSV"
              icon="download"
              style={{flex: 1}}
              onPress={() => onToast('Police Form C CSV downloaded')}
            />
            <PrimaryButton
              label="PDF"
              icon="share"
              style={{flex: 1}}
              onPress={() => onToast('Police Form C PDF generated')}
            />
          </View>
        </View>

        <Text style={[ms.sectionCaption, {marginTop: 20, marginBottom: 8}]}>
          EXPORT HISTORY
        </Text>
        {['August 2026', 'July 2026', 'June 2026'].map((m) => (
          <TouchableOpacity
            key={m}
            activeOpacity={0.7}
            onPress={() => onToast(`Downloading report for ${m}`)}
            style={ms.historyRow}
          >
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
              <View style={ms.historyIcon}>
                <Icon name="calendar" size={15} color={C.ink}/>
              </View>
              <Text style={ms.bodyMd}>{m}</Text>
            </View>
            <Icon name="download" size={16} color={C.mutedSoft}/>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function PricingOverlay({
  billing,
  setBilling,
  onClose,
  onSelectPlan,
}: {
  billing: boolean;
  setBilling: (b: boolean) => void;
  onClose: () => void;
  onSelectPlan: (plan: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [activeCheckout, setActiveCheckout] = useState<DevifyCheckoutResult | null>(null);
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<{
    name: string;
    amount: number;
    cycle: string;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [payMethod, setPayMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [copiedUpi, setCopiedUpi] = useState(false);

  const handleChoosePlan = async (p: any) => {
    // 1. Enterprise Plan -> Contact Sales
    if (p.priceM === null) {
      Alert.alert(
        'Enterprise Plan',
        'Contact our sales team for custom room limits, dedicated PMS integration, and tailored support.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Email Sales',
            onPress: () =>
              Linking.openURL(
                'mailto:sales@staymate.co.in?subject=StayMate%20Enterprise%20Plan%20Inquiry&body=Hello%20StayMate%20Team%2C%0A%0AI%20am%20interested%20in%20the%20Enterprise%20Plan%20for%20my%20property%20(HS-4821).'
              ),
          },
        ]
      );
      return;
    }

    // 2. Free Plan -> Instant Switch
    if (p.priceM === 0) {
      onSelectPlan('Free');
      onClose();
      return;
    }

    // 3. Paid Plans -> Devify Pay In-App Checkout
    const amount = billing ? (p.priceY ?? p.priceM * 10) : p.priceM;
    const cycle = billing ? 'yearly' : 'monthly';

    setIsCheckingOut(true);
    setSelectedPlanDetails({ name: p.name, amount, cycle });

    try {
      const checkout = await devifyPay.createCheckout({
        planName: p.name,
        billingCycle: cycle as any,
        amount,
        userEmail: 'owner@sunrisehomestay.com',
        userId: 'HS-4821',
      });

      setActiveCheckout(checkout);
    } catch (e: any) {
      Alert.alert('Checkout Error', e?.message || 'Failed to initialize Devify Pay checkout');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleCompletePayment = async () => {
    if (!selectedPlanDetails) return;
    setVerifying(true);
    // Simulate real-time payment processing & gateway verification
    setTimeout(() => {
      setVerifying(false);
      const planName = selectedPlanDetails.name;
      setActiveCheckout(null);
      setSelectedPlanDetails(null);
      onSelectPlan(planName);
      onClose();
      Alert.alert(
        '🎉 Subscription Activated!',
        `Your payment of ₹${selectedPlanDetails.amount.toLocaleString('en-IN')} via Devify Pay has been verified successfully.\n\nWelcome to StayMate ${planName} plan!`,
        [{ text: 'Great! Continue', style: 'default' }]
      );
    }, 1200);
  };

  const handleOpenUpiApp = async (app: string) => {
    if (!selectedPlanDetails || !activeCheckout) return;
    const upiUri = `upi://pay?pa=${upiId}&pn=StayMate%20Homestay&am=${selectedPlanDetails.amount}&cu=INR&tn=${activeCheckout.orderId}`;
    
    try {
      if (app === 'gpay') {
        const canGpay = await Linking.canOpenURL('gpay://');
        if (canGpay) {
          await Linking.openURL(`gpay://upi/pay?pa=${upiId}&pn=StayMate&am=${selectedPlanDetails.amount}&cu=INR&tn=${activeCheckout.orderId}`);
          return;
        }
      } else if (app === 'phonepe') {
        const canPhonePe = await Linking.canOpenURL('phonepe://');
        if (canPhonePe) {
          await Linking.openURL(`phonepe://pay?pa=${upiId}&pn=StayMate&am=${selectedPlanDetails.amount}&cu=INR&tn=${activeCheckout.orderId}`);
          return;
        }
      } else if (app === 'paytm') {
        const canPaytm = await Linking.canOpenURL('paytmmp://');
        if (canPaytm) {
          await Linking.openURL(`paytmmp://pay?pa=${upiId}&pn=StayMate&am=${selectedPlanDetails.amount}&cu=INR&tn=${activeCheckout.orderId}`);
          return;
        }
      }
      await Linking.openURL(upiUri);
    } catch (_) {
      // Fallback: Proceed with verification flow
      handleCompletePayment();
    }
  };

  const upiId = 'staymate@devifypay';
  const upiString = selectedPlanDetails && activeCheckout
    ? `upi://pay?pa=${upiId}&pn=StayMate%20Homestay&am=${selectedPlanDetails.amount}&cu=INR&tn=${activeCheckout.orderId}`
    : '';
  const upiQrUrl = upiString
    ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(upiString)}&color=1E1B4B&bgcolor=FFFFFF&margin=1`
    : '';

  const handleCopyUpi = async () => {
    await Clipboard.setStringAsync(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  return (
    <View style={[ms.overlayContainer, {paddingTop: insets.top}]}>
      <View style={ms.overlayHeader}>
        <IconButton name="x" size={17} onPress={onClose}/>
        <Text style={ms.titleMd}>Plans & pricing</Text>
      </View>
      <ScrollView contentContainerStyle={{padding: 20, paddingBottom: Math.max(30, insets.bottom + 16)}} showsVerticalScrollIndicator={false}>
        {/* Toggle track */}
        <View style={ms.toggleTrack}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setBilling(false)}
            style={[ms.toggleOpt, !billing && ms.toggleOptActive]}
          >
            <Text style={[ms.toggleOptText, !billing && ms.toggleOptTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setBilling(true)}
            style={[ms.toggleOpt, billing && ms.toggleOptActive]}
          >
            <Text style={[ms.toggleOptText, billing && ms.toggleOptTextActive]}>
              Annual · save 15%
            </Text>
          </TouchableOpacity>
        </View>

        {/* Plans */}
        <View style={{gap: 14}}>
          {PLANS.map((p) => {
            const isFeatured = Boolean(p.tag);
            const priceDisplay =
              p.priceM === null
                ? 'Custom'
                : p.priceM === 0
                ? 'Free'
                : `₹${(billing ? Math.round((p.priceY ?? 0) / 12) : p.priceM).toLocaleString('en-IN')}`;
            return (
              <View
                key={p.name}
                style={[ms.planCard, isFeatured && ms.planCardFeatured]}
              >
                {p.tag ? (
                  <View style={ms.featuredBadge}>
                    <Text style={ms.featuredBadgeText}>{p.tag}</Text>
                  </View>
                ) : null}
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                  <Text style={ms.titleMd}>{p.name}</Text>
                  <Text style={ms.planPriceText}>
                    {priceDisplay}
                    {p.priceM !== null && p.priceM > 0 ? (
                      <Text style={ms.perMoText}>/mo</Text>
                    ) : null}
                  </Text>
                </View>
                <Text style={[ms.bodySm, {marginTop: 8}]}>{p.rooms}</Text>
                <Text style={ms.bodySm}>{p.checkins}</Text>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8}}>
                  <Icon name="check" size={15} color={C.ink}/>
                  <Text style={[ms.bodySm, {color: C.ink}]}>
                    {p.ocr ? 'AI Document OCR included' : 'OCR not included'}
                  </Text>
                </View>
                <View style={{marginTop: 14}}>
                  {isFeatured ? (
                    <PrimaryButton
                      label={
                        isCheckingOut && selectedPlanDetails?.name === p.name
                          ? 'Starting checkout...'
                          : p.priceM === null
                          ? 'Contact sales'
                          : 'Choose plan'
                      }
                      style={{height: 44}}
                      onPress={() => handleChoosePlan(p)}
                    />
                  ) : (
                    <SecondaryButton
                      label={
                        isCheckingOut && selectedPlanDetails?.name === p.name
                          ? 'Starting checkout...'
                          : p.priceM === null
                          ? 'Contact sales'
                          : 'Choose plan'
                      }
                      style={{height: 44}}
                      onPress={() => handleChoosePlan(p)}
                    />
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Devify Pay In-App WebView Checkout Modal */}
      {activeCheckout && selectedPlanDetails && (
        <Modal visible animationType="slide" onRequestClose={() => setActiveCheckout(null)}>
          <SafeAreaView style={{flex: 1, backgroundColor: '#FAF8FD'}}>
            {/* Header Bar */}
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ECEAF0', backgroundColor: '#fff'}}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                <View style={{width: 32, height: 32, borderRadius: 16, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center'}}>
                  <Icon name="shield" size={18} color={C.primary}/>
                </View>
                <View>
                  <Text style={{fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: '#1E293B'}}>
                    Devify Pay Checkout
                  </Text>
                  <Text style={{fontFamily: 'Inter', fontSize: 11, fontWeight: '500', color: '#64748B'}}>
                    {selectedPlanDetails.name} Plan · ₹{selectedPlanDetails.amount.toLocaleString('en-IN')} ({selectedPlanDetails.cycle === 'yearly' ? 'Annual' : 'Monthly'})
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setActiveCheckout(null)}
                style={{width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center'}}
              >
                <Icon name="x" size={16} color={C.ink}/>
              </TouchableOpacity>
            </View>

            {/* In-App Browser / WebView Area */}
            <View style={{flex: 1, backgroundColor: '#FFFFFF'}}>
              {Platform.OS === 'web' ? (
                // @ts-ignore
                <iframe
                  src={activeCheckout.checkoutUrl}
                  style={{width: '100%', height: '100%', border: 'none'}}
                  title="Devify Pay Checkout"
                />
              ) : (
                <WebView
                  source={{ uri: activeCheckout.checkoutUrl }}
                  style={{flex: 1, backgroundColor: '#FFFFFF'}}
                  startInLoadingState
                  javaScriptEnabled
                  domStorageEnabled
                  scalesPageToFit
                  onNavigationStateChange={(navState) => {
                    if (
                      navState.url.includes('status=PAID') ||
                      navState.url.includes('/success') ||
                      navState.url.includes('order_status=paid')
                    ) {
                      handleCompletePayment();
                    }
                  }}
                />
              )}
            </View>

            {/* Bottom Action Toolbar */}
            <View style={{padding: 16, paddingBottom: Math.max(16, insets.bottom + 8), backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#ECEAF0', gap: 8}}>
              <PrimaryButton
                label={verifying ? "Verifying payment..." : "I have completed payment ✓"}
                icon="check"
                onPress={handleCompletePayment}
                style={{height: 46}}
              />
              <View style={{flexDirection: 'row', gap: 10}}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => Linking.openURL(activeCheckout.checkoutUrl)}
                  style={{flex: 1, height: 40, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center'}}
                >
                  <Text style={{fontFamily: 'Inter', fontSize: 12.5, fontWeight: '600', color: '#334155'}}>
                    Open in Browser ↗
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setActiveCheckout(null)}
                  style={{flex: 1, height: 40, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center'}}
                >
                  <Text style={{fontFamily: 'Inter', fontSize: 12.5, fontWeight: '600', color: '#64748B'}}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  webWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

const ms = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: {width: 0, height: 10},
    elevation: 8,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
  },
  modalText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    color: '#6a6a6a',
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 18,
  },
  toast: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: 96,
    backgroundColor: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 10,
    zIndex: 999,
  },
  toastText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '600',
    color: '#fff',
  },
  sheetScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '86%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 14,
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 40,
    shadowOffset: {width: 0, height: -10},
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: R.full,
    backgroundColor: '#dddddd',
    alignSelf: 'center',
    marginBottom: 10,
  },
  sheetCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 20,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  sheetHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 10,
  },
  sheetBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHeaderTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  sheetCloseBtnRelative: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeText: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: '#5B21B6',
  },
  roomSheetBed: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomSheetTitle: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '800',
    color: '#222222',
  },
  statusPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: R.full,
    borderWidth: 1.2,
  },
  statusPillBadgeText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
  },
  statusOptionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    backgroundColor: '#FAF8FD',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusOptionText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
  },
  occupantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    backgroundColor: '#FAF8FD',
  },
  viewGuestPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: R.full,
    backgroundColor: '#EDE9FE',
  },
  viewGuestPillText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  readyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  readyTitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  readySub: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: '#047857',
    marginTop: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: '#5B21B6',
  },
  displayMd: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
  },
  titleMd: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
  },
  titleSm: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '500',
    color: '#222222',
  },
  bodyMd: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '400',
    color: '#222222',
  },
  bodySm: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    color: '#6a6a6a',
  },
  caption: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '500',
    color: '#6a6a6a',
  },
  photosRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 14,
  },
  selfieBox: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: '#EDE9FE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoLabel: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '500',
    color: '#6a6a6a',
    marginLeft: 6,
  },
  idBox: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: '#F8F7FB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  metaCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ebebeb',
    backgroundColor: '#fff',
  },
  metaRow: {
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#ebebeb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    color: '#929292',
    flex: 1,
  },
  metaValue: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '500',
    color: '#222222',
    textAlign: 'right',
    maxWidth: '65%',
  },
  qrCard: {
    marginTop: 16,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#FCFAFF',
    borderWidth: 1,
    borderColor: '#E8DFFF',
    borderRadius: 14,
  },
  qrBox: {
    width: 150,
    height: 150,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
    elevation: 1,
  },
  pendingHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  badgePurple: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: R.full,
    backgroundColor: '#EDE9FE',
  },
  badgePurpleText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
  },
  badgeSoft: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: R.full,
    backgroundColor: '#F8F7FB',
  },
  badgeSoftText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '500',
    color: '#6a6a6a',
  },
  pendingCard: {
    marginTop: 10,
    padding: 14,
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
  cardDivider: {
    height: 1,
    backgroundColor: '#ebebeb',
    marginVertical: 10,
  },
  overlayContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  overlayHeader: {
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#ebebeb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
  },
  searchPill: {
    flex: 1,
    height: 42,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: '#dddddd',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#222222',
  },
  sectionCaption: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#6a6a6a',
    marginBottom: 8,
  },
  guestItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  chipDark: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: R.full,
    backgroundColor: '#222222',
  },
  chipDarkText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '600',
    color: '#fff',
  },
  chipLight: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: '#dddddd',
    backgroundColor: '#fff',
  },
  chipLightText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '600',
    color: '#222222',
  },
  formCCard: {
    marginTop: 16,
    padding: 18,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ebebeb',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  formCIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8F7FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ebebeb',
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F8F7FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTrack: {
    width: 220,
    alignSelf: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: R.full,
    padding: 4,
    flexDirection: 'row',
    marginBottom: 22,
  },
  toggleOpt: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: R.full,
    alignItems: 'center',
  },
  toggleOptActive: {
    backgroundColor: '#222222',
  },
  toggleOptText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: '#6a6a6a',
  },
  toggleOptTextActive: {
    color: '#fff',
  },
  planCard: {
    borderWidth: 1.5,
    borderColor: '#ECEAF0',
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#fff',
    position: 'relative',
    shadowColor: '#241840',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 1,
  },
  planCardFeatured: {
    borderColor: C.primary,
    shadowColor: C.primary,
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 4},
    elevation: 3,
  },
  featuredBadge: {
    position: 'absolute',
    top: -11,
    left: 20,
    backgroundColor: C.primary,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: R.full,
  },
  featuredBadgeText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  planPriceText: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '800',
    color: '#222222',
  },
  perMoText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '500',
    color: '#6a6a6a',
  },
});
