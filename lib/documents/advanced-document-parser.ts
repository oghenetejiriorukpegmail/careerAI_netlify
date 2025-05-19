/**
 * Advanced document parser with section-based processing for large documents
 * This module provides more robust handling of large documents by splitting them
 * into semantically meaningful sections and processing them individually
 */

import { queryAI } from '../ai/config';
import { ParsedResume } from './document-parser';

// Maximum tokens per section to avoid truncation issues
const MAX_SECTION_SIZE = 6000; // approximately 20,000 characters

/**
 * Process a resume by splitting it into logical sections
 * Ensures no important content is lost due to token limits
 * @param resumeText Full resume text from Document AI
 * @param debug Whether to enable debug mode
 * @returns Complete parsed resume data
 */
export async function processResumeBySection(resumeText: string, debug: boolean = false): Promise<ParsedResume> {
  try {
    console.log(`Advanced document processing started: ${resumeText.length} characters`);
    
    // First identify the document structure to find logical section boundaries
    const documentStructure = await identifyDocumentStructure(resumeText);
    
    console.log(`Document structure identified with ${documentStructure.sections.length} sections`);
    if (debug) {
      console.log("Identified sections:", documentStructure.sections.map(s => s.title).join(", "));
    }
    
    // Process each section individually if the document is large
    let completeResume: ParsedResume | null = null;
    
    if (resumeText.length > 15000 || documentStructure.sections.length > 3) {
      console.log("Document is large, processing by sections");
      
      // Initialize with structure from first section (usually contains contact info)
      completeResume = await processSingleSection(documentStructure.sections[0].content, "contact", debug);
      
      // Process each major section and merge results
      for (let i = 1; i < documentStructure.sections.length; i++) {
        const section = documentStructure.sections[i];
        console.log(`Processing section: ${section.title} (${section.content.length} chars)`);
        
        // Skip if section is too small
        if (section.content.length < 100) continue;
        
        // Process this section
        const sectionType = mapSectionTypeToProcessor(section.title);
        const sectionResults = await processSingleSection(section.content, sectionType, debug);
        
        // Merge results into the complete resume
        completeResume = mergeResumeData(completeResume, sectionResults);
      }
      
      console.log("All sections processed and merged successfully");
    } else {
      // Process the entire document as one if it's small enough
      console.log("Document is small, processing in a single request");
      completeResume = await processSingleSection(resumeText, "full", debug);
    }
    
    return completeResume;
  } catch (error) {
    console.error("Error in advanced document processing:", error);
    throw error;
  }
}

/**
 * Identify document structure by locating section headers
 * @param documentText Complete document text
 * @returns Document structure with identified sections
 */
async function identifyDocumentStructure(documentText: string): Promise<DocumentStructure> {
  // Split into lines for analysis
  const lines = documentText.split('\n').map(line => line.trim());
  
  // Use a lightweight approach to identify section headers
  const sectionHeaders = identifySectionHeaders(lines);
  
  // If no sections found, treat the whole document as one section
  if (sectionHeaders.length === 0) {
    return {
      sections: [{
        title: "Resume",
        content: documentText
      }]
    };
  }
  
  // Build sections based on identified headers
  const sections: DocumentSection[] = [];
  
  for (let i = 0; i < sectionHeaders.length; i++) {
    const currentHeader = sectionHeaders[i];
    const nextHeader = i < sectionHeaders.length - 1 ? sectionHeaders[i + 1] : { index: lines.length, text: "" };
    
    // Calculate the content range for this section
    const sectionLines = lines.slice(currentHeader.index, nextHeader.index);
    
    // Skip the header line itself
    const sectionContent = sectionLines.slice(1).join('\n');
    
    sections.push({
      title: currentHeader.text,
      content: sectionContent
    });
  }
  
  // Add a special first section for contact info if it doesn't start with a clear header
  if (sectionHeaders[0].index > 5) {
    const contactSection = {
      title: "Contact Information",
      content: lines.slice(0, sectionHeaders[0].index).join('\n')
    };
    sections.unshift(contactSection);
  }
  
  return { sections };
}

/**
 * Identify likely section headers in the document
 * @param lines Document split into lines
 * @returns Array of identified headers with their line indices
 */
function identifySectionHeaders(lines: string[]): SectionHeader[] {
  const headers: SectionHeader[] = [];
  const commonSectionNames = [
    "EXPERIENCE", "WORK EXPERIENCE", "PROFESSIONAL EXPERIENCE", "EMPLOYMENT",
    "EDUCATION", "ACADEMIC BACKGROUND", "ACADEMIC HISTORY", 
    "SKILLS", "TECHNICAL SKILLS", "CORE COMPETENCIES", "PROFESSIONAL SKILLS",
    "CERTIFICATIONS", "ACHIEVEMENTS", "AWARDS", "HONORS",
    "PROJECTS", "PROFESSIONAL PROJECTS", "PERSONAL PROJECTS",
    "SUMMARY", "PROFESSIONAL SUMMARY", "OBJECTIVE", "CAREER OBJECTIVE",
    "REFERENCES", "PROFESSIONAL REFERENCES", 
    "INTERESTS", "ACTIVITIES", "VOLUNTEER EXPERIENCE", "LANGUAGES"
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Check if this line looks like a section header
    const isHeader = 
      // All caps and short (likely a header)
      (line === line.toUpperCase() && line.length < 50 && line.length > 3) ||
      // Matches common section names (case insensitive)
      commonSectionNames.some(section => 
        line.toUpperCase().includes(section) || 
        section.includes(line.toUpperCase())
      );
    
    if (isHeader) {
      headers.push({ index: i, text: line });
      
      // If this is clearly a section header, also check if the next line
      // is a subsection or continuation
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine && 
            nextLine !== nextLine.toUpperCase() && 
            nextLine.length < 50 && 
            !nextLine.match(/^\d/) // Not starting with a number (likely not a date)
        ) {
          // This might be a subsection - group it with the current header
          headers[headers.length - 1].text += " " + nextLine;
        }
      }
    }
  }
  
  return headers;
}

/**
 * Map document section titles to appropriate processor types
 * @param sectionTitle Title of the document section
 * @returns Processing type to use for this section
 */
function mapSectionTypeToProcessor(sectionTitle: string): SectionType {
  const title = sectionTitle.toUpperCase();
  
  if (title.includes("EXPERIENCE") || title.includes("EMPLOYMENT") || title.includes("WORK")) {
    return "experience";
  } else if (title.includes("EDUCATION") || title.includes("ACADEMIC")) {
    return "education";
  } else if (title.includes("SKILL") || title.includes("COMPETENCIES") || title.includes("EXPERTISE")) {
    return "skills";
  } else if (title.includes("CERTIFICATION") || title.includes("ACHIEVEMENT") || title.includes("AWARD")) {
    return "certifications";
  } else if (title.includes("PROJECT")) {
    return "projects";
  } else if (title.includes("SUMMARY") || title.includes("PROFILE") || title.includes("OBJECTIVE")) {
    return "summary";
  } else if (title.includes("CONTACT") || title.includes("PERSONAL")) {
    return "contact";
  } else if (title.includes("REFERENCE")) {
    return "references";
  } else {
    return "other";
  }
}

/**
 * Process a single section of the document
 * @param sectionText Text content of the section
 * @param sectionType Type of section being processed
 * @param debug Whether to enable debug output
 * @returns Parsed data for this section
 */
async function processSingleSection(
  sectionText: string, 
  sectionType: SectionType,
  debug: boolean = false
): Promise<ParsedResume> {
  try {    
    // Create a focused prompt based on the section we're analyzing
    let focusInstructions = "";
    
    switch (sectionType) {
      case "contact":
        focusInstructions = "Focus on extracting contact information like name, email, phone, and LinkedIn. This section is likely at the beginning of the resume.";
        break;
      case "summary":
        focusInstructions = "Focus on extracting the professional summary or objective statement. This provides an overview of the candidate's profile.";
        break;
      case "experience":
        focusInstructions = "Focus on extracting detailed work experience entries. Look for job titles, companies, dates, and bullet points of responsibilities/achievements.";
        break;
      case "education":
        focusInstructions = "Focus on extracting education details like institutions, degrees, fields of study, and graduation dates.";
        break;
      case "skills":
        focusInstructions = "Focus on extracting skills, which may be presented in lists or categories. Capture both technical and soft skills.";
        break;
      case "certifications":
        focusInstructions = "Focus on extracting certifications, achievements, awards, or other professional credentials.";
        break;
      case "projects":
        focusInstructions = "Focus on extracting project information, including project names, descriptions, technologies used, and outcomes.";
        break;
      case "references":
        focusInstructions = "Focus on extracting reference information, including names, titles, companies, and contact details.";
        break;
      default:
        focusInstructions = "";
    }
    
    if (debug) {
      console.log(`[ADVANCED_PARSER_DEBUG] Processing ${sectionType} section (${sectionText.length} chars)`);
    }
    
    // Ensure we're not exceeding the max section size
    if (sectionText.length > MAX_SECTION_SIZE * 3.5) { // ~3.5 chars per token
      console.log(`Section too large (${sectionText.length} chars), truncating to ~${MAX_SECTION_SIZE} tokens`);
      sectionText = sectionText.substring(0, MAX_SECTION_SIZE * 3.5);
    }
    
    const prompt = `
      You are parsing a specific section of a resume that has been extracted from a PDF.
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
            "description": ["Bullet point 1", "Bullet point 2", ...]
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
        "skills": ["Skill 1", "Skill 2", ...],
        "projects": [
          {
            "name": "Project name",
            "description": "Project description"
          }
        ],
        "certifications": [
          {
            "name": "Certification name",
            "issuer": "Issuing organization",
            "date": "Date obtained (MM/YYYY)",
            "validUntil": "Expiration date if applicable",
            "description": "Additional details about the certification"
          }
        ],
        "training": [
          {
            "name": "Course or training name",
            "provider": "Training provider or institution",
            "date": "Completion date",
            "duration": "Duration of the training",
            "description": "Description of the training"
          }
        ],
        "references": [
          {
            "name": "Reference name",
            "title": "Reference's job title",
            "company": "Reference's company",
            "email": "Reference's email",
            "phone": "Reference's phone",
            "relationship": "Relationship to reference"
          }
        ]
      }
      
      ${focusInstructions}
      
      IMPORTANT: You are only examining one section of the resume, so most fields may be empty.
      Only include fields where information is available in this specific section.
      
      Section text:
      ${sectionText}
      
      CRITICAL FORMATTING INSTRUCTIONS:
      1. Return ONLY a raw, valid JSON object with NO explanations before or after
      2. DO NOT use any markdown code formatting (no \`\`\` markers)
      3. DO NOT use the text "json" anywhere in your response
      4. DO NOT wrap your response in code blocks
      5. DO NOT include any special markers in your response
      6. Only provide the bare JSON object starting with { and ending with }
      7. Make sure all strings are properly escaped with double quotes
      8. If you can't find certain information, omit the field entirely rather than including empty arrays or objects
      
      YOUR RESPONSE MUST START WITH { AND END WITH } WITH NO OTHER TEXT BEFORE OR AFTER.
    `;
    
    const systemPrompt = "You are an expert resume parser API that processes sections of resumes and returns ONLY valid JSON data. Your entire response must be ONLY a valid JSON object. DO NOT use markdown formatting, code blocks, explanations, or any text outside the JSON object. Return ONLY the JSON starting with { and ending with }. Never use ``` markers anywhere in your response.";
    
    // Call the AI service
    const response = await queryAI(prompt, systemPrompt);
    
    // Validate the response before processing
    if (!response || !response.choices || !response.choices.length || 
        !response.choices[0] || !response.choices[0].message || 
        !response.choices[0].message.content) {
      console.error('Invalid AI response format:', response);
      throw new Error('AI returned an invalid response format');
    }
    
    // Log the raw response for debugging
    if (debug) {
      console.log(`[ADVANCED_PARSER_DEBUG] Raw ${sectionType} section response:`, 
        response.choices[0].message.content.substring(0, 100) + '...');
    }
    
    // Pre-process the content to handle markdown and other formatting issues
    let content = response.choices[0].message.content.trim();
    
    // Remove markdown code blocks (like ```json and ```)
    content = content.replace(/^```(\w*\n|\n)?/, '').replace(/```$/, '');
    
    // Try to parse the response directly
    try {
      console.log(`Parsing ${sectionType} section response as JSON...`);
      const structuredData: ParsedResume = JSON.parse(content);
      
      // Ensure we have at least the basic structure expected even if empty
      const processedData: ParsedResume = {
        contactInfo: structuredData.contactInfo || {},
        summary: structuredData.summary || "",
        experience: structuredData.experience || [],
        education: structuredData.education || [],
        skills: structuredData.skills || [],
        projects: structuredData.projects || [],
        certifications: structuredData.certifications || [],
        training: structuredData.training || [],
        references: structuredData.references || []
      };
      
      return processedData;
    } catch (parseError) {
      console.error(`Error parsing ${sectionType} section AI response as JSON:`, parseError);
      
      // Attempt to recover and extract JSON
      const cleanedContent = cleanupJSONResponse(content);
      try {
        const recoveredData: ParsedResume = JSON.parse(cleanedContent);
        console.log(`Successfully recovered JSON from ${sectionType} section with cleanup`);
        
        // Ensure we have at least the basic structure
        return {
          contactInfo: recoveredData.contactInfo || {},
          summary: recoveredData.summary || "",
          experience: recoveredData.experience || [],
          education: recoveredData.education || [],
          skills: recoveredData.skills || [],
          projects: recoveredData.projects || [],
          certifications: recoveredData.certifications || [],
          training: recoveredData.training || [],
          references: recoveredData.references || []
        };
      } catch (recoveryError) {
        console.error(`Failed to recover JSON from ${sectionType} section:`, recoveryError);
        
        // Return empty structure for this section
        return {
          contactInfo: {},
          summary: "",
          experience: [],
          education: [],
          skills: [],
          projects: [],
          certifications: [],
          training: [],
          references: []
        };
      }
    }
  } catch (error) {
    console.error(`Error processing ${sectionType} section:`, error);
    
    // Return empty structure for this section
    return {
      contactInfo: {},
      summary: "",
      experience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
      training: [],
      references: []
    };
  }
}

/**
 * Clean up a JSON response that may have formatting issues
 * @param content The content to clean up
 * @returns Cleaned content that should be valid JSON
 */
function cleanupJSONResponse(content: string): string {
  try {
    // 1. Remove any non-JSON text before the opening brace and after the closing brace
    let cleaned = content.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
    
    // 2. Handle code blocks
    if (cleaned.includes('```')) {
      cleaned = cleaned.replace(/```(?:json)?/g, '').replace(/```/g, '');
    }
    
    // 3. Replace problematic characters
    cleaned = cleaned
      .replace(/[\u201C\u201D]/g, '"') // Replace curly quotes
      .replace(/[\u2018\u2019]/g, "'") // Replace curly single quotes
      .replace(/\\\"/g, '"')           // Replace escaped quotes
      .replace(/\\/g, '\\\\')          // Escape backslashes properly
      .replace(/\n/g, '\\n')           // Handle newlines in strings
      
      // 4. Fix JSON format issues
      .replace(/,\s*}/g, '}')          // Remove trailing commas in objects
      .replace(/,\s*]/g, ']')          // Remove trailing commas in arrays
      .replace(/([^\\])"/g, '$1\\"')   // Escape unescaped quotes in strings
      .replace(/([a-zA-Z0-9_]+):/g, '"$1":') // Ensure property names are quoted
    
    return cleaned;
  } catch (error) {
    console.error('Error in JSON cleanup:', error);
    return content; // Return original if cleanup fails
  }
}

/**
 * Merge multiple parsed resume sections into a complete resume
 * @param baseResume The base resume object to merge into
 * @param newData New data to merge
 * @returns Merged resume data
 */
function mergeResumeData(baseResume: ParsedResume, newData: ParsedResume): ParsedResume {
  // Make a deep copy to avoid modifying the original objects
  const merged: ParsedResume = JSON.parse(JSON.stringify(baseResume));
  
  // Merge contact info (prefer baseResume, but fill in missing fields)
  merged.contactInfo = {
    ...merged.contactInfo,
    ...Object.entries(newData.contactInfo || {}).reduce((acc, [key, value]) => {
      if (!merged.contactInfo[key] && value) {
        acc[key] = value;
      }
      return acc;
    }, {})
  };
  
  // Merge summary (prefer longer one)
  if ((!merged.summary || merged.summary.length < 10) && newData.summary && newData.summary.length > 10) {
    merged.summary = newData.summary;
  }
  
  // Merge arrays (concatenate and remove duplicates)
  merged.experience = mergeArrayWithoutDuplicates(merged.experience, newData.experience || [], 'title', 'company');
  merged.education = mergeArrayWithoutDuplicates(merged.education, newData.education || [], 'institution', 'degree');
  merged.skills = [...new Set([...merged.skills, ...(newData.skills || [])])];
  merged.projects = mergeArrayWithoutDuplicates(merged.projects, newData.projects || [], 'name');
  merged.certifications = mergeArrayWithoutDuplicates(merged.certifications, newData.certifications || [], 'name', 'issuer');
  merged.training = mergeArrayWithoutDuplicates(merged.training, newData.training || [], 'name', 'provider');
  merged.references = mergeArrayWithoutDuplicates(merged.references, newData.references || [], 'name', 'company');
  
  return merged;
}

/**
 * Merge arrays and remove duplicates based on specified key properties
 * @param arr1 First array
 * @param arr2 Second array
 * @param keys Keys to use for detecting duplicates
 * @returns Merged array without duplicates
 */
function mergeArrayWithoutDuplicates<T>(arr1: T[], arr2: T[], ...keys: (keyof T)[]): T[] {
  // Start with the first array
  const result = [...arr1];
  
  // Add items from the second array that aren't already in the result
  for (const item2 of arr2) {
    const isDuplicate = result.some(item1 => {
      // Check if this item matches on all specified keys
      return keys.every(key => {
        const val1 = item1[key];
        const val2 = item2[key];
        
        // Both must have values to check for a match
        if (!val1 || !val2) return false;
        
        // For strings, do a case-insensitive comparison
        if (typeof val1 === 'string' && typeof val2 === 'string') {
          return val1.toLowerCase() === val2.toLowerCase();
        }
        
        // For other types, do a direct comparison
        return val1 === val2;
      });
    });
    
    if (!isDuplicate) {
      result.push(item2);
    }
  }
  
  return result;
}

// Types for document structure
interface DocumentStructure {
  sections: DocumentSection[];
}

interface DocumentSection {
  title: string;
  content: string;
}

interface SectionHeader {
  index: number;
  text: string;
}

// Types for section processing
type SectionType = 
  "full" | "basic" | "contact" | "summary" | "experience" | 
  "education" | "skills" | "projects" | "certifications" | 
  "references" | "other";