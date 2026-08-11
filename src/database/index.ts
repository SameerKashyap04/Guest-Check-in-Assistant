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

  // ── Subscription Usage Tracking Table (v1.2.0+) ──────────────────
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS subscription_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        check_in_count INTEGER DEFAULT 0,
        export_count INTEGER DEFAULT 0,
        ocr_scan_count INTEGER DEFAULT 0,
        property_id TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(month, year, property_id)
      );
    `);
  } catch (e) {
    console.warn('subscription_usage table migration notice:', e);
  }
}

export async function resetDatabase() {
  const db = await openDatabase();
  await db.execAsync(`
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
