# Coding Standards and Conventions

## Existing Standards Compliance

**Code Style:** TypeScript 5 with strict mode, ESLint with Next.js rules, Prettier formatting  
**Linting Rules:** `@next/eslint-plugin-next`, `eslint-plugin-react`, `eslint-plugin-react-hooks`  
**Testing Patterns:** Manual testing with consultation form validation patterns  
**Documentation Style:** JSDoc comments for complex functions, inline TypeScript types

## Enhancement-Specific Standards

### TypeScript Conventions
```typescript
// Use descriptive, clear naming
interface GuardProfileFormProps {
  guard?: Guard
  onSubmit: (data: GuardFormData) => Promise<void>
  onCancel: () => void
}

// Prefer type imports for better tree shaking
import type { Guard, Shift } from '@/lib/types'

// Use branded types for additional type safety
export type GuardId = string & { readonly __brand: unique symbol }

// Comprehensive error handling with discriminated unions
export type ServiceResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string; code: ErrorCode }
```

### Component Architecture Standards
```typescript
// Memoized functional components with proper TypeScript
export const GuardProfileForm = React.memo(function GuardProfileForm({
  guard,
  onSubmit,
  onCancel
}: GuardProfileFormProps) {
  // Custom hooks for logic extraction
  const { form, isLoading, errors } = useGuardForm(guard)
  
  // Memoized values to prevent unnecessary re-renders
  const validationSchema = useMemo(() => 
    createGuardValidationSchema(guard?.status), [guard?.status]
  )
  
  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)}>
      {/* Form implementation */}
    </form>
  )
})
```

## Critical Integration Rules

**Existing API Compatibility:** All new APIs follow existing consultation-service.ts patterns  
**Database Integration:** Additive schema changes only, zero breaking changes to existing tables  
**Error Handling:** Consistent error response format matching existing ServiceResult pattern  
**Logging Consistency:** All Guard Management operations logged with same format as consultation requests
