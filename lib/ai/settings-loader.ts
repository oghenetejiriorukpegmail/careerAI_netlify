/**
 * Settings loader for AI configuration
 * Provides a simplified way to load settings for both client and server-side code
 */

import { UserSettings, defaultSettings } from '../utils/settings';

// In-memory cache of settings
let cachedSettings: UserSettings | null = null;
let lastSettingsRefresh = 0;

// Simplified refresh interval to prevent constant API calls
const REFRESH_INTERVAL = 5000; // 5 seconds

/**
 * Load settings from environment, server cache, or defaults
 * This is specifically designed for server-side usage
 */
export function loadServerSettings(): UserSettings {
  try {
    // Check if we're explicitly clearing settings
    const forceClearCache = process.env.FORCE_CLEAR_SETTINGS_CACHE === 'true';
    if (forceClearCache) {
      console.log('Forced cache clearing enabled, ignoring cached settings');
      cachedSettings = null;
      if (typeof global !== 'undefined') {
        global.userSettings = undefined;
      }
    }
    
    // Check if we need to refresh settings based on time
    const now = Date.now();
    const needsRefresh = forceClearCache || !lastSettingsRefresh || (now - lastSettingsRefresh > REFRESH_INTERVAL);
    
    // If we have global settings and don't need a refresh, use them
    if (!needsRefresh && typeof global !== 'undefined' && global.userSettings) {
      return { ...global.userSettings };
    }
    
    // If we have cached settings and don't need a refresh, use them
    if (!needsRefresh && cachedSettings) {
      return { ...cachedSettings };
    }
    
    // Try to get settings from API if we need a refresh
    if (needsRefresh) {
      // Update refresh timestamp
      lastSettingsRefresh = now;
      
      // Asynchronously refresh settings for next time
      try {
        import('../utils/settings').then(async (settingsModule) => {
          try {
            const freshSettings = await settingsModule.loadSettingsFromAPI();
            if (freshSettings) {
              console.log('Updated AI settings:', JSON.stringify({
                provider: freshSettings.aiProvider,
                model: freshSettings.aiModel
              }));
              
              // Ensure timestamp is present
              freshSettings.updatedAt = Date.now();
              
              // Update our cache
              cachedSettings = { ...freshSettings };
              
              // Update global cache
              if (typeof global !== 'undefined') {
                global.userSettings = { ...freshSettings };
              }
              
              // Update AI configuration immediately
              try {
                const { updateConfigDirectly } = await import('./reset-cache');
                updateConfigDirectly(freshSettings);
              } catch (configError) {
                console.error('Failed to update AI configuration:', configError);
              }
            }
          } catch (apiError) {
            console.warn('Failed to refresh settings from API:', apiError);
          }
        }).catch(err => {
          console.warn('Failed to import settings module:', err);
        });
      } catch (importError) {
        console.warn('Error setting up settings refresh:', importError);
      }
    }
    
    // Return existing settings if available
    if (typeof global !== 'undefined' && global.userSettings) {
      return { ...global.userSettings };
    }
    
    if (cachedSettings) {
      return { ...cachedSettings };
    }
    
    // If we have environment variables, use them
    if (process.env.DEFAULT_AI_PROVIDER || process.env.DEFAULT_AI_MODEL) {
      const envSettings = {
        aiProvider: process.env.DEFAULT_AI_PROVIDER || defaultSettings.aiProvider,
        aiModel: process.env.DEFAULT_AI_MODEL || defaultSettings.aiModel,
        documentAiOnly: process.env.DEFAULT_DOCUMENT_AI_ONLY === 'true' || defaultSettings.documentAiOnly,
        enableLogging: process.env.DEFAULT_ENABLE_LOGGING === 'true' || defaultSettings.enableLogging,
        updatedAt: Date.now()
      };
      
      // Update both caches
      cachedSettings = { ...envSettings };
      if (typeof global !== 'undefined') {
        global.userSettings = { ...envSettings };
      }
      
      return envSettings;
    }
    
    // Fall back to defaults
    const defaultConfig = { ...defaultSettings, updatedAt: Date.now() };
    
    // Update both caches
    cachedSettings = { ...defaultConfig };
    if (typeof global !== 'undefined') {
      global.userSettings = { ...defaultConfig };
    }
    
    return defaultConfig;
  } catch (error) {
    console.error('Error loading server settings:', error);
    return { ...defaultSettings, updatedAt: Date.now() };
  }
}

/**
 * Update server-side settings cache
 * Used when settings are changed via API
 */
export function updateServerSettings(settings: UserSettings): void {
  try {
    // Ensure timestamp is present for cache validation
    if (!settings.updatedAt) {
      settings.updatedAt = Date.now();
    }
    
    // Reset refresh timestamp to force future loads to use these settings
    lastSettingsRefresh = Date.now();
    
    // Update our in-memory cache
    cachedSettings = { ...settings };
    
    // Update global settings cache 
    if (typeof global !== 'undefined') {
      global.userSettings = { ...settings };
    }
    
    // Log the update
    console.log('Server settings updated:', JSON.stringify({
      provider: settings.aiProvider,
      model: settings.aiModel,
      updatedAt: settings.updatedAt
    }));
    
    // Update AI configuration directly 
    try {
      // Import the direct update utility
      import('./reset-cache').then(resetCache => {
        if (resetCache && resetCache.updateConfigDirectly) {
          resetCache.updateConfigDirectly(settings);
          console.log('AI configuration updated with new settings');
        }
      }).catch(err => {
        console.warn('Failed to update AI configuration:', err);
      });
    } catch (configError) {
      console.warn('Error updating AI configuration:', configError);
    }
  } catch (error) {
    console.error('Error updating server settings:', error);
  }
}