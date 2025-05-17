// Simple PDF extraction test using direct buffer extraction
const fs = require('fs');
const path = require('path');

async function testBasicPdfExtraction() {
  try {
    console.log('Starting PDF basic extraction test...');
    
    // Path to the test PDF
    const pdfPath = path.join(__dirname, 'Oghenetejiri_Network Engineer_ May2025.pdf');
    console.log(`Reading file: ${pdfPath}`);
    
    // Read the PDF file
    const buffer = fs.readFileSync(pdfPath);
    console.log(`File read successfully, size: ${buffer.length} bytes`);
    
    // Try basic text extraction
    // This is a simplified approach to extract string data from a PDF
    // Not as good as proper parsing but can help validate content
    let text = '';
    
    // Convert buffer to string, ignoring non-printable characters
    text = buffer.toString('utf8', 0, buffer.length)
      .replace(/[\x00-\x09\x0B-\x1F\x7F-\xFF]/g, '') // Remove non-printable chars
      .replace(/\s+/g, ' '); // Normalize whitespace
    
    console.log(`Extracted approximately ${text.length} characters of text`);
    
    // Log a preview
    console.log('\nText preview:');
    console.log(text.substring(0, 1000) + '...');
    
    // Look for network-related keywords
    const networkKeywords = [
      'Network', 'Cisco', 'CCNA', 'CCNP', 'Routing', 'Switching', 'Firewall',
      'Security', 'VPN', 'LAN', 'WAN', 'Wireless', 'TCP/IP', 'Router', 'Switch'
    ];
    
    const foundKeywords = networkKeywords.filter(keyword => 
      text.includes(keyword)
    );
    
    console.log('\nNetwork-related keywords found:');
    console.log(foundKeywords.join(', '));
    
    // Try to extract email and phone using regex
    const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i);
    const phoneMatch = text.match(/(\+?1?\s*\(?[0-9]{3}\)?[-. ][0-9]{3}[-. ][0-9]{4})/);
    
    console.log('\nContact information found:');
    if (emailMatch) console.log(`Email: ${emailMatch[1]}`);
    if (phoneMatch) console.log(`Phone: ${phoneMatch[1]}`);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testBasicPdfExtraction();