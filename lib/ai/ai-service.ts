import { createAIProvider, AIProviderType, BaseAIProvider, AIResponse } from './providers';
import { UserSettings } from '@/lib/utils/settings';
import { loadServerSettings } from './settings-loader';

class AIService {
  private provider: BaseAIProvider | null = null;
  private lastSettings: UserSettings | null = null;
  
  private initializeProvider(settings: UserSettings) {
    // Only reinitialize if settings changed
    if (this.lastSettings?.aiProvider === settings.aiProvider && 
        this.lastSettings?.aiModel === settings.aiModel &&
        this.provider) {
      return;
    }
    
    const apiKey = this.getApiKey(settings.aiProvider);
    if (!apiKey) {
      throw new Error(`No API key found for provider: ${settings.aiProvider}`);
    }
    
    this.provider = createAIProvider(settings.aiProvider as AIProviderType, {
      apiKey,
      model: settings.aiModel,
      temperature: 0.7,
      maxTokens: 4000,
    });
    
    this.lastSettings = settings;
  }
  
  private getApiKey(provider: string): string | undefined {
    switch (provider) {
      case 'openai':
        return process.env.OPENAI_API_KEY;
      case 'gemini':
        return process.env.GEMINI_API_KEY;
      case 'openrouter':
        return process.env.OPENROUTER_API_KEY;
      case 'requesty':
        return process.env.REQUESTY_API_KEY;
      default:
        return undefined;
    }
  }
  
  async query(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    const settings = loadServerSettings();
    this.initializeProvider(settings);
    
    if (!this.provider) {
      throw new Error('AI provider not initialized');
    }
    
    try {
      const response = await this.provider.query(prompt, systemPrompt);
      
      // Log token usage if available
      if (response.usage) {
        console.log(`AI Usage - Model: ${response.model}, Tokens: ${response.usage.total_tokens}`);
      }
      
      return response;
    } catch (error) {
      console.error(`AI query error (${settings.aiProvider}):`, error);
      throw error;
    }
  }
  
  async queryJson<T = any>(prompt: string, systemPrompt?: string): Promise<T> {
    const jsonSystemPrompt = `${systemPrompt || ''}\n\nIMPORTANT: Respond ONLY with valid JSON. No explanations, no markdown, just the JSON object.`;
    
    const response = await this.query(prompt, jsonSystemPrompt);
    
    if (!this.provider) {
      throw new Error('AI provider not initialized');
    }
    
    return (this.provider as any).parseJsonResponse(response.content);
  }
  
  async queryWithRetry(prompt: string, systemPrompt?: string, maxRetries = 3): Promise<AIResponse> {
    let lastError: Error | null = null;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.query(prompt, systemPrompt);
      } catch (error) {
        console.error(`AI query attempt ${i + 1} failed:`, error);
        lastError = error as Error;
        
        // Wait before retrying with exponential backoff
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }
    
    throw lastError || new Error('AI query failed after retries');
  }
}

// Export singleton instance
export const aiService = new AIService();

// Helper functions for backward compatibility
export async function queryAI(prompt: string, systemPrompt?: string): Promise<string> {
  const response = await aiService.query(prompt, systemPrompt);
  return response.content;
}

export async function queryAIJson<T = any>(prompt: string, systemPrompt?: string): Promise<T> {
  return aiService.queryJson<T>(prompt, systemPrompt);
}