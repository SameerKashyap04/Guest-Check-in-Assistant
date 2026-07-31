import { openDatabase } from './index';

export interface Room {
  id: number;
  room_number: string;
  room_type: string | null;
  price?: number | null;
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance';
}

import { useSettingsStore } from '@/store/useSettingsStore';

export async function getRooms(propertyId?: string): Promise<Room[]> {
  try {
    const activePropertyId = propertyId || useSettingsStore.getState().propertyId || 'HS-DEFAULT';
    const db = await openDatabase();
    await seedDefaultRoomsIfEmpty();

    const rooms = await db.getAllAsync<Room>(`
      SELECT r.id, r.room_number, r.room_type, r.price,
             CASE 
               WHEN active_stays.count > 0 THEN 'occupied' 
               ELSE r.status 
             END as status
      FROM rooms r
      LEFT JOIN (
        SELECT s.room_id, COUNT(*) as count
        FROM stays s
        JOIN guests g ON g.id = s.guest_id
        WHERE (s.status IS NULL OR s.status = 'active')
          AND g.property_id = ?
        GROUP BY s.room_id
      ) active_stays ON active_stays.room_id = r.id
      ORDER BY r.room_number ASC
    `, [activePropertyId]);

    if (rooms && rooms.length > 0) {
      return rooms;
    }
    return await seedDefaultRoomsIfEmpty();
  } catch (e) {
    console.warn('Failed to fetch rooms from DB', e);
    return getFallbackRooms();
  }
}

export async function seedDefaultRoomsIfEmpty(): Promise<Room[]> {
  try {
    const db = await openDatabase();
    const existing = await db.getAllAsync<Room>('SELECT * FROM rooms ORDER BY room_number ASC');
    if (existing && existing.length > 0) {
      return existing;
    }

    const defaultRooms = [
      { number: '101', type: 'Deluxe Room', price: 1500 },
      { number: '102', type: 'Super Deluxe Room', price: 2000 },
      { number: '201', type: 'Family Suite', price: 3000 },
      { number: '202', type: 'Executive Room', price: 2500 },
    ];

    for (const r of defaultRooms) {
      try {
        await db.runAsync(
          'INSERT INTO rooms (room_number, room_type, status, price) VALUES (?, ?, ?, ?)',
          r.number,
          r.type,
          'available',
          r.price
        );
      } catch (e) {}
    }

    return await db.getAllAsync<Room>('SELECT * FROM rooms ORDER BY room_number ASC');
  } catch (e) {
    return getFallbackRooms();
  }
}

export function getFallbackRooms(): Room[] {
  return [
    { id: 101, room_number: '101', room_type: 'Deluxe Room', price: 1500, status: 'available' },
    { id: 102, room_number: '102', room_type: 'Super Deluxe', price: 2000, status: 'available' },
    { id: 201, room_number: '201', room_type: 'Family Suite', price: 3000, status: 'available' },
    { id: 202, room_number: '202', room_type: 'Executive Room', price: 2500, status: 'available' }
  ];
}

export async function addRoom(
  room_number: string,
  room_type: string | null,
  status: string = 'available',
  price: number = 0
): Promise<void> {
  const db = await openDatabase();
  await db.runAsync(
    'INSERT INTO rooms (room_number, room_type, status, price) VALUES (?, ?, ?, ?)',
    room_number,
    room_type,
    status,
    price
  );
}

export async function updateRoom(
  id: number,
  room_number: string,
  room_type: string | null,
  status: string,
  price: number = 0
): Promise<void> {
  const db = await openDatabase();
  await db.runAsync(
    'UPDATE rooms SET room_number = ?, room_type = ?, status = ?, price = ? WHERE id = ?',
    room_number,
    room_type,
    status,
    price,
    id
  );
}

export async function deleteRoom(id: number): Promise<void> {
  const db = await openDatabase();
  await db.runAsync('DELETE FROM rooms WHERE id = ?', id);
}
