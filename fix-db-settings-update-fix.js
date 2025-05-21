/**
 * Database settings fix script for Supabase integration issues
 * This script diagnoses and fixes issues with settings not being saved to the database
 */

// Force Node.js to use the correct module resolution
require('./register-ts.mjs');

const { createClient } = require('@supabase/supabase-js');
const { forceSettingsUpdate } = require('./lib/ai/reset-cache');
const { AI_CONFIG } = require('./lib/ai/config');

// Default values from server-client.ts
const DEFAULT_SUPABASE_URL = 'https://edfcwbtzcnfosiiymbqg.supabase.co';
// Load from environment variables
const DEFAULT_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Get these from environment variables, fallback to defaults for local development
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SERVICE_KEY;

// Settings to apply - modify this to match what you want to set
const settingsToApply = {
  aiProvider: 'requesty',
  aiModel: 'coding/gemini-2.5-pro-preview-05-06', // Updated to match frontend selection
  documentAiOnly: true,
  enableLogging: true,
  updatedAt: Date.now()
};

// Target user ID - this is the one we observed not being updated
const targetUserId = '8e26b305-7f6c-4ffa-8f9e-3e6bcd66ad83';

async function diagnoseAndFixSettings() {
  console.log('='.repeat(80));
  console.log('DATABASE SETTINGS DIAGNOSTIC AND FIX TOOL');
  console.log('='.repeat(80));

  try {
    // Create an admin client that bypasses RLS
    console.log('\nCreating admin client...');
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get current settings for user
    console.log(`\nFetching current settings for user ${targetUserId}...`);
    const { data: currentSettings, error: fetchError } = await supabase
      .from('user_settings')
      .select('id, settings, updated_at')
      .eq('user_id', targetUserId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        console.log('No settings found for this user, will need to create new settings');
      } else {
        console.error('Error fetching current settings:', fetchError);
      }
    } else {
      console.log('Current settings:');
      console.log(`  ID: ${currentSettings.id}`);
      console.log(`  Updated at: ${new Date(currentSettings.updated_at).toLocaleString()}`);
      console.log(`  Provider: ${currentSettings.settings.aiProvider}`);
      console.log(`  Model: ${currentSettings.settings.aiModel}`);
      console.log(`  Settings updatedAt: ${currentSettings.settings.updatedAt ? new Date(currentSettings.settings.updatedAt).toLocaleString() : 'Not set'}`);
    }

    // Check RLS policy permissions
    console.log('\nChecking RLS policy permissions...');
    // This is a direct SQL query to check policy permissions 
    // which is more reliable than RPC in some Supabase configurations
    const { data: policyCheck, error: policyError } = await supabase
      .from('user_settings')
      .select('count(*)')
      .filter('user_id', 'eq', targetUserId);

    if (policyError) {
      console.error('Error checking policy permissions:', policyError);
      console.log('This indicates an RLS policy issue - service role should bypass RLS');
    } else {
      console.log('RLS policy check successful with service role');
    }

    // Try a direct update with all fields explicitly set 
    // including both top-level row fields and the settings JSONB
    console.log(`\nAttempting direct settings update for user ${targetUserId}...`);
    
    // If no existing row, do an insert
    if (fetchError?.code === 'PGRST116') {
      console.log('Performing INSERT operation for new settings row');
      
      const { data: insertData, error: insertError } = await supabase
        .from('user_settings')
        .insert({
          user_id: targetUserId,
          settings: settingsToApply,
          updated_at: new Date().toISOString()
        })
        .select();
        
      if (insertError) {
        console.error('INSERT operation failed:', insertError);
        
        // Try a more direct approach using RPC if the table insert failed
        console.log('Attempting insert via SQL query...');
        const { error: sqlError } = await supabase.rpc('insert_user_settings', { 
          p_user_id: targetUserId,
          p_settings: settingsToApply
        });
        
        if (sqlError) {
          console.error('SQL insert failed:', sqlError);
        } else {
          console.log('SQL insert succeeded!');
        }
      } else {
        console.log('INSERT succeeded!');
        console.log(`Inserted row with ID: ${insertData?.[0]?.id || 'unknown'}`);
      }
    } 
    // Otherwise do an update
    else if (currentSettings) {
      console.log('Performing UPDATE operation for existing settings row');
      
      const { data: updateData, error: updateError } = await supabase
        .from('user_settings')
        .update({
          settings: settingsToApply,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSettings.id)
        .select();
        
      if (updateError) {
        console.error('UPDATE operation failed:', updateError);
        
        // Try a more specific update that only targets specific fields
        console.log('Attempting targeted update...');
        const { error: specificError } = await supabase
          .from('user_settings')
          .update({
            'settings': settingsToApply
          })
          .eq('user_id', targetUserId);
          
        if (specificError) {
          console.error('Targeted update failed:', specificError);
        } else {
          console.log('Targeted update succeeded!');
        }
      } else {
        console.log('UPDATE succeeded!');
        console.log(`Updated row with ID: ${updateData?.[0]?.id || 'unknown'}`);
      }
    }

    // Verify the update
    console.log('\nVerifying settings were saved...');
    const { data: verifySettings, error: verifyError } = await supabase
      .from('user_settings')
      .select('id, settings, updated_at')
      .eq('user_id', targetUserId)
      .single();

    if (verifyError) {
      console.error('Error verifying settings:', verifyError);
    } else {
      console.log('Verification successful:');
      console.log(`  ID: ${verifySettings.id}`);
      console.log(`  Updated at: ${new Date(verifySettings.updated_at).toLocaleString()}`);
      console.log(`  Provider: ${verifySettings.settings.aiProvider}`);
      console.log(`  Model: ${verifySettings.settings.aiModel}`);
      console.log(`  Settings updatedAt: ${verifySettings.settings.updatedAt ? new Date(verifySettings.settings.updatedAt).toLocaleString() : 'Not set'}`);
      
      // Check if the update was successful
      const isSuccess = verifySettings.settings.aiModel === settingsToApply.aiModel;
      console.log(`\nUpdate result: ${isSuccess ? 'SUCCESS' : 'FAILED'}`);
      
      if (!isSuccess) {
        console.error(`Expected model ${settingsToApply.aiModel} but found ${verifySettings.settings.aiModel}`);
      }
    }

    // Also update AI_CONFIG directly for the server instance
    console.log('\nUpdating AI_CONFIG for server instance...');
    
    // Reset all model configs to defaults first to avoid confusion
    AI_CONFIG.openrouter.model = 'qwen/qwen3-235b-a22b:free'; 
    AI_CONFIG.anthropic.model = 'claude-3-7-sonnet-20250219';
    AI_CONFIG.requesty.model = 'anthropic/claude-3-7-sonnet-20250219';
    AI_CONFIG.openai.model = 'gpt-4';
    AI_CONFIG.gemini.model = 'gemini-1.5-pro';
    AI_CONFIG.vertex.model = 'vertex/anthropic/claude-3-7-sonnet-latest@us-east5';
    
    // Update AI_CONFIG directly based on the provider
    switch (settingsToApply.aiProvider) {
      case 'openrouter':
        AI_CONFIG.openrouter.model = settingsToApply.aiModel;
        break;
      case 'anthropic':
        AI_CONFIG.anthropic.model = settingsToApply.aiModel;
        break;
      case 'requesty':
        AI_CONFIG.requesty.model = settingsToApply.aiModel;
        break;
      case 'openai':
        AI_CONFIG.openai.model = settingsToApply.aiModel;
        break;
      case 'google':
        AI_CONFIG.gemini.model = settingsToApply.aiModel;
        break;
      case 'vertex':
        AI_CONFIG.vertex.model = settingsToApply.aiModel;
        break;
    }
    
    // Update global settings cache
    if (typeof global !== 'undefined') {
      console.log('Updating global settings cache...');
      global.userSettings = { ...settingsToApply };
      
      // Reset refresh timestamp
      if (global._aiConfigState) {
        global._aiConfigState.lastSettingsRefresh = 0;
        global._aiConfigState.lastResetTimestamp = Date.now();
      } else {
        global._aiConfigState = { 
          lastSettingsRefresh: 0,
          lastResetTimestamp: Date.now()
        };
      }
    }
    
    // Use the forceSettingsUpdate utility
    await forceSettingsUpdate(settingsToApply);
    
    // Verification of memory settings
    console.log('\nFinal AI_CONFIG state:');
    console.log({
      openrouter: AI_CONFIG.openrouter.model,
      anthropic: AI_CONFIG.anthropic.model,
      requesty: AI_CONFIG.requesty.model,
      openai: AI_CONFIG.openai.model,
      gemini: AI_CONFIG.gemini.model,
      vertex: AI_CONFIG.vertex.model
    });
    
    // Check if the target provider has the correct model
    const currentModel = (() => {
      switch (settingsToApply.aiProvider) {
        case 'openrouter': return AI_CONFIG.openrouter.model;
        case 'anthropic': return AI_CONFIG.anthropic.model;
        case 'requesty': return AI_CONFIG.requesty.model;
        case 'openai': return AI_CONFIG.openai.model;
        case 'google': return AI_CONFIG.gemini.model;
        case 'vertex': return AI_CONFIG.vertex.model;
        default: return 'unknown';
      }
    })();
    
    console.log(`\nCurrent ${settingsToApply.aiProvider} model: ${currentModel}`);
    console.log(`Target model: ${settingsToApply.aiModel}`);
    console.log(`In-memory settings match: ${currentModel === settingsToApply.aiModel ? 'YES' : 'NO'}`);

    console.log('\nDiagnostic and fix complete!');
  } catch (error) {
    console.error('Unexpected error during diagnosis:', error);
  }
}

// Run the diagnostic and fix
diagnoseAndFixSettings().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});