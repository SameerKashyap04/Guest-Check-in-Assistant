import { openDatabase } from './index';

export interface CheckinToken {
  id?: number;
  token: string;
  booking_reference?: string;
  guest_name?: string;
  room_id?: number;
  status: 'active' | 'completed' | 'expired';
  expires_at: string;
  created_at?: string;
  room_number?: string;
  room_type?: string;
  price?: number;
}

/**
 * Generate a random alphanumeric check-in token
 */
export function generateTokenString(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Create a new self check-in token in SQLite
 */
export async function createSelfCheckinToken(
  bookingRef?: string,
  guestName?: string,
  roomId?: number,
  expiresInHours: number = 48
): Promise<CheckinToken> {
  const db = await openDatabase();
  const token = generateTokenString(10);
  
  const expiresDate = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  const expiresAt = expiresDate.toISOString();

  await db.runAsync(
    `INSERT INTO self_checkin_tokens (token, booking_reference, guest_name, room_id, status, expires_at)
     VALUES (?, ?, ?, ?, 'active', ?)`,
    [token, bookingRef || null, guestName || null, roomId || null, expiresAt]
  );

  return {
    token,
    booking_reference: bookingRef,
    guest_name: guestName,
    room_id: roomId,
    status: 'active',
    expires_at: expiresAt,
  };
}

/**
 * Validate a check-in token string against SQLite
 */
export async function validateCheckinToken(tokenStr: string): Promise<{ valid: boolean; token?: CheckinToken; reason?: string }> {
  if (!tokenStr) {
    return { valid: false, reason: 'Invalid or missing check-in token.' };
  }

  try {
    const db = await openDatabase();
    const cleanToken = tokenStr.trim();

    const result = await db.getAllAsync<any>(
      `SELECT t.*, r.room_number, r.room_type, r.price
       FROM self_checkin_tokens t
       LEFT JOIN rooms r ON r.id = t.room_id
       WHERE UPPER(t.token) = UPPER(?)`,
      [cleanToken]
    );

    if (!result || result.length === 0) {
      return { valid: false, reason: 'Check-in token not found. Please verify your link or code.' };
    }

    const tokenRecord = result[0] as CheckinToken;

    if (tokenRecord.status === 'completed') {
      return { valid: false, reason: 'This check-in link has already been used for a successful check-in.', token: tokenRecord };
    }

    if (tokenRecord.status === 'expired') {
      return { valid: false, reason: 'This check-in link has expired. Please request a new check-in link from the hotel desk.', token: tokenRecord };
    }

    // Check expiration timestamp
    if (tokenRecord.expires_at) {
      const expTime = new Date(tokenRecord.expires_at).getTime();
      if (Date.now() > expTime) {
        // Automatically mark as expired in DB
        await db.runAsync(`UPDATE self_checkin_tokens SET status = 'expired' WHERE id = ?`, [tokenRecord.id!]);
        return { valid: false, reason: 'This check-in link has expired. Please contact the front desk.', token: { ...tokenRecord, status: 'expired' } };
      }
    }

    return { valid: true, token: tokenRecord };
  } catch (e) {
    console.error('Error validating token', e);
    return { valid: false, reason: 'Unable to validate check-in token. Please try again.' };
  }
}

/**
 * Mark a check-in token as completed after successful check-in
 */
export async function markTokenCompleted(tokenStr: string): Promise<void> {
  try {
    const db = await openDatabase();
    await db.runAsync(
      `UPDATE self_checkin_tokens SET status = 'completed' WHERE UPPER(token) = UPPER(?)`,
      [tokenStr.trim()]
    );
  } catch (e) {
    console.error('Failed to mark token completed', e);
  }
}

/**
 * Fetch all generated check-in tokens for hotel management
 */
export async function getAllCheckinTokens(): Promise<CheckinToken[]> {
  try {
    const db = await openDatabase();
    const result = await db.getAllAsync<any>(
      `SELECT t.*, r.room_number, r.room_type 
       FROM self_checkin_tokens t
       LEFT JOIN rooms r ON r.id = t.room_id
       ORDER BY t.id DESC`
    );
    return result as CheckinToken[];
  } catch (e) {
    console.error('Failed to fetch tokens', e);
    return [];
  }
}
