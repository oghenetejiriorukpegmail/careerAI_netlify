import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from '@/lib/supabase/server-client';

/**
 * Reset all settings caches
 * This is an alias for clear-cache for backwards compatibility
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication - only authenticated users or admin can reset caches
    const { authenticated, user } = await verifyAuthentication();
    
    // For security, require authentication or admin token
    const adminToken = request.headers.get('x-admin-token');
    const isAdmin = adminToken === process.env.ADMIN_API_KEY;
    
    if (!authenticated && !isAdmin) {
      return NextResponse.json({ 
        error: 'Authentication required to reset caches' 
      }, { status: 401 });
    }
    
    console.log(`Resetting caches - requested by ${authenticated ? `user ${user?.id}` : 'admin'}`);
    
    // Call the clear-cache API internally
    try {
      // Forward the request to the clear-cache API
      const response = await fetch(new URL('/api/settings/clear-cache', request.url).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken || ''
        }
      });
      
      // Return the response from clear-cache
      if (response.ok) {
        const result = await response.json();
        return NextResponse.json({
          ...result,
          source: 'reset-cache',
          message: 'Settings caches reset successfully (via clear-cache)'
        });
      } else {
        return NextResponse.json({ 
          error: 'Failed to reset caches',
          status: response.status
        }, { status: 500 });
      }
    } catch (fetchError) {
      console.error('Error calling clear-cache API:', fetchError);
      
      // If the internal fetch fails, return a helpful error
      return NextResponse.json({ 
        error: 'Failed to reset caches',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        suggestion: 'Try using /api/settings/clear-cache directly'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in settings/reset-cache API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}