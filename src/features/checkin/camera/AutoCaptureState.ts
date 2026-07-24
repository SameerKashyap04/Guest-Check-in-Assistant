import { create } from 'zustand';
import { GuestProfile, IDDocumentType } from '@/utils/scanner';

export type CaptureStatus = 
  | 'IDLE'
  | 'PROCESSING_FRONT'
  | 'FLIP_DOCUMENT'
  | 'PROCESSING_BACK'
  | 'SUCCESS'
  | 'FAILED';

interface AutoCaptureState {
  status: CaptureStatus;
  documentType: IDDocumentType;
  extractedData: GuestProfile;
  hasCaptured: boolean;
  setStatus: (status: CaptureStatus) => void;
  setDocumentType: (type: IDDocumentType) => void;
  updateExtractedData: (data: Partial<GuestProfile>) => void;
  setCaptured: (captured: boolean) => void;
  reset: () => void;
}

const emptyProfile: GuestProfile = {
  idType: 'UNKNOWN'
};

export const useAutoCaptureStore = create<AutoCaptureState>((set) => ({
  status: 'IDLE',
  documentType: 'UNKNOWN',
  extractedData: { ...emptyProfile },
  hasCaptured: false,
  
  setStatus: (status) => set({ status }),
  setDocumentType: (type) => set({ documentType: type }),
  
  updateExtractedData: (newData) => set((state) => ({
    extractedData: { ...state.extractedData, ...newData }
  })),
  
  setCaptured: (captured) => set({ hasCaptured: captured }),
  
  reset: () => set({
    status: 'IDLE',
    documentType: 'UNKNOWN',
    extractedData: { ...emptyProfile },
    hasCaptured: false
  })
}));
