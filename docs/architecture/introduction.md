# Introduction

This document outlines the architectural approach for enhancing **Summit Advisory** with a **comprehensive Guard Management Platform** that manages the complete guard lifecycle while maintaining the existing marketing website functionality. Its primary goal is to serve as the guiding architectural blueprint for AI-driven development of new features while ensuring seamless integration with the existing system.

## Relationship to Existing Architecture

This document supplements existing project architecture by defining how the new Guard Management Platform will integrate with the current Next.js 15 marketing site. The enhancement follows a **dual-application pattern** where marketing pages remain statically exported for optimal performance, while new guard management functionality operates as a separate authenticated application space within the same codebase.

## Integration Approach

Rather than replacing the existing system, this enhancement uses a **unified monorepo strategy** that leverages existing infrastructure (Next.js, Supabase, Vercel deployment) while adding new authenticated modules. Marketing functionality remains unchanged, with guard management features accessed through role-based authentication gateways.
