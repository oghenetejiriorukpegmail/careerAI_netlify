import { Buffer } from 'buffer';
import * as pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { queryAI } from '../ai/config';

// Types for structured data
export interface ParsedResume {
  contactInfo: {
    fullName?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
  };
  summary?: string;
  experience: Array<{
    title?: string;
    company?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description: string[];
  }>;
  education: Array<{
    institution?: string;
    degree?: string;
    field?: string;
    graduationDate?: string;
  }>;
  skills: string[];
  projects?: Array<{
    name?: string;
    description?: string;
  }>;
}

export interface ParsedJobDescription {
  jobTitle?: string;
  company?: string;
  location?: string;
  requirements: string[];
  responsibilities: string[];
  qualifications: string[];
  keywords: string[];
  company_culture?: string[];
}

/**
 * Parse a PDF resume file
 * @param buffer PDF file buffer
 * @returns Extracted text content
 */
async function parsePdfResume(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF resume');
  }
}

/**
 * Parse a DOCX resume file
 * @param buffer DOCX file buffer
 * @returns Extracted text content
 */
async function parseDocxResume(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    throw new Error('Failed to parse DOCX resume');
  }
}

/**
 * Parse resume based on file type
 * @param buffer File buffer
 * @param fileType MIME type of the file
 * @returns Parsed resume text
 */
export async function parseResumeText(buffer: Buffer, fileType: string): Promise<string> {
  if (fileType === 'application/pdf') {
    return parsePdfResume(buffer);
  } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return parseDocxResume(buffer);
  } else {
    throw new Error('Unsupported file type. Please upload a PDF or DOCX file.');
  }
}

/**
 * Extract structured data from resume text using AI
 * @param resumeText Raw text from resume
 * @returns Structured resume data
 */
export async function extractStructuredResumeData(resumeText: string): Promise<ParsedResume> {
  try {
    const prompt = `
      Extract structured information from the following resume text.
      Return the information as a JSON object with the following structure:
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
        ]
      }
      
      Resume text:
      ${resumeText}
      
      Ensure the output is valid JSON. If you can't find certain information, omit the field rather than leaving it empty.
    `;
    
    const systemPrompt = "You are an expert resume parser that extracts structured information from resume text.";
    
    // Call the AI service
    const response = await queryAI(prompt, systemPrompt);
    
    // Parse the response to get the structured data
    // This assumes the AI returns a JSON object in the response
    const structuredData: ParsedResume = JSON.parse(response.choices[0].message.content);
    
    return structuredData;
  } catch (error) {
    console.error('Error extracting structured data from resume:', error);
    throw new Error('Failed to extract structured data from resume');
  }
}

/**
 * Parse job description text
 * @param jobDescriptionText Job description text
 * @returns Structured job description data
 */
export async function parseJobDescription(jobDescriptionText: string): Promise<ParsedJobDescription> {
  try {
    const prompt = `
      Extract structured information from the following job description.
      Return the information as a JSON object with the following structure:
      {
        "jobTitle": "Job title",
        "company": "Company name",
        "location": "Job location",
        "requirements": ["Requirement 1", "Requirement 2", ...],
        "responsibilities": ["Responsibility 1", "Responsibility 2", ...],
        "qualifications": ["Qualification 1", "Qualification 2", ...],
        "keywords": ["Keyword 1", "Keyword 2", ...],
        "company_culture": ["Culture point 1", "Culture point 2", ...]
      }
      
      Extract the most important ATS keywords that would be used to filter candidates.
      These should include technical skills, soft skills, experience levels, certifications, etc.
      
      Job description:
      ${jobDescriptionText}
      
      Ensure the output is valid JSON. If you can't find certain information, provide empty arrays rather than omitting fields.
    `;
    
    const systemPrompt = "You are an expert at parsing job descriptions to identify key requirements, responsibilities, qualifications, and ATS keywords.";
    
    // Call the AI service
    const response = await queryAI(prompt, systemPrompt);
    
    // Parse the response to get the structured data
    const structuredData: ParsedJobDescription = JSON.parse(response.choices[0].message.content);
    
    return structuredData;
  } catch (error) {
    console.error('Error parsing job description:', error);
    throw new Error('Failed to parse job description');
  }
}

/**
 * Get potential job titles based on resume data
 * @param resumeData Parsed resume data
 * @returns Array of potential job titles
 */
export async function getPotentialJobTitles(resumeData: ParsedResume): Promise<string[]> {
  try {
    // Create a prompt for the AI to suggest job titles
    const experienceJson = JSON.stringify(resumeData.experience);
    const skillsJson = JSON.stringify(resumeData.skills);
    
    const prompt = `
      Based on the following resume information, suggest 5-10 potential job titles that this person would be qualified for.
      Return only an array of strings with the job titles.
      
      Experience:
      ${experienceJson}
      
      Skills:
      ${skillsJson}
      
      Education:
      ${JSON.stringify(resumeData.education)}
    `;
    
    const systemPrompt = "You are an expert career counselor who can identify suitable job roles based on a person's experience, skills, and education.";
    
    // Call the AI service
    const response = await queryAI(prompt, systemPrompt);
    
    // Parse the response to get the job titles
    const jobTitles: string[] = JSON.parse(response.choices[0].message.content);
    
    return jobTitles;
  } catch (error) {
    console.error('Error generating potential job titles:', error);
    throw new Error('Failed to generate potential job titles');
  }
}