import { openDatabase } from './index';
import { getLimit } from '@/services/entitlementService';
import { useSubscriptionStore } from '@/store/useSubscriptionStore';

export interface GuestData {
  full_name: string;
  id_number: string;
  address: string;
  phone: string;
  photo_uri: string;
  back_photo_uri?: string;
  selfie_uri?: string;
  property_id?: string;
  id_type: string;
  dob: string;
  gender: string;
  pin_code: string;
}

export interface StayData {
  room_id: number;
  check_in_date: string;
  check_out_date: string;
}

export async function createMultipleGuestsAndStay(guestsData: GuestData[], stayData: StayData): Promise<void> {
  if (!guestsData || guestsData.length === 0) {
    throw new Error('At least one guest is required for check-in.');
  }

  // Strict check-in limit enforcement
  const checkInLimit = getLimit('monthlyCheckInLimit');
  if (checkInLimit !== -1) {
    const currentCheckIns = useSubscriptionStore.getState().usage.checkInCount;
    if (currentCheckIns >= checkInLimit) {
      throw new Error(`Monthly check-in limit reached (${checkInLimit} check-ins on current plan). Please upgrade your subscription.`);
    }
  }

  try {
    const db = await openDatabase();
    
    // Start a transaction for data integrity
    await db.execAsync('BEGIN TRANSACTION;');
    
    try {
      for (const guestData of guestsData) {
        // 1. Insert Guest
        const guestResult = await db.runAsync(
          `INSERT INTO guests (full_name, id_number, address, phone, photo_uri, back_photo_uri, selfie_uri, property_id, id_type, dob, gender, pin_code) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            guestData.full_name, 
            guestData.id_number, 
            guestData.address, 
            guestData.phone, 
            guestData.photo_uri, 
            guestData.back_photo_uri || '',
            guestData.selfie_uri || '',
            guestData.property_id || '',
            guestData.id_type, 
            guestData.dob, 
            guestData.gender, 
            guestData.pin_code
          ]
        );
        
        const guestId = guestResult.lastInsertRowId;
        
        // 2. Insert Stay record linking guest to room
        await db.runAsync(
          `INSERT INTO stays (guest_id, room_id, check_in_date, check_out_date, number_of_guests, status) 
           VALUES (?, ?, ?, ?, ?, 'active')`,
          [
            guestId,
            stayData.room_id,
            stayData.check_in_date,
            stayData.check_out_date,
            guestsData.length
          ]
        );
      }
      
      // 3. Update Room Status to occupied
      await db.runAsync(
        `UPDATE rooms SET status = 'occupied' WHERE id = ?`,
        [stayData.room_id]
      );
      
      // Commit transaction
      await db.execAsync('COMMIT;');

      // Increment check-in counter on successful commit
      useSubscriptionStore.getState().incrementCheckIn();
    } catch (error) {
      await db.execAsync('ROLLBACK;').catch(() => {});
      console.warn('SQLite transaction rollback:', error);
    }
  } catch (dbError) {
    console.warn('Local SQLite database not available (running in web browser mode):', dbError);
  }
}

export async function createGuestAndStay(guestData: GuestData, stayData: StayData): Promise<void> {
  return createMultipleGuestsAndStay([guestData], stayData);
}

import { useSettingsStore } from '@/store/useSettingsStore';

export async function getGuestsForRoom(roomId: number, propertyId?: string): Promise<any[]> {
  try {
    const activePropertyId = propertyId || useSettingsStore.getState().propertyId || 'HS-DEFAULT';
    const db = await openDatabase();
    const result = await db.getAllAsync(
      `SELECT g.*, s.check_in_date, s.check_out_date, s.created_at as stay_created_at 
       FROM guests g
       JOIN stays s ON s.guest_id = g.id
       WHERE s.room_id = ? 
         AND (s.status IS NULL OR s.status = 'active')
         AND g.property_id = ?
       ORDER BY g.id DESC`,
      [roomId, activePropertyId]
    );
    return result as any[];
  } catch (e) {
    console.error('Failed to fetch guests for room', e);
    return [];
  }
}

export async function checkoutGuestOrRemoveFromRoom(guestId: number, roomId: number): Promise<void> {
  try {
    const db = await openDatabase();
    await db.execAsync('BEGIN TRANSACTION;');

    try {
      // 1. Mark active stay records as completed and stamp today's check_out_date (preserves guest details)
      const checkoutDateStr = new Date().toISOString().split('T')[0];
      await db.runAsync(
        `UPDATE stays SET status = 'completed', check_out_date = ? WHERE guest_id = ? AND room_id = ? AND (status IS NULL OR status = 'active')`, 
        [checkoutDateStr, guestId, roomId]
      );

      // 2. Check remaining active guests in this room
      const remaining: any = await db.getFirstAsync(
        `SELECT COUNT(*) as count FROM stays WHERE room_id = ? AND (status IS NULL OR status = 'active')`,
        [roomId]
      );

      const remainingCount = remaining?.count || 0;

      // 3. If no active guests left in room, mark room status as available
      if (remainingCount === 0) {
        await db.runAsync(`UPDATE rooms SET status = 'available' WHERE id = ?`, [roomId]);
      }

      await db.execAsync('COMMIT;');
    } catch (err) {
      await db.execAsync('ROLLBACK;').catch(() => {});
      console.error('Error during checkout guest rollback', err);
    }
  } catch (e) {
    console.warn('Local SQLite error on guest checkout:', e);
  }
}

/**
 * Automatically checks out guests whose check_out_date is earlier than today's date
 * and updates impacted room status to 'available', while preserving guest history.
 */
export async function autoCheckoutExpiredStays(): Promise<number> {
  try {
    const db = await openDatabase();
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Find all active stays where check_out_date is strictly earlier than today's date
    const expiredStays: any[] = await db.getAllAsync(
      `SELECT s.id as stay_id, s.guest_id, s.room_id 
       FROM stays s 
       WHERE s.check_out_date < ? AND (s.status IS NULL OR s.status = 'active')`,
      [todayStr]
    );

    if (!expiredStays || expiredStays.length === 0) return 0;

    await db.execAsync('BEGIN TRANSACTION;');
    try {
      const roomIdsToUpdate = new Set<number>();

      for (const stay of expiredStays) {
        roomIdsToUpdate.add(stay.room_id);
        // Mark stay as completed without deleting guest profile
        await db.runAsync(`UPDATE stays SET status = 'completed' WHERE id = ?`, [stay.stay_id]);
      }

      // Check each impacted room to update status to available if no active guests remain
      for (const roomId of roomIdsToUpdate) {
        const remaining: any = await db.getFirstAsync(
          `SELECT COUNT(*) as count FROM stays WHERE room_id = ? AND (status IS NULL OR status = 'active')`,
          [roomId]
        );
        if ((remaining?.count || 0) === 0) {
          await db.runAsync(`UPDATE rooms SET status = 'available' WHERE id = ?`, [roomId]);
        }
      }

      await db.execAsync('COMMIT;');
      return expiredStays.length;
    } catch (err) {
      await db.execAsync('ROLLBACK;').catch(() => {});
      console.error('Error auto checking out expired stays:', err);
      return 0;
    }
  } catch (e) {
    console.warn('SQLite error during autoCheckoutExpiredStays:', e);
    return 0;
  }
}
