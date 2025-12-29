/**
 * Test script to verify enhanced logging functionality
 * This demonstrates the comprehensive logging capabilities added in task 8.2
 */

import { DateValidationLogger } from './logger';
import { ResumeDateValidationService } from './service';

export async function testEnhancedLogging() {
  console.log('=== Testing Enhanced Date Validation Logging ===\n');

  // Get logger instance
  const logger = DateValidationLogger.getInstance();
  logger.setDebugMode(true);
  logger.setPerformanceThreshold(500); // 500ms threshold for testing

  // Test sample resume text with various date scenarios
  const testResumeText = `
    John Doe
    Software Engineer
    
    Education:
    Bachelor of Computer Science, University of Technology
    September 2018 - May 2022
    
    Master of Software Engineering, Tech Institute
    September 2022 - Present
    
    Work Experience:
    Software Developer, Tech Corp
    June 2022 - Present
    
    Intern, StartupXYZ
    June 2021 - August 2021
    
    Future position at FutureCorp
    January 2025 - December 2025
  `;

  try {
    // Create service and run validation
    console.log('1. Creating date validation service...');
    const service = await ResumeDateValidationService.createWithStoredConfig();
    
    console.log('2. Running date validation with enhanced logging...');
    const result = service.validateResumeDates(testResumeText);
    
    console.log('3. Validation completed. Results:');
    console.log(`   - Valid: ${result.isValid}`);
    console.log(`   - Issues: ${result.issues.length}`);
    console.log(`   - Warnings: ${result.warnings.length}`);
    console.log(`   - Suggestions: ${result.suggestions.length}`);
    
    // Test analytics
    console.log('\n4. Getting validation analytics...');
    const analytics = logger.getAnalytics();
    console.log('   Analytics:', JSON.stringify(analytics, null, 2));
    
    // Test recent logs
    console.log('\n5. Getting recent log entries...');
    const recentLogs = logger.getRecentLogs(10);
    console.log(`   Recent logs count: ${recentLogs.length}`);
    recentLogs.forEach((log, index) => {
      console.log(`   ${index + 1}. [${log.level}] ${log.category}:${log.operation} - ${JSON.stringify(log.data)}`);
    });
    
    // Test edge cases
    console.log('\n6. Getting recent edge cases...');
    const edgeCases = logger.getRecentEdgeCases(5);
    console.log(`   Edge cases count: ${edgeCases.length}`);
    edgeCases.forEach((edgeCase, index) => {
      console.log(`   ${index + 1}. ${edgeCase.caseType}: ${edgeCase.description}`);
    });
    
    // Test slow operations
    console.log('\n7. Getting slow operations...');
    const slowOps = logger.getSlowOperations(100); // Operations slower than 100ms
    console.log(`   Slow operations count: ${slowOps.length}`);
    slowOps.forEach((op, index) => {
      console.log(`   ${index + 1}. ${op.operationName}: ${op.duration?.toFixed(2)}ms`);
    });
    
    // Test log export
    console.log('\n8. Testing log export...');
    const exportedLogs = logger.exportLogs();
    console.log(`   Exported log entries: ${exportedLogs.logEntries.length}`);
    console.log(`   Exported performance metrics: ${exportedLogs.performanceMetrics.length}`);
    console.log(`   Exported edge cases: ${exportedLogs.edgeCases.length}`);
    
    console.log('\n=== Enhanced Logging Test Completed Successfully ===');
    return true;
    
  } catch (error) {
    console.error('Error during logging test:', error);
    return false;
  }
}

// Export for use in other test files
export { testEnhancedLogging as default };