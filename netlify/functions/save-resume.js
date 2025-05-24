const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  console.log('[SAVE-RESUME FUNCTION] Starting resume save');
  console.log('[SAVE-RESUME FUNCTION] Method:', event.httpMethod);
  console.log('[SAVE-RESUME FUNCTION] Headers:', event.headers);

  if (event.httpMethod !== 'POST') {
    console.log('[SAVE-RESUME FUNCTION] Invalid method:', event.httpMethod);
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('[SAVE-RESUME FUNCTION] Parsing request body');
    const { userId, parsedData, extractedText, fileName } = JSON.parse(event.body);
    
    console.log('[SAVE-RESUME FUNCTION] User ID:', userId);
    console.log('[SAVE-RESUME FUNCTION] File name:', fileName);
    console.log('[SAVE-RESUME FUNCTION] Has parsed data:', !!parsedData);
    console.log('[SAVE-RESUME FUNCTION] Has extracted text:', !!extractedText);

    // Initialize Supabase client
    console.log('[SAVE-RESUME FUNCTION] Initializing Supabase client');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[SAVE-RESUME FUNCTION] Missing Supabase credentials');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing Supabase configuration' })
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Save to database
    console.log('[SAVE-RESUME FUNCTION] Saving to database');
    const { data, error } = await supabase
      .from('resumes')
      .insert({
        user_id: userId,
        file_name: fileName,
        parsed_data: parsedData,
        extracted_text: extractedText,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[SAVE-RESUME FUNCTION] Database error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      };
    }

    console.log('[SAVE-RESUME FUNCTION] Successfully saved resume with ID:', data.id);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        resume: data
      })
    };
  } catch (error) {
    console.error('[SAVE-RESUME FUNCTION] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || 'Failed to save resume'
      })
    };
  }
};