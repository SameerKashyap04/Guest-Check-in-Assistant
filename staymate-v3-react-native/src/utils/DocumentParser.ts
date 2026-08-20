export type IDDocumentType = 'UNKNOWN' | 'AADHAAR' | 'PAN' | 'VOTER_ID' | 'DRIVING_LICENCE' | 'PASSPORT';

export interface FieldValue {
  value: string;
  confidence: number;
}

export interface GuestProfile {
  fullName?: FieldValue;
  fatherName?: FieldValue;
  dob?: FieldValue;
  gender?: FieldValue;
  idNumber?: FieldValue;
  address?: FieldValue;
  pinCode?: FieldValue;
  idType: IDDocumentType;
  photoUri?: string;
  backPhotoUri?: string;
}

export class DocumentParser {
  /**
   * Determine document type based on raw OCR text lines or string
   */
  static detectDocumentType(rawText: string, currentType: IDDocumentType = 'UNKNOWN'): IDDocumentType {
    if (currentType !== 'UNKNOWN') return currentType;

    const normalizedText = rawText.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const text = rawText.toUpperCase();

    // 1. PAN Card
    if (
      /INCOMETAX|PERMANENTACCOUNT/i.test(normalizedText) ||
      /\b[A-Z]{5}\d{4}[A-Z]\b/i.test(text)
    ) {
      return 'PAN';
    }

    // 2. Driving Licence
    if (
      /DRIVINGLICENCE|TRANSPORTDEPART|UNIONOFINDIA/i.test(normalizedText) ||
      /\bDL\s*(?:NO|Number)?:?\s*[A-Z]{2}/i.test(text)
    ) {
      return 'DRIVING_LICENCE';
    }

    // 3. Passport
    if (/REPUBLICOFINDIA|PASSPORT|P<IND/i.test(normalizedText)) {
      return 'PASSPORT';
    }

    // 4. Voter ID
    if (
      /ELECTIONCOMMISSION|EPIC|ELECTOR/i.test(normalizedText) ||
      /\b[A-Z]{3}[0-9]{7}\b/i.test(text)
    ) {
      return 'VOTER_ID';
    }

    // 5. Aadhaar
    if (
      /AADHAAR|GOVERNMENT|GOVENMENT|GOVT|UIDAI|UNIQUEIDENTIFICATION/i.test(normalizedText) ||
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/.test(text) ||
      /\b\d{12}\b/.test(normalizedText) ||
      /VID\s*:?\s*\d+/i.test(text)
    ) {
      return 'AADHAAR';
    }

    return 'UNKNOWN';
  }

  /**
   * Parse raw text into structured GuestProfile fields
   */
  static parseDocument(rawText: string, docType: IDDocumentType): Partial<GuestProfile> {
    const textLines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const fullText = textLines.join('\n');
    const result: Partial<GuestProfile> = {};

    // Common Date Matcher (DOB)
    const dobMatch = fullText.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/);
    if (dobMatch) {
      result.dob = {value: dobMatch[1], confidence: 95};
    }

    // Common Gender Matcher
    if (/\b(MALE|FEMALE|TRANSGENDER)\b/i.test(fullText)) {
      const gMatch = fullText.match(/\b(MALE|FEMALE|TRANSGENDER)\b/i);
      if (gMatch) {
        result.gender = {value: gMatch[1].toUpperCase(), confidence: 95};
      }
    }

    if (docType === 'AADHAAR') {
      const idMatch = fullText.match(/\b(\d{4}[-\s]?\d{4}[-\s]?\d{4})\b/);
      if (idMatch) {
        result.idNumber = {value: idMatch[1].replace(/[-\s]/g, ' '), confidence: 99};
      }

      // Address is usually preceded by S/O, W/O, D/O, C/O or 'Address'
      const addressMatch = fullText.match(/(?:Address|S\/O|W\/O|D\/O|C\/O)[\s:]*([\s\S]+?)(?=\d{6}|$)/i);
      if (addressMatch) {
        let cleanAddress = addressMatch[1].replace(/\n/g, ', ').trim();
        cleanAddress = cleanAddress.replace(/U[nr]ique\s+[a-z]+\s+Auth[a-z]*\s+(?:of|oft|ef|af)\s+[it]nd[ia]+[,.\s]*/ig, '');
        cleanAddress = cleanAddress.replace(/^afNfor\s*/ig, '');
        result.address = {value: cleanAddress, confidence: 85};
      }

      const pinMatch = fullText.match(/\b(\d{6})\b/);
      if (pinMatch) {
        result.pinCode = {value: pinMatch[1], confidence: 95};
      }

      for (let i = 0; i < textLines.length; i++) {
        if (textLines[i].toLowerCase().includes('dob') || textLines[i].match(/\d{2}\/\d{2}\/\d{4}/)) {
          if (i > 0 && textLines[i - 1].split(' ').length <= 4 && !/\d/.test(textLines[i - 1])) {
            result.fullName = {value: textLines[i - 1], confidence: 80};
          }
          break;
        }
      }
    } else if (docType === 'PAN') {
      const idMatch = fullText.match(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/i);
      if (idMatch) {
        result.idNumber = {value: idMatch[1].toUpperCase(), confidence: 99};
      }

      const nameCandidates = fullText.match(/\b([A-Z]{3,}\s+[A-Z]{3,}(?:\s+[A-Z]{3,})?)\b/g);
      if (nameCandidates) {
        const validNames = nameCandidates.filter(
          (n) => !/INCOME|TAX|DEPARTMENT|DEPAKT|PERMAN|ACCOUNT|NUMBER|CARD|GOVT|INDIA|FATHER|SIGNATURE|NAME/i.test(n)
        );
        if (validNames.length > 0) {
          result.fullName = {value: validNames[0].trim(), confidence: 85};
          if (validNames.length > 1) {
            result.fatherName = {value: validNames[1].trim(), confidence: 75};
          }
        }
      }
    } else if (docType === 'DRIVING_LICENCE') {
      const idMatch = fullText.match(/\b([A-Z]{2}[-\s]?\d{2,14})\b/i);
      if (idMatch) {
        result.idNumber = {value: idMatch[1].toUpperCase(), confidence: 90};
      }
    } else if (docType === 'PASSPORT') {
      const idMatch = fullText.match(/\b([A-Z][0-9]{7})\b/i);
      if (idMatch) {
        result.idNumber = {value: idMatch[1].toUpperCase(), confidence: 90};
      }

      const mrzLines = textLines.filter((l) => l.startsWith('P<') || l.length >= 40);
      if (mrzLines.length >= 2) {
        const mrz1 = mrzLines[0];
        const mrz2 = mrzLines[1];
        if (mrz1.startsWith('P<IND')) {
          const names = mrz1.substring(5).split('<<');
          if (names.length >= 2) {
            const surname = names[0].replace(/</g, ' ').trim();
            const givenName = names[1].replace(/</g, ' ').trim();
            result.fullName = {value: `${givenName} ${surname}`, confidence: 99};
          }
          if (mrz2.length >= 28) {
            result.idNumber = {value: mrz2.substring(0, 8), confidence: 99};
          }
        }
      }
    } else if (docType === 'VOTER_ID') {
      const idMatch = fullText.match(/\b([A-Z]{3}[0-9]{7})\b/i);
      if (idMatch) {
        result.idNumber = {value: idMatch[1].toUpperCase(), confidence: 95};
      }
    }

    return result;
  }
}
