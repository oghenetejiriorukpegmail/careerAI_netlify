# Security Guidelines for CareerAI

## Credential Management

### Environment Variables
This project uses environment variables to manage sensitive credentials. Never hardcode API keys, tokens, or other secrets directly in the codebase.

1. Copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```

2. Fill in your actual credentials in the `.env` file.

3. For development, you can use `.env.local` which is automatically loaded by Next.js.

### Google Document AI

For Google Document AI, you need a service account key:

1. Create a service account in Google Cloud Console
2. Generate a JSON key for the service account
3. Save the key as `google_document_ai.json` in the project root
4. This file is gitignored and should never be committed

Alternatively, you can set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the path of your JSON key file.

## API Key Rotation

All API keys should be rotated regularly:

1. Generate new keys from the respective service dashboards
2. Update your environment variables
3. Deploy the changes
4. Revoke the old keys

## Secure Deployment

When deploying:

1. Set all required environment variables in your hosting platform
2. Ensure environment variables are encrypted at rest
3. Use secure CI/CD practices to prevent credential leakage

## Reporting Security Issues

If you discover a security vulnerability, please send an email to [security@example.com](mailto:security@example.com) instead of using the issue tracker.

## Security Best Practices

1. Keep dependencies updated regularly
2. Use content security policies to prevent XSS
3. Implement proper authentication and authorization
4. Sanitize user inputs to prevent injection attacks
5. Follow OWASP security guidelines