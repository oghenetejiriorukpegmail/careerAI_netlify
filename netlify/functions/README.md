# Netlify Functions

This directory contains actual Netlify Functions that appear in the Netlify dashboard.

## Function Types

### 1. Background Functions (15-minute timeout)
Located in `netlify/functions/`:

- **process-resume-background.ts** - Processes resumes with Google Document AI
  - Endpoint: `/.netlify/functions/process-resume-background`
  - Timeout: 15 minutes
  - Use for: Large PDF/DOCX files that need extensive AI processing

- **generate-documents-background.ts** - Generates resumes and cover letters
  - Endpoint: `/.netlify/functions/generate-documents-background`
  - Timeout: 15 minutes
  - Use for: Complex document generation with multiple AI calls

### 2. Standard Functions
- **health-check.ts** - Simple health check
  - Endpoint: `/.netlify/functions/health-check`
  - Timeout: 10 seconds
  - Use for: Quick status checks

### 3. Scheduled Functions
- **cleanup-old-data.ts** - Runs daily at midnight UTC
  - Cleans up old failed resumes and draft applications
  - Runs automatically, no endpoint needed

### 4. Edge Functions (Deno runtime)
Located in `netlify/edge-functions/`:

- **auth-check.ts** - Fast authentication check
  - Endpoint: `/api/edge/auth-check`
  - Runs at edge locations for minimal latency

## Usage Examples

### From Frontend:
```typescript
import { callNetlifyFunction, callBackgroundFunction } from '@/lib/netlify-functions';

// Quick function call
const health = await callNetlifyFunction('health-check');

// Background function for heavy processing
const result = await callBackgroundFunction('process-resume-background', {
  fileBuffer: base64FileContent,
  mimeType: 'application/pdf',
  userId: 'user123',
  fileName: 'resume.pdf'
});
```

### From API Routes:
```typescript
// Trigger background processing
const response = await fetch(`${process.env.URL}/.netlify/functions/process-resume-background`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
```

## Environment Variables

All functions have access to environment variables set in Netlify dashboard:
- `GOOGLE_APPLICATION_CREDENTIALS` - Google Document AI credentials
- `OPENROUTER_API_KEY` - AI provider key
- `SUPABASE_*` - Database credentials

## Monitoring

View function logs in Netlify dashboard:
1. Go to Functions tab
2. Click on function name
3. View real-time logs and metrics

## Best Practices

1. **Use Background Functions for**:
   - Document processing > 10 seconds
   - Multiple AI API calls
   - Large file processing
   - Batch operations

2. **Use Edge Functions for**:
   - Authentication checks
   - Simple validations
   - Redirects and rewrites
   - Geolocation-based logic

3. **Use Standard Functions for**:
   - Quick database queries
   - Simple API calls
   - Webhook handlers

4. **Error Handling**:
   - Always return proper status codes
   - Include error messages in response
   - Log errors for debugging

5. **Performance**:
   - Use dynamic imports for heavy libraries
   - Cache responses when possible
   - Minimize cold starts with proper bundling