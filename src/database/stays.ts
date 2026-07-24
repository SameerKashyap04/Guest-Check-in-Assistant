import { openDatabase } from './index';

export interface GuestData {
  full_name: string;
  id_number: string;
  address: string;
  phone: string;
  photo_uri: string;
  back_photo_uri?: string;
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

  const db = await openDatabase();
  
  // Start a transaction for data integrity
  await db.execAsync('BEGIN TRANSACTION;');
  
  try {
    for (const guestData of guestsData) {
      // 1. Insert Guest
      const guestResult = await db.runAsync(
        `INSERT INTO guests (full_name, id_number, address, phone, photo_uri, back_photo_uri, id_type, dob, gender, pin_code) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          guestData.full_name, 
          guestData.id_number, 
          guestData.address, 
          guestData.phone, 
          guestData.photo_uri, 
          guestData.back_photo_uri || '',
          guestData.id_type, 
          guestData.dob, 
          guestData.gender, 
          guestData.pin_code
        ]
      );
      
      const guestId = guestResult.lastInsertRowId;
      
      // 2. Insert Stay record linking guest to room
      await db.runAsync(
        `INSERT INTO stays (guest_id, room_id, check_in_date, check_out_date, number_of_guests) 
         VALUES (?, ?, ?, ?, ?)`,
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
  } catch (error) {
    // Rollback on any failure
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}

export async function createGuestAndStay(guestData: GuestData, stayData: StayData): Promise<void> {
  return createMultipleGuestsAndStay([guestData], stayData);
}

export async function getGuestsForRoom(roomId: number): Promise<any[]> {
  try {
    const db = await openDatabase();
    const result = await db.getAllAsync(
      `SELECT g.*, s.check_in_date, s.check_out_date, s.created_at as stay_created_at 
       FROM guests g
       JOIN stays s ON s.guest_id = g.id
       WHERE s.room_id = ?
       ORDER BY g.id DESC`,
      [roomId]
    );
    return result as any[];
  } catch (e) {
    console.error('Failed to fetch guests for room', e);
    return [];
  }
}
