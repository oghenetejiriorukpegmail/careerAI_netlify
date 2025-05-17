import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/client';

/**
 * API route to handle file uploads with admin privileges
 * This bypasses RLS policies for storage
 */
export async function POST(request: NextRequest) {
  try {
    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string;
    const path = formData.get('path') as string;

    // Validate inputs
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!bucket) {
      return NextResponse.json({ error: 'No bucket specified' }, { status: 400 });
    }

    if (!path) {
      return NextResponse.json({ error: 'No path specified' }, { status: 400 });
    }

    // Get current user session from cookies
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Authentication required', details: sessionError?.message }, { status: 401 });
    }
    
    const user = session.user;

    // Validate that the path starts with the user ID for security
    // This ensures users can only upload to their own directory
    if (!path.startsWith(`${user.id}/`)) {
      return NextResponse.json(
        { error: 'Invalid path. Path must start with the user ID.' }, 
        { status: 403 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Use admin client to upload file (bypasses RLS)
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading file:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error in upload API route:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Unknown server error' 
    }, { status: 500 });
  }
}