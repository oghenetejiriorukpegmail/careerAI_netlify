// Test script for the advanced document parser
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Test resume file path
const resumePath = './Oghenetejiri_Network Engineer_ May2025.pdf';

// Find most recent Document AI log file
function findLatestDocumentAILog() {
  const logDir = './logs';
  const documentAILogPattern = /document_ai_.*\.txt/;
  
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

// Simulate document section identification
function identifySectionHeaders(documentText) {
  // Split into lines
  const lines = documentText.split('\n').map(line => line.trim());
  
  // Common section names in resumes
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
  
  // Find section headers
  const headers = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Check if this line looks like a section header
    const isHeader = 
      // All caps and short (likely a header)
      (line === line.toUpperCase() && line.length < 50 && line.length > 3) ||
      // Matches common section names
      commonSectionNames.some(section => 
        line.toUpperCase().includes(section) || 
        section.includes(line.toUpperCase())
      );
    
    if (isHeader) {
      headers.push({ index: i, text: line });
    }
  }
  
  return { lines, headers };
}

// Build document sections from headers
function buildSections(lines, headers) {
  // If no headers found, treat the whole document as one section
  if (headers.length === 0) {
    return [{
      title: "Resume",
      content: lines.join('\n')
    }];
  }
  
  // Build sections based on identified headers
  const sections = [];
  
  for (let i = 0; i < headers.length; i++) {
    const currentHeader = headers[i];
    const nextHeader = i < headers.length - 1 ? headers[i + 1] : { index: lines.length, text: "" };
    
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
  if (headers[0].index > 5) {
    const contactSection = {
      title: "Contact Information",
      content: lines.slice(0, headers[0].index).join('\n')
    };
    sections.unshift(contactSection);
  }
  
  return sections;
}

// Main test function
async function testAdvancedParser() {
  console.log('Testing advanced document parser...');
  
  // Find the latest Document AI log
  const latestLog = findLatestDocumentAILog();
  
  if (!latestLog) {
    console.error('Could not find Document AI log. Please run a document extraction first.');
    return;
  }
  
  console.log(`Found Document AI log: ${latestLog}`);
  
  // Read the Document AI extracted text
  const documentText = fs.readFileSync(latestLog, 'utf8');
  console.log(`Document AI extracted ${documentText.length} characters of text`);
  
  // Identify section headers
  console.log('\nIdentifying document structure...');
  const { lines, headers } = identifySectionHeaders(documentText);
  
  console.log(`Found ${headers.length} potential section headers:`);
  headers.forEach(header => {
    console.log(`- Line ${header.index}: "${header.text}"`);
  });
  
  // Build sections
  console.log('\nBuilding document sections...');
  const sections = buildSections(lines, headers);
  
  console.log(`Created ${sections.length} sections:`);
  sections.forEach((section, index) => {
    console.log(`\nSection ${index + 1}: ${section.title}`);
    console.log(`Content length: ${section.content.length} characters`);
    console.log(`Preview: ${section.content.substring(0, 100)}...`);
  });
  
  // Save the sections to a file for further analysis
  const outputPath = './logs/document_sections.json';
  fs.writeFileSync(outputPath, JSON.stringify(sections, null, 2));
  console.log(`\nSaved section analysis to ${outputPath}`);
  
  console.log('\nTest completed. The advanced parser will process each section individually.');
  console.log('This approach ensures that no important content is lost due to token limits.');
}

// Run the test
testAdvancedParser().catch(console.error);