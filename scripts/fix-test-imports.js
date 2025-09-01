#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Fixing test imports: converting from Vitest to Jest...\n');

// Find all test files
const testFiles = [
  ...glob.sync('__tests__/**/*.{ts,tsx}', { cwd: process.cwd() }),
  ...glob.sync('**/*.test.{ts,tsx}', { cwd: process.cwd() }),
  ...glob.sync('**/*.spec.{ts,tsx}', { cwd: process.cwd() }),
  ...glob.sync('tests/**/*.{ts,tsx}', { cwd: process.cwd() })
];

let fixedCount = 0;

testFiles.forEach(file => {
  const fullPath = path.resolve(file);
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // Replace Vitest imports with Jest equivalents
  const vitestImportRegex = /import\s*{\s*([^}]*)\s*}\s*from\s*['"]vitest['"]/g;
  content = content.replace(vitestImportRegex, (match, imports) => {
    modified = true;
    // Clean up imports - remove vi, keep jest globals
    const cleanImports = imports
      .split(',')
      .map(imp => imp.trim())
      .filter(imp => !imp.includes('vi'))
      .join(', ');
    
    return cleanImports ? `import { ${cleanImports} } from '@jest/globals'` : '';
  });

  // Replace vi.fn() with jest.fn()
  content = content.replace(/\bvi\.fn\(\)/g, 'jest.fn()');
  
  // Replace vi.mock() with jest.mock()
  content = content.replace(/\bvi\.mock\(/g, 'jest.mock(');
  
  // Replace vi.clearAllMocks() with jest.clearAllMocks()
  content = content.replace(/\bvi\.clearAllMocks\(\)/g, 'jest.clearAllMocks()');
  
  // Replace vi.spyOn() with jest.spyOn()
  content = content.replace(/\bvi\.spyOn\(/g, 'jest.spyOn(');
  
  // Replace vi.mocked() with jest.mocked() - need to add proper typing
  content = content.replace(/\bvi\.mocked\(/g, 'jest.mocked(');
  
  // Replace @jest/globals imports that might be incomplete
  const jestGlobalsRegex = /import\s*{\s*([^}]*)\s*}\s*from\s*['"]@jest\/globals['"]/g;
  content = content.replace(jestGlobalsRegex, (match, imports) => {
    modified = true;
    // Make sure we have the standard jest globals
    const importSet = new Set(imports.split(',').map(i => i.trim()));
    ['describe', 'it', 'expect', 'beforeEach', 'afterEach', 'jest'].forEach(global => {
      importSet.add(global);
    });
    return `import { ${Array.from(importSet).join(', ') } } from '@jest/globals'`;
  });

  // Add jest import if file uses jest functions but doesn't import from @jest/globals
  if (content.includes('jest.') && !content.includes("from '@jest/globals'") && !content.includes('from "jest"')) {
    const hasDescribe = content.includes('describe(');
    if (hasDescribe) {
      // Add jest import after existing imports
      const importLines = content.split('\n').filter(line => line.trim().startsWith('import'));
      if (importLines.length > 0) {
        content = content.replace(
          /(import[^;]+;)(\n)/,
          `$1\nimport { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'$2`
        );
        modified = true;
      }
    }
  }

  // Remove any empty import lines
  content = content.replace(/^import\s*{\s*}\s*from\s*['"][^'"]*['"];?\s*\n/gm, '');

  if (modified) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Fixed: ${file}`);
    fixedCount++;
  }
});

console.log(`\n🎉 Fixed ${fixedCount} test files`);
console.log('✅ Test imports have been converted from Vitest to Jest');