import { NextRequest, NextResponse } from 'next/server';

// API route to trigger background resume processing
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    
    if (!file || !userId) {
      return NextResponse.json({
        error: 'Missing file or user ID'
      }, { status: 400 });
    }
    
    // Convert file to base64 for background function
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    // Call the background function
    const backgroundFunctionUrl = `${process.env.URL || 'https://eustaceai.netlify.app'}/.netlify/functions/process-resume-background`;
    
    const response = await fetch(backgroundFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileBuffer: base64,
        mimeType: file.type,
        userId: userId,
        fileName: file.name
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Background processing failed');
    }
    
    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Resume processing started',
      jobId: result.jobId || 'async-processing',
      tip: 'For large files, processing may take up to 15 minutes'
    });
    
  } catch (error) {
    console.error('Error triggering background processing:', error);
    return NextResponse.json({
      error: `Failed to start processing: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}