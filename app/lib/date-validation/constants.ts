/**
 * Constants for date validation system
 */

/**
 * Common date patterns found in resumes
 */
export const DATE_PATTERNS = {
  MONTH_YEAR: /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/gi,
  YEAR_ONLY: /\b(19|20)\d{2}\b/g,
  FULL_DATE: /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g,
  PRESENT_INDICATORS: /\b(present|current|ongoing|now|today)\b/gi,
  DATE_RANGE: /(\d{4})\s*[-–—]\s*(\d{4}|present|current)/gi
};

/**
 * Keywords that indicate ongoing status
 */
export const ONGOING_KEYWORDS = [
  'present',
  'current',
  'ongoing',
  'now',
  'today',
  'till date',
  'to date',
  'continuing'
];

/**
 * Common education keywords for context detection
 */
export const EDUCATION_KEYWORDS = [
  'university',
  'college',
  'school',
  'degree',
  'bachelor',
  'master',
  'phd',
  'doctorate',
  'diploma',
  'certificate',
  'graduation',
  'graduated',
  'education',
  'academic',
  'student'
];

/**
 * Common work experience keywords for context detection
 */
export const WORK_KEYWORDS = [
  'company',
  'corporation',
  'inc',
  'ltd',
  'llc',
  'work',
  'job',
  'position',
  'role',
  'employment',
  'experience',
  'career',
  'professional',
  'intern',
  'internship',
  'volunteer'
];

/**
 * Validation severity levels
 */
export const VALIDATION_SEVERITY = {
  CRITICAL: 'critical' as const,
  WARNING: 'warning' as const,
  SUGGESTION: 'suggestion' as const
};

/**
 * Validation categories
 */
export const VALIDATION_CATEGORY = {
  EDUCATION: 'education' as const,
  WORK: 'work' as const,
  GENERAL: 'general' as const
};

/**
 * Default confidence thresholds
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.9,
  MEDIUM: 0.7,
  LOW: 0.5,
  MINIMUM: 0.3
};

/**
 * Date format confidence scores
 */
export const FORMAT_CONFIDENCE = {
  EXACT_MATCH: 1.0,
  PATTERN_MATCH: 0.8,
  FUZZY_MATCH: 0.6,
  GUESS: 0.4,
  UNKNOWN: 0.2
};