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

// Note: Document parsing functions have been moved to the API route
// to avoid Node.js module import issues in the browser
// See /app/api/documents/parse/route.ts for implementation

/**
 * Extract structured data from resume text using AI
 * @param resumeText Raw text from resume
 * @returns Structured resume data
 */
export async function extractStructuredResumeData(resumeText: string): Promise<ParsedResume> {
  try {
    console.log(`Processing resume text (${resumeText.length} chars) in a single request`);
    
    // With Gemini 2.5 Flash, we can process even very large resumes in a single call
    // No need to split into sections anymore
    return await extractResumeSection(resumeText, "full");
  } catch (error) {
    console.error('Error extracting structured data from resume:', error);
    
    // Create a minimal fallback structure with basic info extracted via regex
    console.log('Falling back to basic data extraction...');
    
    // Extract email using regex
    const emailMatch = resumeText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i);
    const email = emailMatch ? emailMatch[1] : '';
    
    // Extract phone using regex
    const phoneMatch = resumeText.match(/(\+?1?\s*\(?[0-9]{3}\)?[-. ][0-9]{3}[-. ][0-9]{4})/);
    const phone = phoneMatch ? phoneMatch[1] : '';
    
    // Try to extract name - look for the first line or something that looks like a name
    const lines = resumeText.split('\n').map(line => line.trim()).filter(Boolean);
    let name = lines[0] || 'Unknown';
    
    // If the first line is too long, it's probably not a name
    if (name.length > 40) {
      name = 'Unknown';
    }
    
    // Extract skills - look for common technical or professional terms
    const skillKeywords = [
      'Network', 'Cisco', 'CCNA', 'CCNP', 'Routing', 'Switching', 'Firewall',
      'JavaScript', 'Python', 'Java', 'C++', 'Ruby', 'PHP', 'HTML', 'CSS', 'SQL',
      'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask',
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'Git',
      'Leadership', 'Project Management', 'Agile', 'Scrum', 'Communication',
      'Microsoft Office', 'Excel', 'Word', 'PowerPoint', 'Outlook',
      'Analytics', 'Data Analysis', 'Marketing', 'Sales', 'Customer Service',
      'Security', 'VPN', 'LAN', 'WAN', 'Wireless', 'TCP/IP'
    ];
    
    const skills = skillKeywords
      .filter(skill => resumeText.includes(skill))
      .slice(0, 15); // Limit to 15 skills
    
    return {
      contactInfo: {
        fullName: name,
        email: email,
        phone: phone,
        location: '',
        linkedin: ''
      },
      summary: `Resume extracted with basic parsing from ${resumeText.length} character document.`,
      experience: [],
      education: [],
      skills: skills,
      projects: []
    };
  }
}

/**
 * Process a specific section of a resume
 * @param sectionText The text of the resume section to process
 * @param sectionType The type of section: "full", "basic", or "experience"
 * @returns Partial or complete resume data
 */
async function extractResumeSection(sectionText: string, sectionType: "full" | "basic" | "experience"): Promise<ParsedResume> {
  try {    
    // Create a focused prompt based on the section we're analyzing
    let focusInstructions = "";
    
    if (sectionType === "basic") {
      focusInstructions = "Focus on extracting contact information, summary, education details, and skills.";
    } else if (sectionType === "experience") {
      focusInstructions = "Focus on extracting detailed work experience entries and projects.";
    }
    
    const prompt = `
      You are parsing ${sectionType === "full" ? "a complete resume" : "a section of a resume"}. 
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
        ]
      }
      
      ${focusInstructions}
      
      Resume text:
      ${sectionText}
      
      ## CRITICAL FORMATTING INSTRUCTIONS - READ CAREFULLY:
      1. Return ONLY a raw, valid JSON object with NO explanations before or after
      2. DO NOT use triple backticks (```) or any markdown formatting
      3. DO NOT use the text "```json" anywhere in your response
      4. DO NOT wrap your response in code blocks
      5. DO NOT include any special markers
      6. Only provide the bare JSON object starting with { and ending with }
      7. Make sure all strings are properly escaped with double quotes
      8. If you can't find certain information, omit the field rather than leaving it empty
      
      Your entire response must be a valid JSON object that can be directly processed by JSON.parse().
      
      AGAIN: NEVER USE ```json or ``` MARKERS ANYWHERE IN YOUR RESPONSE.
      YOUR RESPONSE MUST START WITH { AND END WITH } WITH NO OTHER TEXT BEFORE OR AFTER.
    `;
    
    const systemPrompt = "You are an expert resume parser API that returns pure JSON data with no formatting. CRITICAL: Your entire response must be a valid JSON object starting with { and ending with }, containing no markdown formatting, no ```json tags, no backticks, and no other text. Your response must be directly parseable by JSON.parse() with no preprocessing. Never wrap JSON in code blocks.";
    
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
    console.log(`Raw ${sectionType} section response (first 100 chars):`, 
      response.choices[0].message.content.substring(0, 100) + '...');
      
    // Log additional details about the response for debugging JSON extraction issues
    const rawContent = response.choices[0].message.content;
    console.log(`[DETAILS] Response length: ${rawContent.length} characters`);
    
    if (rawContent.includes('```')) {
      console.log('[DETAILS] Response contains code blocks');
      
      // Count code block markers and log their positions
      let codeBlockCount = (rawContent.match(/```/g) || []).length;
      console.log(`[DETAILS] Found ${codeBlockCount} code block markers`);
      
      if (codeBlockCount % 2 === 0) {
        console.log('[DETAILS] Code block markers appear to be properly paired');
      } else {
        console.warn('[WARNING] Odd number of code block markers - this may cause extraction issues');
      }
      
      // Log first and last code block positions
      let firstPos = rawContent.indexOf('```');
      let lastPos = rawContent.lastIndexOf('```');
      console.log(`[DETAILS] First code block marker at position ${firstPos}, last marker at position ${lastPos}`);
      
      // Try to detect if content is wrapped in a code block
      if (firstPos < 20 && lastPos > rawContent.length - 20) {
        console.log('[DETAILS] Content appears to be completely wrapped in a code block');
      }
    }
    
    // Pre-process the content to handle markdown and other formatting issues
    let content = response.choices[0].message.content.trim();
    
    // Remove markdown code blocks (like ```json and ```)
    content = content.replace(/^```(\w*\n|\n)?/, '').replace(/```$/, '');
    
    // Try to parse the response directly
    try {
      console.log(`Attempting to parse ${sectionType} section AI response as JSON...`);
      
      console.log('[JSON EXTRACTION] Attempting direct JSON.parse()');
      const structuredData: ParsedResume = JSON.parse(content);
      
      // Basic validation to ensure we have at least a minimal structure
      if (!structuredData) {
        throw new Error('Parsed data is empty');
      }
      
      console.log('[JSON EXTRACTION] Direct JSON parsing successful');
      
      // Ensure we have at least the basic structure expected even if empty
      structuredData.contactInfo = structuredData.contactInfo || {};
      structuredData.experience = structuredData.experience || [];
      structuredData.education = structuredData.education || [];
      structuredData.skills = structuredData.skills || [];
      
      console.log(`Successfully parsed ${sectionType} section JSON response`);
      return structuredData;
    } catch (parseError) {
      console.error(`Error parsing ${sectionType} section AI response as JSON:`, parseError);
      
      // Try extraction methods
      let extractedData: ParsedResume | null = null;
      
      // Method 1: Extract JSON object between curly braces
      try {
        // Handle multi-line code blocks with ```json and ``` markers
        if (content.includes('```')) {
          // Extract content between code block markers
          const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (codeBlockMatch && codeBlockMatch[1]) {
            console.log('Found markdown code block, extracting content...');
            content = codeBlockMatch[1].trim();
          }
        }
        
        // Match for a JSON object pattern
        const jsonMatch = content.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          const extractedJson = jsonMatch[1];
          console.log('Found JSON-like pattern, attempting to parse...');
          extractedData = JSON.parse(extractedJson);
          console.log(`Successfully extracted and parsed JSON from ${sectionType} section response`);
        }
      } catch (extractionError) {
        console.error('JSON regex extraction failed:', extractionError);
      }
      
      // Method 2: Clean up the response and try again
      if (!extractedData) {
        try {
          // Remove common text that might appear before/after JSON
          const cleaned = content
            .replace(/^[^{]*/, '') // Remove everything before first {
            .replace(/[^}]*$/, '') // Remove everything after last }
            .trim();
            
          if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
            console.log('Attempting to parse cleaned JSON...');
            extractedData = JSON.parse(cleaned);
            console.log(`Successfully parsed cleaned JSON from ${sectionType} section`);
          }
        } catch (cleaningError) {
          console.error('Cleaned JSON parsing failed:', cleaningError);
        }
      }
      
      // Method 3: Handle special characters that might break JSON
      if (!extractedData) {
        try {
          // Replace special quotes, fix escaped quotes, etc.
          const sanitized = content
            .replace(/[\u201C\u201D]/g, '"') // Replace curly quotes
            .replace(/[\u2018\u2019]/g, "'") // Replace curly single quotes
            .replace(/\\\"/g, '"')           // Replace escaped quotes
            .replace(/```(?:json)?/g, '')    // Remove code block markers with optional language
            .replace(/```/g, '')             // Remove remaining code block markers
            .replace(/^[^{]*/, '')           // Remove everything before first {
            .replace(/[^}]*$/, '')           // Remove everything after last }
            .trim();
            
          if (sanitized.startsWith('{') && sanitized.endsWith('}')) {
            console.log('Attempting to parse sanitized JSON...');
            extractedData = JSON.parse(sanitized);
            console.log(`Successfully parsed sanitized JSON from ${sectionType} section`);
          }
        } catch (sanitizeError) {
          console.error('Sanitized JSON parsing failed:', sanitizeError);
        }
      }
      
      // Method 4: Super aggressive cleanup for markdown and other formatting
      if (!extractedData) {
        try {
          // Get any text between { and the last }
          let bracesContent = content;
          
          // If there are any ``` markers, just get content between them
          const codeBlockMatch = content.match(/```(?:json)?([\s\S]*?)```/);
          if (codeBlockMatch && codeBlockMatch[1]) {
            bracesContent = codeBlockMatch[1].trim();
            console.log('Successfully extracted code block content for aggressive cleanup');
          } else if (content.includes('```')) {
            // Crude fallback if regex extraction fails but code blocks exist
            console.log('Code block extraction failed but code blocks exist, using manual extraction');
            const startMarker = content.indexOf('```') + 3;
            const afterStartMarker = content.substring(startMarker);
            const languageMarker = afterStartMarker.match(/^[a-z]+\s/); // Check for language marker
            
            // Adjust the starting point to account for language marker if present
            const contentStart = startMarker + (languageMarker ? languageMarker[0].length : 0);
            const endMarker = content.lastIndexOf('```');
            
            if (endMarker > contentStart) {
              bracesContent = content.substring(contentStart, endMarker).trim();
              console.log('Manually extracted content between code blocks');
            }
          }
          
          // Replace any non-JSON syntax that might cause issues
          const firstBrace = bracesContent.indexOf('{');
          const lastBrace = bracesContent.lastIndexOf('}');
          
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const potentialJson = bracesContent.substring(firstBrace, lastBrace + 1);
            
            // Final cleanup pass
            const finalCleanup = potentialJson
              .replace(/,\s*}/g, '}')  // Remove trailing commas before closing braces
              .replace(/,\s*]/g, ']')  // Remove trailing commas before closing brackets
              .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":'); // Ensure property names are quoted
              
            console.log('Attempting super aggressive cleanup and parsing...');
            extractedData = JSON.parse(finalCleanup);
            console.log(`Successfully parsed after aggressive cleanup from ${sectionType} section`);
          }
        } catch (aggressiveError) {
          console.error('Aggressive cleanup JSON parsing failed:', aggressiveError);
        }
      }
      
      // If we have extracted data, ensure it has the minimum structure
      if (extractedData) {
        extractedData.contactInfo = extractedData.contactInfo || {};
        extractedData.experience = extractedData.experience || [];
        extractedData.education = extractedData.education || [];
        extractedData.skills = extractedData.skills || [];
        
        return extractedData;
      }
      
      // If all extraction methods fail, return a minimal structure
      console.log(`All JSON parsing attempts failed for ${sectionType} section, falling back to basic extraction`);
      
      // Parse basic information from the resume text using regex
      try {
        console.log('[FALLBACK] Attempting to extract basic information using regex patterns');
        
        // Extract email using regex
        const emailMatch = sectionText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i);
        const email = emailMatch ? emailMatch[1] : '';
        
        // Extract phone using regex
        const phoneMatch = sectionText.match(/(\+?1?\s*\(?[0-9]{3}\)?[-. ][0-9]{3}[-. ][0-9]{4})/);
        const phone = phoneMatch ? phoneMatch[1] : '';
        
        // Try to extract name - look for the first line or something that looks like a name
        const lines = sectionText.split('\n').map(line => line.trim()).filter(Boolean);
        let name = lines[0] || 'Unknown';
        
        // If the first line is too long, it's probably not a name
        if (name.length > 40) {
          name = 'Unknown';
        }
        
        // Try to extract skills using common keywords
        const skillSet = new Set<string>();
        const skillKeywords = [
          'Network', 'Cisco', 'CCNA', 'CCNP', 'Routing', 'Switching', 'Firewall',
          'JavaScript', 'Python', 'Java', 'C++', 'Ruby', 'PHP', 'HTML', 'CSS', 'SQL',
          'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask',
          'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'Git',
          'Leadership', 'Project Management', 'Agile', 'Scrum', 'Communication',
          'Microsoft Office', 'Excel', 'Word', 'PowerPoint', 'Outlook',
          'Analytics', 'Data Analysis', 'Marketing', 'Sales', 'Customer Service',
          'Security', 'VPN', 'LAN', 'WAN', 'Wireless', 'TCP/IP'
        ];
        
        // Add any skills found in the text
        for (const skill of skillKeywords) {
          if (sectionText.includes(skill)) {
            skillSet.add(skill);
          }
        }
        
        // Look for university or college names to extract education
        const educationInstitutions = [
          'University', 'College', 'Institute', 'School', 'Academy', 'Bachelor', 'Master', 'PhD'
        ];
        
        const education = [];
        
        // Find lines that might mention education
        for (const line of lines) {
          for (const edu of educationInstitutions) {
            if (line.includes(edu)) {
              education.push({
                institution: line.length > 80 ? line.substring(0, 80) + '...' : line,
                degree: '',
                field: '',
                graduationDate: ''
              });
              break;
            }
          }
          
          // Limit to 3 education entries
          if (education.length >= 3) break;
        }
        
        console.log(`[FALLBACK] Extracted basic info: Name: ${name}, Email: ${email}, Phone: ${phone}, Skills: ${skillSet.size}`);
        
        return {
          contactInfo: {
            fullName: name,
            email: email,
            phone: phone,
            location: '',
            linkedin: ''
          },
          summary: `Resume extracted with basic parsing from ${sectionText.length} character document.`,
          experience: [],
          education: education,
          skills: Array.from(skillSet),
          projects: []
        };
      } catch (fallbackError) {
        console.error('[FALLBACK] Basic extraction failed:', fallbackError);
        
        // Return a minimal structure as last resort
        return {
          contactInfo: {},
          summary: "Could not parse resume content due to processing error.",
          experience: [],
          education: [],
          skills: [],
          projects: []
        };
      }
    }
  } catch (error) {
    console.error(`Error extracting ${sectionType} section:`, error);
    
    // Return a minimal structure for this section
    return {
      contactInfo: {},
      summary: "",
      experience: [],
      education: [],
      skills: [],
      projects: []
    };
  }
}

/**
 * Parse job description text
 * @param jobDescriptionText Job description text
 * @returns Structured job description data
 */
export async function parseJobDescription(jobDescriptionText: string): Promise<ParsedJobDescription> {
  try {
    console.log(`Processing job description text (${jobDescriptionText.length} chars) in a single request`);
    
    // With Gemini 2.5 Flash, we can process even very large job descriptions in a single call
    // No need to split into sections anymore
    return await parseJobDescriptionSection(jobDescriptionText, "full");
  } catch (error) {
    console.error('Error parsing job description:', error);
    
    // Fallback to text-based extraction if the AI parsing fails
    try {
      console.log('Falling back to basic data extraction...');
      
      // Extract keywords from text
      const commonKeywords = [
        "experience", "years", "degree", "bachelor", "master", "phd", "knowledge",
        "skills", "certification", "ability", "communication", "leadership", 
        "teamwork", "team player", "detailed", "organized", "flexible", "dynamic",
        "professional", "solution", "analytical", "analysis", "results", "growth"
      ];
      
      const technicalKeywords = [
        "JavaScript", "Python", "Java", "C++", "SQL", "AWS", "Azure", "Cloud",
        "Docker", "Kubernetes", "CI/CD", "DevOps", "Frontend", "Backend", "Full-stack",
        "React", "Angular", "Vue", "Node.js", "Express", "Django", "Database",
        "Network", "Cisco", "CCNA", "Security", "Routing", "Firewall", "Engineering"
      ];
      
      // Extract potential keywords from the text
      const extractedKeywords = [...commonKeywords, ...technicalKeywords]
        .filter(keyword => jobDescriptionText.toLowerCase().includes(keyword.toLowerCase()))
        .slice(0, 20); // Limit to 20 keywords
      
      // Try to extract job title and company from the first few lines
      const lines = jobDescriptionText.split('\n').map(line => line.trim()).filter(Boolean);
      const jobTitle = lines[0] || "Unknown Position";
      const company = lines.find(line => 
        line.includes("Inc") || line.includes("LLC") || line.includes("Company") || 
        line.includes("Corp") || line.includes("Ltd") || line.includes("Limited")
      ) || "Unknown Company";
      
      return {
        jobTitle: jobTitle.length > 50 ? "Unknown Position" : jobTitle,
        company: company.length > 50 ? "Unknown Company" : company,
        location: "",
        requirements: [],
        responsibilities: [],
        qualifications: [],
        keywords: extractedKeywords,
        company_culture: []
      };
    } catch (fallbackError) {
      console.error('Even fallback extraction failed:', fallbackError);
      // Return a minimal structure in case of error
      return {
        requirements: [],
        responsibilities: [],
        qualifications: [],
        keywords: [],
        company_culture: []
      };
    }
  }
}

/**
 * Process a specific section of a job description
 * @param sectionText The text of the job description section to process
 * @param sectionType The type of section: "full", "basic", or "detailed"
 * @returns Partial or complete job description data
 */
async function parseJobDescriptionSection(
  sectionText: string, 
  sectionType: "full" | "basic" | "detailed"
): Promise<ParsedJobDescription> {
  try {
    // Create a focused prompt based on the section we're analyzing
    let focusInstructions = "";
    
    if (sectionType === "basic") {
      focusInstructions = "Focus on extracting job title, company name, location, and general requirements.";
    } else if (sectionType === "detailed") {
      focusInstructions = "Focus on extracting detailed responsibilities, qualifications, and important keywords.";
    }
    
    const prompt = `
      You are parsing ${sectionType === "full" ? "a complete job description" : "a section of a job description"}.
      Extract structured information and return ONLY a JSON object with the following structure - no explanations, no preamble, no markdown formatting:
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
      
      ${focusInstructions}
      Include the most important ATS keywords that would be used to filter candidates.
      These should include technical skills, soft skills, experience levels, certifications, etc.
      
      Job description section:
      ${sectionText}
      
      RESPOND ONLY WITH VALID JSON, with no explanations before or after.
      DO NOT use markdown formatting or code blocks with backticks.
      DO NOT wrap your response in code blocks or special markers.
      Only provide the raw JSON object.
      If you can't find certain information, provide empty arrays rather than omitting fields.
      
      CRITICAL: DO NOT FORMAT YOUR RESPONSE AS A CODE BLOCK. ONLY RETURN THE RAW JSON OBJECT.
      NEVER PUT JSON IN A CODE BLOCK.
      NEVER USE SPECIAL MARKERS ANYWHERE IN YOUR RESPONSE.
    `;
    
    const systemPrompt = "You are an expert job description parser API. Extract structured information from job descriptions and return ONLY valid JSON with no explanations or markdown formatting. Your ENTIRE response must be a valid JSON object and nothing else. Do not use code blocks, do not include any text before or after the JSON. The JSON should be directly parseable by JSON.parse() without any preprocessing.";
    
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
    console.log(`Raw ${sectionType} section response (first 100 chars):`, 
      response.choices[0].message.content.substring(0, 100) + '...');
      
    // Log additional details about the response for debugging JSON extraction issues
    const rawContent = response.choices[0].message.content;
    console.log(`[DETAILS] Response length: ${rawContent.length} characters`);
    
    if (rawContent.includes('```')) {
      console.log('[DETAILS] Response contains code blocks');
      
      // Count code block markers and log their positions
      let codeBlockCount = (rawContent.match(/```/g) || []).length;
      console.log(`[DETAILS] Found ${codeBlockCount} code block markers`);
      
      if (codeBlockCount % 2 === 0) {
        console.log('[DETAILS] Code block markers appear to be properly paired');
      } else {
        console.warn('[WARNING] Odd number of code block markers - this may cause extraction issues');
      }
      
      // Log first and last code block positions
      let firstPos = rawContent.indexOf('```');
      let lastPos = rawContent.lastIndexOf('```');
      console.log(`[DETAILS] First code block marker at position ${firstPos}, last marker at position ${lastPos}`);
      
      // Try to detect if content is wrapped in a code block
      if (firstPos < 20 && lastPos > rawContent.length - 20) {
        console.log('[DETAILS] Content appears to be completely wrapped in a code block');
      }
    }
    
    // Pre-process the content to handle markdown and other formatting issues
    let content = response.choices[0].message.content.trim();
    
    // Remove markdown code blocks (like ```json and ```)
    content = content.replace(/^```(\w*\n|\n)?/, '').replace(/```$/, '');
    
    // Try to parse the response directly
    try {
      console.log(`Attempting to parse ${sectionType} section AI response as JSON...`);
      
      console.log('[JSON EXTRACTION] Attempting direct JSON.parse()');
      const structuredData: ParsedJobDescription = JSON.parse(content);
      
      // Ensure we have at least the basic structure expected
      structuredData.requirements = structuredData.requirements || [];
      structuredData.responsibilities = structuredData.responsibilities || [];
      
      console.log('[JSON EXTRACTION] Direct JSON parsing successful');
      structuredData.qualifications = structuredData.qualifications || [];
      structuredData.keywords = structuredData.keywords || [];
      structuredData.company_culture = structuredData.company_culture || [];
      
      console.log(`Successfully parsed ${sectionType} section JSON response`);
      return structuredData;
    } catch (parseError) {
      console.error(`Error parsing ${sectionType} section AI response as JSON:`, parseError);
      
      // Try extraction methods
      let extractedData: ParsedJobDescription | null = null;
      
      // Method 1: Extract JSON object between curly braces
      try {
        // Handle multi-line code blocks with ```json and ``` markers
        if (content.includes('```')) {
          // Extract content between code block markers
          const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (codeBlockMatch && codeBlockMatch[1]) {
            console.log('Found markdown code block, extracting content...');
            content = codeBlockMatch[1].trim();
          }
        }
        
        // Match for a JSON object pattern
        const jsonMatch = content.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          const extractedJson = jsonMatch[1];
          console.log('Found JSON-like pattern, attempting to parse...');
          extractedData = JSON.parse(extractedJson);
          console.log(`Successfully extracted and parsed JSON from ${sectionType} section response`);
        }
      } catch (extractionError) {
        console.error('JSON regex extraction failed:', extractionError);
      }
      
      // Method 2: Clean up the response and try again
      if (!extractedData) {
        try {
          // Remove common text that might appear before/after JSON
          const cleaned = content
            .replace(/^[^{]*/, '') // Remove everything before first {
            .replace(/[^}]*$/, '') // Remove everything after last }
            .trim();
            
          if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
            console.log('Attempting to parse cleaned JSON...');
            extractedData = JSON.parse(cleaned);
            console.log(`Successfully parsed cleaned JSON from ${sectionType} section`);
          }
        } catch (cleaningError) {
          console.error('Cleaned JSON parsing failed:', cleaningError);
        }
      }
      
      // Method 3: Handle special characters that might break JSON
      if (!extractedData) {
        try {
          // Replace special quotes, fix escaped quotes, etc.
          const sanitized = content
            .replace(/[\u201C\u201D]/g, '"') // Replace curly quotes
            .replace(/[\u2018\u2019]/g, "'") // Replace curly single quotes
            .replace(/\\\"/g, '"')           // Replace escaped quotes
            .replace(/```(?:json)?/g, '')    // Remove code block markers with optional language
            .replace(/```/g, '')             // Remove remaining code block markers
            .replace(/^[^{]*/, '')           // Remove everything before first {
            .replace(/[^}]*$/, '')           // Remove everything after last }
            .trim();
            
          if (sanitized.startsWith('{') && sanitized.endsWith('}')) {
            console.log('Attempting to parse sanitized JSON...');
            extractedData = JSON.parse(sanitized);
            console.log(`Successfully parsed sanitized JSON from ${sectionType} section`);
          }
        } catch (sanitizeError) {
          console.error('Sanitized JSON parsing failed:', sanitizeError);
        }
      }
      
      // Method 4: Super aggressive cleanup for markdown and other formatting
      if (!extractedData) {
        try {
          // Get any text between { and the last }
          let bracesContent = content;
          
          // If there are any ``` markers, just get content between them
          const codeBlockMatch = content.match(/```(?:json)?([\s\S]*?)```/);
          if (codeBlockMatch && codeBlockMatch[1]) {
            bracesContent = codeBlockMatch[1].trim();
            console.log('Successfully extracted code block content for aggressive cleanup');
          } else if (content.includes('```')) {
            // Crude fallback if regex extraction fails but code blocks exist
            console.log('Code block extraction failed but code blocks exist, using manual extraction');
            const startMarker = content.indexOf('```') + 3;
            const afterStartMarker = content.substring(startMarker);
            const languageMarker = afterStartMarker.match(/^[a-z]+\s/); // Check for language marker
            
            // Adjust the starting point to account for language marker if present
            const contentStart = startMarker + (languageMarker ? languageMarker[0].length : 0);
            const endMarker = content.lastIndexOf('```');
            
            if (endMarker > contentStart) {
              bracesContent = content.substring(contentStart, endMarker).trim();
              console.log('Manually extracted content between code blocks');
            }
          }
          
          // Replace any non-JSON syntax that might cause issues
          const firstBrace = bracesContent.indexOf('{');
          const lastBrace = bracesContent.lastIndexOf('}');
          
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const potentialJson = bracesContent.substring(firstBrace, lastBrace + 1);
            
            // Final cleanup pass
            const finalCleanup = potentialJson
              .replace(/,\s*}/g, '}')  // Remove trailing commas before closing braces
              .replace(/,\s*]/g, ']')  // Remove trailing commas before closing brackets
              .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":'); // Ensure property names are quoted
              
            console.log('Attempting super aggressive cleanup and parsing...');
            extractedData = JSON.parse(finalCleanup);
            console.log(`Successfully parsed after aggressive cleanup from ${sectionType} section`);
          }
        } catch (aggressiveError) {
          console.error('Aggressive cleanup JSON parsing failed:', aggressiveError);
        }
      }
      
      // If we have extracted data, ensure it has the minimum structure
      if (extractedData) {
        extractedData.requirements = extractedData.requirements || [];
        extractedData.responsibilities = extractedData.responsibilities || [];
        extractedData.qualifications = extractedData.qualifications || [];
        extractedData.keywords = extractedData.keywords || [];
        extractedData.company_culture = extractedData.company_culture || [];
        
        return extractedData;
      }
      
      // If all extraction methods fail, return a minimal structure for this section type
      console.log(`All JSON parsing attempts failed for ${sectionType} section, falling back to basic extraction`);
      
      // Try to extract some basic information from the job description using regex
      try {
        console.log('[FALLBACK] Attempting to extract basic information from job description');
        
        // Extract lines and find potential job title
        const lines = sectionText.split('\n').map(line => line.trim()).filter(Boolean);
        let jobTitle = lines[0] || "Unknown Position";
        if (jobTitle.length > 50) {
          jobTitle = "Unknown Position";
        }
        
        // Try to find company name - look for company indicators
        let company = "Unknown Company";
        for (const line of lines.slice(0, 10)) {
          if (line.includes(" Inc") || line.includes(" LLC") || line.includes(" Ltd") || 
              line.includes(" Corporation") || line.includes(" Company") || line.includes(" Co.")) {
            company = line;
            if (company.length > 50) {
              company = company.substring(0, 50) + "...";
            }
            break;
          }
        }
        
        // Extract keywords from text
        const commonKeywords = [
          "experience", "years", "degree", "bachelor", "master", "phd", "knowledge",
          "skills", "certification", "ability", "communication", "leadership", 
          "teamwork", "team player", "detailed", "organized", "flexible", "dynamic",
          "professional", "solution", "analytical", "analysis", "results", "growth"
        ];
        
        const technicalKeywords = [
          "JavaScript", "Python", "Java", "C++", "SQL", "AWS", "Azure", "Cloud",
          "Docker", "Kubernetes", "CI/CD", "DevOps", "Frontend", "Backend", "Full-stack",
          "React", "Angular", "Vue", "Node.js", "Express", "Django", "Database",
          "Network", "Cisco", "CCNA", "Security", "Routing", "Firewall", "Engineering"
        ];
        
        // Extract potential keywords from the text
        const extractedKeywords = [...commonKeywords, ...technicalKeywords]
          .filter(keyword => sectionText.toLowerCase().includes(keyword.toLowerCase()))
          .slice(0, 20); // Limit to 20 keywords
        
        // Try to extract requirements by looking for bullet points or numbered lists
        const requirements = [];
        let inRequirementSection = false;
        for (const line of lines) {
          const lowerLine = line.toLowerCase();
          
          // Check if this is a requirements section
          if (lowerLine.includes("requirements") || lowerLine.includes("qualifications") || 
              lowerLine.includes("skills needed") || lowerLine.includes("what you need")) {
            inRequirementSection = true;
            continue;
          }
          
          // Check if we're entering a different section
          if (lowerLine.includes("responsibilities") || lowerLine.includes("what you'll do") ||
              lowerLine.includes("benefits") || lowerLine.includes("about us")) {
            inRequirementSection = false;
          }
          
          // If in requirements section and line looks like a bullet point, add it
          if (inRequirementSection && 
              (line.startsWith("•") || line.startsWith("-") || line.startsWith("*") || 
               line.match(/^\d+\./) || line.length > 20)) {
            requirements.push(line);
            
            // Limit to 10 requirements
            if (requirements.length >= 10) break;
          }
        }
        
        // Try to find responsibilities
        const responsibilities = [];
        let inResponsibilitySection = false;
        for (const line of lines) {
          const lowerLine = line.toLowerCase();
          
          // Check if this is a responsibilities section
          if (lowerLine.includes("responsibilities") || lowerLine.includes("duties") || 
              lowerLine.includes("what you'll do") || lowerLine.includes("job duties")) {
            inResponsibilitySection = true;
            continue;
          }
          
          // Check if we're entering a different section
          if (lowerLine.includes("requirements") || lowerLine.includes("qualifications") ||
              lowerLine.includes("benefits") || lowerLine.includes("about us")) {
            inResponsibilitySection = false;
          }
          
          // If in responsibilities section and line looks like a bullet point, add it
          if (inResponsibilitySection && 
              (line.startsWith("•") || line.startsWith("-") || line.startsWith("*") || 
               line.match(/^\d+\./) || line.length > 20)) {
            responsibilities.push(line);
            
            // Limit to 10 responsibilities
            if (responsibilities.length >= 10) break;
          }
        }
        
        console.log(`[FALLBACK] Extracted basic job info: Title: ${jobTitle}, Company: ${company}, Keywords: ${extractedKeywords.length}`);
        
        return {
          jobTitle: jobTitle,
          company: company,
          location: "",
          requirements: requirements.length > 0 ? requirements : ["Experience in relevant field", "Strong communication skills"],
          responsibilities: responsibilities.length > 0 ? responsibilities : ["Perform job duties as assigned"],
          qualifications: [],
          keywords: extractedKeywords,
          company_culture: []
        };
      } catch (fallbackError) {
        console.error('[FALLBACK] Job description basic extraction failed:', fallbackError);
        
        // Return a minimal structure as last resort
        return {
          jobTitle: "Position",
          company: "Company",
          location: "",
          requirements: ["Experience in relevant field"],
          responsibilities: ["Perform job duties as assigned"],
          qualifications: [],
          keywords: ["professional", "experience", "communication"],
          company_culture: []
        };
      }
    }
  } catch (error) {
    console.error(`Error extracting ${sectionType} section:`, error);
    
    // Return a minimal structure for this section
    return {
      requirements: [],
      responsibilities: [],
      qualifications: [],
      keywords: [],
      company_culture: []
    };
  }
}

/**
 * Get potential job titles based on resume data
 * @param resumeData Parsed resume data
 * @returns Array of potential job titles
 */
export async function getPotentialJobTitles(resumeData: ParsedResume): Promise<string[]> {
  try {
    // Limit the amount of experience data to avoid token issues
    let limitedExperience = [...resumeData.experience];
    if (limitedExperience.length > 5) {
      console.log(`Limiting experience entries from ${limitedExperience.length} to 5 most recent for job title generation`);
      limitedExperience = limitedExperience.slice(0, 5);
    }
    
    // For each experience, limit the description length
    limitedExperience = limitedExperience.map(exp => {
      if (exp.description && exp.description.length > 5) {
        return {
          ...exp,
          description: exp.description.slice(0, 5) // Keep only first 5 bullet points
        };
      }
      return exp;
    });
    
    // Create a prompt for the AI to suggest job titles
    const experienceJson = JSON.stringify(limitedExperience);
    const skillsJson = JSON.stringify(resumeData.skills);
    
    const prompt = `
      Based on the following resume information, suggest 5-10 potential job titles that this person would be qualified for.
      Return ONLY a JSON array of strings with the job titles, no explanations, no preamble, no markdown formatting.
      
      Experience:
      ${experienceJson}
      
      Skills:
      ${skillsJson}
      
      Education:
      ${JSON.stringify(resumeData.education)}
      
      RESPOND ONLY WITH A VALID JSON ARRAY OF STRINGS, no explanations before or after.
      DO NOT use markdown formatting or code blocks with backticks.
      DO NOT wrap your response in code blocks or special markers.
      ONLY provide the raw JSON array.
      Example of correct response: ["Job Title 1", "Job Title 2", "Job Title 3"]
      
      CRITICAL: DO NOT FORMAT YOUR RESPONSE AS A CODE BLOCK. ONLY RETURN THE RAW JSON ARRAY.
      NEVER PUT JSON IN A CODE BLOCK.
      NEVER USE SPECIAL MARKERS ANYWHERE IN YOUR RESPONSE.
    `;
    
    const systemPrompt = "You are an expert career counselor API. Identify suitable job roles based on a person's experience, skills, and education, and return ONLY a valid JSON array of job titles with no explanations or markdown formatting. Your ENTIRE response must be a valid JSON array and nothing else. Do not use code blocks, do not include any text before or after the JSON. The JSON array should be directly parseable by JSON.parse() without any preprocessing.";
    
    // Call the AI service with a longer timeout - job title generation is not as time-sensitive
    const response = await queryAI(prompt, systemPrompt);
    
    // Validate the response
    if (!response || !response.choices || !response.choices.length || 
        !response.choices[0] || !response.choices[0].message || 
        !response.choices[0].message.content) {
      console.error('Invalid AI response format:', response);
      throw new Error('AI returned an invalid response format');
    }
    
    // Log the raw response for debugging
    console.log('Raw job titles response (first 100 chars):', 
      response.choices[0].message.content.substring(0, 100) + '...');
    
    // Pre-process the content to handle markdown and other formatting issues
    let content = response.choices[0].message.content.trim();
    
    // Remove markdown code blocks (like ```json and ```)
    content = content.replace(/^```(\w*\n|\n)?/, '').replace(/```$/, '');
    
    // Parse the response to get the job titles
    try {
      console.log('Attempting to parse job titles as JSON array...');
      
      // Try to parse as JSON array directly
      try {
        const jobTitles = JSON.parse(content);
        if (Array.isArray(jobTitles) && jobTitles.length > 0) {
          console.log(`Successfully parsed ${jobTitles.length} job titles from JSON array`);
          return jobTitles;
        } else {
          throw new Error('Parsed content is not a valid array');
        }
      } catch (jsonError) {
        console.log('Could not parse job titles as JSON array, trying alternative extraction methods');
        
        // Multiple fallback methods to extract job titles
        
        // Method 1: Look for array pattern in the text
        try {
          // Handle code blocks first if present
          if (content.includes('```')) {
            console.log('[CODE BLOCKS] Attempting to extract JSON from code blocks');
            
            // Try multiple regex patterns with increasing permissiveness
            let extracted = null;
            
            // First try the most precise pattern: ```json followed by content and ending ```
            const jsonBlockMatch = content.match(/```json([^`]*?)```/i);
            if (jsonBlockMatch && jsonBlockMatch[1]) {
              console.log('[CODE BLOCKS] Found specific json code block');
              extracted = jsonBlockMatch[1].trim();
            }
            
            // If that doesn't work, try a more general pattern
            if (!extracted) {
              const generalBlockMatch = content.match(/```(?:json)?([^`]*?)```/i);
              if (generalBlockMatch && generalBlockMatch[1]) {
                console.log('[CODE BLOCKS] Found general code block');
                extracted = generalBlockMatch[1].trim();
              }
            }
            
            // If that still doesn't work, try the most permissive pattern
            if (!extracted) {
              const anyBlockMatch = content.match(/```([\s\S]*?)```/);
              if (anyBlockMatch && anyBlockMatch[1]) {
                console.log('[CODE BLOCKS] Found code block with permissive pattern');
                extracted = anyBlockMatch[1].trim();
              }
            }
            
            // If we found content, use it
            if (extracted) {
              console.log(`[CODE BLOCKS] Successfully extracted content (${extracted.length} chars)`);
              console.log(`[CODE BLOCKS] First 50 chars of extracted content: ${extracted.substring(0, 50)}...`);
              content = extracted;
            } else {
              // If all extraction methods fail but we know there are code blocks, try removing them
              console.log('[CODE BLOCKS] All extraction patterns failed, removing all code markers');
              const beforeCleanup = content;
              content = content.replace(/```(?:json)?/g, '').replace(/```/g, '');
              console.log(`[CODE BLOCKS] Removed ${(beforeCleanup.match(/```/g) || []).length} code block markers`);
            }
          }
          
          const arrayMatch = content.match(/\[([\s\S]*)\]/);
          if (arrayMatch) {
            console.log('Found array pattern, trying to parse bracketed content');
            const jobTitles = JSON.parse(`[${arrayMatch[1]}]`);
            if (Array.isArray(jobTitles) && jobTitles.length > 0) {
              console.log(`Successfully extracted ${jobTitles.length} job titles from array pattern`);
              return jobTitles;
            }
          }
        } catch (arrayError) {
          console.log('Array pattern extraction failed');
        }
        
        // Method 2: Extract lines that look like job titles
        console.log('Trying line-by-line extraction method');
        const lines = content.split(/\n/)
          .map(line => line.trim())
          .filter(line => line.length > 0 && !line.startsWith('[') && !line.startsWith(']'))
          .map(line => {
            // Remove list markers, quotes and other non-title characters
            return line.replace(/^["'\d\.\-\*]+\s*/, '').replace(/["',]+$/, '');
          })
          .filter(line => line.length > 0 && !line.includes('```'));
        
        if (lines.length > 0) {
          console.log(`Extracted ${lines.length} job titles from lines`);
          return lines;
        }
        
        // Method 3: Split by commas if it looks like a comma-separated list
        if (content.includes(',')) {
          console.log('Trying comma-separated extraction method');
          const commaSeparated = content
            .replace(/^\[|\]$/g, '') // Remove surrounding brackets if present
            .replace(/```/g, '')     // Remove code block markers
            .split(',')
            .map(item => item.trim().replace(/^["']+|["']+$/g, '')); // Remove quotes
          
          if (commaSeparated.length > 0 && commaSeparated[0].length > 0) {
            console.log(`Extracted ${commaSeparated.length} job titles from comma separation`);
            return commaSeparated;
          }
        }
        
        // Method 4: Super aggressive cleaning and extraction
        try {
          console.log('Attempting aggressive extraction of array-like content');
          
          // Remove everything that's not within square brackets
          const stripped = content.replace(/^[^\[]*/, '').replace(/[^\]]*$/, '');
          if (stripped.startsWith('[') && stripped.endsWith(']')) {
            // Try to fix common JSON syntax issues in arrays
            const cleaned = stripped
              .replace(/,\s*]/g, ']') // Remove trailing commas
              .replace(/,\s*,/g, ',') // Remove double commas
              .replace(/(['"])?([a-zA-Z0-9\s\-\_]+)(['"])?,/g, '"$2",') // Ensure items are quoted
              .replace(/(['"])?([a-zA-Z0-9\s\-\_]+)(['"])?]/g, '"$2"]'); // Quote last item
              
            const jobTitles = JSON.parse(cleaned);
            if (Array.isArray(jobTitles) && jobTitles.length > 0) {
              console.log(`Successfully extracted ${jobTitles.length} job titles after aggressive cleaning`);
              return jobTitles;
            }
          }
        } catch (aggressiveError) {
          console.log('Aggressive extraction failed', aggressiveError);
        }
        
        // Fallback to extraction based on resume data
        console.log('All extraction methods failed, generating job titles from resume data');
        
        // Extract job titles from experience
        const titleFromExperience = resumeData.experience
          .map(exp => exp.title)
          .filter(Boolean);
        
        // If we have experience titles, generate variations
        if (titleFromExperience.length > 0) {
          // Take the most recent title and create variations
          const recentTitle = titleFromExperience[0];
          return [
            recentTitle,
            `Senior ${recentTitle}`,
            `Lead ${recentTitle}`,
            `${recentTitle} Manager`,
            `${recentTitle} Specialist`
          ];
        }
        
        // If we have skills, create titles based on the most prominent skills
        if (resumeData.skills.length > 0) {
          const topSkills = resumeData.skills.slice(0, 3);
          const generatedTitles = [];
          
          for (const skill of topSkills) {
            generatedTitles.push(`${skill} Specialist`);
            generatedTitles.push(`${skill} Professional`);
          }
          
          if (generatedTitles.length > 0) {
            return generatedTitles;
          }
        }
        
        // Last resort: generic professional titles
        return ['Professional', 'Specialist', 'Consultant', 'Analyst', 'Manager'];
      }
    } catch (error) {
      console.error('Error processing job titles:', error);
      
      // Generate basic job titles based on skills or experience if available
      if (resumeData.skills.length > 0) {
        const skill = resumeData.skills[0];
        return [`${skill} Specialist`, `${skill} Professional`, `${skill} Consultant`];
      } else if (resumeData.experience.length > 0 && resumeData.experience[0].title) {
        const title = resumeData.experience[0].title;
        return [title, `Senior ${title}`, `Lead ${title}`];
      } else {
        return ['Professional', 'Specialist', 'Consultant', 'Analyst', 'Manager'];
      }
    }
  } catch (error) {
    console.error('Error generating potential job titles:', error);
    return ['Professional', 'Specialist', 'Consultant', 'Analyst', 'Manager'];
  }
}