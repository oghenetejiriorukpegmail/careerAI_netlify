import type { Config, Context } from "@netlify/functions";

// Background function for AI document generation - can run up to 15 minutes
export default async (req: Request, context: Context) => {
  console.log("Background document generation started");
  
  try {
    const body = await req.json();
    const { type, userId, resumeData, jobDescription, tone, length } = body;
    
    if (!type || !userId || !resumeData) {
      return new Response(JSON.stringify({ 
        error: 'Missing required parameters' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let result;
    
    switch (type) {
      case 'resume':
        result = await generateResume(resumeData, jobDescription, tone, length);
        break;
      case 'cover-letter':
        result = await generateCoverLetter(resumeData, jobDescription, tone, length);
        break;
      default:
        throw new Error(`Unknown document type: ${type}`);
    }
    
    // Save generation record
    await saveGenerationRecord(userId, type, result);
    
    return new Response(JSON.stringify({
      success: true,
      type,
      content: result.content,
      sections: result.sections,
      metadata: result.metadata
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Document generation error:', error);
    return new Response(JSON.stringify({
      error: `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

async function generateResume(resumeData: any, jobDescription?: string, tone?: string, length?: string) {
  const { queryAI } = await import('../../lib/ai/config');
  const { loadServerSettings } = await import('../../lib/ai/settings-loader');
  
  const settings = loadServerSettings();
  console.log(`Generating resume with ${settings.aiProvider} - ${settings.aiModel}`);
  
  const systemPrompt = `You are an expert resume writer. Create a professional, ATS-optimized resume based on the provided information.
  ${jobDescription ? `Tailor the resume for this job: ${jobDescription}` : ''}
  Tone: ${tone || 'professional'}
  Length: ${length || 'standard'}
  
  Return the resume in structured JSON format with sections.`;
  
  const userPrompt = `Create a resume for: ${JSON.stringify(resumeData)}`;
  
  const response = await queryAI(userPrompt, systemPrompt);
  const content = response.choices[0]?.message?.content;
  
  return {
    content,
    sections: parseResumeSections(content),
    metadata: {
      generatedAt: new Date().toISOString(),
      aiProvider: settings.aiProvider,
      aiModel: settings.aiModel
    }
  };
}

async function generateCoverLetter(resumeData: any, jobDescription: string, tone?: string, length?: string) {
  const { queryAI } = await import('../../lib/ai/config');
  const { loadServerSettings } = await import('../../lib/ai/settings-loader');
  
  const settings = loadServerSettings();
  console.log(`Generating cover letter with ${settings.aiProvider} - ${settings.aiModel}`);
  
  const systemPrompt = `You are an expert cover letter writer. Create a compelling cover letter that highlights relevant experience.
  Job Description: ${jobDescription}
  Tone: ${tone || 'professional'}
  Length: ${length || 'standard'}
  
  Structure the cover letter with clear paragraphs.`;
  
  const userPrompt = `Write a cover letter for this candidate: ${JSON.stringify(resumeData)}`;
  
  const response = await queryAI(userPrompt, systemPrompt);
  const content = response.choices[0]?.message?.content;
  
  return {
    content,
    sections: parseCoverLetterSections(content),
    metadata: {
      generatedAt: new Date().toISOString(),
      aiProvider: settings.aiProvider,
      aiModel: settings.aiModel
    }
  };
}

function parseResumeSections(content: string) {
  // Parse resume into structured sections
  const sections = {
    header: '',
    summary: '',
    experience: [],
    education: [],
    skills: [],
    additional: []
  };
  
  // Implementation would parse the content into sections
  return sections;
}

function parseCoverLetterSections(content: string) {
  // Parse cover letter into paragraphs
  const sections = {
    greeting: '',
    opening: '',
    body: [],
    closing: '',
    signature: ''
  };
  
  // Implementation would parse the content into sections
  return sections;
}

async function saveGenerationRecord(userId: string, type: string, result: any) {
  const { getSupabaseAdminClient } = await import('../../lib/supabase/client');
  const supabaseAdmin = getSupabaseAdminClient();
  
  const { error } = await supabaseAdmin
    .from('document_generations')
    .insert({
      user_id: userId,
      document_type: type,
      content: result.content,
      metadata: result.metadata,
      created_at: new Date().toISOString()
    });
    
  if (error) {
    console.error('Failed to save generation record:', error);
  }
}

export const config: Config = {
  type: "background",
  timeout: 900 // 15 minutes
};