import type {
  DateValidationService,
  DateValidationResult,
  EducationPeriod,
  WorkExperience,
  ValidationIssue,
  ValidationConfig,
  ExtractedDate,
  ValidationContext,
  ValidationRule,
  ValidationWarning,
  DateSuggestion
} from './types';
import { ResumeDateParser } from './parser';
import { DateSuggestionGenerator } from './suggestion-generator';
import { DateValidationConfigManager } from './config';
import { DateValidationLogger } from './logger';
import { EDUCATION_KEYWORDS, WORK_KEYWORDS, VALIDATION_SEVERITY, VALIDATION_CATEGORY } from './constants';

/**
 * Main service for date validation in resumes
 * This is a placeholder implementation that will be expanded in task 3
 */
export class ResumeDateValidationService implements DateValidationService {
  private configManager: DateValidationConfigManager;
  private parser: ResumeDateParser;
  private suggestionGenerator: DateSuggestionGenerator;
  private logger: DateValidationLogger;

  constructor(config: ValidationConfig | DateValidationConfigManager) {
    if (config instanceof DateValidationConfigManager) {
      this.configManager = config;
    } else {
      this.configManager = new DateValidationConfigManager(config);
    }

    this.parser = new ResumeDateParser();
    this.suggestionGenerator = new DateSuggestionGenerator();
    this.logger = DateValidationLogger.getInstance();

    // Enable debug mode for comprehensive date logging
    this.configManager.setDebugMode(true);
    this.logger.setDebugMode(true);

    this.logger.log('info', 'validation', 'service_initialized', {
      hasConfigManager: !!this.configManager,
      hasParser: !!this.parser,
      hasSuggestionGenerator: !!this.suggestionGenerator
    });
  }

  /**
   * Create service with configuration loaded from persistent storage
   */
  static async createWithStoredConfig(): Promise<ResumeDateValidationService> {
    const configManager = await DateValidationConfigManager.createFromStorage();
    return new ResumeDateValidationService(configManager);
  }

  /**
   * Initialize the service (load configuration from storage if not already done)
   */
  async initialize(): Promise<void> {
    if (!this.configManager.isConfigInitialized()) {
      await this.configManager.initialize();
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): ValidationConfig {
    return this.configManager.getConfig();
  }

  /**
   * Update the configuration (with persistence)
   */
  async updateConfig(updates: Partial<ValidationConfig>): Promise<void> {
    await this.configManager.updateConfig(updates);
  }

  /**
   * Update the configuration synchronously (without persistence)
   */
  updateConfigSync(updates: Partial<ValidationConfig>): void {
    this.configManager.updateConfigSync(updates);
  }

  validateResumeDates(resumeText: string): DateValidationResult {
    const operationId = this.logger.startPerformanceMonitoring('validate_resume_dates', {
      resumeLength: resumeText?.length || 0
    });

    this.configManager.logDate('Validation started', new Date(), 'Resume validation process');

    try {
      // Input validation with comprehensive error handling
      if (!resumeText || typeof resumeText !== 'string') {
        this.logger.log('error', 'validation', 'invalid_input', {
          inputType: typeof resumeText,
          inputLength: resumeText?.length || 0
        });
        return this.createEmptyValidationResult('Invalid resume text provided');
      }

      if (resumeText.trim().length === 0) {
        this.logger.log('warn', 'validation', 'empty_input', {
          originalLength: resumeText.length
        });
        return this.createEmptyValidationResult('Empty resume text provided');
      }

      this.logger.log('info', 'validation', 'validation_started', {
        resumeLength: resumeText.length,
        resumePreview: resumeText.substring(0, 100) + (resumeText.length > 100 ? '...' : '')
      });

      let educationPeriods: EducationPeriod[] = [];
      let workExperience: WorkExperience[] = [];

      // Parse education dates with error handling
      const educationParsingId = this.logger.startPerformanceMonitoring('parse_education_dates');
      try {
        educationPeriods = this.parseEducationDates(resumeText);
        this.logger.endPerformanceMonitoring(educationParsingId, {
          periodsFound: educationPeriods.length,
          success: true
        });
        this.logger.log('info', 'parsing', 'education_parsing_completed', {
          periodsFound: educationPeriods.length,
          periods: educationPeriods.map(p => ({
            institution: p.institution,
            startDate: p.startDate?.toISOString(),
            endDate: p.endDate?.toISOString(),
            isOngoing: p.isOngoing
          }))
        });
      } catch (error) {
        this.logger.endPerformanceMonitoring(educationParsingId, { success: false });
        this.logger.log('error', 'parsing', 'education_parsing_failed', {
          resumeLength: resumeText.length
        }, undefined, error instanceof Error ? error : new Error(String(error)));
        educationPeriods = []; // Continue with empty array
      }

      // Parse work experience with error handling
      const workParsingId = this.logger.startPerformanceMonitoring('parse_work_experience');
      try {
        workExperience = this.parseWorkExperience(resumeText);
        this.logger.endPerformanceMonitoring(workParsingId, {
          experiencesFound: workExperience.length,
          success: true
        });
        this.logger.log('info', 'parsing', 'work_parsing_completed', {
          experiencesFound: workExperience.length,
          experiences: workExperience.map(w => ({
            company: w.company,
            position: w.position,
            startDate: w.startDate?.toISOString(),
            endDate: w.endDate?.toISOString(),
            isOngoing: w.isOngoing
          }))
        });
      } catch (error) {
        this.logger.endPerformanceMonitoring(workParsingId, { success: false });
        this.logger.log('error', 'parsing', 'work_parsing_failed', {
          resumeLength: resumeText.length
        }, undefined, error instanceof Error ? error : new Error(String(error)));
        workExperience = []; // Continue with empty array
      }

      // Log all extracted dates for debugging
      try {
        this.logAllExtractedDates(educationPeriods, workExperience);
        this.logger.log('debug', 'validation', 'dates_extracted', {
          totalEducationPeriods: educationPeriods.length,
          totalWorkExperiences: workExperience.length,
          allDates: this.extractAllDatesForLogging(educationPeriods, workExperience)
        });
      } catch (error) {
        this.logger.log('error', 'validation', 'date_extraction_logging_failed', {}, undefined,
          error instanceof Error ? error : new Error(String(error)));
      }

      // Create validation context with error handling
      let context: ValidationContext;
      try {
        context = {
          currentDate: new Date(),
          educationPeriods,
          workExperience,
          config: this.configManager.getConfig(),
          resumeText
        };
      } catch (error) {
        console.error('[ResumeDateValidationService] Error creating validation context:', error);
        return this.createEmptyValidationResult('Failed to create validation context');
      }

      // Apply all validation rules with comprehensive error handling
      const allIssues: ValidationIssue[] = [];
      const warnings: ValidationWarning[] = [];
      const suggestions: DateSuggestion[] = [];

      // Apply built-in education validation rules
      const educationValidationId = this.logger.startPerformanceMonitoring('validate_education_timeline');
      try {
        const educationIssues = this.validateEducationTimeline(educationPeriods);
        allIssues.push(...educationIssues);
        this.logger.endPerformanceMonitoring(educationValidationId, {
          issuesFound: educationIssues.length,
          success: true
        });
        this.logger.log('info', 'validation', 'education_validation_completed', {
          issuesFound: educationIssues.length,
          issueTypes: this.categorizeIssueTypes(educationIssues),
          periodsValidated: educationPeriods.length
        });
      } catch (error) {
        this.logger.endPerformanceMonitoring(educationValidationId, { success: false });
        this.logger.log('error', 'validation', 'education_validation_failed', {
          educationPeriodsCount: educationPeriods.length
        }, undefined, error instanceof Error ? error : new Error(String(error)));
        warnings.push({
          category: 'education',
          message: 'Education timeline validation encountered an error and was skipped',
          context: 'System error during validation'
        });
      }

      // Apply built-in work validation rules
      const workValidationId = this.logger.startPerformanceMonitoring('validate_work_timeline');
      try {
        const workIssues = this.validateWorkTimeline(workExperience);
        allIssues.push(...workIssues);
        this.logger.endPerformanceMonitoring(workValidationId, {
          issuesFound: workIssues.length,
          success: true
        });
        this.logger.log('info', 'validation', 'work_validation_completed', {
          issuesFound: workIssues.length,
          issueTypes: this.categorizeIssueTypes(workIssues),
          experiencesValidated: workExperience.length
        });
      } catch (error) {
        this.logger.endPerformanceMonitoring(workValidationId, { success: false });
        this.logger.log('error', 'validation', 'work_validation_failed', {
          workExperienceCount: workExperience.length
        }, undefined, error instanceof Error ? error : new Error(String(error)));
        warnings.push({
          category: 'work',
          message: 'Work timeline validation encountered an error and was skipped',
          context: 'System error during validation'
        });
      }

      // Apply configurable validation rules
      const ruleValidationId = this.logger.startPerformanceMonitoring('apply_validation_rules');
      try {
        const ruleBasedIssues = this.applyValidationRules(context);
        allIssues.push(...ruleBasedIssues);
        this.logger.endPerformanceMonitoring(ruleValidationId, {
          issuesFound: ruleBasedIssues.length,
          success: true
        });
        this.logger.log('info', 'validation', 'rule_validation_completed', {
          issuesFound: ruleBasedIssues.length,
          issueTypes: this.categorizeIssueTypes(ruleBasedIssues)
        });
      } catch (error) {
        this.logger.endPerformanceMonitoring(ruleValidationId, { success: false });
        this.logger.log('error', 'validation', 'rule_validation_failed', {}, undefined,
          error instanceof Error ? error : new Error(String(error)));
        warnings.push({
          category: 'general',
          message: 'Advanced validation rules encountered an error and were skipped',
          context: 'System error during rule application'
        });
      }

      // Generate intelligent suggestions for all issues
      const suggestionId = this.logger.startPerformanceMonitoring('generate_suggestions');
      try {
        if (this.configManager.isTypoDetectionEnabled()) {
          const intelligentSuggestions = this.suggestionGenerator.generateSuggestions(context, allIssues);
          suggestions.push(...intelligentSuggestions);
          this.logger.endPerformanceMonitoring(suggestionId, {
            suggestionsGenerated: intelligentSuggestions.length,
            success: true
          });
          this.logger.log('info', 'validation', 'suggestion_generation_completed', {
            suggestionsGenerated: intelligentSuggestions.length,
            issuesProcessed: allIssues.length
          });
        } else {
          this.logger.endPerformanceMonitoring(suggestionId, { skipped: true });
          this.logger.log('info', 'validation', 'suggestion_generation_skipped', {
            reason: 'typo_detection_disabled'
          });
        }
      } catch (error) {
        this.logger.endPerformanceMonitoring(suggestionId, { success: false });
        this.logger.log('error', 'validation', 'suggestion_generation_failed', {
          issuesCount: allIssues.length
        }, undefined, error instanceof Error ? error : new Error(String(error)));
        warnings.push({
          category: 'general',
          message: 'Suggestion generation encountered an error and was skipped',
          context: 'System error during suggestion generation'
        });
      }

      // Convert low-confidence issues to warnings
      let issues: ValidationIssue[] = [];
      try {
        const categorized = this.categorizeIssuesBySeverity(allIssues);
        issues = categorized.issues;
        warnings.push(...categorized.convertedWarnings);
        console.log('[ResumeDateValidationService] Issue categorization completed: ' + issues.length + ' final issues, ' + categorized.convertedWarnings.length + ' converted to warnings');
      } catch (error) {
        console.error('[ResumeDateValidationService] Error categorizing issues by severity:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          allIssuesCount: allIssues.length
        });
        // Use all issues as-is if categorization fails
        issues = allIssues;
      }

      // Determine overall validation result
      const criticalIssues = issues.filter(issue => issue.type === 'critical');
      const isValid = criticalIssues.length === 0;

      const result = {
        isValid,
        issues,
        warnings,
        suggestions
      };

      const duration = this.logger.endPerformanceMonitoring(operationId, {
        isValid,
        totalIssues: issues.length,
        criticalIssues: criticalIssues.length,
        warnings: warnings.length,
        suggestions: suggestions.length,
        educationPeriods: educationPeriods.length,
        workExperience: workExperience.length,
        success: true
      });

      this.configManager.logDate('Validation completed', new Date(), `Found ${issues.length} issues, ${warnings.length} warnings, ${suggestions.length} suggestions in ${duration?.toFixed(2)}ms`);

      // Log validation results for analytics
      this.logger.logValidationResults(
        resumeText.length,
        issues.length,
        warnings.length,
        suggestions.length,
        duration ?? 0,
        true
      );

      // Log edge cases if any unusual patterns were found
      this.logEdgeCasesFromResults(issues, warnings, resumeText);

      return result;

    } catch (error) {
      const duration = this.logger.endPerformanceMonitoring(operationId, { success: false });

      this.logger.log('error', 'validation', 'validation_critical_error', {
        resumeTextLength: resumeText?.length || 0,
        timestamp: new Date().toISOString()
      }, duration ?? undefined, error instanceof Error ? error : new Error(String(error)));

      this.configManager.logDate('Validation failed', new Date(), `Critical error after ${duration?.toFixed(2)}ms: ${error instanceof Error ? error.message : String(error)}`);

      // Log validation results for analytics (failed case)
      this.logger.logValidationResults(
        resumeText?.length || 0,
        0,
        0,
        0,
        duration ?? 0,
        false
      );

      // Graceful degradation - return safe result
      return this.createEmptyValidationResult('Date validation temporarily unavailable due to an internal error');
    }
  }

  parseEducationDates(text: string): EducationPeriod[] {
    try {
      if (!text || typeof text !== 'string') {
        console.warn('[ResumeDateValidationService] parseEducationDates: Invalid text input');
        return [];
      }

      if (text.trim().length === 0) {
        console.warn('[ResumeDateValidationService] parseEducationDates: Empty text input');
        return [];
      }

      console.log('[ResumeDateValidationService] Starting education date parsing for text length:', text.length);

      const educationPeriods: EducationPeriod[] = [];
      let educationSections: string[] = [];

      try {
        educationSections = this.extractEducationSections(text);
        console.log('[ResumeDateValidationService] Extracted ' + educationSections.length + ' education sections');
      } catch (error) {
        console.error('[ResumeDateValidationService] Error extracting education sections:', {
          error: error instanceof Error ? error.message : String(error),
          textLength: text.length
        });
        return [];
      }

      for (let i = 0; i < educationSections.length; i++) {
        try {
          const section = educationSections[i];
          console.log('[ResumeDateValidationService] Parsing education section ' + (i + 1) + '/' + educationSections.length + ':', {
            sectionLength: section.length,
            preview: section.substring(0, 100) + (section.length > 100 ? '...' : '')
          });

          const period = this.parseEducationSection(section);
          if (period) {
            educationPeriods.push(period);
            console.log('[ResumeDateValidationService] Successfully parsed education period:', {
              institution: period.institution,
              degree: period.degree,
              startDate: period.startDate?.toLocaleDateString(),
              endDate: period.endDate?.toLocaleDateString(),
              isOngoing: period.isOngoing,
              confidence: period.confidence
            });
          } else {
            console.warn('[ResumeDateValidationService] Failed to parse education section ' + (i + 1));
          }
        } catch (sectionError) {
          console.error('[ResumeDateValidationService] Error parsing education section ' + (i + 1) + ':', {
            error: sectionError instanceof Error ? sectionError.message : String(sectionError),
            sectionIndex: i,
            sectionLength: educationSections[i]?.length || 0
          });
          // Continue with next section
        }
      }

      console.log('[ResumeDateValidationService] Education date parsing completed: ' + educationPeriods.length + ' periods extracted');
      return educationPeriods;

    } catch (error) {
      console.error('[ResumeDateValidationService] Critical error in parseEducationDates:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        textLength: text?.length || 0
      });
      return [];
    }
  }

  parseWorkExperience(text: string): WorkExperience[] {
    try {
      if (!text || typeof text !== 'string') {
        console.warn('[ResumeDateValidationService] parseWorkExperience: Invalid text input');
        return [];
      }

      if (text.trim().length === 0) {
        console.warn('[ResumeDateValidationService] parseWorkExperience: Empty text input');
        return [];
      }

      console.log('[ResumeDateValidationService] Starting work experience parsing for text length:', text.length);

      const workExperiences: WorkExperience[] = [];
      let workSections: string[] = [];

      try {
        workSections = this.extractWorkSections(text);
        console.log('[ResumeDateValidationService] Extracted ' + workSections.length + ' work sections');
      } catch (error) {
        console.error('[ResumeDateValidationService] Error extracting work sections:', {
          error: error instanceof Error ? error.message : String(error),
          textLength: text.length
        });
        return [];
      }

      for (let i = 0; i < workSections.length; i++) {
        try {
          const section = workSections[i];
          console.log('[ResumeDateValidationService] Parsing work section ' + (i + 1) + '/' + workSections.length + ':', {
            sectionLength: section.length,
            preview: section.substring(0, 100) + (section.length > 100 ? '...' : '')
          });

          const experience = this.parseWorkSection(section);
          if (experience) {
            workExperiences.push(experience);
            console.log('[ResumeDateValidationService] Successfully parsed work experience:', {
              company: experience.company,
              position: experience.position,
              startDate: experience.startDate?.toLocaleDateString(),
              endDate: experience.endDate?.toLocaleDateString(),
              isOngoing: experience.isOngoing,
              confidence: experience.confidence
            });
          } else {
            console.warn('[ResumeDateValidationService] Failed to parse work section ' + (i + 1));
          }
        } catch (sectionError) {
          console.error('[ResumeDateValidationService] Error parsing work section ' + (i + 1) + ':', {
            error: sectionError instanceof Error ? sectionError.message : String(sectionError),
            sectionIndex: i,
            sectionLength: workSections[i]?.length || 0
          });
          // Continue with next section
        }
      }

      console.log('[ResumeDateValidationService] Work experience parsing completed: ' + workExperiences.length + ' experiences extracted');
      return workExperiences;

    } catch (error) {
      console.error('[ResumeDateValidationService] Critical error in parseWorkExperience:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        textLength: text?.length || 0
      });
      return [];
    }
  }

  validateEducationTimeline(education: EducationPeriod[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const currentDate = new Date();

    for (const period of education) {
      // Validate future graduation dates (within 4 years)
      if (period.endDate && !period.isOngoing) {
        const yearsDifference = (period.endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

        if (yearsDifference > this.configManager.getConfig().maxFutureEducationYears) {
          issues.push({
            type: 'critical',
            category: 'education',
            message: `Graduation date ${period.endDate.getFullYear()} is more than ${this.configManager.getConfig().maxFutureEducationYears} years in the future, which seems unrealistic.`,
            detectedDate: period.endDate.toLocaleDateString(),
            suggestedFix: `Consider checking if this should be ${period.endDate.getFullYear() - 10} instead.`,
            confidence: 0.9
          });
        } else if (yearsDifference > 2) {
          issues.push({
            type: 'warning',
            category: 'education',
            message: `Graduation date ${period.endDate.getFullYear()} is ${Math.ceil(yearsDifference)} years in the future. Please verify this is correct.`,
            detectedDate: period.endDate.toLocaleDateString(),
            confidence: 0.7
          });
        }
      }

      // Validate start dates in the future
      if (period.startDate) {
        const monthsDifference = (period.startDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

        if (monthsDifference > 3) {
          issues.push({
            type: 'critical',
            category: 'education',
            message: `Education start date ${period.startDate.toLocaleDateString()} is more than 3 months in the future.`,
            detectedDate: period.startDate.toLocaleDateString(),
            suggestedFix: `Verify this date is correct or consider if it should be ${period.startDate.getFullYear() - 1}.`,
            confidence: 0.85
          });
        }
      }

      // Validate timeline consistency (start before end)
      if (period.startDate && period.endDate && !period.isOngoing) {
        if (period.startDate.getTime() >= period.endDate.getTime()) {
          issues.push({
            type: 'critical',
            category: 'education',
            message: `Education start date (${period.startDate.toLocaleDateString()}) is after or same as end date (${period.endDate.toLocaleDateString()}).`,
            detectedDate: `${period.startDate.toLocaleDateString()} - ${period.endDate.toLocaleDateString()}`,
            suggestedFix: 'Please check and correct the date order.',
            confidence: 0.95
          });
        }
      }

      // Validate reasonable education duration
      if (period.startDate && period.endDate && !period.isOngoing) {
        const durationYears = (period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

        if (durationYears > 10) {
          issues.push({
            type: 'warning',
            category: 'education',
            message: `Education period of ${Math.ceil(durationYears)} years seems unusually long for ${period.institution}.`,
            detectedDate: `${period.startDate.toLocaleDateString()} - ${period.endDate.toLocaleDateString()}`,
            confidence: 0.6
          });
        } else if (durationYears < 0.5 && period.degree?.toLowerCase().includes('degree')) {
          issues.push({
            type: 'suggestion',
            category: 'education',
            message: `Education period of ${Math.ceil(durationYears * 12)} months seems short for a degree program.`,
            detectedDate: `${period.startDate.toLocaleDateString()} - ${period.endDate.toLocaleDateString()}`,
            confidence: 0.5
          });
        }
      }

      // Validate ongoing education with reasonable start dates
      if (period.isOngoing && period.startDate) {
        const yearsSinceStart = (currentDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

        if (yearsSinceStart > 8) {
          issues.push({
            type: 'warning',
            category: 'education',
            message: `Ongoing education started ${Math.ceil(yearsSinceStart)} years ago. Please verify this is still current.`,
            detectedDate: period.startDate.toLocaleDateString(),
            confidence: 0.7
          });
        }
      }
    }

    // Validate overlapping education periods
    for (let i = 0; i < education.length; i++) {
      for (let j = i + 1; j < education.length; j++) {
        const period1 = education[i];
        const period2 = education[j];

        if (this.hasEducationOverlap(period1, period2)) {
          // Only flag as issue if it's not common scenarios (like double major, concurrent programs)
          const isLikelyValid = this.isValidEducationOverlap(period1, period2);

          if (!isLikelyValid) {
            issues.push({
              type: 'suggestion',
              category: 'education',
              message: `Overlapping education periods detected: ${period1.institution} and ${period2.institution}. Please verify if this is correct.`,
              detectedDate: `${period1.startDate?.toLocaleDateString() || 'Unknown'} - ${period1.endDate?.toLocaleDateString() || 'Present'} overlaps with ${period2.startDate?.toLocaleDateString() || 'Unknown'} - ${period2.endDate?.toLocaleDateString() || 'Present'}`,
              confidence: 0.6
            });
          }
        }
      }
    }

    return issues;
  }

  validateWorkTimeline(work: WorkExperience[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const currentDate = new Date();

    for (const experience of work) {
      // Validate future employment dates (within 3 months)
      if (experience.endDate && !experience.isOngoing) {
        const monthsDifference = (experience.endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

        if (monthsDifference > this.configManager.getConfig().maxFutureWorkMonths) {
          issues.push({
            type: 'critical',
            category: 'work',
            message: `Work end date ${experience.endDate.toLocaleDateString()} is more than ${this.configManager.getConfig().maxFutureWorkMonths} months in the future.`,
            detectedDate: experience.endDate.toLocaleDateString(),
            suggestedFix: `Consider checking if this should be ${experience.endDate.getFullYear() - 1} or if this position is ongoing.`,
            confidence: 0.9
          });
        } else if (monthsDifference > 1) {
          issues.push({
            type: 'warning',
            category: 'work',
            message: `Work end date ${experience.endDate.toLocaleDateString()} is ${Math.ceil(monthsDifference)} months in the future. Please verify this is correct.`,
            detectedDate: experience.endDate.toLocaleDateString(),
            confidence: 0.7
          });
        }
      }

      // Validate start dates in the future
      if (experience.startDate) {
        const monthsDifference = (experience.startDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

        if (monthsDifference > this.configManager.getConfig().maxFutureWorkMonths) {
          issues.push({
            type: 'critical',
            category: 'work',
            message: `Work start date ${experience.startDate.toLocaleDateString()} is more than ${this.configManager.getConfig().maxFutureWorkMonths} months in the future.`,
            detectedDate: experience.startDate.toLocaleDateString(),
            suggestedFix: `Verify this date is correct or consider if it should be ${experience.startDate.getFullYear() - 1}.`,
            confidence: 0.85
          });
        }
      }

      // Validate timeline consistency (start before end)
      if (experience.startDate && experience.endDate && !experience.isOngoing) {
        if (experience.startDate.getTime() >= experience.endDate.getTime()) {
          issues.push({
            type: 'critical',
            category: 'work',
            message: `Work start date (${experience.startDate.toLocaleDateString()}) is after or same as end date (${experience.endDate.toLocaleDateString()}) at ${experience.company}.`,
            detectedDate: `${experience.startDate.toLocaleDateString()} - ${experience.endDate.toLocaleDateString()}`,
            suggestedFix: 'Please check and correct the date order.',
            confidence: 0.95
          });
        }
      }

      // Validate reasonable employment duration
      if (experience.startDate && experience.endDate && !experience.isOngoing) {
        const durationDays = (experience.endDate.getTime() - experience.startDate.getTime()) / (1000 * 60 * 60 * 24);

        if (durationDays < 1) {
          issues.push({
            type: 'critical',
            category: 'work',
            message: `Work period at ${experience.company} appears to be less than one day.`,
            detectedDate: `${experience.startDate.toLocaleDateString()} - ${experience.endDate.toLocaleDateString()}`,
            suggestedFix: 'Please verify the dates are correct.',
            confidence: 0.9
          });
        } else if (durationDays < 7) {
          issues.push({
            type: 'warning',
            category: 'work',
            message: `Work period at ${experience.company} is very short (${Math.ceil(durationDays)} days).`,
            detectedDate: `${experience.startDate.toLocaleDateString()} - ${experience.endDate.toLocaleDateString()}`,
            confidence: 0.7
          });
        }
      }

      // Validate ongoing work with reasonable start dates
      if (experience.isOngoing && experience.startDate) {
        const yearsSinceStart = (currentDate.getTime() - experience.startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

        if (yearsSinceStart > 15) {
          issues.push({
            type: 'suggestion',
            category: 'work',
            message: `Current position at ${experience.company} started ${Math.ceil(yearsSinceStart)} years ago. Consider if this is still accurate.`,
            detectedDate: experience.startDate.toLocaleDateString(),
            confidence: 0.6
          });
        }
      }
    }

    // Validate work timeline overlaps and gaps
    const sortedWork = [...work].sort((a, b) => {
      if (!a.startDate || !b.startDate) return 0;
      return a.startDate.getTime() - b.startDate.getTime();
    });

    for (let i = 0; i < sortedWork.length; i++) {
      for (let j = i + 1; j < sortedWork.length; j++) {
        const work1 = sortedWork[i];
        const work2 = sortedWork[j];

        if (this.hasWorkOverlap(work1, work2)) {
          // Check if overlap is reasonable (part-time, consulting, etc.)
          const isLikelyValid = this.isValidWorkOverlap(work1, work2);

          if (!isLikelyValid) {
            issues.push({
              type: 'warning',
              category: 'work',
              message: `Overlapping work periods detected: ${work1.company} and ${work2.company}. Please verify if this is correct.`,
              detectedDate: `${work1.startDate?.toLocaleDateString() || 'Unknown'} - ${work1.endDate?.toLocaleDateString() || 'Present'} overlaps with ${work2.startDate?.toLocaleDateString() || 'Unknown'} - ${work2.endDate?.toLocaleDateString() || 'Present'}`,
              confidence: 0.7
            });
          }
        }
      }

      // Check for significant gaps between consecutive positions
      if (i < sortedWork.length - 1) {
        const currentWork = sortedWork[i];
        const nextWork = sortedWork[i + 1];

        if (currentWork.endDate && nextWork.startDate && !currentWork.isOngoing) {
          const gapMonths = (nextWork.startDate.getTime() - currentWork.endDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

          if (gapMonths > 12) {
            issues.push({
              type: 'suggestion',
              category: 'work',
              message: `Gap of ${Math.ceil(gapMonths)} months between ${currentWork.company} and ${nextWork.company}. Consider explaining significant employment gaps.`,
              detectedDate: `${currentWork.endDate.toLocaleDateString()} to ${nextWork.startDate.toLocaleDateString()}`,
              confidence: 0.5
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * Extract education sections from resume text
   */
  private extractEducationSections(text: string): string[] {
    const sections: string[] = [];
    const lines = text.split('\n');
    let currentSection = '';
    let inEducationSection = false;
    let sectionStarted = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lowerLine = line.toLowerCase();

      // Check if this line starts an education section
      if (this.isEducationSectionHeader(lowerLine)) {
        // Save previous section if it exists
        if (sectionStarted && currentSection.trim()) {
          sections.push(currentSection.trim());
        }
        inEducationSection = true;
        sectionStarted = true;
        currentSection = line + '\n';
        continue;
      }

      // Check if this line starts a different section (work, skills, etc.)
      if (this.isNonEducationSectionHeader(lowerLine) && inEducationSection) {
        if (currentSection.trim()) {
          sections.push(currentSection.trim());
        }
        inEducationSection = false;
        sectionStarted = false;
        currentSection = '';
        continue;
      }

      // If we're in an education section, add the line
      if (inEducationSection) {
        currentSection += line + '\n';
      } else if (!sectionStarted) {
        // Look for education-related content in the line
        if (this.containsEducationKeywords(lowerLine)) {
          // Extract this line and some context as a potential education entry
          const contextLines = this.getContextLines(lines, i, 2);
          sections.push(contextLines.join('\n'));
        }
      }
    }

    // Add the last section if it's education-related
    if (inEducationSection && currentSection.trim()) {
      sections.push(currentSection.trim());
    }

    return sections;
  }

  /**
   * Extract work experience sections from resume text
   */
  private extractWorkSections(text: string): string[] {
    const sections: string[] = [];
    const lines = text.split('\n');
    let currentSection = '';
    let inWorkSection = false;
    let sectionStarted = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lowerLine = line.toLowerCase();

      // Check if this line starts a work section
      if (this.isWorkSectionHeader(lowerLine)) {
        // Save previous section if it exists
        if (sectionStarted && currentSection.trim()) {
          sections.push(currentSection.trim());
        }
        inWorkSection = true;
        sectionStarted = true;
        currentSection = line + '\n';
        continue;
      }

      // Check if this line starts a different section
      if (this.isNonWorkSectionHeader(lowerLine) && inWorkSection) {
        if (currentSection.trim()) {
          sections.push(currentSection.trim());
        }
        inWorkSection = false;
        sectionStarted = false;
        currentSection = '';
        continue;
      }

      // If we're in a work section, add the line
      if (inWorkSection) {
        currentSection += line + '\n';
      } else if (!sectionStarted) {
        // Look for work-related content in the line
        if (this.containsWorkKeywords(lowerLine)) {
          // Extract this line and some context as a potential work entry
          const contextLines = this.getContextLines(lines, i, 2);
          sections.push(contextLines.join('\n'));
        }
      }
    }

    // Add the last section if it's work-related
    if (inWorkSection && currentSection.trim()) {
      sections.push(currentSection.trim());
    }

    return sections;
  }

  /**
   * Parse a single education section to extract education period
   */
  private parseEducationSection(sectionText: string): EducationPeriod | null {
    const extractedDates = this.parser.extractDatesFromText(sectionText);

    if (extractedDates.length === 0) {
      return null;
    }

    // Extract institution and degree information
    const lines = sectionText.split('\n').map(line => line.trim()).filter(line => line);
    const institution = this.extractInstitution(lines);
    const degree = this.extractDegree(lines);

    // Determine start and end dates
    const { startDate, endDate, isOngoing } = this.determineDateRange(extractedDates);

    // Calculate confidence based on the quality of extracted information
    const confidence = this.calculateEducationConfidence(institution, degree, extractedDates);

    return {
      institution: institution || 'Unknown Institution',
      degree: degree || undefined,
      startDate,
      endDate,
      isOngoing,
      originalText: sectionText,
      confidence
    };
  }

  /**
   * Parse a single work section to extract work experience
   */
  private parseWorkSection(sectionText: string): WorkExperience | null {
    const extractedDates = this.parser.extractDatesFromText(sectionText);

    if (extractedDates.length === 0) {
      return null;
    }

    // Extract company and position information
    const lines = sectionText.split('\n').map(line => line.trim()).filter(line => line);
    const company = this.extractCompany(lines);
    const position = this.extractPosition(lines);

    // Determine start and end dates
    const { startDate, endDate, isOngoing } = this.determineDateRange(extractedDates);

    // Calculate confidence based on the quality of extracted information
    const confidence = this.calculateWorkConfidence(company, position, extractedDates);

    return {
      company: company || 'Unknown Company',
      position: position || 'Unknown Position',
      startDate,
      endDate,
      isOngoing,
      originalText: sectionText,
      confidence
    };
  }

  /**
   * Determine start and end dates from extracted dates
   */
  private determineDateRange(extractedDates: ExtractedDate[]): {
    startDate: Date | null;
    endDate: Date | null;
    isOngoing: boolean;
  } {
    if (extractedDates.length === 0) {
      return { startDate: null, endDate: null, isOngoing: false };
    }

    // Check for ongoing status
    const ongoingDate = extractedDates.find(date => date.parsedDate?.isOngoing);
    const isOngoing = !!ongoingDate;

    // Filter out ongoing dates for start/end date determination
    const actualDates = extractedDates
      .filter(date => date.parsedDate && !date.parsedDate.isOngoing)
      .map(date => date.parsedDate!)
      .sort((a, b) => a.normalized.getTime() - b.normalized.getTime());

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (actualDates.length === 1) {
      // Single date - could be start or end depending on context
      if (isOngoing) {
        startDate = actualDates[0].normalized;
        endDate = null;
      } else {
        // Assume it's an end date (graduation, end of employment)
        endDate = actualDates[0].normalized;
      }
    } else if (actualDates.length >= 2) {
      // Multiple dates - first is start, last is end
      startDate = actualDates[0].normalized;
      endDate = isOngoing ? null : actualDates[actualDates.length - 1].normalized;
    }

    return { startDate, endDate, isOngoing };
  }

  /**
   * Extract institution name from education section lines
   */
  private extractInstitution(lines: string[]): string | null {
    // Look for lines that contain education keywords and seem like institution names
    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      // Skip lines that are clearly not institution names
      if (this.isDateLine(line) || this.isDegreeOnlyLine(line)) {
        continue;
      }

      // Look for institution indicators
      if (lowerLine.includes('university') ||
        lowerLine.includes('college') ||
        lowerLine.includes('school') ||
        lowerLine.includes('institute')) {
        return line.trim();
      }
    }

    // If no clear institution found, return the first substantial line
    const substantialLine = lines.find(line =>
      line.trim().length > 5 &&
      !this.isDateLine(line) &&
      !this.isDegreeOnlyLine(line)
    );

    return substantialLine?.trim() || null;
  }

  /**
   * Extract degree information from education section lines
   */
  private extractDegree(lines: string[]): string | null {
    const degreeKeywords = [
      'bachelor', 'master', 'phd', 'doctorate', 'diploma', 'certificate',
      'b.s.', 'b.a.', 'm.s.', 'm.a.', 'ph.d.', 'mba', 'degree'
    ];

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      if (degreeKeywords.some(keyword => lowerLine.includes(keyword))) {
        return line.trim();
      }
    }

    return null;
  }

  /**
   * Extract company name from work section lines
   */
  private extractCompany(lines: string[]): string | null {
    // Look for lines that seem like company names
    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      // Skip lines that are clearly not company names
      if (this.isDateLine(line) || this.isPositionOnlyLine(line)) {
        continue;
      }

      // Look for company indicators
      if (lowerLine.includes('inc') ||
        lowerLine.includes('corp') ||
        lowerLine.includes('ltd') ||
        lowerLine.includes('llc') ||
        lowerLine.includes('company')) {
        return line.trim();
      }
    }

    // If no clear company found, return the first substantial line that's not a position
    const substantialLine = lines.find(line =>
      line.trim().length > 3 &&
      !this.isDateLine(line) &&
      !this.isPositionOnlyLine(line)
    );

    return substantialLine?.trim() || null;
  }

  /**
   * Extract position/title from work section lines
   */
  private extractPosition(lines: string[]): string | null {
    const positionKeywords = [
      'manager', 'director', 'engineer', 'developer', 'analyst', 'consultant',
      'intern', 'associate', 'specialist', 'coordinator', 'assistant', 'lead'
    ];

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      if (positionKeywords.some(keyword => lowerLine.includes(keyword))) {
        return line.trim();
      }
    }

    // Look for lines that seem like job titles (usually shorter and descriptive)
    const titleLine = lines.find(line => {
      const trimmed = line.trim();
      return trimmed.length > 5 &&
        trimmed.length < 50 &&
        !this.isDateLine(line) &&
        !this.containsCompanyIndicators(line);
    });

    return titleLine?.trim() || null;
  }

  /**
   * Calculate confidence score for education period
   */
  private calculateEducationConfidence(
    institution: string | null,
    degree: string | null,
    extractedDates: ExtractedDate[]
  ): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence if we have institution
    if (institution) {
      confidence += 0.2;
      if (institution.toLowerCase().includes('university') ||
        institution.toLowerCase().includes('college')) {
        confidence += 0.1;
      }
    }

    // Boost confidence if we have degree
    if (degree) {
      confidence += 0.2;
    }

    // Boost confidence based on date quality
    const avgDateConfidence = extractedDates.reduce((sum, date) =>
      sum + (date.parsedDate?.confidence || 0), 0) / extractedDates.length;
    confidence += avgDateConfidence * 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate confidence score for work experience
   */
  private calculateWorkConfidence(
    company: string | null,
    position: string | null,
    extractedDates: ExtractedDate[]
  ): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence if we have company
    if (company) {
      confidence += 0.2;
      if (this.containsCompanyIndicators(company)) {
        confidence += 0.1;
      }
    }

    // Boost confidence if we have position
    if (position) {
      confidence += 0.2;
    }

    // Boost confidence based on date quality
    const avgDateConfidence = extractedDates.reduce((sum, date) =>
      sum + (date.parsedDate?.confidence || 0), 0) / extractedDates.length;
    confidence += avgDateConfidence * 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Helper methods for section detection
   */
  private isEducationSectionHeader(line: string): boolean {
    const educationHeaders = [
      'education', 'academic background', 'academic qualifications',
      'educational background', 'qualifications', 'degrees'
    ];
    return educationHeaders.some(header => line.includes(header));
  }

  private isWorkSectionHeader(line: string): boolean {
    const workHeaders = [
      'experience', 'work experience', 'professional experience',
      'employment', 'career', 'work history', 'professional background'
    ];
    return workHeaders.some(header => line.includes(header));
  }

  private isNonEducationSectionHeader(line: string): boolean {
    const nonEducationHeaders = [
      'experience', 'work', 'skills', 'projects', 'certifications',
      'achievements', 'awards', 'publications', 'references'
    ];
    return nonEducationHeaders.some(header => line.includes(header));
  }

  private isNonWorkSectionHeader(line: string): boolean {
    const nonWorkHeaders = [
      'education', 'skills', 'projects', 'certifications',
      'achievements', 'awards', 'publications', 'references'
    ];
    return nonWorkHeaders.some(header => line.includes(header));
  }

  private containsEducationKeywords(line: string): boolean {
    return EDUCATION_KEYWORDS.some(keyword => line.includes(keyword));
  }

  private containsWorkKeywords(line: string): boolean {
    return WORK_KEYWORDS.some(keyword => line.includes(keyword));
  }

  private containsCompanyIndicators(line: string): boolean {
    const indicators = ['inc', 'corp', 'ltd', 'llc', 'company', 'corporation'];
    const lowerLine = line.toLowerCase();
    return indicators.some(indicator => lowerLine.includes(indicator));
  }

  private isDateLine(line: string): boolean {
    // Check if line primarily contains dates
    const dateMatches = line.match(/\d{4}|present|current/gi);
    return !!(dateMatches && dateMatches.length > 0 && line.trim().length < 50);
  }

  private isDegreeOnlyLine(line: string): boolean {
    const degreeKeywords = ['bachelor', 'master', 'phd', 'b.s.', 'b.a.', 'm.s.', 'm.a.'];
    const lowerLine = line.toLowerCase();
    return degreeKeywords.some(keyword => lowerLine.includes(keyword)) &&
      line.trim().length < 100;
  }

  private isPositionOnlyLine(line: string): boolean {
    const positionKeywords = ['manager', 'director', 'engineer', 'developer'];
    const lowerLine = line.toLowerCase();
    return positionKeywords.some(keyword => lowerLine.includes(keyword)) &&
      line.trim().length < 50;
  }

  private getContextLines(lines: string[], index: number, contextSize: number): string[] {
    const start = Math.max(0, index - contextSize);
    const end = Math.min(lines.length, index + contextSize + 1);
    return lines.slice(start, end);
  }

  /**
   * Check if two education periods overlap in time
   */
  private hasEducationOverlap(period1: EducationPeriod, period2: EducationPeriod): boolean {
    if (!period1.startDate || !period2.startDate) {
      return false; // Can't determine overlap without start dates
    }

    const p1Start = period1.startDate.getTime();
    const p1End = period1.endDate?.getTime() || Date.now(); // Use current date for ongoing
    const p2Start = period2.startDate.getTime();
    const p2End = period2.endDate?.getTime() || Date.now(); // Use current date for ongoing

    // Check if periods overlap
    return p1Start < p2End && p2Start < p1End;
  }

  /**
   * Determine if education overlap is likely valid (e.g., double major, concurrent programs)
   */
  private isValidEducationOverlap(period1: EducationPeriod, period2: EducationPeriod): boolean {
    // Same institution - likely valid (double major, concurrent degrees)
    if (period1.institution.toLowerCase() === period2.institution.toLowerCase()) {
      return true;
    }

    // Different degree types at different institutions might be valid
    const degree1 = period1.degree?.toLowerCase() || '';
    const degree2 = period2.degree?.toLowerCase() || '';

    // Certificate/diploma programs can overlap with degree programs
    if ((degree1.includes('certificate') || degree1.includes('diploma')) ||
      (degree2.includes('certificate') || degree2.includes('diploma'))) {
      return true;
    }

    // Short overlap (less than 6 months) might be transition period
    if (period1.startDate && period1.endDate && period2.startDate && period2.endDate) {
      const overlapStart = Math.max(period1.startDate.getTime(), period2.startDate.getTime());
      const overlapEnd = Math.min(period1.endDate.getTime(), period2.endDate.getTime());
      const overlapMonths = (overlapEnd - overlapStart) / (1000 * 60 * 60 * 24 * 30.44);

      if (overlapMonths < 6) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if two work experiences overlap in time
   */
  private hasWorkOverlap(work1: WorkExperience, work2: WorkExperience): boolean {
    if (!work1.startDate || !work2.startDate) {
      return false; // Can't determine overlap without start dates
    }

    const w1Start = work1.startDate.getTime();
    const w1End = work1.endDate?.getTime() || Date.now(); // Use current date for ongoing
    const w2Start = work2.startDate.getTime();
    const w2End = work2.endDate?.getTime() || Date.now(); // Use current date for ongoing

    // Check if periods overlap
    return w1Start < w2End && w2Start < w1End;
  }

  /**
   * Determine if work overlap is likely valid (e.g., part-time, consulting, freelance)
   */
  private isValidWorkOverlap(work1: WorkExperience, work2: WorkExperience): boolean {
    // Check for keywords that suggest valid overlapping work
    const validOverlapKeywords = [
      'part-time', 'freelance', 'consultant', 'contractor', 'intern',
      'volunteer', 'seasonal', 'temporary', 'project-based', 'remote'
    ];

    const position1 = work1.position.toLowerCase();
    const position2 = work2.position.toLowerCase();
    const company1 = work1.company.toLowerCase();
    const company2 = work2.company.toLowerCase();

    // Check if either position suggests valid overlap
    const hasValidKeywords = validOverlapKeywords.some(keyword =>
      position1.includes(keyword) || position2.includes(keyword) ||
      company1.includes(keyword) || company2.includes(keyword)
    );

    if (hasValidKeywords) {
      return true;
    }

    // Short overlap (less than 3 months) might be transition period
    if (work1.startDate && work1.endDate && work2.startDate && work2.endDate) {
      const overlapStart = Math.max(work1.startDate.getTime(), work2.startDate.getTime());
      const overlapEnd = Math.min(work1.endDate.getTime(), work2.endDate.getTime());
      const overlapMonths = (overlapEnd - overlapStart) / (1000 * 60 * 60 * 24 * 30.44);

      if (overlapMonths < 3) {
        return true;
      }
    }

    // Different industries might allow overlap (e.g., teaching + consulting)
    const industryKeywords = [
      'teaching', 'education', 'consulting', 'research', 'writing',
      'coaching', 'training', 'speaking', 'advisory'
    ];

    const hasDifferentIndustries = industryKeywords.some(keyword =>
      (position1.includes(keyword) && !position2.includes(keyword)) ||
      (!position1.includes(keyword) && position2.includes(keyword))
    );

    return hasDifferentIndustries;
  }

  /**
   * Apply configurable validation rules to the resume data
   */
  private applyValidationRules(context: ValidationContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const rules = this.getValidationRules();

    for (const rule of rules) {
      try {
        if (rule.condition(context)) {
          const message = rule.message(context);
          const suggestedFix = rule.suggestion ? rule.suggestion(context) : undefined;

          issues.push({
            type: rule.severity,
            category: rule.category,
            message,
            detectedDate: this.extractRelevantDate(context, rule),
            suggestedFix,
            confidence: this.calculateRuleConfidence(rule, context)
          });
        }
      } catch (error) {
        // Log error but don't break validation
        console.warn(`Validation rule "${rule.name}" failed:`, error);
      }
    }

    return issues;
  }

  /**
   * Get all validation rules
   */
  private getValidationRules(): ValidationRule[] {
    return [
      // Rule: Check for dates far in the past that might be typos
      {
        name: 'ancient-dates',
        category: VALIDATION_CATEGORY.GENERAL,
        severity: VALIDATION_SEVERITY.WARNING,
        condition: (context) => {
          const allDates = [
            ...context.educationPeriods.flatMap(p => [p.startDate, p.endDate].filter(Boolean)),
            ...context.workExperience.flatMap(w => [w.startDate, w.endDate].filter(Boolean))
          ];
          return allDates.some(date => date && date.getFullYear() < 1980);
        },
        message: (context) => {
          const ancientDate = this.findAncientDate(context);
          return `Date ${ancientDate?.getFullYear()} seems unusually old. Please verify this is correct.`;
        },
        suggestion: (context) => {
          const ancientDate = this.findAncientDate(context);
          if (ancientDate) {
            const suggestedYear = ancientDate.getFullYear() + 20;
            return `Consider if this should be ${suggestedYear} instead.`;
          }
          return undefined;
        }
      },

      // Rule: Check for impossible future dates
      {
        name: 'impossible-future-dates',
        category: VALIDATION_CATEGORY.GENERAL,
        severity: VALIDATION_SEVERITY.CRITICAL,
        condition: (context) => {
          const futureLimit = new Date();
          futureLimit.setFullYear(futureLimit.getFullYear() + 10);

          const allDates = [
            ...context.educationPeriods.flatMap(p => [p.startDate, p.endDate].filter(Boolean)),
            ...context.workExperience.flatMap(w => [w.startDate, w.endDate].filter(Boolean))
          ];

          return allDates.some(date => date && date.getTime() > futureLimit.getTime());
        },
        message: (context) => {
          const impossibleDate = this.findImpossibleFutureDate(context);
          return `Date ${impossibleDate?.getFullYear()} is too far in the future to be realistic.`;
        },
        suggestion: (context) => {
          const impossibleDate = this.findImpossibleFutureDate(context);
          if (impossibleDate) {
            const suggestedYear = impossibleDate.getFullYear() - 10;
            return `This might be a typo. Consider if it should be ${suggestedYear}.`;
          }
          return undefined;
        }
      },

      // Rule: Check for reasonable career progression
      {
        name: 'career-progression',
        category: VALIDATION_CATEGORY.WORK,
        severity: VALIDATION_SEVERITY.SUGGESTION,
        condition: (context) => {
          if (context.workExperience.length < 2) return false;

          const sortedWork = context.workExperience
            .filter(w => w.startDate)
            .sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime());

          // Check if there's a significant gap in career progression
          for (let i = 1; i < sortedWork.length; i++) {
            const prevWork = sortedWork[i - 1];
            const currentWork = sortedWork[i];

            if (prevWork.endDate && currentWork.startDate) {
              const gapYears = (currentWork.startDate.getTime() - prevWork.endDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
              if (gapYears > 2) {
                return true;
              }
            }
          }

          return false;
        },
        message: () => 'Consider explaining any significant gaps in employment history.',
        suggestion: () => 'Add brief explanations for employment gaps (education, travel, family, etc.)'
      },

      // Rule: Check for education-work timeline consistency
      {
        name: 'education-work-consistency',
        category: VALIDATION_CATEGORY.GENERAL,
        severity: VALIDATION_SEVERITY.WARNING,
        condition: (context) => {
          // Check if work experience starts before education ends
          const latestEducation = context.educationPeriods
            .filter(e => e.endDate && !e.isOngoing)
            .sort((a, b) => b.endDate!.getTime() - a.endDate!.getTime())[0];

          const earliestWork = context.workExperience
            .filter(w => w.startDate)
            .sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime())[0];

          if (latestEducation && earliestWork) {
            return earliestWork.startDate!.getTime() < latestEducation.endDate!.getTime();
          }

          return false;
        },
        message: () => 'Work experience appears to start before education completion. Please verify timeline consistency.',
        suggestion: () => 'Check if work was part-time during education or if dates need correction.'
      }
    ];
  }



  /**
   * Categorize issues by severity and convert low-confidence issues to warnings
   */
  private categorizeIssuesBySeverity(issues: ValidationIssue[]): {
    issues: ValidationIssue[];
    convertedWarnings: ValidationWarning[];
  } {
    const filteredIssues: ValidationIssue[] = [];
    const convertedWarnings: ValidationWarning[] = [];

    for (const issue of issues) {
      if (issue.confidence < this.configManager.getConfig().confidenceThreshold && issue.type === 'critical') {
        // Convert low-confidence critical issues to warnings
        convertedWarnings.push({
          category: issue.category,
          message: issue.message,
          context: issue.detectedDate
        });
      } else {
        filteredIssues.push(issue);
      }
    }

    return { issues: filteredIssues, convertedWarnings };
  }

  /**
   * Helper methods for validation rules
   */
  private findAncientDate(context: ValidationContext): Date | null {
    const allDates = [
      ...context.educationPeriods.flatMap(p => [p.startDate, p.endDate].filter(Boolean)),
      ...context.workExperience.flatMap(w => [w.startDate, w.endDate].filter(Boolean))
    ];

    return allDates.find(date => date && date.getFullYear() < 1980) || null;
  }

  private findImpossibleFutureDate(context: ValidationContext): Date | null {
    const futureLimit = new Date();
    futureLimit.setFullYear(futureLimit.getFullYear() + 10);

    const allDates = [
      ...context.educationPeriods.flatMap(p => [p.startDate, p.endDate].filter(Boolean)),
      ...context.workExperience.flatMap(w => [w.startDate, w.endDate].filter(Boolean))
    ];

    return allDates.find(date => date && date.getTime() > futureLimit.getTime()) || null;
  }

  private extractRelevantDate(context: ValidationContext, rule: ValidationRule): string {
    // Extract the most relevant date for the rule context
    switch (rule.category) {
      case 'education':
        const educationDate = context.educationPeriods[0]?.endDate || context.educationPeriods[0]?.startDate;
        return educationDate?.toLocaleDateString() || 'Unknown';
      case 'work':
        const workDate = context.workExperience[0]?.endDate || context.workExperience[0]?.startDate;
        return workDate?.toLocaleDateString() || 'Unknown';
      default:
        return 'Multiple dates';
    }
  }

  private calculateRuleConfidence(rule: ValidationRule, context: ValidationContext): number {
    // Base confidence varies by rule type
    let confidence = 0.7;

    // Adjust confidence based on data quality
    const hasGoodEducationData = context.educationPeriods.some(p => p.confidence > 0.8);
    const hasGoodWorkData = context.workExperience.some(w => w.confidence > 0.8);

    if (rule.category === 'education' && hasGoodEducationData) {
      confidence += 0.1;
    }
    if (rule.category === 'work' && hasGoodWorkData) {
      confidence += 0.1;
    }

    // Adjust for strict mode
    if (context.config.strictMode) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }



  /**
   * Extract all dates for structured logging
   */
  private extractAllDatesForLogging(educationPeriods: EducationPeriod[], workExperience: WorkExperience[]): any[] {
    const allDates: any[] = [];

    // Add education dates
    educationPeriods.forEach((period, index) => {
      if (period.startDate) {
        allDates.push({
          type: 'education',
          category: 'start',
          date: period.startDate.toISOString(),
          institution: period.institution,
          degree: period.degree,
          index
        });
      }
      if (period.endDate) {
        allDates.push({
          type: 'education',
          category: 'end',
          date: period.endDate.toISOString(),
          institution: period.institution,
          degree: period.degree,
          isOngoing: period.isOngoing,
          index
        });
      }
    });

    // Add work experience dates
    workExperience.forEach((exp, index) => {
      if (exp.startDate) {
        allDates.push({
          type: 'work',
          category: 'start',
          date: exp.startDate.toISOString(),
          company: exp.company,
          position: exp.position,
          index
        });
      }
      if (exp.endDate) {
        allDates.push({
          type: 'work',
          category: 'end',
          date: exp.endDate.toISOString(),
          company: exp.company,
          position: exp.position,
          isOngoing: exp.isOngoing,
          index
        });
      }
    });

    return allDates;
  }

  /**
   * Categorize issues by type for logging analytics
   */
  private categorizeIssueTypes(issues: ValidationIssue[]): Record<string, number> {
    const categories: Record<string, number> = {};

    issues.forEach(issue => {
      const key = `${issue.category}_${issue.type}`;
      categories[key] = (categories[key] || 0) + 1;
    });

    return categories;
  }

  /**
   * Log edge cases found in validation results
   */
  private logEdgeCasesFromResults(issues: ValidationIssue[], warnings: ValidationWarning[], resumeText: string): void {
    try {
      // Log unusual date patterns as edge cases
      issues.forEach(issue => {
        if (issue.confidence < 0.7) {
          this.logger.logEdgeCase(
            'ambiguous_date',
            `Low confidence validation issue: ${issue.message}`,
            `Category: ${issue.category}, Type: ${issue.type}`,
            issue.detectedDate,
            issue.suggestedFix
          );
        }

        // Log future dates that might be legitimate
        if (issue.message.includes('future') && issue.type === 'warning') {
          this.logger.logEdgeCase(
            'unusual_date_format',
            `Future date detected: ${issue.message}`,
            `Category: ${issue.category}`,
            issue.detectedDate,
            'Verify if this is an ongoing program or position'
          );
        }
      });

      // Log system warnings as edge cases
      warnings.forEach(warning => {
        if (warning.message.includes('error') || warning.message.includes('skipped')) {
          this.logger.logEdgeCase(
            'unexpected_pattern',
            `System warning during validation: ${warning.message}`,
            warning.context || 'Unknown context',
            resumeText.substring(0, 100),
            'Review system logs for detailed error information'
          );
        }
      });

    } catch (error) {
      this.logger.log('error', 'validation', 'edge_case_logging_failed', {}, undefined,
        error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Create an empty validation result with optional warning message
   */
  private createEmptyValidationResult(warningMessage?: string): DateValidationResult {
    const result: DateValidationResult = {
      isValid: true,
      issues: [],
      warnings: [],
      suggestions: []
    };

    if (warningMessage) {
      result.warnings.push({
        category: 'general',
        message: warningMessage,
        context: 'System error during validation'
      });
    }

    return result;
  }

  /**
   * Log all extracted dates for debugging purposes
   */
  private logAllExtractedDates(educationPeriods: EducationPeriod[], workExperience: WorkExperience[]): void {
    try {
      // Log education dates
      const educationDates = educationPeriods.map((period, index) => ({
        date: period.startDate,
        originalText: `Education ${index + 1} Start: ${period.institution}`,
        label: `Education ${index + 1} Start`
      })).concat(educationPeriods.map((period, index) => ({
        date: period.endDate,
        originalText: `Education ${index + 1} End: ${period.institution} (${period.isOngoing ? 'Ongoing' : 'Completed'})`,
        label: `Education ${index + 1} End`
      })));

      // Log work experience dates
      const workDates = workExperience.map((exp, index) => ({
        date: exp.startDate,
        originalText: `Work ${index + 1} Start: ${exp.company} - ${exp.position}`,
        label: `Work ${index + 1} Start`
      })).concat(workExperience.map((exp, index) => ({
        date: exp.endDate,
        originalText: `Work ${index + 1} End: ${exp.company} - ${exp.position} (${exp.isOngoing ? 'Ongoing' : 'Completed'})`,
        label: `Work ${index + 1} End`
      })));

      // Combine and log all dates
      const allDates = [...educationDates, ...workDates].filter(item => item.date !== null);

      if (allDates.length > 0) {
        this.configManager.logDates('All extracted dates', allDates);

        // Also log a summary
        console.log('[ResumeDateValidationService] Date extraction summary:', {
          totalDates: allDates.length,
          educationDates: educationDates.filter(item => item.date !== null).length,
          workDates: workDates.filter(item => item.date !== null).length,
          educationPeriods: educationPeriods.length,
          workExperiences: workExperience.length,
          ongoingEducation: educationPeriods.filter(p => p.isOngoing).length,
          ongoingWork: workExperience.filter(w => w.isOngoing).length
        });
      } else {
        console.log('[ResumeDateValidationService] No dates extracted from resume');
      }

    } catch (error) {
      console.error('[ResumeDateValidationService] Error logging extracted dates:', {
        error: error instanceof Error ? error.message : String(error),
        educationPeriodsCount: educationPeriods.length,
        workExperienceCount: workExperience.length
      });
    }
  }
}