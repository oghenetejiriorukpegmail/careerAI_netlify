#!/bin/bash
# Environment setup script for CareerAI

echo "🔧 Setting up environment for CareerAI..."
echo "========================================"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📄 Creating .env.local from template..."
    cp .env.local.example .env.local
    echo "⚠️  Please edit .env.local and add your actual API keys!"
    echo ""
else
    echo "✅ .env.local already exists"
fi

# Check for required environment variables
echo "🔍 Checking for required environment variables..."

required_vars=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
)

missing_vars=false

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ] && ! grep -q "^${var}=" .env.local 2>/dev/null; then
        echo "❌ Missing: $var"
        missing_vars=true
    else
        echo "✅ Found: $var"
    fi
done

if [ "$missing_vars" = true ]; then
    echo ""
    echo "⚠️  Some required environment variables are missing."
    echo "Please update your .env.local file with the missing variables."
    echo ""
fi

# Optional AI provider check
echo ""
echo "🤖 Checking AI provider configuration..."
ai_providers=("OPENROUTER_API_KEY" "ANTHROPIC_API_KEY" "OPENAI_API_KEY" "GOOGLE_AI_API_KEY")
found_provider=false

for provider in "${ai_providers[@]}"; do
    if [ ! -z "${!provider}" ] || grep -q "^${provider}=" .env.local 2>/dev/null; then
        echo "✅ Found AI provider: $provider"
        found_provider=true
    fi
done

if [ "$found_provider" = false ]; then
    echo "⚠️  No AI provider API keys found. You'll need at least one to use the AI features."
fi

echo ""
echo "🔒 Security recommendations:"
echo "- Never commit .env.local to version control"
echo "- Use different API keys for development and production"
echo "- Rotate your API keys regularly"
echo "- Monitor your API usage and set up billing alerts"
echo ""

if [ "$missing_vars" = false ]; then
    echo "✅ Environment setup complete!"
else
    echo "⚠️  Environment setup incomplete - please add missing variables"
fi