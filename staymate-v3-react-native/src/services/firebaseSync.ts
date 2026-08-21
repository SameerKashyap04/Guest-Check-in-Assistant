/**
 * Real-time / Polling Cloud Sync for StayMate Self Check-ins
 * Uses native standard fetch against Firestore REST API (zero npm dependencies)
 * Fully compatible with Expo Go, iOS, Android, and Web.
 */

const FIRESTORE_BASE_URL =
  'https://firestore.googleapis.com/v1/projects/guest-checkin-assistant/databases/(default)/documents/guest_checkins';

export interface CloudGuestCheckin {
  id?: string;
  property_id: string;
  owner_id?: string;
  full_name: string;
  phone: string;
  id_type: string;
  id_number: string;
  address: string;
  pin_code?: string;
  gender: string;
  dob: string;
  photo_uri?: string;
  back_photo_uri?: string;
  selfie_uri?: string;
  room_number: string;
  check_in_date: string;
  check_out_date?: string;
  additional_guests?: any[];
  created_at?: any;
  expires_at?: number;
}

// Helper to extract primitive value from Firestore REST value object
function parseFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return val;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    const values = val.arrayValue?.values || [];
    return values.map(parseFirestoreValue);
  }
  if ('mapValue' in val) {
    const fields = val.mapValue?.fields || {};
    const res: Record<string, any> = {};
    for (const k of Object.keys(fields)) {
      res[k] = parseFirestoreValue(fields[k]);
    }
    return res;
  }
  return null;
}

// Helper to parse complete document from Firestore REST response
function parseFirestoreDoc(doc: any): CloudGuestCheckin | null {
  try {
    if (!doc || !doc.fields) return null;
    const nameStr: string = doc.name || '';
    const id = nameStr.split('/').pop() || `doc_${Date.now()}`;
    const fields = doc.fields;

    const data: Record<string, any> = { id };
    for (const key of Object.keys(fields)) {
      data[key] = parseFirestoreValue(fields[key]);
    }

    return {
      id,
      property_id: data.property_id || '',
      owner_id: data.owner_id || 'OWNER_DEFAULT_101',
      full_name: data.full_name || data.name || 'Guest',
      phone: data.phone || '',
      id_type: data.id_type || data.docType || 'Aadhaar',
      id_number: data.id_number || data.idNum || '',
      address: data.address || '',
      pin_code: data.pin_code || '',
      gender: data.gender || 'Other',
      dob: data.dob || '',
      photo_uri: data.photo_uri || data.photoUri || '',
      back_photo_uri: data.back_photo_uri || '',
      selfie_uri: data.selfie_uri || '',
      room_number: data.room_number || data.room || '101',
      check_in_date: data.check_in_date || '',
      check_out_date: data.check_out_date || '',
      additional_guests: Array.isArray(data.additional_guests) ? data.additional_guests : [],
      created_at: data.created_at,
      expires_at: data.expires_at,
    };
  } catch (e) {
    console.warn('Error parsing Firestore doc:', e);
    return null;
  }
}

/**
 * Fetch all pending check-ins from Firestore
 */
export async function fetchPendingGuestCheckins(
  propertyId = 'HS-4821',
  ownerId = 'OWNER_DEFAULT_101'
): Promise<CloudGuestCheckin[]> {
  try {
    const res = await fetch(FIRESTORE_BASE_URL);
    if (!res.ok) {
      return [];
    }
    const json = await res.json();
    const documents = json.documents || [];

    const results: CloudGuestCheckin[] = [];
    for (const doc of documents) {
      const parsed = parseFirestoreDoc(doc);
      if (parsed) {
        // Filter by property_id or owner_id
        if (
          !propertyId ||
          parsed.property_id === propertyId ||
          parsed.owner_id === ownerId ||
          parsed.owner_id === 'OWNER_DEFAULT_101'
        ) {
          results.push(parsed);
        }
      }
    }
    return results;
  } catch (err) {
    // Network or offline gracefully handled
    return [];
  }
}

/**
 * Deletes a temporary check-in record from Firebase after approval / discard
 */
export async function deleteCloudCheckinDoc(docId: string): Promise<void> {
  if (!docId || docId.startsWith('local_') || docId.startsWith('timeout_')) return;
  try {
    const url = `${FIRESTORE_BASE_URL}/${encodeURIComponent(docId)}`;
    await fetch(url, { method: 'DELETE' });
  } catch (e) {
    console.warn(`Failed to delete temporary check-in doc ${docId}:`, e);
  }
}

/**
 * Listens for online self check-in submissions in real-time via lightweight polling.
 */
export function subscribeToPropertyCheckins(
  propertyId: string,
  onNewCheckin: (checkin: CloudGuestCheckin) => void,
  ownerId = 'OWNER_DEFAULT_101'
): () => void {
  if (!propertyId && !ownerId) return () => {};

  const processedDocIds = new Set<string>();
  let isCancelled = false;

  const poll = async () => {
    if (isCancelled) return;
    try {
      const checkins = await fetchPendingGuestCheckins(propertyId, ownerId);
      for (const item of checkins) {
        if (item.id && !processedDocIds.has(item.id)) {
          processedDocIds.add(item.id);
          onNewCheckin(item);
        }
      }
    } catch (_) {}
  };

  // Immediate first poll
  poll();

  // Recurring polling every 4 seconds
  const intervalId = setInterval(poll, 4000);

  return () => {
    isCancelled = true;
    clearInterval(intervalId);
  };
}
