import type { ValidationConfig } from './types';
import { dateValidationConfigPersistence } from './config-persistence';

/**
 * Default configuration for date validation
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  maxFutureEducationYears: 4,
  maxFutureWorkMonths: 3,
  enableTypoDetection: true,
  confidenceThreshold: 0.8,
  strictMode: false
};

/**
 * Configuration validation rules
 */
export const CONFIG_VALIDATION_RULES = {
  maxFutureEducationYears: {
    min: 0,
    max: 10,
    message: 'maxFutureEducationYears must be between 0 and 10 years'
  },
  maxFutureWorkMonths: {
    min: 0,
    max: 12,
    message: 'maxFutureWorkMonths must be between 0 and 12 months'
  },
  confidenceThreshold: {
    min: 0,
    max: 1,
    message: 'confidenceThreshold must be between 0 and 1'
  }
} as const;

/**
 * Configuration manager for date validation settings
 */
export class DateValidationConfigManager {
  private config: ValidationConfig;
  private debugMode: boolean = false;
  private isInitialized: boolean = false;

  constructor(customConfig?: Partial<ValidationConfig>) {
    this.config = {
      ...DEFAULT_VALIDATION_CONFIG,
      ...customConfig
    };
    this.validateConfig();
    this.logConfigurationLoaded();
  }

  /**
   * Initialize configuration from persistent storage
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const storedConfig = await dateValidationConfigPersistence.loadConfig();
      this.config = storedConfig;
      this.validateConfig();
      this.isInitialized = true;
      console.log('[DateValidationConfigManager] Initialized with stored configuration');
    } catch (error) {
      console.error('[DateValidationConfigManager] Failed to initialize from storage, using defaults:', error);
      this.config = { ...DEFAULT_VALIDATION_CONFIG };
      this.isInitialized = true;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ValidationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration with new values
   */
  async updateConfig(updates: Partial<ValidationConfig>): Promise<void> {
    const oldConfig = { ...this.config };
    this.config = {
      ...this.config,
      ...updates
    };
    
    try {
      this.validateConfig();
      
      // Persist the updated configuration
      const success = await dateValidationConfigPersistence.saveConfig(this.config);
      if (!success) {
        console.warn('[DateValidationConfigManager] Failed to persist configuration updates');
      }
      
      this.logConfigurationUpdated(oldConfig, updates);
    } catch (error) {
      // Rollback on validation failure
      this.config = oldConfig;
      throw error;
    }
  }

  /**
   * Update configuration synchronously (without persistence)
   */
  updateConfigSync(updates: Partial<ValidationConfig>): void {
    const oldConfig = { ...this.config };
    this.config = {
      ...this.config,
      ...updates
    };
    
    try {
      this.validateConfig();
      this.logConfigurationUpdated(oldConfig, updates);
    } catch (error) {
      // Rollback on validation failure
      this.config = oldConfig;
      throw error;
    }
  }

  /**
   * Reset configuration to defaults
   */
  async resetToDefaults(): Promise<void> {
    const oldConfig = { ...this.config };
    this.config = { ...DEFAULT_VALIDATION_CONFIG };
    
    try {
      // Persist the reset configuration
      const success = await dateValidationConfigPersistence.saveConfig(this.config);
      if (!success) {
        console.warn('[DateValidationConfigManager] Failed to persist configuration reset');
      }
      
      this.logConfigurationReset(oldConfig);
    } catch (error) {
      console.error('[DateValidationConfigManager] Error resetting configuration:', error);
      // Keep the reset in memory even if persistence fails
      this.logConfigurationReset(oldConfig);
    }
  }

  /**
   * Reset configuration to defaults synchronously (without persistence)
   */
  resetToDefaultsSync(): void {
    const oldConfig = { ...this.config };
    this.config = { ...DEFAULT_VALIDATION_CONFIG };
    this.logConfigurationReset(oldConfig);
  }

  /**
   * Get maximum future date for education
   */
  getMaxFutureEducationDate(): Date {
    const now = new Date();
    return new Date(now.getFullYear() + this.config.maxFutureEducationYears, now.getMonth(), now.getDate());
  }

  /**
   * Get maximum future date for work experience
   */
  getMaxFutureWorkDate(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + this.config.maxFutureWorkMonths, now.getDate());
  }

  /**
   * Check if typo detection is enabled
   */
  isTypoDetectionEnabled(): boolean {
    return this.config.enableTypoDetection;
  }

  /**
   * Get confidence threshold for validation
   */
  getConfidenceThreshold(): number {
    return this.config.confidenceThreshold;
  }

  /**
   * Check if strict mode is enabled
   */
  isStrictModeEnabled(): boolean {
    return this.config.strictMode;
  }

  /**
   * Enable or disable debug mode for detailed logging
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    console.log(`[DateValidationConfig] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugModeEnabled(): boolean {
    return this.debugMode;
  }

  /**
   * Log a date for debugging purposes
   */
  logDate(context: string, date: Date | null, originalText?: string): void {
    if (this.debugMode) {
      console.log(`[DateValidationConfig] ${context}:`, {
        date: date ? date.toISOString() : 'null',
        formatted: date ? date.toLocaleDateString() : 'null',
        originalText: originalText || 'N/A',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log multiple dates for debugging purposes
   */
  logDates(context: string, dates: Array<{ date: Date | null; originalText?: string; label?: string }>): void {
    if (this.debugMode) {
      console.log(`[DateValidationConfig] ${context}:`, {
        count: dates.length,
        dates: dates.map((item, index) => ({
          index,
          label: item.label || `Date ${index + 1}`,
          date: item.date ? item.date.toISOString() : 'null',
          formatted: item.date ? item.date.toLocaleDateString() : 'null',
          originalText: item.originalText || 'N/A'
        })),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get configuration as a plain object for serialization
   */
  toJSON(): ValidationConfig {
    return { ...this.config };
  }

  /**
   * Create configuration from JSON object
   */
  static fromJSON(json: Partial<ValidationConfig>): DateValidationConfigManager {
    return new DateValidationConfigManager(json);
  }

  /**
   * Create and initialize configuration manager from persistent storage
   */
  static async createFromStorage(): Promise<DateValidationConfigManager> {
    const manager = new DateValidationConfigManager();
    await manager.initialize();
    return manager;
  }

  /**
   * Check if configuration has been initialized from storage
   */
  isConfigInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Force reload configuration from storage
   */
  async reloadFromStorage(): Promise<void> {
    try {
      dateValidationConfigPersistence.clearCache();
      const storedConfig = await dateValidationConfigPersistence.loadConfig();
      this.config = storedConfig;
      this.validateConfig();
      console.log('[DateValidationConfigManager] Configuration reloaded from storage');
    } catch (error) {
      console.error('[DateValidationConfigManager] Failed to reload configuration from storage:', error);
      throw error;
    }
  }

  /**
   * Get configuration metadata from storage
   */
  async getStorageMetadata(): Promise<{ version: string; timestamp: string } | null> {
    return await dateValidationConfigPersistence.getConfigMetadata();
  }

  /**
   * Check if configuration exists in persistent storage
   */
  async hasStoredConfiguration(): Promise<boolean> {
    return await dateValidationConfigPersistence.hasStoredConfig();
  }

  /**
   * Validate configuration values
   */
  private validateConfig(): void {
    const errors: string[] = [];

    // Validate maxFutureEducationYears
    const eduYears = this.config.maxFutureEducationYears;
    if (typeof eduYears !== 'number' || isNaN(eduYears) || 
        eduYears < CONFIG_VALIDATION_RULES.maxFutureEducationYears.min || 
        eduYears > CONFIG_VALIDATION_RULES.maxFutureEducationYears.max) {
      errors.push(CONFIG_VALIDATION_RULES.maxFutureEducationYears.message);
    }

    // Validate maxFutureWorkMonths
    const workMonths = this.config.maxFutureWorkMonths;
    if (typeof workMonths !== 'number' || isNaN(workMonths) || 
        workMonths < CONFIG_VALIDATION_RULES.maxFutureWorkMonths.min || 
        workMonths > CONFIG_VALIDATION_RULES.maxFutureWorkMonths.max) {
      errors.push(CONFIG_VALIDATION_RULES.maxFutureWorkMonths.message);
    }

    // Validate confidenceThreshold
    const threshold = this.config.confidenceThreshold;
    if (typeof threshold !== 'number' || isNaN(threshold) || 
        threshold < CONFIG_VALIDATION_RULES.confidenceThreshold.min || 
        threshold > CONFIG_VALIDATION_RULES.confidenceThreshold.max) {
      errors.push(CONFIG_VALIDATION_RULES.confidenceThreshold.message);
    }

    // Validate boolean values
    if (typeof this.config.enableTypoDetection !== 'boolean') {
      errors.push('enableTypoDetection must be a boolean value');
    }

    if (typeof this.config.strictMode !== 'boolean') {
      errors.push('strictMode must be a boolean value');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Log configuration loading
   */
  private logConfigurationLoaded(): void {
    console.log('[DateValidationConfig] Configuration loaded:', {
      maxFutureEducationYears: this.config.maxFutureEducationYears,
      maxFutureWorkMonths: this.config.maxFutureWorkMonths,
      enableTypoDetection: this.config.enableTypoDetection,
      confidenceThreshold: this.config.confidenceThreshold,
      strictMode: this.config.strictMode,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log configuration updates
   */
  private logConfigurationUpdated(oldConfig: ValidationConfig, updates: Partial<ValidationConfig>): void {
    console.log('[DateValidationConfig] Configuration updated:', {
      updates,
      oldConfig,
      newConfig: this.config,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log configuration reset
   */
  private logConfigurationReset(oldConfig: ValidationConfig): void {
    console.log('[DateValidationConfig] Configuration reset to defaults:', {
      oldConfig,
      newConfig: this.config,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Global configuration instance
 */
export const dateValidationConfig = new DateValidationConfigManager();