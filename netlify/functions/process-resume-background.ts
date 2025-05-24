import type { Config, Context } from "@netlify/functions";

// Background function for resume processing - can run up to 15 minutes
export default async (req: Request, context: Context) => {
  console.log("Background resume processing started");
  
  try {
    const body = await req.json();
    const { fileBuffer, mimeType, userId, fileName } = body;
    
    if (!fileBuffer || !mimeType || !userId) {
      return new Response(JSON.stringify({ 
        error: 'Missing required parameters' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Process with Google Document AI
    const extractedText = await processDocumentWithGoogleAI(
      Buffer.from(fileBuffer, 'base64'), 
      mimeType
    );
    
    // Parse with AI (this can take several minutes)
    const structuredData = await parseResumeWithAI(extractedText);
    
    // Save to database
    await saveToDatabase(userId, fileName, mimeType, extractedText, structuredData);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Resume processed successfully',
      data: structuredData
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Background processing error:', error);
    return new Response(JSON.stringify({
      error: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

async function processDocumentWithGoogleAI(fileBuffer: Buffer, mimeType: string) {
  // Dynamic import to avoid bundling issues
  const { DocumentProcessorServiceClient } = await import('@google-cloud/documentai').then(m => m.v1);
  
  // Parse credentials from environment variable
  let clientOptions: any = {};
  
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      clientOptions = {
        credentials: creds,
        projectId: creds.project_id || process.env.GOOGLE_PROJECT_ID
      };
    } catch (e) {
      clientOptions = {
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        projectId: process.env.GOOGLE_PROJECT_ID
      };
    }
  }
  
  const client = new DocumentProcessorServiceClient(clientOptions);
  const projectId = process.env.GOOGLE_PROJECT_ID;
  const processorId = process.env.GOOGLE_PROCESSOR_ID;
  
  const name = `projects/${projectId}/locations/us/processors/${processorId}`;
  
  const request = {
    name,
    rawDocument: {
      content: fileBuffer.toString('base64'),
      mimeType,
    },
  };
  
  const [result] = await client.processDocument(request);
  return result.document?.text || '';
}

async function parseResumeWithAI(text: string) {
  // Import dynamically to avoid bundling issues
  const { queryAI } = await import('../../lib/ai/config');
  const { loadServerSettings } = await import('../../lib/ai/settings-loader');
  
  const settings = loadServerSettings();
  
  const systemPrompt = `You are a resume parsing expert. Extract ALL structured information from the resume text and return it as JSON...`;
  const userPrompt = `Parse this resume text:\n\n${text}`;
  
  const response = await queryAI(userPrompt, systemPrompt);
  const parsedContent = response.choices[0]?.message?.content;
  
  return JSON.parse(parsedContent);
}

async function saveToDatabase(userId: string, fileName: string, fileType: string, extractedText: string, structuredData: any) {
  const { getSupabaseAdminClient } = await import('../../lib/supabase/client');
  const supabaseAdmin = getSupabaseAdminClient();
  
  const filePath = `processed_resumes/${userId}/${Date.now()}_${fileName}`;
  
  const { data, error } = await supabaseAdmin
    .from('resumes')
    .insert({
      user_id: userId,
      file_path: filePath,
      file_name: fileName,
      file_type: fileType,
      extracted_text: extractedText,
      parsed_data: structuredData,
      processing_status: 'completed'
    })
    .select()
    .single();
    
  if (error) {
    throw new Error(`Database save failed: ${error.message}`);
  }
  
  return data;
}

export const config: Config = {
  type: "background",
  timeout: 900 // 15 minutes in seconds
};