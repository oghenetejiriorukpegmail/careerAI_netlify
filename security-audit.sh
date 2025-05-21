#!/bin/bash
# Security audit script to check for exposed API keys and secrets

echo "🔍 Running security audit..."
echo "=================================="

# Define patterns to search for
declare -a patterns=(
    "sk-[a-zA-Z0-9]{20,}"  # OpenAI API keys
    "AIzaSy[a-zA-Z0-9_-]{33}"  # Google API keys  
    "anthropic_[a-zA-Z0-9_-]+"  # Anthropic API keys
    "supabase_[a-zA-Z0-9_-]+"  # Supabase keys
    "eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+"  # JWT tokens
    "AKIA[0-9A-Z]{16}"  # AWS Access Key IDs
    "ghp_[a-zA-Z0-9]{36}"  # GitHub Personal Access Tokens
)

# Directories to search
search_dirs=("app" "lib" "components" ".")

# File extensions to check
extensions=("ts" "tsx" "js" "jsx" "json" "md" "txt")

found_issues=false

for pattern in "${patterns[@]}"; do
    echo "Checking for pattern: $pattern"
    
    # Build find command
    find_cmd="find"
    for dir in "${search_dirs[@]}"; do
        find_cmd="$find_cmd $dir"
    done
    find_cmd="$find_cmd -type f"
    
    # Add extensions
    for ext in "${extensions[@]}"; do
        find_cmd="$find_cmd -name '*.$ext' -o"
    done
    # Remove trailing -o
    find_cmd="${find_cmd% -o}"
    
    # Execute search
    results=$(eval "$find_cmd" | grep -v node_modules | grep -v .next | grep -v .git | xargs grep -l "$pattern" 2>/dev/null || true)
    
    if [ ! -z "$results" ]; then
        echo "⚠️  SECURITY ISSUE: Found potential secrets!"
        echo "$results"
        found_issues=true
        echo ""
    fi
done

# Check for .env files that might be committed (only check git-tracked files)
echo "Checking for committed .env files..."
env_files=$(git ls-files | grep "\.env" | grep -v "\.env.*\.example" || true)
if [ ! -z "$env_files" ]; then
    echo "⚠️  CRITICAL: Found .env files committed to git:"
    echo "$env_files"
    found_issues=true
else
    echo "✅ No .env files found in git repository"
fi

# Check gitignore
echo "Checking .gitignore configuration..."
if [ -f .gitignore ]; then
    if grep -q "\.env" .gitignore; then
        echo "✅ .gitignore properly excludes .env files"
    else
        echo "⚠️  WARNING: .gitignore should include .env files"
        found_issues=true
    fi
else
    echo "⚠️  WARNING: No .gitignore file found"
    found_issues=true
fi

echo "=================================="
if [ "$found_issues" = true ]; then
    echo "❌ Security audit found issues that need attention!"
    echo "Please review and fix the issues above before committing."
    exit 1
else
    echo "✅ Security audit passed - no obvious secrets found!"
    exit 0
fi