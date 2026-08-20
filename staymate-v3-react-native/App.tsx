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
  const [account, setAccount] = useState(false);
  const [guestId, setGuestId] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [billing, setBilling] = useState(false);

  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 2200);
  };

  const show = (title: string, text: string, primary = 'Close', action?: () => void) =>
    setModal({title, text, primary, action});

  const content =
    tab === 'dashboard' ? (
      <DashboardScreen
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
        onSelect={(num) => {
          setSelectedRoom(num);
          setSheet('room');
        }}
        onAddRoom={() =>
          show(
            'Add new room',
            'Configure room number, room category, and base nightly rate.',
            'Add Room',
            () => notify('Room added to property')
          )
        }
      />
    ) : tab === 'scanner' ? (
      <ScannerScreen
        onManual={() => setManual(true)}
        onVerify={() =>
          show(
            'OCR verification',
            'Guest details extracted. Verify the information before selecting a stay.'
          )
        }
        onWeb={() => setSheet('self')}
      />
    ) : (
      <SettingsScreen
        onAccount={() => setAccount(true)}
        onModal={show}
        onPricing={() => setOverlay('pricing')}
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
            onClose={() => setManual(false)}
            onDone={() => {
              setManual(false);
              notify('Check-in confirmed successfully');
            }}
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
              roomNum={selectedRoom}
              onToast={notify}
              onClose={() => setSheet(null)}
              onCheckin={() => {
                setSheet(null);
                setManual(true);
              }}
              onViewGuest={(gId) => {
                setSheet(null);
                setGuestId(gId);
                setSheet('guest');
              }}
              onModal={show}
            />
          </Sheet>
        </Modal>
      ) : null}

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
  roomNum,
  onToast,
  onClose,
  onCheckin,
  onViewGuest,
  onModal,
}: {
  roomNum: string;
  onToast: (msg: string) => void;
  onClose: () => void;
  onCheckin: () => void;
  onViewGuest: (id: number) => void;
  onModal: (t: string, m: string, p?: string, a?: () => void) => void;
}) {
  const room = ROOMS.find((r) => r.num === roomNum) || ROOMS[0];
  const [status, setStatus] = useState<RoomStatus>(room.status);
  const activeGuest = GUESTS.find((g) => g.room === room.num);
  const m = STATUS_META[status];

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
              <Icon name={status === 'available' ? 'check' : 'info'} size={10} color={m.color}/>
              <Text style={[ms.statusPillBadgeText, {color: m.color}]}>{m.label}</Text>
            </View>
          </View>
          <Text style={ms.bodySm}>
            {room.type} · ₹{room.price.toLocaleString('en-IN')}/night
          </Text>
        </View>
      </View>

      {/* Quick status switcher */}
      <Text style={[ms.sectionCaption, {marginTop: 14, marginBottom: 8}]}>CHANGE STATUS</Text>
      <View style={{flexDirection: 'row', gap: 6, flexWrap: 'wrap'}}>
        {(['available', 'occupied', 'cleaning', 'maintenance'] as const).map((st) => {
          const meta = STATUS_META[st];
          const isSelected = status === st;
          return (
            <TouchableOpacity
              key={st}
              activeOpacity={0.8}
              onPress={() => {
                setStatus(st);
                onToast(`Room ${room.num} marked as ${meta.label}`);
              }}
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

      {/* Active Guest Info if occupied */}
      {activeGuest ? (
        <View style={{marginTop: 18}}>
          <Text style={ms.sectionCaption}>CURRENT OCCUPANT</Text>
          <View style={ms.occupantCard}>
            <View style={ms.avatar}>
              <Text style={ms.avatarText}>
                {activeGuest.name.split(' ').map((n) => n[0]).join('')}
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
          ['Floor Level', `Floor ${room.num[0]}`],
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
        {activeGuest ? (
          <>
            <SecondaryButton
              label="Check-out"
              icon="logout"
              style={{flex: 1}}
              onPress={() =>
                onModal(
                  `Check-out Room ${room.num}?`,
                  `Confirm check-out for ${activeGuest.name}. Room status will be set to Cleaning.`,
                  'Check-out Guest',
                  () => {
                    setStatus('cleaning');
                    onClose();
                    onToast(`Room ${room.num} checked out. Marked for cleaning.`);
                  }
                )
              }
            />
            <PrimaryButton
              label="Guest Details"
              icon="users"
              style={{flex: 1}}
              onPress={() => onViewGuest(activeGuest.id)}
            />
          </>
        ) : (
          <>
            <SecondaryButton
              label="Edit Details"
              icon="edit"
              style={{flex: 1}}
              onPress={() => {
                onClose();
                onModal(
                  `Edit Room ${room.num}`,
                  'Update category, rate, or amenity tags for this room.',
                  'Save Changes',
                  () => onToast(`Room ${room.num} updated`)
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

  // Share actual QR image file (to WhatsApp, Save to Photos, AirDrop, Messages)
  const handleShareQrImage = async () => {
    try {
      onToast('Preparing QR Code image...');
      const file = new File(Paths.cache, 'staymate-checkin-qr.png');
      await File.downloadFileAsync(qrImageUrl, file);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable && file.uri) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share Guest Check-in QR Code',
          UTI: 'public.png',
        });
        onToast('QR Code shared! ✓');
        return;
      }
    } catch (err: any) {
      console.warn('Image share error:', err);
      // Fallback: Generate printable standee with QR code
      handlePrintStandee();
    }
  };

  // Direct WhatsApp text & link share
  const handleShareWhatsApp = async () => {
    const message = `🏡 *Welcome to StayMate Homestay!*\n\nPlease complete your quick guest registration online before arrival:\n🔗 ${shareUrl}\n\nWe look forward to hosting you!`;
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
    const webWhatsAppUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Linking.openURL(webWhatsAppUrl);
      }
    } catch (e) {
      await Share.share({
        title: 'Guest Self Check-in — StayMate',
        message,
        url: shareUrl,
      });
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

  // Print reception standee poster
  const handlePrintStandee = async () => {
    try {
      onToast('Generating Reception Standee...');
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Guest Check-in QR — StayMate Homestay</title>
          <style>
            @page { size: A4 portrait; margin: 20mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 20px; color: #222; }
            .container { border: 3px solid #7C3AED; border-radius: 24px; padding: 40px 30px; max-width: 540px; margin: 0 auto; }
            .badge { display: inline-block; background: #EDE9FE; color: #7C3AED; font-weight: 700; font-size: 14px; padding: 6px 16px; border-radius: 20px; margin-bottom: 12px; }
            h1 { font-size: 30px; font-weight: 800; margin: 0 0 8px 0; }
            .sub { font-size: 15px; color: #6A6A6A; margin-bottom: 24px; }
            .qr-frame { display: inline-block; padding: 16px; background: #FAF8FD; border: 2px dashed #7C3AED; border-radius: 20px; margin-bottom: 20px; }
            .qr-img { width: 220px; height: 220px; display: block; }
            .prop-id { font-size: 13px; font-weight: 700; color: #7C3AED; margin-top: 8px; letter-spacing: 1px; }
            .steps { display: flex; justify-content: space-around; margin-top: 24px; border-top: 1px solid #ECEAF0; padding-top: 20px; }
            .step-item { flex: 1; padding: 0 8px; }
            .step-num { width: 30px; height: 30px; line-height: 30px; border-radius: 50%; background: #7C3AED; color: #fff; font-weight: 700; font-size: 13px; margin: 0 auto 6px auto; }
            .step-text { font-size: 12px; font-weight: 600; color: #6A6A6A; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="badge">Self Check-in Portal</div>
            <h1>StayMate Homestay</h1>
            <p class="sub">Scan with your smartphone camera to register & check in</p>
            <div class="qr-frame">
              <img class="qr-img" src="${qrImageUrl}" alt="Check-in QR" />
              <div class="prop-id">PROPERTY ID: HS-4821</div>
            </div>
            <div class="steps">
              <div class="step-item"><div class="step-num">1</div><div class="step-text">Scan QR with camera</div></div>
              <div class="step-item"><div class="step-num">2</div><div class="step-text">Fill details & upload ID</div></div>
              <div class="step-item"><div class="step-num">3</div><div class="step-text">Collect room key</div></div>
            </div>
          </div>
        </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, {
        UTI: 'com.adobe.pdf',
        mimeType: 'application/pdf',
        dialogTitle: 'Reception QR Standee',
      });
    } catch (e: any) {
      console.warn('Print standee error:', e);
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
              style={{ width: 150, height: 150, borderRadius: 8 }}
              resizeMode="contain"
            />
          </View>
          <Text style={ms.titleSm}>Guest self check-in link</Text>
          <Text style={[ms.bodySm, {marginTop: 4, textAlign: 'center', fontSize: 12, color: C.primary}]} numberOfLines={2}>
            {shareUrl}
          </Text>

          {/* Primary Actions Grid */}
          <View style={{flexDirection: 'row', gap: 8, marginTop: 12, width: '100%'}}>
            <PrimaryButton
              label="Share QR Image"
              icon="image"
              style={{flex: 1}}
              onPress={handleShareQrImage}
            />
            <SecondaryButton
              label={copied ? "Copied! ✓" : "Copy link"}
              icon={copied ? "check" : "copy"}
              style={{flex: 1}}
              onPress={handleCopy}
            />
          </View>

          {/* WhatsApp & Print Standee Actions */}
          <View style={{flexDirection: 'row', gap: 8, marginTop: 8, width: '100%'}}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleShareWhatsApp}
              style={{
                flex: 1,
                height: 42,
                borderRadius: 12,
                backgroundColor: '#25D366',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Icon name="share" size={15} color="#fff" />
              <Text style={{fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: '#fff'}}>
                Send on WhatsApp
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handlePrintStandee}
              style={{
                flex: 1,
                height: 42,
                borderRadius: 12,
                backgroundColor: '#EDE9FE',
                borderWidth: 1,
                borderColor: '#DDD6FE',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Icon name="document" size={15} color={C.primary} />
              <Text style={{fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: C.primary}}>
                Print QR Standee
              </Text>
            </TouchableOpacity>
          </View>

          {/* Preview in Browser */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleOpenBrowser}
            style={{marginTop: 10, paddingVertical: 6, alignItems: 'center'}}
          >
            <Text style={{fontFamily: 'Inter', fontSize: 12.5, fontWeight: '700', color: C.primary}}>
              Open & Test Web Form in Browser →
            </Text>
          </TouchableOpacity>
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
              <TouchableOpacity
                onPress={() => setReviewGuest(null)}
                style={ms.closeBtn}
              >
                <Icon name="x" size={17} color={C.ink}/>
              </TouchableOpacity>

              <ScrollView contentContainerStyle={{padding: 20}}>
                <Text style={ms.displayMd}>Review Submission</Text>
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
                      label={p.priceM === null ? 'Contact sales' : 'Choose plan'}
                      style={{height: 44}}
                      onPress={() => onSelectPlan(p.name)}
                    />
                  ) : (
                    <SecondaryButton
                      label={p.priceM === null ? 'Contact sales' : 'Choose plan'}
                      style={{height: 44}}
                      onPress={() => onSelectPlan(p.name)}
                    />
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
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
