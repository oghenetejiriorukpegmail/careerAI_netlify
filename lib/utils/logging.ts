/**
 * Utility functions for logging and debugging
 */

import fs from 'fs';
import path from 'path';

const LOG_DIR = './logs';

/**
 * Create logs directory if it doesn't exist
 */
export function ensureLogDirectory(): string {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    
    // Create date-based subdirectory to organize logs
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const dateDir = path.join(LOG_DIR, today);
    
    if (!fs.existsSync(dateDir)) {
      fs.mkdirSync(dateDir, { recursive: true });
    }
    
    return dateDir;
  } catch (err) {
    console.error('Error creating log directory:', err);
    return LOG_DIR;
  }
}

/**
 * Log data to file with timestamp
 * @param data The data to log
 * @param prefix A prefix for the log filename
 * @param extension File extension (default: .log)
 */
export function logToFile(data: any, prefix: string = 'log', extension: string = '.log'): string {
  try {
    // Ensure log directory exists
    const logDir = ensureLogDirectory();
    
    // Create a timestamped filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFilePath = path.join(logDir, `${prefix}_${timestamp}${extension}`);
    
    // Convert data to string if it's not already
    let content: string;
    if (typeof data === 'string') {
      content = data;
    } else if (data instanceof Error) {
      content = `${data.name}: ${data.message}\n${data.stack || ''}`;
    } else {
      try {
        content = JSON.stringify(data, null, 2);
      } catch (err) {
        content = String(data);
      }
    }
    
    // Write to log file
    fs.writeFileSync(logFilePath, content);
    console.log(`Logged ${prefix} data to ${logFilePath}`);
    
    return logFilePath;
  } catch (err) {
    console.error(`Error logging ${prefix} data:`, err);
    return '';
  }
}

/**
 * Log resume processing data in a structured format
 * @param resumeId Identifier for the resume
 * @param data Object with various data points in the processing pipeline
 */
export function logResumeProcessing(resumeId: string, data: {
  documentAiText?: string;
  documentAiRaw?: any;
  aiPrompt?: string;
  aiResponse?: string;
  aiResponseRaw?: any;
  structuredData?: any;
  parsingMethod?: string;
  error?: Error;
}): void {
  try {
    // Ensure log directory exists
    const logDir = ensureLogDirectory();
    
    // Create a resume-specific subdirectory
    const resumeDir = path.join(logDir, `resume_${resumeId}_${Date.now()}`);
    fs.mkdirSync(resumeDir, { recursive: true });
    
    // Log each component
    if (data.documentAiText) {
      fs.writeFileSync(path.join(resumeDir, '01_document_ai_text.txt'), data.documentAiText);
    }
    
    if (data.documentAiRaw) {
      fs.writeFileSync(
        path.join(resumeDir, '02_document_ai_raw.json'), 
        JSON.stringify(data.documentAiRaw, null, 2)
      );
    }
    
    if (data.aiPrompt) {
      fs.writeFileSync(path.join(resumeDir, '03_ai_prompt.txt'), data.aiPrompt);
    }
    
    if (data.aiResponse) {
      fs.writeFileSync(path.join(resumeDir, '04_ai_response.txt'), data.aiResponse);
    }
    
    if (data.aiResponseRaw) {
      fs.writeFileSync(
        path.join(resumeDir, '05_ai_response_raw.json'), 
        JSON.stringify(data.aiResponseRaw, null, 2)
      );
    }
    
    if (data.structuredData) {
      fs.writeFileSync(
        path.join(resumeDir, '06_structured_data.json'), 
        JSON.stringify(data.structuredData, null, 2)
      );
    }
    
    if (data.error) {
      fs.writeFileSync(
        path.join(resumeDir, 'error.log'), 
        `${data.error.name}: ${data.error.message}\n${data.error.stack || ''}`
      );
    }
    
    // Create a metadata file with timestamp and summary
    const metadata = {
      resumeId,
      timestamp: new Date().toISOString(),
      components: {
        documentAiText: !!data.documentAiText,
        documentAiRaw: !!data.documentAiRaw,
        aiPrompt: !!data.aiPrompt,
        aiResponse: !!data.aiResponse,
        structuredData: !!data.structuredData
      },
      error: data.error ? data.error.message : undefined
    };
    
    fs.writeFileSync(
      path.join(resumeDir, 'metadata.json'), 
      JSON.stringify(metadata, null, 2)
    );
    
    console.log(`Complete resume processing log saved to ${resumeDir}`);
  } catch (err) {
    console.error('Error logging resume processing:', err);
  }
}

export default {
  ensureLogDirectory,
  logToFile,
  logResumeProcessing
};