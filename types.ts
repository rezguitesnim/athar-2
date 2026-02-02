
export interface LocalizedContent {
  ar: string;
  en: string;
  fr: string;
}

export interface AnalysisResult {
  detectedLanguage: string;
  transliteration?: string;
  rawText: string;
  translations: LocalizedContent;
  historicalContexts: LocalizedContent;
  linguisticAnalyses: LocalizedContent;
  confidence: number;
  scriptType: string;
  originalScript?: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  img: string;
  res: AnalysisResult;
}

export enum AncientLanguage {
  Hieroglyphic = 'هيروغليفية',
  Cuneiform = 'مسمارية',
  Tifinagh = 'أمازيغية (تيفيناغ)',
  Latin = 'لاتينية',
  Greek = 'إغريقية'
}
