// Background function for AI resume parsing (Netlify Pro - 15 minute timeout)
exports.handler = async (event, context) => {
  console.log('[PARSE-RESUME-AI-BACKGROUND] Starting background AI resume parsing');
  console.log('[PARSE-RESUME-AI-BACKGROUND] Method:', event.httpMethod);
  
  try {
    // Only accept POST requests
    if (event.httpMethod !== 'POST') {
      console.log('[PARSE-RESUME-AI-BACKGROUND] Invalid method:', event.httpMethod);
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { extractedText, userId, resumeId } = body;

    if (!extractedText) {
      console.log('[PARSE-RESUME-AI-BACKGROUND] Missing extracted text');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing extractedText' })
      };
    }

    console.log(`[PARSE-RESUME-AI-BACKGROUND] Processing ${extractedText.length} characters for resume ${resumeId}`);
    
    // Get AI configuration from environment variables
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    const aiProvider = process.env.AI_PROVIDER || 'openrouter';
    const aiModel = process.env.AI_MODEL || 'qwen/qwq-32b-preview';
    
    if (!openrouterApiKey) {
      console.error('[PARSE-RESUME-AI-BACKGROUND] Missing OPENROUTER_API_KEY');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'AI service not configured' })
      };
    }
    
    console.log(`[PARSE-RESUME-AI-BACKGROUND] Using AI provider: ${aiProvider}, model: ${aiModel}`);
    
    // Enhanced prompt for better parsing
    const systemPrompt = `You are an expert resume parser. Your task is to extract ALL information from the resume text and structure it perfectly.

    Analyze the resume carefully and return a comprehensive JSON object with these fields:
    {
      "name": "Full name exactly as written",
      "email": "Email address",
      "phone": "Phone number with formatting",
      "location": "City, State/Country",
      "linkedin": "LinkedIn URL if present",
      "summary": "Professional summary or objective statement",
      "experience": [
        {
          "title": "Exact job title",
          "company": "Company name",
          "location": "Job location if specified",
          "duration": "Start date - End date or Present",
          "description": "Full description of responsibilities and achievements"
        }
      ],
      "education": [
        {
          "degree": "Degree type and major",
          "school": "Institution name",
          "location": "School location if specified",
          "year": "Graduation year or date range",
          "gpa": "GPA if mentioned",
          "honors": "Any honors or distinctions"
        }
      ],
      "skills": {
        "technical": ["Programming languages, frameworks, tools"],
        "soft": ["Communication, leadership, etc."],
        "languages": ["Spoken languages with proficiency levels"]
      },
      "certifications": [
        {
          "name": "Certification name",
          "issuer": "Issuing organization",
          "date": "Date obtained or expiry"
        }
      ],
      "projects": [
        {
          "name": "Project name",
          "description": "What the project does",
          "technologies": ["Tech stack used"],
          "link": "URL if provided"
        }
      ],
      "awards": ["List of awards and recognitions"],
      "publications": ["List of publications if any"],
      "volunteer": ["Volunteer experience"],
      "interests": ["Personal interests or hobbies"]
    }

    CRITICAL RULES:
    1. Extract EVERYTHING from the resume - don't miss any detail
    2. Preserve exact formatting and wording where specified
    3. Return ONLY valid JSON - no markdown, no explanations
    4. If a field is not present in the resume, use null or empty array
    5. Parse dates intelligently (e.g., "2020-Present", "Jan 2019 - Dec 2021")`;
    
    const userPrompt = `Parse this resume with extreme attention to detail:\n\n${extractedText}`;
    
    console.log('[PARSE-RESUME-AI-BACKGROUND] Sending request to AI...');
    const startTime = Date.now();
    
    try {
      // Make direct HTTP request to OpenRouter with longer timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minute timeout
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.SITE_URL || 'https://eustaceai.netlify.app',
          'X-Title': 'CareerAI Resume Parser Background'
        },
        body: JSON.stringify({
          model: aiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.2, // Lower temperature for more consistent parsing
          max_tokens: 4000, // More tokens for comprehensive parsing
          top_p: 0.9
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PARSE-RESUME-AI-BACKGROUND] OpenRouter API error:', errorText);
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }
      
      const aiResponse = await response.json();
      const processingTime = Date.now() - startTime;
      console.log(`[PARSE-RESUME-AI-BACKGROUND] AI processing completed in ${processingTime}ms`);
      
      // Extract and parse the response
      const content = aiResponse.choices[0]?.message?.content || '{}';
      let parsedData;
      
      try {
        // Clean the content in case it has markdown formatting
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsedData = JSON.parse(cleanContent);
        console.log('[PARSE-RESUME-AI-BACKGROUND] Successfully parsed AI response');
        
        // Ensure all required fields exist
        parsedData = {
          name: parsedData.name || null,
          email: parsedData.email || null,
          phone: parsedData.phone || null,
          location: parsedData.location || null,
          linkedin: parsedData.linkedin || null,
          summary: parsedData.summary || null,
          experience: Array.isArray(parsedData.experience) ? parsedData.experience : [],
          education: Array.isArray(parsedData.education) ? parsedData.education : [],
          skills: parsedData.skills || { technical: [], soft: [], languages: [] },
          certifications: Array.isArray(parsedData.certifications) ? parsedData.certifications : [],
          projects: Array.isArray(parsedData.projects) ? parsedData.projects : [],
          awards: Array.isArray(parsedData.awards) ? parsedData.awards : [],
          publications: Array.isArray(parsedData.publications) ? parsedData.publications : [],
          volunteer: Array.isArray(parsedData.volunteer) ? parsedData.volunteer : [],
          interests: Array.isArray(parsedData.interests) ? parsedData.interests : [],
          raw_text: extractedText
        };
        
      } catch (parseError) {
        console.error('[PARSE-RESUME-AI-BACKGROUND] Failed to parse AI response:', parseError);
        console.error('[PARSE-RESUME-AI-BACKGROUND] Raw content:', content.substring(0, 500));
        throw parseError;
      }
      
      // If resumeId is provided, update the database
      if (resumeId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.log('[PARSE-RESUME-AI-BACKGROUND] Updating resume in database');
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        const { error: updateError } = await supabase
          .from('resumes')
          .update({ 
            parsed_data: parsedData,
            status: 'processed',
            processed_at: new Date().toISOString()
          })
          .eq('id', resumeId);
          
        if (updateError) {
          console.error('[PARSE-RESUME-AI-BACKGROUND] Database update error:', updateError);
        } else {
          console.log('[PARSE-RESUME-AI-BACKGROUND] Resume updated successfully');
        }
      }
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          parsedData,
          processingTime,
          aiProvider,
          aiModel,
          resumeId
        })
      };
      
    } catch (error) {
      console.error('[PARSE-RESUME-AI-BACKGROUND] AI request error:', error);
      
      // Return error response
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: error.message,
          processingTime: Date.now() - startTime,
          resumeId
        })
      };
    }

  } catch (error) {
    console.error('[PARSE-RESUME-AI-BACKGROUND] Error:', error);
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

// Mark this as a background function
exports.config = {
  type: 'background'
};