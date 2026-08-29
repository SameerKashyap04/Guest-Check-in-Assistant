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

// Noise / boilerplate tokens that cannot be a person's name
const BOILERPLATE_REGEX = /\b(government|india|unique|identification|authority|uidai|aadhaar|adhar|aadhar|enrolment|enrollment|issued|issue|details|proof|identity|citizenship|birth|verification|authentication|scanning|offline|xml|code|mera|meri|pehchan|help|portal|male|female|transgender|father|husband|mother|guardian|address|floor|flat|sector|road|street|house|district|state|haryana|delhi|maharashtra|karnataka|kerala|punjab|gujarat|rajasthan|tamil|uttar|pradesh|bengal|pin|pincode|po|dist|near|opp|behind|lane|block|ward|nagar|colony|vid|1947|valid|validity|signature|department|income|tax|permanent|account|card|holder|elector|election|commission|republic|passport)\b/i;

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
      /VID\s*:?\s*\d+/i.test(text) ||
      /MERA\s*AADHAAR/i.test(text)
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

    // -------------------------------------------------------------
    // 1. GENDER DETECTION (Multi-lingual)
    // -------------------------------------------------------------
    if (/महिला|FEMALE/i.test(fullText)) {
      result.gender = { value: 'Female', confidence: 98 };
    } else if (/पुरुष|\bMALE\b/i.test(fullText)) {
      result.gender = { value: 'Male', confidence: 98 };
    } else if (/TRANSGENDER|उभयलिंगी/i.test(fullText)) {
      result.gender = { value: 'Transgender', confidence: 98 };
    }

    // -------------------------------------------------------------
    // 2. DOCUMENT SPECIFIC PARSING
    // -------------------------------------------------------------
    if (docType === 'AADHAAR') {
      // Aadhaar 12-digit Number (e.g. 4906 5637 6032)
      const idMatch = fullText.match(/\b(\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/);
      if (idMatch) {
        result.idNumber = { value: idMatch[1].replace(/[-\s]/g, ' '), confidence: 99 };
      }

      // Date of Birth (Avoid left margin 'Issued: 27/03/2013' or 'Details as on 13/12/2023')
      const explicitDob = fullText.match(/(?:जन्म\s*तिथि|DOB|Birth|Year\s*of\s*Birth|D\.O\.B)[\s\:\/\.\-]+(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i);
      if (explicitDob) {
        result.dob = { value: explicitDob[1].replace(/[\-\.]/g, '/'), confidence: 98 };
      } else {
        // Check for 4-digit Year of Birth
        const yobMatch = fullText.match(/(?:जन्म\s*तिथि|DOB|Birth|Year\s*of\s*Birth|D\.O\.B)[\s\:\/\.\-]+(\d{4})/i);
        if (yobMatch) {
          result.dob = { value: `01/01/${yobMatch[1]}`, confidence: 85 };
        } else {
          // Fallback: search dates that are NOT preceded by 'issued' or 'details as on'
          for (const line of textLines) {
            if (!/issued|details|valid|print|as on/i.test(line)) {
              const dMatch = line.match(/(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/);
              if (dMatch) {
                result.dob = { value: dMatch[1].replace(/[\-\.]/g, '/'), confidence: 90 };
                break;
              }
            }
          }
        }
      }

      // PIN Code (6 digits)
      const pinMatch = fullText.match(/\b([1-9][0-9]{5})\b/);
      if (pinMatch) {
        result.pinCode = { value: pinMatch[1], confidence: 95 };
      }

      // English Name Extraction (e.g. "Bhushan Diwakar")
      // Check for explicit "Name:" pattern first
      const explicitName = fullText.match(/(?:Name|Full Name)[\s:]+([A-Za-z\s.'-]{3,30})/i);
      if (explicitName && !BOILERPLATE_REGEX.test(explicitName[1])) {
        result.fullName = { value: explicitName[1].trim(), confidence: 95 };
      } else {
        // Find line index of DOB or Gender
        let dobLineIndex = -1;
        for (let i = 0; i < textLines.length; i++) {
          const l = textLines[i].toLowerCase();
          if (l.includes('dob') || l.includes('जन्म तिथि') || l.includes('birth') || textLines[i].match(/\d{2}[\/\-]\d{2}[\/\-]\d{4}/)) {
            dobLineIndex = i;
            break;
          }
        }

        // Pass 1: Scan 1 to 4 lines directly above the DOB line
        if (dobLineIndex > 0) {
          for (let offset = 1; offset <= 4; offset++) {
            const idx = dobLineIndex - offset;
            if (idx >= 0) {
              const cand = textLines[idx].trim();
              // Clean out punctuation noise
              const cleanCand = cand.replace(/[^A-Za-z\s.'-]/g, '').trim();
              const words = cleanCand.split(/\s+/).filter(Boolean);
              
              if (
                cleanCand.length >= 3 &&
                cleanCand.length <= 35 &&
                words.length >= 1 &&
                words.length <= 4 &&
                /^[A-Za-z\s.'-]+$/.test(cleanCand) &&
                !BOILERPLATE_REGEX.test(cleanCand)
              ) {
                result.fullName = { value: cleanCand, confidence: 92 };
                break;
              }
            }
          }
        }

        // Pass 2: Fallback scan all lines between header and Aadhaar number
        if (!result.fullName) {
          for (const line of textLines) {
            const cleanCand = line.replace(/[^A-Za-z\s.'-]/g, '').trim();
            const words = cleanCand.split(/\s+/).filter(Boolean);
            if (
              cleanCand.length >= 4 &&
              cleanCand.length <= 30 &&
              words.length >= 2 &&
              words.length <= 4 &&
              /^[A-Za-z\s.'-]+$/.test(cleanCand) &&
              !BOILERPLATE_REGEX.test(cleanCand) &&
              !/^(male|female|india|father|mother|husband)$/i.test(cleanCand)
            ) {
              result.fullName = { value: cleanCand, confidence: 80 };
              break;
            }
          }
        }
      }

      // Address Extraction (from back of Aadhaar card)
      // Matches English address block starting at 'Address:' or 'S/O', 'W/O', 'D/O', 'C/O'
      const addrMatch = fullText.match(/(?:Address|पता)[\s\:\-]+([\s\S]+?)(?=(?:\b\d{4}\s+\d{4}\s+\d{4}\b|\b\d{12}\b|www\.uidai|help@uidai|1947|$))/i);
      if (addrMatch) {
        let rawAddr = addrMatch[1];
        // If both Hindi and English are present, extract from English "Address:" if available
        const engAddressSplit = rawAddr.match(/Address[\s\:\-]+([\s\S]+)/i);
        if (engAddressSplit) {
          rawAddr = engAddressSplit[1];
        }

        // Clean and format address
        let cleanAddr = rawAddr
          .replace(/\r?\n/g, ', ')
          .replace(/Unique\s+Identification\s+Authority\s+of\s+India/gi, '')
          .replace(/Details\s+as\s+on\s*[\d\/\-]+/gi, '')
          .replace(/Aadhaar\s+No\.?/gi, '')
          .replace(/help@uidai\.gov\.in|www\.uidai\.gov\.in|1947/gi, '')
          .replace(/,\s*,/g, ',')
          .replace(/^[\s,:-]+|[\s,:-]+$/g, '')
          .trim();

        if (cleanAddr.length >= 10) {
          result.address = { value: cleanAddr, confidence: 90 };
        }
      } else {
        // Fallback address check for S/O, W/O, D/O, C/O anywhere in text
        const careOfMatch = fullText.match(/(?:S\/O|W\/O|D\/O|C\/O|Care\s+of)[\s\:\-]+([\s\S]+?)(?=(?:\b\d{4}\s+\d{4}\s+\d{4}\b|\b\d{12}\b|www\.uidai|1947|$))/i);
        if (careOfMatch) {
          let cleanAddr = careOfMatch[0].replace(/\r?\n/g, ', ').replace(/,\s*,/g, ',').trim();
          if (cleanAddr.length >= 10) {
            result.address = { value: cleanAddr, confidence: 85 };
          }
        }
      }

    } else if (docType === 'PAN') {
      // PAN Number: 5 Letters + 4 Digits + 1 Letter
      const idMatch = fullText.match(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/i);
      if (idMatch) {
        result.idNumber = { value: idMatch[1].toUpperCase(), confidence: 99 };
      }

      // PAN DOB (dd/mm/yyyy)
      const dobMatch = fullText.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/);
      if (dobMatch) {
        result.dob = { value: dobMatch[1].replace(/[\-\.]/g, '/'), confidence: 95 };
      }

      // PAN Names (uppercase alphabets)
      const nameCandidates = fullText.match(/\b([A-Z]{2,}\s+[A-Z]{2,}(?:\s+[A-Z]{2,})?)\b/g);
      if (nameCandidates) {
        const validNames = nameCandidates.filter(
          (n) => !BOILERPLATE_REGEX.test(n) && !/INCOME|TAX|DEPARTMENT|DEPAKT|DERRT|PERMAN|ACCOUNT|AOUT|NUMBER|UMIBER|CARD|CART|GOVT|GOVE|INDIA|INDLA|FATHER|FAHES|SIGNATURE|NAME|NOUNL/i.test(n)
        );
        if (validNames.length > 0) {
          result.fullName = { value: validNames[0].trim(), confidence: 90 };
          if (validNames.length > 1) {
            result.fatherName = { value: validNames[1].trim(), confidence: 75 };
          }
        }
      }

    } else if (docType === 'DRIVING_LICENCE') {
      const idMatch = fullText.match(/\b([A-Z]{2}[-\s]?\d{2,14})\b/i);
      if (idMatch) {
        result.idNumber = { value: idMatch[1].toUpperCase(), confidence: 90 };
      }
      const dobMatch = fullText.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/);
      if (dobMatch) {
        result.dob = { value: dobMatch[1].replace(/[\-\.]/g, '/'), confidence: 95 };
      }
      const dlNameMatch = fullText.match(/(?:Name|Holder Name)[\s:]+([A-Za-z\s]{3,30})/i);
      if (dlNameMatch) {
        result.fullName = { value: dlNameMatch[1].trim(), confidence: 90 };
      }

    } else if (docType === 'PASSPORT') {
      const idMatch = fullText.match(/\b([A-Z][0-9]{7})\b/i);
      if (idMatch) {
        result.idNumber = { value: idMatch[1].toUpperCase(), confidence: 90 };
      }
      const dobMatch = fullText.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/);
      if (dobMatch) {
        result.dob = { value: dobMatch[1].replace(/[\-\.]/g, '/'), confidence: 95 };
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
            result.fullName = { value: `${givenName} ${surname}`.trim(), confidence: 99 };
          }
          if (mrz2.length >= 28) {
            result.idNumber = { value: mrz2.substring(0, 8), confidence: 99 };
          }
        }
      }

    } else if (docType === 'VOTER_ID') {
      const idMatch = fullText.match(/\b([A-Z]{3}[0-9]{7})\b/i);
      if (idMatch) {
        result.idNumber = { value: idMatch[1].toUpperCase(), confidence: 95 };
      }
      const dobMatch = fullText.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/);
      if (dobMatch) {
        result.dob = { value: dobMatch[1].replace(/[\-\.]/g, '/'), confidence: 95 };
      }
      const voterNameMatch = fullText.match(/(?:Elector's Name|Name)[\s:]+([A-Za-z\s]{3,30})/i);
      if (voterNameMatch) {
        result.fullName = { value: voterNameMatch[1].trim(), confidence: 90 };
      }
    }

    return result;
  }
}
