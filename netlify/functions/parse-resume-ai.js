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
      "location": "City, State or Country",
      "summary": "Professional summary",
      "experience": [{"title": "Job title", "company": "Company", "duration": "Duration", "description": "Description"}],
      "education": [{"degree": "Degree", "school": "School", "year": "Year"}],
      "skills": ["skill1", "skill2"],
      "certifications": ["cert1", "cert2"]
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
          'HTTP-Referer': process.env.SITE_URL || 'https://eustaceai.netlify.app',
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
        const errorText = await response.text();
        console.error('[PARSE-RESUME-AI FUNCTION] OpenRouter API error:', errorText);
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }
      
      const aiResponse = await response.json();
      const processingTime = Date.now() - startTime;
      console.log(`[PARSE-RESUME-AI FUNCTION] AI processing completed in ${processingTime}ms`);
      
      // Extract and parse the response
      const content = aiResponse.choices[0]?.message?.content || '{}';
      let parsedData;
      
      try {
        // Clean the content in case it has markdown formatting
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsedData = JSON.parse(cleanContent);
        console.log('[PARSE-RESUME-AI FUNCTION] Successfully parsed AI response');
      } catch (parseError) {
        console.error('[PARSE-RESUME-AI FUNCTION] Failed to parse AI response:', parseError);
        console.error('[PARSE-RESUME-AI FUNCTION] Raw content:', content);
        // Return basic structure with error
        parsedData = {
          name: 'Parse Error',
          email: null,
          phone: null,
          location: null,
          summary: extractedText.substring(0, 500),
          skills: [],
          experience: [],
          education: [],
          certifications: [],
          raw_text: extractedText,
          parse_error: true,
          error_details: parseError.message
        };
      }
      
      // Add raw text to parsed data
      parsedData.raw_text = extractedText;
      
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
      console.error('[PARSE-RESUME-AI FUNCTION] AI request error:', error);
      
      // Return partial success with raw text
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          parsedData: {
            name: 'AI Processing Failed',
            email: null,
            phone: null,
            location: null,
            summary: extractedText.substring(0, 500),
            skills: [],
            experience: [],
            education: [],
            certifications: [],
            raw_text: extractedText,
            status: 'ai_error',
            error: error.message
          },
          error: error.message,
          processingTime: Date.now() - startTime
        })
      };
    }

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