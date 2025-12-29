import type { DateParser, ParsedDate, ExtractedDate } from './types';
import { DateFormat } from './types';
import { DATE_PATTERNS, ONGOING_KEYWORDS, FORMAT_CONFIDENCE } from './constants';

/**
 * Date parser utility for handling various date formats in resumes
 */
export class ResumeDateParser implements DateParser {
  private readonly monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];

  private readonly monthAbbreviations = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
  ];

  /**
   * Parse a date string and return structured date information
   */
  parseDate(dateString: string): ParsedDate | null {
    try {
      if (!dateString || typeof dateString !== 'string') {
        console.warn('[ResumeDateParser] parseDate: Invalid input - dateString must be a non-empty string');
        return null;
      }

      if (dateString.trim().length === 0) {
        console.warn('[ResumeDateParser] parseDate: Empty dateString provided');
        return null;
      }

      const trimmed = dateString.trim().toLowerCase();
      console.log('[ResumeDateParser] Parsing date string:', { original: dateString, trimmed });
      
      // Check for ongoing status indicators first
      try {
        if (this.isOngoingIndicator(trimmed)) {
          const result = {
            original: dateString,
            normalized: new Date(), // Current date for ongoing
            format: DateFormat.PRESENT,
            isOngoing: true,
            confidence: FORMAT_CONFIDENCE.EXACT_MATCH
          };
          console.log('[ResumeDateParser] Detected ongoing indicator:', result);
          return result;
        }
      } catch (error) {
        console.error('[ResumeDateParser] Error checking ongoing indicator:', {
          error: error instanceof Error ? error.message : String(error),
          dateString
        });
      }

      // Try different date formats
      const formats = [
        { name: 'monthYear', parser: () => this.parseMonthYear(trimmed) },
        { name: 'yearOnly', parser: () => this.parseYearOnly(trimmed) },
        { name: 'fullDate', parser: () => this.parseFullDate(trimmed) }
      ];

      for (const format of formats) {
        try {
          const result = format.parser();
          if (result) {
            const parsedDate = {
              original: dateString,
              normalized: result.date,
              format: result.format,
              isOngoing: false,
              confidence: result.confidence
            };
            console.log('[ResumeDateParser] Successfully parsed with ' + format.name + ':', parsedDate);
            return parsedDate;
          }
        } catch (formatError) {
          console.error('[ResumeDateParser] Error with ' + format.name + ' parser:', {
            error: formatError instanceof Error ? formatError.message : String(formatError),
            dateString,
            trimmed
          });
          // Continue to next format
        }
      }

      console.warn('[ResumeDateParser] No format matched for date string:', dateString);
      return null;

    } catch (error) {
      console.error('[ResumeDateParser] Critical error in parseDate:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        dateString: dateString || 'undefined'
      });
      return null;
    }
  }

  /**
   * Detect the format of a date string
   */
  detectDateFormat(text: string): DateFormat {
    if (!text) return DateFormat.YEAR_ONLY;

    const trimmed = text.trim().toLowerCase();

    if (this.isOngoingIndicator(trimmed)) {
      return DateFormat.PRESENT;
    }

    // Check for month-year format
    if (DATE_PATTERNS.MONTH_YEAR.test(text)) {
      return DateFormat.MONTH_YEAR;
    }

    // Check for full date format
    if (DATE_PATTERNS.FULL_DATE.test(text)) {
      return DateFormat.FULL_DATE;
    }

    // Default to year only
    return DateFormat.YEAR_ONLY;
  }

  /**
   * Extract dates from resume text with context
   */
  extractDatesFromText(text: string): ExtractedDate[] {
    try {
      if (!text || typeof text !== 'string') {
        console.warn('[ResumeDateParser] extractDatesFromText: Invalid text input');
        return [];
      }

      if (text.trim().length === 0) {
        console.warn('[ResumeDateParser] extractDatesFromText: Empty text input');
        return [];
      }

      console.log('[ResumeDateParser] Starting date extraction from text (length: ' + text.length + ')');

      const extractedDates: ExtractedDate[] = [];
      const patterns = [
        {
          regex: DATE_PATTERNS.MONTH_YEAR,
          type: 'month_year'
        },
        {
          regex: DATE_PATTERNS.FULL_DATE,
          type: 'full_date'
        },
        {
          regex: DATE_PATTERNS.YEAR_ONLY,
          type: 'year_only'
        },
        {
          regex: DATE_PATTERNS.PRESENT_INDICATORS,
          type: 'present'
        },
        {
          regex: DATE_PATTERNS.DATE_RANGE,
          type: 'date_range'
        }
      ];

      for (let patternIndex = 0; patternIndex < patterns.length; patternIndex++) {
        const pattern = patterns[patternIndex];
        
        try {
          let match;
          let matchCount = 0;
          const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
          
          console.log('[ResumeDateParser] Processing pattern ' + patternIndex + ' (' + pattern.type + ')');
          
          while ((match = regex.exec(text)) !== null) {
            matchCount++;
            
            try {
              const matchText = match[0];
              const startIndex = match.index;
              const endIndex = startIndex + matchText.length;
              
              // Get context around the match (50 characters before and after)
              const contextStart = Math.max(0, startIndex - 50);
              const contextEnd = Math.min(text.length, endIndex + 50);
              const context = text.substring(contextStart, contextEnd);
              
              console.log('[ResumeDateParser] Found match for pattern ' + pattern.type + ':', {
                matchText,
                startIndex,
                endIndex,
                context: context.trim().substring(0, 100) + (context.trim().length > 100 ? '...' : '')
              });
              
              // Handle date ranges specially
              if (pattern.type === 'date_range') {
                try {
                  this.extractDateRange(match, text, extractedDates);
                  console.log('[ResumeDateParser] Date range extracted successfully');
                } catch (rangeError) {
                  console.error('[ResumeDateParser] Error extracting date range:', {
                    error: rangeError instanceof Error ? rangeError.message : String(rangeError),
                    match: matchText
                  });
                }
              } else {
                // Parse the matched date
                let parsedDate: ParsedDate | null = null;
                try {
                  parsedDate = this.parseDate(matchText);
                } catch (parseError) {
                  console.error('[ResumeDateParser] Error parsing matched date:', {
                    error: parseError instanceof Error ? parseError.message : String(parseError),
                    matchText
                  });
                }
                
                extractedDates.push({
                  text: matchText,
                  startIndex,
                  endIndex,
                  parsedDate,
                  context: context.trim()
                });
                
                console.log('[ResumeDateParser] Date extracted:', {
                  text: matchText,
                  parsed: parsedDate ? parsedDate.normalized.toLocaleDateString() : 'null',
                  isOngoing: parsedDate?.isOngoing || false
                });
              }
            } catch (matchError) {
              console.error('[ResumeDateParser] Error processing match for pattern ' + pattern.type + ':', {
                error: matchError instanceof Error ? matchError.message : String(matchError),
                matchIndex: match.index,
                matchText: match[0]
              });
            }
            
            // Prevent infinite loops
            if (matchCount > 200) {
              console.warn('[ResumeDateParser] Too many matches for pattern ' + pattern.type + ', breaking loop');
              break;
            }
          }
          
          console.log('[ResumeDateParser] Pattern ' + pattern.type + ' completed with ' + matchCount + ' matches');
          
        } catch (patternError) {
          console.error('[ResumeDateParser] Error processing pattern ' + pattern.type + ':', {
            error: patternError instanceof Error ? patternError.message : String(patternError),
            patternIndex,
            patternSource: pattern.regex.source
          });
        }
      }

      // Remove duplicates and sort by position
      let finalDates: ExtractedDate[] = [];
      try {
        finalDates = this.deduplicateAndSort(extractedDates);
        console.log('[ResumeDateParser] Date extraction completed: ' + finalDates.length + ' unique dates found (from ' + extractedDates.length + ' total matches)');
      } catch (dedupeError) {
        console.error('[ResumeDateParser] Error deduplicating dates:', {
          error: dedupeError instanceof Error ? dedupeError.message : String(dedupeError),
          extractedCount: extractedDates.length
        });
        // Return raw extracted dates if deduplication fails
        finalDates = extractedDates;
      }

      return finalDates;

    } catch (error) {
      console.error('[ResumeDateParser] Critical error in extractDatesFromText:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        textLength: text?.length || 0
      });
      return [];
    }
  }

  /**
   * Normalize a date string to a Date object
   */
  normalizeDate(date: string): Date | null {
    const parsed = this.parseDate(date);
    return parsed ? parsed.normalized : null;
  }

  /**
   * Check if a string indicates ongoing status
   */
  private isOngoingIndicator(text: string): boolean {
    return ONGOING_KEYWORDS.some(keyword => 
      text.includes(keyword.toLowerCase())
    );
  }

  /**
   * Parse month-year format (e.g., "January 2023", "Jan 2023")
   */
  private parseMonthYear(text: string): { date: Date; format: DateFormat; confidence: number } | null {
    const monthYearMatch = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b/i);
    
    if (monthYearMatch) {
      const monthStr = monthYearMatch[1].toLowerCase();
      const year = parseInt(monthYearMatch[2]);
      
      let monthIndex = this.monthAbbreviations.indexOf(monthStr);
      if (monthIndex === -1) {
        monthIndex = this.monthNames.indexOf(monthStr);
      }
      
      if (monthIndex !== -1 && this.isValidYear(year)) {
        return {
          date: new Date(year, monthIndex, 1),
          format: DateFormat.MONTH_YEAR,
          confidence: FORMAT_CONFIDENCE.EXACT_MATCH
        };
      }
    }

    return null;
  }

  /**
   * Parse year-only format (e.g., "2023")
   */
  private parseYearOnly(text: string): { date: Date; format: DateFormat; confidence: number } | null {
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    
    if (yearMatch) {
      const year = parseInt(yearMatch[0]);
      
      if (this.isValidYear(year)) {
        return {
          date: new Date(year, 0, 1), // January 1st of the year
          format: DateFormat.YEAR_ONLY,
          confidence: FORMAT_CONFIDENCE.PATTERN_MATCH
        };
      }
    }

    return null;
  }

  /**
   * Parse full date format (e.g., "01/15/2023")
   */
  private parseFullDate(text: string): { date: Date; format: DateFormat; confidence: number } | null {
    const fullDateMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    
    if (fullDateMatch) {
      const month = parseInt(fullDateMatch[1]);
      const day = parseInt(fullDateMatch[2]);
      const year = parseInt(fullDateMatch[3]);
      
      if (this.isValidDate(month, day, year)) {
        return {
          date: new Date(year, month - 1, day), // Month is 0-indexed
          format: DateFormat.FULL_DATE,
          confidence: FORMAT_CONFIDENCE.EXACT_MATCH
        };
      }
    }

    return null;
  }

  /**
   * Validate if a year is reasonable for resume dates
   */
  private isValidYear(year: number): boolean {
    const currentYear = new Date().getFullYear();
    return year >= 1950 && year <= currentYear + 10; // Allow some future dates
  }

  /**
   * Validate if a date is valid
   */
  private isValidDate(month: number, day: number, year: number): boolean {
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (!this.isValidYear(year)) return false;
    
    // Check if the date actually exists (handles leap years, etc.)
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && 
           date.getMonth() === month - 1 && 
           date.getDate() === day;
  }

  /**
   * Extract individual dates from a date range match
   */
  private extractDateRange(match: RegExpExecArray, text: string, extractedDates: ExtractedDate[]): void {
    const fullMatch = match[0];
    const startYear = match[1];
    const endPart = match[2];
    
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;
    const contextStart = Math.max(0, startIndex - 50);
    const contextEnd = Math.min(text.length, endIndex + 50);
    const context = text.substring(contextStart, contextEnd);

    // Parse start date
    const startDate = this.parseDate(startYear);
    if (startDate) {
      extractedDates.push({
        text: startYear,
        startIndex,
        endIndex: startIndex + startYear.length,
        parsedDate: startDate,
        context: context.trim()
      });
    }

    // Parse end date
    const endDate = this.parseDate(endPart);
    if (endDate) {
      const endStartIndex = startIndex + fullMatch.indexOf(endPart);
      extractedDates.push({
        text: endPart,
        startIndex: endStartIndex,
        endIndex: endStartIndex + endPart.length,
        parsedDate: endDate,
        context: context.trim()
      });
    }
  }

  /**
   * Remove duplicate dates and sort by position in text
   */
  private deduplicateAndSort(extractedDates: ExtractedDate[]): ExtractedDate[] {
    // Remove duplicates based on position and text
    const unique = extractedDates.filter((date, index, array) => {
      return array.findIndex(d => 
        d.startIndex === date.startIndex && 
        d.text === date.text
      ) === index;
    });

    // Sort by position in text
    return unique.sort((a, b) => a.startIndex - b.startIndex);
  }

  /**
   * Extract dates specifically from education sections
   */
  extractEducationDates(text: string): ExtractedDate[] {
    const allDates = this.extractDatesFromText(text);
    
    // Filter dates that appear in education context
    return allDates.filter(date => this.isEducationContext(date.context));
  }

  /**
   * Extract dates specifically from work experience sections
   */
  extractWorkExperienceDates(text: string): ExtractedDate[] {
    const allDates = this.extractDatesFromText(text);
    
    // Filter dates that appear in work context
    return allDates.filter(date => this.isWorkContext(date.context));
  }

  /**
   * Check if the context suggests education-related content
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
   * Check if the context suggests work-related content
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