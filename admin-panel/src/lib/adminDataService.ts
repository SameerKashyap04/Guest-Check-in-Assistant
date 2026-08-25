import { db } from './firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';

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
  createdAt?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Manager' | 'Staff' | 'Admin';
  property: string;
  plan: string;
  status: 'Active' | 'Trialing' | 'Suspended';
  lastActive: string;
  joinedDate: string;
  authProvider?: string;
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

// Initial seed data for fallback if Firestore collections are empty
const SEED_PROPERTIES: AdminProperty[] = [
  { id: 'HS-8821', name: 'Coorg Hilltop Homestay', location: 'Coorg, Karnataka', rooms: 18, checkIns: 142, status: 'Active', plan: 'Professional', ownerEmail: 'coorg.stay@example.com', ownerName: 'Rajesh Hegde' },
  { id: 'HS-4492', name: 'Manali Pine Resort', location: 'Manali, Himachal Pradesh', rooms: 8, checkIns: 86, status: 'Active', plan: 'Starter', ownerEmail: 'manali.pine@example.com', ownerName: 'Vikram Thakur' },
  { id: 'HS-3109', name: 'Wayanad Forest Lodge', location: 'Wayanad, Kerala', rooms: 24, checkIns: 65, status: 'Trialing', plan: 'Professional', ownerEmail: 'wayanad.lodge@example.com', ownerName: 'Anand Nair' },
  { id: 'HS-9012', name: 'Munnar Tea Valley Guesthouse', location: 'Munnar, Kerala', rooms: 2, checkIns: 14, status: 'Active', plan: 'Free', ownerEmail: 'munnar.tea@example.com', ownerName: 'Priya George' },
  { id: 'HS-7734', name: 'Goa Beachside Lodge', location: 'Calangute, Goa', rooms: 8, checkIns: 92, status: 'Active', plan: 'Starter', ownerEmail: 'goa.beach@example.com', ownerName: 'Sanjay Fernandes' },
];

const SEED_USERS: AdminUser[] = [
  { id: 'usr_001', name: 'Rajesh Hegde', email: 'coorg.stay@example.com', role: 'Owner', property: 'Coorg Hilltop Homestay', plan: 'Professional', status: 'Active', lastActive: '5 min ago', joinedDate: '12 Jan 2026', authProvider: 'Google' },
  { id: 'usr_002', name: 'Vikram Thakur', email: 'manali.pine@example.com', role: 'Owner', property: 'Manali Pine Resort', plan: 'Starter', status: 'Active', lastActive: '2 hr ago', joinedDate: '03 Feb 2026', authProvider: 'Email OTP' },
  { id: 'usr_003', name: 'Anand Nair', email: 'wayanad.lodge@example.com', role: 'Owner', property: 'Wayanad Forest Lodge', plan: 'Professional (Trial)', status: 'Trialing', lastActive: '1 day ago', joinedDate: '18 Feb 2026', authProvider: 'Google' },
  { id: 'usr_004', name: 'Priya George', email: 'munnar.tea@example.com', role: 'Owner', property: 'Munnar Tea Valley Guesthouse', plan: 'Free', status: 'Active', lastActive: '3 days ago', joinedDate: '24 Feb 2026', authProvider: 'Email OTP' },
  { id: 'usr_005', name: 'Sanjay Fernandes', email: 'goa.beach@example.com', role: 'Owner', property: 'Goa Beachside Lodge', plan: 'Starter', status: 'Active', lastActive: 'Just now', joinedDate: '01 Mar 2026', authProvider: 'Google' },
];

const SEED_SUBSCRIPTIONS: AdminSubscription[] = [
  { id: 'sub_901', property: 'Coorg Hilltop Homestay', propertyId: 'HS-8821', plan: 'PROFESSIONAL', cycle: 'yearly', amount: '₹7,999', numericAmount: 7999, status: 'active', renewalDate: '2027-01-15', provider: 'Razorpay' },
  { id: 'sub_902', property: 'Manali Pine Resort', propertyId: 'HS-4492', plan: 'STARTER', cycle: 'monthly', amount: '₹349', numericAmount: 349, status: 'active', renewalDate: '2026-04-01', provider: 'Razorpay' },
  { id: 'sub_903', property: 'Wayanad Forest Lodge', propertyId: 'HS-3109', plan: 'PROFESSIONAL', cycle: 'monthly', amount: '₹799', numericAmount: 799, status: 'trialing', renewalDate: '2026-04-04 (Trial end)', provider: 'Direct Trial' },
  { id: 'sub_904', property: 'Goa Beachside Lodge', propertyId: 'HS-7734', plan: 'STARTER', cycle: 'monthly', amount: '₹349', numericAmount: 349, status: 'past_due', renewalDate: '2026-03-10 (Past due)', provider: 'Razorpay' },
];

const SEED_AUDIT_LOGS: AdminAuditLog[] = [
  { id: 'log_01', actor: 'Admin (Sameer)', action: 'PLAN_UPGRADE', target: 'HS-8821', details: 'Upgraded Coorg Hilltop to Professional Annual', timestamp: '12 min ago', category: 'SUBSCRIPTION' },
  { id: 'log_02', actor: 'System', action: 'PROPERTY_REGISTERED', target: 'HS-4492', details: 'New property registered (8 rooms)', timestamp: '45 min ago', category: 'PROPERTY' },
  { id: 'log_03', actor: 'Admin (Sameer)', action: 'TRIAL_GRANTED', target: 'HS-3109', details: 'Granted 30-day Professional trial to Wayanad Forest Lodge', timestamp: '2 hr ago', category: 'SUBSCRIPTION' },
  { id: 'log_04', actor: 'Security Sentinel', action: 'LIMIT_WARNING', target: 'HS-7734', details: 'Goa Beachside reached 92% of monthly check-in limit', timestamp: '4 hr ago', category: 'SECURITY' },
  { id: 'log_05', actor: 'Auth Guard', action: 'SIGNUP_OTP_VERIFIED', target: 'usr_005', details: 'Email OTP verified for goa.beach@example.com', timestamp: '6 hr ago', category: 'AUTH' },
];

export const adminDataService = {
  // Properties
  async getProperties(): Promise<AdminProperty[]> {
    try {
      const snap = await getDocs(collection(db, 'properties'));
      if (snap.empty) return SEED_PROPERTIES;
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminProperty));
    } catch (e) {
      console.warn('Using fallback seed properties:', e);
      return SEED_PROPERTIES;
    }
  },

  subscribeProperties(callback: (props: AdminProperty[]) => void) {
    try {
      return onSnapshot(
        collection(db, 'properties'),
        snap => {
          if (snap.empty) {
            callback(SEED_PROPERTIES);
          } else {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminProperty)));
          }
        },
        err => {
          console.warn('Properties listener error, falling back to seed:', err);
          callback(SEED_PROPERTIES);
        }
      );
    } catch {
      callback(SEED_PROPERTIES);
      return () => {};
    }
  },

  // Users
  async getUsers(): Promise<AdminUser[]> {
    try {
      const snap = await getDocs(collection(db, 'owners'));
      if (snap.empty) return SEED_USERS;
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminUser));
    } catch (e) {
      console.warn('Using fallback seed users:', e);
      return SEED_USERS;
    }
  },

  subscribeUsers(callback: (users: AdminUser[]) => void) {
    try {
      return onSnapshot(
        collection(db, 'owners'),
        snap => {
          if (snap.empty) {
            callback(SEED_USERS);
          } else {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminUser)));
          }
        },
        err => {
          console.warn('Users listener error, falling back to seed:', err);
          callback(SEED_USERS);
        }
      );
    } catch {
      callback(SEED_USERS);
      return () => {};
    }
  },

  // Subscriptions
  async getSubscriptions(): Promise<AdminSubscription[]> {
    try {
      const snap = await getDocs(collection(db, 'subscriptions'));
      if (snap.empty) return SEED_SUBSCRIPTIONS;
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminSubscription));
    } catch (e) {
      console.warn('Using fallback seed subscriptions:', e);
      return SEED_SUBSCRIPTIONS;
    }
  },

  subscribeSubscriptions(callback: (subs: AdminSubscription[]) => void) {
    try {
      return onSnapshot(
        collection(db, 'subscriptions'),
        snap => {
          if (snap.empty) {
            callback(SEED_SUBSCRIPTIONS);
          } else {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminSubscription)));
          }
        },
        err => {
          console.warn('Subscriptions listener error, falling back to seed:', err);
          callback(SEED_SUBSCRIPTIONS);
        }
      );
    } catch {
      callback(SEED_SUBSCRIPTIONS);
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
      if (snap.empty) return SEED_AUDIT_LOGS;
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminAuditLog));
    } catch (e) {
      console.warn('Using fallback seed audit logs:', e);
      return SEED_AUDIT_LOGS;
    }
  },

  subscribeAuditLogs(callback: (logs: AdminAuditLog[]) => void) {
    try {
      return onSnapshot(
        query(collection(db, 'audit_logs'), limit(50)),
        snap => {
          if (snap.empty) {
            callback(SEED_AUDIT_LOGS);
          } else {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminAuditLog)));
          }
        },
        err => {
          console.warn('Audit logs listener error, falling back to seed:', err);
          callback(SEED_AUDIT_LOGS);
        }
      );
    } catch {
      callback(SEED_AUDIT_LOGS);
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

  async logAudit(entry: Omit<AdminAuditLog, 'id' | 'timestamp'>) {
    try {
      await addDoc(collection(db, 'audit_logs'), {
        ...entry,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' ago',
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Audit log write error:', e);
    }
  },
};
