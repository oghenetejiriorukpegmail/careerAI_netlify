/**
 * PDF parsing utility using Mozilla's PDF.js
 * This provides a more reliable PDF parsing solution that works in both Node.js and browser environments
 */

// Import the appropriate libraries depending on environment
import { TextItem } from 'pdfjs-dist/types/src/display/api';

// We'll use a dual approach - try to use PDF.js if available,
// but always have a fallback for direct text extraction
let pdfjsLib: any;

// Configure PDF.js only if we're in a browser environment
// For server-side, we'll use the direct extraction method instead
if (typeof window !== 'undefined') {
  try {
    // Try to import PDF.js for browser environments
    pdfjsLib = require('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  } catch (error) {
    console.warn('PDF.js not available, will use fallback extraction');
    pdfjsLib = null;
  }
}

/**
 * Parse PDF document and extract text content
 * @param buffer PDF file as Buffer
 * @returns Extracted text content
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    console.log(`Parsing PDF, buffer size: ${buffer.length}`);
    
    // First attempt: Use direct string extraction (simpler but less accurate)
    let extractedText = '';
    
    try {
      // Basic extraction: convert buffer to string and clean it up
      extractedText = buffer.toString('utf8', 0, Math.min(buffer.length, 100000))
        .replace(/[\x00-\x09\x0B-\x1F\x7F-\xFF]/g, '') // Remove non-printable chars
        .replace(/\s+/g, ' '); // Normalize whitespace
      
      console.log(`Direct extraction complete: got ${extractedText.length} characters`);
    } catch (directError) {
      console.error('Error in direct extraction:', directError);
    }
    
    // Second attempt: Use PDF.js in browser environments
    if (typeof window !== 'undefined' && pdfjsLib) {
      try {
        console.log('Attempting PDF.js parsing in browser');
        
        // Convert Buffer to Uint8Array for PDF.js compatibility
        const uint8Array = new Uint8Array(buffer);
        
        // Load the PDF document
        const loadingTask = pdfjsLib.getDocument({
          data: uint8Array,
          disableWorker: false, // Use worker in browser
        });
        
        const pdf = await loadingTask.promise;
        console.log(`PDF loaded successfully: ${pdf.numPages} pages`);
        
        let pdfJsText = '';
        
        // Process each page
        try {
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // Extract text items and join them
            const pageText = textContent.items
              .map((item: any) => ('str' in item) ? item.str : '')
              .join(' ');
            
            pdfJsText += pageText + '\n\n';
            
            // Clean up page resources
            page.cleanup();
          }
        } finally {
          // Ensure we always clean up the PDF document to prevent memory leaks
          pdf.destroy();
        }
        
        console.log(`PDF.js parsing complete: extracted ${pdfJsText.length} characters`);
        
        // Use the PDF.js result if it's more substantial than the direct extraction
        if (pdfJsText.length > extractedText.length * 0.5) {
          return pdfJsText;
        }
      } catch (pdfJsError) {
        console.error('Error parsing with PDF.js:', pdfJsError);
        // Continue with direct extraction result
      }
    }
    
    // Return whatever we managed to extract
    return extractedText;
  } catch (error) {
    console.error('Error in PDF parsing:', error);
    
    // Last resort: just return a simple extraction or empty string
    try {
      return buffer.toString('utf8', 0, 10000)
        .replace(/[\x00-\x09\x0B-\x1F\x7F-\xFF]/g, '')
        .replace(/\s+/g, ' ')
        .substring(0, 5000);
    } catch (e) {
      return '';
    }
  }
}

/**
 * Extract text from a document (PDF or DOCX)
 * @param buffer Document file as Buffer
 * @param mimeType MIME type of the document
 * @param mammoth Mammoth library for DOCX parsing (passed as argument to avoid import issues)
 * @returns Extracted text content
 */
export async function extractDocumentText(
  buffer: Buffer, 
  mimeType: string,
  mammoth: any
): Promise<string> {
  try {
    if (mimeType === 'application/pdf') {
      // Handle PDF parsing using PDF.js
      try {
        console.log('Attempting to parse PDF with PDF.js...');
        return await parsePdf(buffer);
      } catch (pdfError) {
        console.error('Primary PDF parser failed:', pdfError);
        
        // Advanced error handling - attempt alternate extraction if possible
        if (buffer && buffer.length > 0) {
          // Attempt a crude backup extraction - just pull strings from the binary data
          // This is not ideal but better than nothing for simple text-based PDFs
          const extracted = buffer.toString('utf8', 0, Math.min(buffer.length, 32000))
            .replace(/[\x00-\x09\x0B-\x1F\x7F-\xFF]/g, '') // Remove non-printable chars
            .replace(/\s+/g, ' '); // Normalize whitespace
            
          if (extracted && extracted.length > 50) {
            console.log('Used fallback string extraction for PDF');
            return extracted;
          }
        }
        
        // If we reach here, both parsers failed - rethrow the original error
        throw pdfError;
      }
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // Handle DOCX parsing with mammoth
      try {
        console.log('Parsing DOCX with mammoth...');
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      } catch (docxError) {
        console.error('DOCX parsing failed:', docxError);
        throw docxError;
      }
    } else {
      throw new Error(`Unsupported document type: ${mimeType}`);
    }
  } catch (error) {
    console.error(`Error extracting text from ${mimeType} document:`, error);
    throw error;
  }
}