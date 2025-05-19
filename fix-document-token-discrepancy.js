// Test script to verify token estimation between Document AI and OpenRouter
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Test resume file path
const resumePath = './Oghenetejiri_Network Engineer_ May2025.pdf';

// Log path for Document AI extraction
const logDir = './logs';
const documentAILogPattern = /document_ai_.*\.txt/;

// Token estimation functions
// Current implementation (4 chars per token)
function currentEstimateTokens(text) {
  return Math.ceil(text.length / 4);
}

// More accurate estimator based on GPT tokenization rules
function improvedEstimateTokens(text) {
  // Common token boundaries
  const punctuation = /[.,!?;:]/g;
  const whitespace = /\s+/g;
  const numbers = /\d+/g;
  
  // Count tokens more accurately by considering token boundaries
  // Spaces, punctuation, and numbers typically get their own tokens
  const numPunctuation = (text.match(punctuation) || []).length;
  const numWhitespace = (text.match(whitespace) || []).length;
  const numNumbers = (text.match(numbers) || []).length;
  
  // Base token count with improved ratio (closer to 3.5 for typical text)
  const baseTokens = Math.ceil(text.length / 3.5);
  
  // Add token adders for special elements
  const adjustedTokens = baseTokens + (numPunctuation * 0.5) + (numWhitespace * 0.3) + (numNumbers * 0.5);
  
  // Round up to be safe
  return Math.ceil(adjustedTokens);
}

// Find the latest Document AI log file
function findLatestDocumentAILog() {
  try {
    // Get all files in the log directory
    const files = fs.readdirSync(logDir);
    
    // Filter for Document AI log files
    const logFiles = files.filter(file => documentAILogPattern.test(file));
    
    if (logFiles.length === 0) {
      console.error('No Document AI log files found. Run a Document AI extraction first.');
      return null;
    }
    
    // Sort by creation time (most recent first)
    logFiles.sort((a, b) => {
      const timeA = fs.statSync(path.join(logDir, a)).mtime.getTime();
      const timeB = fs.statSync(path.join(logDir, b)).mtime.getTime();
      return timeB - timeA;
    });
    
    // Return the most recent log file
    return path.join(logDir, logFiles[0]);
  } catch (error) {
    console.error('Error finding Document AI log:', error);
    return null;
  }
}

// Calculate token counts for the prompt template
function calculatePromptTemplateTokens() {
  // This is an approximation of the prompt template without the resume content
  const systemPrompt = "You are an expert resume parser API that processes text extracted from PDFs by Google Document AI and returns pure JSON data with no formatting. CRITICAL: Your entire response must be a valid JSON object starting with { and ending with }, containing no markdown formatting, no code blocks, and no other text. Your response must be directly parseable by JSON.parse() with no preprocessing. NEVER FORMAT YOUR RESPONSE AS A CODE BLOCK. NEVER USE ``` MARKERS ANYWHERE. DO NOT WRAP YOUR RESPONSE WITH ```json or ``` TAGS.";
  
  // Sample of the prompt template without the actual resume text
  const promptTemplate = `
    You are parsing a complete resume that has been extracted from a PDF using Google Document AI. 
    Extract structured information and return ONLY a JSON object with the following structure - no explanations, no preamble, no markdown formatting:
    {
      "contactInfo": {
        "fullName": "Full name of the person",
        "email": "Email address",
        "phone": "Phone number",
        "location": "City, State/Country",
        "linkedin": "LinkedIn URL if present"
      },
      "summary": "Professional summary or objective",
      "experience": [
        {
          "title": "Job title",
          "company": "Company name",
          "location": "Job location",
          "startDate": "Start date (MM/YYYY)",
          "endDate": "End date (MM/YYYY) or 'Present'",
          "description": ["Bullet point 1", "Bullet point 2", "..."]
        }
      ],
      "education": [
        {
          "institution": "University or school name",
          "degree": "Degree type (e.g., Bachelor's, Master's)",
          "field": "Field of study",
          "graduationDate": "Graduation date (YYYY)"
        }
      ],
      "skills": ["Skill 1", "Skill 2", "..."],
      "projects": [
        {
          "name": "Project name",
          "description": "Project description"
        }
      ],
      "certifications": [...],
      "training": [...],
      "references": [...]
    }
    
    IMPORTANT - This document was extracted directly from a PDF using Google Document AI, which has already preserved the document structure. Look for:
    1. Common resume section headers like EDUCATION, EXPERIENCE, SKILLS, CERTIFICATIONS, etc.
    2. Date patterns that indicate employment periods or graduation dates
    3. Contact information typically found at the top of a resume
    4. Lists of skills, responsibilities, or accomplishments
    
    CRITICAL FORMATTING INSTRUCTIONS:
    1. Return ONLY a raw, valid JSON object with NO explanations before or after
    2. DO NOT use any markdown code formatting (no \`\`\` markers)
    3. DO NOT use the text "json" anywhere in your response
    4. DO NOT wrap your response in code blocks
    5. DO NOT include any special markers in your response
    6. Only provide the bare JSON object starting with { and ending with }
    7. Make sure all strings are properly escaped with double quotes
    8. If you can't find certain information, omit the field rather than leaving it empty
    9. Be VERY thorough in extracting all information from the resume
    
    Resume text:
    [RESUME_TEXT_PLACEHOLDER]
  `;
  
  // Calculate token counts
  const systemPromptTokens = improvedEstimateTokens(systemPrompt);
  const promptTemplateTokens = improvedEstimateTokens(promptTemplate);
  
  return {
    systemPromptTokens,
    promptTemplateTokens,
    totalTemplateTokens: systemPromptTokens + promptTemplateTokens
  };
}

// Main function to run the test
async function runTokenTest() {
  console.log('Running token discrepancy test...');
  
  // Calculate prompt template tokens
  const templateTokens = calculatePromptTemplateTokens();
  console.log('\nPrompt Template Token Counts:');
  console.log(`System Prompt: ~${templateTokens.systemPromptTokens} tokens`);
  console.log(`Prompt Template: ~${templateTokens.promptTemplateTokens} tokens`);
  console.log(`Total Template: ~${templateTokens.totalTemplateTokens} tokens`);
  
  // Find the latest Document AI log
  const latestLog = findLatestDocumentAILog();
  
  if (!latestLog) {
    console.error('Could not find Document AI log. Please run a document extraction first.');
    return;
  }
  
  console.log(`\nFound Document AI log: ${latestLog}`);
  
  // Read the Document AI extracted text
  const documentAIText = fs.readFileSync(latestLog, 'utf8');
  console.log(`Document AI extracted ${documentAIText.length} characters of text`);
  
  // Calculate token estimates
  const currentTokenEstimate = currentEstimateTokens(documentAIText);
  const improvedTokenEstimate = improvedEstimateTokens(documentAIText);
  
  console.log('\nToken Estimates for Document AI Extracted Text:');
  console.log(`Current Estimate (4 chars/token): ${currentTokenEstimate} tokens`);
  console.log(`Improved Estimate: ${improvedTokenEstimate} tokens`);
  
  // Calculate total tokens with prompt
  const totalCurrentEstimate = templateTokens.totalTemplateTokens + currentTokenEstimate;
  const totalImprovedEstimate = templateTokens.totalTemplateTokens + improvedTokenEstimate;
  
  console.log('\nTotal Token Estimates (Template + Resume):');
  console.log(`Current Method: ${totalCurrentEstimate} tokens`);
  console.log(`Improved Method: ${totalImprovedEstimate} tokens`);
  
  // Token limit check
  const MAX_TOKENS = 30000; // Current limit in code
  console.log(`\nCurrent token limit in code: ${MAX_TOKENS}`);
  
  if (totalCurrentEstimate > MAX_TOKENS) {
    console.log(`WARNING: Current estimation would truncate ${totalCurrentEstimate - MAX_TOKENS} tokens`);
    
    // Calculate how much text would be truncated
    const truncationRatio = MAX_TOKENS / totalCurrentEstimate;
    const remainingChars = Math.floor(documentAIText.length * truncationRatio);
    console.log(`This would truncate the resume text from ${documentAIText.length} to ~${remainingChars} characters`);
  }
  
  if (totalImprovedEstimate > MAX_TOKENS) {
    console.log(`WARNING: Improved estimation would truncate ${totalImprovedEstimate - MAX_TOKENS} tokens`);
  }
  
  // OpenRouter log check
  console.log('\nCheckpoint: Compare these numbers with your OpenRouter log:');
  console.log('OpenRouter reports: 1116 prompt tokens, 90 completion tokens');
  
  // Recommendations
  console.log('\nRecommendations:');
  
  if (totalCurrentEstimate > 25000) {
    console.log('1. ✅ INCREASE MODEL CONTEXT: Use a larger context model like Claude 3.5 Sonnet with 200K context');
  }
  
  console.log('2. ✅ IMPROVE TOKEN ESTIMATION: Replace the current estimation function with the improved version');
  console.log('3. ✅ RESERVE TOKENS FOR RESPONSE: Set aside at least 5000 tokens for the AI response');
  console.log('4. ✅ SIMPLIFY PROMPT: Reduce the size of the instruction template');
  console.log('5. ✅ ADD LOGGING: Log token counts at key points in the document processing pipeline');
  
  console.log('\nTest completed. Use these insights to fix the token discrepancy issues.');
}

// Run the test
runTokenTest();