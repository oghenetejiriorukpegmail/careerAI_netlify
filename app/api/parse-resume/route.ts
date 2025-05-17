import { NextRequest, NextResponse } from 'next/server';
import * as pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { extractStructuredResumeData } from '@/lib/documents/document-parser';

/**
 * API route to handle resume parsing directly
 * Simpler path to avoid routing issues
 */
export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'No user ID provided' }, { status: 400 });
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
    console.error('Error parsing resume:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to parse resume' 
    }, { status: 500 });
  }
}