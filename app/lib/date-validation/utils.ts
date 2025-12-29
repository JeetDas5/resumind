/**
 * Utility functions for date validation
 */

/**
 * Check if a date is in the future
 */
export function isFutureDate(date: Date, referenceDate: Date = new Date()): boolean {
  return date > referenceDate;
}

/**
 * Check if a date is within a reasonable range
 */
export function isDateInRange(date: Date, minDate: Date, maxDate: Date): boolean {
  return date >= minDate && date <= maxDate;
}

/**
 * Calculate the difference in years between two dates
 */
export function getYearsDifference(startDate: Date, endDate: Date): number {
  return endDate.getFullYear() - startDate.getFullYear();
}

/**
 * Calculate the difference in months between two dates
 */
export function getMonthsDifference(startDate: Date, endDate: Date): number {
  const yearDiff = endDate.getFullYear() - startDate.getFullYear();
  const monthDiff = endDate.getMonth() - startDate.getMonth();
  return yearDiff * 12 + monthDiff;
}

/**
 * Check if a string indicates an ongoing status
 */
export function isOngoingStatus(text: string): boolean {
  const ongoingKeywords = ['present', 'current', 'ongoing', 'now', 'today'];
  return ongoingKeywords.some(keyword => 
    text.toLowerCase().includes(keyword.toLowerCase())
  );
}

/**
 * Normalize date string for comparison
 */
export function normalizeDateString(dateStr: string): string {
  return dateStr.toLowerCase().trim().replace(/[^\w\s]/g, '');
}

/**
 * Check if two dates are approximately equal (within a month)
 */
export function areDatesApproximatelyEqual(date1: Date, date2: Date, toleranceMonths: number = 1): boolean {
  const diffMonths = Math.abs(getMonthsDifference(date1, date2));
  return diffMonths <= toleranceMonths;
}

/**
 * Get a human-readable description of the time difference
 */
export function getTimeDifferenceDescription(startDate: Date, endDate: Date): string {
  const years = getYearsDifference(startDate, endDate);
  const months = getMonthsDifference(startDate, endDate) % 12;
  
  if (years === 0) {
    return months === 1 ? '1 month' : `${months} months`;
  } else if (months === 0) {
    return years === 1 ? '1 year' : `${years} years`;
  } else {
    return `${years} year${years > 1 ? 's' : ''} and ${months} month${months > 1 ? 's' : ''}`;
  }
}