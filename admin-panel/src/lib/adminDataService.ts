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

export const adminDataService = {
  // Properties
  async getProperties(): Promise<AdminProperty[]> {
    try {
      const snap = await getDocs(collection(db, 'properties'));
      if (snap.empty) return [];
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminProperty));
    } catch (e) {
      console.warn('Properties query error:', e);
      return [];
    }
  },

  subscribeProperties(callback: (props: AdminProperty[]) => void) {
    try {
      return onSnapshot(
        collection(db, 'properties'),
        snap => {
          if (snap.empty) {
            callback([]);
          } else {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminProperty)));
          }
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
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminUser));
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
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminUser)));
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
        query(collection(db, 'audit_logs'), limit(50)),
        snap => {
          if (snap.empty) {
            callback([]);
          } else {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminAuditLog)));
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
