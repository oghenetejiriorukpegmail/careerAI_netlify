// AI model configuration
export const AI_CONFIG = {
  // OpenRouter configuration for Qwen model
  openRouter: {
    // Use Qwen model as specified
    apiKey: process.env.OPENROUTER_API_KEY || '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',
    model: 'qwen/qwen3-235b-a22b:free' // Use the Qwen model as requested
  },
  
  // Gemini configuration (fallback)
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || 'AIzaSyA1UcUNKz2v9mBzKfLay3A3TydQZiziMZ8',
    model: 'gemini-1.5-pro' // Updated to available model
  }
};

// Function to make a request to OpenRouter
export async function queryOpenRouter(prompt: string, systemPrompt?: string) {
  try {
    console.log(`Calling OpenRouter API with key: ${AI_CONFIG.openRouter.apiKey.substring(0, 10)}...`);
    
    // Get the API key and ensure it's properly formatted
    const apiKey = AI_CONFIG.openRouter.apiKey.trim();
    
    // Log headers for debugging (only API key prefix)
    console.log('Using headers:', {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.substring(0, 10)}...`, // Only show prefix for security
      'HTTP-Referer': 'https://careerai.app',
    });
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://careerai.app',
      },
      body: JSON.stringify({
        model: AI_CONFIG.openRouter.model,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        max_tokens: 4000,
        temperature: 0.2
      })
    });

    // Check for HTTP errors
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenRouter API error:', errorData);
      throw new Error(`OpenRouter API error: ${JSON.stringify(errorData)}`);
    }

    // Parse the successful response
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling OpenRouter:', error);
    throw error;
  }
}

// Function to make a request to Gemini (fallback)
export async function queryGemini(prompt: string, systemPrompt?: string) {
  try {
    console.log(`Calling Gemini API with key: ${AI_CONFIG.gemini.apiKey.substring(0, 10)}...`);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${AI_CONFIG.gemini.model}:generateContent`, {
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
              { text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192,
        }
      })
    });

    // Check for HTTP errors
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      throw new Error(`Gemini API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    // Make sure the response has the expected format
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      console.error('Unexpected Gemini response format:', data);
      throw new Error('Gemini API returned unexpected response format');
    }
    
    // Transform Gemini response to match OpenRouter format
    return {
      choices: [
        {
          message: {
            content: data.candidates[0].content.parts[0].text,
            role: 'assistant'
          },
          index: 0
        }
      ]
    };
  } catch (error) {
    console.error('Error calling Gemini:', error);
    throw error;
  }
}

// Function to handle AI requests with fallback
export async function queryAI(prompt: string, systemPrompt?: string) {
  try {
    // Try OpenRouter first
    try {
      return await queryOpenRouter(prompt, systemPrompt);
    } catch (openRouterError) {
      console.error('OpenRouter failed, falling back to Gemini:', openRouterError.message);
      
      // Fall back to Gemini
      return await queryGemini(prompt, systemPrompt);
    }
  } catch (error) {
    console.error('All AI providers failed!', error);
    
    // Create a minimal mock response to prevent crashes
    return {
      choices: [
        {
          message: {
            content: JSON.stringify({
              contactInfo: {},
              skills: [],
              education: [],
              experience: [],
              summary: "Unable to process resume due to AI service unavailability."
            }),
            role: 'assistant'
          },
          index: 0
        }
      ]
    };
  }
}