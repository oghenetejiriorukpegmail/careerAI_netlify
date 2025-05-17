import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import * as pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { extractStructuredResumeData } from '@/lib/documents/document-parser';

/**
 * API route to handle document parsing and extraction
 * This moves the Node.js PDF parsing logic to the server
 */
export async function POST(request: NextRequest) {
  try {
    // Get current user session from cookies
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Authentication required', details: sessionError?.message }, { status: 401 });
    }
    
    // Get the form data from the request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Get the file type
    const fileType = file.type;
    
    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(fileType)) {
      return NextResponse.json({ error: 'Invalid file type. Please upload a PDF or DOCX file' }, { status: 400 });
    }
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Parse the document based on file type
    let documentText = '';
    
    if (fileType === 'application/pdf') {
      const pdfData = await pdf(buffer);
      documentText = pdfData.text;
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const docxResult = await mammoth.extractRawText({ buffer });
      documentText = docxResult.value;
    }
    
    // Extract structured data from the document text using AI
    const structuredData = await extractStructuredResumeData(documentText);
    
    return NextResponse.json({
      success: true,
      text: documentText,
      structuredData
    });
  } catch (error: any) {
    console.error('Error parsing document:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to parse document' 
    }, { status: 500 });
  }
}