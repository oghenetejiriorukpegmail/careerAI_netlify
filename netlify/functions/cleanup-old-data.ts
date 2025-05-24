import type { Config } from "@netlify/functions";

// Scheduled function to clean up old data
export default async () => {
  console.log("Running scheduled cleanup");
  
  try {
    const { getSupabaseAdminClient } = await import('../../lib/supabase/client');
    const supabaseAdmin = getSupabaseAdminClient();
    
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Clean up old temporary data
    const { data: deletedResumes, error: resumeError } = await supabaseAdmin
      .from('resumes')
      .delete()
      .eq('processing_status', 'failed')
      .lt('created_at', thirtyDaysAgo.toISOString());
    
    if (resumeError) {
      console.error('Error cleaning up resumes:', resumeError);
    } else {
      console.log(`Deleted ${deletedResumes?.length || 0} old failed resumes`);
    }
    
    // Clean up old application drafts
    const { data: deletedApps, error: appError } = await supabaseAdmin
      .from('applications')
      .delete()
      .eq('status', 'draft')
      .lt('updated_at', thirtyDaysAgo.toISOString());
    
    if (appError) {
      console.error('Error cleaning up applications:', appError);
    } else {
      console.log(`Deleted ${deletedApps?.length || 0} old draft applications`);
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Cleanup completed',
      deleted: {
        resumes: deletedResumes?.length || 0,
        applications: deletedApps?.length || 0
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(JSON.stringify({
      error: 'Cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config: Config = {
  schedule: "0 0 * * *" // Run daily at midnight UTC
};