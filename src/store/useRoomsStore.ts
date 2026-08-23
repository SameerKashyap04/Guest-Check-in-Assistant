import { create } from 'zustand';
import { getRooms, addRoom, updateRoom, deleteRoom, Room } from '@/database/rooms';
import { useSettingsStore } from './useSettingsStore';
import { syncPropertyRoomsToCloud } from '@/services/firebaseSync';

interface RoomsState {
  rooms: Room[];
  isLoading: boolean;
  error: string | null;
  fetchRooms: () => Promise<void>;
  createRoom: (room_number: string, room_type: string | null, status?: string, price?: number) => Promise<void>;
  editRoom: (id: number, room_number: string, room_type: string | null, status: string, price?: number) => Promise<void>;
  removeRoom: (id: number) => Promise<void>;
}

export const useRoomsStore = create<RoomsState>((set, get) => ({
  rooms: [],
  isLoading: false,
  error: null,
  
  fetchRooms: async () => {
    set({ isLoading: true, error: null });
    try {
      const activePropertyId = useSettingsStore.getState().propertyId || 'HS-DEFAULT';
      const businessName = useSettingsStore.getState().businessName || 'My Homestay';
      const ownerId = useSettingsStore.getState().ownerId || 'OWNER_DEFAULT_101';
      const rooms = await getRooms(activePropertyId);
      set({ rooms, isLoading: false });

      // Automatically sync rooms and live availability to Firestore for public self check-in
      if (rooms && rooms.length > 0) {
        syncPropertyRoomsToCloud(activePropertyId, businessName, rooms, ownerId).catch(() => {});
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch rooms', isLoading: false });
    }
  },
  
  createRoom: async (room_number, room_type, status = 'available', price = 0) => {
    set({ isLoading: true, error: null });
    try {
      const activePropertyId = useSettingsStore.getState().propertyId;
      await addRoom(room_number, room_type, status, price, activePropertyId);
      await get().fetchRooms();
    } catch (error: any) {
      set({ error: error.message || 'Failed to create room', isLoading: false });
    }
  },
  
  editRoom: async (id, room_number, room_type, status, price = 0) => {
    set({ isLoading: true, error: null });
    try {
      await updateRoom(id, room_number, room_type, status, price);
      await get().fetchRooms();
    } catch (error: any) {
      set({ error: error.message || 'Failed to update room', isLoading: false });
    }
  },
  
  removeRoom: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await deleteRoom(id);
      await get().fetchRooms();
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete room', isLoading: false });
    }
  },
}));
