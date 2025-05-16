import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Interface for resume data
export interface ResumeData {
  fullName: string;
  contactInfo: {
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
  };
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string;
    description: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field?: string;
    graduationDate?: string;
  }>;
  skills: string[];
  projects?: Array<{
    name: string;
    description: string;
  }>;
}

// Interface for cover letter data
export interface CoverLetterData {
  fullName: string;
  contactInfo: {
    email: string;
    phone?: string;
    location?: string;
  };
  date: string;
  recipient?: {
    name?: string;
    title?: string;
    company: string;
    address?: string;
  };
  jobTitle: string;
  paragraphs: string[];
  closing: string;
}

/**
 * Generates an ATS-optimized resume PDF
 * @param data Resume data
 * @returns PDF document as Uint8Array
 */
export async function generateResumePDF(data: ResumeData): Promise<Uint8Array> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // US Letter
  
  // Get fonts
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  
  const { width, height } = page.getSize();
  let currentY = height - 50; // Start from top with margin
  const leftMargin = 72; // 1 inch left margin
  const rightMargin = width - 72; // 1 inch right margin
  
  // Draw name and contact info
  page.drawText(data.fullName.toUpperCase(), {
    x: leftMargin,
    y: currentY,
    size: 16,
    font: timesBold,
  });
  
  currentY -= 20;
  
  // Contact info line
  const contactText = [
    data.contactInfo.email,
    data.contactInfo.phone,
    data.contactInfo.location,
    data.contactInfo.linkedin,
  ].filter(Boolean).join(' | ');
  
  page.drawText(contactText, {
    x: leftMargin,
    y: currentY,
    size: 10,
    font: timesRoman,
  });
  
  currentY -= 30;
  
  // Summary section
  page.drawText('SUMMARY', {
    x: leftMargin,
    y: currentY,
    size: 12,
    font: timesBold,
  });
  
  currentY -= 15;
  
  page.drawText(data.summary, {
    x: leftMargin,
    y: currentY,
    size: 10,
    font: timesRoman,
    maxWidth: rightMargin - leftMargin,
    lineHeight: 12,
  });
  
  currentY -= 30;
  
  // Experience section
  page.drawText('PROFESSIONAL EXPERIENCE', {
    x: leftMargin,
    y: currentY,
    size: 12,
    font: timesBold,
  });
  
  currentY -= 15;
  
  for (const job of data.experience) {
    const jobHeader = `${job.title}, ${job.company}`;
    page.drawText(jobHeader, {
      x: leftMargin,
      y: currentY,
      size: 11,
      font: timesBold,
    });
    
    currentY -= 15;
    
    const dateLocation = [
      `${job.startDate} - ${job.endDate || 'Present'}`,
      job.location,
    ].filter(Boolean).join(' | ');
    
    page.drawText(dateLocation, {
      x: leftMargin,
      y: currentY,
      size: 10,
      font: timesRoman,
      color: rgb(0.4, 0.4, 0.4),
    });
    
    currentY -= 15;
    
    for (const bullet of job.description) {
      page.drawText('• ' + bullet, {
        x: leftMargin + 10,
        y: currentY,
        size: 10,
        font: timesRoman,
        maxWidth: rightMargin - leftMargin - 15,
        lineHeight: 12,
      });
      
      currentY -= 15;
    }
    
    currentY -= 10; // Space between jobs
  }
  
  // Education section
  page.drawText('EDUCATION', {
    x: leftMargin,
    y: currentY,
    size: 12,
    font: timesBold,
  });
  
  currentY -= 15;
  
  for (const edu of data.education) {
    const degree = `${edu.degree}${edu.field ? ' in ' + edu.field : ''}`;
    page.drawText(degree, {
      x: leftMargin,
      y: currentY,
      size: 11,
      font: timesBold,
    });
    
    currentY -= 15;
    
    const instDate = [
      edu.institution,
      edu.graduationDate,
    ].filter(Boolean).join(' | ');
    
    page.drawText(instDate, {
      x: leftMargin,
      y: currentY,
      size: 10,
      font: timesRoman,
    });
    
    currentY -= 20;
  }
  
  // Skills section
  page.drawText('SKILLS', {
    x: leftMargin,
    y: currentY,
    size: 12,
    font: timesBold,
  });
  
  currentY -= 15;
  
  // Format skills in a nice layout
  const skillsText = data.skills.join(' • ');
  
  page.drawText(skillsText, {
    x: leftMargin,
    y: currentY,
    size: 10,
    font: timesRoman,
    maxWidth: rightMargin - leftMargin,
    lineHeight: 12,
  });
  
  // Check if we need to add projects
  if (data.projects && data.projects.length > 0) {
    currentY -= 30;
    
    page.drawText('PROJECTS', {
      x: leftMargin,
      y: currentY,
      size: 12,
      font: timesBold,
    });
    
    currentY -= 15;
    
    for (const project of data.projects) {
      page.drawText(project.name, {
        x: leftMargin,
        y: currentY,
        size: 11,
        font: timesBold,
      });
      
      currentY -= 15;
      
      page.drawText(project.description, {
        x: leftMargin,
        y: currentY,
        size: 10,
        font: timesRoman,
        maxWidth: rightMargin - leftMargin,
        lineHeight: 12,
      });
      
      currentY -= 20;
    }
  }
  
  return await pdfDoc.save();
}

/**
 * Generates a cover letter PDF
 * @param data Cover letter data
 * @returns PDF document as Uint8Array
 */
export async function generateCoverLetterPDF(data: CoverLetterData): Promise<Uint8Array> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // US Letter
  
  // Get fonts
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  
  const { width, height } = page.getSize();
  let currentY = height - 50; // Start from top with margin
  const leftMargin = 72; // 1 inch left margin
  const rightMargin = width - 72; // 1 inch right margin
  
  // Draw name at the top
  page.drawText(data.fullName, {
    x: leftMargin,
    y: currentY,
    size: 14,
    font: timesBold,
  });
  
  currentY -= 20;
  
  // Contact info line
  const contactText = [
    data.contactInfo.email,
    data.contactInfo.phone,
    data.contactInfo.location,
  ].filter(Boolean).join(' | ');
  
  page.drawText(contactText, {
    x: leftMargin,
    y: currentY,
    size: 10,
    font: timesRoman,
  });
  
  currentY -= 30;
  
  // Date
  page.drawText(data.date, {
    x: leftMargin,
    y: currentY,
    size: 10,
    font: timesRoman,
  });
  
  currentY -= 30;
  
  // Recipient info
  if (data.recipient) {
    if (data.recipient.name) {
      page.drawText(data.recipient.name, {
        x: leftMargin,
        y: currentY,
        size: 10,
        font: timesRoman,
      });
      
      currentY -= 15;
    }
    
    if (data.recipient.title) {
      page.drawText(data.recipient.title, {
        x: leftMargin,
        y: currentY,
        size: 10,
        font: timesRoman,
      });
      
      currentY -= 15;
    }
    
    page.drawText(data.recipient.company, {
      x: leftMargin,
      y: currentY,
      size: 10,
      font: timesRoman,
    });
    
    currentY -= 15;
    
    if (data.recipient.address) {
      page.drawText(data.recipient.address, {
        x: leftMargin,
        y: currentY,
        size: 10,
        font: timesRoman,
      });
      
      currentY -= 15;
    }
  }
  
  currentY -= 15;
  
  // Subject line
  page.drawText(`Re: Application for ${data.jobTitle} Position`, {
    x: leftMargin,
    y: currentY,
    size: 10,
    font: timesBold,
  });
  
  currentY -= 30;
  
  // Greeting
  page.drawText('Dear Hiring Manager,', {
    x: leftMargin,
    y: currentY,
    size: 10,
    font: timesRoman,
  });
  
  currentY -= 25;
  
  // Body paragraphs
  for (const paragraph of data.paragraphs) {
    page.drawText(paragraph, {
      x: leftMargin,
      y: currentY,
      size: 10,
      font: timesRoman,
      maxWidth: rightMargin - leftMargin,
      lineHeight: 14,
    });
    
    // Calculate the height of the paragraph to adjust the Y position
    const textHeight = Math.ceil(paragraph.length / 80) * 14; // Approximate
    currentY -= textHeight + 15;
  }
  
  // Closing
  page.drawText(data.closing, {
    x: leftMargin,
    y: currentY,
    size: 10,
    font: timesRoman,
  });
  
  currentY -= 60; // Space for signature
  
  // Name
  page.drawText(data.fullName, {
    x: leftMargin,
    y: currentY,
    size: 10,
    font: timesBold,
  });
  
  return await pdfDoc.save();
}

/**
 * Generates file name according to PRD requirements
 * @param companyName Company name
 * @param userName User name
 * @param docType 'Resume' or 'CoverLetter'
 * @returns Formatted file name
 */
export function generateFileName(companyName: string, userName: string, docType: 'Resume' | 'CoverLetter'): string {
  const sanitizedCompany = companyName.replace(/\s+/g, '_');
  const sanitizedUser = userName.replace(/\s+/g, '_');
  
  return `${sanitizedCompany}_${sanitizedUser}_${docType}.pdf`;
}