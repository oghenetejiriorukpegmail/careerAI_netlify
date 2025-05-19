// AI model configuration
export const AI_CONFIG = {
  // Requesty Router configuration
  requesty: {
    apiKey: process.env.ROUTER_API_KEY || 'sk-+mZ784BeQxS6EXfmzWchAIB9fmvIV6NGkwF9VNfsuONF/NtjFuGheUXQK+YU2D/npXfNCKYcqVyObin/PJJhkeZdvGVMDDWFZ/Yzi3/NsAM=',
    model: 'vertex/anthropic/claude-3-7-sonnet-20250219@us-east5',
    baseUrl: 'https://router.requesty.ai/v1'
  },
  // OpenAI configuration (keeping for backwards compatibility)
  openai: {
    apiKey: process.env.OPENAI_API_KEY || 'sk-+mZ784BeQxS6EXfmzWchAIB9fmvIV6NGkwF9VNfsuONF/NtjFuGheUXQK+YU2D/npXfNCKYcqVyObin/PJJhkeZdvGVMDDWFZ/Yzi3/NsAM=',
    model: 'gpt-4'
  },
  // Keep Gemini reference for backward compatibility
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || 'AIzaSyAnYDT0bXchBFv7POL72UaDpsIJFOAu9Ic',
    model: 'gemini-pro'
  },
  // Vertex AI configuration
  vertex: {
    apiKey: process.env.VERTEX_API_KEY || process.env.GOOGLE_API_KEY || 'AIzaSyA1UcUNKz2v9mBzKfLay3A3TydQZiziMZ8',
    model: 'vertex/anthropic/claude-3-7-sonnet-latest@us-east5',
    projectId: process.env.GOOGLE_PROJECT_ID || '498473173877',
    location: 'us-east5'
  }
};

// Simple token counter function (estimates tokens based on character count)
function estimateTokenCount(text: string): number {
  // A very rough estimate: 1 token is approximately 4 characters in English
  return Math.ceil(text.length / 4);
}

// Function to truncate text to fit within token limits
function truncateToTokenLimit(text: string, maxTokens: number = 30000): string {
  const estimatedTokens = estimateTokenCount(text);
  
  if (estimatedTokens <= maxTokens) {
    return text; // No truncation needed
  }
  
  console.log(`Text exceeds token limit (est. ${estimatedTokens} tokens). Truncating to ~${maxTokens} tokens.`);
  
  // Calculate approximate character limit
  const charLimit = maxTokens * 4;
  
  // Keep first 2/3 and last 1/3 of allowed length, dropping the middle
  // This "middle-out" approach preserves the beginning and end of documents
  if (charLimit > 3000) {
    const firstPart = Math.floor(charLimit * 0.7); // Keep more of the beginning
    const lastPart = charLimit - firstPart - 100; // Reserve 100 chars for the ellipsis and buffer
    
    const truncated = text.substring(0, firstPart) + 
      '\n\n[...content truncated to meet token limits...]\n\n' + 
      text.substring(text.length - lastPart);
    
    return truncated;
  }
  
  // For very short limits, just truncate the end
  return text.substring(0, charLimit) + '...';
}


// Function to make a request to Gemini 2.5 Flash
export async function queryGemini(prompt: string, systemPrompt?: string) {
  try {
    console.log(`Calling Gemini API with key: ${AI_CONFIG.gemini.apiKey.substring(0, 10)}...`);
    
    // Apply token limiting for Gemini
    const MAX_GEMINI_TOKENS = 30000; // Gemini Pro supports up to 32K tokens, using 30K to be safe
    
    // Check if prompt needs truncation
    const originalLength = prompt.length;
    const truncatedPrompt = truncateToTokenLimit(prompt, MAX_GEMINI_TOKENS);
    
    if (truncatedPrompt.length < originalLength) {
      console.log(`Truncated Gemini prompt from ${originalLength} to ${truncatedPrompt.length} characters`);
    }
    
    // Prepare the request body with system prompt (if provided)
    const requestContents = [];
    
    // Add system prompt if provided
    if (systemPrompt) {
      requestContents.push({
        role: 'user',
        parts: [{ text: systemPrompt }]
      });
      requestContents.push({
        role: 'model',
        parts: [{ text: 'I understand the instructions.' }]
      });
    }
    
    // Add user prompt
    requestContents.push({
      role: 'user',
      parts: [{ text: truncatedPrompt }]
    });
    
    console.log(`Making request to Gemini model: ${AI_CONFIG.gemini.model}`);
    
    // Use correct URL format for gemini-pro model
    const apiUrl = AI_CONFIG.gemini.model.includes('models/') 
      ? `https://generativelanguage.googleapis.com/v1/${AI_CONFIG.gemini.model}:generateContent`
      : `https://generativelanguage.googleapis.com/v1/models/${AI_CONFIG.gemini.model}:generateContent`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': AI_CONFIG.gemini.apiKey,
      },
      body: JSON.stringify({
        contents: requestContents,
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192,
        }
      }),
      // Add timeout to prevent hanging requests with large documents
      signal: AbortSignal.timeout(120000) // 120 second timeout for large documents
    });

    // Check for HTTP errors
    if (!response.ok) {
      let errorMessage = `Status ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = JSON.stringify(errorData);
        console.error('Gemini API error:', errorData);
        
        // Check for token limit errors and try again with more aggressive truncation
        if (errorMessage.includes('exceed') && errorMessage.includes('token')) {
          console.log('Token limit exceeded for Gemini, trying with more aggressive truncation');
          
          // Truncate more aggressively
          const shorterPrompt = truncateToTokenLimit(prompt, Math.floor(MAX_GEMINI_TOKENS * 0.6));
          
          // Use correct URL format for retry
          const retryApiUrl = AI_CONFIG.gemini.model.includes('models/') 
            ? `https://generativelanguage.googleapis.com/v1/${AI_CONFIG.gemini.model}:generateContent`
            : `https://generativelanguage.googleapis.com/v1/models/${AI_CONFIG.gemini.model}:generateContent`;
            
          // Retry with shorter prompt
          const retryResponse = await fetch(retryApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': AI_CONFIG.gemini.apiKey,
            },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    { text: shorterPrompt }
                  ]
                }
              ],
              generationConfig: {
                temperature: 0.2,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 8192,
              }
            }),
            signal: AbortSignal.timeout(120000) // Increased timeout for large documents
          });
          
          if (retryResponse.ok) {
            console.log('Retry with shorter prompt for Gemini successful');
            const data = await retryResponse.json();
            
            // Make sure the response has the expected format
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
              console.error('Unexpected Gemini retry response format:', data);
              throw new Error('Gemini API returned unexpected response format on retry');
            }
            
            // Log the raw Gemini retry response for debugging
            let retryContent = data.candidates[0].content.parts[0].text;
            console.log(`[RAW GEMINI RETRY RESPONSE] First 500 chars: ${retryContent.substring(0, 500)}...`);
            
            // Check if response contains markdown code blocks
            if (retryContent.includes('```')) {
              console.warn('[GEMINI RETRY RESPONSE WARNING] Response contains markdown code blocks - cleaning up');
              
              // If content starts with code block, remove the opening marker
              if (retryContent.startsWith('```')) {
                // Check for language specifier like ```json
                const afterMarker = retryContent.substring(3);
                const languageMatch = afterMarker.match(/^[a-z]+\s/);
                const contentStartPos = languageMatch ? 3 + languageMatch[0].length : 3;
                
                // Get content after the opening marker
                retryContent = retryContent.substring(contentStartPos);
                console.log('[GEMINI RETRY] Removed opening code block marker');
              }
              
              // Remove closing code block marker if present
              if (retryContent.endsWith('```')) {
                retryContent = retryContent.substring(0, retryContent.length - 3).trim();
                console.log('[GEMINI RETRY] Removed closing code block marker');
              }
              
              // Remove any remaining code block markers
              retryContent = retryContent.replace(/```/g, '');
              
              // Update the content 
              data.candidates[0].content.parts[0].text = retryContent;
              console.log('[GEMINI RETRY] Cleaned response of code block markers');
            }
            
            // Transform Gemini response to match OpenRouter format
            return {
              choices: [
                {
                  message: {
                    content: retryContent,
                    role: 'assistant'
                  },
                  index: 0
                }
              ]
            };
          }
        }
      } catch (parseError) {
        console.error('Failed to parse Gemini error response:', parseError);
      }
      throw new Error(`Gemini API error: ${errorMessage}`);
    }

    // Parse response JSON
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      throw new Error(`Failed to parse Gemini response: ${parseError.message}`);
    }
    
    // Make sure the response has the expected format
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      console.error('Unexpected Gemini response format:', data);
      throw new Error('Gemini API returned unexpected response format');
    }
    
    // Log the raw Gemini response for debugging
    let rawContent = data.candidates[0].content.parts[0].text;
    console.log(`[RAW GEMINI RESPONSE] First 500 chars: ${rawContent.substring(0, 500)}...`);
    
    // Write complete response to log file
    if (typeof process !== 'undefined') {
      try {
        // Dynamic import for ESM compatibility
        import('fs').then(fs => {
          // Create logs directory if it doesn't exist
          if (!fs.existsSync('./logs')) {
            fs.mkdirSync('./logs', { recursive: true });
          }
          
          // Create a timestamped filename for the log
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const logFilePath = `./logs/gemini_response_${timestamp}.txt`;
          
          // Write the complete text to the log file
          fs.writeFileSync(logFilePath, rawContent);
          console.log(`Complete Gemini response saved to ${logFilePath}`);
          
          // Also write raw API response JSON for reference
          fs.writeFileSync(`./logs/gemini_raw_${timestamp}.json`, JSON.stringify(data, null, 2));
        }).catch(err => {
          console.error('Failed to import fs module:', err);
        });
      } catch (err) {
        console.error('Error writing Gemini log file:', err);
      }
    }
    
    // Clean up any markdown code blocks
    if (rawContent.includes('```')) {
      console.warn('[GEMINI RESPONSE WARNING] Response contains markdown code blocks - cleaning up');
      
      // If content starts with code block, remove the opening marker
      if (rawContent.startsWith('```')) {
        // Handle language specifier like ```json
        const afterMarker = rawContent.substring(3);
        const languageMatch = afterMarker.match(/^[a-z]+\s/);
        const contentStartPos = languageMatch ? 3 + languageMatch[0].length : 3;
        
        // Get content after the opening marker
        rawContent = rawContent.substring(contentStartPos);
        console.log('[GEMINI] Removed opening code block marker');
      }
      
      // Remove closing code block marker if present
      if (rawContent.endsWith('```')) {
        rawContent = rawContent.substring(0, rawContent.length - 3).trim();
        console.log('[GEMINI] Removed closing code block marker');
      }
      
      // Remove any remaining code block markers
      rawContent = rawContent.replace(/```/g, '');
      console.log('[GEMINI] Cleaned response of code block markers');
    }
    
    // Fix potentially malformed JSON
    if (rawContent.startsWith('{') && (rawContent.includes('"contactInfo"') || rawContent.includes('"jobTitle"'))) {
      console.log('[GEMINI] Attempting to fix potentially malformed JSON');
      
      try {
        // Try to parse as-is first
        JSON.parse(rawContent);
        console.log('[GEMINI] JSON appears valid');
      } catch (jsonError) {
        console.warn('[GEMINI] JSON parsing failed, applying fixes:', jsonError.message);
        
        // For extreme cases like very large documents, try extracting just the most crucial info
        if (rawContent.length > 10000) {
          console.log('[GEMINI] Large document detected, applying more aggressive JSON extraction');
          
          try {
            // First attempt - extract only basic fields
            const contactInfoMatch = rawContent.match(/"contactInfo"\s*:\s*{([^}]+)}/);
            const contactInfo = contactInfoMatch ? contactInfoMatch[0] : ''; 
            
            const summaryMatch = rawContent.match(/"summary"\s*:\s*"[^"]+"/);
            const summary = summaryMatch ? summaryMatch[0] : '';
            
            // Extract just the first few experiences
            let experienceMatch = rawContent.match(/"experience"\s*:\s*\[\s*{[^{]*?}\s*,\s*{[^{]*?}\s*,\s*{[^{]*?}\s*\]/);
            if (!experienceMatch) {
              // Try with fewer items
              experienceMatch = rawContent.match(/"experience"\s*:\s*\[\s*{[^{]*?}\s*,\s*{[^{]*?}\s*\]/);
              if (!experienceMatch) {
                // Try with just one item
                experienceMatch = rawContent.match(/"experience"\s*:\s*\[\s*{[^{]*?}\s*\]/);
              }
            }
            const experience = experienceMatch ? experienceMatch[0] : '"experience": []';
            
            // Extract education
            let educationMatch = rawContent.match(/"education"\s*:\s*\[[^\]]*?\]/);
            const education = educationMatch ? educationMatch[0] : '"education": []';
            
            // Extract skills
            let skillsMatch = rawContent.match(/"skills"\s*:\s*\[[^\]]*?\]/);
            const skills = skillsMatch ? skillsMatch[0] : '"skills": []';
            
            // Extract certifications if present
            let certificationsMatch = rawContent.match(/"certifications"\s*:\s*\[[^\]]*?\]/);
            const certifications = certificationsMatch ? certificationsMatch[0] + ',' : '';
            
            // Build a simplified JSON with only the key parts
            const truncatedJson = 
              '{\n' +
              '  ' + contactInfo + ',\n' +
              '  ' + summary + ',\n' +
              '  ' + experience + ',\n' +
              '  ' + education + ',\n' +
              '  ' + skills + '\n' +
              (certifications ? '  ' + certifications + '\n' : '') +
              '}';
            
            // Try to parse the simplified JSON
            try {
              // Fix any trailing/missing commas
              const fixedJson = truncatedJson
                .replace(/,\s*\n\s*}/g, '\n}')  // Remove comma before closing brace
                .replace(/"\s*,\s*"/g, '", "')  // Fix spacing around commas
                .replace(/}\s*,\s*{/g, '}, {'); // Fix spacing in arrays
                
              JSON.parse(fixedJson);
              rawContent = fixedJson;
              console.log('[GEMINI] Successfully extracted and built simplified JSON');
            } catch (simplifyError) {
              console.warn('[GEMINI] Simplified JSON parsing failed:', simplifyError.message);
              
              // If that fails, use super aggressive approach for just contact info
              try {
                // Just extract name, email, phone, and summary
                const nameMatch = rawContent.match(/"fullName"\s*:\s*"([^"]*)"/);
                const emailMatch = rawContent.match(/"email"\s*:\s*"([^"]*)"/);
                const phoneMatch = rawContent.match(/"phone"\s*:\s*"([^"]*)"/);
                // Extract summary text - handle the format "summary": "text"
                let summaryText = '';
                if (summaryMatch) {
                  const summaryExtraction = summaryMatch[0].match(/"summary"\s*:\s*"([^"]*)"/);
                  summaryText = summaryExtraction ? summaryExtraction[1] : '';
                }
                
                const minimumJson = `{
                  "contactInfo": {
                    "fullName": "${nameMatch ? nameMatch[1] : ''}",
                    "email": "${emailMatch ? emailMatch[1] : ''}",
                    "phone": "${phoneMatch ? phoneMatch[1] : ''}"
                  },
                  "summary": "${summaryText}",
                  "experience": [],
                  "education": [],
                  "skills": [],
                  "certifications": []
                }`;
                
                JSON.parse(minimumJson);
                rawContent = minimumJson;
                console.log('[GEMINI] Built minimum viable JSON with just contact info');
              } catch (minimalError) {
                console.warn('[GEMINI] Even minimal JSON failed:', minimalError);
              }
            }
          } catch (extractionError) {
            console.error('[GEMINI] JSON extraction approach failed:', extractionError);
          }
        } else {
          // Standard fixes for smaller JSON
          const originalContent = rawContent;
          rawContent = rawContent
            // Fix trailing commas in arrays and objects
            .replace(/,(\s*[\]}])/g, '$1')
            // Fix missing commas between elements
            .replace(/}(\s*){/g, '},\n$1{')
            // Fix unescaped quotes in strings by replacing all quotes with controlled replacements
            .replace(/\\"/g, '____ESCAPED_QUOTE____')
            .replace(/"/g, '____QUOTE____')
            .replace(/____ESCAPED_QUOTE____/g, '\\"')
            .replace(/____QUOTE____/g, '"')
            // Fix truncated JSON by adding a closing bracket if needed
            .replace(/([^}])$/, '$1}')
            // Ensure strings are properly quoted
            .replace(/([{,]\s*)([^",{}[\]\s]+)(\s*:)/g, '$1"$2"$3');
          
          // Check if the JSON is now valid
          try {
            JSON.parse(rawContent);
            console.log('[GEMINI] Successfully fixed malformed JSON');
          } catch (fixError) {
            console.warn('[GEMINI] JSON fixing failed, reverting to original content:', fixError.message);
            rawContent = originalContent;
          }
        }
      }
    }
    
    // Update the content in the response
    data.candidates[0].content.parts[0].text = rawContent;
    
    // Transform Gemini response to match OpenRouter format
    return {
      choices: [
        {
          message: {
            content: rawContent,
            role: 'assistant'
          },
          index: 0
        }
      ]
    };
  } catch (error) {
    console.error('Error calling Gemini:', error);
    // Add more context to help diagnose the issue
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Network error connecting to Gemini: ${error.message}`);
    } else if (error.name === 'AbortError') {
      throw new Error('Gemini request timed out after 30 seconds');
    } else {
      throw error;
    }
  }
}

// Function to query OpenAI API via Requesty
export async function queryOpenAI(prompt: string, systemPrompt?: string) {
  try {
    console.log(`Calling OpenAI API via Requesty with model: ${AI_CONFIG.openai.model}`);
    
    // Apply token limiting for OpenAI
    const MAX_OPENAI_TOKENS = 30000; // GPT-4 supports up to 32K tokens, using 30K to be safe
    
    // Check if prompt needs truncation
    const originalLength = prompt.length;
    const truncatedPrompt = truncateToTokenLimit(prompt, MAX_OPENAI_TOKENS);
    
    if (truncatedPrompt.length < originalLength) {
      console.log(`Truncated OpenAI prompt from ${originalLength} to ${truncatedPrompt.length} characters`);
    }
    
    // Prepare the request body
    const messages = [];
    
    // Add system prompt if provided
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }
    
    // Add user prompt
    messages.push({
      role: 'user',
      content: truncatedPrompt
    });
    
    // Make the request to OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.openai.apiKey}`
      },
      body: JSON.stringify({
        model: AI_CONFIG.openai.model,
        messages: messages,
        temperature: 0.2,
        max_tokens: 8192
      }),
      // Add timeout to prevent hanging requests with large documents
      signal: AbortSignal.timeout(120000) // 120 second timeout for large documents
    });
    
    // Check for HTTP errors
    if (!response.ok) {
      let errorMessage = `Status ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = JSON.stringify(errorData);
        console.error('OpenAI API error:', errorData);
      } catch (parseError) {
        console.error('Failed to parse OpenAI error response:', parseError);
      }
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }
    
    // Parse response JSON
    const data = await response.json();
    
    // Log the raw OpenAI response for debugging
    if (data.choices && data.choices[0] && data.choices[0].message) {
      let rawContent = data.choices[0].message.content;
      console.log(`[RAW OPENAI RESPONSE] First 500 chars: ${rawContent.substring(0, 500)}...`);
      
      // Clean up code blocks from responses for easier JSON parsing
      if (rawContent.includes('```')) {
        console.log('[OPENAI] Response contains code blocks - cleaning up...');
        
        // If content starts with code block, remove the opening marker
        if (rawContent.startsWith('```')) {
          // Check for language specifier like ```json
          const afterMarker = rawContent.substring(3);
          const languageMatch = afterMarker.match(/^[a-z]+\s/);
          const contentStartPos = languageMatch ? 3 + languageMatch[0].length : 3;
          
          // Get content after the opening marker
          rawContent = rawContent.substring(contentStartPos);
          console.log('[OPENAI] Removed opening code block marker');
        }
        
        // Remove closing code block marker if present
        if (rawContent.endsWith('```')) {
          rawContent = rawContent.substring(0, rawContent.length - 3).trim();
          console.log('[OPENAI] Removed closing code block marker');
        }
        
        // Remove any remaining code block markers
        rawContent = rawContent.replace(/```/g, '');
        console.log('[OPENAI] Cleaned response of code block markers');
      }
      
      // Special case to fix JSONP style responses (common with OpenAI)
      if (rawContent.includes('callback(') || rawContent.includes('onResponse(')) {
        console.log('[OPENAI] JSONP-style response detected, extracting JSON');
        const match = rawContent.match(/(?:callback|onResponse)\((.*)\)(?:;?)/s);
        if (match && match[1]) {
          rawContent = match[1];
          console.log('[OPENAI] Extracted JSON from callback wrapper');
        }
      }
      
      // Fix potentially malformed JSON
      if (rawContent.startsWith('{') && (rawContent.includes('"contactInfo"') || rawContent.includes('"jobTitle"'))) {
        console.log('[OPENAI] Attempting to fix potentially malformed JSON');
        
        try {
          // Try to parse as-is first
          JSON.parse(rawContent);
          console.log('[OPENAI] JSON appears valid');
        } catch (jsonError) {
          console.warn('[OPENAI] JSON parsing failed, applying fixes:', jsonError.message);
          
          // Fix common JSON issues
          const originalContent = rawContent;
          rawContent = rawContent
            // Fix trailing commas in arrays and objects
            .replace(/,(\s*[\]}])/g, '$1')
            // Fix missing commas between elements
            .replace(/}(\s*){/g, '},\n$1{')
            // Fix unescaped quotes by using controlled replacements
            .replace(/\\"/g, '____ESCAPED_QUOTE____')
            .replace(/"/g, '____QUOTE____')
            .replace(/____ESCAPED_QUOTE____/g, '\\"')
            .replace(/____QUOTE____/g, '"')
            // Fix unterminated strings by adding a quote at the end
            .replace(/"([^"]*)$/, '"$1"')
            // Fix truncated JSON by adding closing brackets if needed
            .replace(/([^}])$/, '$1}');
            
          // Check if the JSON is now valid
          try {
            JSON.parse(rawContent);
            console.log('[OPENAI] Successfully fixed malformed JSON');
          } catch (fixError) {
            console.warn('[OPENAI] JSON fixing failed, reverting to original content:', fixError.message);
            rawContent = originalContent;
          }
        }
      }
      
      // Update the content in the response
      data.choices[0].message.content = rawContent;
      console.log('[OPENAI] Processed and cleaned response content');
    }
    
    return data;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw error;
  }
}

// Function to query Requesty Router API with Gemini model
export async function queryRequesty(prompt: string, systemPrompt?: string) {
  try {
    console.log(`Calling Requesty Router API with model: ${AI_CONFIG.requesty.model}`);
    
    // Apply token limiting for the model
    const MAX_TOKENS = 30000;
    
    // Check if prompt needs truncation
    const originalLength = prompt.length;
    const truncatedPrompt = truncateToTokenLimit(prompt, MAX_TOKENS);
    
    if (truncatedPrompt.length < originalLength) {
      console.log(`Truncated prompt from ${originalLength} to ${truncatedPrompt.length} characters`);
    }
    
    // Prepare the request body
    const messages = [];
    
    // Add system prompt if provided
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }
    
    // Add user prompt
    messages.push({
      role: 'user',
      content: truncatedPrompt
    });
    
    // Make the request to Requesty Router API
    const response = await fetch(`${AI_CONFIG.requesty.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.requesty.apiKey}`
      },
      body: JSON.stringify({
        model: AI_CONFIG.requesty.model,
        messages: messages,
        temperature: 0.2,
        max_tokens: 8192
      }),
      // Add timeout to prevent hanging requests with large documents
      // Increased timeout for Vertex AI models that may take longer
      signal: AbortSignal.timeout(300000) // 300 second (5 minute) timeout for Vertex AI models
    });
    
    // Check for HTTP errors
    if (!response.ok) {
      let errorMessage = `Status ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = JSON.stringify(errorData);
        console.error('Requesty Router API error:', errorData);
      } catch (parseError) {
        console.error('Failed to parse Requesty Router error response:', parseError);
      }
      throw new Error(`Requesty Router API error: ${errorMessage}`);
    }
    
    // Parse response JSON
    const data = await response.json();
    
    // Log the raw response for debugging
    if (data.choices && data.choices[0] && data.choices[0].message) {
      let rawContent = data.choices[0].message.content;
      console.log(`[RAW REQUESTY RESPONSE] First 500 chars: ${rawContent.substring(0, 500)}...`);
      
      // Write complete response to log file
      if (typeof process !== 'undefined') {
        try {
          // Dynamic import for ESM compatibility
          import('fs').then(fs => {
            // Create logs directory if it doesn't exist
            if (!fs.existsSync('./logs')) {
              fs.mkdirSync('./logs', { recursive: true });
            }
            
            // Create a timestamped filename for the log
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const logFilePath = `./logs/requesty_response_${timestamp}.txt`;
            
            // Write the complete text to the log file
            fs.writeFileSync(logFilePath, rawContent);
            console.log(`Complete Requesty response saved to ${logFilePath}`);
            
            // Also write raw API response JSON for reference
            fs.writeFileSync(`./logs/requesty_raw_${timestamp}.json`, JSON.stringify(data, null, 2));
          }).catch(err => {
            console.error('Failed to import fs module:', err);
          });
        } catch (err) {
          console.error('Error writing Requesty log file:', err);
        }
      }
      
      // Clean up code blocks from responses for easier JSON parsing
      if (rawContent.includes('```')) {
        console.log('[REQUESTY] Response contains code blocks - cleaning up...');
        
        // If content starts with code block, remove the opening marker
        if (rawContent.startsWith('```')) {
          // Check for language specifier like ```json
          const afterMarker = rawContent.substring(3);
          const languageMatch = afterMarker.match(/^[a-z]+\s/);
          const contentStartPos = languageMatch ? 3 + languageMatch[0].length : 3;
          
          // Get content after the opening marker
          rawContent = rawContent.substring(contentStartPos);
          console.log('[REQUESTY] Removed opening code block marker');
        }
        
        // Remove closing code block marker if present
        if (rawContent.endsWith('```')) {
          rawContent = rawContent.substring(0, rawContent.length - 3).trim();
          console.log('[REQUESTY] Removed closing code block marker');
        }
        
        // Remove any remaining code block markers
        rawContent = rawContent.replace(/```/g, '');
        console.log('[REQUESTY] Cleaned response of code block markers');
      }
      
      // Fix potentially malformed JSON
      if (rawContent.startsWith('{') && (rawContent.includes('"contactInfo"') || rawContent.includes('"jobTitle"'))) {
        console.log('[REQUESTY] Attempting to fix potentially malformed JSON');
        
        try {
          // Try to parse as-is first
          JSON.parse(rawContent);
          console.log('[REQUESTY] JSON appears valid');
        } catch (jsonError) {
          console.warn('[REQUESTY] JSON parsing failed, applying fixes:', jsonError.message);
          
          // For extreme cases like very large documents, try extracting just the most crucial info
          if (rawContent.length > 10000) {
            console.log('[REQUESTY] Large document detected, applying more aggressive JSON extraction');
            
            try {
              // First attempt - extract only basic fields
              const contactInfoMatch = rawContent.match(/"contactInfo"\s*:\s*{([^}]+)}/);
              const contactInfo = contactInfoMatch ? contactInfoMatch[0] : ''; 
              
              const summaryMatch = rawContent.match(/"summary"\s*:\s*"[^"]+"/);
              const summary = summaryMatch ? summaryMatch[0] : '';
              
              // Extract just the first few experiences
              let experienceMatch = rawContent.match(/"experience"\s*:\s*\[\s*{[^{]*?}\s*,\s*{[^{]*?}\s*,\s*{[^{]*?}\s*\]/);
              if (!experienceMatch) {
                // Try with fewer items
                experienceMatch = rawContent.match(/"experience"\s*:\s*\[\s*{[^{]*?}\s*,\s*{[^{]*?}\s*\]/);
                if (!experienceMatch) {
                  // Try with just one item
                  experienceMatch = rawContent.match(/"experience"\s*:\s*\[\s*{[^{]*?}\s*\]/);
                }
              }
              const experience = experienceMatch ? experienceMatch[0] : '"experience": []';
              
              // Extract education
              let educationMatch = rawContent.match(/"education"\s*:\s*\[[^\]]*?\]/);
              const education = educationMatch ? educationMatch[0] : '"education": []';
              
              // Extract skills
              let skillsMatch = rawContent.match(/"skills"\s*:\s*\[[^\]]*?\]/);
              const skills = skillsMatch ? skillsMatch[0] : '"skills": []';
              
              // Build a simplified JSON with only the key parts
              const truncatedJson = 
                '{\n' +
                '  ' + contactInfo + ',\n' +
                '  ' + summary + ',\n' +
                '  ' + experience + ',\n' +
                '  ' + education + ',\n' +
                '  ' + skills + '\n' +
                '}';
              
              // Try to parse the simplified JSON
              try {
                // Fix any trailing/missing commas
                const fixedJson = truncatedJson
                  .replace(/,\s*\n\s*}/g, '\n}')  // Remove comma before closing brace
                  .replace(/"\s*,\s*"/g, '", "')  // Fix spacing around commas
                  .replace(/}\s*,\s*{/g, '}, {'); // Fix spacing in arrays
                  
                JSON.parse(fixedJson);
                rawContent = fixedJson;
                console.log('[REQUESTY] Successfully extracted and built simplified JSON');
              } catch (simplifyError) {
                console.warn('[REQUESTY] Simplified JSON parsing failed:', simplifyError.message);
                
                // If that fails, use super aggressive approach for just contact info
                try {
                  // Just extract name, email, phone, and summary
                  const nameMatch = rawContent.match(/"fullName"\s*:\s*"([^"]*)"/);
                  const emailMatch = rawContent.match(/"email"\s*:\s*"([^"]*)"/);
                  const phoneMatch = rawContent.match(/"phone"\s*:\s*"([^"]*)"/);
                  
                  // Extract summary text - handle the format "summary": "text"
                  let summaryText = '';
                  const summaryMatch = rawContent.match(/"summary"\s*:\s*"[^"]+"/);
                  if (summaryMatch) {
                    const summaryExtraction = summaryMatch[0].match(/"summary"\s*:\s*"([^"]*)"/);
                    summaryText = summaryExtraction ? summaryExtraction[1] : '';
                  }
                  
                  const minimumJson = `{
                    "contactInfo": {
                      "fullName": "${nameMatch ? nameMatch[1] : ''}",
                      "email": "${emailMatch ? emailMatch[1] : ''}",
                      "phone": "${phoneMatch ? phoneMatch[1] : ''}"
                    },
                    "summary": "${summaryText}",
                    "experience": [],
                    "education": [],
                    "skills": [],
                    "certifications": []
                  }`;
                  
                  JSON.parse(minimumJson);
                  rawContent = minimumJson;
                  console.log('[REQUESTY] Built minimum viable JSON with just contact info');
                } catch (minimalError) {
                  console.warn('[REQUESTY] Even minimal JSON failed:', minimalError);
                }
              }
            } catch (extractionError) {
              console.error('[REQUESTY] JSON extraction approach failed:', extractionError);
            }
          } else {
            // Standard fixes for smaller JSON
            const originalContent = rawContent;
            rawContent = rawContent
              // Fix trailing commas in arrays and objects
              .replace(/,(\s*[\]}])/g, '$1')
              // Fix missing commas between elements
              .replace(/}(\s*){/g, '},\n$1{')
              // Fix unescaped quotes by using controlled replacements
              .replace(/\\"/g, '____ESCAPED_QUOTE____')
              .replace(/"/g, '____QUOTE____')
              .replace(/____ESCAPED_QUOTE____/g, '\\"')
              .replace(/____QUOTE____/g, '"')
              // Fix unterminated strings by adding a quote at the end
              .replace(/"([^"]*)$/, '"$1"')
              // Fix truncated JSON by adding closing brackets if needed
              .replace(/([^}])$/, '$1}');
              
            // Check if the JSON is now valid
            try {
              JSON.parse(rawContent);
              console.log('[REQUESTY] Successfully fixed malformed JSON');
            } catch (fixError) {
              console.warn('[REQUESTY] JSON fixing failed, reverting to original content:', fixError.message);
              rawContent = originalContent;
            }
          }
        }
      }
      
      // Update the content in the response
      data.choices[0].message.content = rawContent;
      console.log('[REQUESTY] Processed and cleaned response content');
    }
    
    return data;
  } catch (error) {
    console.error('Error calling Requesty Router:', error);
    throw error;
  }
}

// Function to handle AI requests with prioritization of different providers
// Load user settings or use defaults
async function loadUserSettings() {
  try {
    if (typeof window !== 'undefined') {
      // Client side - try to check local storage first (for non-authenticated users)
      try {
        const localSettings = localStorage.getItem('userSettings');
        if (localSettings) {
          console.log('Using settings from localStorage');
          return JSON.parse(localSettings);
        }
      } catch (localStorageError) {
        console.log('No local settings found:', localStorageError);
      }
      
      // Then try the API (for authenticated users)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
        
        const response = await fetch('/api/settings', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const settings = await response.json();
          console.log('Using settings from API');
          
          // Save to localStorage for future use
          try {
            localStorage.setItem('userSettings', JSON.stringify(settings));
          } catch (saveError) {
            console.warn('Failed to save settings to localStorage:', saveError);
          }
          
          return settings;
        }
      } catch (apiError) {
        console.log('Failed to load settings from API:', apiError);
      }
    } else if (global.userSettings) {
      // Server side - use cached settings if available
      return global.userSettings;
    } else {
      // Server side - always use Claude 3.7 Sonnet via Requesty
      return {
        aiProvider: 'requesty',
        aiModel: 'vertex/anthropic/claude-3-7-sonnet-20250219@us-east5',
        documentAiOnly: true,
        enableLogging: true
      };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  
  // Default settings if loading fails
  return {
    aiProvider: 'requesty',
    aiModel: 'vertex/anthropic/claude-3-7-sonnet-20250219@us-east5',
    documentAiOnly: true,
    enableLogging: true
  };
}

export async function queryAI(prompt: string, systemPrompt?: string) {
  // Load user settings
  const settings = await loadUserSettings();
  
  // Handle provider and model from settings - always default to Claude 3.7 Sonnet
  const provider = settings.aiProvider || 'requesty';
  const model = settings.aiModel || 'vertex/anthropic/claude-3-7-sonnet-20250219@us-east5';
  
  console.log(`Using AI provider from settings: ${provider}`);
  console.log(`Using AI model from settings: ${model}`);
  
  // Configure the selected provider and model
  switch (provider) {
    case 'requesty':
      AI_CONFIG.requesty.model = model;
      break;
    case 'openrouter':
      // Configure for OpenRouter
      // Would need to add OpenRouter to AI_CONFIG
      AI_CONFIG.openai.model = model; // Use OpenAI format for now
      break;
    case 'anthropic':
      // Configure for direct Anthropic API
      AI_CONFIG.openai.model = model; // Use OpenAI format for now
      break;
    case 'google':
      // Configure for direct Google API
      AI_CONFIG.gemini.model = model;
      break;
    case 'openai':
      // Configure for direct OpenAI API
      AI_CONFIG.openai.model = model;
      break;
    default:
      // Default to Requesty
      AI_CONFIG.requesty.model = model;
  }
  
  // Use the selected provider without any fallbacks
  console.log(`Using ${provider} provider with model ${model} with NO FALLBACKS`);
  
  switch (provider) {
    case 'requesty':
      console.log(`Using Requesty Router API with model ${AI_CONFIG.requesty.model}`);
      return await queryRequesty(prompt, systemPrompt);
    case 'openrouter':
      console.log(`Using OpenRouter API with model ${model}`);
      // Would need to implement queryOpenRouter function
      return await queryOpenAI(prompt, systemPrompt);
    case 'anthropic':
      console.log(`Using Anthropic API directly with model ${model}`);
      // Would need to implement queryAnthropic function
      return await queryOpenAI(prompt, systemPrompt);
    case 'google':
      console.log(`Using Google AI API directly with model ${model}`);
      return await queryGemini(prompt, systemPrompt);
    case 'openai':
      console.log(`Using OpenAI API directly with model ${model}`);
      return await queryOpenAI(prompt, systemPrompt);
    case 'vertex':
      console.log(`Using Vertex AI with model ${model}`);
      AI_CONFIG.vertex.model = model;
      // For now, we're using Requesty as it can route to Vertex AI
      return await queryRequesty(prompt, systemPrompt);
    default:
      console.log(`Using Requesty Router API (default) with model ${AI_CONFIG.requesty.model}`);
      return await queryRequesty(prompt, systemPrompt);
  }
}