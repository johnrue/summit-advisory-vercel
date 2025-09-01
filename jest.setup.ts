import '@testing-library/jest-dom'

// Import custom test types (optional - only if file exists)
/// <reference path="./types/test-types.d.ts" />

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'

// Mock Supabase client - main lib
jest.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: () => {
      const mockQuery = {
        select: jest.fn(() => mockQuery),
        eq: jest.fn(() => mockQuery),
        neq: jest.fn(() => mockQuery),
        gt: jest.fn(() => mockQuery),
        gte: jest.fn(() => mockQuery),
        lt: jest.fn(() => mockQuery),
        lte: jest.fn(() => mockQuery),
        like: jest.fn(() => mockQuery),
        ilike: jest.fn(() => mockQuery),
        is: jest.fn(() => mockQuery),
        in: jest.fn(() => mockQuery),
        contains: jest.fn(() => mockQuery),
        containedBy: jest.fn(() => mockQuery),
        rangeGt: jest.fn(() => mockQuery),
        rangeGte: jest.fn(() => mockQuery),
        rangeLt: jest.fn(() => mockQuery),
        rangeLte: jest.fn(() => mockQuery),
        rangeAdjacent: jest.fn(() => mockQuery),
        overlaps: jest.fn(() => mockQuery),
        textSearch: jest.fn(() => mockQuery),
        match: jest.fn(() => mockQuery),
        not: jest.fn(() => mockQuery),
        or: jest.fn(() => mockQuery),
        filter: jest.fn(() => mockQuery),
        order: jest.fn(() => mockQuery),
        limit: jest.fn(() => mockQuery),
        offset: jest.fn(() => mockQuery),
        range: jest.fn(() => mockQuery),
        abortSignal: jest.fn(() => mockQuery),
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
        then: jest.fn((resolve) => Promise.resolve({ data: [], error: null }).then(resolve)),
      };
      return {
        ...mockQuery,
        insert: jest.fn(() => ({
          ...mockQuery,
          select: jest.fn(() => ({
            ...mockQuery,
            single: jest.fn(() => Promise.resolve({ data: {}, error: null })),
          })),
        })),
        update: jest.fn(() => ({
          ...mockQuery,
          eq: jest.fn(() => ({
            ...mockQuery,
            select: jest.fn(() => ({
              ...mockQuery,
              single: jest.fn(() => Promise.resolve({ data: {}, error: null })),
            })),
          })),
        })),
        delete: jest.fn(() => ({
          ...mockQuery,
          eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      };
    },
  }),
  createBrowserSupabaseClient: () => ({}),
  createServerSupabaseClient: () => ({}),
}))

// Mock Supabase client - auth lib
jest.mock('@/lib/auth/supabase', () => ({
  createClient: () => ({
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: () => {
      const mockQuery = {
        select: jest.fn(() => mockQuery),
        eq: jest.fn(() => mockQuery),
        neq: jest.fn(() => mockQuery),
        gt: jest.fn(() => mockQuery),
        gte: jest.fn(() => mockQuery),
        lt: jest.fn(() => mockQuery),
        lte: jest.fn(() => mockQuery),
        like: jest.fn(() => mockQuery),
        ilike: jest.fn(() => mockQuery),
        is: jest.fn(() => mockQuery),
        in: jest.fn(() => mockQuery),
        contains: jest.fn(() => mockQuery),
        containedBy: jest.fn(() => mockQuery),
        rangeGt: jest.fn(() => mockQuery),
        rangeGte: jest.fn(() => mockQuery),
        rangeLt: jest.fn(() => mockQuery),
        rangeLte: jest.fn(() => mockQuery),
        rangeAdjacent: jest.fn(() => mockQuery),
        overlaps: jest.fn(() => mockQuery),
        textSearch: jest.fn(() => mockQuery),
        match: jest.fn(() => mockQuery),
        not: jest.fn(() => mockQuery),
        or: jest.fn(() => mockQuery),
        filter: jest.fn(() => mockQuery),
        order: jest.fn(() => mockQuery),
        limit: jest.fn(() => mockQuery),
        offset: jest.fn(() => mockQuery),
        range: jest.fn(() => mockQuery),
        abortSignal: jest.fn(() => mockQuery),
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
        then: jest.fn((resolve) => Promise.resolve({ data: [], error: null }).then(resolve)),
      };
      return {
        ...mockQuery,
        insert: jest.fn(() => ({
          ...mockQuery,
          select: jest.fn(() => ({
            ...mockQuery,
            single: jest.fn(() => Promise.resolve({ data: {}, error: null })),
          })),
        })),
        update: jest.fn(() => ({
          ...mockQuery,
          eq: jest.fn(() => ({
            ...mockQuery,
            select: jest.fn(() => ({
              ...mockQuery,
              single: jest.fn(() => Promise.resolve({ data: {}, error: null })),
            })),
          })),
        })),
        delete: jest.fn(() => ({
          ...mockQuery,
          eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      };
    },
  }),
}))

// Mock Supabase package directly
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => {
    const mockQuery = {
      select: jest.fn(() => mockQuery),
      eq: jest.fn(() => mockQuery),
      neq: jest.fn(() => mockQuery),
      gt: jest.fn(() => mockQuery),
      gte: jest.fn(() => mockQuery),
      lt: jest.fn(() => mockQuery),
      lte: jest.fn(() => mockQuery),
      like: jest.fn(() => mockQuery),
      ilike: jest.fn(() => mockQuery),
      is: jest.fn(() => mockQuery),
      in: jest.fn(() => mockQuery),
      contains: jest.fn(() => mockQuery),
      containedBy: jest.fn(() => mockQuery),
      rangeGt: jest.fn(() => mockQuery),
      rangeGte: jest.fn(() => mockQuery),
      rangeLt: jest.fn(() => mockQuery),
      rangeLte: jest.fn(() => mockQuery),
      rangeAdjacent: jest.fn(() => mockQuery),
      overlaps: jest.fn(() => mockQuery),
      textSearch: jest.fn(() => mockQuery),
      match: jest.fn(() => mockQuery),
      not: jest.fn(() => mockQuery),
      or: jest.fn(() => mockQuery),
      filter: jest.fn(() => mockQuery),
      order: jest.fn(() => mockQuery),
      limit: jest.fn(() => mockQuery),
      offset: jest.fn(() => mockQuery),
      range: jest.fn(() => mockQuery),
      abortSignal: jest.fn(() => mockQuery),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
      then: jest.fn((resolve) => Promise.resolve({ data: [], error: null }).then(resolve)),
    };
    return {
      auth: {
        getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      },
      from: () => ({
        ...mockQuery,
        insert: jest.fn(() => ({
          ...mockQuery,
          select: jest.fn(() => ({
            ...mockQuery,
            single: jest.fn(() => Promise.resolve({ data: {}, error: null })),
          })),
        })),
        update: jest.fn(() => ({
          ...mockQuery,
          eq: jest.fn(() => ({
            ...mockQuery,
            select: jest.fn(() => ({
              ...mockQuery,
              single: jest.fn(() => Promise.resolve({ data: {}, error: null })),
            })),
          })),
        })),
        delete: jest.fn(() => ({
          ...mockQuery,
          eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      }),
    };
  },
}));

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true,
})