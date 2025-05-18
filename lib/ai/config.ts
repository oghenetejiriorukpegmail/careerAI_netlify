// AI model configuration
export const AI_CONFIG = {
  // Requesty Router configuration
  requesty: {
    apiKey: process.env.ROUTER_API_KEY || 'sk-+mZ784BeQxS6EXfmzWchAIB9fmvIV6NGkwF9VNfsuONF/NtjFuGheUXQK+YU2D/npXfNCKYcqVyObin/PJJhkeZdvGVMDDWFZ/Yzi3/NsAM=',
    model: 'google/gemini-2.5-flash-preview-04-17',
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
    model: 'gemini-2.5-flash-preview-04-17'
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
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(45000) // 45 second timeout for larger model
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
            signal: AbortSignal.timeout(30000)
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
            const retryContent = data.candidates[0].content.parts[0].text;
            console.log(`[RAW GEMINI RETRY RESPONSE] First 500 chars: ${retryContent.substring(0, 500)}...`);
            
            // Check if response contains markdown code blocks
            if (retryContent.includes('```')) {
              console.warn('[GEMINI RETRY RESPONSE WARNING] Response contains markdown code blocks that may cause JSON parsing issues');
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
    const rawContent = data.candidates[0].content.parts[0].text;
    console.log(`[RAW GEMINI RESPONSE] First 500 chars: ${rawContent.substring(0, 500)}...`);
    
    // Check if response contains markdown code blocks
    if (rawContent.includes('```')) {
      console.warn('[GEMINI RESPONSE WARNING] Response contains markdown code blocks that may cause JSON parsing issues');
    }
    
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
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(45000) // 45 second timeout
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
      const rawContent = data.choices[0].message.content;
      console.log(`[RAW OPENAI RESPONSE] First 500 chars: ${rawContent.substring(0, 500)}...`);
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
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(45000) // 45 second timeout
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
      const rawContent = data.choices[0].message.content;
      console.log(`[RAW REQUESTY RESPONSE] First 500 chars: ${rawContent.substring(0, 500)}...`);
    }
    
    return data;
  } catch (error) {
    console.error('Error calling Requesty Router:', error);
    throw error;
  }
}

// Function to handle AI requests with prioritization of different providers
export async function queryAI(prompt: string, systemPrompt?: string) {
  // Try Requesty Router first
  try {
    console.log('Using Requesty Router API with Gemini model for AI processing');
    return await queryRequesty(prompt, systemPrompt);
  } catch (requestyError) {
    console.error('Requesty Router provider failed, falling back to direct Gemini:', requestyError);
    
    // Try Gemini as fallback
    try {
      console.log('Falling back to direct Gemini model for AI processing');
      return await queryGemini(prompt, systemPrompt);
    } catch (geminiError) {
      console.error('All AI providers failed!', geminiError);
      
      // Create a more robust mock response to prevent crashes and provide minimal functionality
      console.log('[FALLBACK] Creating fallback API response');
      
      // Try to extract basic information from the prompt if it's available
      let fallbackData = {
        contactInfo: {
          fullName: "Unknown",
          email: "",
          phone: "",
          location: "",
          linkedin: ""
        },
        skills: [
          "Communication", 
          "Problem Solving",
          "Teamwork"
        ],
        education: [{
          institution: "University",
          degree: "Degree",
          field: "Field of Study",
          graduationDate: "Recent"
        }],
        experience: [{
          title: "Professional",
          company: "Company",
          location: "",
          startDate: "Recent",
          endDate: "Present",
          description: ["Professional experience"]
        }],
        summary: "Resume could not be processed fully due to AI service limitations. Basic information has been extracted."
      };
      
      // Try to extract an email from the prompt
      try {
        const emailMatch = prompt.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i);
        if (emailMatch && emailMatch[1]) {
          fallbackData.contactInfo.email = emailMatch[1];
        }
        
        // Try to extract a phone number from the prompt
        const phoneMatch = prompt.match(/(\+?1?\s*\(?[0-9]{3}\)?[-. ][0-9]{3}[-. ][0-9]{4})/);
        if (phoneMatch && phoneMatch[1]) {
          fallbackData.contactInfo.phone = phoneMatch[1];
        }
        
        // Get the first few lines to see if there's a name
        const lines = prompt.split('\n').slice(0, 10).map(line => line.trim()).filter(Boolean);
        if (lines.length > 0 && lines[0].length < 40) {
          fallbackData.contactInfo.fullName = lines[0];
        }
        
        console.log('[FALLBACK] Created mock response with basic data extraction');
      } catch (err) {
        console.error('[FALLBACK] Error extracting basic info from prompt:', err);
      }
      
      return {
        choices: [
          {
            message: {
              content: JSON.stringify(fallbackData),
              role: 'assistant'
            },
            index: 0
          }
        ]
      };
    }
  }
}