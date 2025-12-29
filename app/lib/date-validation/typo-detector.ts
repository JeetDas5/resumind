import type { DateSuggestion, ValidationContext, ExtractedDate } from './types';

/**
 * Date typo detection and suggestion system
 * Detects likely typos in resume dates and provides intelligent corrections
 */
export class DateTypoDetector {
  private readonly currentYear = new Date().getFullYear();
  
  /**
   * Detect potential typos in dates and generate suggestions
   */
  detectTypos(context: ValidationContext): DateSuggestion[] {
    const suggestions: DateSuggestion[] = [];
    
    // Extract all dates from resume text
    const allDates = this.extractAllDatesFromContext(context);
    
    for (const extractedDate of allDates) {
      if (!extractedDate.parsedDate) continue;
      
      const typoSuggestions = this.analyzeForTypos(extractedDate, context);
      suggestions.push(...typoSuggestions);
    }
    
    return suggestions.filter(suggestion => suggestion.confidence >= context.config.confidenceThreshold);
  }
  
  /**
   * Analyze a single date for potential typos
   */
  private analyzeForTypos(extractedDate: ExtractedDate, context: ValidationContext): DateSuggestion[] {
    const suggestions: DateSuggestion[] = [];
    const date = extractedDate.parsedDate!;
    const year = date.normalized.getFullYear();
    
    // Check for common year typos
    const yearTypoSuggestions = this.detectYearTypos(year, extractedDate, context);
    suggestions.push(...yearTypoSuggestions);
    
    // Check for impossible future dates that might be typos
    const futureDateSuggestions = this.detectFutureDateTypos(date.normalized, extractedDate, context);
    suggestions.push(...futureDateSuggestions);
    
    // Check for digit transposition errors
    const transpositionSuggestions = this.detectTranspositionErrors(year, extractedDate, context);
    suggestions.push(...transpositionSuggestions);
    
    // Check for off-by-one errors
    const offByOneSuggestions = this.detectOffByOneErrors(year, extractedDate, context);
    suggestions.push(...offByOneSuggestions);
    
    return suggestions;
  }
  
  /**
   * Detect common year typos (e.g., 2025 instead of 2023)
   */
  private detectYearTypos(year: number, extractedDate: ExtractedDate, context: ValidationContext): DateSuggestion[] {
    const suggestions: DateSuggestion[] = [];
    
    // Check if year is suspiciously far in the future
    const yearsDifference = year - this.currentYear;
    
    if (yearsDifference > 2) {
      // Suggest current year or recent years
      const likelyCandidates = [
        this.currentYear,
        this.currentYear - 1,
        this.currentYear - 2
      ];
      
      for (const candidateYear of likelyCandidates) {
        const confidence = this.calculateTypoConfidence(year, candidateYear, extractedDate, context);
        
        if (confidence > 0.5) {
          const originalText = extractedDate.text;
          const suggestedText = originalText.replace(year.toString(), candidateYear.toString());
          
          suggestions.push({
            originalDate: originalText,
            suggestedDate: suggestedText,
            reason: `Year ${year} seems too far in the future. Did you mean ${candidateYear}?`,
            confidence
          });
        }
      }
    }
    
    return suggestions;
  }
  
  /**
   * Detect impossible future dates that are likely typos
   */
  private detectFutureDateTypos(date: Date, extractedDate: ExtractedDate, context: ValidationContext): DateSuggestion[] {
    const suggestions: DateSuggestion[] = [];
    const year = date.getFullYear();
    const monthsDifference = (date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    
    // If date is more than 5 years in the future, it's likely a typo
    if (monthsDifference > 60) {
      // Check if it's in education or work context
      const isEducationContext = this.isEducationContext(extractedDate.context);
      const isWorkContext = this.isWorkContext(extractedDate.context);
      
      let maxReasonableFuture = 12; // Default 1 year
      if (isEducationContext) {
        maxReasonableFuture = context.config.maxFutureEducationYears * 12;
      } else if (isWorkContext) {
        maxReasonableFuture = context.config.maxFutureWorkMonths;
      }
      
      if (monthsDifference > maxReasonableFuture) {
        // Suggest year minus 10 (common typo: 2025 instead of 2015)
        const suggestedYear = year - 10;
        if (suggestedYear >= 1990 && suggestedYear <= this.currentYear) {
          const originalText = extractedDate.text;
          const suggestedText = originalText.replace(year.toString(), suggestedYear.toString());
          
          suggestions.push({
            originalDate: originalText,
            suggestedDate: suggestedText,
            reason: `Date ${year} is too far in the future. Common typo: did you mean ${suggestedYear}?`,
            confidence: 0.8
          });
        }
        
        // Also suggest current year
        const currentYearText = extractedDate.text.replace(year.toString(), this.currentYear.toString());
        suggestions.push({
          originalDate: extractedDate.text,
          suggestedDate: currentYearText,
          reason: `Date ${year} is unrealistic. Consider if this should be ${this.currentYear}.`,
          confidence: 0.6
        });
      }
    }
    
    return suggestions;
  }
  
  /**
   * Detect digit transposition errors (e.g., 2032 instead of 2023)
   */
  private detectTranspositionErrors(year: number, extractedDate: ExtractedDate, context: ValidationContext): DateSuggestion[] {
    const suggestions: DateSuggestion[] = [];
    const yearStr = year.toString();
    
    // Only check 4-digit years
    if (yearStr.length !== 4) return suggestions;
    
    // Generate all possible transpositions
    for (let i = 0; i < yearStr.length - 1; i++) {
      const chars = yearStr.split('');
      // Swap adjacent digits
      [chars[i], chars[i + 1]] = [chars[i + 1], chars[i]];
      const transposedYear = parseInt(chars.join(''));
      
      // Check if transposed year is more reasonable
      if (this.isReasonableYear(transposedYear) && Math.abs(transposedYear - this.currentYear) < Math.abs(year - this.currentYear)) {
        const confidence = this.calculateTranspositionConfidence(year, transposedYear, extractedDate);
        
        if (confidence > 0.4) {
          const originalText = extractedDate.text;
          const suggestedText = originalText.replace(year.toString(), transposedYear.toString());
          
          suggestions.push({
            originalDate: originalText,
            suggestedDate: suggestedText,
            reason: `Possible digit transposition: ${year} → ${transposedYear}`,
            confidence
          });
        }
      }
    }
    
    return suggestions;
  }
  
  /**
   * Detect off-by-one errors (e.g., 2024 instead of 2023)
   */
  private detectOffByOneErrors(year: number, extractedDate: ExtractedDate, context: ValidationContext): DateSuggestion[] {
    const suggestions: DateSuggestion[] = [];
    
    // Check years that are slightly off
    const candidates = [year - 1, year + 1];
    
    for (const candidateYear of candidates) {
      if (this.isReasonableYear(candidateYear)) {
        const confidence = this.calculateOffByOneConfidence(year, candidateYear, extractedDate, context);
        
        if (confidence > 0.3) {
          const originalText = extractedDate.text;
          const suggestedText = originalText.replace(year.toString(), candidateYear.toString());
          
          const direction = candidateYear > year ? 'later' : 'earlier';
          suggestions.push({
            originalDate: originalText,
            suggestedDate: suggestedText,
            reason: `Consider if this should be one year ${direction}: ${candidateYear}`,
            confidence
          });
        }
      }
    }
    
    return suggestions;
  }
  
  /**
   * Calculate confidence score for a typo suggestion
   */
  private calculateTypoConfidence(originalYear: number, suggestedYear: number, extractedDate: ExtractedDate, context: ValidationContext): number {
    let confidence = 0.5; // Base confidence
    
    // Higher confidence if suggested year is closer to current year
    const originalDistance = Math.abs(originalYear - this.currentYear);
    const suggestedDistance = Math.abs(suggestedYear - this.currentYear);
    
    if (suggestedDistance < originalDistance) {
      confidence += 0.2;
    }
    
    // Higher confidence if original year is very unrealistic
    if (originalYear > this.currentYear + 5) {
      confidence += 0.2;
    }
    
    // Context-based confidence adjustments
    const isEducationContext = this.isEducationContext(extractedDate.context);
    const isWorkContext = this.isWorkContext(extractedDate.context);
    
    if (isEducationContext) {
      // Education dates can be more flexible
      if (suggestedYear >= this.currentYear - 10 && suggestedYear <= this.currentYear + 4) {
        confidence += 0.1;
      }
    }
    
    if (isWorkContext) {
      // Work dates should be more recent
      if (suggestedYear >= this.currentYear - 5 && suggestedYear <= this.currentYear) {
        confidence += 0.1;
      }
    }
    
    // Check for common typo patterns
    if (this.isCommonTypoPattern(originalYear, suggestedYear)) {
      confidence += 0.15;
    }
    
    return Math.min(confidence, 1.0);
  }
  
  /**
   * Calculate confidence for transposition errors
   */
  private calculateTranspositionConfidence(originalYear: number, transposedYear: number, extractedDate: ExtractedDate): number {
    let confidence = 0.4; // Base confidence for transposition
    
    // Higher confidence if transposed year is much more reasonable
    const originalDistance = Math.abs(originalYear - this.currentYear);
    const transposedDistance = Math.abs(transposedYear - this.currentYear);
    
    if (transposedDistance < originalDistance / 2) {
      confidence += 0.3;
    }
    
    // Higher confidence if original year is very unrealistic
    if (originalYear > this.currentYear + 10) {
      confidence += 0.2;
    }
    
    return Math.min(confidence, 1.0);
  }
  
  /**
   * Calculate confidence for off-by-one errors
   */
  private calculateOffByOneConfidence(originalYear: number, candidateYear: number, extractedDate: ExtractedDate, context: ValidationContext): number {
    let confidence = 0.3; // Base confidence for off-by-one
    
    // Higher confidence if candidate year makes more sense in context
    const isEducationContext = this.isEducationContext(extractedDate.context);
    const isWorkContext = this.isWorkContext(extractedDate.context);
    
    if (isEducationContext) {
      // Check if candidate year fits better with education timeline
      const educationPeriods = context.educationPeriods;
      if (this.fitsEducationTimeline(candidateYear, educationPeriods)) {
        confidence += 0.2;
      }
    }
    
    if (isWorkContext) {
      // Check if candidate year fits better with work timeline
      const workExperience = context.workExperience;
      if (this.fitsWorkTimeline(candidateYear, workExperience)) {
        confidence += 0.2;
      }
    }
    
    // Higher confidence if original year creates timeline issues
    if (originalYear > this.currentYear + 2) {
      confidence += 0.2;
    }
    
    return Math.min(confidence, 1.0);
  }
  
  /**
   * Check if a year is reasonable for resume dates
   */
  private isReasonableYear(year: number): boolean {
    return year >= 1970 && year <= this.currentYear + 5;
  }
  
  /**
   * Check for common typo patterns
   */
  private isCommonTypoPattern(originalYear: number, suggestedYear: number): boolean {
    const difference = Math.abs(originalYear - suggestedYear);
    
    // Common patterns: 10-year difference (2025 vs 2015), 1-year difference
    return difference === 10 || difference === 1 || difference === 2;
  }
  
  /**
   * Check if year fits education timeline
   */
  private fitsEducationTimeline(year: number, educationPeriods: any[]): boolean {
    // Simple check: year should be within reasonable education range
    return year >= this.currentYear - 15 && year <= this.currentYear + 4;
  }
  
  /**
   * Check if year fits work timeline
   */
  private fitsWorkTimeline(year: number, workExperience: any[]): boolean {
    // Simple check: year should be within reasonable work range
    return year >= this.currentYear - 10 && year <= this.currentYear;
  }
  
  /**
   * Extract all dates from validation context
   */
  private extractAllDatesFromContext(context: ValidationContext): ExtractedDate[] {
    // This would use the parser to extract dates from the resume text
    // For now, we'll create a simple implementation
    const dates: ExtractedDate[] = [];
    
    // Extract dates from education periods
    for (const education of context.educationPeriods) {
      if (education.startDate) {
        dates.push(this.createExtractedDateFromDate(education.startDate, education.originalText, 'education'));
      }
      if (education.endDate) {
        dates.push(this.createExtractedDateFromDate(education.endDate, education.originalText, 'education'));
      }
    }
    
    // Extract dates from work experience
    for (const work of context.workExperience) {
      if (work.startDate) {
        dates.push(this.createExtractedDateFromDate(work.startDate, work.originalText, 'work'));
      }
      if (work.endDate) {
        dates.push(this.createExtractedDateFromDate(work.endDate, work.originalText, 'work'));
      }
    }
    
    return dates;
  }
  
  /**
   * Create an ExtractedDate from a Date object
   */
  private createExtractedDateFromDate(date: Date, originalText: string, contextType: string): ExtractedDate {
    const year = date.getFullYear();
    const yearStr = year.toString();
    const startIndex = originalText.indexOf(yearStr);
    
    return {
      text: yearStr,
      startIndex: startIndex >= 0 ? startIndex : 0,
      endIndex: startIndex >= 0 ? startIndex + yearStr.length : yearStr.length,
      parsedDate: {
        original: yearStr,
        normalized: date,
        format: 'YYYY' as any,
        isOngoing: false,
        confidence: 0.9
      },
      context: `${contextType}: ${originalText}`
    };
  }
  
  /**
   * Check if context suggests education-related content
   */
  private isEducationContext(context: string): boolean {
    const educationKeywords = [
      'university', 'college', 'school', 'degree', 'bachelor', 'master',
      'phd', 'doctorate', 'diploma', 'certificate', 'graduation', 'graduated',
      'education', 'academic', 'student', 'gpa', 'major', 'minor'
    ];
    
    const lowerContext = context.toLowerCase();
    return educationKeywords.some(keyword => lowerContext.includes(keyword));
  }
  
  /**
   * Check if context suggests work-related content
   */
  private isWorkContext(context: string): boolean {
    const workKeywords = [
      'company', 'corporation', 'inc', 'ltd', 'llc', 'work', 'job',
      'position', 'role', 'employment', 'experience', 'career',
      'professional', 'intern', 'internship', 'volunteer', 'manager',
      'developer', 'engineer', 'analyst', 'consultant', 'director'
    ];
    
    const lowerContext = context.toLowerCase();
    return workKeywords.some(keyword => lowerContext.includes(keyword));
  }
}