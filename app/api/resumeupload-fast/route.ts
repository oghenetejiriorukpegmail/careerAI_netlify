import { NextRequest, NextResponse } from 'next/server';

// Fast resume upload that delegates to background function
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    
    if (!file || !userId) {
      return NextResponse.json({
        error: 'File and user ID are required'
      }, { status: 400 });
    }
    
    // Basic validation
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Please upload a PDF or DOCX file.'
      }, { status: 400 });
    }
    
    // Convert file to base64 for background function
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    // Generate a job ID
    const jobId = `resume-${userId}-${Date.now()}`;
    
    // Call background function asynchronously
    const baseUrl = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://eustaceai.netlify.app';
    
    // Fire and forget - don't wait for response
    fetch(`${baseUrl}/.netlify/functions/process-resume-background`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileBuffer: base64,
        mimeType: file.type,
        userId: userId,
        fileName: file.name,
        jobId: jobId
      })
    }).catch(err => {
      console.error('Failed to trigger background processing:', err);
    });
    
    // Return immediately with job ID
    return NextResponse.json({
      success: true,
      message: 'Resume upload started. Processing in background.',
      jobId: jobId,
      fileName: file.name,
      tip: 'Large files may take up to 15 minutes to process. Check back later for results.'
    });
    
  } catch (error) {
    console.error('Error in fast resume upload:', error);
    return NextResponse.json({
      error: 'Failed to start resume processing'
    }, { status: 500 });
  }
}