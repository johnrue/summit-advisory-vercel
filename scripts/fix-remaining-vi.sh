#!/bin/bash

echo "🔧 Fixing remaining vi references..."

# Find all test files with vi references and fix them
find . -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" | while read file; do
  if grep -q "\bvi\." "$file"; then
    echo "Fixing: $file"
    # Replace all vi. with jest.
    sed -i '' 's/\bvi\./jest./g' "$file"
  fi
done

echo "✅ All vi references have been fixed"