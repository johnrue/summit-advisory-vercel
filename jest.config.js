// Jest configuration for Next.js 15 with TypeScript 5

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    // Handle CSS imports (with CSS modules)
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
    // Handle CSS imports (without CSS modules)
    '^.+\\.(css|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',
    // Handle image imports
    '^.+\\.(png|jpg|jpeg|gif|webp|avif|ico|bmp|svg)$': '<rootDir>/__mocks__/fileMock.js',
    // Handle module aliases (the same as in your tsconfig.json paths object)
    '^@/(.*)$': '<rootDir>/$1',
    // Mock Next.js problematic modules
    '^next/navigation$': '<rootDir>/__mocks__/nextNavigationMock.js',
    '^next/headers$': '<rootDir>/__mocks__/nextHeadersMock.js',
    '^next/server$': '<rootDir>/__mocks__/nextServerMock.js',
  },
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@testing-library/|@supabase/|isows))',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.{ts,tsx}',
    '**/*.{test,spec}.{ts,tsx}',
    '**/lib/**/__tests__/**/*.{ts,tsx}',
    '**/components/**/__tests__/**/*.{ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80,
    },
  },
}