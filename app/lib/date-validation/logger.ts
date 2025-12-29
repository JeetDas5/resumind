/**
 * Comprehensive logging utility for date validation operations
 * Provides structured logging with performance monitoring and debug capabilities
 */

export interface ValidationLogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: 'validation' | 'parsing' | 'config' | 'performance' | 'edge-case';
  operation: string;
  data: Record<string, any>;
  duration?: number;
  error?: {
    message: string;
    stack?: string;
  };
}

export interface PerformanceMetrics {
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
  };
  metadata?: Record<string, any>;
}

export interface EdgeCaseLog {
  timestamp: string;
  caseType: 'unusual_date_format' | 'ambiguous_date' | 'missing_date' | 'invalid_date' | 'unexpected_pattern';
  description: string;
  context: string;
  originalText: string;
  suggestedAction?: string;
}

export interface ValidationAnalytics {
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  averageProcessingTime: number;
  commonIssueTypes: Record<string, number>;
  edgeCasesEncountered: number;
  performanceThresholdBreaches: number;
}

export class DateValidationLogger {
  private static instance: DateValidationLogger;
  private logEntries: ValidationLogEntry[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private edgeCases: EdgeCaseLog[] = [];
  private maxLogEntries = 1000; // Prevent memory leaks
  private maxPerformanceEntries = 500;
  private maxEdgeCases = 200;
  private debugMode = false;
  private performanceThreshold = 1000; // 1 second threshold for slow operations

  private constructor() {
    // Initialize with startup log
    this.log('info', 'validation', 'logger_initialized', {
      timestamp: new Date().toISOString(),
      maxLogEntries: this.maxLogEntries,
      maxPerformanceEntries: this.maxPerformanceEntries,
      debugMode: this.debugMode
    });
  }

  static getInstance(): DateValidationLogger {
    if (!DateValidationLogger.instance) {
      DateValidationLogger.instance = new DateValidationLogger();
    }
    return DateValidationLogger.instance;
  }

  /**
   * Enable or disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.log('info', 'config', 'debug_mode_changed', { debugMode: enabled });
  }

  /**
   * Set performance threshold for slow operation detection
   */
  setPerformanceThreshold(thresholdMs: number): void {
    this.performanceThreshold = thresholdMs;
    this.log('info', 'config', 'performance_threshold_changed', { 
      oldThreshold: this.performanceThreshold,
      newThreshold: thresholdMs 
    });
  }

  /**
   * Log a validation operation with structured data
   */
  log(
    level: ValidationLogEntry['level'],
    category: ValidationLogEntry['category'],
    operation: string,
    data: Record<string, any>,
    duration?: number,
    error?: Error
  ): void {
    const entry: ValidationLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      operation,
      data,
      duration,
      error: error ? {
        message: error.message,
        stack: error.stack
      } : undefined
    };

    this.logEntries.push(entry);
    this.trimLogEntries();

    // Console output for immediate visibility
    const logMessage = `[DateValidationLogger] ${level.toUpperCase()} [${category}] ${operation}`;
    const logData = { ...data, duration: duration ? `${duration.toFixed(2)}ms` : undefined };

    switch (level) {
      case 'debug':
        if (this.debugMode) {
          console.debug(logMessage, logData);
        }
        break;
      case 'info':
        console.log(logMessage, logData);
        break;
      case 'warn':
        console.warn(logMessage, logData, error);
        break;
      case 'error':
        console.error(logMessage, logData, error);
        break;
    }
  }

  /**
   * Start performance monitoring for an operation
   */
  startPerformanceMonitoring(operationName: string, metadata?: Record<string, any>): string {
    const operationId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const metrics: PerformanceMetrics = {
      operationName,
      startTime: performance.now(),
      metadata: {
        operationId,
        ...metadata
      }
    };

    // Capture memory usage if available
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      metrics.memoryUsage = {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal
      };
    }

    this.performanceMetrics.push(metrics);
    this.trimPerformanceMetrics();

    this.log('debug', 'performance', 'operation_started', {
      operationName,
      operationId,
      startTime: metrics.startTime,
      memoryUsage: metrics.memoryUsage
    });

    return operationId;
  }

  /**
   * End performance monitoring for an operation
   */
  endPerformanceMonitoring(operationId: string, additionalData?: Record<string, any>): number | null {
    const metrics = this.performanceMetrics.find(m => 
      m.metadata?.operationId === operationId
    );

    if (!metrics) {
      this.log('warn', 'performance', 'operation_not_found', { operationId });
      return null;
    }

    metrics.endTime = performance.now();
    metrics.duration = metrics.endTime - metrics.startTime;

    // Capture end memory usage if available
    let memoryDelta;
    if (typeof process !== 'undefined' && process.memoryUsage && metrics.memoryUsage) {
      const endMemUsage = process.memoryUsage();
      memoryDelta = {
        heapUsedDelta: endMemUsage.heapUsed - metrics.memoryUsage.heapUsed,
        heapTotalDelta: endMemUsage.heapTotal - metrics.memoryUsage.heapTotal
      };
    }

    const logData = {
      operationName: metrics.operationName,
      operationId,
      duration: metrics.duration,
      memoryDelta,
      ...additionalData
    };

    // Check if operation exceeded performance threshold
    if (metrics.duration > this.performanceThreshold) {
      this.log('warn', 'performance', 'slow_operation_detected', {
        ...logData,
        threshold: this.performanceThreshold,
        exceedBy: metrics.duration - this.performanceThreshold
      });
    } else {
      this.log('debug', 'performance', 'operation_completed', logData);
    }

    return metrics.duration;
  }

  /**
   * Log edge cases encountered during validation
   */
  logEdgeCase(
    caseType: EdgeCaseLog['caseType'],
    description: string,
    context: string,
    originalText: string,
    suggestedAction?: string
  ): void {
    const edgeCase: EdgeCaseLog = {
      timestamp: new Date().toISOString(),
      caseType,
      description,
      context,
      originalText: originalText.length > 200 ? originalText.substring(0, 200) + '...' : originalText,
      suggestedAction
    };

    this.edgeCases.push(edgeCase);
    this.trimEdgeCases();

    this.log('info', 'edge-case', `edge_case_${caseType}`, {
      description,
      context,
      originalTextLength: originalText.length,
      suggestedAction
    });
  }

  /**
   * Log validation results for analysis
   */
  logValidationResults(
    resumeLength: number,
    issuesFound: number,
    warningsFound: number,
    suggestionsFound: number,
    processingTime: number,
    success: boolean
  ): void {
    this.log('info', 'validation', 'validation_completed', {
      resumeLength,
      issuesFound,
      warningsFound,
      suggestionsFound,
      processingTime,
      success,
      issuesPerKb: resumeLength > 0 ? (issuesFound / (resumeLength / 1000)).toFixed(2) : 0
    });
  }

  /**
   * Get analytics summary of validation operations
   */
  getAnalytics(): ValidationAnalytics {
    const validationLogs = this.logEntries.filter(entry => 
      entry.category === 'validation' && entry.operation === 'validation_completed'
    );

    const totalValidations = validationLogs.length;
    const successfulValidations = validationLogs.filter(log => log.data.success).length;
    const failedValidations = totalValidations - successfulValidations;

    const processingTimes = validationLogs
      .map(log => log.data.processingTime)
      .filter(time => typeof time === 'number');
    
    const averageProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
      : 0;

    // Count common issue types
    const commonIssueTypes: Record<string, number> = {};
    this.logEntries
      .filter(entry => entry.category === 'validation' && entry.operation.includes('issue'))
      .forEach(entry => {
        const issueType = entry.data.issueType || entry.operation;
        commonIssueTypes[issueType] = (commonIssueTypes[issueType] || 0) + 1;
      });

    const performanceThresholdBreaches = this.logEntries.filter(entry =>
      entry.category === 'performance' && entry.operation === 'slow_operation_detected'
    ).length;

    return {
      totalValidations,
      successfulValidations,
      failedValidations,
      averageProcessingTime,
      commonIssueTypes,
      edgeCasesEncountered: this.edgeCases.length,
      performanceThresholdBreaches
    };
  }

  /**
   * Get recent log entries
   */
  getRecentLogs(count: number = 50): ValidationLogEntry[] {
    return this.logEntries.slice(-count);
  }

  /**
   * Get recent edge cases
   */
  getRecentEdgeCases(count: number = 20): EdgeCaseLog[] {
    return this.edgeCases.slice(-count);
  }

  /**
   * Get performance metrics for slow operations
   */
  getSlowOperations(thresholdMs?: number): PerformanceMetrics[] {
    const threshold = thresholdMs || this.performanceThreshold;
    return this.performanceMetrics.filter(metric => 
      metric.duration && metric.duration > threshold
    );
  }

  /**
   * Export logs for external analysis
   */
  exportLogs(): {
    logEntries: ValidationLogEntry[];
    performanceMetrics: PerformanceMetrics[];
    edgeCases: EdgeCaseLog[];
    analytics: ValidationAnalytics;
  } {
    return {
      logEntries: [...this.logEntries],
      performanceMetrics: [...this.performanceMetrics],
      edgeCases: [...this.edgeCases],
      analytics: this.getAnalytics()
    };
  }

  /**
   * Clear all logs (useful for testing or memory management)
   */
  clearLogs(): void {
    this.logEntries = [];
    this.performanceMetrics = [];
    this.edgeCases = [];
    this.log('info', 'config', 'logs_cleared', { timestamp: new Date().toISOString() });
  }

  /**
   * Get system health status based on logging data
   */
  getSystemHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
    metrics: {
      errorRate: number;
      averageResponseTime: number;
      slowOperationsCount: number;
      edgeCasesRate: number;
    };
  } {
    const analytics = this.getAnalytics();
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Calculate error rate
    const errorRate = analytics.totalValidations > 0 
      ? (analytics.failedValidations / analytics.totalValidations) * 100 
      : 0;

    // Count recent errors
    const recentErrors = this.logEntries.filter(entry => 
      entry.level === 'error' && 
      new Date(entry.timestamp).getTime() > Date.now() - (24 * 60 * 60 * 1000) // Last 24 hours
    ).length;

    // Check slow operations
    const slowOperationsCount = this.getSlowOperations().length;

    // Calculate edge cases rate
    const edgeCasesRate = analytics.totalValidations > 0 
      ? (analytics.edgeCasesEncountered / analytics.totalValidations) * 100 
      : 0;

    // Determine status and issues
    if (errorRate > 10) {
      status = 'critical';
      issues.push(`High error rate: ${errorRate.toFixed(1)}%`);
      recommendations.push('Investigate recent validation failures');
    } else if (errorRate > 5) {
      status = 'warning';
      issues.push(`Elevated error rate: ${errorRate.toFixed(1)}%`);
      recommendations.push('Monitor validation errors closely');
    }

    if (analytics.averageProcessingTime > 2000) {
      status = status === 'critical' ? 'critical' : 'warning';
      issues.push(`Slow average processing time: ${analytics.averageProcessingTime.toFixed(0)}ms`);
      recommendations.push('Consider performance optimization');
    }

    if (slowOperationsCount > 10) {
      status = status === 'critical' ? 'critical' : 'warning';
      issues.push(`Many slow operations: ${slowOperationsCount}`);
      recommendations.push('Review and optimize slow validation operations');
    }

    if (edgeCasesRate > 20) {
      status = status === 'critical' ? 'critical' : 'warning';
      issues.push(`High edge cases rate: ${edgeCasesRate.toFixed(1)}%`);
      recommendations.push('Review edge cases for potential improvements');
    }

    if (recentErrors > 50) {
      status = 'critical';
      issues.push(`Many recent errors: ${recentErrors} in last 24 hours`);
      recommendations.push('Immediate investigation required');
    }

    if (issues.length === 0) {
      issues.push('System operating normally');
      recommendations.push('Continue monitoring');
    }

    return {
      status,
      issues,
      recommendations,
      metrics: {
        errorRate,
        averageResponseTime: analytics.averageProcessingTime,
        slowOperationsCount,
        edgeCasesRate
      }
    };
  }

  /**
   * Log a debug message with automatic performance monitoring
   */
  debugWithTiming<T>(operation: string, fn: () => T, metadata?: Record<string, any>): T {
    if (!this.debugMode) {
      return fn();
    }

    const operationId = this.startPerformanceMonitoring(operation, metadata);
    try {
      const result = fn();
      this.endPerformanceMonitoring(operationId, { success: true });
      return result;
    } catch (error) {
      this.endPerformanceMonitoring(operationId, { success: false });
      this.log('error', 'validation', `${operation}_failed`, metadata || {}, undefined,
        error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Trim log entries to prevent memory leaks
   */
  private trimLogEntries(): void {
    if (this.logEntries.length > this.maxLogEntries) {
      const removed = this.logEntries.length - this.maxLogEntries;
      this.logEntries = this.logEntries.slice(-this.maxLogEntries);
      
      // Log the trimming action (but don't create infinite loop)
      if (this.logEntries.length < this.maxLogEntries - 10) {
        this.log('debug', 'config', 'log_entries_trimmed', { removedCount: removed });
      }
    }
  }

  /**
   * Trim performance metrics to prevent memory leaks
   */
  private trimPerformanceMetrics(): void {
    if (this.performanceMetrics.length > this.maxPerformanceEntries) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.maxPerformanceEntries);
    }
  }

  /**
   * Trim edge cases to prevent memory leaks
   */
  private trimEdgeCases(): void {
    if (this.edgeCases.length > this.maxEdgeCases) {
      this.edgeCases = this.edgeCases.slice(-this.maxEdgeCases);
    }
  }
}