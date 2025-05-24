import { NextRequest, NextResponse } from 'next/server';

// Quick resume upload that saves extracted text immediately
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    
    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing file or user ID' }, { status: 400 });
    }

    console.log(`[QUICK UPLOAD] Processing resume: ${file.name}`);

    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer();

    // Step 1: Extract text using Google Document AI (fast - usually 3-4 seconds)
    console.log('[GOOGLE DOCUMENT AI] Starting text extraction...');
    const startTime = Date.now();
    
    const extractedText = await processDocumentWithGoogleAI(fileBuffer, file.type);
    
    const extractionTime = Date.now() - startTime;
    console.log(`[GOOGLE DOCUMENT AI] Extraction completed in ${extractionTime}ms`);

    if (!extractedText) {
      return NextResponse.json({ error: 'No text extracted' }, { status: 400 });
    }

    // Step 2: Save immediately with extracted text
    const { getSupabaseAdminClient } = await import('@/lib/supabase/client');
    const supabaseAdmin = getSupabaseAdminClient();
    
    const filePath = `processed_resumes/${userId}/${Date.now()}_${file.name}`;
    
    // Save with basic info and extracted text
    const { data: resume, error: dbError } = await supabaseAdmin
      .from('resumes')
      .insert({
        user_id: userId,
        file_path: filePath,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        extracted_text: extractedText,
        processing_status: 'text_extracted',
        parsed_data: {
          raw_text: extractedText,
          preview: extractedText.substring(0, 500),
          char_count: extractedText.length,
          status: 'pending_ai_parse'
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error('[DATABASE] Save error:', dbError);
      return NextResponse.json({ error: 'Failed to save resume' }, { status: 500 });
    }

    // Step 3: Trigger background AI parsing (non-blocking)
    const baseUrl = process.env.URL || 'https://eustaceai.netlify.app';
    fetch(`${baseUrl}/.netlify/functions/process-resume-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resumeId: resume.id,
        userId: userId,
        extractedText: extractedText,
        action: 'parse_only' // Only do AI parsing, text already extracted
      })
    }).catch(err => console.error('Background parse trigger failed:', err));

    // Return success immediately
    return NextResponse.json({
      success: true,
      message: 'Resume uploaded successfully. AI analysis in progress.',
      resumeId: resume.id,
      extractedText: extractedText.substring(0, 1000),
      tip: 'The full AI analysis will complete in the background. Check back in a moment.',
      processing_status: 'text_extracted'
    });

  } catch (error) {
    console.error('Quick upload error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Upload failed'
    }, { status: 500 });
  }
}

// Google Document AI processing function
async function processDocumentWithGoogleAI(fileBuffer: ArrayBuffer, mimeType: string) {
  try {
    const { DocumentProcessorServiceClient } = await import('@google-cloud/documentai').then(m => m.v1);
    
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
    } else {
      throw new Error('Google Document AI credentials not configured');
    }
    
    const client = new DocumentProcessorServiceClient(clientOptions);
    const projectId = process.env.GOOGLE_PROJECT_ID;
    const processorId = process.env.GOOGLE_PROCESSOR_ID;
    
    const name = `projects/${projectId}/locations/us/processors/${processorId}`;
    
    const request = {
      name,
      rawDocument: {
        content: Buffer.from(fileBuffer).toString('base64'),
        mimeType,
      },
    };

    const [result] = await client.processDocument(request);
    return result.document?.text || '';
    
  } catch (error) {
    console.error('Google Document AI error:', error);
    throw new Error(`Document AI failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}