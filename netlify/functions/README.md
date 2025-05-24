# Netlify Functions

This directory is reserved for custom Netlify Functions. 

## Current Setup

For this Next.js application, API routes are automatically converted to Netlify Functions by the `@netlify/plugin-nextjs` plugin. 

### API Routes Configuration:

1. **Standard Functions** (Node.js runtime):
   - `/api/resumeupload` - Document processing with Google Document AI
   - `/api/generate-resume` - AI-powered resume generation
   - `/api/generate-cover-letter` - AI-powered cover letter generation
   - `/api/documents/parse` - Document parsing
   - `/api/jobs/match` - Job matching algorithm
   - All other API routes that require database access

2. **Edge Functions** (Deno runtime):
   - `/api/auth/session` - Session validation (marked with `export const runtime = 'edge'`)
   - `/api/health` - Health check endpoint

### Function Timeouts:

- AI-heavy operations: 10 seconds (maximum for free tier)
- Standard operations: Default timeout

### Environment Variables:

All environment variables set in Netlify dashboard are automatically available to functions.

### Optimization Tips:

1. Use Edge Runtime (`export const runtime = 'edge'`) for lightweight operations
2. Keep function bundles small by importing only necessary modules
3. Use dynamic imports for heavy libraries
4. Cache responses where appropriate