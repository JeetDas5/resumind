import type { ValidationConfig } from './types';
import { DEFAULT_VALIDATION_CONFIG } from './config';
import { usePuterStore } from '../puter';

/**
 * Configuration persistence manager for date validation settings
 * Uses Puter KV store for persistent storage
 */
export class DateValidationConfigPersistence {
  private static readonly CONFIG_KEY = 'date-validation-config';
  private static readonly CONFIG_VERSION = '1.0';
  private cache: ValidationConfig | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Load configuration from persistent storage
   */
  async loadConfig(): Promise<ValidationConfig> {
    const startTime = performance.now();
    
    try {
      // Check cache first
      if (this.isCacheValid()) {
        console.log('[DateValidationConfigPersistence] Returning cached configuration (cache age: ' + ((Date.now() - this.cacheTimestamp) / 1000).toFixed(1) + 's)');
        return this.cache!;
      }

      console.log('[DateValidationConfigPersistence] Loading configuration from persistent storage');

      let puterStore;
      try {
        puterStore = usePuterStore.getState();
        if (!puterStore || !puterStore.kv) {
          throw new Error('Puter store or KV not available');
        }
      } catch (storeError) {
        console.error('[DateValidationConfigPersistence] Error accessing Puter store:', {
          error: storeError instanceof Error ? storeError.message : String(storeError)
        });
        console.log('[DateValidationConfigPersistence] Falling back to default configuration');
        return { ...DEFAULT_VALIDATION_CONFIG };
      }

      let storedData: string | null = null;
      try {
        storedData = await puterStore.kv.get(DateValidationConfigPersistence.CONFIG_KEY);
        console.log('[DateValidationConfigPersistence] KV get operation completed:', {
          hasData: !!storedData,
          dataLength: storedData?.length || 0
        });
      } catch (kvError) {
        console.error('[DateValidationConfigPersistence] Error reading from KV store:', {
          error: kvError instanceof Error ? kvError.message : String(kvError),
          key: DateValidationConfigPersistence.CONFIG_KEY
        });
        console.log('[DateValidationConfigPersistence] Falling back to default configuration');
        return { ...DEFAULT_VALIDATION_CONFIG };
      }

      if (!storedData) {
        console.log('[DateValidationConfigPersistence] No stored configuration found, initializing with defaults');
        const defaultConfig = { ...DEFAULT_VALIDATION_CONFIG };
        
        // Try to save defaults, but don't fail if it doesn't work
        try {
          await this.saveConfig(defaultConfig);
          console.log('[DateValidationConfigPersistence] Default configuration saved successfully');
        } catch (saveError) {
          console.warn('[DateValidationConfigPersistence] Failed to save default configuration:', {
            error: saveError instanceof Error ? saveError.message : String(saveError)
          });
        }
        
        return defaultConfig;
      }

      let parsedData: any;
      try {
        parsedData = JSON.parse(storedData);
        console.log('[DateValidationConfigPersistence] Configuration data parsed successfully');
      } catch (parseError) {
        console.error('[DateValidationConfigPersistence] Error parsing stored configuration JSON:', {
          error: parseError instanceof Error ? parseError.message : String(parseError),
          dataLength: storedData.length,
          dataPreview: storedData.substring(0, 100)
        });
        console.log('[DateValidationConfigPersistence] Using default configuration due to parse error');
        return { ...DEFAULT_VALIDATION_CONFIG };
      }
      
      // Validate stored data structure
      let isValid = false;
      try {
        isValid = this.isValidConfigData(parsedData);
      } catch (validationError) {
        console.error('[DateValidationConfigPersistence] Error validating configuration data:', {
          error: validationError instanceof Error ? validationError.message : String(validationError)
        });
        isValid = false;
      }

      if (!isValid) {
        console.warn('[DateValidationConfigPersistence] Invalid stored configuration structure, using defaults');
        const defaultConfig = { ...DEFAULT_VALIDATION_CONFIG };
        
        // Try to overwrite invalid config with defaults
        try {
          await this.saveConfig(defaultConfig);
          console.log('[DateValidationConfigPersistence] Invalid configuration replaced with defaults');
        } catch (saveError) {
          console.warn('[DateValidationConfigPersistence] Failed to replace invalid configuration:', {
            error: saveError instanceof Error ? saveError.message : String(saveError)
          });
        }
        
        return defaultConfig;
      }

      // Merge with defaults to ensure all properties exist
      const config: ValidationConfig = {
        ...DEFAULT_VALIDATION_CONFIG,
        ...parsedData.config
      };

      // Update cache
      this.cache = config;
      this.cacheTimestamp = Date.now();

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log('[DateValidationConfigPersistence] Configuration loaded successfully in ' + duration.toFixed(2) + 'ms:', {
        config,
        version: parsedData.version,
        timestamp: parsedData.timestamp
      });
      
      return config;

    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.error('[DateValidationConfigPersistence] Critical error loading configuration (duration: ' + duration.toFixed(2) + 'ms):', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        cacheValid: this.isCacheValid(),
        cacheAge: this.cache ? ((Date.now() - this.cacheTimestamp) / 1000).toFixed(1) + 's' : 'no cache'
      });
      
      // Return cached config if available, otherwise defaults
      if (this.cache) {
        console.log('[DateValidationConfigPersistence] Returning cached configuration due to error');
        return this.cache;
      }
      
      console.log('[DateValidationConfigPersistence] Returning default configuration due to error');
      return { ...DEFAULT_VALIDATION_CONFIG };
    }
  }

  /**
   * Save configuration to persistent storage
   */
  async saveConfig(config: ValidationConfig): Promise<boolean> {
    try {
      const dataToStore = {
        version: DateValidationConfigPersistence.CONFIG_VERSION,
        timestamp: new Date().toISOString(),
        config: config
      };

      const puterStore = usePuterStore.getState();
      const success = await puterStore.kv.set(
        DateValidationConfigPersistence.CONFIG_KEY, 
        JSON.stringify(dataToStore)
      );

      if (success) {
        // Update cache
        this.cache = { ...config };
        this.cacheTimestamp = Date.now();
        
        console.log('[DateValidationConfigPersistence] Configuration saved successfully:', config);
        return true;
      } else {
        console.error('[DateValidationConfigPersistence] Failed to save configuration to KV store');
        return false;
      }

    } catch (error) {
      console.error('[DateValidationConfigPersistence] Error saving configuration:', error);
      return false;
    }
  }

  /**
   * Delete stored configuration (reset to defaults)
   */
  async deleteConfig(): Promise<boolean> {
    try {
      const puterStore = usePuterStore.getState();
      const success = await puterStore.kv.delete(DateValidationConfigPersistence.CONFIG_KEY);

      if (success) {
        // Clear cache
        this.cache = null;
        this.cacheTimestamp = 0;
        
        console.log('[DateValidationConfigPersistence] Configuration deleted successfully');
        return true;
      } else {
        console.error('[DateValidationConfigPersistence] Failed to delete configuration from KV store');
        return false;
      }

    } catch (error) {
      console.error('[DateValidationConfigPersistence] Error deleting configuration:', error);
      return false;
    }
  }

  /**
   * Check if configuration exists in storage
   */
  async hasStoredConfig(): Promise<boolean> {
    try {
      const puterStore = usePuterStore.getState();
      const storedData = await puterStore.kv.get(DateValidationConfigPersistence.CONFIG_KEY);
      return storedData !== null;
    } catch (error) {
      console.error('[DateValidationConfigPersistence] Error checking for stored configuration:', error);
      return false;
    }
  }

  /**
   * Get configuration metadata (version, timestamp)
   */
  async getConfigMetadata(): Promise<{ version: string; timestamp: string } | null> {
    try {
      const puterStore = usePuterStore.getState();
      const storedData = await puterStore.kv.get(DateValidationConfigPersistence.CONFIG_KEY);

      if (!storedData) {
        return null;
      }

      const parsedData = JSON.parse(storedData);
      return {
        version: parsedData.version || 'unknown',
        timestamp: parsedData.timestamp || 'unknown'
      };

    } catch (error) {
      console.error('[DateValidationConfigPersistence] Error getting configuration metadata:', error);
      return null;
    }
  }

  /**
   * Clear the configuration cache
   */
  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
    console.log('[DateValidationConfigPersistence] Configuration cache cleared');
  }

  /**
   * Check if the cached configuration is still valid
   */
  private isCacheValid(): boolean {
    return this.cache !== null && 
           (Date.now() - this.cacheTimestamp) < this.CACHE_TTL;
  }

  /**
   * Validate that stored data has the correct structure
   */
  private isValidConfigData(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    if (!data.config || typeof data.config !== 'object') {
      return false;
    }

    const config = data.config;

    // Check required properties exist and have correct types
    const requiredProps = [
      { key: 'maxFutureEducationYears', type: 'number' },
      { key: 'maxFutureWorkMonths', type: 'number' },
      { key: 'enableTypoDetection', type: 'boolean' },
      { key: 'confidenceThreshold', type: 'number' },
      { key: 'strictMode', type: 'boolean' }
    ];

    for (const prop of requiredProps) {
      if (!(prop.key in config) || typeof config[prop.key] !== prop.type) {
        console.warn(`[DateValidationConfigPersistence] Invalid property: ${prop.key}`);
        return false;
      }
    }

    // Validate ranges
    if (config.maxFutureEducationYears < 0 || config.maxFutureEducationYears > 10) {
      return false;
    }

    if (config.maxFutureWorkMonths < 0 || config.maxFutureWorkMonths > 12) {
      return false;
    }

    if (config.confidenceThreshold < 0 || config.confidenceThreshold > 1) {
      return false;
    }

    return true;
  }
}

/**
 * Global instance of configuration persistence manager
 */
export const dateValidationConfigPersistence = new DateValidationConfigPersistence();