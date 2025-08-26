# Testing Strategy

## Integration with Existing Tests

**Existing Test Framework:** Manual testing for consultation requests and marketing functionality  
**Test Organization:** Create `tests/` directory with separate folders for unit, integration, and database tests  
**Coverage Requirements:** Target 90%+ coverage for critical workflows (hiring pipeline, shift management, compliance)

## New Testing Requirements

### Unit Tests for New Components
**Framework:** Jest + React Testing Library (Next.js standard)  
**Location:** `__tests__/` directories co-located with components  
**Coverage Target:** 95% coverage for business logic, 85% for UI components  
**Integration with Existing:** Extends current manual testing approach with automated coverage

### Database Tests with pgTAP
**Scope:** RLS policies, data integrity, TOPS compliance rules  
**Framework:** pgTAP with Supabase CLI integration  
**Location:** `supabase/tests/database/`

```sql
-- supabase/tests/database/guard_rls.test.sql  
BEGIN;
SELECT plan(8);

-- Setup test users with unique IDs to avoid conflicts
INSERT INTO auth.users (id, email) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'admin@test.com'),
  ('550e8400-e29b-41d4-a716-446655440002', 'manager@test.com'), 
  ('550e8400-e29b-41d4-a716-446655440003', 'guard@test.com');

-- Test RLS policies with different roles
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = '550e8400-e29b-41d4-a716-446655440001';

SELECT results_eq(
  'SELECT COUNT(*) FROM guards',
  ARRAY[2::bigint],
  'Admin should see all guards'
);

SELECT * FROM finish();
ROLLBACK;
```

### Integration Tests
**Scope:** Complete workflows from UI to database with authentication  
**Framework:** Playwright for end-to-end testing  
**Testing:** Real browser automation with Supabase backend

### Regression Testing
**Existing Feature Verification:** Automated tests ensure marketing site functionality remains intact  
**Automated Regression Suite:** GitHub Actions CI pipeline runs full test suite on every PR  
**Manual Testing Requirements:** Critical business workflows tested manually before release

## CI/CD Testing Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # Database tests first
  database-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - name: Start Supabase
        run: supabase start
      - name: Run Database Tests  
        run: supabase test db
        
  # Unit tests
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm run test:unit
      - run: pnpm run test:coverage

  # E2E tests
  e2e-tests:
    needs: [database-tests, unit-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install
      - run: pnpm run test:e2e
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```
