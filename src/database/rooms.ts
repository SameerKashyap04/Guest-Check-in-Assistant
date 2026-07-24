import { openDatabase } from './index';

export interface Room {
  id: number;
  room_number: string;
  room_type: string | null;
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance';
}

export async function getRooms(): Promise<Room[]> {
  const db = await openDatabase();
  const rooms = await db.getAllAsync<Room>('SELECT * FROM rooms ORDER BY room_number ASC');
  return rooms;
}

export async function addRoom(
  room_number: string,
  room_type: string | null,
  status: string = 'available'
): Promise<void> {
  const db = await openDatabase();
  await db.runAsync(
    'INSERT INTO rooms (room_number, room_type, status) VALUES (?, ?, ?)',
    room_number,
    room_type,
    status
  );
}

export async function updateRoom(
  id: number,
  room_number: string,
  room_type: string | null,
  status: string
): Promise<void> {
  const db = await openDatabase();
  await db.runAsync(
    'UPDATE rooms SET room_number = ?, room_type = ?, status = ? WHERE id = ?',
    room_number,
    room_type,
    status,
    id
  );
}

export async function deleteRoom(id: number): Promise<void> {
  const db = await openDatabase();
  await db.runAsync('DELETE FROM rooms WHERE id = ?', id);
}
