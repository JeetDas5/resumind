import type { DateSuggestion, ValidationContext, ValidationIssue, EducationPeriod, WorkExperience } from './types';
import { DateTypoDetector } from './typo-detector';

/**
 * Intelligent suggestion generation system for date validation issues
 * Provides context-aware correction recommendations with confidence scoring
 */
export class DateSuggestionGenerator {
  private typoDetector: DateTypoDetector;
  private readonly currentYear = new Date().getFullYear();
  
  constructor() {
    this.typoDetector = new DateTypoDetector();
  }
  
  /**
   * Generate intelligent suggestions for all date validation issues
   */
  generateSuggestions(context: ValidationContext, issues: ValidationIssue[]): DateSuggestion[] {
    const suggestions: DateSuggestion[] = [];
    
    // Generate typo-based suggestions
    const typoSuggestions = this.typoDetector.detectTypos(context);
    suggestions.push(...typoSuggestions);
    
    // Generate context-aware suggestions for validation issues
    for (const issue of issues) {
      const contextSuggestions = this.generateContextAwareSuggestions(issue, context);
      suggestions.push(...contextSuggestions);
    }
    
    // Generate timeline-based suggestions
    const timelineSuggestions = this.generateTimelineSuggestions(context);
    suggestions.push(...timelineSuggestions);
    
    // Filter and rank suggestions by confidence
    return this.filterAndRankSuggestions(suggestions, context);
  }
  
  /**
   * Generate context-aware suggestions for specific validation issues
   */
  private generateContextAwareSuggestions(issue: ValidationIssue, context: ValidationContext): DateSuggestion[] {
    const suggestions: DateSuggestion[] = [];
    
    switch (issue.category) {
      case 'education':
        suggestions.push(...this.generateEducationSuggestions(issue, context));
        break;
      case 'work':
        suggestions.push(...this.generateWorkSuggestions(issue, context));
        break;
      case 'general':
        suggestions.push(...this.generateGeneralSuggestions(issue, context));
        break;
    }
    
    return suggestions;
  }
  
  /**
   * Generate education-specific suggestions
   */
  private generateEducationSuggestions(issue: ValidationIssue, context: ValidationContext): DateSuggestion[] {
    const suggestions: DateSuggestion[] = [];
    
    // Find the education period related to this issue
    const relatedEducation = this.findRelatedEducation(issue, context.educationPeriods);
    if (!relatedEducation) return suggestions;
    
    // Suggest reasonable graduation dates
    if (issue.message.includes('graduation date') && issue.message.includes('future')) {
      const reasonableGradYears = this.generateReasonableGraduationYears(relatedEducation, context);
      
      for (const year of reasonableGradYears) {
        const originalDate = issue.detectedDate;
        const suggestedDate = this.replaceDateYear(originalDate, year);
        
        if (suggestedDate !== originalDate) {
          suggestions.push({
            originalDate,
            suggestedDate,
            reason: `Consider if graduation should be ${year} instead of the current date`,
            confidence: this.calculateEducationSuggestionConfidence(year, relatedEducation, context)
          });
        }
      }
    }
    
    // Suggest fixing start/end date order
    if (issue.message.includes('start date') && issue.message.includes('after')) {
      const orderSuggestions = this.generateDateOrderSuggestions(relatedEducation, 'education');
      suggestions.push(...orderSuggestions);
    }
    
    // Suggest reasonable education duration
    if (issue.message.includes('unusually long') || issue.message.includes('seems short')) {
      const durationSuggestions = this.generateEducationDurationSuggestions(relatedEducation, context);
      suggestions.push(...durationSuggestions);
    }
    
    return suggestions;
  }
  
  /**
   * Generate work-specific suggestions
   */
  private generateWorkSuggestions(issue: ValidationIssue, context: ValidationContext): DateSuggestion[] {
    const suggestions: DateSuggestion[] = [];
    
    // Find the work experience related to this issue
    const relatedWork = this.findRelatedWork(issue, context.workExperience);
    if (!relatedWork) return suggestions;
    
    // Suggest reasonable employment end dates
    if (issue.message.includes('end date') && issue.message.includes('future')) {
      const reasonableEndYears = this.generateReasonableWorkEndYears(relatedWork, context);
      
      for (const year of reasonableEndYears) {
        const originalDate = issue.detectedDate;
        const suggestedDate = this.replaceDateYear(originalDate, year);
        
        if (suggestedDate !== originalDate) {
          suggestions.push({
            originalDate,
            suggestedDate,
            reason: `Consider if employment should end in ${year} or mark as "Present" if ongoing`,
            confidence: this.calculateWorkSuggestionConfidence(year, relatedWork, context)
          });
        }
      }
      
      // Suggest marking as ongoing if appropriate
      if (this.shouldSuggestOngoing(relatedWork, context)) {
        suggestions.push({
          originalDate: issue.detectedDate,
          suggestedDate: 'Present',
          reason: 'Consider marking this position as "Present" or "Current" if still employed',
          confidence: 0.7
        });
      }
    }
    
    // Suggest fixing start/end date order
    if (issue.message.includes('start date') && issue.message.includes('after')) {
      const orderSuggestions = this.generateDateOrderSuggestions(relatedWork, 'work');
      suggestions.push(...orderSuggestions);
    }
    
    return suggestions;
  }
  
  /**
   * Generate general date suggestions
   */
  private generateGeneralSuggestions(issue: ValidationIssue, context: ValidationContext): DateSuggestion[] {
    const suggestions: DateSuggestion[] = [];
    
    // Suggest common date format corrections
    if (issue.message.includes('format') || issue.message.includes('invalid')) {
      const formatSuggestions = this.generateDateFormatSuggestions(issue.detectedDate);
      suggestions.push(...formatSuggestions);
    }
    
    return suggestions;
  }
  
  /**
   * Generate timeline-based suggestions
   */
  private generateTimelineSuggestions(context: ValidationContext): DateSuggestion[] {
    const suggestions: DateSuggestion[] = [];
    
    // Suggest fixing education timeline gaps
    const educationGapSuggestions = this.generateEducationTimelineGapSuggestions(context.educationPeriods);
    suggestions.push(...educationGapSuggestions);
    
    // Suggest fixing work timeline overlaps
    const workOverlapSuggestions = this.generateWorkTimelineOverlapSuggestions(context.workExperience);
    suggestions.push(...workOverlapSuggestions);
    
    return suggestions;
  }
  
  /**
   * Generate reasonable graduation years based on education context
   */
  private generateReasonableGraduationYears(education: EducationPeriod, context: ValidationContext): number[] {
    const years: number[] = [];
    
    // If we have a start date, suggest reasonable completion times
    if (education.startDate) {
      const startYear = education.startDate.getFullYear();
      
      // Typical degree durations
      const typicalDurations = this.getTypicalEducationDurations(education.degree);
      
      for (const duration of typicalDurations) {
        const suggestedYear = startYear + duration;
        if (suggestedYear >= this.currentYear - 1 && suggestedYear <= this.currentYear + context.config.maxFutureEducationYears) {
          years.push(suggestedYear);
        }
      }
    }
    
    // Also suggest recent years if no start date
    if (years.length === 0) {
      for (let i = 0; i <= 2; i++) {
        years.push(this.currentYear - i);
      }
    }
    
    return years;
  }
  
  /**
   * Generate reasonable work end years
   */
  private generateReasonableWorkEndYears(work: WorkExperience, context: ValidationContext): number[] {
    const years: number[] = [];
    
    // Suggest current year and previous year
    years.push(this.currentYear, this.currentYear - 1);
    
    // If we have a start date, suggest reasonable employment durations
    if (work.startDate) {
      const startYear = work.startDate.getFullYear();
      const maxDuration = Math.min(5, this.currentYear - startYear + 1);
      
      for (let duration = 1; duration <= maxDuration; duration++) {
        const suggestedYear = startYear + duration;
        if (suggestedYear <= this.currentYear && !years.includes(suggestedYear)) {
          years.push(suggestedYear);
        }
      }
    }
    
    return years.sort((a, b) => b - a); // Most recent first
  }
  
  /**
   * Generate suggestions for date order issues
   */
  private generateDateOrderSuggestions(period: EducationPeriod | WorkExperience, type: 'education' | 'work'): DateSuggestion[] {
    const suggestions: DateSuggestion[] = [];
    
    if (!period.startDate || !period.endDate) return suggestions;
    
    const startYear = period.startDate.getFullYear();
    const endYear = period.endDate.getFullYear();
    
    // Suggest swapping the dates
    suggestions.push({
      originalDate: `${startYear} - ${endYear}`,
      suggestedDate: `${endYear} - ${startYear}`,
      reason: 'Consider if the start and end dates are swapped',
      confidence: 0.6
    });
    
    // Suggest reasonable end date based on start date
    const reasonableEndYear = type === 'education' 
      ? startYear + 4  // Typical degree duration
      : Math.min(startYear + 3, this.currentYear); // Reasonable work duration
    
    if (reasonableEndYear !== endYear && reasonableEndYear >= startYear) {
      suggestions.push({
        originalDate: endYear.toString(),
        suggestedDate: reasonableEndYear.toString(),
        reason: `Consider if end date should be ${reasonableEndYear} based on typical ${type} duration`,
        confidence: 0.5
      });
    }
    
    return suggestions;
  }
  
  /**
   * Generate education duration suggestions
   */
  private generateEducationDurationSuggestions(education: EducationPeriod, context: ValidationContext): DateSuggestion[] {
    const suggestions: DateSuggestion[] = [];
    
    if (!education.startDate || !education.endDate) return suggestions;
    
    const startYear = education.startDate.getFullYear();
    const endYear = education.endDate.getFullYear();
    const currentDuration = endYear - startYear;
    
    // Get typical durations for this type of education
    const typicalDurations = this.getTypicalEducationDurations(education.degree);
    
    for (const duration of typicalDurations) {
      if (duration !== currentDuration) {
        const suggestedEndYear = startYear + duration;
        
        if (suggestedEndYear <= this.currentYear + context.config.maxFutureEducationYears) {
          suggestions.push({
            originalDate: endYear.toString(),
            suggestedDate: suggestedEndYear.toString(),
            reason: `Typical ${this.getEducationType(education.degree)} duration is ${duration} years`,
            confidence: 0.4
          });
        }
      }
    }
    
    return suggestions;
  }
  
  /**
   * Generate education timeline gap suggestions
   */
  private generateEducationTimelineGapSuggestions(educationPeriods: EducationPeriod[]): DateSuggestion[] {
    const suggestions: DateSuggestion[] = [];
    
    // Sort education periods by start date
    const sortedEducation = [...educationPeriods]
      .filter(edu => edu.startDate)
      .sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime());
    
    // Look for gaps that might indicate missing education or date errors
    for (let i = 0; i < sortedEducation.length - 1; i++) {
      const current = sortedEducation[i];
      const next = sortedEducation[i + 1];
      
      if (current.endDate && next.startDate) {
        const gapYears = next.startDate.getFullYear() - current.endDate.getFullYear();
        
        if (gapYears > 2) {
          suggestions.push({
            originalDate: `${current.endDate.getFullYear()} to ${next.startDate.getFullYear()}`,
            suggestedDate: 'Consider adding missing education or adjusting dates',
            reason: `${gapYears}-year gap in education timeline may indicate missing information`,
            confidence: 0.3
          });
        }
      }
    }
    
    return suggestions;
  }
  
  /**
   * Generate work timeline overlap suggestions
   */
  private generateWorkTimelineOverlapSuggestions(workExperience: WorkExperience[]): DateSuggestion[] {
    const suggestions: DateSuggestion[] = [];
    
    // Check for overlapping work periods that might be errors
    for (let i = 0; i < workExperience.length; i++) {
      for (let j = i + 1; j < workExperience.length; j++) {
        const work1 = workExperience[i];
        const work2 = workExperience[j];
        
        if (this.hasSignificantOverlap(work1, work2)) {
          const overlapSuggestion = this.generateOverlapSuggestion(work1, work2);
          if (overlapSuggestion) {
            suggestions.push(overlapSuggestion);
          }
        }
      }
    }
    
    return suggestions;
  }
  
  /**
   * Generate date format suggestions
   */
  private generateDateFormatSuggestions(dateString: string): DateSuggestion[] {
    const suggestions: DateSuggestion[] = [];
    
    // Common format corrections
    const formatCorrections = [
      { pattern: /(\d{1,2})\/(\d{1,2})\/(\d{2})$/, replacement: '$1/$2/20$3', reason: 'Convert 2-digit year to 4-digit year' },
      { pattern: /(\d{4})-(\d{1,2})-(\d{1,2})/, replacement: '$2/$3/$1', reason: 'Convert ISO format to MM/DD/YYYY' },
      { pattern: /(\d{1,2})-(\d{1,2})-(\d{4})/, replacement: '$1/$2/$3', reason: 'Use forward slashes instead of dashes' }
    ];
    
    for (const correction of formatCorrections) {
      if (correction.pattern.test(dateString)) {
        const suggestedDate = dateString.replace(correction.pattern, correction.replacement);
        
        suggestions.push({
          originalDate: dateString,
          suggestedDate,
          reason: correction.reason,
          confidence: 0.6
        });
      }
    }
    
    return suggestions;
  }
  
  /**
   * Filter and rank suggestions by confidence and relevance
   */
  private filterAndRankSuggestions(suggestions: DateSuggestion[], context: ValidationContext): DateSuggestion[] {
    // Remove duplicates
    const uniqueSuggestions = suggestions.filter((suggestion, index, array) => 
      array.findIndex(s => 
        s.originalDate === suggestion.originalDate && 
        s.suggestedDate === suggestion.suggestedDate
      ) === index
    );
    
    // Filter by confidence threshold
    const filteredSuggestions = uniqueSuggestions.filter(
      suggestion => suggestion.confidence >= context.config.confidenceThreshold
    );
    
    // Sort by confidence (highest first)
    return filteredSuggestions.sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Helper methods
   */
  private findRelatedEducation(issue: ValidationIssue, educationPeriods: EducationPeriod[]): EducationPeriod | null {
    // Find education period that contains the detected date
    return educationPeriods.find(edu => 
      edu.originalText.includes(issue.detectedDate) ||
      (edu.startDate && edu.startDate.toLocaleDateString() === issue.detectedDate) ||
      (edu.endDate && edu.endDate.toLocaleDateString() === issue.detectedDate)
    ) || null;
  }
  
  private findRelatedWork(issue: ValidationIssue, workExperience: WorkExperience[]): WorkExperience | null {
    // Find work experience that contains the detected date
    return workExperience.find(work => 
      work.originalText.includes(issue.detectedDate) ||
      (work.startDate && work.startDate.toLocaleDateString() === issue.detectedDate) ||
      (work.endDate && work.endDate.toLocaleDateString() === issue.detectedDate)
    ) || null;
  }
  
  private replaceDateYear(dateString: string, newYear: number): string {
    // Replace year in date string
    return dateString.replace(/\b\d{4}\b/, newYear.toString());
  }
  
  private calculateEducationSuggestionConfidence(year: number, education: EducationPeriod, context: ValidationContext): number {
    let confidence = 0.5;
    
    // Higher confidence if year is reasonable for education
    if (year >= this.currentYear - 1 && year <= this.currentYear + context.config.maxFutureEducationYears) {
      confidence += 0.2;
    }
    
    // Higher confidence if it fits with start date
    if (education.startDate) {
      const duration = year - education.startDate.getFullYear();
      const typicalDurations = this.getTypicalEducationDurations(education.degree);
      
      if (typicalDurations.includes(duration)) {
        confidence += 0.2;
      }
    }
    
    return Math.min(confidence, 1.0);
  }
  
  private calculateWorkSuggestionConfidence(year: number, work: WorkExperience, context: ValidationContext): number {
    let confidence = 0.5;
    
    // Higher confidence if year is reasonable for work
    if (year >= this.currentYear - 5 && year <= this.currentYear) {
      confidence += 0.2;
    }
    
    // Higher confidence if it fits with start date
    if (work.startDate) {
      const duration = year - work.startDate.getFullYear();
      
      if (duration >= 0 && duration <= 10) {
        confidence += 0.1;
      }
    }
    
    return Math.min(confidence, 1.0);
  }
  
  private getTypicalEducationDurations(degree?: string): number[] {
    if (!degree) return [4]; // Default bachelor's degree
    
    const lowerDegree = degree.toLowerCase();
    
    if (lowerDegree.includes('bachelor') || lowerDegree.includes('b.s.') || lowerDegree.includes('b.a.')) {
      return [4, 3, 5]; // 4 years typical, 3-5 range
    }
    
    if (lowerDegree.includes('master') || lowerDegree.includes('m.s.') || lowerDegree.includes('m.a.') || lowerDegree.includes('mba')) {
      return [2, 1, 3]; // 2 years typical, 1-3 range
    }
    
    if (lowerDegree.includes('phd') || lowerDegree.includes('doctorate') || lowerDegree.includes('ph.d.')) {
      return [5, 4, 6, 7]; // 5 years typical, 4-7 range
    }
    
    if (lowerDegree.includes('certificate') || lowerDegree.includes('diploma')) {
      return [1, 2]; // 1-2 years
    }
    
    return [4]; // Default
  }
  
  private getEducationType(degree?: string): string {
    if (!degree) return 'degree';
    
    const lowerDegree = degree.toLowerCase();
    
    if (lowerDegree.includes('bachelor')) return "bachelor's degree";
    if (lowerDegree.includes('master')) return "master's degree";
    if (lowerDegree.includes('phd') || lowerDegree.includes('doctorate')) return 'doctoral degree';
    if (lowerDegree.includes('certificate')) return 'certificate program';
    if (lowerDegree.includes('diploma')) return 'diploma program';
    
    return 'degree program';
  }
  
  private shouldSuggestOngoing(work: WorkExperience, context: ValidationContext): boolean {
    // Suggest ongoing if end date is very recent or in near future
    if (!work.endDate) return false;
    
    const monthsDifference = (work.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    
    return monthsDifference > -3 && monthsDifference < context.config.maxFutureWorkMonths;
  }
  
  private hasSignificantOverlap(work1: WorkExperience, work2: WorkExperience): boolean {
    if (!work1.startDate || !work2.startDate) return false;
    
    const work1End = work1.endDate || new Date();
    const work2End = work2.endDate || new Date();
    
    // Check if there's more than 6 months overlap
    const overlapStart = new Date(Math.max(work1.startDate.getTime(), work2.startDate.getTime()));
    const overlapEnd = new Date(Math.min(work1End.getTime(), work2End.getTime()));
    
    const overlapMonths = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    
    return overlapMonths > 6;
  }
  
  private generateOverlapSuggestion(work1: WorkExperience, work2: WorkExperience): DateSuggestion | null {
    if (!work1.endDate || !work2.startDate) return null;
    
    // Suggest adjusting end date of first job to start date of second job
    const suggestedEndDate = new Date(work2.startDate.getTime() - 24 * 60 * 60 * 1000); // Day before
    
    return {
      originalDate: work1.endDate.toLocaleDateString(),
      suggestedDate: suggestedEndDate.toLocaleDateString(),
      reason: `Adjust end date to avoid overlap with ${work2.company}`,
      confidence: 0.4
    };
  }
}