/**
 * Settings synchronization utilities
 * This file provides direct database access to settings for critical operations
 */

import { supabaseAdmin } from '../supabase/client';
import { UserSettings, defaultSettings } from './settings';

/**
 * Directly reads settings from the database for a specific user
 * This bypasses all caches to get the latest settings directly from Supabase
 */
export async function getSettingsDirectFromDB(userId: string): Promise<UserSettings | null> {
  try {
    console.log(`[DIRECT DB] Reading settings directly from DB for user ${userId}`);
    
    if (!userId) {
      console.warn('[DIRECT DB] No user ID provided for direct settings lookup');
      return null;
    }
    
    // Query the database directly using admin client
    const { data, error } = await supabaseAdmin
      .from('user_settings')
      .select('settings')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('[DIRECT DB] Error reading settings from database:', error);
      return null;
    }
    
    if (!data?.settings) {
      console.log('[DIRECT DB] No settings found in database for user');
      return null;
    }
    
    console.log('[DIRECT DB] Retrieved settings directly from DB:', JSON.stringify({
      provider: data.settings.aiProvider,
      model: data.settings.aiModel,
      updatedAt: data.settings.updatedAt
    }));
    
    // Ensure the settings have a timestamp
    if (!data.settings.updatedAt) {
      data.settings.updatedAt = Date.now();
    }
    
    return data.settings;
  } catch (error) {
    console.error('[DIRECT DB] Error in direct DB settings access:', error);
    return null;
  }
}

/**
 * Directly writes settings to the database for a specific user
 * This ensures settings are properly stored regardless of API routes
 */
export async function saveSettingsDirectToDB(userId: string, settings: UserSettings): Promise<boolean> {
  try {
    console.log(`[DIRECT DB] Writing settings directly to DB for user ${userId}`);
    
    if (!userId) {
      console.warn('[DIRECT DB] No user ID provided for direct settings save');
      return false;
    }
    
    // Update timestamp
    settings.updatedAt = Date.now();
    
    // Upsert settings directly to the database
    const { error } = await supabaseAdmin
      .from('user_settings')
      .upsert({
        user_id: userId,
        settings,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('[DIRECT DB] Error saving settings to database:', error);
      return false;
    }
    
    console.log('[DIRECT DB] Successfully saved settings to database');
    return true;
  } catch (error) {
    console.error('[DIRECT DB] Error in direct DB settings save:', error);
    return false;
  }
}

/**
 * Synchronizes all settings caches with the database value
 * This forcibly updates all caches with the database value for a user
 */
export async function syncSettingsFromDB(userId: string): Promise<UserSettings> {
  try {
    console.log(`[SYNC] Starting full settings sync from DB for user ${userId}`);
    
    // Try to get settings directly from DB
    const dbSettings = await getSettingsDirectFromDB(userId);
    
    if (dbSettings) {
      console.log('[SYNC] Using database settings for sync');
      
      // Update global cache
      if (typeof global !== 'undefined') {
        global.userSettings = { ...dbSettings };
        console.log('[SYNC] Updated global settings cache');
      }
      
      // Reset settings refresh timestamp
      if (typeof global !== 'undefined' && global._aiConfigState) {
        global._aiConfigState.lastSettingsRefresh = 0;
        console.log('[SYNC] Reset settings refresh timestamp');
      }
      
      return dbSettings;
    } else {
      console.log('[SYNC] No settings found in database, using defaults');
      
      // Use defaults
      const settings = { ...defaultSettings, updatedAt: Date.now() };
      
      // Try to save defaults to DB
      await saveSettingsDirectToDB(userId, settings);
      
      // Update global cache with defaults
      if (typeof global !== 'undefined') {
        global.userSettings = { ...settings };
        console.log('[SYNC] Updated global settings cache with defaults');
      }
      
      return settings;
    }
  } catch (error) {
    console.error('[SYNC] Error syncing settings from DB:', error);
    return { ...defaultSettings, updatedAt: Date.now() };
  }
}