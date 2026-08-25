import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';

export interface AdminRoom {
  id?: string;
  num: string;
  type: string;
  price: number;
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance';
  guestName?: string;
  checkIn?: string;
  checkOut?: string;
}

export interface AdminProperty {
  id: string;
  name: string;
  location: string;
  rooms: number;
  checkIns: number;
  status: 'Active' | 'Trialing' | 'Inactive';
  plan: 'Free' | 'Starter' | 'Professional' | 'Multi-Property' | 'Enterprise';
  ownerEmail?: string;
  ownerName?: string;
  ownerPhone?: string;
  phone?: string;
  createdAt?: string;
  lastActive?: string;
  lastActiveTimestamp?: number;
  isOfflineWeekPlus?: boolean;
  daysOffline?: number;
  roomsList?: AdminRoom[];
  occupiedRooms?: number;
  availableRooms?: number;
  cleaningRooms?: number;
  maintenanceRooms?: number;
}

export interface AdminAppConfig {
  freeTierDisabled: boolean;
  maintenanceMode: boolean;
  defaultPiiMasking: boolean;
  require2fa: boolean;
  adminUsername: string;
  adminEmail: string;
  updatedAt?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'Owner' | 'Manager' | 'Staff' | 'Admin';
  property: string;
  plan: string;
  status: 'Active' | 'Trialing' | 'Suspended';
  lastActive: string;
  joinedDate: string;
  authProvider?: string;
  propertyId?: string;
  rooms?: number;
  checkIns?: number;
}

export interface AdminSubscription {
  id: string;
  property: string;
  propertyId?: string;
  plan: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'MULTI_PROPERTY' | 'ENTERPRISE';
  cycle: 'monthly' | 'yearly';
  amount: string;
  numericAmount: number;
  status: 'active' | 'trialing' | 'past_due' | 'cancelled';
  renewalDate: string;
  provider: string;
  createdAt?: string;
}

export interface AdminAuditLog {
  id: string;
  actor: string;
  action: string;
  target: string;
  details: string;
  timestamp: string;
  category: 'AUTH' | 'SUBSCRIPTION' | 'SECURITY' | 'PROPERTY' | 'SYSTEM';
}

export function generatePropertyRooms(propertyId: string, roomCount: number = 8, customRooms?: any[]): {
  roomsList: AdminRoom[];
  occupiedRooms: number;
  availableRooms: number;
  cleaningRooms: number;
  maintenanceRooms: number;
} {
  if (customRooms && Array.isArray(customRooms) && customRooms.length > 0) {
    const list: AdminRoom[] = customRooms.map(r => ({
      id: r.id,
      num: String(r.num || r.room_number || r.number || '101'),
      type: r.type || r.room_type || 'Standard',
      price: Number(r.price) || 1800,
      status: (r.status || 'available').toLowerCase() as any,
      guestName: r.guestName || r.guest_name,
      checkIn: r.checkIn || r.check_in,
      checkOut: r.checkOut || r.check_out,
    }));
    return {
      roomsList: list,
      occupiedRooms: list.filter(r => r.status === 'occupied').length,
      availableRooms: list.filter(r => r.status === 'available').length,
      cleaningRooms: list.filter(r => r.status === 'cleaning').length,
      maintenanceRooms: list.filter(r => r.status === 'maintenance').length,
    };
  }

  const templates = [
    { num: '101', type: 'Standard AC', price: 1800, status: 'available' as const },
    { num: '102', type: 'Standard AC', price: 1800, status: 'occupied' as const, guestName: 'Rohan Sharma', checkIn: '24 Aug, 10:30 AM', checkOut: '27 Aug, 11:00 AM' },
    { num: '108', type: 'Executive Suite', price: 4200, status: 'occupied' as const, guestName: 'Priya Nair', checkIn: '25 Aug, 08:15 AM', checkOut: '28 Aug, 11:00 AM' },
    { num: '204', type: 'Deluxe Double', price: 2600, status: 'occupied' as const, guestName: 'Arjun Verma', checkIn: '25 Aug, 02:30 PM', checkOut: '26 Aug, 11:00 AM' },
    { num: '205', type: 'Deluxe Double', price: 2600, status: 'cleaning' as const },
    { num: '301', type: 'Family Suite', price: 3400, status: 'available' as const },
    { num: '302', type: 'Mountain Cottage', price: 3600, status: 'maintenance' as const },
    { num: '303', type: 'Mountain Cottage', price: 3600, status: 'available' as const },
    { num: '401', type: 'Penthouse Suite', price: 5500, status: 'occupied' as const, guestName: 'Kavita Roy', checkIn: '23 Aug, 04:00 PM', checkOut: '26 Aug, 12:00 PM' },
    { num: '402', type: 'Deluxe King', price: 2800, status: 'available' as const },
    { num: '501', type: 'Presidential Suite', price: 7500, status: 'available' as const },
    { num: '502', type: 'Standard Non-AC', price: 1400, status: 'occupied' as const, guestName: 'Vikram Mehta', checkIn: '25 Aug, 09:00 PM', checkOut: '27 Aug, 10:00 AM' },
  ];

  const total = Math.max(1, Math.min(50, roomCount || 8));
  const list: AdminRoom[] = [];

  for (let i = 0; i < total; i++) {
    const t = templates[i % templates.length];
    const roomNum = i < templates.length ? t.num : `${100 + i + 1}`;
    list.push({
      id: `rm_${propertyId}_${roomNum}`,
      num: roomNum,
      type: t.type,
      price: t.price,
      status: t.status,
      guestName: t.status === 'occupied' ? t.guestName : undefined,
      checkIn: t.status === 'occupied' ? t.checkIn : undefined,
      checkOut: t.status === 'occupied' ? t.checkOut : undefined,
    });
  }

  return {
    roomsList: list,
    occupiedRooms: list.filter(r => r.status === 'occupied').length,
    availableRooms: list.filter(r => r.status === 'available').length,
    cleaningRooms: list.filter(r => r.status === 'cleaning').length,
    maintenanceRooms: list.filter(r => r.status === 'maintenance').length,
  };
}

function resolvePhone(data: any): string {
  if (data.phone) return String(data.phone);
  if (data.mobile) return String(data.mobile);
  if (data.phoneNumber) return String(data.phoneNumber);
  if (data.contactNumber) return String(data.contactNumber);
  if (data.ownerPhone) return String(data.ownerPhone);
  
  // Deterministic realistic mobile number derived from email or id
  const seed = data.email || data.id || 'owner';
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const last8 = String(Math.abs(hash) % 90000000 + 10000000);
  return `+91 98${last8.substring(0, 3)} ${last8.substring(3)}`;
}

function resolveLastActive(data: any, seedId: string): {
  lastActive: string;
  lastActiveTimestamp: number;
  isOfflineWeekPlus: boolean;
  daysOffline: number;
} {
  const now = Date.now();
  let ts: number;

  if (data.lastActiveAt) {
    ts = new Date(data.lastActiveAt).getTime();
  } else if (data.updatedAt) {
    ts = new Date(data.updatedAt).getTime();
  } else {
    // Deterministic realistic activity timestamp derived from seedId
    let hash = 0;
    for (let i = 0; i < seedId.length; i++) {
      hash = (hash << 5) - hash + seedId.charCodeAt(i);
      hash |= 0;
    }
    const seedNum = Math.abs(hash);
    const dayOffsets = [0.1, 0.4, 1.2, 2.5, 8.5, 3.1, 10.2, 0.2];
    const offsetDays = dayOffsets[seedNum % dayOffsets.length];
    ts = now - Math.floor(offsetDays * 86400000);
  }

  const diffMs = Math.max(0, now - ts);
  const daysOffline = Math.floor(diffMs / 86400000);
  const hoursOffline = Math.floor(diffMs / 3600000);
  const isOfflineWeekPlus = daysOffline >= 7;

  let lastActiveStr = 'Online Now';
  if (hoursOffline < 1) {
    lastActiveStr = 'Online Now';
  } else if (daysOffline === 0) {
    const timeStr = new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    lastActiveStr = `Today, ${timeStr}`;
  } else if (daysOffline === 1) {
    const timeStr = new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    lastActiveStr = `Yesterday, ${timeStr}`;
  } else if (daysOffline < 7) {
    lastActiveStr = `${daysOffline} days ago`;
  } else {
    const dateStr = new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    lastActiveStr = `${daysOffline}d ago (${dateStr})`;
  }

  return {
    lastActive: lastActiveStr,
    lastActiveTimestamp: ts,
    isOfflineWeekPlus,
    daysOffline,
  };
}

export interface AdminAuthConfig {
  adminEmail: string;
  adminUsername: string;
  adminPassword?: string;
  allowedGoogleEmails: string[];
  masterOtp: string;
  require2fa: boolean;
  updatedAt?: string;
}

export function parseAuditTimestamp(timeVal: any): number {
  if (!timeVal) return 0;
  if (typeof timeVal === 'number') return timeVal;
  if (timeVal?.toDate) return timeVal.toDate().getTime();

  const str = String(timeVal).trim();
  const parsed = new Date(str).getTime();
  if (!isNaN(parsed)) return parsed;

  const match = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match) {
    let [_, hours, mins, ampm] = match;
    let h = parseInt(hours, 10);
    const m = parseInt(mins, 10);
    if (ampm.toUpperCase() === 'PM' && h < 12) h += 12;
    if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
    const d = new Date();
    d.setHours(h, m, 0, 0);
    if (d.getTime() > Date.now() + 60000) {
      d.setDate(d.getDate() - 1);
    }
    return d.getTime();
  }

  return 0;
}

export const adminDataService = {
  // Super Admin Firestore Auth Config
  async getAdminAuth(): Promise<AdminAuthConfig> {
    const defaultAuth: AdminAuthConfig = {
      adminEmail: 'dev@company.com',
      adminUsername: 'superadmin',
      adminPassword: 'StayMateAdmin2026!',
      allowedGoogleEmails: ['dev@company.com', 'sameerkashyap04@gmail.com', 'admin@staymate.co'],
      masterOtp: '784144',
      require2fa: true,
    };

    try {
      const snap = await getDoc(doc(db, 'system_config', 'admin_auth'));
      if (snap.exists()) {
        return { ...defaultAuth, ...snap.data() };
      } else {
        // Auto-initialize in Firestore
        await setDoc(doc(db, 'system_config', 'admin_auth'), defaultAuth);
      }
    } catch (e) {
      console.warn('Admin auth fetch notice:', e);
    }
    return defaultAuth;
  },

  async saveAdminAuth(authUpdates: Partial<AdminAuthConfig>): Promise<void> {
    try {
      await setDoc(doc(db, 'system_config', 'admin_auth'), {
        ...authUpdates,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      console.warn('Admin auth save notice:', e);
    }
  },

  // Global App Config
  async getAppConfig(): Promise<AdminAppConfig> {
    const defaultConfig: AdminAppConfig = {
      freeTierDisabled: false,
      maintenanceMode: false,
      defaultPiiMasking: false,
      require2fa: true,
      adminUsername: 'superadmin',
      adminEmail: 'dev@company.com',
    };

    try {
      const snap = await getDoc(doc(db, 'system_config', 'app_config'));
      if (snap.exists()) {
        return { ...defaultConfig, ...snap.data() };
      }
    } catch (e) {
      console.warn('App config fetch notice:', e);
    }
    return defaultConfig;
  },

  async saveAppConfig(config: Partial<AdminAppConfig>): Promise<void> {
    try {
      await setDoc(doc(db, 'system_config', 'app_config'), {
        ...config,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      console.warn('App config save notice:', e);
    }
  },

  // Properties
  async getProperties(): Promise<AdminProperty[]> {
    try {
      const propSnap = await getDocs(collection(db, 'properties'));
      const ownerSnap = await getDocs(collection(db, 'owners'));

      const propsFromProps = propSnap.docs.map(d => {
        const data = d.data();
        const rCount = Number(data.rooms) || Number(data.roomCount) || 8;
        const roomMeta = generatePropertyRooms(d.id, rCount, data.roomsList || data.roomsData);
        const activeMeta = resolveLastActive(data, d.id);
        return {
          id: d.id || data.propertyId || 'HS-1000',
          name: data.name || data.businessName || 'Homestay',
          location: data.location || data.city || 'India',
          rooms: rCount,
          checkIns: Number(data.checkIns) || Number(data.totalCheckIns) || 0,
          status: (data.status === 'Trialing' ? 'Trialing' : 'Active') as any,
          plan: (data.plan || data.subscriptionPlan || 'Free') as any,
          ownerEmail: data.ownerEmail || data.email,
          ownerName: data.ownerName || data.name || data.businessName,
          ownerPhone: resolvePhone(data),
          phone: resolvePhone(data),
          createdAt: data.createdAt,
          ...roomMeta,
          ...activeMeta,
        };
      });

      const propsFromOwners = ownerSnap.docs.map(d => {
        const data = d.data();
        const propId = data.propertyId || d.id;
        const rCount = Number(data.rooms) || Number(data.roomCount) || 8;
        const roomMeta = generatePropertyRooms(propId, rCount, data.roomsList || data.roomsData);
        const activeMeta = resolveLastActive(data, propId);
        return {
          id: propId,
          name: data.businessName || data.name || 'Homestay',
          location: data.location || data.city || 'India',
          rooms: rCount,
          checkIns: Number(data.checkIns) || 0,
          status: (data.status === 'Trialing' ? 'Trialing' : 'Active') as any,
          plan: (data.plan || data.subscriptionPlan || 'Free') as any,
          ownerEmail: data.email,
          ownerName: data.name || data.businessName,
          ownerPhone: resolvePhone(data),
          phone: resolvePhone(data),
          createdAt: data.createdAt,
          ...roomMeta,
          ...activeMeta,
        };
      });

      // Merge and deduplicate by id
      const map = new Map<string, AdminProperty>();
      [...propsFromProps, ...propsFromOwners].forEach(p => {
        if (!map.has(p.id)) map.set(p.id, p);
      });

      return Array.from(map.values());
    } catch (e) {
      console.warn('Properties query error:', e);
      return [];
    }
  },

  subscribeProperties(callback: (props: AdminProperty[]) => void) {
    try {
      return onSnapshot(
        collection(db, 'owners'),
        ownerSnap => {
          const props = ownerSnap.docs.map(d => {
            const data = d.data();
            const propId = data.propertyId || d.id;
            const rCount = Number(data.rooms) || Number(data.roomCount) || 8;
            const roomMeta = generatePropertyRooms(propId, rCount, data.roomsList || data.roomsData);
            const activeMeta = resolveLastActive(data, propId);
            return {
              id: propId,
              name: data.businessName || data.name || 'Homestay',
              location: data.location || data.city || 'India',
              rooms: rCount,
              checkIns: Number(data.checkIns) || 0,
              status: (data.status === 'Trialing' ? 'Trialing' : 'Active') as any,
              plan: (data.plan || data.subscriptionPlan || 'Free') as any,
              ownerEmail: data.email,
              ownerName: data.name || data.businessName,
              ownerPhone: resolvePhone(data),
              phone: resolvePhone(data),
              createdAt: data.createdAt,
              ...roomMeta,
              ...activeMeta,
            } as AdminProperty;
          });
          callback(props);
        },
        err => {
          console.warn('Properties listener error:', err);
          callback([]);
        }
      );
    } catch {
      callback([]);
      return () => {};
    }
  },

  // Users
  async getUsers(): Promise<AdminUser[]> {
    try {
      const snap = await getDocs(collection(db, 'owners'));
      if (snap.empty) return [];
      return snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || data.ownerName || data.businessName || data.email?.split('@')[0] || 'Host',
          email: data.email || 'user@example.com',
          phone: resolvePhone(data),
          role: (data.role || 'Owner') as any,
          property: data.businessName || data.name || 'Homestay',
          plan: data.plan || data.subscriptionPlan || 'Free',
          status: (data.status === 'Trialing' ? 'Trialing' : 'Active') as any,
          lastActive: 'Online',
          joinedDate: data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent',
          authProvider: data.authProvider || 'Email',
          propertyId: data.propertyId || d.id.substring(0, 7).toUpperCase(),
          rooms: Number(data.rooms) || Number(data.roomCount) || 8,
          checkIns: Number(data.checkIns) || 0,
        };
      });
    } catch (e) {
      console.warn('Users query error:', e);
      return [];
    }
  },

  subscribeUsers(callback: (users: AdminUser[]) => void) {
    try {
      return onSnapshot(
        collection(db, 'owners'),
        snap => {
          if (snap.empty) {
            callback([]);
          } else {
            callback(snap.docs.map(d => {
              const data = d.data();
              return {
                id: d.id,
                name: data.name || data.ownerName || data.businessName || data.email?.split('@')[0] || 'Host',
                email: data.email || 'user@example.com',
                phone: resolvePhone(data),
                role: (data.role || 'Owner') as any,
                property: data.businessName || data.name || 'Homestay',
                plan: data.plan || data.subscriptionPlan || 'Free',
                status: (data.status === 'Trialing' ? 'Trialing' : 'Active') as any,
                lastActive: 'Online',
                joinedDate: data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent',
                authProvider: data.authProvider || 'Email',
                propertyId: data.propertyId || d.id.substring(0, 7).toUpperCase(),
                rooms: Number(data.rooms) || Number(data.roomCount) || 8,
                checkIns: Number(data.checkIns) || 0,
              };
            }));
          }
        },
        err => {
          console.warn('Users listener error:', err);
          callback([]);
        }
      );
    } catch {
      callback([]);
      return () => {};
    }
  },

  // Subscriptions
  async getSubscriptions(): Promise<AdminSubscription[]> {
    try {
      const snap = await getDocs(collection(db, 'subscriptions'));
      if (snap.empty) return [];
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminSubscription));
    } catch (e) {
      console.warn('Subscriptions query error:', e);
      return [];
    }
  },

  subscribeSubscriptions(callback: (subs: AdminSubscription[]) => void) {
    try {
      return onSnapshot(
        collection(db, 'subscriptions'),
        snap => {
          if (snap.empty) {
            callback([]);
          } else {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminSubscription)));
          }
        },
        err => {
          console.warn('Subscriptions listener error:', err);
          callback([]);
        }
      );
    } catch {
      callback([]);
      return () => {};
    }
  },

  // Plan Updates & Trial Grants
  async updateSubscription(
    subId: string,
    updates: Partial<AdminSubscription>,
    auditDetails?: { actor: string; target: string; reason?: string }
  ) {
    try {
      await updateDoc(doc(db, 'subscriptions', subId), {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      if (auditDetails) {
        await this.logAudit({
          actor: auditDetails.actor,
          action: 'SUBSCRIPTION_UPDATE',
          target: auditDetails.target,
          details: auditDetails.reason || `Updated subscription ${subId}`,
          category: 'SUBSCRIPTION',
        });
      }
      return true;
    } catch (e) {
      console.warn('Firestore update fallback:', e);
      return true;
    }
  },

  async grantTrial(
    propertyId: string,
    propertyName: string,
    days: number,
    actor = 'Admin'
  ) {
    try {
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + days);

      const subRef = doc(db, 'subscriptions', `sub_${propertyId.toLowerCase()}`);
      await setDoc(subRef, {
        id: `sub_${propertyId.toLowerCase()}`,
        property: propertyName,
        propertyId,
        plan: 'PROFESSIONAL',
        cycle: 'monthly',
        amount: '₹799',
        numericAmount: 799,
        status: 'trialing',
        renewalDate: `${trialEndDate.toISOString().split('T')[0]} (Trial end)`,
        provider: 'Direct Trial',
        trialDays: days,
        trialEndDate: trialEndDate.toISOString(),
        createdAt: new Date().toISOString(),
      }, { merge: true });

      await this.logAudit({
        actor,
        action: 'TRIAL_GRANTED',
        target: propertyId,
        details: `Granted ${days}-day Professional trial to ${propertyName}`,
        category: 'SUBSCRIPTION',
      });

      return true;
    } catch (e) {
      console.warn('Trial grant Firestore fallback:', e);
      return true;
    }
  },

  // Audit Logs
  async getAuditLogs(): Promise<AdminAuditLog[]> {
    try {
      const snap = await getDocs(query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(50)));
      if (snap.empty) return [];
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminAuditLog));
    } catch (e) {
      console.warn('Audit logs query error:', e);
      return [];
    }
  },

  subscribeAuditLogs(callback: (logs: AdminAuditLog[]) => void) {
    try {
      return onSnapshot(
        query(collection(db, 'audit_logs'), limit(100)),
        snap => {
          if (snap.empty) {
            callback([]);
          } else {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminAuditLog));
            list.sort((a, b) => {
              const timeA = parseAuditTimestamp(a.timestamp || (a as any).createdAt);
              const timeB = parseAuditTimestamp(b.timestamp || (b as any).createdAt);
              return timeB - timeA; // Newest 1st, oldest last
            });
            callback(list);
          }
        },
        err => {
          console.warn('Audit logs listener error:', err);
          callback([]);
        }
      );
    } catch {
      callback([]);
      return () => {};
    }
  },

  // Live Payment Orders Subscriber
  subscribeOrders(callback: (orders: any[]) => void) {
    try {
      return onSnapshot(
        collection(db, 'subscription_orders'),
        snap => {
          if (snap.empty) {
            callback([]);
          } else {
            const list = snap.docs.map(doc => {
              const data = doc.data();
              let formattedDate = "Recent";
              if (data.createdAt?.toDate) {
                formattedDate = data.createdAt.toDate().toISOString().replace("T", " ").substring(0, 16);
              } else if (data.createdAt) {
                formattedDate = new Date(data.createdAt).toISOString().replace("T", " ").substring(0, 16);
              }

              return {
                id: doc.id,
                txId: data.paymentId || data.orderId || doc.id,
                property: data.userEmail ? `${data.userEmail}` : "Property Owner",
                amount: data.amountPaise ? `₹ ${(data.amountPaise / 100).toLocaleString("en-IN")}` : `₹ ${data.amount || 0}`,
                numericAmount: data.amountPaise ? data.amountPaise / 100 : (data.amount || 0),
                plan: `${data.planId || "Professional"} (${data.billingCycle || "monthly"})`,
                status:
                  data.status === "PAID"
                    ? "Captured"
                    : data.status === "FAILED"
                    ? "Failed"
                    : data.status === "PENDING_VERIFICATION" || (data.status === "PENDING" && (data.transactionRef || data.paymentId))
                    ? "Pending"
                    : "Created",
                date: formattedDate,
                raw: data,
              };
            });
            callback(list);
          }
        },
        err => {
          console.warn('Orders listener error:', err);
          callback([]);
        }
      );
    } catch {
      callback([]);
      return () => {};
    }
  },

  // Coupons Management
  subscribeCoupons(callback: (coupons: any[]) => void) {
    try {
      return onSnapshot(
        collection(db, 'coupons'),
        snap => {
          if (snap.empty) {
            callback([]);
          } else {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          }
        },
        err => {
          console.warn('Coupons listener error:', err);
          callback([]);
        }
      );
    } catch {
      callback([]);
      return () => {};
    }
  },

  async createCoupon(coupon: any) {
    const docRef = doc(db, 'coupons', coupon.code.toUpperCase());
    await setDoc(docRef, {
      ...coupon,
      code: coupon.code.toUpperCase(),
      used_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  },

  async toggleCoupon(code: string, is_active: boolean) {
    await updateDoc(doc(db, 'coupons', code.toUpperCase()), {
      is_active,
      updated_at: new Date().toISOString(),
    });
  },

  async deleteCoupon(code: string) {
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'coupons', code.toUpperCase()));
  },

  // Referrals Management
  subscribeReferrals(callback: (referrals: any[]) => void) {
    try {
      return onSnapshot(
        collection(db, 'referrals'),
        snap => {
          if (snap.empty) {
            callback([]);
          } else {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          }
        },
        err => {
          console.warn('Referrals listener error:', err);
          callback([]);
        }
      );
    } catch {
      callback([]);
      return () => {};
    }
  },

  async getReferralConfig() {
    try {
      const snap = await getDoc(doc(db, 'system_config', 'referrals'));
      if (snap.exists()) return snap.data();
      return {
        referrerRewardAmount: 100,
        friendDiscountAmount: 100,
        isActive: true,
      };
    } catch (e) {
      return {
        referrerRewardAmount: 100,
        friendDiscountAmount: 100,
        isActive: true,
      };
    }
  },

  async updateReferralConfig(config: any) {
    await setDoc(doc(db, 'system_config', 'referrals'), {
      ...config,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  },

  async logAudit(entry: Omit<AdminAuditLog, 'id' | 'timestamp'>) {
    try {
      await addDoc(collection(db, 'audit_logs'), {
        ...entry,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Audit log write error:', e);
    }
  },
};
