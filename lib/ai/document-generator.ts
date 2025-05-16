import { queryAI } from './config';
import { ParsedResume, ParsedJobDescription } from '../documents/document-parser';
import { ResumeData, CoverLetterData, generateResumePDF, generateCoverLetterPDF, generateFileName } from '../documents/pdf-generator';

/**
 * Generate an ATS-optimized resume based on user profile and job description
 * @param resume User's parsed resume data
 * @param jobDescription Parsed job description
 * @param userName User's full name
 * @param companyName Company name
 * @returns Generated PDF as Uint8Array and filename
 */
export async function generateAtsResume(
  resume: ParsedResume,
  jobDescription: ParsedJobDescription,
  userName: string,
  companyName: string
): Promise<{ pdf: Uint8Array; fileName: string }> {
  try {
    // Create a prompt for the AI to tailor the resume
    const prompt = `
      I need to create an ATS-optimized resume for a job application.

      Here is the candidate's information:
      ${JSON.stringify(resume, null, 2)}

      Here is the job description:
      ${JSON.stringify(jobDescription, null, 2)}

      Please tailor the resume to highlight relevant skills and experience that match the job requirements.
      Focus on incorporating the keywords from the job description naturally.
      Return the result as a JSON object with this structure:
      {
        "fullName": "",
        "contactInfo": {
          "email": "",
          "phone": "",
          "location": "",
          "linkedin": ""
        },
        "summary": "",
        "experience": [
          {
            "title": "",
            "company": "",
            "location": "",
            "startDate": "",
            "endDate": "",
            "description": ["", ""]
          }
        ],
        "education": [
          {
            "institution": "",
            "degree": "",
            "field": "",
            "graduationDate": ""
          }
        ],
        "skills": ["", ""],
        "projects": [
          {
            "name": "",
            "description": ""
          }
        ]
      }

      Ensure all the experience descriptions are achievement-oriented and quantifiable where possible.
      Include the most relevant skills from the candidate's profile that match the job requirements.
      Keep the content truthful and based on the provided information.
    `;

    const systemPrompt = `
      You are an expert resume writer who specializes in creating ATS-optimized resumes.
      Your goal is to tailor the candidate's resume to match the job description without fabricating experience.
      Focus on highlighting relevant experience, using appropriate keywords, and creating achievement-oriented bullet points.
    `;

    // Call the AI service
    const response = await queryAI(prompt, systemPrompt);
    
    // Parse the response to get the tailored resume data
    const tailoredResumeData: ResumeData = JSON.parse(response.choices[0].message.content);
    
    // Generate the PDF
    const pdf = await generateResumePDF(tailoredResumeData);
    
    // Generate the filename
    const fileName = generateFileName(companyName, userName, 'Resume');
    
    return { pdf, fileName };
  } catch (error) {
    console.error('Error generating ATS resume:', error);
    throw new Error('Failed to generate ATS-optimized resume');
  }
}

/**
 * Generate a personalized cover letter based on user profile and job description
 * @param resume User's parsed resume data
 * @param jobDescription Parsed job description
 * @param userName User's full name
 * @param companyName Company name
 * @returns Generated PDF as Uint8Array and filename
 */
export async function generateCoverLetter(
  resume: ParsedResume,
  jobDescription: ParsedJobDescription,
  userName: string,
  companyName: string
): Promise<{ pdf: Uint8Array; fileName: string }> {
  try {
    // Create a prompt for the AI to generate a cover letter
    const prompt = `
      I need to create a personalized cover letter for a job application.

      Here is the candidate's information:
      ${JSON.stringify(resume, null, 2)}

      Here is the job description:
      ${JSON.stringify(jobDescription, null, 2)}

      Please generate a professional, compelling cover letter that:
      1. Expresses interest in the specific role
      2. Highlights 2-3 most relevant qualifications/experiences
      3. Demonstrates understanding of the company
      4. Explains why the candidate is a good fit
      5. Includes a call to action

      Return the result as a JSON object with this structure:
      {
        "fullName": "",
        "contactInfo": {
          "email": "",
          "phone": "",
          "location": ""
        },
        "date": "Current date (Month DD, YYYY)",
        "recipient": {
          "name": "Hiring Manager", 
          "title": "Hiring Manager",
          "company": "",
          "address": ""
        },
        "jobTitle": "",
        "paragraphs": ["", "", ""],
        "closing": "Sincerely,"
      }

      The paragraphs should typically include:
      1. Introduction and statement of interest
      2. Body paragraph(s) highlighting relevant experiences and skills 
      3. Closing paragraph with call to action

      Keep the cover letter concise, professional, and tailored to the specific job opportunity.
    `;

    const systemPrompt = `
      You are an expert cover letter writer who specializes in creating personalized, compelling cover letters.
      Your goal is to create a cover letter that highlights the candidate's most relevant qualifications
      and demonstrates their fit for the specific role and company.
    `;

    // Call the AI service
    const response = await queryAI(prompt, systemPrompt);
    
    // Parse the response to get the cover letter data
    const coverLetterData: CoverLetterData = JSON.parse(response.choices[0].message.content);
    
    // Generate the PDF
    const pdf = await generateCoverLetterPDF(coverLetterData);
    
    // Generate the filename
    const fileName = generateFileName(companyName, userName, 'CoverLetter');
    
    return { pdf, fileName };
  } catch (error) {
    console.error('Error generating cover letter:', error);
    throw new Error('Failed to generate cover letter');
  }
}

/**
 * Generate LinkedIn profile optimization suggestions
 * @param linkedInData LinkedIn profile data
 * @returns Array of optimization suggestions
 */
export async function generateLinkedInOptimizationTips(linkedInData: any): Promise<string[]> {
  try {
    // Create a prompt for the AI to analyze the LinkedIn profile
    const prompt = `
      I need recommendations to optimize a LinkedIn profile.

      Here is the current LinkedIn profile data:
      ${JSON.stringify(linkedInData, null, 2)}

      Please provide 5-8 specific, actionable recommendations to improve this LinkedIn profile's:
      1. Headline (for visibility in searches)
      2. Summary/About section
      3. Experience descriptions (achievement-oriented)
      4. Skills section
      5. Overall profile completeness and professionalism

      Return the results as an array of strings, with each string being a specific recommendation.
      Make the recommendations detailed and actionable, not generic advice.
    `;

    const systemPrompt = `
      You are an expert LinkedIn profile optimizer who helps professionals improve their visibility
      and attractiveness to hiring managers and recruiters. You provide specific, actionable
      recommendations that will have a meaningful impact on profile effectiveness.
    `;

    // Call the AI service
    const response = await queryAI(prompt, systemPrompt);
    
    // Parse the response to get the optimization tips
    const optimizationTips: string[] = JSON.parse(response.choices[0].message.content);
    
    return optimizationTips;
  } catch (error) {
    console.error('Error generating LinkedIn optimization tips:', error);
    // Return some generic tips if AI processing fails
    return [
      "Add industry-specific keywords to your headline to improve visibility in searches.",
      "Make your summary section tell a compelling story about your career journey.",
      "Quantify achievements in your experience sections to demonstrate impact.",
      "Add more relevant skills to increase endorsement opportunities.",
      "Request recommendations from colleagues to enhance credibility."
    ];
  }
}