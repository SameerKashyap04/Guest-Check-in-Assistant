import { TextBlock } from '@react-native-ml-kit/text-recognition';
import { GuestProfile, IDDocumentType, FieldValue } from '@/utils/scanner';

export class DocumentParser {
  /**
   * Determine document type based on keywords in OCR blocks
   */
  static detectDocumentType(blocks: TextBlock[], currentType: IDDocumentType): IDDocumentType {
    if (currentType !== 'UNKNOWN') return currentType; // Once detected, stick to it for the session

    const text = blocks.map(b => b.text.toUpperCase()).join(' ');

    const normalizedText = text.replace(/[^A-Z0-9]/g, '');

    // 1. PAN (Very specific keywords and format)
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
    if (
      /REPUBLICOFINDIA|PASSPORT|P<IND/i.test(normalizedText)
    ) {
      return 'PASSPORT';
    }

    // 4. Voter ID
    if (
      /ELECTIONCOMMISSION|EPIC|ELECTOR/i.test(normalizedText) ||
      /\b[A-Z]{3}[0-9]{7}\b/i.test(text)
    ) {
      return 'VOTER_ID';
    }

    // 5. Aadhaar (Has generic 'GOVT' keyword, so must be checked last)
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
   * Merge new fields into the existing profile, prioritizing higher confidence
   */
  static mergeFields(existing: GuestProfile, newData: Partial<GuestProfile>): GuestProfile {
    const merged = { ...existing };
    
    if (newData.idType && newData.idType !== 'UNKNOWN') {
      merged.idType = newData.idType;
    }

    for (const key of Object.keys(newData) as Array<keyof GuestProfile>) {
      if (key === 'idType' || key === 'photoUri' || key === 'rawOCR') continue;
      
      const newVal = newData[key] as FieldValue | undefined;
      const oldVal = merged[key] as FieldValue | undefined;

      if (newVal && (!oldVal || newVal.confidence > oldVal.confidence)) {
        // @ts-ignore - dynamic assignment
        merged[key] = newVal;
      }
    }
    return merged;
  }

  /**
   * Parse OCR blocks into GuestProfile fields based on document type
   */
  static parseDocument(blocks: TextBlock[], docType: IDDocumentType): Partial<GuestProfile> {
    const textLines = blocks.map(b => b.text.trim());
    const fullText = textLines.join('\n');
    const result: Partial<GuestProfile> = {};

    // Common Date Matcher
    const dobMatch = fullText.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/);
    if (dobMatch) {
      result.dob = { value: dobMatch[1], confidence: 95 };
    }

    // Common Gender Matcher
    if (/\b(MALE|FEMALE|TRANSGENDER)\b/i.test(fullText)) {
      const gMatch = fullText.match(/\b(MALE|FEMALE|TRANSGENDER)\b/i);
      if (gMatch) {
        result.gender = { value: gMatch[1].toUpperCase(), confidence: 95 };
      }
    }

    if (docType === 'AADHAAR') {
      const idMatch = fullText.match(/\b(\d{4}[-\s]?\d{4}[-\s]?\d{4})\b/);
      if (idMatch) {
        result.idNumber = { value: idMatch[1].replace(/[-\s]/g, ''), confidence: 99 };
      }

      // Address is usually preceded by S/O, W/O, D/O, C/O or 'Address'
      const addressMatch = fullText.match(/(?:Address|S\/O|W\/O|D\/O|C\/O)[\s:]*([\s\S]+?)(?=\d{6}|$)/i);
      if (addressMatch) {
        let cleanAddress = addressMatch[1].replace(/\n/g, ', ').trim();
        // Remove common Aadhaar headers that OCR sometimes lumps into the address block
        // Accounts for heavy OCR typos like "Urique identificalion Authoty ef tnda" or "Unique fdentification Authority oft tndia"
        cleanAddress = cleanAddress.replace(/U[nr]ique\s+[a-z]+\s+Auth[a-z]*\s+(?:of|oft|ef|af)\s+[it]nd[ia]+[,.\s]*/ig, '');
        // Remove random leading garbage like 'afNfor' which sometimes prefixes the authority
        cleanAddress = cleanAddress.replace(/^afNfor\s*/ig, '');
        result.address = { value: cleanAddress, confidence: 85 };
      }

      const pinMatch = fullText.match(/\b(\d{6})\b/);
      if (pinMatch) {
        result.pinCode = { value: pinMatch[1], confidence: 95 };
      }

      // Name is tricky on Aadhaar, often 1-2 lines above DOB
      // We can use a heuristic here, but we will leave a basic implementation
      for (let i = 0; i < textLines.length; i++) {
        if (textLines[i].toLowerCase().includes('dob') || textLines[i].match(/\d{2}\/\d{2}\/\d{4}/)) {
          if (i > 0 && textLines[i-1].split(' ').length <= 4 && !/\d/.test(textLines[i-1])) {
            result.fullName = { value: textLines[i-1], confidence: 80 };
          }
          break;
        }
      }
    } 
    else if (docType === 'PAN') {
      const idMatch = fullText.match(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/i);
      if (idMatch) {
        result.idNumber = { value: idMatch[1].toUpperCase(), confidence: 99 };
      }
      
      // Name Extraction using uppercase sequence filtering
      // Look for sequences of 2 or 3 uppercase words (each at least 3 chars)
      const nameCandidates = fullText.match(/\b([A-Z]{3,}\s+[A-Z]{3,}(?:\s+[A-Z]{3,})?)\b/g);
      if (nameCandidates) {
        // Filter out boilerplate text commonly found on PAN cards, including severe OCR typos
        const validNames = nameCandidates.filter(n => 
          !/INCOME|TAX|DEPARTMENT|DEPAKT|DERRT|PERMAN|ACCOUNT|AOUT|NUMBER|UMIBER|CARD|CART|GOVT|GOVE|INDIA|INDLA|FATHER|FAHES|SIGNATURE|NAME|NOUNL/i.test(n)
        );
        
        if (validNames.length > 0) {
          result.fullName = { value: validNames[0].trim(), confidence: 85 };
          // Second valid name is often the father's name
          if (validNames.length > 1) {
             result.fatherName = { value: validNames[1].trim(), confidence: 75 };
          }
        }
      }
    }
    else if (docType === 'DRIVING_LICENCE') {
      const idMatch = fullText.match(/\b([A-Z]{2}[-\s]?\d{2,14})\b/i);
      if (idMatch) {
        result.idNumber = { value: idMatch[1].toUpperCase(), confidence: 90 };
      }
    }
    else if (docType === 'PASSPORT') {
      const idMatch = fullText.match(/\b([A-Z][0-9]{7})\b/i);
      if (idMatch) {
        result.idNumber = { value: idMatch[1].toUpperCase(), confidence: 90 };
      }
      
      // Parse MRZ
      const mrzLines = textLines.filter(l => l.startsWith('P<') || l.length >= 40);
      if (mrzLines.length >= 2) {
        const mrz1 = mrzLines[0];
        const mrz2 = mrzLines[1];
        if (mrz1.startsWith('P<IND')) {
          const names = mrz1.substring(5).split('<<');
          if (names.length >= 2) {
            const surname = names[0].replace(/</g, ' ').trim();
            const givenName = names[1].replace(/</g, ' ').trim();
            result.fullName = { value: `${givenName} ${surname}`, confidence: 99 };
          }
          
          if (mrz2.length >= 28) {
            result.idNumber = { value: mrz2.substring(0, 8), confidence: 99 };
          }
        }
      }
    }
    else if (docType === 'VOTER_ID') {
      const idMatch = fullText.match(/\b([A-Z]{3}[0-9]{7})\b/i);
      if (idMatch) {
        result.idNumber = { value: idMatch[1].toUpperCase(), confidence: 95 };
      }
    }

    return result;
  }
}
