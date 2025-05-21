import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/anonymous-client';
import { UserSettings, defaultSettings } from '@/lib/utils/settings';
import { AI_CONFIG } from '@/lib/ai/config';
import { updateAIConfig } from '@/lib/ai/update-config';

/**
 * Get anonymous settings from the database
 * This endpoint is for temporary app sessions without full authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Create anonymous client - this uses a separate authentication flow
    const supabase = createAnonClient();
    
    // Try to get a session ID from cookies or headers
    const sessionId = request.cookies.get('anon_session_id')?.value || 
                      request.headers.get('x-anon-session-id') ||
                      crypto.randomUUID();
    
    console.log(`Anonymous settings request with session ID: ${sessionId}`);
    
    // Get settings from the anonymous_settings table
    const { data, error } = await supabase
      .from('anonymous_settings')
      .select('settings')
      .eq('session_id', sessionId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching anonymous settings:', error);
      
      // Return default settings with session ID
      return NextResponse.json({
        ...defaultSettings,
        updatedAt: Date.now(),
        sessionId,
        isAnonymous: true
      });
    }
    
    // If settings were found, return them
    if (data?.settings) {
      // Add type assertion to fix TypeScript error
      const settings = data.settings as UserSettings;
      
      console.log('Found anonymous settings for session:', {
        provider: settings.aiProvider,
        model: settings.aiModel
      });
      
      // Ensure there's a timestamp for synchronization
      if (!settings.updatedAt) {
        settings.updatedAt = Date.now();
      }
      
      // Return settings with session ID
      return NextResponse.json({
        ...settings,
        sessionId,
        isAnonymous: true
      });
    }
    
    // If no settings found, return defaults with session ID
    return NextResponse.json({
      ...defaultSettings,
      updatedAt: Date.now(),
      sessionId,
      isAnonymous: true
    });
  } catch (error) {
    console.error('Error in anonymous settings API:', error);
    
    // Return default settings on error
    return NextResponse.json({
      ...defaultSettings,
      updatedAt: Date.now(),
      isAnonymous: true,
      error: 'Failed to retrieve settings'
    });
  }
}

/**
 * Update anonymous settings
 * This allows temporary settings to persist across sessions without authentication
 */
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
    
    // Create anonymous client
    const supabase = createAnonClient();
    
    // Try to get a session ID from cookies, headers, or body
    let sessionId = request.cookies.get('anon_session_id')?.value || 
                    request.headers.get('x-anon-session-id') ||
                    (settings as any).sessionId;
    
    // If no session ID available, create one
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      console.log(`Created new anonymous session ID: ${sessionId}`);
    }
    
    // Add additional metadata
    const enhancedSettings = {
      ...settings,
      updatedAt: Date.now(),
      isAnonymous: true
    };
    
    console.log(`Saving anonymous settings for session ${sessionId}:`, {
      provider: enhancedSettings.aiProvider,
      model: enhancedSettings.aiModel
    });
    
    // Save settings to anonymous_settings table
    const { error } = await supabase
      .from('anonymous_settings')
      .upsert({
        session_id: sessionId,
        settings: enhancedSettings,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error saving anonymous settings:', error);
      return NextResponse.json({ 
        error: 'Failed to save settings',
        details: error.message 
      }, { status: 500 });
    }
    
    // Apply settings to AI configuration directly
    try {
      // Update AI_CONFIG directly to ensure changes take effect immediately
      updateAIConfig(enhancedSettings);
      
      console.log('Applied anonymous settings to AI configuration');
      
      // Log current configuration state for verification
      console.log('Current AI configuration after anonymous update:', {
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
      global.userSettings = { ...enhancedSettings };
      console.log('Updated global settings cache with anonymous settings');
      
      // Reset refresh timestamp
      if (global._aiConfigState) {
        global._aiConfigState.lastSettingsRefresh = 0;
      }
    }
    
    // Return success with session ID
    const response = NextResponse.json({ 
      success: true, 
      settings: enhancedSettings,
      sessionId,
      isAnonymous: true
    });
    
    // Set a cookie with the session ID (30 day expiry)
    response.cookies.set({
      name: 'anon_session_id',
      value: sessionId,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/'
    });
    
    return response;
  } catch (error) {
    console.error('Error in anonymous settings API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}