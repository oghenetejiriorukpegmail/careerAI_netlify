import type { Handler } from "@netlify/functions";

// Function 2: Parse resume text using AI
export const handler: Handler = async (event, context) => {
  console.log('[PARSE-RESUME-AI FUNCTION] Starting AI resume parsing');
  
  try {
    // Only accept POST requests
    if (event.httpMethod !== 'POST') {
      console.log('[PARSE-RESUME-AI FUNCTION] Invalid method:', event.httpMethod);
      return {
        statusCode: 405,
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
        body: JSON.stringify({ error: 'Missing extractedText' })
      };
    }

    console.log(`[PARSE-RESUME-AI FUNCTION] Processing ${extractedText.length} characters of text`);
    
    // Import AI modules
    const { queryAI } = await import('../../lib/ai/config');
    const { loadServerSettings } = await import('../../lib/ai/settings-loader');
    
    // Load AI settings
    const settings = loadServerSettings();
    console.log(`[PARSE-RESUME-AI FUNCTION] Using AI provider: ${settings.aiProvider}, model: ${settings.aiModel}`);
    
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
      // Call AI with timeout protection (8 seconds)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI_TIMEOUT')), 8000)
      );
      
      const aiResponse = await Promise.race([
        queryAI(userPrompt, systemPrompt),
        timeoutPromise
      ]);
      
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
        body: JSON.stringify({
          success: true,
          parsedData,
          processingTime,
          aiProvider: settings.aiProvider,
          aiModel: settings.aiModel
        })
      };
      
    } catch (error: any) {
      if (error.message === 'AI_TIMEOUT') {
        console.log('[PARSE-RESUME-AI FUNCTION] AI processing timed out');
        return {
          statusCode: 200,
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
      body: JSON.stringify({
        error: 'AI parsing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};