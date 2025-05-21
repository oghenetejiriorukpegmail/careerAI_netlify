import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, verifyAuthentication } from '@/lib/supabase/server-client';
import { defaultSettings, UserSettings } from '@/lib/utils/settings';
import { loadServerSettings } from '@/lib/ai/settings-loader';
import { updateAIConfig } from '@/lib/ai/update-config';
import { AI_CONFIG } from '@/lib/ai/config';

// Get settings from database or env vars if not set
export async function GET() {
  try {
    // Verify authentication
    const { authenticated, user } = await verifyAuthentication();
    
    // If not authenticated, return 401 unauthorized
    if (!authenticated || !user) {
      console.log('User not authenticated, returning 401 unauthorized');
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'You must be logged in to access settings'
      }, { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Create server client with user's session
    const supabase = createServerClient();
    
    try {
      // Get settings from database
      const { data, error } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching settings:', error);
        // Still return a valid JSON response even in error case
        return NextResponse.json({ 
          error: 'Failed to fetch settings',
          message: error.message,
          details: error
        }, { status: 500 });
      }
    } catch (dbError) {
      console.error('Unexpected database error in settings GET:', dbError);
      // Ensure we return a valid JSON response
      return NextResponse.json({ 
        error: 'Database error',
        message: dbError instanceof Error ? dbError.message : 'Unknown error'
      }, { status: 500 });
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
    
    return NextResponse.json(responseSettings, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in settings API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Update settings
export async function POST(request: NextRequest) {
  try {
    // Verify authentication first
    const { authenticated, user } = await verifyAuthentication();
    
    if (!authenticated || !user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'You must be logged in to update settings'
      }, { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Parse request body - catch JSON parse errors explicitly
    let settings: UserSettings;
    try {
      settings = await request.json();
    } catch (parseError) {
      console.error('Error parsing request JSON in settings POST:', parseError);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        message: parseError instanceof Error ? parseError.message : 'Unknown parsing error' 
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validate settings
    if (!settings.aiProvider) {
      return NextResponse.json({ error: 'AI Provider is required' }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!settings.aiModel) {
      return NextResponse.json({ error: 'AI Model is required' }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Ensure there's a timestamp for synchronization
    if (!settings.updatedAt) {
      settings.updatedAt = Date.now();
    }
    
    console.log(`Saving settings to database for user ${user.id}:`, JSON.stringify({
      provider: settings.aiProvider,
      model: settings.aiModel,
      updatedAt: settings.updatedAt
    }));
    
    // Update settings in database
    const supabase = createServerClient();
    
    // Add debugging to track the actual database operation
    console.log(`Executing upsert on user_settings table for user ${user.id}`);
    console.log(`Settings object:`, JSON.stringify(settings, null, 2));
    
    const { error, data } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        settings,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id',
        returning: 'minimal'
      });
      
    console.log(`Upsert completed - error: ${error ? JSON.stringify(error) : 'none'}`);
    
    // If the upsert failed, try a direct update as a fallback
    if (error) {
      console.log(`Upsert failed, trying direct update instead`);
      
      // First check if the row exists
      const { data: existingRow, error: checkError } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      if (checkError) {
        console.log(`No existing row found for user ${user.id}, trying insert`);
        
        // Insert as new row
        const { error: insertError } = await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            settings,
            updated_at: new Date().toISOString()
          });
          
        if (insertError) {
          console.error(`Insert failed:`, insertError);
        } else {
          console.log(`Insert successful for user ${user.id}`);
        }
      } else {
        // Row exists, do update
        console.log(`Existing row found with id ${existingRow.id}, updating`);
        
        const { error: updateError } = await supabase
          .from('user_settings')
          .update({
            settings,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
          
        if (updateError) {
          console.error(`Update failed:`, updateError);
        } else {
          console.log(`Update successful for user ${user.id}`);
        }
      }
    }
    
    if (error) {
      console.error('Error saving settings:', error);
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
    
    // Apply settings to AI configuration directly to ensure changes take effect immediately
    try {
      // Update AI_CONFIG directly to ensure changes take effect immediately
      updateAIConfig(settings);
      
      console.log('Applied settings directly to AI configuration');
      
      // Log current configuration state for verification
      console.log('Current AI configuration after update:', {
        openrouter: AI_CONFIG.openrouter.model,
        anthropic: AI_CONFIG.anthropic.model,
        requesty: AI_CONFIG.requesty.model,
        openai: AI_CONFIG.openai.model,
        gemini: AI_CONFIG.gemini.model,
        vertex: AI_CONFIG.vertex.model
      });
    } catch (configError) {
      console.warn('Error updating AI configuration:', configError);
      // Continue execution even if direct config update fails
    }
    
    // Update global settings cache
    if (typeof global !== 'undefined') {
      global.userSettings = { ...settings };
      console.log('Updated global settings cache with new settings');
      
      // Reset refresh timestamp
      if (global._aiConfigState) {
        global._aiConfigState.lastSettingsRefresh = 0;
      }
    }
    
    // Verify settings were saved by reading them back
    try {
      console.log(`Verifying settings were saved correctly for user ${user.id}...`);
      const { data: verificationData, error: verificationError } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single();
        
      if (verificationError) {
        console.error('Error verifying settings were saved:', verificationError);
        // Still return success since we tried our best
        return NextResponse.json({ 
          success: true, 
          settings,
          updatedAt: settings.updatedAt,
          verification: 'failed',
          message: 'Settings were applied but verification failed'
        }, {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      console.log(`Verification successful, settings found in database:`, 
        JSON.stringify({
          provider: verificationData.settings.aiProvider,
          model: verificationData.settings.aiModel,
          updatedAt: verificationData.settings.updatedAt
        })
      );
      
      // Return updated settings with success confirmation
      return NextResponse.json({ 
        success: true, 
        settings,
        updatedAt: settings.updatedAt,
        verification: 'success',
        dbSettings: {
          provider: verificationData.settings.aiProvider,
          model: verificationData.settings.aiModel
        }
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (verificationError) {
      console.error('Error during verification:', verificationError);
      // Still return success since we tried our best
      return NextResponse.json({ 
        success: true, 
        settings,
        updatedAt: settings.updatedAt,
        verification: 'error',
        message: 'Settings were applied but verification encountered an error'
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error in settings API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}