/**
 * Core interfaces for date validation system
 */

export interface DateValidationService {
  validateResumeDates(resumeText: string): DateValidationResult;
  parseEducationDates(text: string): EducationPeriod[];
  parseWorkExperience(text: string): WorkExperience[];
  validateEducationTimeline(education: EducationPeriod[]): ValidationIssue[];
  validateWorkTimeline(work: WorkExperience[]): ValidationIssue[];
}

export interface DateValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  warnings: ValidationWarning[];
  suggestions: DateSuggestion[];
}

export interface ValidationIssue {
  type: 'critical' | 'warning' | 'suggestion';
  category: 'education' | 'work' | 'general';
  message: string;
  detectedDate: string;
  suggestedFix?: string;
  confidence: number;
}

export interface ValidationWarning {
  category: 'education' | 'work' | 'general';
  message: string;
  context: string;
}

export interface DateSuggestion {
  originalDate: string;
  suggestedDate: string;
  reason: string;
  confidence: number;
}

export interface DateParser {
  parseDate(dateString: string): ParsedDate | null;
  detectDateFormat(text: string): DateFormat;
  extractDatesFromText(text: string): ExtractedDate[];
  normalizeDate(date: string): Date | null;
}

export interface ParsedDate {
  original: string;
  normalized: Date;
  format: DateFormat;
  isOngoing: boolean;
  confidence: number;
}

export interface ExtractedDate {
  text: string;
  startIndex: number;
  endIndex: number;
  parsedDate: ParsedDate | null;
  context: string;
}

export enum DateFormat {
  MONTH_YEAR = 'MM/YYYY',
  YEAR_ONLY = 'YYYY',
  FULL_DATE = 'MM/DD/YYYY',
  PRESENT = 'PRESENT',
  CURRENT = 'CURRENT'
}

export interface EducationPeriod {
  institution: string;
  degree?: string;
  startDate: Date | null;
  endDate: Date | null;
  isOngoing: boolean;
  originalText: string;
  confidence: number;
}

export interface WorkExperience {
  company: string;
  position: string;
  startDate: Date | null;
  endDate: Date | null;
  isOngoing: boolean;
  originalText: string;
  confidence: number;
}

export interface ValidationRule {
  name: string;
  category: 'education' | 'work' | 'general';
  severity: 'critical' | 'warning' | 'suggestion';
  condition: (context: ValidationContext) => boolean;
  message: (context: ValidationContext) => string;
  suggestion?: (context: ValidationContext) => string | undefined;
}

export interface ValidationContext {
  currentDate: Date;
  educationPeriods: EducationPeriod[];
  workExperience: WorkExperience[];
  config: ValidationConfig;
  resumeText: string;
}

export interface ValidationConfig {
  maxFutureEducationYears: number;
  maxFutureWorkMonths: number;
  enableTypoDetection: boolean;
  confidenceThreshold: number;
  strictMode: boolean;
}

// Extended feedback interface to include date validation
// Note: Feedback interface is defined in types/index.d.ts
export interface EnhancedFeedback {
  overallScore: number;
  ATS: {
    score: number; 
    tips: { type: "good" | "improve"; tip: string; }[];
  };
  toneAndStyle: {
    score: number; 
    tips: { type: "good" | "improve"; tip: string; explanation: string; }[];
  };
  content: {
    score: number; 
    tips: { type: "good" | "improve"; tip: string; explanation: string; }[];
  };
  structure: {
    score: number; 
    tips: { type: "good" | "improve"; tip: string; explanation: string; }[];
  };
  skills: {
    score: number; 
    tips: { type: "good" | "improve"; tip: string; explanation: string; }[];
  };
  dateValidation?: {
    score: number;
    issues: ValidationIssue[];
    summary: string;
  };
}