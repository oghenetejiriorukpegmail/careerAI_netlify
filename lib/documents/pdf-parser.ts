/**
 * PDF parsing utility using Mozilla's PDF.js
 * This provides a more reliable PDF parsing solution that works in both Node.js and browser environments
 */

import * as pdfjsLib from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';

// Configure PDF.js without external workers for serverless environments
const PDFJS_DISABLE_WORKERS = true;

// Force disable workers in serverless environment
if (typeof window === 'undefined' || PDFJS_DISABLE_WORKERS) {
  // In Node.js environment, disable workers entirely for better compatibility
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';
} else {
  // In browser environments, can use CDN workers (but we'll still prefer no workers for consistency)
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

/**
 * Parse PDF document and extract text content
 * @param buffer PDF file as Buffer
 * @returns Extracted text content
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    console.log(`Parsing PDF with PDF.js, buffer size: ${buffer.length}`);
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: buffer,
      // Disable workers to run in the main thread (more reliable for serverless environments)
      disableWorker: true,
      // Don't attempt to recover from errors in corrupt files
      stopAtErrors: true,
    });
    
    const pdf = await loadingTask.promise;
    console.log(`PDF loaded successfully: ${pdf.numPages} pages`);
    
    let fullText = '';
    
    // Process each page
    try {
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Extract text items and join them
        const pageText = textContent.items
          .map((item: any) => ('str' in item) ? item.str : '')
          .join(' ');
        
        fullText += pageText + '\n\n';
        
        // Clean up page resources
        page.cleanup();
      }
    } finally {
      // Ensure we always clean up the PDF document to prevent memory leaks
      pdf.destroy();
    }
    
    console.log(`PDF parsing complete: extracted ${fullText.length} characters`);
    return fullText;
  } catch (error) {
    console.error('Error parsing PDF with PDF.js:', error);
    throw error;
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
      return await parsePdf(buffer);
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else {
      throw new Error(`Unsupported document type: ${mimeType}`);
    }
  } catch (error) {
    console.error(`Error extracting text from ${mimeType} document:`, error);
    throw error;
  }
}