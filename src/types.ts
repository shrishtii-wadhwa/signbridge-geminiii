export type LanguageOption = 'Hinglish' | 'Hindi' | 'English';

export type UserContextOption =
  | 'Student'
  | 'Traveler'
  | 'Driver'
  | 'Tourist'
  | 'Patient / Visitor';

export type InputMode = 'image' | 'text' | 'gesture';

export type SupportedGesture =
  | 'Open_Palm'
  | 'Closed_Fist'
  | 'Thumb_Up'
  | 'Thumb_Down'
  | 'Victory'
  | 'Pointing_Up'
  | 'ILoveYou'
  | 'None';

export interface IslAssistResult {
  recognized_label: string;
  message: string;
  speakable_text: string;
  needs_confirmation: boolean;
}

export interface GestureDetectionInfo {
  key: SupportedGesture | string;
  name: string;
  possibleMeaning: string;
  confidence: number;
  timestamp: number;
}

export type SignCategory =
  | 'transport'
  | 'parking'
  | 'safety'
  | 'health'
  | 'education'
  | 'food'
  | 'government'
  | 'event'
  | 'public_notice'
  | 'other';

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SignAnalysisResult {
  detected_text: string;
  language_detected: string;
  category: SignCategory;
  urgency: UrgencyLevel;
  translation: string;
  simple_explanation: string;
  action_to_take: string;
  why_it_matters: string;
  safety_note: string;
  confidence: number;
}

export interface AnalyzeSignRequest {
  image?: string | null; // Base64 data URI or raw base64
  mimeType?: string;
  inputText?: string;
  userQuestion?: string;
  outputLanguage?: LanguageOption;
  language?: LanguageOption;
  userContext?: UserContextOption;
  context?: UserContextOption;
}

export interface AnalyzeSignResponse {
  success: boolean;
  data?: SignAnalysisResult;
  error?: string;
  details?: string;
}

export interface SampleSign {
  id: string;
  title: string;
  category: SignCategory;
  recommendedContext: UserContextOption;
  dataUrl: string;
  description: string;
}
