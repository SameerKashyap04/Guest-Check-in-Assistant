import TextRecognition from '@react-native-ml-kit/text-recognition';
import { DocumentParser } from './DocumentParser';
import { IDDocumentType, GuestProfile } from '@/utils/scanner';

export class OCRPipeline {
  /**
   * Run raw ML Kit text recognition on an image to get text blocks
   */
  static async analyzeFrame(imageUri: string): Promise<any[]> {
    try {
      const result = await TextRecognition.recognize(imageUri);
      return result.blocks || [];
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

    if (!profile.idNumber || profile.idNumber.confidence < 75) return false;

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
      return true;
    }
    return false;
  }

  /**
   * Process a static image (e.g. from gallery) and return extracted fields
   */
  static async processImage(imageUri: string, targetType?: string): Promise<any> {
    try {
      const docType = (targetType || 'UNKNOWN') as IDDocumentType;
      const blocks = await OCRPipeline.analyzeFrame(imageUri);
      if (!blocks || blocks.length === 0) return null;

      const profile: GuestProfile = { idType: docType };
      const parsed = OCRPipeline.processBlocks(blocks, profile, docType);

      return {
        fullName: parsed.fullName?.value,
        idNumber: parsed.idNumber?.value,
        dob: parsed.dob?.value,
        gender: parsed.gender?.value,
        address: parsed.address?.value,
        idType: parsed.idType,
      };
    } catch (e) {
      console.error('Failed to process image OCR', e);
      return null;
    }
  }
}
