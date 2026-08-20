import TextRecognition from '@react-native-ml-kit/text-recognition';
import { DocumentParser, IDDocumentType, GuestProfile } from './DocumentParser';

/**
 * Real OCR Pipeline using Google ML Kit Text Recognition.
 * Captures an image, runs on-device text recognition, then parses
 * the recognized text through DocumentParser to extract structured
 * guest profile data (name, DOB, gender, ID number, address, etc.)
 */
export class OCRPipeline {
  /**
   * Run ML Kit text recognition on an image URI and return raw text blocks
   */
  static async recognizeText(imageUri: string): Promise<string[]> {
    try {
      const result = await TextRecognition.recognize(imageUri);
      return result.blocks.map((b: any) => b.text);
    } catch (e) {
      console.error('[OCRPipeline] Text recognition failed:', e);
      return [];
    }
  }

  /**
   * Full pipeline: take an image URI, run OCR, detect document type,
   * parse fields, and return a structured guest data object ready for
   * the ManualEntryScreen.
   */
  static async processImage(
    imageUri: string,
    hintDocType?: string
  ): Promise<{
    name: string;
    docType: string;
    idNum: string;
    dob: string;
    gender: string;
    phone: string;
    address: string;
    photoUri: string;
    ocrRawText: string;
  }> {
    // Step 1: Run ML Kit OCR
    const textBlocks = await this.recognizeText(imageUri);
    const rawText = textBlocks.join('\n');

    if (!rawText || rawText.trim().length === 0) {
      console.warn('[OCRPipeline] No text recognized from image');
      return {
        name: '',
        docType: hintDocType || 'Unknown',
        idNum: '',
        dob: '',
        gender: '',
        phone: '',
        address: '',
        photoUri: imageUri,
        ocrRawText: '',
      };
    }

    // Step 2: Detect document type
    const mapHint: Record<string, IDDocumentType> = {
      aadhaar: 'AADHAAR',
      pan: 'PAN',
      voter: 'VOTER_ID',
      dl: 'DRIVING_LICENCE',
      passport: 'PASSPORT',
      auto: 'UNKNOWN',
    };
    const hintType = (hintDocType && mapHint[hintDocType]) || 'UNKNOWN';
    const detectedType = DocumentParser.detectDocumentType(rawText, hintType);

    // Step 3: Parse document fields
    const parsed = DocumentParser.parseDocument(rawText, detectedType);

    // Step 4: Map internal type names to display labels
    const typeLabels: Record<string, string> = {
      AADHAAR: 'Aadhaar',
      PAN: 'PAN',
      VOTER_ID: 'Voter ID',
      DRIVING_LICENCE: 'Driving Licence',
      PASSPORT: 'Passport',
      UNKNOWN: 'Unknown',
    };

    return {
      name: parsed.fullName?.value || '',
      docType: typeLabels[detectedType] || 'Unknown',
      idNum: parsed.idNumber?.value || '',
      dob: parsed.dob?.value || '',
      gender: parsed.gender?.value || '',
      phone: '',  // Phone is never on ID documents
      address: parsed.address?.value || '',
      photoUri: imageUri,
      ocrRawText: rawText,
    };
  }
}
