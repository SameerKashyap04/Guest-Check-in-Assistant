export type IDDocumentType = 'AADHAAR' | 'PAN' | 'DRIVING_LICENCE' | 'PASSPORT' | 'VOTER_ID' | 'UNKNOWN';

export interface FieldValue {
  value: string;
  confidence: number; // 0 to 100
}

export interface GuestProfile {
  idType: IDDocumentType;
  idNumber?: FieldValue;
  fullName?: FieldValue;
  fatherName?: FieldValue;
  gender?: FieldValue;
  dob?: FieldValue;
  address?: FieldValue;
  city?: FieldValue;
  state?: FieldValue;
  country?: FieldValue;
  pinCode?: FieldValue;
  nationality?: FieldValue;
  photoUri?: string;
  rawOCR?: string;
}

// For backwards compatibility with the existing review screen until it's fully updated
export interface ScanResult {
  extractedName: string;
  extractedIdNumber: string;
  extractedAddress: string;
  extractedPhone: string;
  guestProfile?: GuestProfile; // The new rich object
}

// The old function is now just a stub.
// The actual logic is moved to DocumentParser.ts.
export const scanIdCard = async (imageUri: string): Promise<ScanResult> => {
  return {
    extractedName: 'Moved to DocumentParser',
    extractedIdNumber: '',
    extractedAddress: '',
    extractedPhone: '',
  };
};
