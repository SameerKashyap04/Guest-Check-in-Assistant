import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  TextInput,
  Platform,
  Image,
  Share,
  Alert,
  Linking,
  AppState,
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
import {ThemeProvider, useTheme} from './src/theme/ThemeContext';
import {Icon} from './src/components/Icon';
import {BottomNav, TabName} from './src/components/BottomNav';
import {PrimaryButton, SecondaryButton, SoftButton, IconButton} from './src/components/Ui';
import {PinScreen} from './src/screens/PinScreen';
import {LoginScreen} from './src/screens/LoginScreen';
import {DashboardScreen} from './src/screens/DashboardScreen';
import {RoomsScreen} from './src/screens/RoomsScreen';
import {ScannerScreen} from './src/screens/ScannerScreen';
import {SettingsScreen} from './src/screens/SettingsScreen';
import {ManualEntryScreen} from './src/screens/ManualEntryScreen';
import {AccountPortalScreen} from './src/screens/AccountPortalScreen';
import {CheckoutScreen} from './src/screens/CheckoutScreen';
import {ReferEarnScreen} from './src/screens/ReferEarnScreen';
import {BillingDurationMonths, SubscriptionPlan} from './src/types/subscription';
import {BILLING_PERIODS, calculatePlanPricing, getBillingPeriodConfig} from './src/config/plans';
import {GUESTS, ROOMS, STATUS_META, RoomStatus, SELF_CHECKINS, SELF_CHECKIN_URL, PLANS, buildSelfCheckinLink} from './src/data';
import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { captureRef } from 'react-native-view-shot';
import { AddRoomModal } from './src/components/AddRoomModal';
import { devifyPay, DevifyCheckoutResult } from './src/services/devifyPay';
import { plansService, DEFAULT_DISPLAY_PLANS, ClientDisplayPlan } from './src/services/plansService';
import { WebView } from 'react-native-webview';
import { securityService } from './src/services/securityService';
import { subscribeToPropertyCheckins, deleteCloudCheckinDoc } from './src/services/firebaseSync';
import { STAYMATE_REPORT_LOGO_BASE64 } from './src/constants/reportLogoBase64';

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
  const { isDark, colors } = useTheme();
  const [authStage, setAuthStage] = useState<'login' | 'set_password' | 'enter_pin' | 'dashboard'>('login');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [isSecurityReady, setIsSecurityReady] = useState(false);
  const lastActiveRef = useRef<number>(Date.now());

  const [tab, setTab] = useState<TabName>('dashboard');
  const [roomsList, setRoomsList] = useState<any[]>([...ROOMS]);
  const [guestsList, setGuestsList] = useState<any[]>([...GUESTS]);
  const [pendingCheckins, setPendingCheckins] = useState<any[]>([...SELF_CHECKINS]);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [modal, setModal] = useState<{
    title: string;
    text: string;
    primary?: string;
    action?: () => void;
  } | null>(null);
  const [sheet, setSheet] = useState<'guest' | 'self' | 'room' | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<'search' | 'reports' | 'pricing' | 'checkout' | 'refer-earn' | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<{ plan: string; duration: BillingDurationMonths }>({
    plan: 'Professional',
    duration: 6,
  });
  const [manual, setManual] = useState(false);
  const [manualInitialData, setManualInitialData] = useState<any | null>(null);
  const [account, setAccount] = useState(false);
  const [guestId, setGuestId] = useState<any>(null);
  const [selectedGuestObj, setSelectedGuestObj] = useState<any>(null);
  const [toast, setToast] = useState('');
  const [billing, setBilling] = useState(false);
  const [activePlan, setActivePlan] = useState<string>('Professional');

  const handleLoginSuccess = async (userData?: any) => {
    setCurrentUser(userData || { email: 'host@staymate.in' });
    setAuthStage('set_password');
  };

  const handleSetPasswordSuccess = () => {
    setUnlocked(true);
    setAuthStage('dashboard');
    notify('✓ Master security password configured!');
  };

  // Initialize Security Settings & check if lock is required
  useEffect(() => {
    (async () => {
      const cfg = await securityService.init();
      setIsSecurityReady(true);
    })();
  }, []);

  // Listen for AppState changes for Auto-Lock
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        lastActiveRef.current = Date.now();
      } else if (nextState === 'active') {
        const settings = securityService.getSettings();
        if (settings.isLockEnabled) {
          const autoLockMins = settings.autoLockMinutes;
          if (autoLockMins === 0) {
            // Immediately lock
            setUnlocked(false);
          } else if (autoLockMins > 0) {
            const elapsed = Date.now() - lastActiveRef.current;
            if (elapsed >= autoLockMins * 60 * 1000) {
              setUnlocked(false);
            }
          }
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Subscribe to real-time online self check-in submissions from Firestore
  useEffect(() => {
    const unsub = subscribeToPropertyCheckins('HS-4821', (cloudCheckin) => {
      const formatted = {
        id: cloudCheckin.id || `cloud_${Date.now()}`,
        name: cloudCheckin.full_name,
        room: cloudCheckin.room_number || '101',
        submitted: 'Just now',
        doc: `${cloudCheckin.id_type || 'ID'} · ${cloudCheckin.id_number || 'Submitted'}`,
        phone: cloudCheckin.phone,
        address: cloudCheckin.address,
        dob: cloudCheckin.dob,
        gender: cloudCheckin.gender,
        photoUri: cloudCheckin.photo_uri || '',
        frontPhotoUri: cloudCheckin.photo_uri || '',
        backPhotoUri: cloudCheckin.back_photo_uri || '',
        selfieUri: cloudCheckin.selfie_uri || '',
        additionalGuests: cloudCheckin.additional_guests || [],
        raw: cloudCheckin,
      };
      setPendingCheckins((prev) => {
        if (prev.some((p) => p.id === formatted.id)) return prev;
        return [formatted, ...prev];
      });
      notify(`New online check-in received from ${cloudCheckin.full_name}!`);
    });

    return () => {
      unsub();
    };
  }, []);

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

  // Add new room to property inventory with strict plan capacity limits
  const handleAddRoom = (newRoom: any) => {
    const maxRooms =
      activePlan.toUpperCase().includes('FREE')
        ? 2
        : activePlan.toUpperCase().includes('STARTER')
        ? 8
        : activePlan.toUpperCase().includes('PRO')
        ? 25
        : 9999;

    if (roomsList.length >= maxRooms) {
      show(
        'Room Capacity Limit Reached',
        `Your ${activePlan} plan allows up to ${maxRooms} rooms. Please upgrade your subscription to add more rooms.`,
        'Upgrade Plan',
        () => setOverlay('pricing')
      );
      return;
    }

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

  // Checkout guest from room and set room to cleaning (NEVER deletes guest details)
  const handleCheckoutGuest = (roomNum: string, guestName?: string) => {
    // 1. Update room status to cleaning
    setRoomsList((prev) =>
      prev.map((r) => (r.num === roomNum ? {...r, status: 'cleaning'} : r))
    );

    // 2. Mark guest as checked out with timestamp instead of deleting their record
    const now = new Date();
    const formattedCheckOut = `${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;

    setGuestsList((prev) =>
      prev.map((g) => {
        if (g.room === roomNum && (g.status === 'active' || (!g.status && !g.checkedOut))) {
          return {
            ...g,
            status: 'checked_out',
            checkedOut: true,
            checkOut: formattedCheckOut,
            time: 'Checked out',
          };
        }
        return g;
      })
    );

    setSheet(null);
    setSelectedRoom(null);
    notify(`✓ ${guestName ? guestName : `Room ${roomNum}`} checked out! Guest details preserved.`);
  };

  // Handle successful check-in from either Scanner or Manual Entry
  const handleCheckinComplete = (newGuest: any) => {
    const maxCheckins =
      activePlan.toUpperCase().includes('FREE')
        ? 15
        : activePlan.toUpperCase().includes('STARTER')
        ? 100
        : 999999;

    const currentCheckins = guestsList.filter((g) => g.status === 'active' || g.status === 'checked_out').length;

    if (currentCheckins >= maxCheckins) {
      show(
        'Monthly Check-in Limit Reached',
        `Your ${activePlan} plan includes ${maxCheckins} check-ins per month. Please upgrade your subscription to continue checking in guests.`,
        'Upgrade Plan',
        () => setOverlay('pricing')
      );
      return;
    }

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

  // Handle approval of an online self check-in submission
  const handleApproveSelfCheckin = (g: any) => {
    const assignedRoom = g.room || g.room_number || '101';
    const newGuest = {
      id: Date.now(),
      name: g.name || g.full_name || 'Guest',
      room: assignedRoom,
      type: g.docType || g.id_type || 'Aadhaar',
      idNum: g.idNum || g.id_number || 'Verified',
      phone: g.phone || '',
      email: g.email || '',
      nat: 'Indian',
      gender: g.gender || 'Other',
      address: g.address || '',
      dob: g.dob || g.raw?.dob || '',
      pinCode: g.pin_code || g.pinCode || g.raw?.pin_code || '',
      time: 'Just now',
      verified: true,
      roomType: roomsList.find((r) => r.num === assignedRoom)?.type || 'Standard',
      photoUri: g.photoUri || g.photo_uri || g.frontPhotoUri || g.raw?.photo_uri || null,
      frontPhotoUri: g.frontPhotoUri || g.photoUri || g.photo_uri || g.raw?.photo_uri || null,
      backPhotoUri: g.backPhotoUri || g.back_photo_uri || g.raw?.back_photo_uri || null,
      selfieUri: g.selfieUri || g.selfie_uri || g.raw?.selfie_uri || null,
      additionalGuests: g.additionalGuests || g.additional_guests || [],
      raw: g.raw || g,
    };
    setGuestsList((prev) => [newGuest, ...prev]);
    handleUpdateRoomStatus(assignedRoom, 'occupied');
    setPendingCheckins((prev) => prev.filter((item) => item.id !== g.id));
    if (g.id && typeof g.id === 'string') {
      deleteCloudCheckinDoc(g.id);
    }
    notify(`✓ ${newGuest.name} approved for Room ${assignedRoom}!`);
  };

  // Handle rejection / discard of an online self check-in submission
  const handleRejectSelfCheckin = (g: any) => {
    setPendingCheckins((prev) => prev.filter((item) => item.id !== g.id));
    if (g.id && typeof g.id === 'string') {
      deleteCloudCheckinDoc(g.id);
    }
    notify(`Check-in request from ${g.name} discarded`);
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
          if (activePlan.toUpperCase().includes('FREE')) {
            show(
              'AI Document OCR Upgrade Required',
              'AI Document OCR scanning is included in Starter and Professional plans. Please upgrade to scan physical IDs automatically.',
              'View Plans',
              () => setOverlay('pricing')
            );
            return;
          }
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
          if (activePlan.toUpperCase().includes('FREE')) {
            show(
              'AI Document OCR Upgrade Required',
              'AI Document OCR scanning is included in Starter and Professional plans. Please upgrade to scan physical IDs automatically.',
              'View Plans',
              () => setOverlay('pricing')
            );
            return;
          }
          setManualInitialData(guestData);
          setManual(true);
        }}
        onWeb={() => setSheet('self')}
      />
    ) : (
      <SettingsScreen
        currentPlan={activePlan}
        onAccount={() => setAccount(true)}
        onModal={show}
        onPricing={() => setOverlay('pricing')}
        onReferEarn={() => setOverlay('refer-earn')}
        onToast={notify}
        onLogout={() =>
          show(
            'Log out of StayMate?',
            'You will need to sign in again with your email and password.',
            'Log out',
            () => {
              setUnlocked(false);
              setAuthStage('login');
              setCurrentUser(null);
              setModal(null);
              notify('Logged out securely');
            }
          )
        }
        onLock={() => {
          setUnlocked(false);
          setAuthStage('enter_pin');
        }}
      />
    );

  // STAGE 1: Host Login Screen
  if (authStage === 'login') {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // STAGE 2: Set Master Password / PIN Screen
  if (authStage === 'set_password') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.canvas }]} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar style={isDark ? "light" : "dark"}/>
        <PinScreen mode="setup" onUnlock={handleSetPasswordSuccess} onPinSet={handleSetPasswordSuccess} />
      </SafeAreaView>
    );
  }

  // STAGE 3: Unlock Guard for existing sessions / auto-lock
  if (isSecurityReady && !unlocked) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.canvas }]} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar style={isDark ? "light" : "dark"}/>
        <PinScreen mode="enter" onUnlock={() => { setUnlocked(true); setAuthStage('dashboard'); }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.canvas }]} edges={['top', 'left', 'right']}>
      <StatusBar style={isDark ? "light" : "dark"}/>
      <View style={{flex: 1, backgroundColor: colors.canvas}}>
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
            guests={guestsList}
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
            guests={guestsList}
            rooms={roomsList}
            currentPlan={activePlan}
            onClose={() => setOverlay(null)}
            onToast={notify}
            onUpgrade={() => setOverlay('pricing')}
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
              setActivePlan(plan);
              setOverlay(null);
              notify(`Switched to ${plan} plan`);
            }}
            onOpenCheckout={(plan, duration) => {
              setCheckoutPlan({ plan, duration });
              setOverlay('checkout');
            }}
          />
        </Modal>
      )}

      {/* Dedicated Checkout overlay */}
      {overlay === 'checkout' && (
        <Modal visible animationType="slide">
          <CheckoutScreen
            initialPlan={checkoutPlan.plan}
            initialDuration={checkoutPlan.duration}
            onClose={() => setOverlay(null)}
            onPaymentSuccess={(plan) => {
              setActivePlan(plan);
              setOverlay(null);
              notify(`✓ Upgraded to ${plan} plan!`);
            }}
            onToast={notify}
          />
        </Modal>
      )}

      {/* Refer & Earn overlay */}
      {overlay === 'refer-earn' && (
        <Modal visible animationType="slide">
          <ReferEarnScreen
            onClose={() => setOverlay(null)}
            onToast={notify}
          />
        </Modal>
      )}

      {/* Room details sheet */}
      {sheet === 'room' && selectedRoom ? (
        <Modal visible transparent animationType="slide">
          <Sheet onClose={() => setSheet(null)} showClose={false}>
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
              onViewGuest={(gId, gObj) => {
                setSheet(null);
                setGuestId(gId);
                setSelectedGuestObj(gObj || guestsList.find((g) => String(g.id) === String(gId)));
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
      {sheet === 'guest' && (guestId || selectedGuestObj) ? (
        <Modal visible transparent animationType="slide">
          <Sheet onClose={() => { setSheet(null); setSelectedGuestObj(null); }} showClose={false}>
            <GuestSheet
              id={guestId}
              guestObj={selectedGuestObj}
              guests={guestsList}
              pendingCheckins={pendingCheckins}
              onToast={notify}
              onClose={() => { setSheet(null); setSelectedGuestObj(null); }}
            />
          </Sheet>
        </Modal>
      ) : null}

      {/* Web self check-ins sheet */}
      {sheet === 'self' ? (
        <Modal visible transparent animationType="slide">
          <Sheet onClose={() => setSheet(null)} showClose={false}>
            <SelfCheckins
              pendingList={pendingCheckins}
              roomsList={roomsList}
              onApprove={handleApproveSelfCheckin}
              onReject={handleRejectSelfCheckin}
              onToast={notify}
              onClose={() => setSheet(null)}
            />
          </Sheet>
        </Modal>
      ) : null}

      {/* App modal / confirmation dialog */}
      {modal && (
        <Modal visible transparent animationType="fade">
          <View style={ms.scrim}>
            <View style={[ms.modalCard, isDark && { backgroundColor: '#18181B', borderColor: '#27272A', borderWidth: 1 }]}>
              <View style={[ms.modalIcon, isDark && { backgroundColor: '#2E1065' }]}>
                <Icon name="shield" size={23} color={colors.primary}/>
              </View>
              <Text style={[ms.modalTitle, isDark && { color: colors.ink }]}>{modal.title}</Text>
              <Text style={[ms.modalText, isDark && { color: colors.muted }]}>{modal.text}</Text>
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
      <ThemeProvider>
        <View style={styles.webWrapper}>
          <MainApp/>
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function Sheet({onClose, showClose = true, children}: {onClose: () => void; showClose?: boolean; children?: React.ReactNode}) {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();
  return (
    <View style={ms.sheetScrim}>
      {/* Tap backdrop outside popup card to dismiss */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={StyleSheet.absoluteFillObject} />
      </TouchableWithoutFeedback>
      <View style={[ms.sheet, isDark && { backgroundColor: '#18181B' }, {paddingBottom: Math.max(16, insets.bottom)}]}>
        {/* Tap handle bar to dismiss */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onClose}
          style={{paddingTop: 2, paddingBottom: 8, width: '100%', alignItems: 'center'}}
        >
          <View style={[ms.handle, isDark && { backgroundColor: '#3F3F46' }]}/>
        </TouchableOpacity>
        {showClose && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onClose}
            style={[ms.sheetCloseBtn, isDark && { backgroundColor: '#27272A' }]}
          >
            <Icon name="x" size={16} color={colors.ink}/>
          </TouchableOpacity>
        )}
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
  onViewGuest: (id: any, guest?: any) => void;
}) {
  const { isDark, colors } = useTheme();
  const activeGuest = guests.find((g) => g.room === room.num && (g.status === 'active' || (!g.status && !g.checkedOut)));
  const lastGuest = guests.find((g) => g.room === room.num && (g.status === 'checked_out' || g.checkedOut));
  const m = STATUS_META[room.status as RoomStatus] || STATUS_META.available;

  return (
    <ScrollView
      contentContainerStyle={{paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28}}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[ms.guestHeaderRow, {justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10}]}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1}}>
          <View style={[ms.roomSheetBed, {backgroundColor: isDark ? '#2E1065' : '#F7F3FF'}]}>
            <Icon name="bed" size={26} color={colors.primary}/>
          </View>
          <View style={{flex: 1}}>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 8}}>
              <Text style={[ms.roomSheetTitle, {color: colors.ink}]}>Room {room.num}</Text>
              <View style={[ms.statusPillBadge, {backgroundColor: m.bg, borderColor: m.color}]}>
                <Icon name={room.status === 'available' ? 'check' : 'info'} size={10} color={m.color}/>
                <Text style={[ms.statusPillBadgeText, {color: m.color}]}>{m.label}</Text>
              </View>
            </View>
            <Text style={[ms.bodySm, {color: colors.muted}]}>
              {room.type} · ₹{room.price.toLocaleString('en-IN')}/night{room.floor ? ` · ${room.floor}` : ''}
            </Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.8} onPress={onClose} style={[ms.sheetBackBtn, isDark && {backgroundColor: '#27272A'}]}>
          <Icon name="x" size={16} color={colors.ink}/>
        </TouchableOpacity>
      </View>

      {/* Quick status switcher */}
      <Text style={[ms.sectionCaption, {marginTop: 14, marginBottom: 8, color: colors.muted}]}>CHANGE STATUS</Text>
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
                isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'},
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
          <Text style={[ms.sectionCaption, {color: colors.muted}]}>CURRENT OCCUPANT</Text>
          <View style={[ms.occupantCard, isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'}]}>
            <View style={[ms.avatar, isDark && {backgroundColor: '#2E1065'}]}>
              <Text style={[ms.avatarText, isDark && {color: colors.primary}]}>
                {activeGuest.name.split(' ').map((n: string) => n[0]).join('')}
              </Text>
            </View>
            <View style={{flex: 1, minWidth: 0}}>
              <Text style={[ms.titleSm, {color: colors.ink}]}>{activeGuest.name}</Text>
              <Text style={[ms.bodySm, {color: colors.muted}]}>
                {activeGuest.type} · Checked in {activeGuest.time}
              </Text>
              <Text style={[ms.bodySm, {color: colors.ink, marginTop: 2}]}>{activeGuest.phone}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onViewGuest(activeGuest.id, activeGuest)}
              style={[ms.viewGuestPill, isDark && {backgroundColor: '#2E1065'}]}
            >
              <Text style={[ms.viewGuestPillText, isDark && {color: colors.primary}]}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : room.status === 'cleaning' ? (
        <View style={{marginTop: 18}}>
          <Text style={[ms.sectionCaption, {color: colors.muted}]}>HOUSEKEEPING</Text>
          <View style={[ms.readyCard, {backgroundColor: isDark ? '#451A03' : '#FFFBEB', borderColor: isDark ? '#78350F' : '#FDE68A'}]}>
            <Icon name="info" size={18} color="#D97706"/>
            <View style={{flex: 1}}>
              <Text style={[ms.readyTitle, {color: isDark ? '#FDE68A' : '#92400E'}]}>Housekeeping in Progress</Text>
              <Text style={[ms.readySub, {color: isDark ? '#FCD34D' : '#B45309'}]}>Room is being cleaned and sanitized for the next guest.</Text>
            </View>
          </View>
        </View>
      ) : room.status === 'maintenance' ? (
        <View style={{marginTop: 18}}>
          <Text style={[ms.sectionCaption, {color: colors.muted}]}>MAINTENANCE NOTICE</Text>
          <View style={[ms.readyCard, {backgroundColor: isDark ? '#450A0A' : '#FEF2F2', borderColor: isDark ? '#7F1D1D' : '#FECACA'}]}>
            <Icon name="info" size={18} color="#DC2626"/>
            <View style={{flex: 1}}>
              <Text style={[ms.readyTitle, {color: isDark ? '#FECACA' : '#991B1B'}]}>Under Maintenance</Text>
              <Text style={[ms.readySub, {color: isDark ? '#FCA5A5' : '#B91C1C'}]}>Inspection or repair required before assigning to guests.</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={{marginTop: 18}}>
          <Text style={[ms.sectionCaption, {color: colors.muted}]}>ROOM STATUS</Text>
          <View style={[ms.readyCard, isDark && {backgroundColor: '#064E3B', borderColor: '#047857'}]}>
            <Icon name="check" size={18} color="#10B981"/>
            <View style={{flex: 1}}>
              <Text style={[ms.readyTitle, isDark && {color: '#A7F3D0'}]}>Ready for Check-in</Text>
              <Text style={[ms.readySub, isDark && {color: '#6EE7B7'}]}>Cleaned, inspected and available for guest assignment.</Text>
            </View>
          </View>
        </View>
      )}

      {/* Previous Occupant Record (if room is not occupied and has previous guest) */}
      {room.status !== 'occupied' && lastGuest ? (
        <View style={{marginTop: 14}}>
          <Text style={[ms.sectionCaption, {color: colors.muted}]}>LAST CHECKED-OUT OCCUPANT</Text>
          <View style={[ms.occupantCard, {backgroundColor: isDark ? '#27272A' : '#F8FAFC', borderColor: isDark ? '#3F3F46' : '#E2E8F0'}]}>
            <View style={[ms.avatar, {backgroundColor: isDark ? '#3F3F46' : '#E2E8F0'}]}>
              <Text style={[ms.avatarText, {color: colors.muted}]}>
                {lastGuest.name.split(' ').map((n: string) => n[0]).join('')}
              </Text>
            </View>
            <View style={{flex: 1, minWidth: 0}}>
              <Text style={[ms.titleSm, {color: colors.ink}]}>{lastGuest.name}</Text>
              <Text style={[ms.bodySm, {color: colors.muted}]}>
                Checked out: {lastGuest.checkOut || 'Recently'}
              </Text>
              <Text style={[ms.bodySm, {color: colors.muted, marginTop: 2}]}>{lastGuest.phone || lastGuest.idNum}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onViewGuest(lastGuest.id)}
              style={[ms.viewGuestPill, {backgroundColor: isDark ? '#2E1065' : '#EDE9FE'}]}
            >
              <Text style={[ms.viewGuestPillText, {color: colors.primary}]}>View Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Room Details Table */}
      <View style={[ms.metaCard, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}, {marginTop: 16}]}>
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
              isDark && {borderBottomColor: '#27272A'},
              idx === arr.length - 1 && {borderBottomWidth: 0},
            ]}
          >
            <Text style={[ms.metaLabel, isDark && {color: colors.muted}]}>{label}</Text>
            <Text style={[ms.metaValue, isDark && {color: colors.ink}]}>{val}</Text>
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
  guestObj,
  guests = [],
  pendingCheckins = [],
  onToast,
  onClose,
}: {
  id?: any;
  guestObj?: any;
  guests?: any[];
  pendingCheckins?: any[];
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const { isDark, colors } = useTheme();
  const g = guestObj 
    || guests.find((x) => String(x.id) === String(id)) 
    || GUESTS.find((x) => String(x.id) === String(id)) 
    || (id ? guests.find((x) => x.name === id) : null)
    || guests[0] 
    || GUESTS[0];

  const [photoTab, setPhotoTab] = useState<'front' | 'back' | 'selfie'>('front');
  const [showFullDetails, setShowFullDetails] = useState(false);

  // Look up in pending checkins as extra fallback if object in guestsList lacks photos
  const matchedCheckin = pendingCheckins.find((p: any) => 
    (p.name && g.name && p.name.toLowerCase() === g.name.toLowerCase()) || 
    (p.full_name && g.name && p.full_name.toLowerCase() === g.name.toLowerCase()) ||
    (p.room && g.room && String(p.room) === String(g.room)) ||
    (p.room_number && g.room && String(p.room_number) === String(g.room))
  );

  const frontPic = 
    g.frontPhotoUri || 
    g.photoUri || 
    g.photo_uri || 
    g.front_photo_uri || 
    g.photo || 
    g.raw?.photo_uri || 
    g.raw?.frontPhotoUri || 
    matchedCheckin?.frontPhotoUri || 
    matchedCheckin?.photo_uri || 
    null;

  const backPic = 
    g.backPhotoUri || 
    g.back_photo_uri || 
    g.backPhoto || 
    g.raw?.back_photo_uri || 
    g.raw?.backPhotoUri || 
    matchedCheckin?.backPhotoUri || 
    matchedCheckin?.back_photo_uri || 
    null;

  const selfiePic = 
    g.selfieUri || 
    g.selfie_uri || 
    g.selfie || 
    g.selfiePhotoUri ||
    g.raw?.selfie_uri || 
    g.raw?.selfiePhotoUri || 
    matchedCheckin?.selfieUri || 
    matchedCheckin?.selfie_uri || 
    null;

  const currentPhoto =
    photoTab === 'front'
      ? frontPic
      : photoTab === 'back'
      ? backPic
      : selfiePic;

  const handleContact = async () => {
    if (!g.phone) {
      onToast('No phone number on record');
      return;
    }
    const cleanPhone = g.phone.replace(/[^0-9+]/g, '');
    const telUrl = `tel:${cleanPhone}`;
    try {
      const canOpen = await Linking.canOpenURL(telUrl);
      if (canOpen) {
        await Linking.openURL(telUrl);
      } else {
        await Clipboard.setStringAsync(g.phone);
        onToast(`Phone ${g.phone} copied to clipboard! ✓`);
      }
    } catch (_) {
      await Clipboard.setStringAsync(g.phone);
      onToast(`Phone ${g.phone} copied to clipboard! ✓`);
    }
  };

  // FULL DETAILS COMPREHENSIVE VIEW
  if (showFullDetails) {
    return (
      <ScrollView
        contentContainerStyle={{paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28}}
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation Header */}
        <View style={[ms.sheetHeaderBar, isDark && {borderBottomColor: '#27272A'}]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowFullDetails(false)}
            style={[ms.sheetBackBtn, isDark && {backgroundColor: '#27272A'}]}
          >
            <Icon name="chevronLeft" size={18} color={colors.ink}/>
          </TouchableOpacity>
          <Text style={[ms.sheetHeaderTitle, isDark && {color: colors.ink}]}>Full Guest Details</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose}
            style={[ms.sheetBackBtn, isDark && {backgroundColor: '#27272A'}]}
          >
            <Icon name="x" size={16} color={colors.ink}/>
          </TouchableOpacity>
        </View>

        {/* Guest Name & Status Card */}
        <View style={[ms.card, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}, {padding: 14, marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 12}]}>
          <View style={[ms.avatarLarge, isDark && {backgroundColor: '#2E1065'}]}>
            <Text style={[ms.avatarLargeText, isDark && {color: colors.primary}]}>
              {g.name ? g.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'GS'}
            </Text>
          </View>
          <View style={{flex: 1}}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
              <Text style={[ms.titleMd, isDark && {color: colors.ink}, {fontSize: 16, fontWeight: '700'}]}>{g.name}</Text>
              {g.verified ? <Icon name="check" size={15} color={C.emerald}/> : null}
            </View>
            <Text style={[ms.bodySm, {marginTop: 2, color: colors.primary, fontWeight: '600'}]}>
              Room {g.room} · {g.roomType || 'Standard'}
            </Text>
            <Text style={[ms.bodySm, isDark && {color: colors.muted}, {marginTop: 1}]}>
              {g.verified ? 'Verified Registration' : 'Pending Verification'}
            </Text>
          </View>
        </View>

        {/* ALL DOCUMENT IMAGES SECTION */}
        <Text style={[ms.sectionCaption, isDark && {color: colors.muted}, {marginTop: 16, marginBottom: 8}]}>
          {'DOCUMENT & VERIFICATION IMAGES'}
        </Text>
        
        {/* Photo Switcher Tabs */}
        <View style={{flexDirection: 'row', gap: 6, marginBottom: 8}}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setPhotoTab('front')}
            style={[
              ms.chipLight,
              isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'},
              {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6},
              photoTab === 'front' && {backgroundColor: colors.primary, borderColor: colors.primary},
            ]}
          >
            <Text style={photoTab === 'front' ? {color: '#FFFFFF', fontWeight: '700', fontSize: 11.5} : [ms.chipLightText, isDark && {color: colors.muted}]}>
              Front ID
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setPhotoTab('back')}
            style={[
              ms.chipLight,
              isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'},
              {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6},
              photoTab === 'back' && {backgroundColor: colors.primary, borderColor: colors.primary},
            ]}
          >
            <Text style={photoTab === 'back' ? {color: '#FFFFFF', fontWeight: '700', fontSize: 11.5} : [ms.chipLightText, isDark && {color: colors.muted}]}>
              Back ID
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setPhotoTab('selfie')}
            style={[
              ms.chipLight,
              isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'},
              {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6},
              photoTab === 'selfie' && {backgroundColor: colors.primary, borderColor: colors.primary},
            ]}
          >
            <Text style={photoTab === 'selfie' ? {color: '#FFFFFF', fontWeight: '700', fontSize: 11.5} : [ms.chipLightText, isDark && {color: colors.muted}]}>
              Live Selfie
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Photo Container */}
        {currentPhoto ? (
          <View style={[{borderRadius: 14, overflow: 'hidden', height: 200, backgroundColor: '#FAF8FD', borderWidth: 1, borderColor: '#ECEAF0', alignItems: 'center', justifyContent: 'center'}, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}]}>
            <Image source={{ uri: currentPhoto }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            <View style={{position: 'absolute', bottom: 6, left: 8, backgroundColor: 'rgba(15, 23, 42, 0.75)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5}}>
              <Text style={{color: '#FFFFFF', fontSize: 10, fontWeight: '700'}}>
                {photoTab === 'front' ? 'ID Document (Front Side)' : photoTab === 'back' ? 'ID Document (Back Side)' : 'Live Guest Selfie'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[{padding: 24, backgroundColor: '#FAF8FD', borderRadius: 14, borderWidth: 1, borderColor: '#ECEAF0', alignItems: 'center', justifyContent: 'center', minHeight: 160}, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}]}>
            <Icon name="image" size={24} color={colors.muted} />
            <Text style={[ms.titleSm, isDark && {color: colors.ink}, {marginTop: 6}]}>
              {photoTab === 'front' ? 'No Front ID Photo' : photoTab === 'back' ? 'No Back ID Photo' : 'No Live Selfie Photo'}
            </Text>
            <Text style={[ms.bodySm, {color: colors.muted, marginTop: 2, textAlign: 'center'}]}>
              {photoTab === 'back' ? 'Back side ID not attached' : photoTab === 'selfie' ? 'Live selfie photo not attached' : 'Front ID not attached'}
            </Text>
          </View>
        )}

        {/* Complete Identification Card */}
        <Text style={[ms.sectionCaption, isDark && {color: colors.muted}, {marginTop: 18, marginBottom: 8}]}>
          PRIMARY IDENTITY DETAILS
        </Text>
        <View style={[ms.card, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}, {padding: 12, gap: 8}]}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Full Legal Name</Text>
            <Text style={[ms.titleSm, isDark && {color: colors.ink}, {fontWeight: '700'}]}>{g.name}</Text>
          </View>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Document Type</Text>
            <Text style={[ms.titleSm, {color: colors.primary, fontWeight: '700'}]}>{g.type || 'Aadhaar Card'}</Text>
          </View>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Document ID Number</Text>
            <Text style={[ms.titleSm, {fontFamily: 'monospace', fontWeight: '700', color: colors.ink}]}>{g.idNum || '4821 9012 3456'}</Text>
          </View>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Nationality</Text>
            <Text style={[ms.titleSm, isDark && {color: colors.ink}]}>{g.nat || 'Indian'}</Text>
          </View>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Gender</Text>
            <Text style={[ms.titleSm, isDark && {color: colors.ink}]}>{g.gender || '—'}</Text>
          </View>
          {g.dob ? (
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Date of Birth</Text>
              <Text style={[ms.titleSm, isDark && {color: colors.ink}]}>{g.dob}</Text>
            </View>
          ) : null}
        </View>

        {/* Contact & Address Card */}
        <Text style={[ms.sectionCaption, isDark && {color: colors.muted}, {marginTop: 18, marginBottom: 8}]}>
          CONTACT & RESIDENTIAL ADDRESS
        </Text>
        <View style={[ms.card, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}, {padding: 12, gap: 8}]}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Mobile Phone</Text>
            <Text style={[ms.titleSm, {fontWeight: '700', color: colors.primary}]}>{g.phone || '—'}</Text>
          </View>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Email Address</Text>
            <Text style={[ms.titleSm, isDark && {color: colors.ink}]}>{g.email || '—'}</Text>
          </View>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Permanent Address</Text>
            <Text style={[ms.titleSm, isDark && {color: colors.ink}, {flex: 1, textAlign: 'right', marginLeft: 16}]}>{g.address || '—'}</Text>
          </View>
        </View>

        {/* Stay & Room Card */}
        <Text style={[ms.sectionCaption, isDark && {color: colors.muted}, {marginTop: 18, marginBottom: 8}]}>
          STAY & ROOM ACCOMMODATION
        </Text>
        <View style={[ms.card, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}, {padding: 12, gap: 8}]}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Assigned Room</Text>
            <Text style={[ms.titleSm, {color: colors.primary, fontWeight: '700'}]}>Room {g.room}</Text>
          </View>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Room Category</Text>
            <Text style={[ms.titleSm, isDark && {color: colors.ink}]}>{g.roomType || 'Standard'}</Text>
          </View>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Check-in Date & Time</Text>
            <Text style={[ms.titleSm, {color: '#10B981', fontWeight: '700'}]}>{g.checkIn || (g.time ? `20 Aug 2026, ${g.time}` : '20 Aug 2026, 09:42 AM')}</Text>
          </View>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Check-out Date & Time</Text>
            <Text style={[ms.titleSm, isDark && {color: colors.muted}, {fontWeight: '700'}]}>{g.checkOut || 'Active Stay'}</Text>
          </View>
        </View>

        {/* Co-Guests Section */}
        {g.additionalGuests && g.additionalGuests.length > 0 && (
          <View style={{marginTop: 16}}>
            <Text style={[ms.sectionCaption, isDark && {color: colors.muted}, {marginBottom: 8}]}>
              ACCOMPANYING CO-GUESTS ({g.additionalGuests.length})
            </Text>
            {g.additionalGuests.map((cg: any, idx: number) => (
              <View key={idx} style={[ms.card, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}, {marginBottom: 8, padding: 12}]}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <Text style={[ms.titleSm, isDark && {color: colors.ink}, {fontWeight: '700'}]}>{cg.full_name || cg.name || cg.fullName}</Text>
                  <View style={[ms.badgeSoft, isDark && {backgroundColor: '#2E1065'}]}>
                    <Text style={[ms.badgeSoftText, isDark && {color: colors.primary}]}>{cg.relation || 'Co-Guest'}</Text>
                  </View>
                </View>
                <Text style={[ms.bodySm, isDark && {color: colors.muted}, {marginTop: 4}]}>
                  {cg.id_type || cg.idType || 'ID'}: <Text style={[{fontFamily: 'monospace', fontWeight: '600'}, isDark && {color: colors.ink}]}>{cg.id_number || cg.idNumber || '—'}</Text>
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={{flexDirection: 'row', gap: 10, marginTop: 18}}>
          <SecondaryButton
            label="Back to Summary"
            icon="chevronLeft"
            style={{flex: 1}}
            onPress={() => setShowFullDetails(false)}
          />
          <PrimaryButton
            label="Contact Guest"
            icon="phone"
            style={{flex: 1}}
            onPress={handleContact}
          />
        </View>
      </ScrollView>
    );
  }

  // STANDARD SUMMARY VIEW
  return (
    <ScrollView
      contentContainerStyle={{paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24}}
      showsVerticalScrollIndicator={false}
    >
      {/* Guest header with integrated Close button */}
      <View style={[ms.guestHeaderRow, {justifyContent: 'space-between', marginBottom: 10}]}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1}}>
          <View style={[ms.avatarLarge, isDark && {backgroundColor: '#2E1065'}]}>
            <Text style={[ms.avatarLargeText, isDark && {color: colors.primary}]}>
              {g.name ? g.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'GS'}
            </Text>
          </View>
          <View style={{flex: 1}}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
              <Text style={[ms.titleMd, isDark && {color: colors.ink}]}>{g.name}</Text>
              {g.verified ? <Icon name="check" size={15} color={C.emerald}/> : null}
            </View>
            <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>
              {g.verified ? 'Verified registration' : 'Awaiting verification'} · Room {g.room}
            </Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.8} onPress={onClose} style={[ms.sheetBackBtn, isDark && {backgroundColor: '#27272A'}]}>
          <Icon name="x" size={16} color={colors.ink}/>
        </TouchableOpacity>
      </View>

      {/* Photo Selector Switcher */}
      {(frontPic || backPic || selfiePic) && (
        <View style={{flexDirection: 'row', gap: 6, marginBottom: 8}}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setPhotoTab('front')}
            style={[
              ms.chipLight,
              isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'},
              {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 5},
              photoTab === 'front' && {backgroundColor: colors.primary, borderColor: colors.primary},
            ]}
          >
            <Text style={photoTab === 'front' ? {color: '#FFFFFF', fontWeight: '700', fontSize: 11} : [ms.chipLightText, isDark && {color: colors.muted}]}>
              Front ID
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setPhotoTab('back')}
            style={[
              ms.chipLight,
              isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'},
              {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 5},
              photoTab === 'back' && {backgroundColor: colors.primary, borderColor: colors.primary},
            ]}
          >
            <Text style={photoTab === 'back' ? {color: '#FFFFFF', fontWeight: '700', fontSize: 11} : [ms.chipLightText, isDark && {color: colors.muted}]}>
              Back ID
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setPhotoTab('selfie')}
            style={[
              ms.chipLight,
              isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'},
              {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 5},
              photoTab === 'selfie' && {backgroundColor: colors.primary, borderColor: colors.primary},
            ]}
          >
            <Text style={photoTab === 'selfie' ? {color: '#FFFFFF', fontWeight: '700', fontSize: 11} : [ms.chipLightText, isDark && {color: colors.muted}]}>
              Live Photo
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Photo / ID Section (Compact height 135) */}
      {currentPhoto ? (
        <View style={[{borderRadius: 14, overflow: 'hidden', height: 135, backgroundColor: '#FAF8FD', borderWidth: 1, borderColor: '#ECEAF0', alignItems: 'center', justifyContent: 'center'}, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}]}>
          <Image source={{ uri: currentPhoto }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          <View style={{position: 'absolute', bottom: 6, left: 8, backgroundColor: 'rgba(15, 23, 42, 0.75)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5}}>
            <Text style={{color: '#FFFFFF', fontSize: 10, fontWeight: '700'}}>
              {photoTab === 'front' ? 'Front Side ID' : photoTab === 'back' ? 'Back Side ID' : 'Live Selfie'}
            </Text>
          </View>
        </View>
      ) : (
        <View style={[{marginVertical: 6, padding: 10, backgroundColor: '#FAF8FD', borderRadius: 12, borderWidth: 1, borderColor: '#ECEAF0', flexDirection: 'row', alignItems: 'center', gap: 10}, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}]}>
          <View style={[{width: 34, height: 34, borderRadius: 17, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center'}, isDark && {backgroundColor: '#2E1065'}]}>
            <Icon name="shield" size={16} color={colors.primary} />
          </View>
          <View style={{flex: 1}}>
            <Text style={[ms.titleSm, isDark && {color: colors.ink}, {fontSize: 13}]}>{g.type || 'ID Card'} Verified</Text>
            <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>{g.idNum || 'Verified on Registration'}</Text>
          </View>
        </View>
      )}

      {/* View Full Details Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setShowFullDetails(true)}
        style={{
          marginTop: 8,
          marginBottom: 8,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 10,
          backgroundColor: isDark ? '#2E1065' : '#F3E8FF',
          borderWidth: 1,
          borderColor: isDark ? '#4C1D95' : '#E9D5FF',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 7}}>
          <Icon name="file" size={15} color={colors.primary} />
          <Text style={{fontFamily: 'Inter', fontSize: 12.5, fontWeight: '700', color: colors.primary}}>
            {'View Full Guest & Document Details'}
          </Text>
        </View>
        <Icon name="chevronRight" size={15} color={colors.primary} />
      </TouchableOpacity>

      {/* Details table */}
      <View style={[ms.metaCard, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}]}>
        {([
          ['Stay Status', (g.status === 'checked_out' || g.checkedOut) ? 'Checked Out (Saved in Ledger)' : 'Active Stay'],
          ['Room', `${g.room} · ${g.roomType || 'Standard'}`],
          ['Document', `${g.type || 'ID'} — ${g.idNum || 'Verified'}`],
          ['Check-in', g.checkIn || (g.time && g.time !== 'Checked out' ? `20 Aug 2026, ${g.time}` : '20 Aug 2026, 09:42 AM')],
          ['Check-out', (g.status === 'checked_out' || g.checkedOut) ? (g.checkOut || 'Checked Out') : 'Active Stay'],
          ['Phone', g.phone || '—'],
          ['Nationality', g.nat || 'Indian'],
        ] as [string, string][]).map(([label, val], idx, arr) => (
          <View
            key={label}
            style={[
              ms.metaRow,
              isDark && {borderBottomColor: '#27272A'},
              idx === arr.length - 1 && {borderBottomWidth: 0},
            ]}
          >
            <Text style={[ms.metaLabel, isDark && {color: colors.muted}]}>{label}</Text>
            <Text style={[
              ms.metaValue,
              isDark && {color: colors.ink},
              label === 'Stay Status' && ((g.status === 'checked_out' || g.checkedOut) ? {color: colors.muted, fontWeight: '700'} : {color: '#10B981', fontWeight: '700'}),
            ]}>{val}</Text>
          </View>
        ))}
      </View>

      {/* Action buttons */}
      <View style={{flexDirection: 'row', gap: 10, marginTop: 12}}>
        <SecondaryButton
          label="Edit"
          icon="edit"
          style={{flex: 1}}
          onPress={() => {
            onClose();
            onToast('Opening guest editor');
          }}
        />
        <SecondaryButton
          label="Share ID"
          icon="share"
          style={{flex: 1}}
          onPress={() => onToast('Guest document link copied')}
        />
      </View>
    </ScrollView>
  );
}

function SelfCheckins({
  pendingList = [],
  roomsList = [],
  onApprove,
  onReject,
  onToast,
  onClose,
}: {
  pendingList: any[];
  roomsList?: any[];
  onApprove: (guest: any) => void;
  onReject: (guest: any) => void;
  onToast: (msg: string) => void;
  onClose?: () => void;
}) {
  const { isDark, colors } = useTheme();
  const [reviewGuest, setReviewGuest] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  const availableRooms = roomsList.length > 0 ? roomsList.filter((r) => r.status === 'available') : [
    { num: '101', type: 'Standard', price: 1800 },
    { num: '303', type: 'Cottage', price: 3600 }
  ];

  const shareUrl = buildSelfCheckinLink('HS-4821', 'StayMate Homestay', availableRooms);
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(shareUrl)}`;

  const welcomeMessage = `Welcome to StayMate Homestay!\n\nPlease complete your quick guest registration & check-in online before arrival:\n${shareUrl}\n\nWe look forward to hosting you!`;

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

  // WhatsApp Invite button
  const handleShareWhatsApp = async () => {
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(welcomeMessage)}`;
    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Share.share({
          title: 'Guest Self Check-in — StayMate',
          message: welcomeMessage,
          url: shareUrl,
        });
      }
      onToast('WhatsApp invitation shared! ✓');
    } catch (_) {
      await Clipboard.setStringAsync(welcomeMessage);
      onToast('Message & link copied to clipboard! ✓');
    }
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
            <div style="text-align: center; margin-bottom: 18px;">
              <img src="${STAYMATE_REPORT_LOGO_BASE64}" width="200" height="35" style="display: inline-block; width: 200px; height: 35px;" alt="StayMate" />
            </div>
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

  const handleLocalApprove = (g: any) => {
    if (reviewGuest?.id === g.id) {
      setReviewGuest(null);
    }
    onApprove(g);
  };

  const handleLocalReject = (g: any) => {
    if (reviewGuest?.id === g.id) {
      setReviewGuest(null);
    }
    onReject(g);
  };

  const [reviewPhotoTab, setReviewPhotoTab] = useState<'front' | 'back' | 'selfie'>('front');
  const [showReviewFullDetails, setShowReviewFullDetails] = useState(false);

  if (reviewGuest) {
    const frontPic = reviewGuest.frontPhotoUri || reviewGuest.photo_uri || reviewGuest.photoUri || reviewGuest.raw?.photo_uri || null;
    const backPic = reviewGuest.backPhotoUri || reviewGuest.back_photo_uri || reviewGuest.raw?.back_photo_uri || null;
    const selfiePic = reviewGuest.selfieUri || reviewGuest.selfie_uri || reviewGuest.raw?.selfie_uri || null;

    const currentReviewPhoto =
      reviewPhotoTab === 'front'
        ? frontPic
        : reviewPhotoTab === 'back'
        ? backPic
        : selfiePic;

    // FULL DETAILS COMPREHENSIVE VIEW FOR ONLINE CHECK-IN
    if (showReviewFullDetails) {
      return (
        <ScrollView
          contentContainerStyle={{paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28}}
          showsVerticalScrollIndicator={false}
        >
          {/* Navigation Header */}
          <View style={[ms.sheetHeaderBar, isDark && {borderBottomColor: '#27272A'}]}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowReviewFullDetails(false)}
              style={[ms.sheetBackBtn, isDark && {backgroundColor: '#27272A'}]}
            >
              <Icon name="chevronLeft" size={18} color={colors.ink}/>
            </TouchableOpacity>
            <Text style={[ms.sheetHeaderTitle, isDark && {color: colors.ink}]}>Full Submission Details</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowReviewFullDetails(false);
                setReviewGuest(null);
                if (onClose) onClose();
              }}
              style={[ms.sheetBackBtn, isDark && {backgroundColor: '#27272A'}]}
            >
              <Icon name="x" size={16} color={colors.ink}/>
            </TouchableOpacity>
          </View>

          {/* Guest Name & Status Card */}
          <View style={[ms.card, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}, {padding: 14, marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 12}]}>
            <View style={[ms.avatarLarge, isDark && {backgroundColor: '#2E1065'}]}>
              <Text style={[ms.avatarLargeText, isDark && {color: colors.primary}]}>
                {reviewGuest.name ? reviewGuest.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'GS'}
              </Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={[ms.titleMd, isDark && {color: colors.ink}, {fontSize: 16, fontWeight: '700'}]}>{reviewGuest.name}</Text>
              <Text style={[ms.bodySm, {marginTop: 2, color: colors.primary, fontWeight: '600'}]}>
                Assigned Room {reviewGuest.room}
              </Text>
              <Text style={[ms.bodySm, isDark && {color: colors.muted}, {marginTop: 1}]}>
                Submitted online · {reviewGuest.submitted || 'Just now'}
              </Text>
            </View>
          </View>

          {/* ALL DOCUMENT IMAGES SECTION */}
          <Text style={[ms.sectionCaption, isDark && {color: colors.muted}, {marginTop: 16, marginBottom: 8}]}>
            {'DOCUMENT & VERIFICATION IMAGES'}
          </Text>
          
          {/* Photo Switcher Tabs */}
          <View style={{flexDirection: 'row', gap: 6, marginBottom: 8}}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setReviewPhotoTab('front')}
              style={[
                ms.chipLight,
                isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'},
                {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6},
                reviewPhotoTab === 'front' && {backgroundColor: colors.primary, borderColor: colors.primary},
              ]}
            >
              <Text style={reviewPhotoTab === 'front' ? {color: '#FFFFFF', fontWeight: '700', fontSize: 11.5} : [ms.chipLightText, isDark && {color: colors.muted}]}>
                Front ID
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setReviewPhotoTab('back')}
              style={[
                ms.chipLight,
                isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'},
                {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6},
                reviewPhotoTab === 'back' && {backgroundColor: colors.primary, borderColor: colors.primary},
              ]}
            >
              <Text style={reviewPhotoTab === 'back' ? {color: '#FFFFFF', fontWeight: '700', fontSize: 11.5} : [ms.chipLightText, isDark && {color: colors.muted}]}>
                Back ID
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setReviewPhotoTab('selfie')}
              style={[
                ms.chipLight,
                isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'},
                {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6},
                reviewPhotoTab === 'selfie' && {backgroundColor: colors.primary, borderColor: colors.primary},
              ]}
            >
              <Text style={reviewPhotoTab === 'selfie' ? {color: '#FFFFFF', fontWeight: '700', fontSize: 11.5} : [ms.chipLightText, isDark && {color: colors.muted}]}>
                Live Selfie
              </Text>
            </TouchableOpacity>
          </View>

          {/* Active Photo Container */}
          {currentReviewPhoto ? (
            <View style={[{borderRadius: 14, overflow: 'hidden', height: 200, backgroundColor: '#FAF8FD', borderWidth: 1, borderColor: '#ECEAF0', alignItems: 'center', justifyContent: 'center'}, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}]}>
              <Image source={{ uri: currentReviewPhoto }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              <View style={{position: 'absolute', bottom: 6, left: 8, backgroundColor: 'rgba(15, 23, 42, 0.75)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5}}>
                <Text style={{color: '#FFFFFF', fontSize: 10, fontWeight: '700'}}>
                  {reviewPhotoTab === 'front' ? 'ID Document (Front Side)' : reviewPhotoTab === 'back' ? 'ID Document (Back Side)' : 'Live Guest Selfie'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={[{padding: 24, backgroundColor: '#FAF8FD', borderRadius: 14, borderWidth: 1, borderColor: '#ECEAF0', alignItems: 'center', justifyContent: 'center', minHeight: 180}, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}]}>
              <Icon name="image" size={24} color={colors.muted} />
              <Text style={[ms.titleSm, isDark && {color: colors.ink}, {marginTop: 6}]}>
                {reviewPhotoTab === 'front' ? 'No Front ID Photo' : reviewPhotoTab === 'back' ? 'No Back ID Photo' : 'No Live Selfie Photo'}
              </Text>
              <Text style={[ms.bodySm, {color: colors.muted, marginTop: 2, textAlign: 'center'}]}>
                {reviewPhotoTab === 'back' ? 'Guest did not attach a back-side ID image' : reviewPhotoTab === 'selfie' ? 'Guest did not attach a live selfie photo' : 'No ID document attached'}
              </Text>
            </View>
          )}

          {/* Primary Identity Details Card */}
          <Text style={[ms.sectionCaption, isDark && {color: colors.muted}, {marginTop: 18, marginBottom: 8}]}>
            PRIMARY IDENTITY DETAILS
          </Text>
          <View style={[ms.card, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}, {padding: 12, gap: 8}]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Full Legal Name</Text>
              <Text style={[ms.titleSm, isDark && {color: colors.ink}, {fontWeight: '700'}]}>{reviewGuest.name}</Text>
            </View>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Document Details</Text>
              <Text style={[ms.titleSm, {color: colors.primary, fontWeight: '700'}]}>{reviewGuest.doc || reviewGuest.idType || 'Aadhaar'}</Text>
            </View>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Document ID Number</Text>
              <Text style={[ms.titleSm, {fontFamily: 'monospace', fontWeight: '700', color: colors.ink}]}>{reviewGuest.idNum || reviewGuest.idNumber || reviewGuest.doc || '4821 9012 3456'}</Text>
            </View>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Nationality</Text>
              <Text style={[ms.titleSm, isDark && {color: colors.ink}]}>{reviewGuest.nationality || reviewGuest.nat || 'Indian'}</Text>
            </View>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Gender</Text>
              <Text style={[ms.titleSm, isDark && {color: colors.ink}]}>{reviewGuest.gender || '—'}</Text>
            </View>
            {reviewGuest.dob ? (
              <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Date of Birth</Text>
                <Text style={[ms.titleSm, isDark && {color: colors.ink}]}>{reviewGuest.dob}</Text>
              </View>
            ) : null}
          </View>

          {/* Contact & Address Card */}
          <Text style={[ms.sectionCaption, isDark && {color: colors.muted}, {marginTop: 18, marginBottom: 8}]}>
            CONTACT & RESIDENTIAL ADDRESS
          </Text>
          <View style={[ms.card, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}, {padding: 12, gap: 8}]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Mobile Phone</Text>
              <Text style={[ms.titleSm, {fontWeight: '700', color: colors.primary}]}>{reviewGuest.phone || '—'}</Text>
            </View>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Email Address</Text>
              <Text style={[ms.titleSm, isDark && {color: colors.ink}]}>{reviewGuest.email || '—'}</Text>
            </View>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Permanent Address</Text>
              <Text style={[ms.titleSm, isDark && {color: colors.ink}, {flex: 1, textAlign: 'right', marginLeft: 16}]}>{reviewGuest.address || '—'}</Text>
            </View>
          </View>

          {/* Stay & Room Card */}
          <Text style={[ms.sectionCaption, isDark && {color: colors.muted}, {marginTop: 18, marginBottom: 8}]}>
            STAY & ROOM SELECTION
          </Text>
          <View style={[ms.card, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}, {padding: 12, gap: 8}]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Selected Room</Text>
              <Text style={[ms.titleSm, {color: colors.primary, fontWeight: '700'}]}>Room {reviewGuest.room}</Text>
            </View>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Check-in Date</Text>
              <Text style={[ms.titleSm, {color: '#10B981', fontWeight: '700'}]}>{reviewGuest.checkInDate || '20 Aug 2026'}</Text>
            </View>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Check-out Date</Text>
              <Text style={[ms.titleSm, isDark && {color: colors.muted}, {fontWeight: '700'}]}>{reviewGuest.checkOutDate || '23 Aug 2026'}</Text>
            </View>
          </View>

          {/* Co-Guests Section */}
          {reviewGuest.additionalGuests && reviewGuest.additionalGuests.length > 0 && (
            <View style={{marginTop: 16}}>
              <Text style={[ms.sectionCaption, isDark && {color: colors.muted}, {marginBottom: 8}]}>
                ACCOMPANYING CO-GUESTS ({reviewGuest.additionalGuests.length})
              </Text>
              {reviewGuest.additionalGuests.map((cg: any, idx: number) => (
                <View key={idx} style={[ms.card, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}, {marginBottom: 8, padding: 12}]}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                    <Text style={[ms.titleSm, isDark && {color: colors.ink}, {fontWeight: '700'}]}>{cg.full_name || cg.name || cg.fullName}</Text>
                    <View style={[ms.badgeSoft, isDark && {backgroundColor: '#2E1065'}]}>
                      <Text style={[ms.badgeSoftText, isDark && {color: colors.primary}]}>{cg.relation || 'Co-Guest'}</Text>
                    </View>
                  </View>
                  <Text style={[ms.bodySm, isDark && {color: colors.muted}, {marginTop: 4}]}>
                    {cg.id_type || cg.idType || 'ID'}: <Text style={[{fontFamily: 'monospace', fontWeight: '600'}, isDark && {color: colors.ink}]}>{cg.id_number || cg.idNumber || '—'}</Text>
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={{flexDirection: 'row', gap: 10, marginTop: 18}}>
            <SecondaryButton
              label="Reject"
              style={{flex: 1}}
              onPress={() => {
                setShowReviewFullDetails(false);
                handleLocalReject(reviewGuest);
              }}
            />
            <PrimaryButton
              label="Approve Check-in"
              icon="check"
              style={{flex: 1.5}}
              onPress={() => {
                setShowReviewFullDetails(false);
                handleLocalApprove(reviewGuest);
              }}
            />
          </View>
        </ScrollView>
      );
    }

    // STANDARD REVIEW VIEW (Compact, perfectly fitted to mobile screen)
    return (
      <ScrollView
        contentContainerStyle={{paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24}}
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation Header */}
        <View style={[ms.sheetHeaderBar, isDark && {borderBottomColor: '#27272A'}]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setReviewGuest(null)}
            style={[ms.sheetBackBtn, isDark && {backgroundColor: '#27272A'}]}
          >
            <Icon name="chevronLeft" size={18} color={colors.ink}/>
          </TouchableOpacity>
          <Text style={[ms.sheetHeaderTitle, isDark && {color: colors.ink}]}>Review Submission</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose || (() => setReviewGuest(null))}
            style={[ms.sheetBackBtn, isDark && {backgroundColor: '#27272A'}]}
          >
            <Icon name="x" size={16} color={colors.ink}/>
          </TouchableOpacity>
        </View>

        {/* Photo Selector Switcher */}
        {(frontPic || backPic || selfiePic) && (
          <View style={{flexDirection: 'row', gap: 6, marginBottom: 8}}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setReviewPhotoTab('front')}
              style={[
                ms.chipLight,
                isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'},
                {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 5},
                reviewPhotoTab === 'front' && {backgroundColor: colors.primary, borderColor: colors.primary},
              ]}
            >
              <Text style={reviewPhotoTab === 'front' ? {color: '#FFFFFF', fontWeight: '700', fontSize: 11} : [ms.chipLightText, isDark && {color: colors.muted}]}>
                Front ID
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setReviewPhotoTab('back')}
              style={[
                ms.chipLight,
                isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'},
                {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 5},
                reviewPhotoTab === 'back' && {backgroundColor: colors.primary, borderColor: colors.primary},
              ]}
            >
              <Text style={reviewPhotoTab === 'back' ? {color: '#FFFFFF', fontWeight: '700', fontSize: 11} : [ms.chipLightText, isDark && {color: colors.muted}]}>
                Back ID
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setReviewPhotoTab('selfie')}
              style={[
                ms.chipLight,
                isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'},
                {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 5},
                reviewPhotoTab === 'selfie' && {backgroundColor: colors.primary, borderColor: colors.primary},
              ]}
            >
              <Text style={reviewPhotoTab === 'selfie' ? {color: '#FFFFFF', fontWeight: '700', fontSize: 11} : [ms.chipLightText, isDark && {color: colors.muted}]}>
                Live Selfie
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Photo Display with proper framing (Compact 135px height) */}
        {currentReviewPhoto ? (
          <View style={[{borderRadius: 14, overflow: 'hidden', height: 135, backgroundColor: '#FAF8FD', borderWidth: 1, borderColor: '#ECEAF0', alignItems: 'center', justifyContent: 'center'}, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}]}>
            <Image source={{ uri: currentReviewPhoto }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            <View style={{position: 'absolute', bottom: 6, left: 8, backgroundColor: 'rgba(15, 23, 42, 0.75)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5}}>
              <Text style={{color: '#FFFFFF', fontSize: 10, fontWeight: '700'}}>
                {reviewPhotoTab === 'front' ? 'ID Document (Front Side)' : reviewPhotoTab === 'back' ? 'ID Document (Back Side)' : 'Live Guest Selfie'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[{padding: 16, backgroundColor: '#FAF8FD', borderRadius: 14, borderWidth: 1, borderColor: '#ECEAF0', alignItems: 'center', justifyContent: 'center', height: 135}, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}]}>
            <Icon name="image" size={20} color={colors.muted} />
            <Text style={[ms.bodySm, {color: colors.muted, marginTop: 4, fontWeight: '600'}]}>
              {reviewPhotoTab === 'front' ? 'No Front ID Photo' : reviewPhotoTab === 'back' ? 'No Back ID Photo' : 'No Live Selfie Photo'}
            </Text>
          </View>
        )}

        {/* View Full Details Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowReviewFullDetails(true)}
          style={{
            marginTop: 8,
            marginBottom: 8,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 10,
            backgroundColor: isDark ? '#2E1065' : '#F3E8FF',
            borderWidth: 1,
            borderColor: isDark ? '#4C1D95' : '#E9D5FF',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 7}}>
            <Icon name="file" size={15} color={colors.primary} />
            <Text style={{fontFamily: 'Inter', fontSize: 12.5, fontWeight: '700', color: colors.primary}}>
              {'View Full Guest & Document Details'}
            </Text>
          </View>
          <Icon name="chevronRight" size={15} color={colors.primary} />
        </TouchableOpacity>

        {/* Quick Details Card */}
        <View style={[ms.card, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}, {padding: 12, gap: 8}]}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Full Name</Text>
            <Text style={[ms.titleSm, isDark && {color: colors.ink}, {fontWeight: '700'}]}>{reviewGuest.name}</Text>
          </View>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Assigned Room</Text>
            <Text style={[ms.titleSm, {color: colors.primary, fontWeight: '700'}]}>Room {reviewGuest.room}</Text>
          </View>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Document</Text>
            <Text style={[ms.titleSm, isDark && {color: colors.ink}]}>{reviewGuest.doc}</Text>
          </View>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Phone</Text>
            <Text style={[ms.titleSm, isDark && {color: colors.ink}]}>{reviewGuest.phone} {reviewGuest.additionalGuests?.length ? `· +${reviewGuest.additionalGuests.length} Co-Guest` : ''}</Text>
          </View>
        </View>

        <View style={{flexDirection: 'row', gap: 10, marginTop: 12}}>
          <SecondaryButton
            label="Reject"
            style={{flex: 1}}
            onPress={() => handleLocalReject(reviewGuest)}
          />
          <PrimaryButton
            label="Approve Check-in"
            icon="check"
            style={{flex: 1.5}}
            onPress={() => handleLocalApprove(reviewGuest)}
          />
        </View>
      </ScrollView>
    );
  }

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
            fontSize: 13.5,
            color: '#64748B',
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          Scan with your phone camera for instant digital registration
        </Text>

        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderWidth: 2,
            borderColor: '#E9D5FF',
            borderRadius: 20,
            padding: 16,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            shadowColor: '#7C3AED',
            shadowOpacity: 0.15,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
          }}
        >
          <Image
            source={{ uri: qrImageUrl }}
            style={{ width: 220, height: 220, borderRadius: 12 }}
            resizeMode="contain"
          />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 10 }}>
          <View style={{ alignItems: 'center', flex: 1 }}>
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
              Scan QR code
            </Text>
          </View>

          <View style={{ alignItems: 'center', flex: 1 }}>
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
              Fill details & ID
            </Text>
          </View>

          <View style={{ alignItems: 'center', flex: 1 }}>
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
      </View>

      <ScrollView
        contentContainerStyle={{paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28}}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Close Button */}
        <View style={{flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12}}>
          <View style={{flex: 1, paddingRight: 8}}>
            <Text style={[ms.displayMd, isDark && {color: colors.ink}]}>Web self check-ins</Text>
            <Text style={[ms.bodySm, isDark && {color: colors.muted}, {marginTop: 3}]}>
              Share the QR or link, then review and approve guest details in real time.
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onClose}
            style={[ms.sheetBackBtn, isDark && {backgroundColor: '#27272A'}]}
          >
            <Icon name="x" size={16} color={colors.ink}/>
          </TouchableOpacity>
        </View>

        {/* QR Card */}
        <View style={[ms.qrCard, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}]}>
          <View style={[ms.qrBox, {backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: isDark ? '#4C1D95' : '#E9D5FF', padding: 8}]}>
            <Image
              source={{ uri: qrImageUrl }}
              style={{ width: 140, height: 140, borderRadius: 8 }}
              resizeMode="contain"
            />
          </View>
          <Text style={[ms.titleSm, isDark && {color: colors.ink}, {marginTop: 8}]}>Guest self check-in link</Text>
          <Text style={[ms.bodySm, {marginTop: 4, textAlign: 'center', fontSize: 12, color: colors.primary}]} numberOfLines={2}>
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

          {/* WhatsApp & Additional Quick Actions */}
          <View style={{flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 14, marginTop: 12}}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleShareWhatsApp}
              style={{paddingVertical: 6, paddingHorizontal: 10, backgroundColor: isDark ? '#064E3B' : '#ECFDF5', borderRadius: 8}}
            >
              <Text style={{fontFamily: 'Inter', fontSize: 12, fontWeight: '700', color: isDark ? '#34D399' : '#059669'}}>
                WhatsApp Invite →
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleOpenBrowser}
              style={{paddingVertical: 6, paddingHorizontal: 10, backgroundColor: isDark ? '#2E1065' : '#FAF5FF', borderRadius: 8}}
            >
              <Text style={{fontFamily: 'Inter', fontSize: 12, fontWeight: '700', color: colors.primary}}>
                Open Web Form →
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePrintStandee}
              style={{paddingVertical: 6, paddingHorizontal: 10, backgroundColor: isDark ? '#27272A' : '#F3F4F6', borderRadius: 8}}
            >
              <Text style={{fontFamily: 'Inter', fontSize: 12, fontWeight: '700', color: isDark ? '#D1D5DB' : '#4B5563'}}>
                Print Reception PDF
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pending approvals */}
        <View style={ms.pendingHead}>
          <View>
            <Text style={[ms.titleMd, isDark && {color: colors.ink}]}>Pending approvals</Text>
            <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>Review guest information before check-in.</Text>
          </View>
          <View style={[ms.badgePurple, isDark && {backgroundColor: '#2E1065'}]}>
            <Text style={[ms.badgePurpleText, isDark && {color: colors.primary}]}>{pendingList.length} pending</Text>
          </View>
        </View>

        {pendingList.length === 0 ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <Icon name="check" size={28} color={C.emerald} />
            <Text style={[ms.titleSm, isDark && {color: colors.ink}, { marginTop: 8 }]}>All check-ins processed!</Text>
            <Text style={[ms.bodySm, isDark && {color: colors.muted}, { marginTop: 2 }]}>Share your QR code with new arriving guests.</Text>
          </View>
        ) : (
          pendingList.map((g) => (
            <View key={g.id} style={[ms.pendingCard, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}]}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <View style={{minWidth: 0}}>
                  <Text style={[ms.titleSm, isDark && {color: colors.ink}]}>{g.name}</Text>
                  <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>
                    Room {g.room} · {g.submitted}
                  </Text>
                </View>
                <View style={[ms.badgeSoft, isDark && {backgroundColor: '#2E1065'}]}>
                  <Text style={[ms.badgeSoftText, isDark && {color: colors.primary}]}>Pending</Text>
                </View>
              </View>
              <View style={[ms.cardDivider, isDark && {backgroundColor: '#27272A'}]}/>
              <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>{g.doc}</Text>
              <Text style={[ms.bodySm, isDark && {color: colors.ink}, {marginTop: 3}]}>{g.phone}</Text>
              {g.additionalGuests && g.additionalGuests.length > 0 && (
                <Text style={[ms.bodySm, {marginTop: 2, color: colors.primary, fontWeight: '600'}]}>
                  + {g.additionalGuests.length} Co-Guest(s)
                </Text>
              )}
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
                  onPress={() => handleLocalApprove(g)}
                />
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </>
  );
}

function SearchOverlay({
  guests = [],
  onClose,
  onGuest,
}: {
  guests?: any[];
  onClose: () => void;
  onGuest: (id: number) => void;
}) {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const activeGuestList = guests.length > 0 ? guests : GUESTS;
  const filteredGuests = activeGuestList.filter((g) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (g.name && g.name.toLowerCase().includes(q)) ||
      (g.phone && g.phone.toLowerCase().includes(q)) ||
      (g.room && String(g.room).toLowerCase().includes(q)) ||
      (g.idNum && g.idNum.toLowerCase().includes(q))
    );
  });

  return (
    <View style={[ms.overlayContainer, isDark && {backgroundColor: colors.canvas}, {paddingTop: insets.top}]}>
      <View style={[ms.overlayHeader, isDark && {borderBottomColor: colors.cardBorder}]}>
        <IconButton name="chevronLeft" size={18} onPress={onClose}/>
        <View style={[ms.searchPill, isDark && {backgroundColor: colors.surfaceSoft, borderColor: colors.cardBorder}]}>
          <Icon name="search" size={17} color={colors.muted}/>
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Name, phone, room, ID…"
            placeholderTextColor={colors.muted}
            style={[ms.searchInput, isDark && {color: colors.ink}]}
          />
        </View>
      </View>
      <ScrollView contentContainerStyle={{padding: 20, paddingBottom: Math.max(20, insets.bottom + 10)}} showsVerticalScrollIndicator={false}>
        <Text style={[ms.sectionCaption, isDark && {color: colors.muted}]}>
          {query.trim() ? `SEARCH RESULTS (${filteredGuests.length})` : 'ALL GUESTS & STAYS'}
        </Text>
        {filteredGuests.map((g) => (
          <View key={g.id}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => onGuest(g.id)}
              style={ms.guestItemRow}
            >
              <View style={[ms.avatar, isDark && {backgroundColor: '#2E1065'}]}>
                <Text style={[ms.avatarText, isDark && {color: colors.primary}]}>
                  {g.name ? g.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'G'}
                </Text>
              </View>
              <View style={{flex: 1, minWidth: 0}}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                  <Text style={[ms.titleSm, isDark && {color: colors.ink}]}>{g.name}</Text>
                  {(g.status === 'checked_out' || g.checkedOut) ? (
                    <View style={{backgroundColor: isDark ? '#27272A' : '#F1F5F9', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4}}>
                      <Text style={{fontSize: 9.5, fontWeight: '700', color: isDark ? '#9CA3AF' : '#64748B'}}>CHECKED OUT</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[ms.bodySm, isDark && {color: colors.muted}]}>
                  Room {g.room} · {g.phone || g.idNum || 'Verified'}
                </Text>
              </View>
              <Icon name="chevronRight" size={17} color={colors.muted}/>
            </TouchableOpacity>
            <View style={[ms.cardDivider, isDark && {backgroundColor: colors.cardBorder}]}/>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function ReportsOverlay({
  guests = [],
  rooms = [],
  currentPlan = 'Professional',
  onClose,
  onToast,
  onUpgrade,
}: {
  guests?: any[];
  rooms?: any[];
  currentPlan?: string;
  onClose: () => void;
  onToast: (msg: string) => void;
  onUpgrade?: () => void;
}) {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'month' | 'range' | 'room'>('month');
  const [selectedRoomNum, setSelectedRoomNum] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportCount, setExportCount] = useState(6);

  // Compute active filtered guest list
  const activeGuestList = guests.length > 0 ? guests : GUESTS;
  const filteredGuests = activeGuestList.filter((g) => {
    if (filter === 'room' && selectedRoomNum) {
      return g.room === selectedRoomNum;
    }
    return true;
  });

  const getPeriodLabel = () => {
    if (filter === 'month') return 'August 2026';
    if (filter === 'room') return selectedRoomNum ? `Room ${selectedRoomNum} Ledger` : 'All Rooms';
    return 'All-Time Compliance Records';
  };

  // Generate & Share PDF
  const handleExportPdf = async (customLabel?: string, customGuests?: any[]) => {
    const maxExports =
      currentPlan?.toUpperCase().includes('FREE')
        ? 3
        : currentPlan?.toUpperCase().includes('STARTER')
        ? 10
        : 999999;

    if (exportCount >= maxExports) {
      if (onUpgrade) onUpgrade();
      onToast(`Monthly export limit reached (${maxExports}/mo on ${currentPlan}). Please upgrade.`);
      return;
    }

    const listToExport = customGuests || filteredGuests;
    const period = customLabel || getPeriodLabel();
    try {
      setIsExporting(true);
      setExportCount(prev => prev + 1);
      onToast(`Generating Police Form C PDF (${period})...`);

      const rowsHtml = listToExport.map((g, idx) => {
        const idType = g.type || g.id_type || g.idType || 'Aadhaar';
        const fullIdNumber = g.idNum || g.id_number || g.idNumber || g.docNum || '4821 9012 3456';
        const checkIn = g.checkIn || g.check_in || g.checkInDate || (g.time ? `20 Aug 2026, ${g.time}` : '20 Aug 2026, 09:42 AM');
        const checkOut = g.checkOut || g.check_out || g.checkOutDate || 'Active Stay';

        return `
        <tr>
          <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
          <td style="font-weight: 700; color: #0F172A;">${g.name || 'Guest'}</td>
          <td>${g.phone || '—'}</td>
          <td>${g.nat || 'Indian'} / ${g.gender || '—'}</td>
          <td>
            <strong style="color: #7C3AED;">${idType}</strong><br/>
            <span style="font-weight: 700; font-family: monospace; font-size: 11px; color: #0F172A;">${fullIdNumber}</span>
          </td>
          <td>${g.address || '—'}</td>
          <td style="text-align: center; font-weight: 700; color: #7C3AED;">Room ${g.room || '—'}</td>
          <td style="white-space: nowrap; font-weight: 600; color: #059669;">${checkIn}</td>
          <td style="white-space: nowrap; font-weight: 600; color: #475569;">${checkOut}</td>
          <td style="text-align: center; color: ${g.verified ? '#10B981' : '#F59E0B'}; font-weight: 700;">${g.verified ? 'VERIFIED' : 'PENDING'}</td>
        </tr>
      `;
      }).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Police Form C — StayMate Homestay</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              font-size: 10.5px;
              color: #1E293B;
              margin: 0;
              padding: 10px;
              background: #FFFFFF;
            }
            .header-banner {
              text-align: center;
              border-bottom: 2px solid #0F172A;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .gov-title {
              font-size: 16px;
              font-weight: 800;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              color: #0F172A;
            }
            .gov-sub {
              font-size: 10.5px;
              color: #64748B;
              margin-top: 3px;
            }
            .meta-bar {
              display: flex;
              justify-content: space-between;
              background: #F8FAFC;
              padding: 8px 12px;
              border: 1px solid #E2E8F0;
              border-radius: 8px;
              font-size: 11px;
              margin-bottom: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 6px;
            }
            th {
              background: #F1F5F9;
              border: 1px solid #CBD5E1;
              padding: 6px 7px;
              font-size: 9.5px;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              text-align: left;
              color: #475569;
            }
            td {
              border: 1px solid #E2E8F0;
              padding: 6px 7px;
              font-size: 10px;
            }
            tr:nth-child(even) {
              background: #FAF8FD;
            }
            .footer-bar {
              margin-top: 20px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              font-size: 10px;
              color: #64748B;
            }
            .seal-box {
              border-top: 1px dashed #94A3B8;
              width: 200px;
              text-align: center;
              padding-top: 6px;
              color: #0F172A;
              font-weight: 700;
            }
          </style>
        </head>
        <body>
          <div class="header-banner" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #7C3AED; padding-bottom: 12px; margin-bottom: 14px;">
            <div style="display: flex; align-items: center; gap: 16px;">
              <img src="${STAYMATE_REPORT_LOGO_BASE64}" width="160" height="28" style="display: block; width: 160px; height: 28px;" alt="StayMate" />
              <div style="border-left: 2px solid #CBD5E1; padding-left: 14px; text-align: left;">
                <div class="gov-title" style="font-size: 15px; font-weight: 800; color: #0F172A;">Police Form C & Hotel Guest Registration Ledger</div>
                <div class="gov-sub" style="font-size: 9.5px; color: #64748B; margin-top: 2px;">Official Compliance Record pursuant to Local Police Regulations & Registration of Foreigners Rules</div>
              </div>
            </div>
            <div style="text-align: right; font-size: 10px; color: #64748B; white-space: nowrap; margin-left: 12px;">
              <div><strong>Period:</strong> ${period}</div>
            </div>
          </div>

          <div class="meta-bar">
            <div><strong>Property:</strong> StayMate Homestay (ID: HS-4821)</div>
            <div><strong>Record Period:</strong> ${period}</div>
            <div><strong>Generated:</strong> ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            <div><strong>Total Entries:</strong> ${listToExport.length}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 20px; text-align: center;">#</th>
                <th>Guest Full Name</th>
                <th>Mobile Phone</th>
                <th>Nat / Gender</th>
                <th>Identity Document (Full ID)</th>
                <th>Residential Address</th>
                <th style="text-align: center;">Room</th>
                <th>Check-in Date & Time</th>
                <th>Check-out Date & Time</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="10" style="text-align: center; padding: 16px;">No registration records found for this period.</td></tr>'}
            </tbody>
          </table>

          <div class="footer-bar">
            <div>
              Generated via StayMate Automated Compliance System<br/>
              Document Hash: #SM-REC-${Date.now().toString(36).toUpperCase()}
            </div>
            <div class="seal-box">
              Authorized Hotel Manager Signature / Stamp
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
          dialogTitle: `Police Form C PDF (${period}) — StayMate`,
        });
        onToast(`Police Form C PDF (${period}) ready! ✓`);
      }
    } catch (e: any) {
      console.warn('PDF export error:', e);
      onToast('Generated Police Form C PDF');
    } finally {
      setIsExporting(false);
    }
  };

  // Generate & Share CSV
  const handleExportCsv = async (customLabel?: string, customGuests?: any[]) => {
    const maxExports =
      currentPlan?.toUpperCase().includes('FREE')
        ? 3
        : currentPlan?.toUpperCase().includes('STARTER')
        ? 10
        : 999999;

    if (exportCount >= maxExports) {
      if (onUpgrade) onUpgrade();
      onToast(`Monthly export limit reached (${maxExports}/mo on ${currentPlan}). Please upgrade.`);
      return;
    }

    const listToExport = customGuests || filteredGuests;
    const period = customLabel || getPeriodLabel();
    try {
      setIsExporting(true);
      setExportCount(prev => prev + 1);
      onToast(`Exporting Police Form C CSV (${period})...`);

      const headers = ['S_No', 'Guest_Name', 'Phone', 'Email', 'Gender', 'Nationality', 'Document_Type', 'Document_ID_Full', 'Address', 'Room', 'Room_Type', 'Check_in_Date_Time', 'Check_out_Date_Time', 'Verified_Status'];
      const rows = listToExport.map((g, idx) => {
        const idType = g.type || g.id_type || g.idType || 'Aadhaar';
        const fullIdNumber = g.idNum || g.id_number || g.idNumber || g.docNum || '4821 9012 3456';
        const checkIn = g.checkIn || g.check_in || g.checkInDate || (g.time ? `20 Aug 2026, ${g.time}` : '20 Aug 2026, 09:42 AM');
        const checkOut = g.checkOut || g.check_out || g.checkOutDate || 'Active Stay';

        return [
          idx + 1,
          `"${(g.name || '').replace(/"/g, '""')}"`,
          `"${(g.phone || '').replace(/"/g, '""')}"`,
          `"${(g.email || '').replace(/"/g, '""')}"`,
          `"${(g.gender || '').replace(/"/g, '""')}"`,
          `"${(g.nat || 'Indian').replace(/"/g, '""')}"`,
          `"${idType}"`,
          `"${fullIdNumber.replace(/"/g, '""')}"`,
          `"${(g.address || '').replace(/"/g, '""')}"`,
          `"${(g.room || '').replace(/"/g, '""')}"`,
          `"${(g.roomType || 'Standard').replace(/"/g, '""')}"`,
          `"${checkIn.replace(/"/g, '""')}"`,
          `"${checkOut.replace(/"/g, '""')}"`,
          `"${g.verified ? 'VERIFIED' : 'PENDING'}"`,
        ];
      });

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      
      const fileName = `Police_Form_C_${period.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
      const file = new File(Paths.cache, fileName);
      file.write(csvContent);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable && file.uri) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: `Police Form C CSV (${period})`,
          UTI: 'public.comma-separated-values-text',
        });
        onToast(`Police Form C CSV (${period}) exported! ✓`);
      }
    } catch (e: any) {
      console.warn('CSV export error:', e);
      onToast('Police Form C CSV exported! ✓');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={[ms.overlayContainer, isDark && {backgroundColor: colors.canvas}, {paddingTop: insets.top}]}>
      <View style={[ms.overlayHeader, isDark && {borderBottomColor: colors.cardBorder}]}>
        <IconButton name="chevronLeft" size={18} onPress={onClose}/>
        <Text style={[ms.titleMd, isDark && {color: colors.ink}]}>Compliance reports</Text>
      </View>
      <ScrollView contentContainerStyle={{padding: 20, paddingBottom: Math.max(20, insets.bottom + 10)}} showsVerticalScrollIndicator={false}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{gap: 8, paddingBottom: 4}}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setFilter('month');
              setSelectedRoomNum(null);
            }}
            style={[
              filter === 'month' ? ms.chipDark : ms.chipLight,
              filter === 'month' ? {backgroundColor: colors.primary} : isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'}
            ]}
          >
            <Text style={filter === 'month' ? ms.chipDarkText : [ms.chipLightText, isDark && {color: colors.muted}]}>This month</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setFilter('range');
              setSelectedRoomNum(null);
            }}
            style={[
              filter === 'range' ? ms.chipDark : ms.chipLight,
              filter === 'range' ? {backgroundColor: colors.primary} : isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'}
            ]}
          >
            <Text style={filter === 'range' ? ms.chipDarkText : [ms.chipLightText, isDark && {color: colors.muted}]}>All registrations</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setFilter('room');
            }}
            style={[
              filter === 'room' ? ms.chipDark : ms.chipLight,
              filter === 'room' ? {backgroundColor: colors.primary} : isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'}
            ]}
          >
            <Text style={filter === 'room' ? ms.chipDarkText : [ms.chipLightText, isDark && {color: colors.muted}]}>By room</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Room filter pill selector */}
        {filter === 'room' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{gap: 6, marginTop: 10, paddingBottom: 4}}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSelectedRoomNum(null)}
              style={[
                ms.chipLight,
                isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'},
                !selectedRoomNum && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              <Text style={!selectedRoomNum ? { color: '#FFFFFF', fontWeight: '700', fontSize: 12 } : [ms.chipLightText, isDark && {color: colors.muted}]}>
                All Rooms
              </Text>
            </TouchableOpacity>
            {(rooms.length > 0 ? rooms : ROOMS).map((r) => {
              const isSel = selectedRoomNum === r.num;
              return (
                <TouchableOpacity
                  key={r.num}
                  activeOpacity={0.8}
                  onPress={() => setSelectedRoomNum(r.num)}
                  style={[
                    ms.chipLight,
                    isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'},
                    isSel && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                >
                  <Text style={isSel ? { color: '#FFFFFF', fontWeight: '700', fontSize: 12 } : [ms.chipLightText, isDark && {color: colors.muted}]}>
                    Room {r.num}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Police Form C card */}
        <View style={[ms.formCCard, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}]}>
          <View style={[ms.formCIcon, isDark && {backgroundColor: '#2E1065'}]}>
            <Icon name="shield" size={20} color={colors.primary}/>
          </View>
          <Text style={[ms.titleMd, isDark && {color: colors.ink}]}>Police Form C</Text>
          <Text style={[ms.bodySm, isDark && {color: colors.muted}, {marginTop: 4, textAlign: 'center'}]}>
            {filteredGuests.length} registrations logged ({getPeriodLabel()}), ready for official export
          </Text>
          <View style={{flexDirection: 'row', gap: 8, marginTop: 16, width: '100%'}}>
            <SoftButton
              label="CSV"
              icon="download"
              style={{flex: 1}}
              onPress={() => handleExportCsv()}
            />
            <PrimaryButton
              label="PDF"
              icon="share"
              style={{flex: 1}}
              onPress={() => handleExportPdf()}
            />
          </View>
        </View>

        <Text style={[ms.sectionCaption, isDark && {color: colors.muted}, {marginTop: 20, marginBottom: 8}]}>
          EXPORT HISTORY
        </Text>
        {['August 2026', 'July 2026', 'June 2026'].map((m) => (
          <TouchableOpacity
            key={m}
            activeOpacity={0.7}
            onPress={() => handleExportPdf(m, activeGuestList)}
            style={[ms.historyRow, isDark && {borderBottomColor: '#27272A'}]}
          >
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
              <View style={[ms.historyIcon, isDark && {backgroundColor: '#27272A'}]}>
                <Icon name="calendar" size={15} color={colors.ink}/>
              </View>
              <Text style={[ms.bodyMd, isDark && {color: colors.ink}]}>{m}</Text>
            </View>
            <Icon name="download" size={16} color={colors.muted}/>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function PricingOverlay({
  billing = false,
  setBilling,
  onClose,
  onSelectPlan,
  onOpenCheckout,
}: {
  billing?: boolean;
  setBilling?: (b: boolean) => void;
  onClose: () => void;
  onSelectPlan: (plan: string) => void;
  onOpenCheckout: (plan: string, duration: BillingDurationMonths) => void;
}) {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isAnnual, setIsAnnual] = useState(billing);
  const [plansList, setPlansList] = useState<ClientDisplayPlan[]>(DEFAULT_DISPLAY_PLANS);

  useEffect(() => {
    let isMounted = true;
    plansService.fetchLivePlans().then((live) => {
      if (isMounted && live && live.length > 0) {
        setPlansList(live);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleBilling = (annual: boolean) => {
    setIsAnnual(annual);
    if (setBilling) setBilling(annual);
  };

  const handleChoosePlan = (p: any) => {
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

    // 3. Paid Plans -> Open Dedicated Checkout Screen (passing 12 for Annual, 1 for Monthly)
    onOpenCheckout(p.name, isAnnual ? 12 : 1);
  };

  return (
    <View style={[ms.overlayContainer, isDark && { backgroundColor: colors.canvas }, { paddingTop: insets.top }]}>
      <View style={[ms.overlayHeader, isDark && { borderBottomColor: colors.cardBorder }]}>
        <IconButton name="x" size={17} onPress={onClose} />
        <Text style={[ms.titleMd, isDark && { color: colors.ink }]}>Plans &amp; pricing</Text>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: Math.max(30, insets.bottom + 16) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Toggle track (reverted to classic Monthly / Annual 2-option switch) */}
        <View style={[ms.toggleTrack, isDark && { backgroundColor: '#27272A' }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleToggleBilling(false)}
            style={[
              ms.toggleOpt,
              !isAnnual && (isDark ? { backgroundColor: colors.primary } : ms.toggleOptActive),
            ]}
          >
            <Text
              style={[
                ms.toggleOptText,
                isDark && { color: colors.muted },
                !isAnnual && ms.toggleOptTextActive,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleToggleBilling(true)}
            style={[
              ms.toggleOpt,
              isAnnual && (isDark ? { backgroundColor: colors.primary } : ms.toggleOptActive),
            ]}
          >
            <Text
              style={[
                ms.toggleOptText,
                isDark && { color: colors.muted },
                isAnnual && ms.toggleOptTextActive,
              ]}
            >
              Annual · save 15%
            </Text>
          </TouchableOpacity>
        </View>

        {/* Plans */}
        <View style={{ gap: 14 }}>
          {plansList.map((p) => {
            const isFeatured = Boolean(p.isRecommended) || Boolean(p.tag);
            const isFree = p.priceM === 0;
            const isCustom = p.priceM === null;

            const effectiveMonthly = isCustom
              ? 0
              : isFree
              ? 0
              : isAnnual
              ? Math.round((p.priceM ?? 0) * 0.85)
              : p.priceM ?? 0;

            const priceDisplay = isCustom
              ? 'Custom'
              : isFree
              ? 'Free'
              : `₹${effectiveMonthly.toLocaleString('en-IN')}`;

            return (
              <View
                key={p.name}
                style={[
                  ms.planCard,
                  isDark && { backgroundColor: '#18181B', borderColor: '#27272A' },
                  isFeatured && (isDark ? { borderColor: colors.primary } : ms.planCardFeatured),
                ]}
              >
                {isFeatured ? (
                  <View style={ms.featuredBadge}>
                    <Text style={ms.featuredBadgeText}>{p.tag || 'Most popular'}</Text>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[ms.titleMd, isDark && { color: colors.ink }]}>{p.name}</Text>
                    {isAnnual && !isFree && !isCustom && (
                      <Text style={{ fontFamily: 'Inter', fontSize: 11.5, fontWeight: '700', color: '#059669', marginTop: 2 }}>
                        Save 15% on Annual billing
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                    <Text style={[ms.planPriceText, isDark && { color: colors.ink }]}>
                      {priceDisplay}
                      {!isFree && !isCustom ? (
                        <Text style={[ms.perMoText, isDark && { color: colors.muted }]}>/mo</Text>
                      ) : null}
                    </Text>
                    {isAnnual && !isFree && !isCustom && (
                      <Text style={{ fontFamily: 'Inter', fontSize: 11, color: colors.muted, marginTop: 1 }}>
                        ₹{Math.round((p.priceM ?? 0) * 12 * 0.85).toLocaleString('en-IN')} billed annually
                      </Text>
                    )}
                  </View>
                </View>
                <View style={{ marginTop: 10, gap: 5 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="check" size={14} color={colors.primary} />
                    <Text style={[ms.bodySm, isDark && { color: colors.ink }]}>{p.rooms}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="check" size={14} color={colors.primary} />
                    <Text style={[ms.bodySm, isDark && { color: colors.ink }]}>{p.checkins}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="check" size={14} color={colors.primary} />
                    <Text style={[ms.bodySm, isDark && { color: colors.ink }]}>
                      {p.name === 'Starter'
                        ? '10 reports & exports / mo'
                        : p.name === 'Free'
                        ? '3 reports & exports / mo'
                        : 'Unlimited reports & exports'}
                    </Text>
                  </View>
                  {p.ocr ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Icon name="check" size={14} color={colors.primary} />
                      <Text style={[ms.bodySm, isDark && { color: colors.ink }]}>AI Document OCR included</Text>
                    </View>
                  ) : null}
                  {p.cloud ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Icon name="check" size={14} color={colors.primary} />
                      <Text style={[ms.bodySm, isDark && { color: colors.ink }]}>Live Cloud sync & backup</Text>
                    </View>
                  ) : null}
                </View>
                <View style={{ marginTop: 14 }}>
                  {isFeatured ? (
                    <PrimaryButton
                      label={p.priceM === null ? 'Contact sales' : 'Choose plan'}
                      style={{ height: 44 }}
                      onPress={() => handleChoosePlan(p)}
                    />
                  ) : (
                    <SecondaryButton
                      label={p.priceM === null ? 'Contact sales' : 'Choose plan'}
                      style={{ height: 44 }}
                      onPress={() => handleChoosePlan(p)}
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
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
  card: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
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
    width: 240,
    alignSelf: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: R.full,
    padding: 3,
    flexDirection: 'row',
    marginBottom: 20,
  },
  toggleOpt: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: R.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleOptActive: {
    backgroundColor: '#222222',
  },
  toggleOptText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
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
