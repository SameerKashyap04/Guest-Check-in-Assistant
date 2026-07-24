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
    await db.execAsync('ALTER TABLE rooms ADD COLUMN price REAL DEFAULT 0;');
  } catch (e) {
    // Column already exists
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
