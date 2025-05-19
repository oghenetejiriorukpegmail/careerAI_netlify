import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { extractStructuredResumeData } from '@/lib/documents/document-parser';
import { extractDocumentText } from '@/lib/documents/pdf-extractor';
import { logResumeProcessing } from '@/lib/utils/logging';
import { processResumeBySection } from '@/lib/documents/advanced-document-parser';

/**
 * API route to handle document parsing and extraction
 * Uses Google Document AI for enhanced PDF parsing
 * This is a direct approach that doesn't require authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    const useAdvancedParser = formData.get('useAdvancedParser') === 'true';
    
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
    
    // Parse the document with enhanced Document AI approach
    console.log(`Processing ${fileType} document via direct API, size: ${buffer.length} bytes`);
    
    // Use our multi-layered document extraction approach
    const resumeId = `direct_${userId}_${Date.now()}`;
    const documentText = await extractDocumentText(buffer, fileType, {
      resumeId,
      debug: true,
      mammoth: mammoth
    });
    
    // Log success
    console.log(`Successfully extracted ${documentText.length} characters via direct API`);
    
    // Determine which parser to use based on document size and user preference
    let structuredData;
    let parsingMethod;
    
    // For large documents or when explicitly requested, use the advanced section-based parser
    if (useAdvancedParser || documentText.length > 15000) {
      console.log(`Using advanced section-based parser for document with ${documentText.length} characters`);
      parsingMethod = 'advanced';
      structuredData = await processResumeBySection(documentText, true);
    } else {
      console.log(`Using standard parser for document with ${documentText.length} characters`);
      parsingMethod = 'standard';
      structuredData = await extractStructuredResumeData(documentText);
    }
    
    // Log the entire resume processing pipeline to help with debugging and analysis
    logResumeProcessing(resumeId, {
      documentAiText: documentText,
      structuredData: structuredData,
      parsingMethod: parsingMethod
    });
    
    return NextResponse.json({
      success: true,
      text: documentText,
      structuredData,
      parsingMethod,
      textLength: documentText.length
    });
  } catch (error: any) {
    console.error('Error parsing document:', error);
    
    // Log error for debugging
    try {
      const resumeId = `direct_error_${Date.now()}`;
      logResumeProcessing(resumeId, {
        error: error instanceof Error ? error : new Error(error.message || 'Unknown error')
      });
    } catch (logError) {
      console.error('Error logging document parsing error:', logError);
    }
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to parse document' 
    }, { status: 500 });
  }
}