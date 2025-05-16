// AI model configuration
export const AI_CONFIG = {
  // OpenRouter configuration for Qwen model
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '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',
    model: 'qwen/qwen3-30b-a3b:free'
  },
  
  // Gemini configuration (fallback)
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || 'AIzaSyA1UcUNKz2v9mBzKfLay3A3TydQZiziMZ8',
    model: 'gemini-2.5-pro-exp'
  }
};

// Function to make a request to OpenRouter
export async function queryOpenRouter(prompt: string, systemPrompt?: string) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.openRouter.apiKey}`,
        'HTTP-Referer': 'https://careerai.app',
      },
      body: JSON.stringify({
        model: AI_CONFIG.openRouter.model,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt }
        ]
      })
    });

    return await response.json();
  } catch (error) {
    console.error('Error calling OpenRouter:', error);
    throw error;
  }
}

// Function to make a request to Gemini (fallback)
export async function queryGemini(prompt: string) {
  try {
    // Implement Gemini API call here
    // This is placeholder as the actual implementation would depend on the Gemini JS SDK
    console.log('Falling back to Gemini with prompt:', prompt);
    
    // Return placeholder response
    return {
      error: 'Gemini implementation pending',
    };
  } catch (error) {
    console.error('Error calling Gemini:', error);
    throw error;
  }
}

// Function to handle AI requests with fallback
export async function queryAI(prompt: string, systemPrompt?: string) {
  try {
    return await queryOpenRouter(prompt, systemPrompt);
  } catch (error) {
    console.error('OpenRouter failed, falling back to Gemini');
    return await queryGemini(prompt);
  }
}