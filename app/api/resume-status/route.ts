import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/client';

// Check resume processing status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const userId = searchParams.get('userId');
    
    if (!jobId || !userId) {
      return NextResponse.json({
        error: 'Job ID and User ID are required'
      }, { status: 400 });
    }
    
    // Check database for processed resume
    const supabaseAdmin = getSupabaseAdminClient();
    
    // Look for the most recent resume for this user
    const { data: resumes, error } = await supabaseAdmin
      .from('resumes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Error checking resume status:', error);
      return NextResponse.json({
        error: 'Failed to check status'
      }, { status: 500 });
    }
    
    if (!resumes || resumes.length === 0) {
      return NextResponse.json({
        status: 'processing',
        message: 'Resume is still being processed. Please check back in a few moments.'
      });
    }
    
    const resume = resumes[0];
    
    // Check if this is the resume from the job
    const isRecent = new Date(resume.created_at).getTime() > Date.now() - 15 * 60 * 1000; // Within 15 minutes
    
    if (isRecent && resume.processing_status === 'completed') {
      return NextResponse.json({
        status: 'completed',
        message: 'Resume processed successfully',
        resumeId: resume.id,
        data: resume.parsed_data
      });
    } else if (isRecent && resume.processing_status === 'failed') {
      return NextResponse.json({
        status: 'failed',
        message: 'Resume processing failed',
        error: resume.error_message
      });
    } else {
      return NextResponse.json({
        status: 'processing',
        message: 'Resume is still being processed. This may take up to 15 minutes for large files.'
      });
    }
    
  } catch (error) {
    console.error('Error checking resume status:', error);
    return NextResponse.json({
      error: 'Failed to check resume status'
    }, { status: 500 });
  }
}