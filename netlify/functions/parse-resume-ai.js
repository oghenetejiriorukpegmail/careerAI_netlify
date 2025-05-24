// Function 2: Parse resume text using AI
exports.handler = async (event, context) => {
  console.log('[PARSE-RESUME-AI FUNCTION] Starting AI resume parsing');
  console.log('[PARSE-RESUME-AI FUNCTION] Method:', event.httpMethod);
  
  try {
    // Only accept POST requests
    if (event.httpMethod !== 'POST') {
      console.log('[PARSE-RESUME-AI FUNCTION] Invalid method:', event.httpMethod);
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { extractedText, userId } = body;

    if (!extractedText) {
      console.log('[PARSE-RESUME-AI FUNCTION] Missing extracted text');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing extractedText' })
      };
    }

    console.log(`[PARSE-RESUME-AI FUNCTION] Processing ${extractedText.length} characters of text`);
    
    // TEMPORARY: Skip AI parsing to avoid timeouts
    // Return a basic structure that preserves the raw text
    console.log('[PARSE-RESUME-AI FUNCTION] Returning basic structure (AI parsing temporarily disabled)');
    
    const parsedData = {
      name: 'Pending AI Processing',
      email: null,
      phone: null,
      location: null,
      summary: extractedText.substring(0, 500) + '...',
      skills: [],
      experience: [],
      education: [],
      certifications: [],
      raw_text: extractedText,
      status: 'pending_ai_processing'
    };
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        parsedData,
        processingTime: 0,
        aiProvider: 'none',
        aiModel: 'none',
        message: 'AI parsing disabled to prevent timeouts'
      })
    };

  } catch (error) {
    console.error('[PARSE-RESUME-AI FUNCTION] Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Function error',
        details: error.message || 'Unknown error'
      })
    };
  }
};