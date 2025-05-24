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
    
    // Get AI configuration from environment variables
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    const aiProvider = process.env.AI_PROVIDER || 'openrouter';
    const aiModel = process.env.AI_MODEL || 'qwen/qwq-32b-preview';
    
    if (!openrouterApiKey) {
      console.error('[PARSE-RESUME-AI FUNCTION] Missing OPENROUTER_API_KEY');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'AI service not configured' })
      };
    }
    
    console.log(`[PARSE-RESUME-AI FUNCTION] Using AI provider: ${aiProvider}, model: ${aiModel}`);
    
    // Define the resume parsing prompt
    const systemPrompt = `You are a resume parsing expert. Extract ALL structured information from the resume text and return it as JSON.
    
    Return ONLY valid JSON with these fields:
    {
      "name": "Full name",
      "email": "Email address", 
      "phone": "Phone number",
      "summary": "Professional summary",
      "experience": [{"title": "Job title", "company": "Company", "duration": "Duration", "description": "Description"}],
      "education": [{"degree": "Degree", "school": "School", "year": "Year"}],
      "skills": ["skill1", "skill2"]
    }
    
    IMPORTANT: Return ONLY the JSON object, no markdown, no explanations.`;
    
    const userPrompt = `Parse this resume:\n\n${extractedText}`;
    
    console.log('[PARSE-RESUME-AI FUNCTION] Sending request to AI...');
    const startTime = Date.now();
    
    try {
      // Make direct HTTP request to OpenRouter
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.SITE_URL || 'https://careerai.netlify.app',
          'X-Title': 'CareerAI Resume Parser'
        },
        body: JSON.stringify({
          model: aiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 2000
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }
      
      const aiResponse = await response.json();
      const processingTime = Date.now() - startTime;
      console.log(`[PARSE-RESUME-AI FUNCTION] AI processing completed in ${processingTime}ms`);
      
      // Extract and parse the response
      const content = aiResponse.choices[0]?.message?.content || '{}';
      let parsedData;
      
      try {
        parsedData = JSON.parse(content);
        console.log('[PARSE-RESUME-AI FUNCTION] Successfully parsed AI response');
      } catch (parseError) {
        console.error('[PARSE-RESUME-AI FUNCTION] Failed to parse AI response:', parseError);
        // Return basic structure
        parsedData = {
          name: 'Parse Error',
          summary: extractedText.substring(0, 500),
          raw_text: extractedText,
          parse_error: true
        };
      }
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          parsedData,
          processingTime,
          aiProvider,
          aiModel
        })
      };
      
    } catch (error) {
      // Handle timeout with 8-second limit
      if (Date.now() - startTime > 8000) {
        console.log('[PARSE-RESUME-AI FUNCTION] AI processing timed out');
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            timeout: true,
            parsedData: {
              name: 'Processing Timeout',
              summary: extractedText.substring(0, 500),
              raw_text: extractedText,
              status: 'timeout'
            }
          })
        };
      }
      throw error;
    }

  } catch (error) {
    console.error('[PARSE-RESUME-AI FUNCTION] Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'AI parsing failed',
        details: error.message || 'Unknown error'
      })
    };
  }
};