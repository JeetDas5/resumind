// Date validation service for resume analysis
export interface DateValidationResult {
  isValid: boolean;
  issues: DateValidationIssue[];
  warnings: DateValidationWarning[];
  suggestions: DateSuggestion[];
}

export interface DateValidationIssue {
  type: 'critical' | 'warning' | 'suggestion';
  category: 'education' | 'work' | 'general';
  message: string;
  detectedDate: string;
  suggestedFix?: string;
  confidence: number;
}

export interface DateValidationWarning {
  message: string;
  category: 'education' | 'work' | 'general';
}

export interface DateSuggestion {
  message: string;
  suggestedDate: string;
  confidence: number;
}

export interface ValidationConfig {
  maxFutureEducationYears: number; // Default: 4
  maxFutureWorkMonths: number; // Default: 3
  enableTypoDetection: boolean; // Default: true
  confidenceThreshold: number; // Default: 0.8
  strictMode: boolean; // Default: false
}

export class DateValidationService {
  private config: ValidationConfig;

  constructor(config?: Partial<ValidationConfig>) {
    this.config = {
      maxFutureEducationYears: 4,
      maxFutureWorkMonths: 3,
      enableTypoDetection: true,
      confidenceThreshold: 0.8,
      strictMode: false,
      ...config
    };
  }

  /**
   * Validates dates in resume text and returns validation results
   */
  validateResumeDates(resumeText: string): DateValidationResult {
    const startTime = performance.now();
    
    try {
      // Input validation
      if (!resumeText || typeof resumeText !== 'string') {
        console.warn('[DateValidationService] Invalid input: resumeText must be a non-empty string');
        return this.createEmptyResult('Invalid resume text provided');
      }

      if (resumeText.trim().length === 0) {
        console.warn('[DateValidationService] Empty resume text provided');
        return this.createEmptyResult('Empty resume text provided');
      }

      console.log('[DateValidationService] Starting date validation for resume text (length: ' + resumeText.length + ')');

      const issues: DateValidationIssue[] = [];
      const warnings: DateValidationWarning[] = [];
      const suggestions: DateSuggestion[] = [];

      // Extract and validate education dates with error handling
      try {
        const educationIssues = this.validateEducationDates(resumeText);
        issues.push(...educationIssues);
        console.log('[DateValidationService] Education validation completed: ' + educationIssues.length + ' issues found');
      } catch (error) {
        console.error('[DateValidationService] Error validating education dates:', error);
        warnings.push({ 
          message: 'Education date validation encountered an error and was skipped', 
          category: 'education' 
        });
      }

      // Extract and validate work experience dates with error handling
      try {
        const workIssues = this.validateWorkDates(resumeText);
        issues.push(...workIssues);
        console.log('[DateValidationService] Work validation completed: ' + workIssues.length + ' issues found');
      } catch (error) {
        console.error('[DateValidationService] Error validating work dates:', error);
        warnings.push({ 
          message: 'Work experience date validation encountered an error and was skipped', 
          category: 'work' 
        });
      }

      // Check for general date issues with error handling
      try {
        const generalIssues = this.validateGeneralDates(resumeText);
        issues.push(...generalIssues);
        console.log('[DateValidationService] General validation completed: ' + generalIssues.length + ' issues found');
      } catch (error) {
        console.error('[DateValidationService] Error validating general dates:', error);
        warnings.push({ 
          message: 'General date validation encountered an error and was skipped', 
          category: 'general' 
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log('[DateValidationService] Date validation completed in ' + duration.toFixed(2) + 'ms:', {
        totalIssues: issues.length,
        criticalIssues: issues.filter(issue => issue.type === 'critical').length,
        warnings: warnings.length,
        suggestions: suggestions.length
      });

      return {
        isValid: issues.filter(issue => issue.type === 'critical').length === 0,
        issues,
        warnings,
        suggestions
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.error('[DateValidationService] Critical error during date validation (duration: ' + duration.toFixed(2) + 'ms):', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        resumeTextLength: resumeText?.length || 0,
        timestamp: new Date().toISOString()
      });

      // Graceful degradation - return safe result
      return {
        isValid: true, // Don't block user with validation errors
        issues: [],
        warnings: [{ 
          message: 'Date validation temporarily unavailable due to an internal error', 
          category: 'general' 
        }],
        suggestions: []
      };
    }
  }

  private validateEducationDates(text: string): DateValidationIssue[] {
    const issues: DateValidationIssue[] = [];
    
    try {
      if (!text || typeof text !== 'string') {
        console.warn('[DateValidationService] validateEducationDates: Invalid text input');
        return issues;
      }

      const currentDate = new Date();
      const maxFutureDate = new Date();
      maxFutureDate.setFullYear(currentDate.getFullYear() + this.config.maxFutureEducationYears);

      console.log('[DateValidationService] Validating education dates with max future date:', maxFutureDate.toLocaleDateString());

      // Basic pattern matching for education dates
      const educationPatterns = [
        /(?:graduation|graduated|degree|bachelor|master|phd|diploma).*?(\d{4})/gi,
        /(\d{1,2}\/\d{4})\s*-\s*(\d{1,2}\/\d{4}|present|current)/gi,
        /(\d{4})\s*-\s*(\d{4}|present|current)/gi
      ];

      educationPatterns.forEach((pattern, patternIndex) => {
        try {
          let match;
          let matchCount = 0;
          
          while ((match = pattern.exec(text)) !== null) {
            matchCount++;
            
            try {
              const dateStr = match[1] || match[0];
              const endDateStr = match[2];
              
              console.log('[DateValidationService] Found education date match:', {
                pattern: patternIndex,
                match: matchCount,
                dateStr,
                endDateStr,
                fullMatch: match[0]
              });
              
              if (this.isValidYear(dateStr)) {
                const year = parseInt(dateStr);
                const dateObj = new Date(year, 0, 1);
                
                console.log('[DateValidationService] Processing education date:', {
                  originalDate: dateStr,
                  parsedYear: year,
                  dateObject: dateObj.toLocaleDateString(),
                  maxFutureDate: maxFutureDate.toLocaleDateString(),
                  isOngoing: this.isOngoingIndicator(endDateStr)
                });
                
                if (dateObj > maxFutureDate && !this.isOngoingIndicator(endDateStr)) {
                  const suggestedFix = this.suggestReasonableYear(year);
                  console.log('[DateValidationService] Education date issue detected:', {
                    detectedDate: dateStr,
                    suggestedFix,
                    yearsDifference: (dateObj.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
                  });
                  
                  issues.push({
                    type: 'warning',
                    category: 'education',
                    message: `Education end date appears to be too far in the future`,
                    detectedDate: dateStr,
                    suggestedFix,
                    confidence: 0.8
                  });
                }
              } else {
                console.warn('[DateValidationService] Invalid year detected in education:', dateStr);
              }
            } catch (matchError) {
              console.error('[DateValidationService] Error processing education date match:', {
                error: matchError instanceof Error ? matchError.message : String(matchError),
                match: match[0],
                patternIndex
              });
            }
            
            // Prevent infinite loops
            if (matchCount > 100) {
              console.warn('[DateValidationService] Too many matches for education pattern, breaking loop');
              break;
            }
          }
          
          console.log('[DateValidationService] Education pattern ' + patternIndex + ' completed with ' + matchCount + ' matches');
        } catch (patternError) {
          console.error('[DateValidationService] Error with education pattern ' + patternIndex + ':', {
            error: patternError instanceof Error ? patternError.message : String(patternError),
            pattern: pattern.source
          });
        }
      });

      console.log('[DateValidationService] Education date validation completed with ' + issues.length + ' issues');
      return issues;
      
    } catch (error) {
      console.error('[DateValidationService] Critical error in validateEducationDates:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        textLength: text?.length || 0
      });
      
      // Return empty array to allow other validations to continue
      return [];
    }
  }

  private validateWorkDates(text: string): DateValidationIssue[] {
    const issues: DateValidationIssue[] = [];
    
    try {
      if (!text || typeof text !== 'string') {
        console.warn('[DateValidationService] validateWorkDates: Invalid text input');
        return issues;
      }

      const currentDate = new Date();
      const maxFutureDate = new Date();
      maxFutureDate.setMonth(currentDate.getMonth() + this.config.maxFutureWorkMonths);

      console.log('[DateValidationService] Validating work dates with max future date:', maxFutureDate.toLocaleDateString());

      // Basic pattern matching for work experience dates
      const workPatterns = [
        /(?:work|job|position|employment|experience).*?(\d{1,2}\/\d{4})\s*-\s*(\d{1,2}\/\d{4}|present|current)/gi,
        /(\d{4})\s*-\s*(\d{4}|present|current)/gi
      ];

      workPatterns.forEach((pattern, patternIndex) => {
        try {
          let match;
          let matchCount = 0;
          
          while ((match = pattern.exec(text)) !== null) {
            matchCount++;
            
            try {
              const startDateStr = match[1];
              const endDateStr = match[2];
              
              console.log('[DateValidationService] Found work date match:', {
                pattern: patternIndex,
                match: matchCount,
                startDateStr,
                endDateStr,
                fullMatch: match[0]
              });
              
              if (this.isValidYear(startDateStr)) {
                const year = parseInt(startDateStr);
                const dateObj = new Date(year, 0, 1);
                
                console.log('[DateValidationService] Processing work date:', {
                  originalDate: startDateStr,
                  parsedYear: year,
                  dateObject: dateObj.toLocaleDateString(),
                  maxFutureDate: maxFutureDate.toLocaleDateString(),
                  isOngoing: this.isOngoingIndicator(endDateStr)
                });
                
                if (dateObj > maxFutureDate && !this.isOngoingIndicator(endDateStr)) {
                  const suggestedFix = this.suggestReasonableYear(year);
                  console.log('[DateValidationService] Work date issue detected:', {
                    detectedDate: startDateStr,
                    suggestedFix,
                    monthsDifference: (dateObj.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
                  });
                  
                  issues.push({
                    type: 'warning',
                    category: 'work',
                    message: `Work experience start date appears to be in the future`,
                    detectedDate: startDateStr,
                    suggestedFix,
                    confidence: 0.8
                  });
                }
              } else {
                console.warn('[DateValidationService] Invalid year detected in work experience:', startDateStr);
              }
            } catch (matchError) {
              console.error('[DateValidationService] Error processing work date match:', {
                error: matchError instanceof Error ? matchError.message : String(matchError),
                match: match[0],
                patternIndex
              });
            }
            
            // Prevent infinite loops
            if (matchCount > 100) {
              console.warn('[DateValidationService] Too many matches for work pattern, breaking loop');
              break;
            }
          }
          
          console.log('[DateValidationService] Work pattern ' + patternIndex + ' completed with ' + matchCount + ' matches');
        } catch (patternError) {
          console.error('[DateValidationService] Error with work pattern ' + patternIndex + ':', {
            error: patternError instanceof Error ? patternError.message : String(patternError),
            pattern: pattern.source
          });
        }
      });

      console.log('[DateValidationService] Work date validation completed with ' + issues.length + ' issues');
      return issues;
      
    } catch (error) {
      console.error('[DateValidationService] Critical error in validateWorkDates:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        textLength: text?.length || 0
      });
      
      // Return empty array to allow other validations to continue
      return [];
    }
  }

  private validateGeneralDates(text: string): DateValidationIssue[] {
    const issues: DateValidationIssue[] = [];
    
    try {
      if (!text || typeof text !== 'string') {
        console.warn('[DateValidationService] validateGeneralDates: Invalid text input');
        return issues;
      }

      if (!this.config.enableTypoDetection) {
        console.log('[DateValidationService] Typo detection disabled, skipping general date validation');
        return issues;
      }

      const currentYear = new Date().getFullYear();
      const suspiciousYears = [currentYear + 1, currentYear + 2];
      
      console.log('[DateValidationService] Checking for suspicious years:', suspiciousYears);
      
      suspiciousYears.forEach((year, yearIndex) => {
        try {
          const yearRegex = new RegExp(`\\b${year}\\b`, 'g');
          let match;
          let matchCount = 0;
          
          while ((match = yearRegex.exec(text)) !== null) {
            matchCount++;
            
            try {
              // Check if it's not in a context that suggests it's intentional
              const contextStart = Math.max(0, match.index - 50);
              const contextEnd = Math.min(text.length, match.index + 50);
              const context = text.substring(contextStart, contextEnd);
              
              console.log('[DateValidationService] Found suspicious year match:', {
                year,
                matchIndex: match.index,
                context: context.trim(),
                isIntentional: this.isIntentionalFutureDate(context)
              });
              
              if (!this.isIntentionalFutureDate(context)) {
                const suggestedFix = currentYear.toString();
                console.log('[DateValidationService] Typo detected:', {
                  detectedYear: year,
                  suggestedFix,
                  context: context.trim()
                });
                
                issues.push({
                  type: 'suggestion',
                  category: 'general',
                  message: `Year ${year} might be a typo`,
                  detectedDate: year.toString(),
                  suggestedFix,
                  confidence: 0.7
                });
              }
            } catch (matchError) {
              console.error('[DateValidationService] Error processing general date match:', {
                error: matchError instanceof Error ? matchError.message : String(matchError),
                year,
                matchIndex: match.index
              });
            }
            
            // Prevent infinite loops
            if (matchCount > 50) {
              console.warn('[DateValidationService] Too many matches for year ' + year + ', breaking loop');
              break;
            }
          }
          
          console.log('[DateValidationService] Year ' + year + ' check completed with ' + matchCount + ' matches');
        } catch (yearError) {
          console.error('[DateValidationService] Error checking year ' + year + ':', {
            error: yearError instanceof Error ? yearError.message : String(yearError),
            yearIndex
          });
        }
      });

      console.log('[DateValidationService] General date validation completed with ' + issues.length + ' issues');
      return issues;
      
    } catch (error) {
      console.error('[DateValidationService] Critical error in validateGeneralDates:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        textLength: text?.length || 0
      });
      
      // Return empty array to allow other validations to continue
      return [];
    }
  }

  private isValidYear(dateStr: string): boolean {
    const year = parseInt(dateStr);
    return !isNaN(year) && year >= 1950 && year <= 2050;
  }

  private isOngoingIndicator(dateStr: string): boolean {
    if (!dateStr) return false;
    const ongoing = ['present', 'current', 'ongoing', 'now'];
    return ongoing.some(indicator => 
      dateStr.toLowerCase().includes(indicator)
    );
  }

  private isIntentionalFutureDate(context: string): boolean {
    const intentionalIndicators = [
      'expected', 'anticipated', 'projected', 'planned',
      'graduation', 'completing', 'finishing'
    ];
    return intentionalIndicators.some(indicator =>
      context.toLowerCase().includes(indicator)
    );
  }

  private suggestReasonableYear(year: number): string {
    try {
      const currentYear = new Date().getFullYear();
      if (year > currentYear + 10) {
        // Likely a typo, suggest current year or previous year
        return currentYear.toString();
      }
      return (currentYear - 1).toString();
    } catch (error) {
      console.error('[DateValidationService] Error suggesting reasonable year:', error);
      return '2024'; // Fallback to a reasonable default
    }
  }

  /**
   * Create an empty validation result with optional warning message
   */
  private createEmptyResult(warningMessage?: string): DateValidationResult {
    const result: DateValidationResult = {
      isValid: true,
      issues: [],
      warnings: [],
      suggestions: []
    };

    if (warningMessage) {
      result.warnings.push({
        message: warningMessage,
        category: 'general'
      });
    }

    return result;
  }
}

// Factory function for easy integration
export const createDateValidationService = (config?: Partial<ValidationConfig>) => {
  return new DateValidationService(config);
};

// Factory function to create service with persistent configuration
export const createDateValidationServiceWithPersistence = async (): Promise<DateValidationService> => {
  try {
    // Import the advanced date validation service with persistence
    const { ResumeDateValidationService } = await import('./date-validation/service');
    const { DateValidationLogger } = await import('./date-validation/logger');
    
    const service = await ResumeDateValidationService.createWithStoredConfig();
    const logger = DateValidationLogger.getInstance();
    
    logger.log('info', 'config', 'service_created_with_persistence', {
      timestamp: new Date().toISOString()
    });
    
    // Return a wrapper that matches the simple interface
    return {
      validateResumeDates: (resumeText: string) => {
        const operationId = logger.startPerformanceMonitoring('validate_resume_dates_wrapper', {
          resumeLength: resumeText?.length || 0
        });
        
        try {
          const result = service.validateResumeDates(resumeText);
          
          logger.endPerformanceMonitoring(operationId, {
            success: true,
            issuesFound: result.issues.length,
            warningsFound: result.warnings.length,
            suggestionsFound: result.suggestions.length
          });
          
          // Convert the advanced result format to the simple format
          return {
            isValid: result.isValid,
            issues: result.issues.map(issue => ({
              type: issue.type,
              category: issue.category,
              message: issue.message,
              detectedDate: issue.detectedDate,
              suggestedFix: issue.suggestedFix,
              confidence: issue.confidence
            })),
            warnings: result.warnings.map(warning => ({
              message: warning.message,
              category: warning.category
            })),
            suggestions: result.suggestions.map(suggestion => ({
              message: suggestion.reason,
              suggestedDate: suggestion.suggestedDate,
              confidence: suggestion.confidence
            }))
          };
        } catch (error) {
          logger.endPerformanceMonitoring(operationId, { success: false });
          logger.log('error', 'validation', 'wrapper_validation_failed', {
            resumeLength: resumeText?.length || 0
          }, undefined, error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      }
    } as DateValidationService;
  } catch (error) {
    console.error('Failed to create date validation service with persistence, falling back to simple service:', error);
    return new DateValidationService();
  }
};

// Helper function to format validation results for AI consumption
export const formatValidationResultsForAI = (results: DateValidationResult): string => {
  if (results.isValid && results.issues.length === 0) {
    return "Date validation: All dates appear reasonable and consistent.";
  }

  let summary = "Date validation findings:\n";
  
  results.issues.forEach(issue => {
    summary += `- ${issue.type.toUpperCase()}: ${issue.message}`;
    if (issue.suggestedFix) {
      summary += ` (Suggested: ${issue.suggestedFix})`;
    }
    summary += "\n";
  });

  return summary;
};

// Helper function to get validation analytics
export const getValidationAnalytics = async () => {
  try {
    const { DateValidationLogger } = await import('./date-validation/logger');
    const logger = DateValidationLogger.getInstance();
    return logger.getAnalytics();
  } catch (error) {
    console.error('Failed to get validation analytics:', error);
    return null;
  }
};

// Helper function to export validation logs
export const exportValidationLogs = async () => {
  try {
    const { DateValidationLogger } = await import('./date-validation/logger');
    const logger = DateValidationLogger.getInstance();
    return logger.exportLogs();
  } catch (error) {
    console.error('Failed to export validation logs:', error);
    return null;
  }
};

// Helper function to get recent edge cases
export const getRecentEdgeCases = async (count: number = 20) => {
  try {
    const { DateValidationLogger } = await import('./date-validation/logger');
    const logger = DateValidationLogger.getInstance();
    return logger.getRecentEdgeCases(count);
  } catch (error) {
    console.error('Failed to get recent edge cases:', error);
    return [];
  }
};