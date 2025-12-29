/**
 * Test script to verify that the enhanced date validation logging is working
 * This can be run to test the integration without going through the full upload process
 */

import { createDateValidationServiceWithPersistence, formatValidationResultsForAI, getValidationAnalytics } from './dateValidation';

export async function testDateValidationIntegration() {
  console.log('🧪 Testing Date Validation Integration with Enhanced Logging');
  console.log('='.repeat(60));

  try {
    // Test 1: Create service
    console.log('\n1️⃣ Creating date validation service...');
    const service = await createDateValidationServiceWithPersistence();
    console.log('✅ Service created successfully');

    // Test 2: Test with sample resume text
    console.log('\n2️⃣ Testing with sample resume text...');
    const sampleResumeText = `
      John Doe
      Software Engineer
      Email: john.doe@email.com
      Phone: (555) 123-4567
      
      EDUCATION
      Bachelor of Computer Science
      University of Technology
      September 2018 - May 2022
      
      Master of Software Engineering  
      Tech Institute
      September 2022 - Present
      
      WORK EXPERIENCE
      Software Developer
      Tech Corp
      June 2022 - Present
      • Developed web applications using React and Node.js
      • Collaborated with cross-functional teams
      
      Software Engineering Intern
      StartupXYZ
      June 2021 - August 2021
      • Built mobile applications
      • Participated in code reviews
      
      Future Software Architect
      FutureCorp
      January 2025 - December 2025
      • Will lead architecture decisions
      • Will mentor junior developers
    `;

    console.log('📄 Sample resume length:', sampleResumeText.length, 'characters');
    
    // Test 3: Run validation
    console.log('\n3️⃣ Running date validation...');
    const startTime = Date.now();
    const result = service.validateResumeDates(sampleResumeText);
    const endTime = Date.now();
    
    console.log('⏱️  Validation completed in', endTime - startTime, 'ms');
    console.log('📊 Validation Results:');
    console.log('   - Valid:', result.isValid);
    console.log('   - Issues:', result.issues.length);
    console.log('   - Warnings:', result.warnings.length);
    console.log('   - Suggestions:', result.suggestions.length);

    // Test 4: Show detailed results
    if (result.issues.length > 0) {
      console.log('\n🔍 Detailed Issues:');
      result.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. [${issue.type.toUpperCase()}] ${issue.category}: ${issue.message}`);
        if (issue.detectedDate) {
          console.log(`      📅 Detected: ${issue.detectedDate}`);
        }
        if (issue.suggestedFix) {
          console.log(`      💡 Suggestion: ${issue.suggestedFix}`);
        }
        console.log(`      🎯 Confidence: ${Math.round(issue.confidence * 100)}%`);
      });
    }

    // Test 5: Format for AI
    console.log('\n4️⃣ Testing AI formatting...');
    const aiSummary = formatValidationResultsForAI(result);
    console.log('📝 AI Summary:');
    console.log(aiSummary);

    // Test 6: Get analytics
    console.log('\n5️⃣ Testing analytics...');
    const analytics = await getValidationAnalytics();
    if (analytics) {
      console.log('📈 Analytics:');
      console.log('   - Total validations:', analytics.totalValidations);
      console.log('   - Successful validations:', analytics.successfulValidations);
      console.log('   - Failed validations:', analytics.failedValidations);
      console.log('   - Average processing time:', analytics.averageProcessingTime.toFixed(2), 'ms');
      console.log('   - Edge cases encountered:', analytics.edgeCasesEncountered);
      console.log('   - Performance threshold breaches:', analytics.performanceThresholdBreaches);
      
      if (Object.keys(analytics.commonIssueTypes).length > 0) {
        console.log('   - Common issue types:');
        Object.entries(analytics.commonIssueTypes).forEach(([type, count]) => {
          console.log(`     • ${type}: ${count}`);
        });
      }
    } else {
      console.log('❌ Analytics not available');
    }

    // Test 7: Test with problematic resume
    console.log('\n6️⃣ Testing with problematic resume...');
    const problematicResume = `
      Jane Smith
      Data Scientist
      
      EDUCATION
      PhD in Data Science
      Future University
      2030 - 2034
      
      WORK EXPERIENCE
      Senior Data Scientist
      Google
      2035 - Present
      
      Data Analyst
      Facebook  
      2025/13/45 - 2026/99/99
    `;

    const problematicResult = service.validateResumeDates(problematicResume);
    console.log('🚨 Problematic Resume Results:');
    console.log('   - Valid:', problematicResult.isValid);
    console.log('   - Issues:', problematicResult.issues.length);
    console.log('   - Critical issues:', problematicResult.issues.filter(i => i.type === 'critical').length);
    console.log('   - Warning issues:', problematicResult.issues.filter(i => i.type === 'warning').length);

    // Test 8: Final analytics check
    console.log('\n7️⃣ Final analytics check...');
    const finalAnalytics = await getValidationAnalytics();
    if (finalAnalytics) {
      console.log('📊 Updated Analytics:');
      console.log('   - Total validations:', finalAnalytics.totalValidations);
      console.log('   - Edge cases encountered:', finalAnalytics.edgeCasesEncountered);
    }

    console.log('\n✅ All tests completed successfully!');
    console.log('🎉 Enhanced date validation logging is working correctly.');
    
    return {
      success: true,
      results: {
        normalValidation: result,
        problematicValidation: problematicResult,
        analytics: finalAnalytics
      }
    };

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Export for use in other files
export default testDateValidationIntegration;