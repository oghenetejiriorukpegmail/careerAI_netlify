#!/bin/bash
# Clean up test files that might contain API keys

echo "🧹 Cleaning up test files with potential API keys..."

# List of test files to remove (they contain hardcoded API keys)
test_files=(
    "test-openrouter.js"
    "test-chat4ai.js" 
    "test-anthropic-simple.js"
    "test-claude-direct.js"
    "test-openai-direct.js"
    "test-ai-simple.js"
    "test-requesty-json.js"
    "test-api-direct.js"
    "test-custom-api.js"
    "test-qwen3-model.js"
    "test-qwen-simple.js"
    "test-token-fix.js"
    "test-gemini-model.js"
    "test-gemma-model.js"
    "test-openrouter-timeout-edge.js"
    "verify-timeout-fix.js"
    "test-openrouter-timeout.js"
    "test-direct-openrouter.js"
    "simple-openrouter-test.js"
)

# Remove test files
for file in "${test_files[@]}"; do
    if [ -f "$file" ]; then
        echo "Removing $file"
        rm "$file"
    fi
done

echo "✅ Test file cleanup complete!"