import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('guestcheckin.db');
  }
  return dbPromise;
}

export async function initDatabase() {
  const db = await openDatabase();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS guests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      nationality TEXT,
      gender TEXT,
      dob TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      country TEXT,
      pin_code TEXT,
      id_type TEXT,
      id_number TEXT,
      photo_uri TEXT,
      back_photo_uri TEXT,
      selfie_uri TEXT,
      property_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_number TEXT NOT NULL UNIQUE,
      room_type TEXT,
      price REAL DEFAULT 0,
      status TEXT DEFAULT 'available' -- 'available', 'occupied', 'cleaning', 'maintenance'
    );

    CREATE TABLE IF NOT EXISTS stays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_id INTEGER,
      room_id INTEGER,
      check_in_date TEXT,
      check_out_date TEXT,
      purpose_of_visit TEXT,
      number_of_guests INTEGER,
      adults INTEGER,
      children INTEGER,
      vehicle_number TEXT,
      emergency_contact TEXT,
      notes TEXT,
      payment_status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS subscription_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      current_plan TEXT NOT NULL DEFAULT 'FREE',
      status TEXT NOT NULL DEFAULT 'active',
      billing_cycle TEXT NOT NULL DEFAULT 'monthly',
      trial_start DATETIME,
      trial_end DATETIME,
      subscription_start DATETIME,
      renewal_date DATETIME,
      payment_provider TEXT DEFAULT 'none',
      external_subscription_id TEXT,
      last_verified_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscription_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id TEXT NOT NULL,
      year_month TEXT NOT NULL,
      checkin_count INTEGER DEFAULT 0,
      export_count INTEGER DEFAULT 0,
      ocr_count INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(property_id, year_month)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      property_id TEXT,
      action TEXT NOT NULL,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    await db.execAsync('ALTER TABLE guests ADD COLUMN back_photo_uri TEXT;');
  } catch (e) {
    // Column already exists
  }

  try {
    await db.execAsync('ALTER TABLE guests ADD COLUMN selfie_uri TEXT;');
  } catch (e) {
    // Column already exists
  }

  try {
    await db.execAsync('ALTER TABLE guests ADD COLUMN property_id TEXT;');
  } catch (e) {
    // Column already exists
  }

  try {
    await db.execAsync('ALTER TABLE rooms ADD COLUMN price REAL DEFAULT 0;');
  } catch (e) {
    // Column already exists
  }

  try {
    await db.execAsync("ALTER TABLE stays ADD COLUMN status TEXT DEFAULT 'active';");
  } catch (e) {
    // Column already exists
  }

  try {
    await db.execAsync('ALTER TABLE rooms ADD COLUMN property_id TEXT;');
  } catch (e) {
    // Column already exists
  }
}

export async function getCurrentYearMonth(): Promise<string> {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export async function getMonthlyCheckinCount(propertyId: string): Promise<number> {
  try {
    const db = await openDatabase();
    const ym = await getCurrentYearMonth();
    const result = await db.getFirstAsync<{ checkin_count: number }>(
      'SELECT checkin_count FROM subscription_usage WHERE property_id = ? AND year_month = ?',
      [propertyId, ym]
    );
    return result?.checkin_count ?? 0;
  } catch (e) {
    console.error('Error fetching monthly checkin count:', e);
    return 0;
  }
}

export async function incrementMonthlyCheckinCount(propertyId: string): Promise<number> {
  try {
    const db = await openDatabase();
    const ym = await getCurrentYearMonth();
    await db.runAsync(
      `INSERT INTO subscription_usage (property_id, year_month, checkin_count)
       VALUES (?, ?, 1)
       ON CONFLICT(property_id, year_month) DO UPDATE SET checkin_count = checkin_count + 1, updated_at = CURRENT_TIMESTAMP`,
      [propertyId, ym]
    );
    return await getMonthlyCheckinCount(propertyId);
  } catch (e) {
    console.error('Error incrementing monthly checkin count:', e);
    return 0;
  }
}

export async function getMonthlyExportCount(propertyId: string): Promise<number> {
  try {
    const db = await openDatabase();
    const ym = await getCurrentYearMonth();
    const result = await db.getFirstAsync<{ export_count: number }>(
      'SELECT export_count FROM subscription_usage WHERE property_id = ? AND year_month = ?',
      [propertyId, ym]
    );
    return result?.export_count ?? 0;
  } catch (e) {
    console.error('Error fetching monthly export count:', e);
    return 0;
  }
}

export async function incrementMonthlyExportCount(propertyId: string): Promise<number> {
  try {
    const db = await openDatabase();
    const ym = await getCurrentYearMonth();
    await db.runAsync(
      `INSERT INTO subscription_usage (property_id, year_month, export_count)
       VALUES (?, ?, 1)
       ON CONFLICT(property_id, year_month) DO UPDATE SET export_count = export_count + 1, updated_at = CURRENT_TIMESTAMP`,
      [propertyId, ym]
    );
    return await getMonthlyExportCount(propertyId);
  } catch (e) {
    console.error('Error incrementing monthly export count:', e);
    return 0;
  }
}

export async function logAuditEvent(action: string, userId?: string, propertyId?: string, details?: string) {
  try {
    const db = await openDatabase();
    await db.runAsync(
      'INSERT INTO audit_logs (user_id, property_id, action, details) VALUES (?, ?, ?, ?)',
      [userId ?? 'anonymous', propertyId ?? 'default', action, details ?? '']
    );
  } catch (e) {
    console.warn('Failed to log audit event:', e);
  }
}

export async function resetDatabase() {
  const db = await openDatabase();
  await db.execAsync(`
    DROP TABLE IF EXISTS audit_logs;
    DROP TABLE IF EXISTS subscription_usage;
    DROP TABLE IF EXISTS subscription_state;
    DROP TABLE IF EXISTS stays;
    DROP TABLE IF EXISTS rooms;
    DROP TABLE IF EXISTS guests;
  `);
  await initDatabase();
}

export async function assignLegacyUnassignedGuests(targetPropertyId: string) {
  if (!targetPropertyId) return;
  try {
    const db = await openDatabase();
    await db.runAsync(
      `UPDATE guests SET property_id = ? WHERE property_id IS NULL OR property_id = '' OR property_id = 'HS-DEFAULT'`,
      [targetPropertyId]
    );
    await db.runAsync(
      `UPDATE rooms SET property_id = ? WHERE property_id IS NULL OR property_id = '' OR property_id = 'HS-DEFAULT'`,
      [targetPropertyId]
    );
  } catch (e) {
    console.warn('Migration assignLegacyUnassignedGuests notice:', e);
  }
}

