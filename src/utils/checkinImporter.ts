export interface ParsedImportData {
  fullName: string;
  phone: string;
  idType: string;
  idNumber: string;
  address: string;
  pinCode: string;
  roomNumber: string;
  propertyId: string;
}

/**
 * Parses a check-in import text string (JSON payload or WhatsApp plain text)
 */
export function parseCheckinImportText(text: string): ParsedImportData | null {
  if (!text) return null;

  // 1. Try JSON payload inside #GUEST_IMPORT_DATA: ... #
  const jsonMatch = text.match(/#GUEST_IMPORT_DATA:(.*?)#/s);
  if (jsonMatch && jsonMatch[1]) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      return {
        fullName: parsed.fullName || parsed.full_name || 'Imported Guest',
        phone: parsed.phone || '',
        idType: parsed.idType || parsed.id_type || 'Aadhaar',
        idNumber: parsed.idNumber || parsed.id_number || '',
        address: parsed.address || '',
        pinCode: parsed.pinCode || parsed.pin_code || '',
        roomNumber: parsed.roomNumber || parsed.room_number || '101',
        propertyId: parsed.propertyId || parsed.property_id || ''
      };
    } catch (e) {
      console.warn('Failed to parse JSON import payload', e);
    }
  }

  // 2. Fallback regex parser for plain text WhatsApp message format
  const nameMatch = text.match(/\*Guest Name:\*\s*(.+)/i) || text.match(/Guest Name:\s*(.+)/i);
  const phoneMatch = text.match(/\*Phone:\*\s*(.+)/i) || text.match(/Phone:\s*(.+)/i);
  const roomMatch = text.match(/\*Assigned Room:\*\s*(?:Room\s*)?(.+)/i) || text.match(/Assigned Room:\s*(?:Room\s*)?(.+)/i);
  const idMatch = text.match(/\*ID Type:\*\s*(.+?)\s*\((.+?)\)/i) || text.match(/ID Type:\s*(.+?)\s*\((.+?)\)/i);
  const addressMatch = text.match(/\*Address:\*\s*(.+)/i) || text.match(/Address:\s*(.+)/i);

  if (nameMatch || phoneMatch) {
    return {
      fullName: nameMatch ? nameMatch[1].trim() : 'Imported Guest',
      phone: phoneMatch ? phoneMatch[1].trim() : '',
      idType: idMatch ? idMatch[1].trim() : 'Aadhaar',
      idNumber: idMatch ? idMatch[2].trim() : '',
      address: addressMatch ? addressMatch[1].trim() : '',
      pinCode: '',
      roomNumber: roomMatch ? roomMatch[1].trim().replace(/^Room\s+/i, '') : '101',
      propertyId: ''
    };
  }

  return null;
}
