import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, verifyAuthentication } from '@/lib/supabase/server-client';
import { defaultSettings, UserSettings } from '@/lib/utils/settings';
import { loadServerSettings } from '@/lib/ai/settings-loader';
import { supabaseAdmin } from '@/lib/supabase/client';
import { updateConfigDirectly } from '@/lib/ai/reset-cache';
import { AI_CONFIG } from '@/lib/ai/config';

// Get settings from database or env vars if not set
export async function GET() {
  try {
    // Verify authentication
    const { authenticated, user } = await verifyAuthentication();
    
    // If not authenticated, return default settings
    if (!authenticated || !user) {
      // Use the central loadServerSettings function to get default settings
      // This ensures consistency across all routes
      const serverSettings = loadServerSettings();
      console.log('User not authenticated, returning server default settings');
      return NextResponse.json(serverSettings);
    }
    
    // Create server client with user's session
    const supabase = createServerClient();
    
    // Get settings from database
    const { data, error } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
    
    // Use the central loadServerSettings function to get default settings
    // if no user settings are found
    const serverSettings = loadServerSettings();
    
    // Return settings or defaults with timestamp for synchronization
    const responseSettings = data?.settings || serverSettings;
    
    // Ensure there's a timestamp for synchronization
    if (!responseSettings.updatedAt) {
      responseSettings.updatedAt = Date.now();
    }
    
    return NextResponse.json(responseSettings);
  } catch (error) {
    console.error('Error in settings API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update settings
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const settings: UserSettings = await request.json();
    
    // Validate settings
    if (!settings.aiProvider) {
      return NextResponse.json({ error: 'AI Provider is required' }, { status: 400 });
    }
    
    if (!settings.aiModel) {
      return NextResponse.json({ error: 'AI Model is required' }, { status: 400 });
    }
    
    // Ensure there's a timestamp for synchronization
    if (!settings.updatedAt) {
      settings.updatedAt = Date.now();
    }
    
    // Verify authentication
    const { authenticated, user } = await verifyAuthentication();
    
    console.log(`Saving settings request received: Provider=${settings.aiProvider}, Model=${settings.aiModel}`);
    console.log(`Auth status: ${authenticated ? 'Authenticated' : 'Not authenticated'}, User ID: ${user?.id || 'none'}`);
    
    // Apply settings to global cache regardless of authentication
    if (typeof global !== 'undefined') {
      global.userSettings = { ...settings };
      console.log('Updated global settings cache with new settings');
      
      // Reset refresh timestamp
      if (global._aiConfigState) {
        global._aiConfigState.lastSettingsRefresh = 0;
      }
    }
    
    // Update AI_CONFIG directly
    updateConfigDirectly(settings);
    console.log('Updated AI_CONFIG directly with settings');
    
    // Always log current config state
    console.log('Current AI configuration:');
    console.log({
      openrouter: AI_CONFIG.openrouter.model,
      anthropic: AI_CONFIG.anthropic.model,
      requesty: AI_CONFIG.requesty.model,
      openai: AI_CONFIG.openai.model,
      gemini: AI_CONFIG.gemini.model,
      vertex: AI_CONFIG.vertex.model
    });
    
    // Save to database if authenticated
    if (authenticated && user) {
      console.log(`Saving settings to database for user ${user.id}`);
      
      try {
        // Check if a record already exists for this user
        const { data: existingData } = await supabaseAdmin
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id);
        
        if (existingData && existingData.length > 0) {
          // Update existing record
          console.log('Record exists, updating settings');
          const { error: updateError } = await supabaseAdmin
            .from('user_settings')
            .update({
              settings,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);
          
          if (updateError) {
            console.error('Error updating settings:', updateError);
            return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
          }
          
          console.log('Successfully updated settings');
        } else {
          // Insert new record
          console.log('Record does not exist, inserting new settings');
          const { error: insertError } = await supabaseAdmin
            .from('user_settings')
            .insert({
              user_id: user.id,
              settings,
              updated_at: new Date().toISOString()
            });
          
          if (insertError) {
            console.error('Error inserting settings:', insertError);
            return NextResponse.json({ error: 'Failed to insert settings' }, { status: 500 });
          }
          
          console.log('Successfully inserted settings');
        }
        
        // Return success response
        return NextResponse.json({
          success: true,
          settings,
          updatedAt: settings.updatedAt,
          message: 'Settings saved and applied'
        });
      } catch (dbError) {
        console.error('Database operation failed:', dbError);
        
        // Even if DB operation fails, still return success since we updated the global cache
        return NextResponse.json({
          success: true,
          settings,
          updatedAt: settings.updatedAt,
          message: 'Settings applied but database update failed',
          warning: 'Database operation failed, but settings were applied to the server'
        });
      }
    } else {
      // Not authenticated, but still apply settings
      return NextResponse.json({
        success: true,
        settings,
        updatedAt: settings.updatedAt,
        message: 'Settings applied but not saved to database (no authentication)',
        localOnly: true
      });
    }
  } catch (error) {
    console.error('Error in settings API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}