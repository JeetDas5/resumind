/**
 * Integration test for enhanced logging with existing date validation system
 * Verifies that logging doesn't break existing functionality
 */

import { createDateValidationServiceWithPersistence } from '../dateValidation';
import { getValidationAnalytics, exportValidationLogs, getRecentEdgeCases } from '../dateValidation';

export async function testLoggingIntegration() {
  console.log('=== Testing Logging Integration ===\n');

  try {
    // Test 1: Create service with persistence and logging
    console.log('1. Creating date validation service with persistence...');
    const service = await createDateValidationServiceWithPersistence();
    
    // Test 2: Run validation on sample resume
    console.log('2. Running validation with logging...');
    const sampleResume = `
      Jane Smith
      Data Scientist
      
      Education:
      PhD in Data Science, MIT
      2020 - 2024
      
      Work Experience:
      Senior Data Scientist, Google
      2024 - Present
      
      Data Analyst, Facebook
      2022 - 2024
      
      Intern, Microsoft
      Summer 2021
    `;
    
    const result = service.validateResumeDates(sampleResume);
    console.log(`   Validation result: ${result.isValid ? 'Valid' : 'Invalid'}`);
    console.log(`   Issues found: ${result.issues.length}`);
    console.log(`   Warnings: ${result.warnings.length}`);
    console.log(`   Suggestions: ${result.suggestions.length}`);
    
    // Test 3: Get analytics
    console.log('\n3. Testing analytics retrieval...');
    const analytics = await getValidationAnalytics();
    if (analytics) {
      console.log(`   Total validations: ${analytics.totalValidations}`);
      console.log(`   Successful validations: ${analytics.successfulValidations}`);
      console.log(`   Average processing time: ${analytics.averageProcessingTime.toFixed(2)}ms`);
      console.log(`   Edge cases encountered: ${analytics.edgeCasesEncountered}`);
    } else {
      console.log('   Analytics not available');
    }
    
    // Test 4: Export logs
    console.log('\n4. Testing log export...');
    const exportedLogs = await exportValidationLogs();
    if (exportedLogs) {
      console.log(`   Log entries exported: ${exportedLogs.logEntries.length}`);
      console.log(`   Performance metrics exported: ${exportedLogs.performanceMetrics.length}`);
      console.log(`   Edge cases exported: ${exportedLogs.edgeCases.length}`);
    } else {
      console.log('   Log export not available');
    }
    
    // Test 5: Get recent edge cases
    console.log('\n5. Testing edge case retrieval...');
    const edgeCases = await getRecentEdgeCases(5);
    console.log(`   Recent edge cases: ${edgeCases.length}`);
    edgeCases.forEach((edgeCase, index) => {
      console.log(`   ${index + 1}. ${edgeCase.caseType}: ${edgeCase.description.substring(0, 50)}...`);
    });
    
    // Test 6: Run validation with problematic dates to trigger edge case logging
    console.log('\n6. Testing edge case detection...');
    const problematicResume = `
      Test User
      
      Education:
      University of Future, 2030 - 2034
      
      Work Experience:
      Future Corp, 2035 - Present
      Invalid Corp, 2025/13/45 - 2026/99/99
    `;
    
    const problematicResult = service.validateResumeDates(problematicResume);
    console.log(`   Problematic validation result: ${problematicResult.isValid ? 'Valid' : 'Invalid'}`);
    console.log(`   Issues found: ${problematicResult.issues.length}`);
    
    // Check if new edge cases were logged
    const newEdgeCases = await getRecentEdgeCases(10);
    console.log(`   Total edge cases after problematic validation: ${newEdgeCases.length}`);
    
    console.log('\n=== Logging Integration Test Completed Successfully ===');
    return true;
    
  } catch (error) {
    console.error('Error during integration test:', error);
    return false;
  }
}

// Export for use in other test files
export { testLoggingIntegration as default };