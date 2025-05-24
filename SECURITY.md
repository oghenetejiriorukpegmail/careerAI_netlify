# Security Guidelines

## Environment Variables

### Setup
1. Copy `.env.local.example` to `.env.local`
2. Fill in your actual API keys and secrets
3. **Never commit `.env.local` to version control**

### Required Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (safe for client-side)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)

### Optional AI Provider Keys
- `OPENROUTER_API_KEY` - OpenRouter API key
- `ANTHROPIC_API_KEY` - Anthropic API key  
- `OPENAI_API_KEY` - OpenAI API key
- `GOOGLE_AI_API_KEY` - Google AI API key
- `ROUTER_API_KEY` - Requesty Router API key

## Security Best Practices

### API Keys
- Use different API keys for development and production
- Rotate API keys regularly
- Monitor API usage and set up billing alerts
- Never hardcode API keys in source code
- Use environment variables for all secrets

### Development
- Run `./security-audit.sh` before committing
- Use `./setup-env.sh` for initial environment setup
- Keep `.env.local` in `.gitignore`

### Production
- Use secure environment variable management
- Enable API key restrictions where possible
- Monitor for unusual API usage patterns
- Implement rate limiting

## Security Audit

Run the security audit script to check for exposed secrets:

```bash
./security-audit.sh
```

This script checks for:
- Hardcoded API keys
- JWT tokens
- Committed .env files
- Proper .gitignore configuration

## Google Document AI

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

If you discover a security vulnerability, please report it privately to the project maintainers rather than creating a public issue.

## Security Best Practices

1. Keep dependencies updated regularly
2. Use content security policies to prevent XSS
3. Implement proper authentication and authorization
4. Sanitize user inputs to prevent injection attacks
5. Follow OWASP security guidelines