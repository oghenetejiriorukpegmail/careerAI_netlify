// Test script to verify the improved token estimation and truncation
const fs = require('fs');
const fetch = require('node-fetch');

// Load environment variables
require('dotenv').config();

// Import the updated config module (assuming it's been compiled to JS)
const { truncateToTokenLimit, queryOpenRouter } = require('./lib/ai/config');

// Path to the extracted resume text
const resumeTextPath = './logs/document_ai_extracted.txt';

// Check if we need to create a test text file
if (!fs.existsSync(resumeTextPath)) {
  // Create a large test document (10 pages worth)
  const testText = Array(100).fill("This is a test paragraph with various punctuation marks: commas, periods, and exclamation points! It also includes numbers like 12345 and special characters & symbols. We want to create a document that is large enough to test the token truncation logic properly. This paragraph should be repeated many times to simulate a real resume or document being processed by the system.").join("\n\n");
  
  fs.writeFileSync(resumeTextPath, testText);
  console.log(`Created test document at ${resumeTextPath}`);
}

// Read the test document
const documentText = fs.readFileSync(resumeTextPath, 'utf8');
console.log(`Test document length: ${documentText.length} characters`);

// Mock prompt for testing
const mockPrompt = `
You are parsing a document. Extract the key information and return it as JSON.

Document:
${documentText}

Return only a JSON object.
`;

// Mock system prompt
const mockSystemPrompt = "You are a document parsing assistant. Extract structured information from documents and return as valid JSON.";

// Function to test token truncation
async function testTokenTruncation() {
  console.log('\n--- Testing Token Truncation Logic ---');
  
  // Test with different token limits
  const limits = [5000, 10000, 20000, 30000];
  
  for (const limit of limits) {
    console.log(`\nTesting with limit: ${limit} tokens`);
    const truncated = truncateToTokenLimit(documentText, limit);
    console.log(`Original length: ${documentText.length} chars, Truncated length: ${truncated.length} chars`);
    console.log(`Truncation ratio: ${(truncated.length / documentText.length * 100).toFixed(2)}%`);
  }
}

// Function to send a test request to OpenRouter
async function testOpenRouterRequest() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.log('OPENROUTER_API_KEY not found in environment, skipping API test');
    return;
  }
  
  try {
    console.log('\n--- Testing OpenRouter Request ---');
    
    // Create a shortened test prompt to avoid unnecessary token usage
    const testPrompt = `Extract the following information in JSON format:
1. The number of paragraphs in the document
2. The total number of words
3. The first and last sentence

Document:
${documentText.substring(0, 1000)}
...
${documentText.substring(documentText.length - 1000)}`;

    console.log(`Sending test request to OpenRouter with ${testPrompt.length} chars...`);
    
    // Get current timestamp
    const startTime = Date.now();
    
    // Mock the function since we can't directly import TS modules
    // This is a simplified version of what the actual function does
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://localhost:3000',
        'X-Title': 'CareerAI Token Test'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-7-sonnet',
        messages: [
          { role: 'system', content: mockSystemPrompt },
          { role: 'user', content: testPrompt }
        ],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: "json_object" },
        top_p: 0.1,
        top_k: 40
      })
    });
    
    // Check for HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`\nHTTP Error: ${response.status} ${response.statusText}`);
      console.error(`Response body: ${errorText}`);
      return;
    }
    
    // Parse response JSON
    const data = await response.json();
    
    // Calculate time taken
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`\nOpenRouter response received in ${duration.toFixed(2)} seconds`);
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      console.log('\nResponse content:');
      console.log(data.choices[0].message.content);
    }
    
    console.log('\nUsage information:');
    console.log(`Prompt tokens: ${data.usage?.prompt_tokens || 'N/A'}`);
    console.log(`Completion tokens: ${data.usage?.completion_tokens || 'N/A'}`);
    console.log(`Total tokens: ${data.usage?.total_tokens || 'N/A'}`);
    
  } catch (error) {
    console.error('Error testing OpenRouter request:', error);
  }
}

// Main function
async function main() {
  console.log('Testing improved token estimation and truncation...');
  
  // Test token truncation
  await testTokenTruncation();
  
  // Test OpenRouter request (if API key is available)
  await testOpenRouterRequest();
  
  console.log('\nAll tests completed!');
}

// Run the main function
main().catch(console.error);