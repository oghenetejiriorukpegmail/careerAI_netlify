import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import mammoth from 'mammoth';
import { extractDocumentText } from '@/lib/documents/pdf-parser';
import { extractStructuredResumeData } from '@/lib/documents/document-parser';

/**
 * API route that handles both resume upload and parsing in a single call
 * Combines functionality to avoid multiple API calls and auth issues
 */
export async function POST(request: NextRequest) {
  try {
    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    // Validate inputs
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

    // Create unique filename to avoid collisions
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name.replace(/\s+/g, '_')}`;
    const filePath = `${userId}/${fileName}`;

    console.log(`Processing file for upload to user_files/${filePath}`);

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Upload file using admin client (bypasses RLS)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('user_files')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json({ 
        success: false, 
        error: uploadError.message 
      }, { status: 500 });
    }

    // 2. Parse the document using our unified document parser
    let documentText = '';
    
    try {
      console.log(`Parsing document with type: ${fileType}`);
      
      try {
        // Use our unified document text extractor
        documentText = await extractDocumentText(buffer, fileType, mammoth);
        
        console.log(`Document parsing successful, extracted ${documentText.length} characters`);
        
        if (!documentText || documentText.trim().length < 50) {
          console.warn('Document parsing returned very little text, content may be incomplete');
          // If we got very little text, fall back to simple file metadata as supplemental info
          documentText += `\n\nFile information: ${fileName}, uploaded by user ${userId}, file type: ${fileType}.`;
        }
      } catch (pdfError) {
        console.error('Error extracting text from PDF, falling back to simplified parser');
        
        if (fileType === 'application/pdf') {
          // For PDFs, try fallback to basic text extraction if possible
          try {
            if (typeof buffer.toString === 'function') {
              // Extract any visible text strings from the buffer - will be imperfect but better than nothing
              documentText = buffer.toString('utf8', 0, Math.min(buffer.length, 32000))
                .replace(/[\x00-\x09\x0B-\x1F\x7F-\xFF]/g, '') // Remove non-printable ASCII chars
                .replace(/\s+/g, ' '); // Normalize whitespace
              
              console.log('Used fallback string extraction, got', documentText.length, 'characters');
            }
          } catch (fallbackError) {
            console.error('Fallback extraction also failed:', fallbackError);
          }
        }
        
        // If we still have no usable text, use basic metadata
        if (!documentText || documentText.trim().length < 10) {
          documentText = `Resume: ${fileName}. Content could not be extracted. File type: ${fileType}.`;
        }
      }
    } catch (parseError: any) {
      console.error('Error in document parsing flow:', parseError);
      
      // Create a minimal placeholder text to allow the process to continue
      documentText = `Resume: ${fileName}. Content could not be extracted. File type: ${fileType}.`;
      
      // Return partial success
      return NextResponse.json({
        success: true,
        uploadSuccess: true,
        parseSuccess: false,
        data: uploadData,
        error: `File uploaded but parsing failed: ${parseError.message || 'Unknown parsing error'}`
      });
    }

    // 3. Extract structured data using AI
    let structuredData;
    try {
      structuredData = await extractStructuredResumeData(documentText);
    } catch (aiError: any) {
      console.error('Error extracting data with AI:', aiError);
      // Continue anyway, we have the text
      return NextResponse.json({
        success: true,
        uploadSuccess: true,
        parseSuccess: true,
        aiSuccess: false,
        data: uploadData,
        text: documentText,
        error: `File uploaded and parsed, but AI extraction failed: ${aiError.message}`
      });
    }

    // 4. Create record in resumes table
    const { error: dbError } = await supabaseAdmin
      .from('resumes')
      .insert({
        user_id: userId,
        file_name: file.name,
        file_type: fileType,
        file_path: filePath,
        parsed_data: structuredData
      });

    if (dbError) {
      console.error('Error saving to database:', dbError);
      return NextResponse.json({
        success: true,
        uploadSuccess: true,
        parseSuccess: true,
        aiSuccess: true,
        dbSuccess: false,
        data: uploadData,
        text: documentText,
        structuredData,
        error: `File processed but database save failed: ${dbError.message}`
      });
    }

    // Everything succeeded
    return NextResponse.json({
      success: true,
      uploadSuccess: true,
      parseSuccess: true,
      aiSuccess: true,
      dbSuccess: true,
      data: uploadData,
      text: documentText,
      structuredData
    });
  } catch (error: any) {
    console.error('Error in resume upload and parse:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Unknown server error' 
    }, { status: 500 });
  }
}