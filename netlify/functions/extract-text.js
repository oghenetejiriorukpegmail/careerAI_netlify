// Function 1: Extract text from document using Google Document AI
exports.handler = async (event, context) => {
  console.log('[EXTRACT-TEXT FUNCTION] Starting document text extraction');
  console.log('[EXTRACT-TEXT FUNCTION] Method:', event.httpMethod);
  
  try {
    // Only accept POST requests
    if (event.httpMethod !== 'POST') {
      console.log('[EXTRACT-TEXT FUNCTION] Invalid method:', event.httpMethod);
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { fileContent, mimeType, fileName } = body;

    if (!fileContent || !mimeType) {
      console.log('[EXTRACT-TEXT FUNCTION] Missing required fields');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing fileContent or mimeType' })
      };
    }

    console.log(`[EXTRACT-TEXT FUNCTION] Processing file: ${fileName || 'unnamed'}, type: ${mimeType}`);
    
    // Import Google Document AI
    const { DocumentProcessorServiceClient } = await import('@google-cloud/documentai').then(m => m.v1);
    
    // Parse credentials
    let clientOptions = {};
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
        console.log('[EXTRACT-TEXT FUNCTION] Using parsed JSON credentials');
        clientOptions = {
          credentials: creds,
          projectId: creds.project_id || process.env.GOOGLE_PROJECT_ID
        };
      } catch (e) {
        console.log('[EXTRACT-TEXT FUNCTION] Using file path credentials');
        clientOptions = {
          keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
          projectId: process.env.GOOGLE_PROJECT_ID
        };
      }
    } else {
      console.error('[EXTRACT-TEXT FUNCTION] No Google credentials found');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Google Document AI not configured' })
      };
    }

    // Initialize client
    const client = new DocumentProcessorServiceClient(clientOptions);
    const projectId = process.env.GOOGLE_PROJECT_ID;
    const processorId = process.env.GOOGLE_PROCESSOR_ID;
    
    if (!projectId || !processorId) {
      console.error('[EXTRACT-TEXT FUNCTION] Missing project ID or processor ID');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Google Document AI configuration incomplete' })
      };
    }

    const name = `projects/${projectId}/locations/us/processors/${processorId}`;
    
    console.log('[EXTRACT-TEXT FUNCTION] Calling Google Document AI...');
    const startTime = Date.now();
    
    // Process document
    const request = {
      name,
      rawDocument: {
        content: fileContent, // Should already be base64
        mimeType,
      },
    };

    const [result] = await client.processDocument(request);
    const extractedText = result.document?.text || '';
    
    const processingTime = Date.now() - startTime;
    console.log(`[EXTRACT-TEXT FUNCTION] Extraction completed in ${processingTime}ms`);
    console.log(`[EXTRACT-TEXT FUNCTION] Extracted ${extractedText.length} characters`);

    // Return extracted text
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        extractedText,
        characterCount: extractedText.length,
        processingTime,
        preview: extractedText.substring(0, 200) + '...'
      })
    };

  } catch (error) {
    console.error('[EXTRACT-TEXT FUNCTION] Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Text extraction failed',
        details: error.message || 'Unknown error'
      })
    };
  }
};