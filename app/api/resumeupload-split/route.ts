import { NextRequest, NextResponse } from 'next/server';

// Helper to get the site URL
function getSiteUrl(request: NextRequest): string {
  // Try various headers that might contain the URL
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host');
  
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  
  if (host) {
    // Check if it's localhost
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      return `http://${host}`;
    }
    return `https://${host}`;
  }
  
  // Fallback to environment variable or default
  return process.env.URL || process.env.DEPLOY_URL || 'https://eustaceai.netlify.app';
}

// Split resume upload that calls Netlify Functions sequentially
export async function POST(request: NextRequest) {
  console.log('[RESUMEUPLOAD-SPLIT] Starting split resume upload process');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    
    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing file or user ID' }, { status: 400 });
    }

    console.log(`[RESUMEUPLOAD-SPLIT] File: ${file.name}, Size: ${file.size}, Type: ${file.type}`);
    
    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    // Get the correct base URL
    const baseUrl = getSiteUrl(request);
    console.log(`[RESUMEUPLOAD-SPLIT] Using base URL: ${baseUrl}`);
    
    // Step 1: Extract text using Document AI
    console.log('[RESUMEUPLOAD-SPLIT] Step 1: Calling extract-text function...');
    const extractStartTime = Date.now();
    
    const extractUrl = `${baseUrl}/.netlify/functions/extract-text`;
    console.log(`[RESUMEUPLOAD-SPLIT] Calling: ${extractUrl}`);
    
    const extractResponse = await fetch(extractUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileContent: base64,
        mimeType: file.type,
        fileName: file.name
      })
    });
    
    console.log(`[RESUMEUPLOAD-SPLIT] Extract response status: ${extractResponse.status}`);
    
    if (!extractResponse.ok) {
      let errorDetails;
      const contentType = extractResponse.headers.get('content-type');
      
      try {
        if (contentType && contentType.includes('application/json')) {
          errorDetails = await extractResponse.json();
        } else {
          const text = await extractResponse.text();
          errorDetails = { 
            message: text.substring(0, 500),
            contentType,
            status: extractResponse.status
          };
        }
      } catch (e) {
        errorDetails = { 
          message: 'Failed to parse error response',
          status: extractResponse.status 
        };
      }
      
      console.error('[RESUMEUPLOAD-SPLIT] Extract text failed:', errorDetails);
      return NextResponse.json({ 
        error: 'Text extraction failed', 
        details: errorDetails,
        functionUrl: extractUrl
      }, { status: 500 });
    }
    
    const extractResult = await extractResponse.json();
    const extractTime = Date.now() - extractStartTime;
    console.log(`[RESUMEUPLOAD-SPLIT] Text extracted in ${extractTime}ms, ${extractResult.characterCount} chars`);
    
    // Step 2: Parse with AI (optional - can timeout)
    console.log('[RESUMEUPLOAD-SPLIT] Step 2: Calling parse-resume-ai function...');
    const parseStartTime = Date.now();
    let parsedData = null;
    let aiSuccess = false;
    
    try {
      const parseUrl = `${baseUrl}/.netlify/functions/parse-resume-ai`;
      console.log(`[RESUMEUPLOAD-SPLIT] Calling: ${parseUrl}`);
      
      const parseResponse = await fetch(parseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractedText: extractResult.extractedText,
          userId: userId
        })
      });
      
      if (parseResponse.ok) {
        const parseResult = await parseResponse.json();
        if (parseResult.success && !parseResult.timeout) {
          parsedData = parseResult.parsedData;
          aiSuccess = true;
          const parseTime = Date.now() - parseStartTime;
          console.log(`[RESUMEUPLOAD-SPLIT] AI parsing completed in ${parseTime}ms`);
        } else {
          console.log('[RESUMEUPLOAD-SPLIT] AI parsing timed out or failed');
        }
      }
    } catch (parseError) {
      console.error('[RESUMEUPLOAD-SPLIT] AI parsing error:', parseError);
      // Continue without AI parsing
    }
    
    // Step 3: Save to database
    console.log('[RESUMEUPLOAD-SPLIT] Step 3: Calling save-resume function...');
    const saveStartTime = Date.now();
    
    const saveUrl = `${baseUrl}/.netlify/functions/save-resume`;
    console.log(`[RESUMEUPLOAD-SPLIT] Calling: ${saveUrl}`);
    
    const saveResponse = await fetch(saveUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        extractedText: extractResult.extractedText,
        parsedData: parsedData
      })
    });
    
    if (!saveResponse.ok) {
      const error = await saveResponse.json();
      console.error('[RESUMEUPLOAD-SPLIT] Save failed:', error);
      return NextResponse.json({ 
        error: 'Failed to save resume', 
        details: error 
      }, { status: 500 });
    }
    
    const saveResult = await saveResponse.json();
    const saveTime = Date.now() - saveStartTime;
    console.log(`[RESUMEUPLOAD-SPLIT] Resume saved in ${saveTime}ms`);
    
    // Return combined result
    const totalTime = Date.now() - extractStartTime;
    console.log(`[RESUMEUPLOAD-SPLIT] Total processing time: ${totalTime}ms`);
    
    return NextResponse.json({
      success: true,
      message: aiSuccess ? 
        'Resume processed and saved successfully' : 
        'Resume uploaded successfully (AI analysis pending)',
      resumeId: saveResult.resumeId,
      uploadSuccess: true,
      parseSuccess: true,
      aiSuccess: aiSuccess,
      dbSuccess: true,
      extractedText: extractResult.extractedText.substring(0, 1000) + '...',
      structuredData: parsedData || { 
        summary: extractResult.extractedText.substring(0, 500),
        status: 'text_only' 
      },
      timing: {
        extraction: extractTime,
        aiParsing: Date.now() - parseStartTime,
        saving: saveTime,
        total: totalTime
      }
    });

  } catch (error) {
    console.error('[RESUMEUPLOAD-SPLIT] Error:', error);
    return NextResponse.json({
      error: 'Resume upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}