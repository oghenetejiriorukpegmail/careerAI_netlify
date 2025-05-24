import type { Handler } from "@netlify/functions";

// Function 3: Save resume data to database
export const handler: Handler = async (event, context) => {
  console.log('[SAVE-RESUME FUNCTION] Starting resume save');
  
  try {
    // Only accept POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { userId, fileName, fileType, fileSize, extractedText, parsedData } = body;

    if (!userId || !fileName || !extractedText) {
      console.log('[SAVE-RESUME FUNCTION] Missing required fields');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    console.log(`[SAVE-RESUME FUNCTION] Saving resume for user: ${userId}, file: ${fileName}`);
    
    // Import Supabase
    const { getSupabaseAdminClient } = await import('../../lib/supabase/client');
    const supabaseAdmin = getSupabaseAdminClient();
    
    if (!supabaseAdmin) {
      console.error('[SAVE-RESUME FUNCTION] Database client not available');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Database connection failed' })
      };
    }

    const filePath = `processed_resumes/${userId}/${Date.now()}_${fileName}`;
    
    // Save to database
    const { data, error } = await supabaseAdmin
      .from('resumes')
      .insert({
        user_id: userId,
        file_path: filePath,
        file_name: fileName,
        file_type: fileType || 'application/pdf',
        file_size: fileSize || 0,
        extracted_text: extractedText,
        parsed_data: parsedData || {},
        processing_status: parsedData ? 'completed' : 'text_extracted',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[SAVE-RESUME FUNCTION] Database error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Failed to save resume',
          details: error.message 
        })
      };
    }

    console.log(`[SAVE-RESUME FUNCTION] Resume saved successfully with ID: ${data.id}`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        resumeId: data.id,
        message: 'Resume saved successfully'
      })
    };

  } catch (error) {
    console.error('[SAVE-RESUME FUNCTION] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Save failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};