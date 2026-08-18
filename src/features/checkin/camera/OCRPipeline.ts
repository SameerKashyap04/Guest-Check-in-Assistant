import TextRecognition from '@react-native-ml-kit/text-recognition';
import { DocumentParser } from './DocumentParser';
import { IDDocumentType, GuestProfile } from '@/utils/scanner';

export class OCRPipeline {
  /**
   * Run raw ML Kit text recognition on an image to get text blocks
   */
  static async analyzeFrame(imageUri: string) {
    try {
      const result = await TextRecognition.recognize(imageUri);
      return result.blocks;
    } catch (e) {
      console.error('Frame analysis error', e);
      return [];
    }
  }

  /**
   * Identifies the document type and parses data out of the blocks.
   * Merges the new data with the existing profile.
   */
  static processBlocks(blocks: any[], existingProfile: GuestProfile, currentType: IDDocumentType): GuestProfile {
    const detectedType = DocumentParser.detectDocumentType(blocks, currentType);
    
    let newData: Partial<GuestProfile> = {};
    if (detectedType !== 'UNKNOWN') {
      newData = DocumentParser.parseDocument(blocks, detectedType);
    }
    
    // Always keep the detectedType up to date
    newData.idType = detectedType;

    return DocumentParser.mergeFields(existingProfile, newData);
  }

  /**
   * Check if we have enough information to stop scanning the front 
   * and potentially ask for the back.
   */
  static isFrontComplete(profile: GuestProfile): boolean {
    if (profile.idType === 'UNKNOWN') return false;

    // We must at least have the ID number for most documents
    // (If the document is a Passport and we miss the MRZ, or PAN and we miss the PAN number, we shouldn't advance)
    if (!profile.idNumber || profile.idNumber.confidence < 75) return false;

    // We have the ID number, which is the most critical piece of information.
    // We can advance. In a more advanced system, we might enforce full name and dob,
    // but OCR block grouping can often merge name lines with gender/dob lines, causing strict checks to fail.
    return true;
  }

  /**
   * Determine if the document requires a back side scan based on missing required fields.
   */
  static requiresBackScan(profile: GuestProfile): boolean {
    if (profile.idType === 'AADHAAR' && !profile.address) {
      return true;
    }
    if (profile.idType === 'VOTER_ID' && !profile.address) {
      return true;
    }
    if (profile.idType === 'DRIVING_LICENCE' && !profile.address) {
      // Sometimes address is on front, but often on back
      return true;
    }
    // PAN and Passport usually don't explicitly require back for basic check-in
    return false;
  }
}
